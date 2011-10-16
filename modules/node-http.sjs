/*
 * Oni Apollo 'node-http' module
 * Stratified wrapper of nodejs http functionality
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: '0.13.2'
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
   @summary Run a simple HTTP server. To be documented.
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
    server.close();
  }
};
