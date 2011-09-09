/*
 * Oni Apollo 'collection' module
 * Utility functions for processing collections
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2010-2011 Oni Labs, http://onilabs.com
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

//TODO: Is there a likely performance difference between e.g map / mapSeq?
//for non-blocking functions, is it better to use sequential versions to save the
//indirection of all the waitFor branches?

/**
  @module  collection
  @summary Functional tools for iterating and processing collections.
  @desc
    The collection module contains a number of building blocks
    common in functional programming and similar to libraries like
    `underscore.js` and `Functional Javascript`.

    Where possible, the functions in this module work equally well
    iterating over elements in an array and properties of an object
    (ignoring properties on an object's prototype). `arguments`
    objects are treated like arrays.

    The top-level functions in this module operate sequentially
    over the items in a collection, suspending whenever the provided
    work function suspends.
    The module also exports a `par` object with versions of these
    functions that operate in parallel. The return value still
    maintains the initial ordering (except where noted), but the
    function you pass in may be called for items in any order, and
    the execution of multiple calls will be interleaved where possible.

    ### A note on pure javascript libraries:

    It's worth noting that while pure Javascript collection libraries can
    be used in stratified javascript, many of the results will not
    be as expected due to the nature of the SJS compiler.
    Specifically, any time a suspending SJS function is called from
    plain javascript, the computation will not complete, and the return
    value will be unintelligible.

    Practically speaking, this means that any pure javascript function
    which takes an iteration function will not work correctly in the
    presence of a suspended computation. This includes functions like
    `map`, `each`, etc. whenever the provided function does not
    immediately return a value.

    The functions in this module provide the same functionality,
    but are written in SJS and therefore respect the operation
    of stratified code.
*/

var sys = require('sjs:apollo-sys');
var cutil = require('apollo:cutil');
var stopIteration = exports.stopIteration = new Error("stopIteration");
var par = exports.par = {};

/**
  @function identity
  @param    [argument]
  @summary  Returns whatever argument it receives, unmodified.
  @desc
    Mostly useful as a test function given to `find`, `all`, etc.
*/
exports.identity = function(a) { return a; }

var withIterationCancellation = function(fn) {
  try {
    return fn();
  } catch (e) {
    if(e === stopIteration) {
      return undefined;
    }
    throw e;
  }
};


/**
  @function each
  @param    {Object | Array} [collection]
  @param    {Function} [fn] the iterator
  @param    {optional Object} [this_obj]
  @summary  Iterate over each element in a list or property in an object.
  @desc
    Calls the iterator once per item in the given
    collection, with arguments (item, index).

    When `collection` is an object, iterator is called once for each
    of the object's own properties. In this case `value` is the
    value of the property and `index` is the property's name.
*/
exports.each = function(collection, fn, this_obj) {
  withIterationCancellation(function() {
    var keys = exports.keys(collection);
    for(var i=0; i<keys.length; i++) {
      var key = keys[i];
      var elem = collection[key];
      fn.call(this_obj, collection[key], key);
    }
  });
};


/**
  @function par.each
  @param    {Object | Array} [collection]
  @param    {Function} [fn] the iterator
  @param    {optional Object} [this_obj]
  @summary  Parallel version of `each`
*/
exports.par.each = function(collection, fn, this_obj) {
  var keys = exports.keys(collection);
  var iterations = [];
  var iteration = function(key) {
    // make a function that will perform this iteration
    return function() {
      fn.call(this_obj, collection[key], key);
    }
  };

  for(var i=0; i<keys.length; i++) {
    var key = keys[i];
    iterations.push(iteration(key));
  }
  withIterationCancellation(function() {
    //TODO: pass in a list of strata instead of functions?
    cutil.waitforAll(iterations);
  });
};


// -------------------------------------------------------------
// object-specific helpers


/**
  @function keys
  @param    {Object} [obj]
  @return   {Array}  [keys]
  @summary  Returns an array containing the names of `obj`'s own properties.
  @desc     The property names are returned with no consistent order.
*/
exports.keys = function(obj) {
  var keys = [];
  if(sys.isArrayOrArguments(obj)) {
    for(var i=0; i<obj.length; i++) {
      keys.push(i);
    }
  } else {
    for(var k in obj) {
      if(!obj.hasOwnProperty(k)) continue;
      keys.push(k);
    }
  }
  return keys;
};

/**
  @function toArray
  @param    {Array | Arguments} [array_or_arguments]
  @return   {Array}  [array]
  @summary  Returns an array untouched, or an array copy of an `arguments` object.
*/
exports.toArray = function(array_or_arguments) {
  if(array_or_arguments instanceof Array) {
    return array_or_arguments;
  }
  return Array.prototype.slice.call(array_or_arguments);
};

