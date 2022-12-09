/*
 * StratifiedJS 'thread' module
 * Asynchronous threads support
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '1.0.0'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013-2022 Oni Labs, http://onilabs.com
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
   @module     thread
   @summary    Asynchronous threads support
   @home       sjs:thread
*/
'use strict';

@ = require([
  './sequence', './event', './cutil', './vmbridge', './string'
]);

__js {

  // rv is sent as worker.postMessage(...[data, buffers])
  function serializeWorkerThreadMessage(message) {
    /*
        message is [data, buffers_array], where
        data contains pointers into buffers_array.

        To make sure buffers_array members get sent as actual transferables, 
        we need to return
        
          [[data, buffers_array], buffers_array]
      
        This gets posted as:

          postMessage([data, buffers_array], buffers_array);

        and will be received as

          [data, buffers_array] with every element in buffers_array sent as 
          an actual transferable.

        If we wanted to send *copies* instead of transferables, we would just return

          [message] 

     */

    return [message, message[1]];
  }
  function deserializeWorkerThreadMessage(message) {
    return message;
  }
} // __js

// exported for use within worker:
exports.withWorkerThreadWorkerTransport = function(session_f) {
  var Messages = @Dispatcher();
  self.onmessage = function({data}) { Messages.dispatch(deserializeWorkerThreadMessage(data)); };
  session_f({
    receive: Messages.receive,
    handshake: function(data) { 
      waitfor(var rv) {
        waitfor { resume(Messages.receive()); }
        and { self.postMessage(...serializeWorkerThreadMessage(data)); }
      }
      return rv;
    },
    send: (data)->self.postMessage(...serializeWorkerThreadMessage(data))
  });
};

/**
   @function withThread
   @summary Run a webworker thread session
   @param {Function} [session_f] Session function
   @hostenv xbrowser
   @desc
     Create a new concurrent webworker thread and executes `session_f` with the session interface:

         {
           eval: function(code_str),
           kill: function()
         }

    - `eval` asynchronously evaluates the sjs code `code_str` in the webworker, waits for and 
    returns the result. Abortion, blocklambda controlflow, exceptional controlflow, etc all work
    normally across the caller stratum and webworker thread. However, only the datatypes supported 
    by [sjs:vmbridge::withVMBridge] can be exchanged. Both 'sjs:' and 'mho:' hubs will automatically be configured for use in the thread.
    When `session_f` exits, any pending `eval` calls will be aborted, and the webworker thread will be 
    terminated.

    - `kill` immediately terminates the worker thread. This can e.g. be helpful if the code running
    in the worker thread is in a state where it cannot be aborted normally (e.g. if it is running a 
    busy loop such as `while(1) { }`).


*/
exports.withThread = function(session_f) {
  // XXX make this configurable
  var root_location = document.location.protocol+'//'+document.location.host;
  //require.hubs .. @find([name,path]->(name == 'mho:')) .. console.log;
  // XXX take this from require.hubs:
  var additional_hubs = "[['mho:', '#{document.location.protocol}//#{document.location.host}/__mho/']]";
  var sjs_location = (require.hubs .. @find([name,path]->name == 'sjs:'))[1].replace(/\/modules\/$/,'');
  if (!(sjs_location .. @startsWith('http')))
    sjs_location = document.location.protocol+'//'+document.location.host+sjs_location;
//  console.log("sjs_location = #{sjs_location}");

  /*

    We're using stratified.js in our webworker. This requires some monkey-patching. Alternatively,
    we could create a hostenv-specific 'stratified-webworker.js' for a new 'webworker' hostenv.
    In particular, we need to monkey-patch 'document', which is used by apollo-sys-xbrowser to
    determine the request root.


    Message protocol:

    ['eval', return_channel_id, code_string]

       - executes code_string on worker (message only accepted on webworker side).
       - 'rv' message is expected at return_channel_id

    ['rv', return_channel_id, marshalled_rv]

       - returns 

   */

  var root_sjs_code = 
"@ = require(['sjs:std', 'sjs:vmbridge', 'sjs:thread']);"+
"function eval_call(code) {"+
" return eval(__oni_rt.c1.compile(code));"+
"};"+
"try {"+
"var id='WORKER-'+@sys.VMID;"+
"@withVMBridge({local_itf:eval_call, withTransport:@withWorkerThreadWorkerTransport, id:id}) {"+
"  |itf|"+
"  hold();"+
"};"+
"}catch(e){"+
" console.log('Uncaught error in '+id+': ', e); "+
"}"+
"self.close();";

  var root_script = "
window = self;
document = {isThread:true};
document.location = {href:'#{root_location}/webworker'};
document.getElementsByTagName = function(x) { if (x=='script') return [{src:'#{sjs_location}/stratified.js', getAttribute:function() { return undefined; }}]; else return []; };
importScripts('#{sjs_location}/modules/thread.sjs!bundle');
importScripts('#{sjs_location}/stratified.js');
require.hubs.push(...#{additional_hubs});
eval(__oni_rt.c1.compile(\"#{root_sjs_code}\"));
null;
";

  function withWorkerBridgeTransport(session_f) {
    var worker_url = URL.createObjectURL(new Blob([root_script]));
//    var worker_url = "data:text/plain;base64,"+btoa(root_script);
//    console.log(worker_url);
    var worker = new Worker(worker_url);
    var Messages = @Dispatcher();
    waitfor {
      worker .. @events('message') .. @each { |{data}| Messages.dispatch(deserializeWorkerThreadMessage(data)); }
    }
    while {
      session_f({
        receive: Messages.receive,
        // note the asymmetric handshake: because the worker thread takes time to start up, the main
        // thread waits to receive before sending.
        handshake: function(data) { var rv = Messages.receive(); worker.postMessage(...serializeWorkerThreadMessage(data)); return rv; },
        send: (data)->worker.postMessage(...serializeWorkerThreadMessage(data))
      });
    }
    finally {
      console.log('terminating worker');
      worker.terminate();
    }
  }

  return @withVMBridge({withTransport:withWorkerBridgeTransport}, itf->session_f({eval:itf.remote, kill:itf.kill}));
};
