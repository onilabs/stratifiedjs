/*
 * Oni Rocket Web Application Server
 * Server filesystem module
 *
 * Part of Oni Apollo
 * Version: <unstable>
 * http://onilabs.com/apollo
 *
 * (c) 2011 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the GPL v2, see
 * http://www.gnu.org/licenses/gpl-2.0.html
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

var fs = require('apollo:node-fs');
var path = require('path');

// this is the configurable part of the filesystem:
var staticPathMap = [];

// this is where modules map their paths; these paths take priority
// over the static map:
var dynamicPathMap = [];

//----------------------------------------------------------------------
// initialization

exports.setStaticPathMap = function(pathMap) {
  staticPathMap = pathMap;
};

exports.mapDynamicHandler = function(regex, handler) {
  dynamicPathMap.push({pattern: regex, handler:handler});
};

//----------------------------------------------------------------------
// helpers

// returns [matches, handler] || null
function match_handler(path) {
  var matches;
  var l = dynamicPathMap.length;
  for (var i=0; i<l; ++i) {
    if((matches = path.match(dynamicPathMap[i].pattern)))
      return [matches, dynamicPathMap[i].handler];
  }
  l = staticPathMap.length;
  for (var i=0; i<l; ++i) {
    if((matches = path.match(staticPathMap[i].pattern)))
      return [matches, staticPathMap[i].handler];
  }
  return null;
}

//----------------------------------------------------------------------
// response helpers

function writeRedirectResponse(response, location, status) {
  if (!status) status = 302;
  var resp = "<html><head><title>"+status+" Redirect</title></head>";
  resp += "<body><h4>"+status+" Redirect</h4>";
  resp += "The document can be found <a href='"+location+"'>"+location+"</a>.";
  resp += "<hr>Oni Rocket Server</body></html>";
  response.writeHead(status, { "Content-Type":"text/html", "Location":location});
  response.end(resp);
}

function writeErrorResponse(response, status, title, text) {
  var resp = "<html><head><title>"+status+" "+title+"</title></head>";
  resp += "<body><h4>"+status+" "+title+"</h4>";
  resp += text;
  resp += "<hr>Oni Rocket Server</body></html>";
  response.writeHead(status, title, { "Content-Type":"text/html" });
  response.end(resp);
}

//----------------------------------------------------------------------
// main entry points into the filesystem:

exports.handle_get = function(request, response) {
  var mh = match_handler(request.parsedUrl.path);
  if (!mh || !mh[1].handle_get) return false;
  mh[1].handle_get(request, response, mh[0]);
  return true;
};

exports.handle_post = function(request, response) {
  var mh = match_handler(request.parsedUrl.path);
  if (!mh || !mh[1].handle_post) return false;
  mh[1].handle_post(request, response, mh[0]);
  return true;
};


//----------------------------------------------------------------------
// mapped directory handler: maps directories on disk to the virtual
// filesystem

// helper for listing directories
function listDirectory(request, response, root, branch) {
  
  
  var resp = "<h1>" + branch + "</h1>";

  // maybe generate ".."
  var matches;
  if ((matches = /^(.*\/)[^\/]*\/$/.exec(request.parsedUrl.path)))
    resp += "<a href='"+request.parsedUrl.protocol+"://"+
    request.parsedUrl.authority+matches[1]+
    "'>../</a><br>";

  var files = fs.readdir(root + branch);
  for (var i=0; i<files.length; ++i) {
    var filename = files[i];
    var path = root + branch + filename;
    if (fs.isDirectory(path)) {
      resp += "<a href='"+request.parsedUrl.protocol+"://"+
        request.parsedUrl.authority+request.parsedUrl.path+filename+"/'>"+
        filename+"/</a><br>";
    }
    else if (fs.isFile(path)) {
      resp += "<a href='"+request.parsedUrl.protocol+"://"+
        request.parsedUrl.authority+request.parsedUrl.path+filename+
        "'>"+filename+"</a> (";
      var size = fs.stat(path).size;
      if (size < 1024)
        resp += size + " B)<br>";
      else if (size < 1024 * 1024)
        resp += Math.round(size/1024*10)/10+ " kB)<br>";
      else 
        resp += Math.round(size/1024/1024*10)/10+ " MB)<br>";
    }
  }

  response.writeHead(200, { "Content-Type":"text/html"});
  response.end(resp);
}

// attempts to serve the file; returns 'false' if not found
function serveFile(request, response, filespec, formats) {
  var matches = filespec.match(/^([^\!]*)(?:\!(.*))?$/);
  if (!matches) return false;
  var file = matches[1];
  var format = matches[2] ? matches[2] : "none";
  
  if (!fs.isFile(file)) return false;
  
  var ext = path.extname(file).slice(1);
  var fdesc = formats[ext];
  if (!fdesc) fdesc = formats["*"];
  if (!fdesc) {
    console.log("Don't know how to serve file with extension '"+ext+"'");
    // don't know how to serve this file... XXX should we generate an error?
    return false;
  }
  var formatdesc = fdesc[format];
  if (!formatdesc) {
    console.log("Can't serve file with extension '"+ext+"' in format '"+format+"'");
    // can't serve the requested format... XXX should we generate an error?
    return false;
  }
  
  // ok, looks like we know how to serve this file
  if (!formatdesc.filter) {
/* XXX
    // stream file
    var stream = filesystem.openFile(file);
    var buf;
    while ((buf = stream.read(1024)))
      c.writeBodyChunk(buf);
    c.writeEndChunk();
*/

    var f = fs.readFile(file);
    response.writeHead(200, formatdesc.mime ? {"Content-Type":formatdesc.mime} : {});
    response.end(f);
  }
  else {
    // read in whole file, send through filter
    // XXX find a way to do this by streaming
    var f = fs.readFile(file);
    response.writeHead(200, formatdesc.mime ? {"Content-Type":formatdesc.mime} : {});
    response.end(formatdesc.filter(f, request));
  }
  return true;
} 

