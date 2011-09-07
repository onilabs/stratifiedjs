/*
 * Oni Apollo 'collection' module
 * Utility functions and constructs for concurrent stratified programming
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
  withIterationCancellation(function() {
    cutil.waitforAll(fn, collection, this_obj);
  });
};

exports.eachSeq = function(collection, fn, this_obj) {
  withIterationCancellation(function() {
    for(var i=0; i<collection.length; i++) {
      var elem = collection[i];
      fn.call(this_obj, collection[i], i);
    }
  });
};

// Most functions in this module have a `seq` and `par` version depending on
// which base iterator is used. This helper calls a function-generator
// twice, once with `eachSeq` and once with `each`.
var seqAndParVersions = function(generator) {
  return [generator(exports.eachSeq), generator(exports.each)];
};


var seqAndParMap = seqAndParVersions(function(each) {
  return function(collection, fn, this_obj) {
    var res = [];
    each(collection, function(obj, idx) {
      res[idx] = fn.apply(this_obj, arguments);
    });
    return res;
  };
});
exports.mapSeq = seqAndParMap[0];
exports.map    = seqAndParMap[1];

var seqAndParFind = seqAndParVersions(function(each) {
  return function(collection, fn, this_obj) {
    var found = undefined;
    each(collection, function(elem) {
      if(fn.apply(this_obj, arguments)) {
        found = elem;
        throw stopIteration;
      }
    });
    return found;
  };
});
exports.findSeq = seqAndParFind[0];
exports.find    = seqAndParFind[1];

exports.filterSeq = function(collection, fn, this_obj) {
  var res = [];
  exports.eachSeq(collection, function(elem) {
    if(fn.apply(this_obj, arguments)) {
      res.push(elem);
    }
  });
  return res;
};

exports.filter = function(collection, fn, this_obj) {
  // make an ordered list of [Bool] in parallel
  var include = exports.map(collection, fn, this_obj);
  // and use that to filter sequentially
  res = [];
  exports.eachSeq(collection, function(elem, idx) {
    if(include[idx]) res.push(elem);
  });
  return res;
};

exports.reduce = function(collection, initial, fn, this_obj) {
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
