/*
 * StratifiedJS 'vmbridge' module
 * Code execution across asynchronous SJS VMs
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
   @module     vmbridge
   @summary    Code execution across asynchronous SJS VMs
   @home       sjs:vmbridge
*/
'use strict';

/*

  - withTransport interface:

    send: function([json-serializable object, array_buffers])
    // non-buffered receive function:
    receive: function() -> [object, array_buffers]
    handshake: function([object,array_buffers]) -> [object,array_buffers]

  array_buffers is an array of ArrayBuffers which are referenced from the json-serializable object

  Protocol:

  ['C', call_id, dynvar_call_ctx, function_id, marshalled_args] // function call

  ['S', function_id, marshalled_args] // signalled call

  ['A', call_id] // abort

  ['R', call_id, marshalled_obj] // normal return to call_id

  ['E', call_id, marshalled_obj] // exception return to call_id

  ['B', call_id, anchor_id, anchor_bridge_id] // blocklambda break via call_id

  ['Q', call_id, anchor_id, anchor_bridge_id] // blocklambda return via call_id

  ['G', function_id] // garbage collect; function_id will not be called anymore

  ['F', marshalled_error] // fatal vmbridge error; see thread module for usage
*/

module.setCanonicalId('sjs:vmbridge');

@ = require([
  {id: './sys', name: 'sys'},
  './sequence',
  './object',
  './quasi',
  './set',
  './map',
  './big',
  {id: './function', name: 'fn'},
  './cutil',
  {id: './type', name: 'type'}
]);

//----------------------------------------------------------------------
// ERROR HANDLING

/**
   @function isVMBridgeError
   @param {Error} [err]
   @param {optional String} [bridge_id] If provided, only errors thrown by this particular bridge will be considered.
   @return {Boolean}
   @summary Returns `true` if `err` is an error raised by vm bridge operation
*/

__js {

  var VMBRIDGE_ERROR_TOKEN = @type.Token(module, 'error', 'generic');

  function markAsVMBridgeError(err, bridge_id) {
    err[VMBRIDGE_ERROR_TOKEN] = true;
    err[VMBRIDGE_ERROR_TOKEN + '/' + bridge_id] = true;
    return err;
  }

  function VMBridgeError(mes, bridge_id) {
    var err = new Error("VMBridge #{bridge_id}: #{mes}");
    return markAsVMBridgeError(err, bridge_id);
  }

  function isVMBridgeError(e, /*optional */ bridge_id) {
    if (bridge_id)
      return e && e[VMBRIDGE_ERROR_TOKEN + '/' + bridge_id] === true;
    else
      return e && e[VMBRIDGE_ERROR_TOKEN] === true;
  }
  exports.isVMBridgeError = isVMBridgeError;

} // __js

