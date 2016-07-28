/*
 * StratifiedJS 'observable' module
 * Constructs for manipulating streams backed by time-varying values
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013-2015 Oni Labs, http://onilabs.com
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
   @module    observable
   @summary   Constructs for manipulating streams backed by time-varying values
   @home      sjs:observable
*/

@ = require([
  {id: 'sjs:sys', name: 'sys'}
]);
var cutil = require('./cutil');
var { isStream, isBatchedStream, toArray, slice, integers, each, transform, first, skip, mirror, ITF_PROJECT, project, METHOD_ObservableArray_project } = require('./sequence');
var { merge, clone, override } = require('./object');
var { Interface, Token } = require('./type');

module.setCanonicalId('sjs:observable');

/**
  @class Observable
  @inherit sjs:sequence::Stream
  @summary A stream with 'observable' semantics
  @desc
    A stream is said to be an "observable" if it consists of a
    *temporal* sequence of values representing some changing state
    (e.g. that of an [::ObservableVar]).

    In contrast to an [sjs:event::EventStream]
    (e.g. a stream of 'click' events on a button), an observable always has
    a 'current' value, which can be accessed using [::current] (a synonym for [sjs:sequence::first]).
    Furthermore, observable streams buffer the most recent value. I.e. if the observable changes
    while the downstream receiver is blocked, the receiver will be passed the most recent
    value as soon as it unblocks.

    Observables are similar to what the [Flapjax](http://www.flapjax-lang.org/tutorial/) language calls "Behaviors".

  @function Observable
  @summary Mark a stream or streaming function as being an Observable
  @param {sjs:sequence::Stream|Function} [stream] A [sjs:sequence::Stream] or streaming function (as defined at [sjs:sequence::Stream]) 
*/
__js {
  var observable_toString = function() {
    return "[object Observable]";
  }
  var Observable = function(s) {
    s.__oni_is_Stream = true;
    s.__oni_is_Observable = true;
    s.toString = observable_toString;
    return s;
  };
  exports.Observable = Observable;
}

/**
   @function isObservable
   @param  {Object} [o] Object to test
   @return {Boolean}
   @summary Returns `true` if `o` is an [::Observable], `false` otherwise.
*/
__js {
  function isObservable(o) {
    return o && o.__oni_is_Observable === true;
  }
  exports.isObservable = isObservable;
}


/**
  @class ObservableVar
  @inherit ::Observable
  @summary An [::Observable] stream backed by a modifiable variable.
  @desc
    **Notes:**

    - ObservableVars are "debounced": modifications such as `set(val)`
      will only cause the observable to emit a new value if `val` is not
      equal to the current observable value (under `===`).

  @function ObservableVar
  @param {Object} [val] Initial value

  @function ObservableVar.get
  @summary Get the current observable value.

  @function ObservableVar.set
  @param {Object} [val] Value to set
  @summary Set a new observable value
  @desc
    **Notes:**

    - If this ObservableVar is shared by multiple pieces of
    code, it is typically better to use [::ObservableVar::modify], which
    will protect against concurrent modifications to the same object.

  @function ObservableVar.modify
  @summary Modify the current observable value
  @param {Function} [change]
  @return {Boolean} whether the value was modified
  @desc

    `modify` allows you to change the current value of the ObservableVar
    without the possibility of race conditions. Consider:

        var increment = function(observable_var) {
          observable_var.set(count.get() + 1);
        };

    While the above code will work fine for a local observable_var object,
    it could silently drop data if either of `get`, `set` or the
    modification function may suspend, or if you forget to get()
    the latest value before setting the new one.

    Instead, the following code is safe under all conditions:

        var increment = function(observable_var) {
          observable_var.modify(val -> val + 1);
        };

    If the observable_var has not changed between the call to the
    `change` function and its return, the value will be updated atomically.

    If the value has changed, the return value from the `change` function
    is no longer necessarily correct, so `modify` throws a [::ConflictError]
    and does not update the value. If you expect multiple concurrent updates
    to a single observable_var, you should catch this exception yourself and
    retry as appropriate.

    ### Warning: avoid mutation

    It is highly recommended that the `change` function
    should be pure. That is, it should *not* modify the current
    value, but instead return a new value based on `current`.

    That is, **don't** do this:

        val.modify(function(items) { items.push(newItem); return items; });

    Instead, you should do this:

        val.modify(function(items) { return items.concat([newItem]); });

    If you mutate the current value but a conflict occurs with other
    code trying to modify the same value, the results will likely
    be inconsistent - the value may have changed, but no observers
    will be notified of the change.

    ### Cancelling a modification

    In some circumstances, you may call `modify`, only to find that
    the current value requires no modification.
    Because observables are debounced (see notes for [::ObservableVar]),
    you can simply return the current value in this case, and no change will occur:

        var decrement = function(observable_var) {
          observable_var.modify(function(current) {
            if (current > 0) return current - 1;
            else return current;
          }
        }
    
    **Note**: Previous versions of this module used an explicit second `unchanged` parameter
    to the modify function, as in:

        var decrement = function(observable_var) {
          observable_var.modify(function(current, unchanged) {
            if (current > 0) return current - 1;
            else return unchanged;
          }
        }
    
    For backwards compatibility, this is still supported.
*/

