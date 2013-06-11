/*
 * Oni Apollo 'rpc/aat-server' module
 * Asymmetric AJAX Transport Server
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2012 Oni Labs, http://onilabs.com
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
   @module  rpc/aat-server
   @summary Asymmetric AJAX Transport Server
   @home    sjs:rpc/aat-server
   @hostenv nodejs
   @desc    AAT is an efficient bi-directional message exchange protocol over HTTP
*/

var sjcl   = require('sjs:sjcl');
var fs     = require('sjs:nodejs/fs');
var buffer = require('nodejs:buffer');
var { each, map, toArray } = require('sjs:sequence');

var REAP_INTERVAL = 1000*60; // 1 minute
var PING_INTERVAL = 1000*40; // 40 seconds
var POLL_ACCU_INTERVAL = 200; // 200 ms
var EXCHANGE_ACCU_INTERVAL = 10; // 10ms

//----------------------------------------------------------------------
// helper function to generate random 128bit id's:

// initialize random number generator for generating transport ids:
var f = fs.open('/dev/random', 'r');
var buf = new (buffer.Buffer)(128);
while (!sjcl.random.isReady()) {
//  console.log('adding entropy to random number generator');
  fs.read(f, buf, 0, 128);
  sjcl.random.addEntropy(buf.toString('hex'), 1024);
}
fs.close(f);

function createID() {
  return sjcl.codec.base64.fromBits(sjcl.random.randomWords(4), true);
}

//----------------------------------------------------------------------
// default transport sink (for testing):
function defaultTransportSink(transport) {
  spawn (function() {
    try {
      while (1) {
        var message = transport.receive();
        console.log("TransportSink #{transport.id}: #{message}");
        if (message == 'time')
          transport.send(new Date());
        else if (message == 'delay') 
          spawn (hold(1000),transport.send('delayed!'));
      }
    }
    catch (e) {
      console.log("TransportSink #{transport.id}: #{e}");
    }
  })();
}

//----------------------------------------------------------------------
// Transports

// transports indexed by transport id:
var transports = {};

function createTransport() {

  var send_q = [];
  var receive_q = [];
  var resume_receive;
  var reset_reaper;
  
  var resume_poll;
  var exchange_in_progress = false;

  var transport = {
    id: createID(),
    active: true,
    exchangeMessages: function(in_messages, out_messages) {
      // assert(this.active)
      try {
        exchange_in_progress = true;

        // put new incoming messages into our receive_q:
        in_messages .. each {
          |mes|
          receive_q.unshift(mes);
        }
        
        // now resume our receiver; this might lead to 
        // re-entrant calls to send(), which is good, because then 
        // we can flush out the given messages immediately
        if (in_messages.length && resume_receive) {
          resume_receive();
          // wait a little bit for outgoing messages:
          hold(EXCHANGE_ACCU_INTERVAL);
        }
        
        // flush our send_q:
        send_q .. each {
          |mes|
          out_messages.unshift(mes);
        }
        send_q = [];
        
        // reset our reaper:
        if (reset_reaper)
          reset_reaper();
      }
      finally {
        exchange_in_progress = false;
      }
    },

    pollMessages: function(in_messages, out_messages) {
//      console.log('polling...');
      // assert(this.active)
      if (in_messages.length) {
        // XXX we don't support messages in poll yet
        out_messages.push('error_unsupported_poll');
      }
      else if (resume_poll) {
        console.log('multiple poll');
        // Can only have one active poll
        out_messages.push('error_poll_in_progress');
      }
      else {
        // give messages a small time to accumulate:
        hold(POLL_ACCU_INTERVAL);
        if (!send_q.length) {
          waitfor {
            waitfor(var e) { resume_poll = resume; }
            finally { resume_poll = undefined; }
            if (e) { throw e; } // XXX is this the right thing to do; or send error?
          }
          or {
            hold(PING_INTERVAL);
          }
          
        }
        transport.exchangeMessages([], out_messages);
        out_messages.unshift('ok');
      }
    },

    // external API:
    send: function(message) {
      if (!this.active) throw new Error("inactive transport");
      send_q.unshift(message);
      if (resume_poll && !exchange_in_progress) resume_poll();
    },
    receive: function() {
      if (!this.active) throw new Error("inactive transport");
      if (!receive_q.length) {
        waitfor(var e) {
          resume_receive = resume;
        }
        finally {
          resume_receive = undefined;
        }
        if (e) throw e; // exception thrown
      }
      // assert (receive_q.length)
      return receive_q.shift();
    }
  };

  function reaper() {
    while (1) {
      waitfor {
        waitfor () {
          reset_reaper = resume;
        }
        finally {
          reset_reaper = undefined;
        }
      }
      or {
        hold(REAP_INTERVAL);
        break;
      }
    }
    // ok, we've been reaped; remove from transports:
    delete transports[transport.id];
    transport.active = false;
    if (resume_receive)
      resume_receive(new Error('transport closed'));
    console.log("#{transport.id} closed");
  }

  spawn reaper();

  transports[transport.id] = transport;

  return transport;
}