/**
   @class BridgeTransportService
   @summary A service providing a means to exchange data between two SJS VMs for use by [::withVMBridge]
   @desc
     A BridgeTransportService must provide the following session interface:

         {
           send: function(DATA),
           receive: function() -> DATA,
           handshake: OPTIONAL function(local_settings, marshall, unmarshall) -> [remote_settings]
         }


     - `DATA` is always of the form `[ JSON-serializable object, ARRAY_BUFFERS ]`, where `ARRAY_BUFFERS` 
     is a (potentially empty) array of ArrayBuffers. The transport can chose to transfer rather than
     copy these ArrayBuffers (this is e.g. helpful for transports across webworkers, where the 
     ArrayBuffers can be treated as 'transferables').

     - `receive` should block until data becomes available. No buffering is necessary - `withVMBridge`
     guarantees to always have a pending call to `receive` when its protocol allows for data to be
     received.

     - `handshake` - if provided by the transport - will be called by [::withVMBridge] 
     exactly once when the bridge session is being established (and
     before any `send`/`receive` calls to exchange the local and remote interfaces. 
     Its purpose is (1) as a protocol optimization: If transport
     implementations have to exchange data packages as part of establishing the transport, they can
     piggyback on the handshake data, saving additional `send`/`receive` roundtrips. And (2) to
     provide for more complex ways to exchange local & remote interfaces (e.g. if one of the 
     interfaces depends on the other - see e.g. [sjs:thread::withThread]).
     If the transport doesn't provide a `handshake` implementation, the 
     VMBridge's handshake data will be exchanged using `send` & `receive`. 

/**
   @function withVMBridge
   @summary Run a code execution session across two SJS VMs connected by a [::BridgeTransportService]
   @param {Object} [settings] 
   @param {Function} [session_f] Session function
   @setting {Object} [local_itf] Local interface which will be passed to remote VM bridge
   @setting {::BridgeTransportService} [withTransport] Transport service over which a bridge session will be established
   @setting {optional String} [id] Id of this side of the VM bridge - must be unique across all connected VMs. Default: `"#{@sys.VMID}-#{counter}"`
   @setting {optional Boolean} [acceptDFuncs=false] Whether the bridge accepts [sjs:#language/syntax::dfunc]s. See notes below.
   @setting {optional Boolean} [acceptHandshakeDFuncs=false] Whether the bridge accepts [sjs:#language/syntax::dfunc]s during initial local/remote interface exchange. See notes below.
   @desc

     ##### General operation

     `withVMBridge` establishes a transport session using the [::BridgeTransportService] 
     `withTransport`. The other end of the transport is expected to be backed by an SJS VM also 
     running `withVMBridge`. This VM could e.g. be located on a remote machine, or running on a 
     different thread on the local machine.

     Once the transport session has been established, and the two vm bridge instances have completed
     a handshake, the following session interface will be made available to `session_f`:

         {
           remote: object,
           kill: function(),
           id: String,
           getMetrics: function()
         }

     - Here, `remote` is the `local_itf` of the remote VM. 
     - `kill` is a function that can be used to terminate the connection, e.g. if the remote side 
     of the bridge becomes unresponsive or doesn't adhere to the bridge protocol and cannot be 
     'cleanly' shut down using the normal SJS abortion mechanism. 
     - `id` is the (globally unique) id of this side of the SJS bridge.
     - `getMetrics` returns a metrics object `{local_funcs, remote_funcs, remote_func_gcs, local_func_gcs}`, giving 
     counts for the number of functions marshalled and garbage collected across the bridge.

     Once a session is established, either side of the bridge can make calls to the other side 
     utilizing functions passed to each other as part of the `remote` interfaces.
     All control flow features (such as implicit abortion/retraction 
     and [sjs:#language/syntax::blocklambda] controlflow) are available across the bridge, however only
     a subset of datatypes (see below) can be remoted. [sjs:function::signal] can be used to make
     optimized function calls across the bridge where the caller is not interested in the return value.

     In the absense of transport failure or protocol errors, the bridge will stay established until
     either end of bridge exits their session functions. This will shut down the transport on that end,
     which in turn should shut down the transport session and bridge on the other end with an error
     tagged such that it can be identified with [::isVMBridgeError].

     ##### Remotable datatypes

     The following datatypes can be sent/received via the bridge. Attempts to pass unsupported 
     datatypes across the bridge will throw an exception.

         - undefined|null|String|Boolean|Number
         - Array
         - Object
         - Date
         - Quasi
         - big.Big
         - Error
         - Set
         - Map
         - SortedMap
         - ArrayBuffer
         - Uint8Array/Buffer
         - Symbol (see caveats below)
         - function (see caveats below)
         - dfunc (sending always allowed/ receiving only if enabled via 'acceptDFuncs'/'acceptHandshakeDFuncs')

     - Only `Object`s, with `prototype == Object.prototype` can be remoted. All 'own' properties
     apart from `toString` and some other internal SJS properties will be remoted 
     (and have to be remotable themselves).

     - Apart from `Object`, only `Error`, `function` and [sjs:#language/syntax::dfunc] will have 
     their object properties remoted.
     For functions this e.g. implies [sjs:sequence::Stream]s maintain their tagging.

     - Depending on transport, `ArrayBuffer` and `Uint8Array` might be 'transferred' rather than 
     copied. I.e. in general it should be assumed that ownership for these objects is relinquished, 
     and they shouldn't be reused. (Note: Because of performance issues with transferring, non of the 
     built-in transports actually do this yet - All binary data is copied.)


     ##### Caveats and limitations

     - Functions remoted across the bridge must not utilize 'this'.

     - Abortion controlflow across the bridge is synchronous. Retracting a pending call waits for the 
     abortion of the call on the other end of the bridge. Note that much of SJS's advanced controlflow
     features (such as blocklambda controlflow) involves retraction along the call path.
     This implies that a function call to a malfunctioning remote bridge might not be abortable other 
     than by calling `kill` on the bridge session interface.

     - All objects can assumed to be remoted *by value* and not *by reference*. This implies e.g. that
     mutating the properties of a (structural) object passed across the bridge will not mutate the 
     corresponding property on the original object on the other side of the bridge. It also
     implies that object equivalence will not hold if the same object is remoted multiple times (this
     includes functions).

     - While functions are also remoted *by value* (i.e. any properties set on the function are 
     remoted by value), invoking a remoted function will call the function on the side of 
     the bridge that the function was originally defined on (see 'dfuncs' section below for an 
     alternative). 
     Arguments and return values will
     be marshalled to the side of bridge where the call originated.

     - Only registered symbols (i.e. `Symbol.keyFor(.) !== undefined`) are remotable. They will be 
     unmarshalled under the same key as on the marshalling side (i.e. they are treated as truly 'global').

     ##### DFuncs

     - [sjs:#language/syntax::dfunc]s can be be used to remote functions that will
     execute on the side of the bridge where they are invoked. I.e. dfuncs effectively remote
     actual **code**.

     - Note that because this effectively 
     enables arbitrary code functionality on the side of the bridge receiving and executing a dfunc,
     this functionality is guarded by the `acceptDFuncs` setting. If `acceptDFuncs` is false (the 
     default), attempts to pass a dfunc to the bridge will cause a marshalling exception. There is also
     and option `acceptHandshakeDFuncs` which will allow dfuncs during the initial local/remote 
     interface exchanges if true. Note that if `acceptHandshakeDFuncs` is false, and `acceptDFuncs`
     is true, dfuncs will be accepted during the handshake.

     - If a dfunc imports symbols from its lexical closure, those symbols will be marshalled
     according to their type when the dfunc is marshalled. E.g.:

           function foo() { console.log("foo called"); };

           var bar = @{ -> console.log("bar called"); };

           var baz = @(foo,bar) { ->(foo(),bar()); };

           // if baz is passed through a vmbridge from VM A to VM B, and executed on VM B, 
           // then 'foo called' will be logged on VM A, and 'bar called' on VM B.
*/

