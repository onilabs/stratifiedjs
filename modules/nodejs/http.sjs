/*
 * StratifiedJS 'nodejs/http' module
 * HTTP server functionality
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
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

var { find, generate, filter, each } = require('../sequence');
var url = require('../url');
var { Queue } = require('../cutil');
var { override } = require('../object');
var event = require('../event');
var logging = require('../logging');
var array = require('../array');

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
         event.wait(request, 'data')
        ]);
      __js if (rv.length > 1024*1024*10) throw new Error("Request body too large");
    }
  }
  return rv;
}

//----------------------------------------------------------------------

/**
 @class ServerRequest
 @summary Incoming HTTP request. 
 @desc
    - Request body size is limited to 10MB.
*/
function ServerRequest(req, res, ssl) {
  var rv = {};
  /**
   @variable ServerRequest.request
   @summary [NodeJS http.ServerRequest](http://nodejs.org/docs/latest/api/http.html#http.ServerRequest) object
   */
  rv.request = req;
  /**
   @variable ServerRequest.response
   @summary [NodeJS http.ServerResponse](http://nodejs.org/docs/latest/api/http.html#http.ServerResponse) object
   */
  rv.response = res;
  /**
   @variable ServerRequest.url
   @summary Full canonicalized & normalized request URL object in the format as returned by [../url::parse].
   */
  rv.url = url.parse(url.normalize(url.canonicalize(req.url), 
                                      "http#{ssl ? 's' : ''}://#{req.headers.host}"));
  /**
   @variable ServerRequest.body
   @summary Request body (nodejs buffer, possibly empty)
   */
  // receive a (smallish, <10MB) request body (if any):
  rv.body = receiveBody(rv.request);

  return rv;
}

var getConnections = function(server) {
  if (server.getConnections) {
    waitfor(var err, rv) {
      server.getConnections(resume);
    }
    if (err) throw err;
    return rv;
  } else {
    // Old sync API
    return server.connections;
  }
};


/**
   @function withServer
   @altsyntax withServer(settings) { |server| ... }
   @altsyntax withServer(address) { |server| ... }
   @summary Run a HTTP(S) server.
   @param {Object} [settings] Server configuration
   @param {Function} [block] Function which will be passed a [::Server]. When `block` exits, the server will be shut down.
   @setting {String} [address="0"] Address to listen on, in the format `"ipaddress:port"` or `"port"`. If  `ipaddress` is not specified, the server will listen on all IP addresses. If `port` is `"0"`, an arbitrary free port will be chosen.
   @setting {String} [fd] Adopt an open file descriptor (if given, `address` is used only for information).
   @setting {Integer} [max_connections=1000] Maximum number of concurrent requests.
   @setting {Integer} [capacity=100] Maximum number of unhandled requests that the server will queue up before it starts dropping requests (with a 500 status code). The server only queues requests when there is no active [Server::eachRequest] call, or when there are already `max_connections` active concurrent connections.
   @setting {Boolean} [ssl=false] Whether to run a HTTP server or a HTTPS server.
   @setting {String}  [key] The server private key in PEM format. (Required when `ssl=true`.)
   @setting {String}  [cert] The server certificate in PEM format. (Required when `ssl=true`.)
   @setting {Array}   [ca] Optional array of authority certificates. (Only used when `ssl=true`.)
   @setting {String}  [passphrase] Optional passphrase to decrypt an encrypted private `key`.
   @setting {String}  [secureProtocol] SSL method to use. (Only used when `ssl=true`.)
   @setting {Integer} [secureOptions] Options to pass to the OpenSSL context. (Only used when `ssl=true`.)
   @setting {String}  [ciphers] Optional string describing the ciphers to use or exclude, separated by `:`. (Only used when `ssl=true`.)
   @setting {Function} [log] Logging function `f(str)` which will receive debug output. By default, uses [../logging::info]
   @desc
      `withServer` will start a HTTP(S) server according to the given 
      configuration and pass a [::Server] instance to `block`. The server will
      be shut down when `block` exits.
      
      ### Example:

          withServer('localhost:7080') {
            |server|

            console.log("Listening on #{server.address}");

            server.eachRequest {
              |req|
              // echo request object back to client:
              req.response.end(require('sjs:debug').inspect(req));
            }
          }
*/

/**
  @class Server
  @summary A HTTP(S) server instance, as created by [::withServer].

  @variable Server.nodeServer
  @summary The underlying [nodejs
    http.Server](http://nodejs.org/docs/latest/api/http.html#http_class_http_server) or [nodejs
    https.Server](http://nodejs.org/docs/latest/api/https.html#https_class_https_server)

  @variable Server.address
  @summary Address that the server is listening on (`"host:port"` string)

  @function Server.close
  @summary  Stop accepting new connections. Existing connections will not be closed.

  @function Server.eachRequest
  @altsyntax server.eachRequest { |req| ... }
  @param {Function} [handler_block] Handler which will be called with a [::ServerRequest] when a request is received.
  @summary Concurrently calls `handler_block` with a [::ServerRequest] to handle incoming requests. 
  @desc See [::withServer] for details of how to configure the maximum number of concurrent requests (`max_connections`) and for a typical usage example.
*/