var unchanged = {};
function ObservableVar(val) {
  var rev = 1;
  var change = Object.create(cutil._Waitable);
  change.init();

  function wait(have_rev) {
    if (have_rev !== rev)
      return rev;
    return change.wait();
  }

  var rv = Observable(function(receiver) {
    var have_rev = 0;
    while (true) {
      wait(have_rev);
      have_rev = rev;
      receiver(val);
    }
  });

  rv.set = function(v) {
    if (val === v) return;
    val = v;
    change.emit(++rev);
  };

  rv.modify = function(f) {
    var newval;
    waitfor {
      change.wait();
      collapse;
      throw ConflictError("value changed during modification");
    } or {
      newval = f(val, unchanged);
    }
    var changed = newval !== unchanged;
    if (changed) rv.set(newval);
    return changed;
  };

  rv.get = -> val;

  rv.__oni_is_Observable = true;
  rv.__oni_is_ObservableVar = true;

  return rv;
}
exports.ObservableVar = ObservableVar;

/**
   @function isObservableVar
   @param  {Object} [o] Object to test
   @return {Boolean}
   @summary Returns `true` if `o` is an [::ObservableVar], `false` otherwise.
*/
__js {
  function isObservableVar(o) {
    return o && o.__oni_is_ObservableVar === true;
  }
  exports.isObservableVar = isObservableVar;
}

/**
  @class ConflictError
  @inherit Error
  @summary The error raised by [::ObservableVar::modify] in the case of a conflict
*/
var ConflictErrorProto = new Error();
var ConflictError = exports.ConflictError = function(msg) {
  var rv = Object.create(ConflictErrorProto);
  rv.message = msg;
  return rv;
};

/**
  @function isConflictError
  @param {Object} [e] Object to test
  @return {Boolean}
  @summary Return whether `e` is a [::ConflictError]
*/
exports.isConflictError = function(ex) {
  return Object.prototype.isPrototypeOf.call(ConflictErrorProto, ex);
};

/**
  @function synchronize
  @summary Synchronize two [::ObservableVar]s
  @param {::ObservableVar} [A]
  @param {::ObservableVar} [B]
  @param {Object} [settings]
  @setting {Function} [aToB] Optional transformation for values of `A` to values of `B` 
  @setting {Function} [bToA] Optional transformation for values of `B` to values of `A`
  @desc
     - `synchronize` will synchronize the values of `A` and `B` until explicitly aborted (e.g. with a `waitfor{}or{}`).

     - `A` is the "master" observable from which `B` will initialized.

     - The optional transformation functions `aToB` and `bToA` do not need to be reversable. Setting `A` explicitly causes `B` to be set to `aToB(A)`, but won't cause a subsequent call to `bToA` with the new value of `B`. (Similar when explicitly setting `B`.)

     - If `B` is set explicitly while a call `aToB(A)` is blocked, the pending `aToB(A)` call will be aborted and `A` will be set to `bToA(B)` instead. (Similar when explicitly setting `A` while an internal update `bToA(B)` is in progress.)

     *** Current limitations:

     - The ObservableVars must both reside on the same process (in particular `synchronize` doesn't work with ObservableVars that are remoted between client and server across conductance's bridge.
 */