//----------------------------------------------------------------------
// MISC BRIDGE FUNCTIONS

__js function publishFunction(bridge_itf, f) {
  //var id = bridge_itf.known_id_by_published_func.get(f);
  //if (id == undefined) {
  var id = ++bridge_itf.published_func_id_counter;
  bridge_itf.published_funcs.set(id,f);
  //bridge_itf.known_id_by_published_func.set(f, id);
  //}
  //else console.log("We're reusing already published function ",f);
  return id;
};

function callRemote(bridge_itf, remote_function_id, args) {
  var call_id = ++bridge_itf.local_to_remote_call_id_counter;
  var preempt_abort = false;
  waitfor (var rv, isException) {
    // in addition to `resume`, we store the current dyn var context, so that it can be 
    // restored when we get reentrant callback calls from remote:
    bridge_itf.localToRemoteCalls[call_id] = [resume, @sys.getCurrentDynVarContext()];
    
    // make the call:
    
    // check if the current stratum originates from a call from the other side of the bridge, and
    // if yes, tell the other side about any dynamic variable context it needs to restore:
    var dynvar_call_ctx = @sys.getDynVar("__mho_bridge_#{bridge_itf.id}_dynvarctx", 0); // default 0 == no context to restore
    try {
      var buffers = [];
      bridge_itf.send([['C', call_id, dynvar_call_ctx, remote_function_id, 
                       args .. @map(a-> bridge_itf .. marshall(a, buffers))],
                       buffers]);
    }
    catch(e) {
      preempt_abort = true;
      throw e;
    }
    retract {
      preempt_abort = true;
    }
  }
  finally(e) {
    delete bridge_itf.localToRemoteCalls[call_id];
    if (!preempt_abort && e[2]) {
//      __js console.log("localToRemote "+call_id+": abort path ", e);
      // we have an abort. wait for the other side to be retracted.
      // XXX Note that this can take a long time if bridge communication is interrupted
      waitfor (var abort_rv, abort_isException) {
        bridge_itf.localToRemoteCalls[call_id] = [resume, @sys.getCurrentDynVarContext()];
        // XXX is_pseudo... is this still a thing???
        if (e[3]) throw VMBridgeError("Unexpected pseudo abort", bridge_itf.id);
        bridge_itf.send([['A', call_id],[]]);
      }
//XXX catch (e) {
//      if (!isVMBridgeError(e, bridge_itf.id)) { throw e; }
//// ... else we couldn't send because the bridge is down => IGNORE????
//    }
      finally {
        delete bridge_itf.localToRemoteCalls[call_id];
      }
      if (__js abort_isException) {
        if (isReceivedControlFlowException(abort_rv)) {
          // retraction of the other side yielded a blk-lambda brk/ret. post it:
          abort_rv.postLocally();
          throw new Error('not reached');
        }
        else { //XXX if (!isVMBridgeError(abort_rv, bridge_itf.id)) 
          __js if (!__oni_rt.is_cfx(abort_rv)) abort_rv = new __oni_rt.CFException("t", abort_rv);
          throw [abort_rv];
        }
      }
    }
    throw e;
  }

  if (isException) {
    if (isReceivedControlFlowException(rv)) {
      rv.postLocally();
      throw new Error('not reached');
    }
    throw rv;
  }
  return rv;
} // callRemote

function signalRemote(bridge_itf, remote_function_id, args) {
  var buffers = [];
  bridge_itf.send([['S', remote_function_id, args .. @map(x->bridge_itf .. marshall(x, buffers))], buffers]);
} // signalRemote



//----------------------------------------------------------------------
// ARGUMENT MARSHALLING/UNMARSHALLING

// high-level marshalling wrappers:

// marshalls 'obj' and generates an 'R' message, or 'E' if there is a marshalling error:
function generateReturnMessage(bridge_itf, call_id, obj, buffers) {
  try {
    return [['R', call_id, bridge_itf .. marshall(obj, buffers)], buffers];
  }
  catch(e) {
    return [['E', call_id, bridge_itf .. marshall(e, buffers)], buffers];
  }
}

/*

  marshalling schema:

  null|string|bool|number: no encoding
  function:    ['f', remote_id:STRING, props:PROPS]
  dfunc:       ['g', code, context:marshalled array, props:PROPS]
  array:       ['a', [ elements... ]]
  Set:         ['s', [ elements... ]]
  Symbol:      ['t', name:STRING ]
  Map:         ['m', [ elements... ]]
  SortedMap:   ['n', comparator, [ elements... ]]
  object:      ['o', PROPS]
  undefined:   ['u']
  Error:       ['e', message, PROPS]
  Date:        ['d', obj.getTime()]
  Quasi:       ['q', marshalled_parts]
  Big:         ['r', string] // big.Big number 
  ArrayBuffer: ['b', index_into_buffers_array] // buffer pushed into buffers_array
  Uint8Array:  ['i', index_into_buffers_array] // assoc. buffer pushed into buffers_array

  PROPS: [key,value ,  key,value  , ... ]
*/

