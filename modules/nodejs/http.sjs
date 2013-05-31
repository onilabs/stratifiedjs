/*
 * Oni Apollo 'nodejs/http' module
 * HTTP server functionality
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2012-2013 Oni Labs, http://onilabs.com
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
  @module    nodejs/http
  @summary   HTTP server functionality
  @home      sjs:nodejs/http
  @hostenv   nodejs
*/

if (require('builtin:apollo-sys').hostenv != 'nodejs') 
  throw new Error('The nodejs/http module only runs in a nodejs environment');


var builtin_http  = require('http');

var { find, parallelize, generate, filter, each } = require('../sequence');
var url = require('../url');
var { Queue } = require('../cutil');
var { override } = require('../object');
var events = require('../events');

//----------------------------------------------------------------------
// XXX nodejs < v8 backfill:

var concatBuffers = Buffer.concat;
if (!concatBuffers) {
  concatBuffers = function(list, length) {
    if (!Array.isArray(list)) {
      throw new Error('Usage: Buffer.concat(list, [length])');
    }
    
    if (list.length === 0) {
      return new Buffer(0);
    } else if (list.length === 1) {
      return list[0];
    }
    
    if (typeof length !== 'number') {
      length = 0;
      for (var i = 0; i < list.length; i++) {
        var buf = list[i];
        length += buf.length;
      }
    }
    
    var buffer = new Buffer(length);
    var pos = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      buf.copy(buffer, pos);
      pos += buf.length;
    }
    return buffer;
  };
}

//----------------------------------------------------------------------
// helpers

// helper to receive a (smallish, <10MB) request body (if any)
function receiveBody(request) {
  __js var rv = new Buffer(0);
  waitfor {
    waitfor() { __js request.on('end', resume); }
  }
  or {
    while (1) { 
      rv = concatBuffers(
        [rv, 
         events.wait(request, 'data')
        ]);
      __js if (rv.length > 1024*1024*10) throw "Request body too large";
    }
  }
  return rv;
}


//----------------------------------------------------------------------
// DEPRECATED API

// helper to receive a body before handling a request
function handleRequest(connectionHandler, request, response, protocol) {
  request.protocol = protocol;
  waitfor {
    request.body = receiveBody(request); 
    connectionHandler(request, response);
  }
  or {
    events.wait(request, 'close');
    throw "Connection closed";
  }
  catch (e) {
    console.log("exception thrown by connection handler: "+e.toString());
    response.destroy(); // XXX is this the best cleanup we can do?
  }
}

/**
   @function runSimpleServer
   @deprecated Use [::server] or [::router] instead.
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
     http.ServerRequest](http://nodejs.org/docs/latest/api/http.html#http.ServerRequest)),
     `runSimpleServer` will first receive any request body (up to a maximum size of 
     10MB - larger requests will be ignored). 
     The request body will be stored as a nodejs Buffer on `req.body`, and
     `connectionHandler` will be called with arguments `(req,resp)`. The protocol (`"http"`) 
     will be stored on `req.protocol`.
     For details about `resp` see [nodejs
     http.ServerResponse](http://nodejs.org/docs/latest/api/http.html#http.ServerResponse).

     When `runSimpleServer` is aborted, the underlying [nodejs
     http.Server](http://nodejs.org/docs/latest/api/http.html#http.Server)
     will be closed. This will make it stop accepting new connections, but
     existing connections might not be closed.

     **Example:**

         function echo(req, resp) {
           resp.end(require('util').inspect(req));
         }

         // Run server for 60s:
         waitfor {
           require('sjs:nodejs/http').runSimpleServer(echo, 12345);
         }
         or { 
           hold(60*1000);
         }
         console.log('Server stopped');
 */
exports.runSimpleServer = function(connectionHandler, port, /* opt */ host) {
  var server = builtin_http.createServer(function(req, res) { 
    __js handleRequest(connectionHandler, req, res, 'http');
  });
  try {
    server.listen(port, host);
    hold();
  }
  finally {
    try { server.close(); } catch(e) { }
  }
};

