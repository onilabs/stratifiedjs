/*
 * StratifiedJS 'structured-observable' module
 * Constructs for manipulating structured streams backed by time-varying values
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013-2019 Oni Labs, http://onilabs.com
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
   @module    structured-observable
   @summary   Constructs for manipulating structured streams backed by time-varying values
   @home      sjs:structured-observable
   @inlibrary sjs:std
   @inlibrary mho:std
*/
'use strict';

@ = require([
  'sjs:sequence',
  'sjs:observable',
  'sjs:cutil',
  'sjs:object'
]);

/**
  @class StructuredObservable
  @inherit sjs:sequence::Stream
  @summary A stream with 'structured observable' semantics
  @desc
    A stream is said to be a "structured observable" if it consists of a
    *temporal* sequence of an initial value and incremental mutations to this
    value. I.e. in contrast to an [observable::Observable], individual elements
    of the sequence do not contain the complete state of the tracked value.

    Structured observable streams buffer and aggregate mutations. 
    I.e. if the tracked value changes while the downstream receiver is blocked, 
    the receiver will, as soon as it unblocks, be passed a mutation value from which
    the current state of the tracked value can be computed.

    Structured observable streams can be converted into plain [observable::Observable] streams
    using [::reconstitute].

  @function StructuredObservable
  @summary Mark a stream or streaming function as being a StructuredObservable
  @param {sjs:sequence::Stream|Function} [stream] A [sjs:sequence::Stream] or streaming function (see [sjs:sequence::Stream]) 
*/
__js {
  var structured_observable_toString = function() {
    return "[object StructuredObservable]";
  }
  var StructuredObservable = function(s) {
    s.__oni_is_Stream = true;
    s.__oni_is_StructuredObservable = true;
    s.toString = structured_observable_toString;
    
    return s;
  };
  exports.StructuredObservable = StructuredObservable;
} /* __js */

/**
   @function isStructuredObservable
   @param  {Object} [o] Object to test
   @return {Boolean}
   @summary Returns `true` if `o` is a [::StructuredObservable], `false` otherwise.
*/
__js {
  function isStructuredObservable(o) {
    return o && o.__oni_is_StructuredObservable === true;
  }
  exports.isStructuredObservable = isStructuredObservable;
}

//----------------------------------------------------------------------

/**
   @class ObservableArray
   @inherit ::StructuredObservable
   @summary A [::StructuredObservable] stream tracking Array mutations
   @desc
      An ObservableArray is a Stream (with [::StructuredObservable] semantics) 
      representing the changing state of an array (e.g. that of an [::ObservableArrayVar]).

      The first element in the stream is a copy of the current array. (This implies
      that calling [observable::current] on an ObservableArray yields the desired result of 
      returning the tracked array's current value).

      Subsequent elements of the stream consist of objects that are either a full copy of the
      current array (a 'reset' mutation) , or contain a list of mutations:

          { mutations: [ ... ] }

      There are 3 types of mutations:

      * Inserting a new element:

            { type: 'ins', val: NEW_ELEMENT_VALUE, idx: INDEX_WHERE_TO_INSERT }

      * Removing an element at a given index:

            { type: 'del', idx: INDEX_WHERE_TO_REMOVE }

      * Setting the value at a given index:

            { type: 'set', val: NEW_ELEMENT_VALUE, idx: INDEX_WHERE_TO_SET }

      An ObservableArray can be 'reconstituted' into a plain debounced
      Observable of the complete array (and not only mutations) by
      using [::reconstitute]. ('debounced' in this context means that each value of the
      reconstituted stream will be a new array, i.e. unequal under `===`)

      ### Projection behavior

      * [projection::project] reconstitutes the ObservableArray stream and 
        calls the transformation function on the full array for each mutation.
        The output stream, while being an ObservableArray stream, will only consist
        full copies of the array for each, and no finer-grained mutations.

      * [projection::projectInner] calls the transformation function for each 
        array member of the initial stream element, each array member of 
        'reset' mutations, and each member inserted or modified through 'ins' and 'set'
        mutations.
        
*/


function ObservableArray(stream) {
  stream = StructuredObservable(stream);
  stream.__oni_is_ObservableArray = true;
  return stream;
}
exports.ObservableArray = ObservableArray;

/**
   @function isObservableArray
   @param  {Object} [o] Object to test
   @return {Boolean}
   @summary Returns `true` if `o` is an [::ObservableArray], `false` otherwise.
*/
__js {
  function isObservableArray(o) {
    return o && o.__oni_is_ObservableArray === true;
  }
  exports.isObservableArray = isObservableArray;
} // _js