__js {

  // MARSHALLING -------------------------------------------------------

  function marshall(bridge_itf, obj, buffers) {
    var t = typeof obj;
    if (t === 'boolean' || t === 'number' || t === 'string' || obj === null)
      return obj;
    else if (t === 'undefined') {
      // we need to treat 'undefined' specially, because JSON doesn't allow it, and worse:
      // JSON.stringify([undefined]) yields "[null]"!
      return ['u'];
    }
    else if (t === 'function') {
      if (@sys.isDFunc(obj)) {
        if (bridge_itf.postHandshake && !bridge_itf.remote_settings.acceptDFuncs)
          throw new Error("Remote bridge does not accept dfuncs");
        return ['g', obj.code, bridge_itf .. marshall(obj.context, buffers), bridge_itf .. marshallDFuncProps(obj, buffers)];
      }
      else
        return bridge_itf .. marshallFunction(obj, buffers);
    }
    else if (t === 'symbol') {
      var name = Symbol.keyFor(obj);
      if (name === undefined) throw new Error("Cannot marshal unregistered symbols");
      return ['t', name];
    }
    else if (t === 'object') {
      if (Array.isArray(obj)) {
        return ['a', obj .. @map(x->bridge_itf .. marshall(x, buffers))];
      }
      else if (@isSet(obj)) {
        return ['s', obj .. @map(x->bridge_itf .. marshall(x, buffers))];
      }
      else if (@isMap(obj)) {
        return ['m', obj .. @map(x->bridge_itf .. marshall(x, buffers))];
      }
      else if (@isSortedMap(obj)) {
        return ['n', obj.getComparator(), obj.elements .. @map(x->bridge_itf .. marshall(x, buffers))];
      }
      else if (obj instanceof Error || obj._oniE) {
        return ['e', obj.message, bridge_itf .. marshallErrorProps(obj, buffers)];
      }
      else if (obj instanceof Date) {
        return ['d', obj.getTime()];
      }
      else if (obj instanceof @Big) {
        return ['r', String(obj)];
      }
      else if (@isQuasi(obj)) {
        return ['q', obj.parts .. @map(x->bridge_itf .. marshall(x, buffers))];
      }
      else if (obj instanceof ArrayBuffer) {
        var i = buffers.length;
        buffers.push(obj);
        return ['b', i];
      }
      else if (obj instanceof Uint8Array) {
        var i = buffers.length;
        if (obj.byteOffset !== 0 || obj.length !== obj.buffer.byteLength) {
//          console.log("bridge #{bridge_itf.id}: Uint8Array with byteOffset=#{obj.byteOffset} & buffer_length-length=#{obj.buffer.byteLength -obj.length} will be copied, not transferred.");
          obj = new Uint8Array(obj);
        }
        if (obj.buffer.byteLength === 0) throw new Error('nope');
        buffers.push(obj.buffer);
        return ['i', i];
      }
      else if (Object.getPrototypeOf(obj) === Object.prototype) {
        return ['o', bridge_itf .. marshallObjectProps(obj, buffers)];
      }
      else {
        console.log("vmbridge #{bridge_itf.id}: Cannot marshall object '#{obj}' with prototype '#{Object.getPrototypeOf(obj)}'");
        throw VMBridgeError("Cannot marshall object '#{obj}'", bridge_itf.id);
      }
    }
    else {
      console.log("vmbridge #{bridge_itf.id}: Cannot marshall type '#{t}'");
      throw VMBridgeError("Cannot marshall type '#{t}'", bridge_itf.id);
    }
  }

  function marshallFunction(bridge_itf, f, buffers) {
    var rv = ['f', bridge_itf .. publishFunction(f)];
    var props = bridge_itf .. marshallFunctionProps(f, buffers);
    if (props.length)
      rv.push(props);
    return rv;
  }

  function marshallObjectProps(bridge_itf, obj, buffers) {
    return @ownPropertyPairs(obj) ..
      @filter([k,v]->
              k !== 'toString' &&
              !__oni_rt.is_ef(v)) ..
      @unpack([k,v]->[k,bridge_itf .. marshall(v, buffers)]) ..
      @toArray;
  }

  function marshallFunctionProps(bridge_itf, f, buffers) {
    return @ownPropertyPairs(f) .. 
      @filter([k,v]-> 
              k !== 'toString' &&
              k !== @fn.ITF_SIGNAL &&
              !__oni_rt.is_ef(v)) ..
      @unpack([k,v]->[k,bridge_itf .. marshall(v, buffers)]) ..
      @toArray;    
  }

  function marshallDFuncProps(bridge_itf, f, buffers) {
    return @ownPropertyPairs(f) .. 
      @filter([k,v]-> 
              k !== 'toString' &&
              k !== @fn.ITF_SIGNAL &&
              k !== 'code' && 
              k !== 'f' &&
              k !== 'context' &&
              !__oni_rt.is_ef(v)) ..
      @unpack([k,v]->[k,bridge_itf .. marshall(v, buffers)]) ..
      @toArray;    
  }


  function marshallErrorProps(bridge_itf, err, buffers) {
    // like object props, but no need to go into __oni_stack
    return @ownPropertyPairs(err) ..
      @filter([k,v]->
              k !== 'toString' &&
              !__oni_rt.is_ef(v)) ..
      @unpack([k,v]->[k,k==='__oni_stack' ? v : bridge_itf .. marshall(v, buffers)]) ..
      @toArray;
  }


  // UNMARSHALLING -----------------------------------------------------

  function unmarshall(bridge_itf, obj, buffers) {
//console.log('unmarshall ', obj);
    if (typeof obj !== 'object' || obj === null) {
      // string|number|bool|null
      return obj;
    }
    switch (obj[0]) {
    case 'f':
      return bridge_itf .. unmarshallFunction(obj[1], obj[2], buffers);
      break;
    case 'g':
      if (!bridge_itf.acceptDFuncs && !(!bridge_itf.postHandshake && bridge_itf.acceptHandshakeDFuncs)) throw VMBridgeError("Unmarshalling error: Bridge does not accept dfuncs", bridge_itf.id);
      return bridge_itf .. unmarshallObjectProps(__oni_rt.DFunc(obj[1], bridge_itf .. unmarshall(obj[2], buffers)), obj[3], buffers);
    case 'a':
      return obj[1] .. @map(x->bridge_itf .. unmarshall(x, buffers));
      break;
    case 's':
      return @Set(obj[1] .. @map(x->bridge_itf .. unmarshall(x,buffers)));
    case 't':
      return Symbol.for(obj[1]);
    case 'm':
      return @Map(obj[1] .. @map(x->bridge_itf .. unmarshall(x,buffers)));
    case 'n':
      return @SortedMap({initial_elements: obj[2] .. @map(x->bridge_itf .. unmarshall(x,buffers)),
                         comparator: obj[1]});
    case 'u':
      return undefined;
      break;
    case 'e':
      var err = new Error(obj[1]);
      return bridge_itf .. unmarshallErrorProps(err, obj[2], buffers);
      break;
    case 'o':
      return bridge_itf .. unmarshallObjectProps({}, obj[1], buffers);
      break;
    case 'd':
      return new Date(obj[1]);
      break;
    case 'r':
      return @Big(obj[1]);
      break;
    case 'q':
      return @Quasi(obj[1] .. @map(x->bridge_itf .. unmarshall(x, buffers)));
      break;
    case 'b':
      return buffers[obj[1]];
    case 'i':
      if (@sys.hostenv === 'nodejs')
        return Buffer.from(buffers[obj[1]]);
      else
        return new Uint8Array(buffers[obj[1]]);
      break;
    default:
      throw VMBridgeError("Unmarshalling error: Unknown type '#{obj[0]}'", bridge_itf.id);
    }
  }

  function unmarshallFunction(bridge_itf, id, props, buffers) {
    //var f = bridge_itf.remote_funcs.get(id);
    //if (!f || !(f=f.deref())) {
      ++bridge_itf.remote_func_id_counter;
      var f = function(...args) {
        return bridge_itf .. callRemote(id, args);
      }
      f[@fn.ITF_SIGNAL] = function(this_obj, args) {
        return bridge_itf .. signalRemote(id, args);
      };
      
      if (props) bridge_itf .. unmarshallObjectProps(f, props, buffers);
    
      bridge_itf.finalizationRegistry.register(f, id);
      //bridge_itf.remote_funcs.set(id, new WeakRef(f));
    //}
    //else
    //  console.log("Bridge #{bridge_itf.id}: unmarshall found existing function #{id}");

    return f;
  }

  function unmarshallObjectProps(bridge_itf, obj, props, buffers) {
    for (var i=0; i<props.length;i+=2) {
      obj[props[i]] = bridge_itf .. unmarshall(props[i+1], buffers);
    }
    return obj;
  }

  function unmarshallErrorProps(bridge_itf, obj, props, buffers) {
    // __oni_stack requires no unmarshalling
    for (var i=0; i<props.length;i+=2) {
      obj[props[i]] = (props[i] === '__oni_stack' ? props[i+1] : bridge_itf .. unmarshall(props[i+1], buffers));
    }
    return obj;
  }

} // __js

