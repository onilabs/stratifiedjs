/*
 * Oni Apollo 'rpc/bridge' module
 * API bridge
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
   @module  rpc/bridge
   @summary API bridge: High-level API remoting. Work in progress
   @home    sjs:rpc/bridge
*/


/*
Protocol:

  ['call', call#, API, METHOD, [ARG1, ARG2, ARG3, ...]]

  ['return', call#, RV ]

  ['return_exception', call#, RV]

  ['abort', call# ]


  Marshalling: values are being serialized as JSON
  special objects get an __oni_type attribute

*/

var { each, toArray } = require('sjs:sequence');
var { keys } = require('sjs:object');

//----------------------------------------------------------------------
// marshalling

/**
   @function API
   @summary Wrap an object into a remotable API
   @param {Object} [obj] 
   @return {Object} 
*/
var api_counter = 1;
function API(obj, isBaseAPI) {
  return { __oni_type: 'api', 
           id : isBaseAPI ? 0 : api_counter++,
           obj:obj 
         };
}  
exports.API = API;

/**
   @function Blob
   @summary Mark an object as binary data
   @param {Object} [obj] Binary object (e.g. Blob or Buffer)
   @return {Object}
*/
function Blob(obj) {
  return { __oni_type: 'blob',
           obj: obj
         };
}
exports.Blob = Blob;

function marshall(value, connection) {

  var blobs = [];

  var rv = JSON.stringify(value, function(key, value) {
//    console.log("#{key} -- #{value}");
    if (typeof value == 'function') {
      //XXX we'll be calling the function with the wrong 'this' object
      return { __oni_type:'func', id: connection.publishFunction(value) }
    }
    if (typeof value != 'object' || value === null) return value;
    if (value.__oni_type == 'api') {
      // publish on the connection:
      connection.publishAPI(value);
      // serialize as "{ __oni_type:'api', methods: ['m1', 'm2', ...] }"
      var methods = [];

      keys(value.obj) .. each {
        |name| 
        if (typeof value.obj[name] == 'function') methods.push(name);
      }

      // XXX can we do the following without running the replacer over the api?
      return /*JSON.stringify*/({ __oni_type:'api', id: value.id, methods: methods});
    }
    else if (value.__oni_type == 'blob') {
      // send the blob as 'data'
      // XXX we can't just do this inline, because JSON.stringify is not 'stratified':
      // return { __oni_type:'blob', id: connection.sendBlob(value.obj) };      
      var id = ++connection.sent_blob_counter;
      blobs.push([id, value.obj]); 
      return { __oni_type:'blob', id: id};
    }
    else return value;
  });

  // send blobs before returning:
  // XXX needs to be done here, after JSON.stringify, because that function isn't stratified.
  blobs .. each {
    |b|
    connection.sendBlob(b[0], b[1]);
  }

  return rv;
}

function unmarshall(str, connection) {
  var obj = JSON.parse(str);
  // unmarshall special types:
  return unmarshallComplexTypes(obj, connection);
}

function unmarshallComplexTypes(obj, connection) {
  if (typeof obj != 'object' || obj === null) return obj;
  if (obj.__oni_type == 'func') {
    return unmarshallFunction(obj, connection);
  }
  else if (obj.__oni_type == 'api') {
    return unmarshallAPI(obj, connection);
  }
  else if (obj.__oni_type == 'blob') {
    return unmarshallBlob(obj, connection);
  }
  else {
    keys(obj) .. each {
      |key|
      obj[key] = unmarshallComplexTypes(obj[key], connection);
    }
    return obj;
  }
}

function unmarshallBlob(obj, connection) {
  var id = obj.id;
  var blob;
  if (!id || (blob = connection.received_blobs[id]) === undefined) 
    throw new Error("Cannot find blob #{id}");
  delete connection.received_blobs[id];
  return blob;
}

function unmarshallAPI(obj, connection) {
  // make a proxy for the api:
  var proxy = { };

  obj.methods .. each {
    |m| 
    proxy[m] = function() { 
//      console.log("making call to #{obj.id}:#{m}"); 
      return connection.makeCall(obj.id, m, arguments);
    };
  }
  return proxy;
}