function synchronize(A, B, settings) {
  settings = {
    aToB: undefined,
    bToA: undefined
  } .. override(settings);

  var AfromB = {} /* a token that A is definitely not set to */, BfromA;

  waitfor {
    A .. each.track { 
      |valA|
      if (valA === AfromB) continue;
      if (settings.aToB)
        valA = settings.aToB(valA);
      BfromA = valA;
      B.set(valA);
    }
  }
  and {
    B .. exports.changes .. each.track {
      |valB|
      if (valB === BfromA) continue;
      if (settings.bToA)
        valB = settings.bToA(valB);
      AfromB = valB;
      A.set(valB);      
    }
  }

}
exports.synchronize = synchronize;

/**
  @function observe
  @return {::Observable}
  @summary Create stream of values derived from one or more [::Observable] inputs.
  @param {::Observable} [stream1, stream2, ...] Input stream(s)
  @param {Function} [transformer]
  @desc
    When the returned stream is being iterated, the `transformer` function will be called
    to generate the current value whenever one of the inputs changes.
    `transformer` is passed the most recent value of all inputs, in the same order
    they were passed to the `observe` function. All inputs will be passed through 
    [::reconstitute], ensuring that the value seen by the transformer for a given input 
    represents that inputs current value and not a mutation object.  

    If one of the inputs changes during execution of `transformer`, the execution will be
    aborted, and `transformer` will be called with the new set of inputs.

    For example, you might want to compute a derived property
    from a single observable variable:

        var person = ObservableVar({
          firstName: "John",
          lastName: "Smith",
        });

        var fullName = observe(person, function(current) {
          return "#{current.firstName} #{current.lastName}";
        });

    When `person` changes, `fullName` will be recomputed automatically, and
    any code iterating over `fullName` will see the new value immediately.

    You can create a observable stream from multiple source streams:

        var runner = ObservableVar({
          firstName: "John",
          lastName: "Smith",
          id: 5,
        });

        // The most recent race results:
        var latestRanking = ObservableVar([8, 2, 5, 7, 1, 3]);

        var personStatus = observe(runner, latestRanking, function(runnerVal, rankingVal) {
          return `$(runnerVal.firstName) came #$(rankingVal.indexOf(runner.id)+1) in the last race`;
        });

        // If `personStatus` is displayed in a [mho:surface::HtmlFragment], the UI would
        // initially read "John came #3 in the last race", and would update
        // whenever `runner` or `latestRanking` changed.

*/
function observe(/* var1, ...*/) {
  var deps = arguments .. slice(0,-1) .. toArray;
  var f = arguments[arguments.length-1];

  __js {
    deps .. each {
      |dep|
      if (!isObservableVar(dep)) {
        if (!isStream(dep)) 
          throw new Error("invalid non-stream argument '#{typeof dep}' passed to 'observe()'");
        // else
        console.log("Warning: non-observable sequence passed to observe(). This will throw in future.");
      }
    }
  }

  return Observable(function(receiver) {
    var inputs = [], primed = 0, rev=1;
    var change = Object.create(cutil._Waitable);
    change.init();

    waitfor {
      var current_rev = 0;
      while (1) {
        change.wait();
        if (primed < deps.length) continue;
        while (current_rev < rev) {
          waitfor {
            change.wait();
          }
          or {
            current_rev = rev;
            var f_val = f.apply(null, inputs);
            collapse; // don't interrupt downstream call
            receiver(f_val);
          }
        }
      }
    }
    or {
      cutil.waitforAll(
        function(i) {
          var first = true;
          deps[i] .. reconstitute .. each {
            |x|
            if (first) {
              ++primed;
              first = false;
            }
            else {
              ++rev;
            }
            inputs[i] = x;
            change.emit();
          }
        },
        integers(0,deps.length-1) .. toArray);
    }
  }) .. mirror;
}
exports.observe = observe;


/**
   @function current
   @param {sjs:sequence::Stream} [obs] Stream (usually an [::Observable])
   @summary Obtain the current value of an [::Observable]; synonym for [sjs:sequence::first]
*/
exports.current = first;

/**
   @function changes
   @param {sjs:sequence::Stream} [obs] Stream (usually an [::Observable])
   @summary Obtain a stream of *changes* of an [::Observable], omitting the initial value; synonym for `skip(1)`.
*/
exports.changes = obs -> obs .. skip(1);

