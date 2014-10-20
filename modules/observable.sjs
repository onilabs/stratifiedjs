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


var cutil = require('./cutil');
var { Stream, toArray, slice, integers, each, transform, first, skip } = require('./sequence');

/**
  @class Observable
  @inherit sjs:sequence::Stream
  @summary A stream with 'observable' semantics
  @desc
    A stream is said to be an "observable" if it consists of a
    *temporal* sequence of values representing some changing state
    (e.g. that of an [::ObservableVar]).

    Observables are similar to what [Flapjax](http://www.flapjax-lang.org/tutorial/) calls "Behaviors":
    In contrast to an [sjs:event::EventStream]
    (e.g. a stream of 'click' events on a button), an observable always has
    a 'current' value, which can be accessed using [::current] (a synonym for [sjs:sequence::first]).
    Furthermore, observable streams buffer the most recent value. I.e. if the observable changes
    while the downstream receiver is blocked, the receiver will be passed the most recent
    value as soon as it unblocks.
*/

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
  @class ConflictError
  @inherit Error
  @summary The error raised by [::ObservableVar::modify] in the case of a conflict
*/
var ConflictErrorProto = new Error();
var ConflictError = exports.ConflictError = function(msg) {
  var rv = Object.create(ConflictErrorProto);
  rv.message = msg;
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
  @function observe
  @return {sjs:sequence::Stream}
  @summary Create stream of values derived from one or more [sjs:sequence::Stream] inputs (usually [::Observable]s).
  @param {sjs:sequence::Stream} [stream1, stream2, ...] Input stream(s)
  @param {Function} [transformer]
  @desc
    When the returned stream is being iterated, the `transformer` function will be called
    to generate the current value whenever one of the inputs changes.
    `transformer` is passed the most recent value of all inputs, in the same order
    they were passed to the `observe` function.

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
  });
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

