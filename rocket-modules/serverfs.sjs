/*
 * Oni Rocket Web Application Server
 * Server filesystem module
 *
 * Part of Oni Apollo
 * Version: 'unstable'
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

var fs = require('apollo:nodejs/fs');
var path = require('path');
var common = require('apollo:common');
var stream = require('apollo:nodejs/stream');
var logging = require('apollo:logging');

// the one and only pathmap; set at server startup:
var pathMap = [];

//----------------------------------------------------------------------
// initialization

exports.setPathMap = function(paths) {
  pathMap = paths;
};

//----------------------------------------------------------------------
// helpers

// returns [matches, handler] || null
function match_handler(path) {
  var matches;
  var l = pathMap.length;
  for (var i=0; i<l; ++i) {
    if((matches = path.match(pathMap[i].pattern)))
      return [matches, pathMap[i].handler];
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
  text = text || title;
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
function listDirectory(request, response, root, branch, format, formats) {
  
  var listing = {
    path: branch,
    directories: [],
    files: []
  };
  
  // add ".." unless we're listing the root
  if(branch != '/') {
    listing.directories.push("..");
  }

  var files = fs.readdir(path.join(root, branch));
  for (var i=0; i<files.length; ++i) {
    var filename = files[i];
    var filepath = path.join(root, branch, filename);

    if (fs.isDirectory(filepath)) {
      listing.directories.push(filename);
    }
    else if (fs.isFile(filepath)) {
      var size = fs.stat(filepath).size;
      listing.files.push({name: filename, size: size});
    }
  }
  var listingJson = JSON.stringify(listing);
  return formatResponse(
      { input: function() { return new stream.ReadableStringStream(listingJson) },
        extension: "/",
        requestedFormat: format,
        defaultFormats: defaultDirectoryListingFormats
      },
      request, response, formats);
}

function directoryListingToJSON(src, dest) {
  // directory listing currently comes as JSON
  stream.pump(src, dest);
};

function directoryListingToHtml(src, dest) {
  var dir = JSON.parse(stream.readAll(src));
  //XXX should this preserve !format fragment when linking to other directories?
  var header = "<h1>Contents of " + dir.path + "</h1>";
  var folderList = dir.directories.map(function(d) {
    //XXX xml escaping!
    return "<li><a href=\"" + d + "/\">" + d + "/</a></li>";
  });
  var fileList = dir.files.map(function(f) {
    var size = f.size;
    var sizeDesc = null;
    if (size < 1024)
      sizeDesc = size + " B";
    else if (size < 1024 * 1024)
      sizeDesc = Math.round(size/1024*10)/10+ " kB";
    else
      sizeDesc = Math.round(size/1024/1024*10)/10+ " MB";
    return "<li><a href=\"" + f.name + "\">" + f.name + "</a>(" + sizeDesc + ")</li>";
  });
  dest.write(header + "<ul>" + folderList.join("\n") + fileList.join("\n") + "</ul>");
};

// Used as a default, overrideable by specifying
// something for "/" in formats
var defaultDirectoryListingFormats = {
  "/": { none: { mime: "text/html",
               filter: directoryListingToHtml },
         json: { mime: 'application/json',
               filter: directoryListingToJSON }}
};



//----------------------------------------------------------------------
// formatResponse:
// takes an `item`, a request, a response and a
// formats object, and may write the item to the
// response. Returns whether the item was written.
//
// An item must contain the following keys:
//  - extension
//  - input (a stream of data)
//  - requestedFormat
// Optionally:
//  - defaultFormats, for use when
//    the server has no configured format for the given
//    extension / format.
//  - etag: etag of the input stream
function formatResponse(item, request, response, formats) {
  var input = item.input;
  var extension = item.extension;
  var format = item.requestedFormat;
  var defaultFormats = item.defaultFormats;

  formats = common.mergeSettings(defaultFormats, formats);
  var filedesc = formats[extension] || formats["*"];
  if (!filedesc) {
    console.log("Don't know how to serve item with extension '#{extension}'");
    // XXX should we generate an error?
    return false;
  }

  var formatdesc = filedesc[format.name];
  if (!formatdesc && !format.mandatory)
    formatdesc = filedesc["none"];
  if (!formatdesc) {
    console.log("Can't serve item with extension '#{extension}' in format '#{format.name}'");
    // XXX should we generate an error?
    return false;
  }

  // try to construct an etag, based on the file's & (potential) filter's etag:
  var etag;
  if (item.etag) {
    if (formatdesc.filter && formatdesc.filterETag)
      etag = "\"#{formatdesc.filterETag()}-#{item.etag}\"";
    else if (!formatdesc.filter)
      etag = "\"#{item.etag}\"";
  }

  // check for etag match
  if (etag) {
    if (request.headers["if-none-match"]) {
//      console.log("If-None-Matched: #{request.headers['if-none-match']}");
      // XXX wrt '-gzip': Apache attaches this prefix to ETags. We remove it here
      // if present, so that we can run rocket behind an Apache reverse proxy.
      // Clearly this is hackish and not a good place for it :-/
      if (request.headers["if-none-match"].replace(/-gzip$/,'') == etag) {
//        console.log("#{request.url} #{etag} Not Modified!");
        response.writeHead(304);
        response.end();
        return true;
      }
//      else {
//        console.log("#{request.url} outdated");        
//      }  
    }
//    else {
//      console.log("#{request.url}: requested without etag");
//    }
  }
//  else {
//    console.log("no etag for #{request.url}");
//  }

  // construct header:
  var contentHeader = formatdesc.mime ? {"Content-Type":formatdesc.mime} : {};
  if (etag)
    contentHeader["ETag"] = etag;
  
  if(formatdesc.filter) {
    response.writeHead(200, contentHeader);
    if (request.method == "GET") { // as opposed to "HEAD"
      if (formatdesc.cache && etag) {
        // check cache:
        var cache_entry = formatdesc.cache.get(request.url);
        if (!cache_entry || cache_entry.etag != etag) {
          var data_stream = new (stream.WritableStringStream);
          formatdesc.filter(input(), data_stream, request);
          cache_entry = { etag: etag, data: data_stream.data };
          console.log("populating cache #{request.url} length: #{cache_entry.data.length}");
          formatdesc.cache.put(request.url, cache_entry, cache_entry.data.length);
        }
        // write to response stream:
//        console.log("stream from cache #{request.url}");
        stream.pump(new (stream.ReadableStringStream)(cache_entry.data), response);
      }
      else // no cache or no etag -> filter straight to response
        formatdesc.filter(input(), response, request);
    }
  } else {
    if (item.length) {
      contentHeader["Content-Length"] = item.length;
      contentHeader["Accept-Ranges"] = "bytes";
    }
    var range;
    if (item.length && request.headers["range"] && 
        (range=/^bytes=(\d*)-(\d*)$/.exec(request.headers["range"]))) {
      // we honor simple range requests
      var from = range[1] ? parseInt(range[1]) : 0;
      var to = range[2] ? parseInt(range[2]) : item.length-1;
      to = Math.min(to, item.length-1);
      if (isNaN(from) || isNaN(to) || from<0 || to<from)
        response.writeHead(416); // range not satisfiable
      else {
        contentHeader["Content-Length"] = (to-from+1);
        contentHeader["Content-Range"] = "bytes "+from+"-"+to+"/"+item.length;
        response.writeHead(206, contentHeader);
        if (request.method == "GET") // as opposed to "HEAD"
          stream.pump(input({start:from, end:to}), response);
      }
    }
    else {
      // normal request
      response.writeHead(200, contentHeader);
      if (request.method == "GET") // as opposed to "HEAD"
        stream.pump(input(), response);
    }
  }
  response.end();
  return true;
};

// attempts to serve the file; returns 'false' if not found
function serveFile(request, response, filePath, format, formats) {
  try {
    var stat = fs.stat(filePath);
  }
  catch (e) {
    return false;
  }
  if (!stat.isFile()) return false;
  
  var etag = "#{stat.mtime.getTime()}";

  var ext = path.extname(filePath).slice(1);
  return formatResponse(
    { input: opts ->
        // XXX hmm, might need to destroy this somewhere
        require('fs').createReadStream(filePath, opts) 
      ,
      length: stat.size,
      extension: ext,
      requestedFormat: format,
      etag: etag
    },
    request, response, formats);
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
    
    var relativePath = matches[1] || "/";
    var pathAndFormat = relativePath.split("!");
    relativePath = pathAndFormat[0];
//    console.log(relativePath + " " +require('apollo:debug').inspect(request.parsedUrl));
    var format;
    if (pathAndFormat[1])
      format = { name: pathAndFormat[1], mandatory: true };
    else 
      format = { name: request.parsedUrl.queryKey.format || "none" };

    var file = relativePath ? path.join(root, relativePath) : root;
    if (process.platform == "win32") {
      file = file.replace(/\\/g, "/");
    }
    if (fs.isDirectory(file)) {
      // make sure we have a canonical url with '/' at the
      // end. otherwise relative links will break:
      if (file[file.length-1] != "/") {
        // XXX this will lose any format given
        // (and we don't want to append '!none' if no format was given)
        var newUrl = relativePath + "/";
        writeRedirectResponse(response, newUrl);
        return;
      }
      var served = false;
      if (flags.mapIndexToDir)
        served = serveFile(request, response, file + "/index.html", format, formats);
      if (!served) {
        served = serveFile(request, response, file + "/index.app", format, formats);
      }
      if (!served) {
        if(flags.allowDirListing)
          served = listDirectory(request, response, root, relativePath, format, formats);
        if(!served) {
          console.log("Could not render '"+file+"' in the requested format");
          writeErrorResponse(response, 406, "Not Acceptable", "Could not find an appropriate representation");
        }
      }
    }
    else {
      // normal file
      try {
        if (!serveFile(request, response, file, format, formats)) {
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

//----------------------------------------------------------------------
// 'keyhole' server for mapping files dynamically:

var keyholes = {};



var crypto = require('crypto');
function makeKeyholeID() {
  return crypto.randomBytes(16).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/\=/g, '');
}

function createKeyhole() {
  var mappings = {};
  var id = makeKeyholeID();
  keyholes[id] = mappings;

  return {
    id: id,
    mappings: mappings, // virtual_path -> { file, mime }
    close: -> delete keyholes[id]
  }
}
exports.createKeyhole = createKeyhole;

function createKeyholeHandler() {
  function handle_get(request, response, matches) {

    // find the keyhole descriptor:
    var descriptor;
    var keyhole_id, keyhole_path;
    [,keyhole_id, keyhole_path] = matches;
    console.log("accessing keyhole #{keyhole_id} -- #{keyhole_path}");
    var keyhole = keyholes[keyhole_id];

    // no descriptor
    if (!keyhole || !(descriptor = keyhole[keyhole_path])) {
      console.log("keyhole #{keyhole_id} -- #{keyhole_path} not found");
      writeErrorResponse(response, 404, "Not Found");
      return;
    }

    if (descriptor.file) {
      // serve as file from the filesystem
      // XXX this format stuff is a bit of a song and dance
      var formats = { '*': { custom : { mime: descriptor.mime } } };
      if (!serveFile(request, response, descriptor.file, {name:'custom'}, formats)) {
        throw "Cannot serve file";
      }
    }
  }

  return { handle_get: handle_get };
}

exports.createKeyholeHandler = createKeyholeHandler;