/**
  @function values
  @param    {Object} [obj]
  @return   {Array}  [values]
  @summary  Returns an array containing the values of `obj`'s own properties.
  @desc     The property values are returned in no consistent order.
*/
exports.values = function(obj) {
  var result = [];
  exports.each(obj, function(v) {
    result.push(v);
  });
  return result;
};

/**
  @function items
  @param    {Object | Array} [obj]
  @return   {Array}  [items] A list of [key, value] pairs.
  @summary  Returns an array containing the [key, value] pairs of `obj`'s properties.
  @desc     Object properties are returned in no consistent order.
            Array properties are returned ordered. e.g:

            collection.items(['zero', 'one'])
            => [[0, 'zero'], [1,'one']]

            collection.items({k1:'v1', k2:'v2'})
            => [['k1', 'v1'], ['k2','v2']]
*/
exports.items = function(obj) {
  var result = [];
  exports.each(obj, function(v,k) {
    result.push([k,v]);
  });
  return result;
};


// for accumulating results, we start with an empty object of the same
// type as the collection (i.e object or array)
var emptyObj = function(collection) {
  if(sys.isArrayOrArguments(collection)) {
    return [];
  } else {
    return {};
  }
};


// Most functions in this module have a `seq` and `par` version depending on
// which base iterator is used. This helper calls a function-generator
// twice, once with `eachSeq` and once with `each`.
var seqAndParVersions = function(generator) {
  return [generator(exports.each), generator(par.each)];
};


var seqAndParMap = seqAndParVersions(function(each) {
  return function(collection, fn, this_obj) {
    var res = emptyObj(collection);
    each(collection, function(obj, idx) {
      res[idx] = fn.apply(this_obj, arguments);
    });
    return res;
  };
});

/**
  @function map
  @param    {Object | Array} [collection]
  @param    {Function} [fn] the transform function
  @param    {optional Object} [this_obj]
  @summary  Apply a function to each item in a collection and return the results
  @desc
    Produces a new collection by applying the transformation `fn` to each
    value in the collection.

    `fn` will be called with arguments (value, key) and the return value
    will replace `val` in the returned collection.

    e.g:
    collection.each([1,2,3], function(item) {
      return item + 1;
    });
    => [2,3,4]

    collection.each({foo: 1, bar:2}, function(item) {
      return item + 1;
    });
    => {foo: 2, bar:3}
*/
exports.map     = seqAndParMap[0];

/**
  @function par.map
  @param    {Object | Array} [collection]
  @param    {Function} [fn] the transform function
  @param    {optional Object} [this_obj]
  @summary  Parallel version of `map`
*/
exports.par.map = seqAndParMap[1];

// there are 4 versions of `find`, based on whether they are
// parallel and whether they return the key or value:
(function() {
  var generateFind = function(each, return_fn) {
    return function(collection, fn, this_obj) {
      var found = undefined;
      each(collection, function(elem) {
        if(fn.apply(this_obj, arguments)) {
          found = arguments;
          throw stopIteration;
        }
      });
      if(found === undefined) return undefined;
      return return_fn(found);
    };
  };
  var getFirst = function(a) { return a[0]; };
  var getSecond = function(a) { return a[1]; };

  /**
    @function find
    @param    {Object | Array} [collection]
    @param    {Function} [fn] the test function
    @param    {optional Object} [this_obj]
    @summary  Find and return the first matching element
    @desc
      Returns the first item in the collection for which
      `test(item, key)` returns true (or a truthy value).

      Returns `undefined` when no match is found.
  */
  exports.find        = generateFind(exports.each     , getFirst);

  /**
    @function par.find
    @param    {Object | Array} [collection]
    @param    {Function} [fn] the test function
    @param    {optional Object} [this_obj]
    @summary  Parallel version of `find`
    @desc
      Unlike sequential find, this will return _any_ matching
      element rather than the first.
  */
  exports.par.find    = generateFind(exports.par.each , getFirst);

  /**
    @function findKey
    @param    {Object | Array} [collection]
    @param    {Function} [fn] the test function
    @param    {optional Object} [this_obj]
    @summary  Find the key of the first matching object
    @desc
      Operates exactly like `find`, but returns you the key (index)
      of the first matching item instead of its value.

      Returns `undefined` when no match is found.
  */
  exports.findKey     = generateFind(exports.each     , getSecond);

  /**
    @function par.findKey
    @param    {Object | Array} [collection]
    @param    {Function} [fn] the test function
    @param    {optional Object} [this_obj]
    @summary  Parallel version of findKey
    @desc
      Unlike sequential findKey, this will return _any_ matching
      element's key rather than the first.
  */
  exports.par.findKey = generateFind(exports.par.each , getSecond);
})();