/**
   @function eventStreamToObservable
   @param {sjs:event::EventStream} [events]
   @param {Function} [getInitial] Function that returns the initial value of the observable.
   @return {::Observable}
   @summary Construct an Observable of the most recent emitted event from an  [sjs:event::EventStream].
   @desc
     The returned observable will initially be equal to `getInitial()` and be updated with any new values
     emitted by `events`.

     #### Notes

     For the returned stream to have observable semantics, `getInitial` has to yield a value in finite time.
     If `events` produces a value before `getInital()` returns, the `getInitial()` call will be aborted.
*/
function eventStreamToObservable(events, getInitial) {
  return Observable(function(receiver) {
    var val, ver = 0, current_ver = 0;
    waitfor {
      var have_new_val = Object.create(cutil._Waitable);
      have_new_val.init();
      waitfor {
        events .. each {
          |e|
          val = e; 
          ++ver;
          collapse;
          have_new_val.emit();
        }
      }
      or {
        val = getInitial();
        ++ver;
        have_new_val.emit();
        hold();
      }
    }
    and {
      while (true) {
        if (current_ver === ver)
          have_new_val.wait();
        ++current_ver;
        receiver(val);
      }
    }
  });
}
exports.eventStreamToObservable = eventStreamToObservable;

/**
   @function constantObservable
   @param {Object} [obj]
   @summary Create an observable that always returns `obj`
*/
exports.constantObservable = function(obj) {
  return Observable(function(receiver) {
    receiver(obj);
    hold();
  });
};

//----------------------------------------------------------------------

/**
   @class ObservableArray
   @inherit ::Observable
   @summary An Observable stream tracking Array mutations
   @desc
      An ObservableArray is a Stream (with [::Observable] semantics) representing 
      the changing state of an array (e.g. that of an [::ObservableArrayVar]).

      The first element in the stream is a copy of the current array. (This implies
      that calling [::current] on an ObservableArray yields the desired result of 
      returning the tracked arrays current value).

      Subsequent elements of the stream consist of objects that contain a list of mutations:

          { mutations: [ ... ] }, { mutations: [ ... ] }, ...

      There are 3 types of mutations:

      * Resetting the complete array to the given value:
      
            { type: 'reset', val: NEW_ARRAY_VALUE }

      * Inserting a new element:

            { type: 'ins', val: NEW_ELEMENT_VALUE, idx: INDEX_WHERE_TO_INSERT }

      * Removing an element at a given index:

            { type: 'del', idx: INDEX_WHERE_TO_REMOVE }

      * Setting the value at a given index:

            { type: 'set', val: NEW_ELEMENT_VALUE, idx: INDEX_WHERE_TO_SET }

      An ObservableArray can be 'reconstituted' into a plain
      Observable of the complete array (and not only mutations) by
      using [::reconstitute].

      Calling [sequence::project] on an ObservableArray is equivalent to calling
      `@transform(elems -> elems .. @project(elem -> f(elem)))` on the reconsitituted 
      stream, but it yields an ObservableArray (i.e. a stream of mutations).
*/

// project method, hooked into sequence::knownProjectionMethods:
function ObservableArray_project(upstream, transformer) {
  return ObservableArray(
    upstream .. 
      transform(function(item) {
        if (item.mutations) {
          return {mutations: 
                  item.mutations .. 
                  project(function(delta) {
                    switch (delta.type) {
                    case 'reset':
                      delta = delta .. merge({val: delta.val .. project(transformer)});
                      break;
                    case 'set':
                    case 'ins':
                      delta = delta .. merge({val: transformer(delta.val)});
                      break;
                    case 'del':
                      break;
                    default:
                      throw new Error("Unknown operation in ObservableArray stream");
                    }
                    return delta;
                  })
                 };
        }
        else {
          // first value in stream
          return item .. project(transformer);
        }
      }));
};
exports.ObservableArray_project = ObservableArray_project;

function ObservableArray(stream) {
  stream[ITF_PROJECT] = METHOD_ObservableArray_project;
  stream[ITF_RECONSTITUTE] = METHOD_ObservableArray_reconstitute;
  return stream;
}
exports.ObservableArray = ObservableArray;