//----------------------------------------------------------------------
// CALLING REMOTE -> LOCAL

__js function executeRemoteToLocalCallSync(bridge_itf, call_id, f, args) {
  var buffers = [];
  var rv;
  try {
    rv = f(...args);
  }
  catch(e) {
    if (e && e.__oni_cfx) {
      // a control-flow exception
      if (e.type === 'blb') {
        return bridge_itf .. makeBlocklambdaBreakMessage(e, call_id);
      }
      else if (e.type === 'blr') { // blocklambda return
        return bridge_itf .. makeBlocklambdaReturnMessage(e, call_id);
      }
      else {
        throw VMBridgeError("Unexpected controlflow", bridge_itf.id);
      }
    }
    return [['E', call_id, bridge_itf .. marshall(e, buffers)], buffers];
  }
  if (__oni_rt.is_ef(rv)) 
    return rv;
  else
    return bridge_itf .. generateReturnMessage(call_id, rv, buffers);
}

function executeRemoteToLocalCall(bridge_itf, call_id, dynvar_call_ctx, local_function_id, args) {
  if (bridge_itf.remoteToLocalCalls[call_id]) throw VMBridgeError("Unexpected duplicate call", bridge_itf.id);
  
  var dynvar_proto;
  
  __js if (dynvar_call_ctx) {
    var originating_local_call = bridge_itf.localToRemoteCalls[dynvar_call_ctx];
    if (!originating_local_call) {
      console.log("Warning: Cannot restore dynamic variable context from a non-nested spawned bridge call");
      dynvar_proto = @sys.getCurrentDynVarContext();
    }
    else 
      dynvar_proto = originating_local_call[1];
  }
  else
    dynvar_proto = @sys.getCurrentDynVarContext();
  
  @sys.withDynVarContext(dynvar_proto) {
    ||
    // make sure blocklambda controlflow gets routed:
    __oni_rt.current_dyn_vars.__oni_anchor_route =  dynvar_proto;
    __oni_rt.current_dyn_vars.__oni_anchor = -1;
    @sys.setDynVar("__mho_bridge_#{bridge_itf.id}_dynvarctx", call_id);
    
    // we'll attempt to perform the call synchronously. this will return
    // an execution frame if the call went async. in that case we spawn a
    // stratum to manage the call.
    __js var call_rv = bridge_itf .. executeRemoteToLocalCallSync(call_id, 
                                                                  bridge_itf.published_funcs.get(local_function_id), 
                                                                  args);

    if (__js __oni_rt.is_ef(call_rv)) {
      // go async
      bridge_itf.remoteToLocalCalls[call_id] = bridge_itf.stratum.spawn(function() {
//        console.log(bridge_itf.id+">spawn #{call_id}");
        var rv, buffers = [];
        try {
          call_rv.wait();
        }
        finally(e) {
          delete bridge_itf.remoteToLocalCalls[call_id];
//          console.log(bridge_itf.id+">returning #{call_id}");
          if (e[1]) { // exception
            if (e[0].type === 'blb') {
              __js rv = bridge_itf .. makeBlocklambdaBreakMessage(e[0], call_id);
              // prevent further blocklambda break handling:
              e = [undefined];
            }
            else if (e[0].type === 'blr') {
              __js rv = bridge_itf .. makeBlocklambdaReturnMessage(e[0], call_id);
              // prevent further blocklambda return handling:
              e = [undefined];
            }
            else if (e[0].type === 't') {
              // report exception to remote side, but don't return it from this executing call on
              // our side.
              rv = [['E', call_id, bridge_itf .. marshall(e[0].val, buffers)], buffers];
              // XX maybe log the exception on our side?
              e = [undefined];
            }
            else {
              // abort or similar. this is either in response to an 'A' message from the remote side, 
              // or because we're aborted as part of bridge shutdown.
              rv = [['R', call_id, 'abort-ok'],[]];
            }
          } // exception
          else {
            // no exception
            rv = bridge_itf .. generateReturnMessage(call_id, e[0], buffers);
            // no need to return the rv to our side:
            e = [undefined];
          }
          // only attempt to send rv/error to other side if the transport is alive; otherwise we'll just get a
          // superfluous error:
          if (!bridge_itf.transport_dead.isSet)
            bridge_itf.send(rv);
//          console.log(bridge_itf.id+">done #{call_id}");
          throw e;
        }
      });
    } // async
    else {
      // synchronous execution
      bridge_itf.send(call_rv);
    }
  } // withDynVarContext
} // executeRemoteToLocalCall


