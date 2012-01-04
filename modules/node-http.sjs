/*
 * Oni Apollo 'node-http' module
 * Stratified wrapper of nodejs http functionality
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2011 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
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
/**
  @module    node-http
  @summary   Stratified wrapper of nodejs http functionality
  @hostenv   nodejs
*/

if (require('sjs:apollo-sys').hostenv != 'nodejs') 
  throw new Error('node-http only runs in a nodejs environment');


var builtin_http = require('http');
var collection = require('./collection');
var http = require('./http');
var events = require('./node-events');

// helper to receive a (smallish, <10MB) utf8 request body (if any) and store it 
// on request.body
function receiveBody(request) {
  __js request.setEncoding('utf8');
  __js request.body = "";
  waitfor {
    waitfor() { __js request.on('end', resume); }
  }
  or {
    while (1) { 
      request.body += events.waitforEvent(request, 'data')[0];
      __js if (request.body.length > 1024*1024*10) throw "Request body too large";
    }
  }
}

// helper to receive a body before handling a request
function handleRequest(connectionHandler, request, response) {
  waitfor {
    receiveBody(request); 
    connectionHandler(request, response);
  }
  or {
    events.waitforEvent(request, 'close');
    throw "Connection closed";
  }
  catch (e) {
    console.log("exception thrown by connection handler: "+e.toString());
  }
}

/**
   @function runSimpleServer
   @summary Run a simple HTTP server.
   @param {Function} [connectionHandler] Function to be invoked for each request
   @param {Integer} [port] Port to listen on
   @param {optional String} [host] IP address to listen on. (If not specified, the server will
                                   listen on all IP addresses, i.e. INADDR_ANY.)
   @desc
     `runSimpleServer` will start a HTTP server on the given
     `host:port` and **block until aborted**, or throw an exception if the
     server cannot be started.

     For an incoming request `req` (see [nodejs
     http.ServerRequest](http://nodejs.org/docs/v0.5.8/api/http.html#http.ServerRequest)),
     `runSimpleServer` will first receive any request body (utf8
     assumed and up to a maximum size of 10MB - larger requests will
     be ignored). The request body will be stored on `req.body`, and
     `connectionHandler` will be called with arguments `(req,resp)`. 
     For details about `resp` see [nodejs
     http.ServerResponse](http://nodejs.org/docs/v0.5.8/api/http.html#http.ServerResponse).

     When `runSimpleServer` is aborted, the underlying [nodejs
     http.Server](http://nodejs.org/docs/v0.5.8/api/http.html#http.Server)
     will be closed. This will make it stop accepting new connections, but
     existing connections might not be closed.

     **Example:**

         function echo(req, resp) {
           resp.end(require('util').inspect(req));
         }

         // Run server for 60s:
         waitfor {
           require('apollo:node-http').runSimpleServer(echo, 12345);
         }
         or { 
           hold(60*1000);
         }
         console.log('Server stopped');
 */
exports.runSimpleServer = function(connectionHandler, port, /* opt */ host) {
  var server = builtin_http.createServer(function(req, res) { 
    __js handleRequest(connectionHandler, req, res);
  });
  try {
    server.listen(port, host);
    hold();
  }
  finally {
    try { server.close(); } catch(e) { }
  }
};

/* XXXX document me */

function ServerRequest(req, res) {
  this.request = req;
  this.response = res;
  // XXX https
  this.url = http.parseURL(http.canonicalizeURL(req.url, 'http://'+req.headers.host));
  // XXX other encodings
  req.setEncoding('utf8');
  // receive a (smallish, <10MB) utf8 request body (if any):
  this.body = "";
  waitfor {
    waitfor() { __js req.on('end', resume); hold(1000);}
  }
  or {
    while (1) {
      this.body += events.waitforEvent(req, 'data')[0];
      if (this.body.length > 1024*1024*10) {
        // close the socket, lest the client send us even more data:
        req.destroy();
        throw "Request body too large";
      }
    }
  }
}



/* XXXX document me */
exports.server = function server(port, /* opt */ host) {
  return new Server(port, host);
};

function Server(port, host) {
  var capacity = 100; // XXX does this need to be configurable??
  var me = this;
  this._queue = new (require('./cutil').Queue)(capacity, true);
  this._server = builtin_http.createServer(
    function(req, res) {
      if (me._queue.size == capacity) {
        // XXX 
        throw new Error("dropping request");
      }
      me._queue.put(new ServerRequest(req, res));
    });
  this._server.listen(port, host);
}              
                     
Server.prototype.count = function() { return this._queue.count(); };

Server.prototype.address = function() { return this._server.address(); };

Server.prototype.get = function() { return this._queue.get(); };

Server.prototype.stop = function() { this._server.close(); };

Server.prototype.__finally__ = function() { this.stop(); };


/* XXXX document me */

exports.router = function router(port, /* opt */ host) {
  return new Router(port, host);
};

function Router(routes, port, host) {
  this.routes = routes || [];
  var me = this;
  this._server = builtin_http.createServer(
    function(req, res) {
      waitfor {
        // if the request is closed, we automatically abort any route
        // currently in progress
        events.waitforEvent(req, 'close');        
        console.log('connection closed');
      }
      or {
        var sr = new ServerRequest(req, res);
        console.log(sr.url.path);
//        console.log(sr.request.headers);
        var matches;
        var route = collection.find(me.routes, function (r) {
          if (typeof r[0] == 'string') {
            if (r[0] != sr.url.path) return false;
            matches = [r[0]];
            return true;
          }
          else if (typeof r[0] == 'object' && r[0].exec) {
            // regexp match
            return (matches = r[0].exec(sr.url.path));
          }
        });
        if (route) {
          // execute route:
          var result = route[1](sr, matches);
          if (!sr.response.finished) 
            sr.response.end(result);
        }
        else {
          // Not found
          sr.response.writeHead(404);
          sr.response.end();
        }
        
      }
      catch (e) {
        if (!isHTMLStatusCodeException(e)) { 
          console.log('Error in request handler for '+req.url+': '+e);
          if (!res.finished && res.connection.writable) {
            if (!res._headerSent) 
              res.writeHead(500);
            res.end();
          }
        }
        else {
          if (!res.finished && res.connection.writable) {
            if (!res._headerSent) 
              res.writeHead(statusCodeFromException(e), reasonPhraseFromException(e));
            else 
            console.log("Can't send error code "+statusCodeFromException(e)+" - header already sent.");              
            res.end();
          }
          else {
            console.log("Can't send error code "+statusCodeFromException(e)+" - connection is not writable");
          }
        }
      }
    });
  waitfor () {
    this._server.listen(port, host, resume);
  }
}

// We allow handlers to throw html status code numbers or [code, reason-phrase] arrays
function isHTMLStatusCodeException(x) {
  return (typeof x == 'number') || (Array.isArray(x) && typeof x[0] == 'number');
}
function statusCodeFromException(x) {
  return typeof x == 'number' ? x : x[0];
}
function reasonPhraseFromException(x) {
  return typeof x == 'number' ? undefined : x[1];
}
 

Router.prototype.address = function() { return this._server.address(); };

Router.prototype.stop = function() { 
  // XXX even after we stop the server, any open connections will
  // still be serviced. Make sure we send 400's:
  this.routes = [];
  try {  
    this._server.close(); 
  }
  catch(e) {} 
};

Router.prototype.__finally__ = function() { this.stop(); };
