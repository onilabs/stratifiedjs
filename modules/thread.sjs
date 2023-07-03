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
  './object', './sequence', './event', './cutil', './vmbridge', './string', {id:'./sys',name:'sys'}
]);


// counter for disambiguating multiple bridges from this thread
var BRIDGE_COUNTER = 0;

// helpers:

__js {

  /*
    XXX As it turns out, transferring buffers is more expensive than just copying (at least on 
    nodejs threads), so we'll not use serializeWorkerThreadMessage.

  // rv is sent as worker.postMessage(...[data, buffers])
  function serializeWorkerThreadMessage(message) {
    //
    //  message is [data, buffers_array], where
    //  data contains pointers into buffers_array.
    //  
    //  To make sure buffers_array members get sent as actual transferables, 
    //  we need to return
    //  
    //  [[data, buffers_array], buffers_array]
    //  
    //  This gets posted as:
    //  
    //  postMessage([data, buffers_array], buffers_array);
    //  
    //  and will be received as
    //  
    //  [data, buffers_array] with every element in buffers_array sent as 
    //  an actual transferable.
    //  
    //  If we wanted to send *copies* instead of transferables, we would just return
    //  
    //  [message] 
    //      
    return [message, message[1]];
  }
  */

  var SJS_THREAD_SCRIPT = settings -> 
    "@ = require(['sjs:std', 'sjs:vmbridge', 'sjs:thread']);"+
    "function eval_call(code) {"+
    " return eval(__oni_rt.c1.compile(code));"+
    "};"+
    "try{"+
    "var id='WORKER-'+@sys.VMID;"+
    "@withVMBridge({acceptHandshakeDFuncs:true, acceptDFuncs:#{settings.allowDFuncsToThread}, local_itf:{eval:eval_call}, withTransport:@withWorkerThreadWorkerTransport,id:id}) {"+
    "  |itf|"+
    "  hold();"+
    "};"+
    "}catch(e) {"+
    " console.log('Uncaught error in '+id+': ', e);"+
    "}"+
    "terminate_self();"
  ;
  
} // __js


/**
   @variable isMainThread
   @summary `true` if the current VM is running on the main thread 
 */

/**
   @service withThread
   @summary Synchronized thread service
   @function withThread
   @param {optional sjs:#language/syntax::dfunc} [thread_itf_func] Thread interface function - see description
   @param {optional Object} [settings]
   @param {Function} [session_f] Session function
   @setting {optional Array} [hubs] Array of [sjs:#language/builtins::require.hubs] to install in thread. (Note 'sjs:' and 'mho:' hubs will be installed automatically.)
   @setting {optional Boolean} [allowDFuncsFromThread=false] If `true`, [sjs:#language/syntax::dfunc]s can be sent from the thread.
   @setting {optional Boolean} [allowDFuncsToThread=false] If `true`, [sjs:#language/syntax::dfunc]s can be sent to the thread.
   @desc

    #### Overview

    `withThread` facilitates the execution of SJS code in JS asynchronous threads, and synchronizes
    communication through use of [sjs:vmbridge::withVMBridge].
    Abortion, blocklambda controlflow, exceptional controlflow, etc all work
    as expected across the caller stratum and webworker thread. 
    However, only the datatypes supported by [sjs:vmbridge::withVMBridge] can be exchanged. 

    Notes:

    - `require()` can be used in the thread, and both 'sjs:' and 'mho:' hubs will automatically be 
    pre-configured (if available on the caller).

    - By default, [sjs:#language/syntax::dfunc]s can not be sent or received across the thread
      interface, and will throw an exception. (The exception being the initial `thread_itf_func`.)
      Flags `allowDFuncsFromThread` and `allowDFuncsToThread` can be used to override this behavior.

    - When `session_f` is being retracted, any pending calls will be aborted, and the webworker thread will be 
      terminated. Note that abortion is synchronous: `session_f` will wait for the worker calls to 
      be aborted. On the worker side, pending calls will go through normal abort processing 
      (e.g. any `retract` clauses will be called). This means that non-compliant code in the worker
      (e.g. a `while(1) {}` busy loop) can block abortion from ever proceeding. For these cases, see
      the `kill` function under 'Session interface' below.

    #### Session interface:

    `session_f` will be called with the session interface:

        [
          THREAD_ITF,
          THREAD_CTRL
        ]

    - `THREAD_ITF` is the return value from executing `thread_itf_func`, or, if 
    `thread_itf_func` is undefined, an object with a member `eval`, where 
    `eval(code_str)` asynchronously evaluates the sjs code `code_str` in the webworker, 
    waits for and returns the result. 

    - `THREAD_CTRL` is the thread control interface - an object `{kill:function}`. 
      `kill` immediately terminates the worker thread and exits the `withThread` call with an 
      exception. This can e.g. be helpful if the code 
      running in the worker thread is in a state where it cannot be aborted 
      normally (e.g. if it is running a busy loop such as `while(1) { }`). 
      [sjs:vmbridge::isVMBridgeError] will return 'true' for the exception.

   #### thread_itf_func

   `thread_itf_func` is a [sjs:#language/syntax::dfunc] that will be executed on the worker thread
   and returned to the caller thread as the session's `THREAD_ITF`.

*/