function unmarshallFunction(obj, connection) {
  // make a proxy for the function:
  return function() {
    return connection.makeCall(-1, obj.id, arguments);
  };
}



//----------------------------------------------------------------------

/**
   @class BridgeConnection
   
   @variable BridgeConnection.transport
   @variable BridgeConnection.api
*/
function BridgeConnection(transport, base_api) {
  var pending_calls  = {};
  var call_counter   = 0;
  var published_apis = {};
  var published_funcs = {};
  var published_func_counter = 0;

  if (base_api)
    published_apis[0] = base_api;

  var connection = {
    transport: transport,
    sent_blob_counter: 0, // counter for identifying data blobs (see marshalling above)
    received_blobs: {},
    sendBlob: function(id, obj) {
      transport.sendData(id, obj);
      return id;
    },
    makeCall: function(api, method, args) {
      var call_no = ++call_counter;
      waitfor {
        // initiate waiting for return value:
        waitfor (var rv, isException) {
          pending_calls[call_no] = resume;
        }
        finally {
          delete pending_calls[call_no];
        }
      }
      and {
        // make the call:
        transport.send(marshall(['call', call_no, api, method, toArray(args)], 
                                connection));
      }
      
      if (isException) throw new Error(rv);
      return rv;
    },
    publishAPI: function(api) {
      if (published_apis[api.id]) return; // already published
      published_apis[api.id] = api.obj;
    },
    publishFunction: function(f) {
      var id = ++published_func_counter;
      published_funcs[id] = f;
      return id;
    }
  };

  function receiver() {
    while (1) {
      var packet = transport.receive();
      if (packet.type == 'message')
        spawn receiveMessage(packet);
      else if (packet.type == 'data')
        receiveData(packet);
      else {
        console.log("Unknown packet '#{packet.type}' received");
      }
    }
  }

  function receiveData(packet) {
    connection.received_blobs[packet.header] = packet.data;
  }

  function receiveMessage(packet) {
    var message = unmarshall(packet.data, connection);
    switch (message[0]) {
    case 'return':
      var cb = pending_calls[message[1]];
      if (cb)
        cb(message[2], false);
      break;
    case 'return_exception':
      var cb = pending_calls[message[1]];
      if (cb)
        cb(message[2], true);
      break;
    case 'call':
      // no need to spawn here; we already execute receiveMessage asynchronously
      /*spawn*/ (function(call_no, api_id, method, args) {
        var isException = false;
        try {
          var rv;
          if (api_id == -1)
            rv = published_funcs[method].apply(null, args);
          else
            rv = published_apis[api_id][method].apply(published_apis[api_id], args);
        }
        catch (e) {
          rv = e.toString();
          isException = true;
        }
        transport.send(marshall(["return#{isException? '_exception':''}", 
                                 call_no, rv],
                                connection));
      })(message[1], message[2], message[3], message[4]);
      break;
    case 'abort':
      //XXX
      break;
    }
  }
  
  spawn receiver();

  return connection;
}

/**
   @function connect
   @summary To be documented
   @param {String} [api_name] 
   @param {optional Transport} [transport=aat-client::Transport]
   @return {::BridgeConnection}
*/
exports.connect = function(api_name, transport) {
  if (typeof transport != 'object') {
    transport = require('./aat-client').openTransport(transport);
  }  

  var connection = BridgeConnection(transport);

  // retrieve server api:
  // XXX we want the api_name to be relative to the current app's base; not
  // sure how that's going to work from the server-side (sys:resolve??)
  connection.api = connection.makeCall(0, 'getAPI', [api_name]);

  return connection;
};

/**
   @function accept
   @summary To be documented
   @param {Function} [getAPI] 
   @param {Transport} [transport]
   @return {::BridgeConnection}
*/
exports.accept = function(getAPI, transport) {
  var connection = BridgeConnection(transport, {getAPI:getAPI});
  return connection;
};
