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
/**
  @module    collection
  @summary   The collection module contains functional utilities for
             processing collections. Most methods operate in parallel
             by default, and for each of these there is a `*Seq` version
             which operates on the collection sequentially and in order.
*/

//TODO: Document!

//TODO: support object iteration for all these functions?
//e.g: map({k:"val"}, function(val, key) { return val + '!'; });
//     >>> {k: "val!"}

//TODO: Is there a likely performance difference bwtween e.g map / mapSeq?
//for non-blocking functions, is it better to use *Seq versions to save the
//indirection of all the waitFor branches?

var sys = require('sjs:apollo-sys');
var cutil = require('apollo:cutil');
var stopIteration = exports.stopIteration = new Error("stopIteration");

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


exports.each = function(collection, fn, this_obj) {
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
exports.eachSeq = function(collection, fn, this_obj) {
  withIterationCancellation(function() {
    var keys = exports.keys(collection);
    for(var i=0; i<keys.length; i++) {
      var key = keys[i];
      var elem = collection[key];
      fn.call(this_obj, collection[key], key);
    }
  });
};


// -------------------------------------------------------------
// object-specific helpers

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

exports.toArray = function(array_or_arguments) {
  if(array_or_arguments instanceof Array) {
    return array_or_arguments;
  }
  return Array.prototype.slice.call(array_or_arguments);
};

exports.values = function(obj) {
  var result = [];
  exports.eachSeq(obj, function(v) {
    result.push(v);
  });
  return result;
};

exports.items = function(obj) {
  var result = [];
  exports.eachSeq(obj, function(v,k) {
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
  return [generator(exports.eachSeq), generator(exports.each)];
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
exports.mapSeq = seqAndParMap[0];
exports.map    = seqAndParMap[1];

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

  exports.findSeq    = generateFind(exports.eachSeq, getFirst);
  exports.find       = generateFind(exports.each,    getFirst);
  exports.findKeySeq = generateFind(exports.eachSeq, getSecond);
  exports.findKey    = generateFind(exports.each,    getSecond);
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
  exports.filterSeq = seqAndParFilter[0];
  exports.filter    = seqAndParFilter[1];
})();


exports.reduce = function(collection, initial, fn, this_obj) {
  if(!sys.isArrayOrArguments(collection)) throw new Error("reduce on non-array");
  var accum = initial;
  exports.each(collection, function(elem) {
    accum = fn.call(this_obj, accum, elem);
  });
  return accum;
};

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
exports.allSeq = seqAndParAll[0];
exports.all    = seqAndParAll[1];

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
exports.anySeq = seqAndParAny[0];
exports.any    = seqAndParAny[1];