// Maps a directory on disk into the server fs.
// - The 'pattern' regex under which the handler will be filed needs to
//   have capturing parenthesis around the relative path that will be mapped
//   e.g.:  pattern: /^/virtual_root(\/.*)?$/
// - 'root' is the absolute on-disk path prefix.
// - 'formats' is a 'fileformat map' which determines the mime type
//   and filters (if any) for get-requests.
function createMappedDirectoryHandler(root, formats, flags)
{
  function handle_get(request, response, matches) {
    
    var file = matches[1] ? root + matches[1] : root;
    
    if (fs.isDirectory(file)) {
      // make sure we have a canonical url with '/' at the
      // end. otherwise relative links will break:
      if (request.parsedUrl.path[request.parsedUrl.path.length-1] != "/") {
        writeRedirectResponse(response, request.parsedUrl.source+"/");
        return;
      }
      var served = false;
      if (flags.mapIndexToDir)
        served = serveFile(request, response, file + "/index.html", formats);
      if (!served) {
        if (flags.allowDirListing)
          listDirectory(request, response, root, matches[1] ? matches[1] : "/");
        else {
          console.log("Dir '"+file+"' not found");
          writeErrorResponse(response, 404, "Not Found", "File not found");
        }
      }
    }
    else {
      // normal file
      try {
        if (!serveFile(request, response, file, formats)) {
          console.log("File '"+file+"' not found");
          writeErrorResponse(response, 404, "Not Found",
                             "File '"+matches[1]+"' not found");
        }
      }
      catch (e) {
        throw "Error serving file '"+matches[1]+"': "+e;
      }
    }
  }
  return {
    handle_get: handle_get,
    flags: flags
  };
}

exports.createMappedDirectoryHandler = createMappedDirectoryHandler;