/**
   @function runSimpleSSLServer
   @summary Run a simple HTTPS server.
   @param {Function} [connectionHandler] Function to be invoked for each request
   @param {Object} [ssl_opts] SSL options as described [here](http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener)
   @param {Integer} [port] Port to listen on
   @param {optional String} [host] IP address to listen on. (If not specified, the server will
                                   listen on all IP addresses, i.e. INADDR_ANY.)
   @desc
     `runSimpleSSLServer` will start a HTTPS server on the given
     `host:port` and **block until aborted**, or throw an exception if the
     server cannot be started.

     For an incoming request `req` (see [nodejs
     http.ServerRequest](http://nodejs.org/docs/latest/api/http.html#http.ServerRequest)),
     `runSimpleServer` will first receive any request body (up to a maximum size of 
     10MB - larger requests will be ignored). 
     The request body will be stored as a nodejs Buffer on `req.body`, and
     `connectionHandler` will be called with arguments `(req,resp)`. The protocol (`"https"`) 
     will be stored on `req.protocol`. 
     For details about `resp` see [nodejs
     http.ServerResponse](http://nodejs.org/docs/latest/api/http.html#http.ServerResponse).

     When `runSimpleServer` is aborted, the underlying [nodejs
     http.Server](http://nodejs.org/docs/latest/api/http.html#http.Server)
     will be closed. This will make it stop accepting new connections, but
     existing connections might not be closed.
 */
exports.runSimpleSSLServer = function(connectionHandler, ssl_opts, port, /* opt */ host) {
  var server = require('https').createServer(
    ssl_opts,
    function(req, res) { 
      __js handleRequest(connectionHandler, req, res, 'https');
    });

  try {
    server.listen(port, host);
    hold();
  }
  finally {
    try { server.close(); } catch(e) { }
  }
};

//----------------------------------------------------------------------

/**
 @class ServerRequest
 @summary Incoming HTTP request. 
 @desc
    - Request body size is limited to 10MB.
*/
function ServerRequest(req, res, ssl) {
  /**
   @variable ServerRequest.request
   @summary [NodeJS http.ServerRequest](http://nodejs.org/docs/latest/api/http.html#http.ServerRequest) object
   */
  this.request = req;
  /**
   @variable ServerRequest.response
   @summary [NodeJS http.ServerResponse](http://nodejs.org/docs/latest/api/http.html#http.ServerResponse) object
   */
  this.response = res;
  /**
   @variable ServerRequest.url
   @summary Full canonicalized request URL object in the format as returned by [url::parse].
   */
  this.url = url.parse(url.normalize(req.url, 
                                      "http#{ssl ? 's' : ''}://#{req.headers.host}"));
  /**
   @variable ServerRequest.body
   @summary Request body (nodejs buffer, possibly empty)
   */
  // receive a (smallish, <10MB) request body (if any):
  this.body = receiveBody(this.request);
}

/**
   @function withServer
   @summary Work in progress
*/
function withServer(config, server_loop) {
  // detangle configuration:
  if (typeof config != 'object')
    config = { address: config };

  config = override({ 
    address: '0',
    capacity: 100,
    max_connections: 1000,
    ssl: false,
    key: undefined,
    cert: undefined,
    passphrase: undefined,
    log: x => process.stdout.write("#{address}: #{x}\n")
  }, config);

  var [,host,port] = /^(?:(.*)?\:)?(\d+)$/.exec(config.address);
  //var address; // hoisted; will be filled in in waitfor/or below

  // It is not quite clear how we can accept nodejs sockets on demand
  // (pause/resume?), so we use a queue:
  var request_queue = Queue(config.capacity, true);

  function dispatchRequest(req, res) {
    if (request_queue.count() == config.capacity) {
      // XXX
      config.log('Dropping request');
      res.writeHead(500);
      res.end();
      return;
    }
    request_queue.put([req, res]);
  }

  var server;
  if (!config.ssl)
    server = builtin_http.createServer(dispatchRequest);
  else
    server = require('https').createServer(
      {
        key: undefined,
        cert: undefined,
        passphrase: undefined
      } .. override(config),
      dispatchRequest);

  // bind the socket:
  waitfor  {
    var error = events.wait(server, 'error');
    throw new Error("Cannot bind #{config.address}: #{error}");
  }
  or { 
    waitfor() { server.listen(port, host, resume); }
  } 
  retract {
    // There is no clear way of aborting the socket binding process,
    // so to shut down things cleanly, we need to wait for the process
    // to complete (or fail)
    waitfor {
      events.wait(server, 'listening');
      try { server.close(); } catch(e) { /* ignore */ }
      // xxx close any connection that might have snuck in
    } or {
      events.wait(server, 'error');
    }
  }

  // XXX is there no flag on server that has this information???
  var server_closed = false;

  // run our server_loop :
  waitfor {
    var error = events.wait(server, 'error');
    throw new Error("#{config.address}: #{error}");
  }
  or {
    var {port, family, address} = server.address() || {};
    address = family=='IPv6' ? "[#{address}]:#{port}" : "#{address}:#{port}";

    config.log("Listening on #{address}");

    waitfor {
      server .. events.wait('close');
      server_closed = true;
    }
    and {
      server_loop(
        {
          nodeServer: server,
          address: address,
          stop: -> server.close(),
          eachRequest: function(handler) { 
            waitfor {
              if (!server_closed)
                server .. events.wait('close');
            }
            or {
              generate(-> request_queue.get()) ..
                filter(function(req_res) {
                  if (req_res[0].socket.writable) return true;
                  config.log("Pending connection closed");
                  return false;
                }) ..
                parallelize(config.max_connections) ..
                each {
                  |req_res|
                  var [req,res] = req_res;
                  waitfor {
                    events.wait(req, 'close');
                    config.log("Connection closed");
                  }
                  or {
                    handler(new ServerRequest(req, res, config.ssl));
                    if (!res.finished) {
                      config.log("Unfinished response");
                      if(!res._header) {
                        config.log("Response without header; sending 500");
                        res.writeHead(500);
                        res.end();
                      }
                      else {
                        // headers have already been sent; only course of action is
                        // to close the connection
                        req.socket.destroy();
                      }
                    }
                  }
                  retract { 
                    config.log("Active request while server shutdown");
                    // try to gracefully end this?
                  }
                }
            } 
          }
        });
    }
  }
  finally {
    if (!server_closed) {
      try { server.close(); } catch(e) { /* ignore */ }
    }
    if (server.connections) {
      config.log("Server closed, but #{server.connections} lingering open connections");
      // XXX close connections
    }
    else 
      config.log("Server closed");
  }
}
exports.withServer = withServer;