function withServer(config, server_loop) {
  // detangle configuration:
  if (typeof config != 'object')
    config = { address: config };

  config = override({ 
    address: '0',
    max_connections: 1000,
    capacity: 100,
    ssl: false,
    key: undefined,
    cert: undefined,
    ca: undefined,
    passphrase: undefined,
    fd: undefined,
    log: x => logging.info(address, ":", x),
    print: logging.print,
    secureOptions: undefined,
    secureProtocol: undefined,
    ciphers: undefined
  }, config);

  var [,host,port] = /^(?:(.*)?\:)?(\d+)$/.exec(config.address);
  //var address; // hoisted; will be filled in in waitfor/or below

  // It is not quite clear how we can accept nodejs sockets on demand
  // (pause/resume?), so we use a queue 

  var request_queue = Queue(config.capacity, true);

  function dispatchRequest(req, res) {
    if (request_queue.count() == config.capacity) {
      // XXX
      config.log('Dropping request');
      res.writeHead(500);
      res.end();
      return;
    }
    try {
      var server_req = ServerRequest(req, res, config.ssl);
    }
    catch(e) {
      // we hit this e.g. if the body is too long
      config.log('Dropping request ('+e+')');
      res.writeHead(500);
      res.end();
      return;
    }
    request_queue.put(server_req);
  }

  var server;
  if (!config.ssl)
    server = builtin_http.createServer(dispatchRequest);
  else
    server = require('https').createServer(
      {
        key: undefined,
        cert: undefined,
        ca: undefined,
        passphrase: undefined,
        secureOptions: undefined,
        secureProtocol: undefined,
        ciphers: undefined
      } .. override(config),
      dispatchRequest);

  // bind the socket:
  waitfor  {
    var error = event.wait(server, 'error');
    throw new Error("Cannot bind #{config.address}: #{error}");
  }
  or { 
    waitfor() {
      var listenSrc = port;
      if (config.fd !== undefined) {
        // XXX no public API for this:
        var Pipe = process.binding('pipe_wrap').Pipe;
        var handle = new Pipe();
        handle.open(config.fd);
        server._handle = handle;
        listenSrc = {_handle: handle};
      }
      server.listen(listenSrc, host, resume);
    }
  } 
  retract {
    // There is no clear way of aborting the socket binding process,
    // so to shut down things cleanly, we need to wait for the process
    // to complete (or fail)
    waitfor {
      event.wait(server, 'listening');
      try { server.close(); } catch(e) { /* ignore */ }
      // xxx close any connection that might have snuck in
    } or {
      event.wait(server, 'error');
    }
  }

  // XXX is there no flag on server that has this information???
  var server_closed = false;
  var open_sockets = [];
  __js {
    // track open sockets for cleanup purposes
    // XXX can we get this info from the server object itself?
    server.on('connection', function(socket) {
      socket.on('close', function() {
        array.remove(open_sockets, socket);
      });
      open_sockets.push(socket);
    });
  }

  // run our server_loop :
  waitfor {
    var error = event.wait(server, 'error');
    throw new Error("#{config.address}: #{error}");
  }
  or {
    var address;

    if (config.fd !== undefined) {
      // when inheriting an FD, address() is not defined. Just show whatever was
      // passed in (for information's sake, we can't actually tell if it's correct)
      address = config.address || 'FD #{config.fd}';
    } else {
      var {port, family, address} = server.address() || {};
      address = family=='IPv6' ? "[#{address}]:#{port}" : "#{address}:#{port}";
    }

    if(config.print) config.print("Listening on #{address}");

    waitfor {
      server .. event.wait('close');
      server_closed = true;
    }
    and {
      server_loop(
        {
          nodeServer: server,
          address: address,
          stop: function() { server.close(); },
          getConnections: -> server .. getConnections(),
          eachRequest: function(handler) {
            waitfor {
              if (!server_closed)
                server .. event.wait('close');
            }
            or {
              generate(-> request_queue.get()) ..
                filter(function({request}) {
                  if (request.socket.writable) return true;
                  config.log("Pending connection closed");
                  return false;
                }) ..
                each.par(config.max_connections) {
                  |server_request|
                  waitfor {
                    event.wait(server_request.request, 'close');
                    config.log("Connection closed");
                  }
                  or {
                    handler(server_request);
                    if (!server_request.response.finished) {
                      config.log("Unfinished response");
                      if(!server_request.response._header) {
                        config.log("Response without header; sending 500");
                        server_request.response.writeHead(500);
                        server_request.response.end();
                      }
                      else {
                        // headers have already been sent; only course of action is
                        // to close the connection
                        server_request.request.socket.destroy();
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
      server.close();
    }
    if (open_sockets.length > 0) {
      config.log("destroying #{open_sockets.length} lingering connections");
      open_sockets .. each {|s|
        // destroy open socekts, because server.close() doesn't
        s.destroy();
      }
    }
    var connections = server .. getConnections();
    if (connections) {
      config.log("Server closed, but #{connections} lingering open connections");
    }
    else 
      config.log("Server closed");
  }
}
exports.withServer = withServer;

