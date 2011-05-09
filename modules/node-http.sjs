/*
 * Oni Apollo 'node-http' module
 * Stratified wrapper of nodejs http functionality
 *
 * Part of the Oni Apollo Standard Module Library
 * 0.12+
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

if (require('sjs:__sys').hostenv != 'nodejs') 
  throw new Error('node-http only runs in a nodejs environment');


var builtin_http = require('http');
var events = require('./node-events');

// helper to receive a (smallish, <10MB) utf8 request body (if any) and store it 
// on request.body
function receiveBody(request) {
  request.setEncoding('utf8');
  request.body = "";
  waitfor {
    events.waitforEvent(request, 'end');
  }
  or {
    using (var dataQueue = events.eventQueue(request, 'data')) {
      while (1) { 
        request.body += dataQueue.get()[0];
        if (request.body.length > 1024*1024*10) throw "Request body too large";
      }
    }
  }
}

// helper to receive a body before handling a request
function handleRequest(connectionHandler, request, response) {
  receiveBody(request); 
  connectionHandler(request, response);
}

/**
   @function runSimpleServer
   @summary Run a simple HTTP server. To be documented.
*/
exports.runSimpleServer = function(connectionHandler, port, /* opt */ host) {
  var server = builtin_http.createServer(connectionHandler);
  try {
    server.listen(port, host);
    hold();
  }
  finally {
    server.close();
  }
};