/**
   @class ObservableArrayVar
   @summary An array variable trackable with an [::ObservableArray] stream.

   @function ObservableArrayVar
   @param {Array|undefined} [val] Initial value
   
   @function ObservableArrayVar.set
   @param {Integer} [idx] Index
   @param {Object} [val] Value
   @summary Sets the element at a given index

   @function ObservableArrayVar.remove
   @param {Integer} [idx] Index
   @summary Removes the element at a given index

   @function ObservableArrayVar.insert
   @param {Integer} [idx] Index
   @param {Object} [val] Value
   @summary Inserts an element at the given index

   @function ObservableArrayVar.get
   @summary Returns the array

   @variable ObservableArrayVar.stream
   @summary [::ObservableArray] stream with which the ObservableArrayVar can be tracked
*/
function ObservableArrayVar(arr) {
  arr = arr || [];

  var most_recent_revision = 0;
  var oldest_revision = 1;
  var mutations = [];

  var mutation = Object.create(cutil._Waitable);
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
    insert: function(idx, value) {
      arr.splice(idx, 0, value);
      emit_mutation({type:'ins', val: value, idx: idx});
    },
    remove: function(idx) {
      arr.splice(idx, 1);
      emit_mutation({type:'del', idx: idx});
    },
    get: -> arr,

    stream: ObservableArray(Observable(function(r) {
      var have_revision = most_recent_revision;
      r(arr .. clone);
      while (true) {
        if (have_revision === most_recent_revision)
          mutation.wait();
        if (have_revision+1 < oldest_revision) {
          // we don't have enough history; send a reset:
          have_revision = most_recent_revision;
          r({mutations:[{type: 'reset', val: arr .. clone}]});
        }
        else {
          var deltas = mutations.slice(have_revision+1-oldest_revision);
          have_revision = most_recent_revision;
          r({mutations:deltas});
        }
      }
    }))
  };
}
exports.ObservableArrayVar = ObservableArrayVar;


//----------------------------------------------------------------------
// reconstitute

var METHOD_ObservableArray_reconstitute = Token(module, 'method', 'ObservableArray_reconstitute');
function ObservableArray_reconstitute(obsarr) {
  return Observable(function(r) {
    var arr = undefined;
    obsarr .. each {
      |item|
      if (arr === undefined) {
        arr = item .. clone; // the first item in the stream is always the value itself
      }
      else {
        item.mutations .. each {
          |mutation|
          switch (mutation.type) {
          case 'reset':
            arr = mutation.val .. clone;
            break;
          case 'set':
            arr[mutation.idx] = mutation.val;
            break;
          case 'ins':
            arr.splice(mutation.idx, 0, mutation.val);
            break;
          case 'del':
            arr.splice(mutation.idx, 1);
            break;
          default:
            throw new Error("Unknown operation in ObservableArray stream");
          }
        }
      }
      r(arr);
    }
  });
};


__js {
  /*
    @variable ITF_RECONSTITUTE
    XXX document
   */
  var ITF_RECONSTITUTE = Interface(module, 'reconstitute');
  exports.ITF_RECONSTITUTE = ITF_RECONSTITUTE;

  /*
    @variable knownReconstitutionMethods
    XXX document
   */
  var knownReconstitutionMethods = {};
  knownReconstitutionMethods[METHOD_ObservableArray_reconstitute] = ObservableArray_reconstitute;
  exports.knownReconstitutionMethods = knownReconstitutionMethods;
  
  /**
    @function reconstitute
    @param {sequence::Sequence} [seq]
    @summary Reconstitute a stream of mutations into a stream of the mutated value
    @desc
      Some streams, such as [::ObservableArray], consist of mutations to an underlying value,
      rather than the underlying value itself.
      `reconstitute` generates a stream that contains the current 'reconstituted' value rather
      than the mutations.

      For generic streams, `reconstitute` just returns the stream itself. 
  */

  function reconstitute(stream) {
    var method = stream[ITF_RECONSTITUTE];
    if (typeof method === 'function') { 
      return method(stream);
    }
    else if (typeof method === 'string') {
      method = knownReconstitutionMethods[method];
      if (!method) throw new Error('unknown reconstitution method');
      return method(stream);
    }
    else
      return stream;
  }
  exports.reconstitute = reconstitute;
}

//----------------------------------------------------------------------
// Stencil facility
/*
XXX this needs some fleshing out

function stencil(val, block) {
  var Stencil = ObservableVar(val);
  @sys.withDynVarContext {
    ||
    @sys.setDynVar("__sjs_stencil", Stencil);
    block(Stencil);
  }
}
exports.stencil = stencil;

function _(name, defval) {
  return Stream(function(r) {
    var Stencil = @sys.getDynVar('__sjs_stencil', defval);
    if (!Stencil || Stencil[name] === undefined) {
      r(defval);
      hold();
    }
    Stencil .. @each { |val| r(val === undefined ? defval : val) }
  });
}
exports._ = _;
*/