//----------------------------------------------------------------------
// blocklambda controlflow helpers

__js {

  function ReceivedControlFlowException() {};

  function isReceivedControlFlowException(obj) { return (obj instanceof ReceivedControlFlowException) }

  function makeBlocklambdaReturnControlFlowException(aid, remote_aid, remote_vm, val, dynvars) {
    // check if we can route this:
    var node = dynvars;
    while (node) {
      if (node.__oni_anchor == aid) {
        // yes we can!
        var rv = Object.create(ReceivedControlFlowException.prototype);
        rv.postLocally = function() {
          var cfx = new __oni_rt.CFException('blr', val);
          cfx.aid = aid;
          if (aid === -1) {
            cfx.remote_vm = remote_vm;
            cfx.remote_aid = remote_aid;
          }
          return cfx;
        };
        return rv;
      }
      node = node.__oni_anchor_route;
    }

    // no, we can't route this
    return new Error("Unroutable blocklambda return from remote connection");
  }

  function makeBlocklambdaBreakControlFlowException(aid, remote_aid, remote_vm, dynvars) {
    // check if we can route this:
    var node = dynvars;
    while (node) {
      if (node.__oni_anchor === aid) {
        // yes we can!
        var rv = Object.create(ReceivedControlFlowException.prototype);
        rv.postLocally = function() {
          var cfx = new __oni_rt.CFException('blb');
          cfx.aid = aid;
          if (aid === -1) {
            cfx.remote_vm = remote_vm;
            cfx.remote_aid = remote_aid;
          }
          return cfx;
        };
        return rv;
      }
      node = node.__oni_anchor_route;
    }
    // no, we can't route this
    return new Error("Unroutable blocklambda break from remote connection");
  }

  function makeBlocklambdaBreakMessage(bridge_itf, e, call_id) {
    var aid, anchor_bridge_id;
    aid = e.aid;

    if (aid === -1) {
      aid = e.remote_aid;
      anchor_bridge_id = e.remote_vm;
    }
    else {
      // this is a local blb
      anchor_bridge_id = bridge_itf.id;
    }
    return [['B', call_id, aid, anchor_bridge_id],[]];
  }

  function makeBlocklambdaReturnMessage(bridge_itf, e, call_id) {
    var aid, anchor_bridge_id;
    aid = e.aid;

    if (aid === -1) {
      aid = e.remote_aid;
      anchor_bridge_id = e.remote_vm;
    }
    else {
      // this is a local blr
      bridge_itf.pending_blocklambda_returns_to_local[aid] = e.val;
      anchor_bridge_id = bridge_itf.id;
    }

    return [['Q', call_id, aid, anchor_bridge_id],[]];
  }

  function injectBlocklambdaBreakIntoLocalToRemoteCall(bridge_itf, call_id, anchor_id, anchor_bridge_id) {
    var cb = bridge_itf.localToRemoteCalls[call_id];
    if (!cb) return; // XXX log?
    var remote_aid;
    if (anchor_bridge_id !== bridge_itf.id) {
      // this blb is not targeted at our vm
      remote_aid = anchor_id;
      anchor_id = -1;
    }
    cb[0](makeBlocklambdaBreakControlFlowException(anchor_id, remote_aid, anchor_bridge_id, cb[1]), true);
  }

  function injectBlocklambdaReturnIntoLocalToRemoteCall(bridge_itf, call_id, anchor_id, anchor_bridge_id) {
    var cb = bridge_itf.localToRemoteCalls[call_id];
    if (!cb) return; // XXX log?
    var remote_aid;
    var val;
    if (anchor_bridge_id !== bridge_itf.id) {
      // this blb is not targeted at our vm
      remote_aid = anchor_id;
      anchor_id = -1;
    }
    else {
      val = bridge_itf.pending_blocklambda_returns_to_local[anchor_id];
      delete bridge_itf.pending_blocklambda_returns_to_local[anchor_id];
    }
    cb[0](makeBlocklambdaReturnControlFlowException(anchor_id, remote_aid, anchor_bridge_id, val, cb[1]), true);
  }


} // __js