/**
   @class ObservableArrayVar
   @summary An array variable trackable with an [::ObservableArray] stream.

   @function ObservableArrayVar
   @param {Array|undefined} [val] Initial value
   
   @function ObservableArrayVar.set
   @param {Integer} [idx] Index
   @param {Object} [val] Value
   @summary Sets the element at a given index

   @function ObservableArrayVar.reset
   @param {Array} [val] Value
   @summary Reset the whole array to the given value

   @function ObservableArrayVar.remove
   @param {Integer} [idx] Index
   @summary Removes the element at a given index

   @function ObservableArrayVar.insert
   @param {Integer} [idx] Index (`0<=idx<=arr.length`)
   @param {Object} [val] Value
   @summary Inserts an element at the given index

   @function ObservableArrayVar.push
   @param {Objec} [val] Value
   @summary Appends an element to the end of the array 
   @desc
     Equivalent to `insert(arr.length, value)`

   @function ObservableArrayVar.get
   @summary Returns the array

   @function ObservableArrayVar.getLength
   @summary Returns length of array

   @variable ObservableArrayVar.stream
   @summary [::ObservableArray] stream with which the ObservableArrayVar can be tracked
*/
function ObservableArrayVar(arr) {
  arr = arr || [];

  var most_recent_revision = 0;
  var oldest_revision = 1;
  var mutations = [];

  var mutation = Object.create(@_Waitable);
  mutation.init();

  function emit_mutation(m) {
    // we maintain a backlog of around array.length mutations;
    // assumption is that each array item costs about as much to
    // serialize as a single mutation. XXX Could make this
    // configurable.
    ++most_recent_revision;
    mutations.push(m);
    if (mutations.length > arr.length) {
      mutations.shift();
      ++oldest_revision;
    }
    mutation.emit();
  }

  return {
    set: function(idx, value) {
      arr[idx] = value;
      emit_mutation({type:'set', val: value, idx: idx});
    },
    reset: function(value) {
      arr = value;
      ++most_recent_revision;
      mutations = [];
      oldest_revision = most_recent_revision + 1;
      mutation.emit();
    },
    insert: function(idx, value) {
      arr.splice(idx, 0, value);
      emit_mutation({type:'ins', val: value, idx: idx});
    },
    push: function(value) {
      arr.push(value);
      emit_mutation({type:'ins', val: value, idx: arr.length-1});
    },
    remove: function(idx) {
      arr.splice(idx, 1);
      emit_mutation({type:'del', idx: idx});
    },
    get: -> arr,

    getLength: -> arr.length,

    stream: ObservableArray(function(r) {
      var have_revision = most_recent_revision;
      r(arr .. @clone);
      while (true) {
        if (have_revision === most_recent_revision)
          mutation.wait();
        if (have_revision+1 < oldest_revision) {
          // we don't have enough history; send a copy of the full array:
          have_revision = most_recent_revision;
          r(arr .. @clone);
        }
        else {
          var deltas = mutations.slice(have_revision+1-oldest_revision);
          have_revision = most_recent_revision;
          r({mutations:deltas});
        }
      }
    })
  };
}
exports.ObservableArrayVar = ObservableArrayVar;


//----------------------------------------------------------------------
// reconstitute

function ObservableArray_reconstitute(obsarr) {
  return @Observable(function(r) {
    var arr = undefined;
    obsarr .. @each {
      |item|
      if (item.mutations === undefined) {
        arr = item .. @clone; // the first item in the stream is always the value itself
      }
      else {

        var internal_mods = false;

        item.mutations .. @each {
          |mutation|
          switch (mutation.type) {
          case 'set':
            internal_mods = true;
            arr[mutation.idx] = mutation.val;
            break;
          case 'ins':
            internal_mods = true;
            arr.splice(mutation.idx, 0, mutation.val);
            break;
          case 'del':
            internal_mods = true;
            arr.splice(mutation.idx, 1);
            break;
          default:
            throw new Error("Unknown operation in ObservableArray stream");
          }
        }
        if (internal_mods)
          arr = arr .. @clone; // ensure that arr is debounced
      }
      r(arr);
    } /* each obsarr */
  });
};


__js {
  /**
    @function reconstitute
    @param {sequence::Sequence|observable::Observable|::StructuredObservable} [seq]
    @return {sequence::Sequence|observable::Observable}
    @summary Reconstitute a [::StructuredObservable] into an [observable::Observable]
    @desc
      [::StructuredObservable]s, such as [::ObservableArray], consist of mutations to an underlying 
      value, rather than the underlying value itself.
      `reconstitute` generates an [observable::Observable] stream that contains the current 'reconstituted' value.

      For generic streams or observables, `reconstitute` just returns 
      the stream/observable itself.
  */

  function reconstitute(stream) {
    if (stream .. isObservableArray) 
      return ObservableArray_reconstitute(stream);
    else if (stream .. isStructuredObservable) {
      // XXX add interface support for user-defined structured observables
      throw new Error("Don't know how to reconstitute this structured observable");
    }
    else
      return stream;
  }
  exports.reconstitute = reconstitute;
}
