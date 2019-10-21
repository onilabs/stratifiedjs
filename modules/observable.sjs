/*
 * StratifiedJS 'observable' module
 * Constructs for manipulating streams backed by time-varying values
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013-2016 Oni Labs, http://onilabs.com
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
   @inlibrary sjs:std
   @inlibrary mho:std
*/
'use strict';

@ = require([
  {id: 'sjs:sys', name: 'sys'}
]);
var cutil = require('./cutil');
var { Stream, isSequence, isStream, toArray, slice, integers, first, each, skip, mirror, consume, isStructuredStream, StructuredStream } = require('./sequence');
var { override } = require('./object');

module.setCanonicalId('sjs:observable');

/**
  @class Observable
  @inherit sjs:sequence::Stream
  @summary A stream with 'observable' semantics
  @desc
    A stream is said to be an "observable" if it consists of a
    *temporal* sequence of values representing some changing state
    (e.g. that of an [::ObservableVar]). The most recent value emitted
    by the stream represents the current state.

    In contrast to an [sjs:event::EventStream]
    (e.g. a stream of 'click' events on a button), an observable always has
    a 'current' value, which can be accessed using [::current] (a synonym for [sjs:sequence::first]).
    Furthermore, observable streams buffer the most recent value. I.e. if the observable changes
    while the downstream receiver is blocked, the receiver will be passed the most recent
    value as soon as it unblocks.

    Observables are similar to what the [Flapjax](http://www.flapjax-lang.org/tutorial/) language calls "Behaviors".
*/

/**
  @class ObservableVar
  @inherit ::Observable
  @summary A modifiable variable driving an [::Observable] stream
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

  var rv = Stream(function(receiver) {
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
   @class ObservableWindowVar
   @summary A variable containing a rolling window of elements driving an [::Observable] stream
   @desc
     A variable containing a rolling `window`-sized window of elements with an associated [::Observable] stream.

     Elements are shifted (from the left) into the window using [::ObservableWindowVar::add]. The oldest
     element will be shifted out (to the right) to maintain the number of elements in the variable
     at `<=window`.

     ### Stream structuring details
     The generated stream, [::ObservableWindowVar::stream], is an efficiently encoded
     [sequence::StructuredStream] of type 'rolling'.

   @function ObservableWindowVar
   @param {Integer} [window] Number of elements in the rolling window

   @function ObservableWindowVar.add
   @param {Object} [val] Element to shift into the window.
   @summary Shift an element into the rolling window.

   @function ObservableWindowVar.clear
   @summary Clears all elements from the rolling window.

   @variable ObservableWindowVar.stream
   @summary  [::Observable] of the variable. (A 'rolling' [sequence::StructuredStream])
*/
function ObservableWindowVar(window) {
  var Update = Object.create(cutil._Waitable);
  Update.init();
  var queue = [];
  var adds = 0;
  var stream = StructuredStream('rolling') ::
      Stream :: function(r) {
        var pos = 0; // stream position
        var have = 0;
        while (1) {
          __js {
            var remove = have-Math.max(queue.length-(adds-pos),0);
            var add = Math.min(adds-pos, queue.length);
            var rv = [remove, queue.slice(queue.length-add)];
            pos = adds;
            have += add - remove;
          } // __js 
          r(rv);
          if (pos === adds)
            Update.wait();
        }
      };

  return {
    stream: stream,

    add: function(x) { 
      __js {
        queue.push(x);
        ++adds;
        if (queue.length > window) queue.shift();
      }
      Update.emit();
    },

    clear: function() {
      __js queue = [];
      Update.emit();
    },

    __oni_is_ObservableWindowVar: true
  };
}
__js exports.ObservableWindowVar = ObservableWindowVar;