//----------------------------------------------------------------------
// withVMBridge

var bridge_id_counter = 0;

function withVMBridge(settings, session_f) {

  settings = {
    local_itf: undefined,
    withTransport: undefined,
    id: "#{@sys.VMID}-#{++bridge_id_counter}",
    acceptDFuncs: false,
    acceptHandshakeDFuncs: false
  } .. @override(settings);

  // proxied function finalization callback:
  __js function cleanRemoteFunction(id) {
    if (!bridge_itf.transport_dead.isSet) {
      //bridge_itf.remote_funcs.delete(id);
      ++bridge_itf.remote_func_gc_counter;
      bridge_itf.send([['G', id],[]]);
    }
  }

  var bridge_itf = {
    id: settings.id,
    
    getMetrics: function() {
      return {
        local_funcs: bridge_itf.published_func_id_counter,
        remote_funcs: bridge_itf.remote_func_id_counter,
        remote_func_gcs: bridge_itf.remote_func_gc_counter,
        local_func_gcs: bridge_itf.local_func_gc_counter
      };
    },

    remote_settings: undefined, // will be set by handshake

    postHandshake: false, // whether we are post-handshake

    acceptDFuncs: settings.acceptDFuncs,

    acceptHandshakeDFuncs: settings.acceptHandshakeDFuncs,

    kill_transport: @Dispatcher(),

    transport_dead: @Condition(),

    stratum: reifiedStratum,

    local_to_remote_call_id_counter:0,
    localToRemoteCalls: {},

    pending_blocklambda_returns_to_local: {},

    remoteToLocalCalls: {},

    published_func_id_counter: 0,

    // keeping track of these for metrics purposes:
    remote_func_id_counter: 0,
    remote_func_gc_counter: 0,
    local_func_gc_counter: 0,

    // map of id->published_funcs for routing remote->local calls 
    // will be cleaned by remote GC messages, when the proxied function is not 
    // reachable on the remote side any longer and its finalizer is called
    published_funcs: @Map(),

    // weak map of published_func -> id, so that we can identify already 
    // published functions
    // XXX it would be nice to use this, but there is an unlikely but plausible race condition
    // with cross-bridge gc
    //   known_id_by_published_func: new WeakMap(),

    // map of id->WeakRef(remote_func), so that we can identify already
    // proxied functions.
    // will be cleaned through the remote_funcs' finalizers
    // XXX this only makes sense when `known_id_by_published` is also used
    // remote_funcs: @Map(),

    finalizationRegistry: __js new FinalizationRegistry(cleanRemoteFunction)

  }; // bridge_itf

  waitfor (var transport) {
    var pending_error;
    reifiedStratum.spawn(function() {
      try {
        settings.withTransport {
          |_transport|
          resume(_transport);
          bridge_itf.kill_transport.receive();
          throw VMBridgeError("Connection killed", bridge_itf.id);
        }
      }
      catch(e) {
        pending_error = e;
        throw e;
      }
      finally {
        if (!pending_error) {
          pending_error = VMBridgeError("Session closed", bridge_itf.id);
        }
        
        markAsVMBridgeError(pending_error, bridge_itf.id);
        bridge_itf.send = function(data) { 
          throw VMBridgeError("Session closed. Cannot send '#{data}'", bridge_itf.id) 
        };
        bridge_itf.transport_dead.set();
        bridge_itf.localToRemoteCalls .. @ownPropertyPairs .. @each {
          |[k,v]|
          console.log(bridge_itf.id+': Killing straggling local->remote call '+k);
          v[0](pending_error, true);
        }
        
        bridge_itf.remoteToLocalCalls .. @ownPropertyPairs .. @each {
          |[k,v]| 
          console.log(bridge_itf.id+': Killing straggling remote->local call '+k);
          v.abort();
        }
        
        // remote->local functions hang onto bridge_itf, which might keep published
        // functions alive for longer than necessary. Aid GC (especially GC across 
        // mulitple vmbridges):
        delete bridge_itf.published_funcs;
      }
    });
  }
  bridge_itf.send = transport.send;

  // handshake:
  var handshake = transport.handshake;

  function handshake_marshall(local_data) {
    var b = [];
    var d = bridge_itf .. marshall(local_data, b);
    return [d,b];
  }

  function handshake_unmarshall(remote_data) {
    return bridge_itf .. unmarshall(...remote_data);
  }

  if (!handshake)
    handshake = function(local_settings, handshake_marshall, handshake_unmarshall) {
      waitfor(var rv) {
        waitfor { resume(transport.receive()); }
        and { transport.send(handshake_marshall(local_settings)); }
      }
      return handshake_unmarshall(rv);
    }

  var local_settings = {
    itf: settings.local_itf,
    acceptDFuncs: settings.acceptDFuncs
  };

  bridge_itf.remote_settings = handshake(local_settings, handshake_marshall, handshake_unmarshall);
  bridge_itf.postHandshake = true;

  // main loop:
  waitfor {
    try {
      @generate(transport.receive) .. @buffer(1000, {drop:'throw'}) .. @each {
        |[message, message_objects]|
        //console.log("#{bridge_itf.id} RCV "+require('sjs:debug').inspect(message));
        switch(message[0]) {
        case 'C':
          bridge_itf .. executeRemoteToLocalCall(message[1], message[2], message[3], 
                                                 message[4] .. @map(a-> bridge_itf .. unmarshall(a, message_objects)));
          break;
        case 'S':
          bridge_itf.published_funcs.get(message[1]) .. @fn.signal(null, message[2] .. @map(x->bridge_itf .. unmarshall(x, message_objects)));
          break;
        case 'R':
          var cb = bridge_itf.localToRemoteCalls[message[1]];
          if (cb) cb[0](bridge_itf .. unmarshall(message[2], message_objects), false);
          // XXX else log?
          break;
        case 'E':
          var cb = bridge_itf.localToRemoteCalls[message[1]];
          if (cb) cb[0](bridge_itf .. unmarshall(message[2], message_objects), true);
          // XXX else log?
          break;
        case 'B':
          bridge_itf .. injectBlocklambdaBreakIntoLocalToRemoteCall(message[1], message[2], message[3]);
          break;
        case 'Q':
          bridge_itf .. injectBlocklambdaReturnIntoLocalToRemoteCall(message[1], message[2], message[3]);
          break;
        case 'A':
          var call = bridge_itf.remoteToLocalCalls[message[1]];
          if (!call) {
            console.log(bridge_itf.id+": Didn't find bridge call to abort.. call_id = #{message[1]}");
            bridge_itf.send([['E', message[1], bridge_itf .. marshall(VMBridgeError("Didn't find call to abort", bridge_itf.id), [])],[]]);
          }
          else {
            // XXX should try aborting synchronously first - see code for 'C' above
            call.abort();
          }
          break;
        case 'G':
          var f = bridge_itf.published_funcs.get(message[1]);
          if (f) {
            // important that we remove it from this weak map, so that we
            // don't get spurious matches if the function is republished:
            // bridge_itf.known_id_by_published_func.delete(f);

            ++bridge_itf.local_func_gc_counter;
            bridge_itf.published_funcs.delete(message[1]);
          }
          break;
        case 'F':
          throw bridge_itf .. unmarshall(message[1], message_objects);
        default:
          throw VMBridgeError("Unknown message of type '#{message[0]}'", bridge_itf.id);
        }
      }
    } // try generate
    catch(e) {
      // once the receiving loop is dead, we won't get replies to any messages... so might as well
      // kill the transport
      console.log("Bridge #{bridge_itf.id} internal error: #{e}");
      bridge_itf.kill_transport.dispatch();
      throw e;
    }
  }
  while {
    waitfor {
      session_f({
        remote: bridge_itf.remote_settings.itf, 
        kill:bridge_itf.kill_transport.dispatch, 
        id: bridge_itf.id,
        getMetrics: bridge_itf.getMetrics
      });
    }
    or {
      bridge_itf.transport_dead.wait();
    }
  } // waitfor/while
} // withVMBridge
exports.withVMBridge = withVMBridge;