//----------------------------------------------------------------------
// REMOVE
//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

/**
 @class Router
 @summary HTTP path router
 @desc
   Use function [::router] to construct a new Router object.

 @function router
 @summary  Constructs a new [::Router] object.
 @param    {Array} [routes] Array of routes; see [::Router::routes] for format
 @param    {Integer} [port] Port to listen on (0 to automatically assign free port).
 @param    {optional String} [host='INADDR_ANY'] IP address to listen on. If not
           specified, the server will listen on all IP addresses, i.e. INADDR_ANY.
 @desc
   **Example:**
   
       using (var router = require('sjs:nodejs/http').router(
                [ ['/ping', function(r) { hold(1000); return 'pong'; }],
                  [/.*$/,   function(r) { return r.url.path; }] ],
                8090)) {
         console.log('Listening on '+router.address().port);
         waitfor() {
           router.routes.unshift(['/stop', resume]);
         }
         console.log('Stopping router');
       }
 */







exports.router = function router(routes, port, /* opt */ host) {
  return new Router(routes, port, host);
};

function Router(routes, port, host) {
  /**
   @variable Router.routes
   @summary  Array of routes
   @desc
     TODO: document format
   */
  this.routes = routes || [];
  var me = this;
  this._server = builtin_http.createServer(
    function(req, res) {
      waitfor {
        // if the connection is closed, we automatically abort any
        // route currently in progress
        events.wait(req, 'close');        
        console.log('connection closed');
      }
      or {
        var sr = new ServerRequest(req, res);
        console.log(sr.url.path);
//        console.log(sr.request.headers);
        var matches;
        var route = routes .. find(function (r) {
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
          var handler;
          if (typeof route[1] == 'object') {
            if (route[1].hasOwnProperty(sr.request.method))
              handler = route[1][sr.request.method];
          }
          else if (sr.request.method == "GET")
            handler = route[1];
          if (!handler)
            throw 405; // 'method not allowed'
          
          // parse flags:
          for (var i=2; i<route.length; ++i) {
            switch(route[i]) {
            case 'cors':
              sr.response.setHeader("Access-Control-Allow-Origin", "*");
              break;
            default:
              console.log('unknown flag '+route[i]+' on route '+route[0]+' ignored.');
            }
          }

          // execute handler:
          var result = handler(sr, matches);
          if (!sr.response.finished) 
            sr.response.end(""+result);
        }
        else {
          // Not found
          throw 404;
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
 
/**
 @function Router.address
 @summary  Returns the address that the server is listening on.
 @return {Object} Bound address in the form 
                  {address: IP_String, family: FAMILY_Int, port: PORT_Int}.
*/
Router.prototype.address = function() { return this._server.address(); };

/**
 @function Router.stop
 @summary  Stop listening for new connections. Unbind port.
 @desc
   Note that calling [::Router::stop] does not abort pending connections.
 */
Router.prototype.stop = function() { 
  // XXX even after we stop the server, any open connections will
  // still be serviced. Make sure we send 400's:
  this.routes = [];
  try {  
    this._server.close(); 
  }
  catch(e) {} 
};

/**
 @function Router.__finally__
 @summary Calls [::Router::stop].
          Allows [::Router] to be managed by a `using` construct. 
*/
Router.prototype.__finally__ = function() { this.stop(); };