/**
   @function isObservableWindowVar
   @param  {Object} [o] Object to test
   @return {Boolean}
   @summary Returns `true` if `o` is an [::ObservableWindowVar], `false` otherwise.
*/
__js {
  function isObservableWindowVar(o) {
    return o && o.__oni_is_ObservableWindowVar === true;
  }
  exports.isObservableWindowVar = isObservableWindowVar;
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

     - The ObservableVars must both reside in the same process (in particular `synchronize` doesn't work with ObservableVars that are remoted between client and server across conductance's bridge).
 */
function synchronize(A, B, settings) {
  settings = {
    aToB: undefined,
    bToA: undefined
  } .. override(settings);

  var UNSET_TOKEN = {};
  var AfromB = UNSET_TOKEN;
  var BfromA = UNSET_TOKEN;

  waitfor {
    A .. each.track { 
      |valA|
      if (valA === AfromB) continue;
      if (settings.aToB)
        valA = settings.aToB(valA);
      BfromA = valA;
      AfromB = UNSET_TOKEN;
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
      BfromA = UNSET_TOKEN;
      A.set(valB);
    }
  }

}
exports.synchronize = synchronize;

/**
  @function observe
  @deprecated Use [::CompoundObservable]
  @return {::Observable}
  @summary Create stream of values derived from one or more [::Observable] inputs.
  @param {::Observable} [stream1, stream2, ...] Input stream(s)
  @param {Function} [transformer]
  @desc
    When the returned stream is being iterated, the `transformer` function will be called
    to generate the current value whenever one of the inputs changes.
    `transformer` is passed the most recent value of all inputs, in the same order
    they were passed to the `observe` function. 

    If one of the inputs changes during execution of `transformer`, the execution will be
    aborted, and `transformer` will be called with the new set of inputs. Downstream execution, however, 
    will never be interrupted.

    Even if the `observe` stream is iterated concurrently by multiple consumers, there will only be one 
    concurrent iteration of each input stream (the output of `observe` is passed through [./sequence::mirror]).

    ### Examples

    * Compute a derived property from a single observable variable:

          var person = ObservableVar({
            firstName: "John",
            lastName: "Smith",
          });

          var fullName = observe(person, function(current) {
            return "#{current.firstName} #{current.lastName}";
          });

    When `person` changes, `fullName` will be recomputed automatically, and
    any code iterating over `fullName` will see the new value immediately.

    * Create an observable stream from multiple source streams:

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
      if (!isStream(dep)) 
        throw new Error("invalid non-stream argument '#{typeof dep}' passed to 'observe()'");
    }
  }

  return Stream(function(receiver) {
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
          deps[i] .. each {
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
  @function CompoundObservable
  @summary Combine several observables into a single observable
  @return {::Observable}
  @param {Array} [sources] Array of source [::Observable]s
  @param {optional Function} [transformer=identity] Optional output transformer - see description
  @desc
    * Creates an observable that combines the values of the observables `sources[0]`, `sources[1]`, ..., 
      into array values `[s0, s1, ...]`, where `sN` is the current value of `source[N]`.
      Whenever any of the source observables changes, the compound observable's value will be updated.

    * The source observables will only be iterated while the compound observable is being iterated.

    * Even if the compound observable is iterated concurrently by multiple consumers, there will only be one 
      concurrent iteration of each source stream (the output of `CompoundObservable` is passed through [./sequence::mirror]).

    ### Optional transformation function

    * An optional `transformer` function can be specified to modify the `CompoundObservable`'s output value. It will
      be passed an array of current source values `[s0, s1, ...]` as argument.

    * `transformer` will only be called while the compound observable is being iterated.

    * If `transformer` is a blocking function and one of the inputs changes during execution of `transformer`, the execution will be
      aborted, and `transformer` will be called with the new set of inputs. Downstream execution, however, 
      will never be interrupted.


    ### Examples

    ##### Compute a derived property from a single observable variable:

          var person = ObservableVar({
            firstName: "John",
            lastName: "Smith",
          });

          var fullName = [person] .. 
            CompoundObservable([current] -> "#{current.firstName} #{current.lastName}");


      Note: You could achieve (almost) the same effect by using [projection::project]:

          var fullName = person .. @project(current -> "#{current.firstName} #{current.lastName}");

      The difference here is that the `project` version does not do an implicit [./sequence::mirror].
      Also, if the transformer function were to block - e.g. do a database lookup in the background -, 
      the `CompoundObservable`-version would cancel the db lookup if `person` takes on a new value, 
      and would call the transformer function again with the updated data immediately.



    ##### Create an observable stream from multiple source streams:

          var runner = ObservableVar({
            firstName: "John",
            lastName: "Smith",
            id: 5,
          });

          // The most recent race results:
          var latestRanking = ObservableVar([8, 2, 5, 7, 1, 3]);

          var personStatus = [runner, latestRanking] .. 
            CompoundObservable([runnerVal, rankingVal] ->
              `$(runnerVal.firstName) came #$(rankingVal.indexOf(runner.id)+1) in the last race`);

          // If `personStatus` is displayed in a [mho:surface::HtmlFragment], the UI would
          // initially read "John came #3 in the last race", and would update
          // whenever `runner` or `latestRanking` changed.

*/
function CompoundObservable(sources, transformer) {
  __js {
    sources .. each {
      |source|
      if (!isStream(source)) {
          throw new Error("invalid non-stream argument of type '#{isSequence(source) ? source : typeof source}' passed to 'CompoundObservable()'");
      }
    }
  } /* __js */

  return Stream(function(receiver) {
    var inputs = [], primed = 0, rev=1;
    var change = Object.create(cutil._Waitable);
    change.init();

    waitfor {
      var current_rev = 0;
      while (1) {
        change.wait();
        if (primed < sources.length) continue;
        while (current_rev < rev) {
          waitfor {
            change.wait();
          }
          or {
            current_rev = rev;
            var val = inputs.slice(0);
            if (transformer) 
              val = transformer(inputs);
            collapse; // don't interrupt downstream call
            receiver(val);
          }
        }
      }
    }
    or {
      cutil.waitforAll(
        function(i) {
          var first = true;
          sources[i] .. each {
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
        integers(0,sources.length-1) .. toArray);
    }
  }) .. mirror;
}
exports.CompoundObservable = CompoundObservable;

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
   @function updatesToObservable
   @param {sjs:sequence::Stream} [updates] Stream of updates
   @param {Function} [getInitial] Function that returns the initial value of the observable.
   @return {::Observable}
   @summary Construct an Observable from an initial value and a stream of updates.
   @desc
     The returned observable will initially be equal to `getInitial()` and be updated with any new values
     emitted by `updates`.
     The returned observable will be 'decoupled' from the `updates` stream: Iterating the returned observable
     stream will never block iteration of the input stream. 

     #### Notes

     Iteration of `updates` begins *before* calling `getInitial()`, to prevent a stale 
     initial value from overriding a more recent update.
     If `updates` produces a value before `getInital()` returns, the `getInitial()` call will be aborted.

     The output observable is not [sjs:sequence::mirror]ed. I.e. multiple concurrent iterations of the 
     observable will cause multiple concurrent iterations of the input stream.

*/
function updatesToObservable(updates, getInitial) {
  return Stream(function(receiver) {
    var val, ver = 0, current_ver = 0;
    waitfor {
      var have_new_val = Object.create(cutil._Waitable);
      have_new_val.init();
      waitfor {
        updates .. each {
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
exports.updatesToObservable = updatesToObservable;

/**
   @function constantObservable
   @summary Obsolete name for [::ConstantObservable]
   @deprecated Use [::ConstantObservable]

   @function ConstantObservable
   @param {Object} [obj]
   @summary Create an observable that always returns `obj` and then `hold()`s.
*/
exports.ConstantObservable = exports.constantObservable = function(obj) {
  return Stream(function(receiver) {
    receiver(obj);
    hold();
  });
};

/**
   @function DelayedObservable
   @summary Create an observable that waits before communicating updates
   @param {::Observable} [observable] Input observable
   @param {optional Integer} [delay_ms=0] Duration to wait before communicating updates
   @desc
     When iterated, `DelayedObservable` will return the current value of `observable`. 
     When `observable` subsequently changes, `DelayedObservable` will wait `delay_ms` for 
     before emitting the most recent value of `observable`. I.e. if `observable` changes
     during the waiting period, only the most recent value will be emitted.

*/
exports.DelayedObservable = function(observable, dt) {
  if (dt === undefined) dt = 0;

  return Stream(function(receiver) {
    var eos = {};
    observable .. consume(eos) {
      |next|
      var val = next();
      while (val !== eos) {
        receiver(val);
        val = next();
        waitfor {
          while (1) {
            var val2 = next();
            if (val2 === eos) break;
            val = val2;
          }
        }
        or {
          hold(dt);
        }
      }
    }
  });
};

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

//----------------------------------------------------------------------
// sampling

/**
   @function sample
   @summary Construct an Observable by sampling a stream
   @param {sequence::Stream} [stream] Stream to sample
   @return {sequence::Stream|sequence::StructuredStream} Stream with [::Observable] semantics; possibly a 'rolling' [sequence::StructuredStream]
   @desc
     `sample` iterates the input `stream` to produce a stream that buffers the
     most recently seen value (i.e. a stream with [::Observable] semantics).
     The output stream is 'decoupled' from the input stream: Even if the consumer
     blocks during iteration, the input stream will never be blocked and will be
     iterated as fast as it can produce values.

     The output observable is not [sequence::mirror]ed. I.e. multiple concurrent 
     iterations of the observable will cause multiple concurrent iterations of the
     input stream.

     See also [::updatesToObservable] for creating an [::Observable] from a stream
     that might not produce a value at all (or that takes an unreasonably long time
     to do so).

     ### Stream structuring details

     If the input stream is a [sequence::StructuredStream] of type `rolling`, 
     `sample` will also return a rolling structured stream.
     For generic input streams, `sample` returns a plain [sequence::Stream].
     
*/


function withSampler_plain(block) {
  var sample;
  block({
    add_elem: __js function(x) { sample = x; },
    retrieve_sample: __js -> sample
  });
}

function withSampler_rolling(block) {
  var sample = [0,[]], upstream_window = 0;

  block({
    add_elem: __js function(x) {
      var remove_from_upstream = Math.min(upstream_window - sample[0], x[0]);
      var slice_from_sample = x[0] - remove_from_upstream;
      sample[0] += remove_from_upstream;
      sample[1] = sample[1].concat(x[1]).slice(slice_from_sample);
    },
    retrieve_sample: __js function() {
      var rv = sample;
      upstream_window = upstream_window + sample[1].length - sample[0];
      sample = [0,[]];
      return rv;
    }
  });
}

function sample(seq) {
  if (isStructuredStream('rolling') :: seq) {
    return StructuredStream('rolling') :: 
      Stream ::
        function(receiver) { return sample_inner(seq.base, withSampler_rolling, receiver); }
  }
  else {
    return Stream ::
      function(receiver) { return sample_inner(seq, withSampler_plain, receiver); }
  }
}
exports.sample = sample;

function sample_inner(seq, withSampler, receiver) {
  var resume_pickup;
  var have_sample = false;
  var done = false;
  withSampler {
    |{add_elem, retrieve_sample}|
    waitfor {
      seq .. each {
        |x|
        add_elem(x);
        have_sample = true;
        if (resume_pickup) resume_pickup();
      }
      done = true;
      if (resume_pickup) resume_pickup();
    }
    and {
      while(true) {
        if (!have_sample && !done) {
          waitfor() {
            resume_pickup = resume;
          }
          finally {
            resume_pickup = undefined;
          }
        }
        if (done) return;
        have_sample = false;
        receiver(retrieve_sample());
      }
    }
  }
}