//----------------------------------------------------------------------
// Transport handler; main entrypoint:

/**
   @function createTransportHandler
   @summary create an AAT transport handler for use by the Rocket server.
   @param {Function} [transportSink] Function to pass  accepted [aat-client::Transport] objects to
*/
function createTransportHandler(transportSink) {
  if (!transportSink) transportSink = defaultTransportSink;

  return {
    handle_get: (req, resp, v) -> this.handle_post(req, resp, v),

    handle_post: function(req, resp, v) {
//      console.log("AAT request #{require('sjs:debug').inspect(req)}");

      var out_messages = [];

      var command = decodeURIComponent(req.parsedUrl.queryKey.cmd);

      if (command == 'send') {
        // message is arriving via a new transport -> create one:
        var transport = createTransport();

        transportSink(transport);

        var in_messages = 
          (req.body.length ? JSON.parse(req.body.toString('utf8')) : []) .. 
          map(mes -> { type: 'message', data: mes});

        transport.exchangeMessages(in_messages, out_messages);
        console.log("new transport #{transport.id}");
        out_messages.unshift("ok_#{transport.id}");
      }
      else if (command.indexOf('send_') == 0) {
        // find the transport:
        var transport = transports[command.substr(5)];
        if (!transport) {
          console.log("#{command}: transport not found");
          out_messages.push('error_id');
        }
        else {
          var in_messages = 
            (req.body.length ? JSON.parse(req.body.toString('utf8')) : []) ..
            map(mes -> { type: 'message', data: mes});

          transport.exchangeMessages(in_messages, 
                                     out_messages);
          out_messages.unshift('ok');
        }
      }
      else if (command.indexOf('data_') == 0) {
        // find the transport:
        var transport = transports[command.substr(5)];
        if (!transport) {
          console.log("#{command}: transport not found");
          out_messages.push('error_id');
        }
        else {
          transport.exchangeMessages([
            { type: 'data', 
              header: JSON.parse(decodeURIComponent(req.parsedUrl.queryKey.header)),
              data: req.body
            }], 
            out_messages);
          out_messages.unshift('ok');
        }
      }
      else if (command.indexOf('poll_') == 0) {
        // find the transport:
        var transport = transports[command.substr(5)];
        if (!transport) {
          console.log("#{command}: transport not found");
          out_messages.push('error_id');
        }
        else {
          transport.pollMessages(req.body.length ? JSON.parse(req.body.toString('utf8')) : [], 
                                 out_messages);
        }
      }
      else if (command == 'poll') {
        // XXX poll without id not supported yet
        // we expect client to always perform a 'send' first
        out_messages.push('error_unsupported_poll');
      }
      else
        out_messages.push("error_unknown_message");

      resp.end(JSON.stringify(out_messages));
    }
  }
}
exports.createTransportHandler = createTransportHandler;