if (@sys.hostenv === 'nodejs') {
  @node_worker = require('nodejs:worker_threads');
  exports.isMainThread = @node_worker.isMainThread;
  var getPort = -> @node_worker.parentPort;
  var createWorker = function(settings) {
    var sjs_home = (require.hubs .. @find([name,path]->name == 'sjs:'))[1].replace(/^file:\/\//,'').replace(/\/modules\/$/,'');
    var sjs_node = sjs_home + '/stratified-node';
    
    var additional_hubs = [...settings.hubs];
    
    var mho_hub = require.hubs .. @find([name,path]->name == 'mho:', undefined);
    if (mho_hub)
      additional_hubs.push(mho_hub);
    
    additional_hubs = JSON.stringify(additional_hubs);
    
    var root_script = "
process.mainModule = {filename:'#{sjs_node}'};
var sjs_node = require('#{sjs_node}');
function terminate_self() {process.exit(); }
sjs_node.getGlobal().require = sjs_node._makeRequire({id:sjs_node.pathToFileUrl('./')});
require.hubs.push(...#{additional_hubs});
eval(__oni_rt.c1.compile(\"#{SJS_THREAD_SCRIPT(settings)}\"));
null;
";
    return new @node_worker.Worker(root_script, {eval:true});
  };
} // if (hostenv === 'nodejs')
else if (@sys.hostenv === 'xbrowser') {
  exports.isMainThread = !document.isThread; // set in root_script below
  var getPort = -> self;
  var createWorker = function(settings) {
    // XXX make this configurable
    var root_location = document.location.protocol+'//'+document.location.host;
    //require.hubs .. @find([name,path]->(name == 'mho:')) .. console.log;

    //var additional_hubs = "[['mho:', '#{document.location.protocol}//#{document.location.host}/__mho/']]";
    var additional_hubs = [...settings.hubs];
    var mho_hub = require.hubs .. @find([name,path]->name == 'mho:', undefined);
    if (mho_hub)
      additional_hubs.push(mho_hub);
    
    additional_hubs = JSON.stringify(additional_hubs);
    var sjs_location = (require.hubs .. @find([name,path]->name == 'sjs:'))[1].replace(/\/modules\/$/,'');
    if (!(sjs_location .. @startsWith('http')))
      sjs_location = document.location.protocol+'//'+document.location.host+sjs_location;
    //  console.log("sjs_location = #{sjs_location}");
    
    /*
      
      We're using stratified.js in our webworker. This requires some monkey-patching. Alternatively,
      we could create a hostenv-specific 'stratified-webworker.js' for a new 'webworker' hostenv.
      In particular, we need to monkey-patch 'document', which is used by apollo-sys-xbrowser to
      determine the request root.
         
    */        
    var root_script = "
window = self;
document = {isThread:true};
document.location = {href:'#{root_location}/webworker'};
function terminate_self() { self.close(); }
document.getElementsByTagName = function(x) { if (x=='script') return [{src:'#{sjs_location}/stratified.js', getAttribute:function() { return undefined; }}]; else return []; };
importScripts('#{sjs_location}/modules/thread.sjs!bundle');
importScripts('#{sjs_location}/stratified.js');
require.hubs.push(...#{additional_hubs});
eval(__oni_rt.c1.compile(\"#{SJS_THREAD_SCRIPT(settings)}\"));
null;
";
    
    var worker_url = URL.createObjectURL(new Blob([root_script]));
    return new Worker(worker_url);
  };
}
else
  throw new Error("thread.sjs unvailable in hostenv #{@sys.hostenv}");


// exported for use within worker:
exports.withWorkerThreadWorkerTransport = function(session_f) {
  var Messages = @Dispatcher();
  var port = getPort();
  port.onmessage = function({data}) { Messages.dispatch(data); };
  session_f({
    receive: Messages.receive,
    // see notes on handshake below
    handshake: function(local_settings, marshall, unmarshall) {
      waitfor (var remote_settings) {
        waitfor { resume(Messages.receive()); }
        and { port.postMessage(undefined); }
      }
      remote_settings = remote_settings .. unmarshall;
      try {
        var dfunc = remote_settings.itf;
        if (dfunc) local_settings.itf = dfunc();
      }
      catch(e) { 
        // communicate any errors of dfunc evaluation to main thread:
        local_settings = e; 
      }
      port.postMessage(/*...serializeWorkerThreadMessage(*/local_settings .. marshall/*)*/);
      return remote_settings;
    },
    send: (data)->port.postMessage(/*...serializeWorkerThreadMessage(*/data/*)*/)
  });  
};


exports.withThread = function(/*[thread_itf], [settings], session_f*/ ...args) {
  // untangle settings:
  __js {
    var thread_itf, settings, session_f;
    if (args.length === 3) {
      thread_itf = args[0];
      settings = args[1];
      session_f = args[2];
    }
    else if (args.length === 2) {
      if (@sys.isDFunc(args[0]))
        thread_itf = args[0];
      else {
        settings = args[0];
        thread_itf = settings.thread_itf;
      }
      session_f = args[1];
    }
    else if (args.length === 1) {
      session_f = args[0];
    }
    else throw new Error("Unexpected number of parameters");
    
    if (thread_itf !== undefined && !@sys.isDFunc(thread_itf))
      throw new Error("thread_itf must be a dfunc");
    
    settings = {
      hubs: [],
      allowDFuncsToThread: false,
      allowDFuncsFromThread: false
    } .. @override(settings);
  } // __js

  function withWorkerBridgeTransport(session_f) {
    var worker = createWorker(settings);
    var Messages = @Dispatcher();
    waitfor {
      if (@sys.hostenv === 'xbrowser')
        worker .. @events('message') .. @each { |{data}| Messages.dispatch(data); }
      else
        worker .. @events('message') .. @each { |data| Messages.dispatch(data); }
    }
    while {
      session_f({
        receive: Messages.receive,
        // note the asymmetric handshake: because the worker thread takes time to start up, the main
        // thread waits to receive before sending.
        // furthermore, we want to send a dfunc and get the return value of that as our remote 
        // interface, so we need to receive dummy data first, then send the dfunc, and then
        // return the value of the next received message. 
        handshake: function(local_settings, marshall, unmarshall) { 
          Messages.receive(); 
          worker.postMessage(/*...serializeWorkerThreadMessage(*/local_settings .. marshall/*)*/);
          var rv = Messages.receive();
          rv = rv .. unmarshall;
          if (rv instanceof Error) throw rv;
          return rv;
        },
        send: (data)->worker.postMessage(data)
/*        send: function(data) {
          var start = new Date();
          var serialized = serializeWorkerThreadMessage(data);
          var end = new Date();
          if (end-start > 100) console.log("@@@@@@@@@@@@@ serialization took #{end-start}ms");
          start = new Date();
          worker.postMessage(...serialized);
          end = new Date();
          if (end-start > 100) {
            console.log("@@@@@@@@@@@@@ worker send took #{end-start}ms");
            console.log("serialized = [[,#{serialized[0][1].length}],#{serialized[1].length}]");
            console.log("first=l=#{serialized[0][1][0].byteLength}");
            console.log("firsttx=l=#{serialized[1][0].byteLength}");
          }
        }
*/
      });
    }
    finally {
      //        console.log('terminating worker');
      worker.terminate();
    }
  }

  return @withVMBridge(
    {
      withTransport:withWorkerBridgeTransport, 
      acceptDFuncs: settings.allowDFuncsFromThread,
      local_itf:thread_itf,
      id: "CLIENT-"+@sys.VMID+"-"+(++BRIDGE_COUNTER)
    }, 
    itf->session_f([itf.remote, {kill:itf.kill}])
  );
};