// filter uses a generic and parallelizeable part (filterItems) and then
// combines the results with array or object-specific functions
(function() {
  var KEY = 0;
  var VALUE = 1;
  var filterItems = function(each, collection, fn, this_obj) {
    var result = [];
    each(collection, function(val, key) {
      if(fn.apply(this_obj, arguments)) {
        result.push([key, val]);
      }
    });
    return result;
  };

  var concatArrayItems = function(items) {
    var result = [];
    for(var i=0; i<items.length; i++) {
      result.push(items[i][VALUE]);
    }
    return result;
  };

  var concatObjectItems = function(items) {
    var result = {};
    for(var i=0; i<items.length; i++) {
      result[items[i][KEY]] = items[i][VALUE];
    }
    return result;
  };

  var seqAndParFilter = seqAndParVersions(function(each) {
    return function(collection, fn, this_obj) {
      // build an unordered set of items
      var items = filterItems(each, collection, fn, this_obj);
      // and combine
      if(sys.isArrayOrArguments(collection)) {
        items.sort();
        return concatArrayItems(items);
      } else {
        return concatObjectItems(items);
      }
    };
  });

  /**
    @function filter
    @param    {Object | Array} [collection]
    @param    {Function} [fn] the test function
    @param    {optional Object} [this_obj]
    @summary  Return all items that satisfy `test`
    @desc
      Returns a collection containing only the items in the original
      collection where `test(item, key)` returns truthy.
      When `collection` is an array, the return value will
      maintain relative ordering between elements.
  */
  exports.filter     = seqAndParFilter[0];
  /**
    @function par.filter
    @param    {Object | Array} [collection]
    @param    {Function} [fn] the test function
    @param    {optional Object} [this_obj]
    @summary  Parallel version of filter.
    @desc
      Note that even though `test` will be called in parallel,
      the result will maintain the same ordering as the
      sequential version.
  */
  exports.par.filter = seqAndParFilter[1];
})();


/**
  @function reduce
  @param    {Object | Array} [collection]
  @param    {Object} [initial] the initial value
  @param    {Function} [fn] the reducer function
  @param    {optional Object} [this_obj]
  @summary  Cumulatively combine elements in an array.
  @desc
    Also known as `foldl` or `inject`.
    
    For each element in the list (in order), call `fn(accum, elem, key)`.
    The return value of this call is used as the value of `accum` for the
    next call.

    `initial` is used as the initial value for `accum`, and the final
    value of `accum` is the return value of this function.

    Since the calculation happens on an ordered collection of items,
    object properties are not supported and there is no parallel
    version of this function.
*/
exports.reduce = function(collection, initial, fn, this_obj) {
  if(!sys.isArrayOrArguments(collection)) throw new Error("reduce on non-array");
  var accum = initial;
  exports.each(collection, function(elem, key) {
    accum = fn.call(this_obj, accum, elem, key);
  });
  return accum;
};

/**
  @function reduce1
  @param    {Object | Array} [collection]
  @param    {Function} [fn] the reducer function
  @param    {optional Object} [this_obj]
  @summary  `reduce` for a non-empty list
  @desc
    calls `reduce`, using the first element of `collection` as
    the initial value, and the remaining elements as the collection
    to operate on.

    Throws an error when given an empty list.
*/
exports.reduce1 = function(collection, fn, this_obj) {
  if(collection.length == 0) throw new Error("reduce1 on empty collection");
  return exports.reduce(collection.slice(1), collection[0], fn, this_obj);
};

var seqAndParAll = seqAndParVersions(function(each) {
  return function(collection, fn, this_obj) {
    var ok = true;
    each(collection, function() {
      if(!fn.apply(this_obj, arguments)) {
        ok = false;
        throw stopIteration;
      }
    });
    return ok;
  };
});

/**
  @function all
  @param    {Object | Array} [collection]
  @param    {Function} [test] The test function
  @param    {optional Object} [this_obj]
  @summary  Return whether all items in a collection satisfy the test function
  @desc
    Returns `true` if `test(item, key)` returns truthy for all items in the
    collection, `false` otherwise.
*/
exports.all     = seqAndParAll[0];
/**
  @function par.all
  @param    {Object | Array} [collection]
  @param    {Function} [fn] The test function
  @param    {optional Object} [this_obj]
  @summary  Return whether all items in a collection satisfy the test function
  @desc
    Parallel version of `all`.
*/
exports.par.all = seqAndParAll[1];

var seqAndParAny = seqAndParVersions(function(each) {
  return function(collection, fn, this_obj) {
    var ok = false;
    each(collection, function() {
      if(fn.apply(this_obj, arguments)) {
        ok = true;
        throw stopIteration;
      }
    });
    return ok;
  };
});

/**
  @function any
  @param    {Object | Array} [collection]
  @param    {Function} [test] The test function
  @param    {optional Object} [this_obj]
  @summary  Return whether any item in a collection satisfies the test function
  @desc
    Returns `true` if `test(item, key)` returns truthy for any item in the
    collection, `false` otherwise.
*/
exports.any     = seqAndParAny[0];
exports.par.any = seqAndParAny[1];
