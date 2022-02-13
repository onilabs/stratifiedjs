/*
 * StratifiedJS 'object' module
 * Functions for working with objects
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
   @module  object
   @summary Functions for working with objects
   @home    sjs:object
   @inlibrary sjs:std
   @inlibrary mho:std
*/
'use strict';

var { each, transform, Stream, map } = require('./sequence');
var { extendObject, mergeObjects, flatten, isArrayLike, overrideObject } = require('builtin:apollo-sys');

__js var hasProperty = function(k) { if (typeof this !== 'object' || this === null) return false; return k in this; }
__js var hasOwnProperty = Object.prototype.hasOwnProperty;

__js var _get = function(guard, args) {
  var subject = args[0], key = args[1], defaultValue = args[2];
  if (guard.call(subject, key)) {
    return subject[key];
  } else {
    if (args.length < 3) {
      // no defaultValue provided
      throw new Error("Object (#{typeof(subject)}) has no property: " + key);
    }
    return defaultValue;
  }
  return result;
};

/**
  @function get
  @param {Object} [subject]
  @param {String} [prop]
  @param {optional Object} [default]
  @return {Object}
  @summary Get a named property from an object.
  @desc
    Similar to accessing `subject[prop]`, except when the
    property does not exist on the subject:

    * returns `default` (if provided)
    * otherwise, throws an error
    
    For accessing only "own" properties (i.e. ignoring
    inherited properties), use [::getOwn].
*/
__js exports.get = function(subject, key, defaultValue) {
  return _get(hasProperty, arguments);
};

/**
  @function getOwn
  @param {Object} [subject]
  @param {String} [prop]
  @param {optional Object} [default]
  @return {Object}
  @summary Get a named own property from an object.
  @desc
    Like [::get], but ignores inherited properties on `subject`.
*/
__js exports.getOwn = function(subject, key, defaultValue) {
  return _get(hasOwnProperty, arguments);
};

__js var sentinel = {};
/**
    @function getPath
    @param {Object} [subject]
    @param {String|Array} [path]
    @param {optional Object} [default]
    @return {Object}
    @summary Get a nested property from an object.
    @desc
      `path` can be a dotted string (`"a.b.c"`) or
      an array of keys (`['a','b','c']`). If `path` is an empty string, 
      `subject` will be returned.

      If `default` is provided, it will be returned when the
      subject has no such property. If no default is provided,
      an error will be raised on the first missing property in
      a path.

      ### Example:

          var o = {parent: {child: {name: "bob" } } };

          o .. getPath('parent.child.name');
          // "bob"
          
          o .. getPath(['parent', 'child', 'name']);
          // "bob"
          
          o .. getPath('parent.name');
          // Throws an error
          
          o .. getPath('parent.name', "no name!");
          // "no name!"
          
          [["one", "two"]] .. getPath([0, 1]);
          // "two"
  */
__js exports.getPath = function(subject, path, defaultValue) {
  var hasDefault = (arguments.length == 3);
  var parts = Array.isArray(path) ? path : path.split(".");
  
  if (!parts.length || parts.length === 1 && parts[0] === '')
    return subject;

  try {
    if (hasDefault) {
      for (var i=0; i<parts.length; i++) {
        subject = exports.get(subject, parts[i], sentinel);
        if (subject === sentinel) return defaultValue;
      }
    } else {
      for (var i=0; i<parts.length; i++) {
        subject = exports.get(subject, parts[i]);
      }
    }
  } catch(e) {
    throw new Error("#{e.message} (traversing: #{path})");
  }
  return subject;
};

/**
    @function setPath
    @param {Object} [subject]
    @param {String|Array} [path]
    @param {Object} [value]
    @return {Object} 
    @summary Set a nested property on an object.
    @desc
      `path` can be a dotted string (`"a.b.c"`) or
      an array of keys (`['a','b','c']`). If `path` is an empty string, 
      `value` will be returned, otherwise `subject`

      Missing parts of the path will automatically be constructed on `subject`.

      If intermediate parts of the path are not of object type, an exception will be thrown.

      ### Example:

          var o = {parent: {child: {name: "bob" } } };

          o .. setPath('parent.child.name', 'alice');
          // {parent: {child: {name: "alice"}}}
          
          o .. setPath(['parent', 'child', 'name'], 'alice');
          // {parent: {child: {name: "alice"}}}
          
          o .. setPath('', 'alice');
          // 'alice'
          
          o .. setPath('parent.sibling.name', "eve");
          // {parent: {child: {name: "bob"}, sibling: {name: "eve"}}}
          
  */
__js  exports.setPath = function(subject, path, value) {
  var parts = Array.isArray(path) ? path : path.split(".");
  
  if (!parts.length || parts.length === 1 && parts[0] === '')
    return value;
  var rv = subject;
  for (var i=0; i<parts.length-1; ++i) {
    if (subject[parts[i]] === undefined) {
      subject = subject[parts[i]] = {};
    }
    else {
      subject = subject[parts[i]];
      if (typeof subject !== 'object')
      throw new Error("Unexpected non-object type encountered at '#{parts[i]}' while traversing object");
    }
  }
  subject[parts[parts.length-1]] = value;
  return rv;
};

/**
  @function has
  @param {Object} [subject]
  @param {String} [prop]
  @return {Boolean}
  @summary Return whether the given object has a property named `prop`.

  @function hasOwn
  @param {Object} [subject]
  @param {String} [prop]
  @return {Boolean}
  @summary Return whether the given object has a non-inherited property named `prop`.
*/
__js exports.has = function(subject, key) { return hasProperty.call(subject, key); }
__js exports.hasOwn = function(subject, key) { return hasOwnProperty.call(subject, key); }

/**
   @function allKeys
   @param {Object} [obj]
   @return {sequence::Stream}
   @summary  Returns a [sequence::Stream] of the names of `obj`'s enumerable properties, including those defined on `obj`'s prototype chain.
   @desc
      This follows the semantics of https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in, in particular:
       If a property is modified in one iteration and then visited at a later time, its value in the loop is its value at that later time.
      
      See also [::ownKeys].
*/
function allKeys(obj) {  
  return Stream(function(r) { for (var p in obj) r(p) });
}
exports.allKeys = exports.keys = allKeys;

/**
   @function ownKeys
   @param {Object} [obj]
   @return {Array}
   @summary  Returns an array of the names of `obj`'s own enumerable properties, 
             i.e. excluding those defined on `obj`'s prototype chain.
   @desc     
       Note that you can also use the ECMA-263/5 function `Object.keys` - 
       on older JS engines StratifiedJS adds a shim to emulate this function. 

       Note that unlike [::allValues], this function returns an *array*, not a [sequence::Stream]. I.e. it is a snapshot of the state of `obj`. In particular subsequent property deletions will *not* be reflected in the array.
*/
var ownKeys = exports.ownKeys = Object.keys;

/**
  @function allValues
  @param    {Object} [obj]
  @return   {sequence::Stream}
  @summary  Returns a [sequence::Stream] of the values of `obj`'s enumerable properties,
            including those defined on `obj`'s prototype chain.
  @desc
       As for [::allKeys]: If a property is modified in one iteration and then visited at a later time, its value in the loop is its value at that later time.
      
*/
function allValues(obj) {
  return allKeys(obj) .. transform(k -> obj[k]);
}
exports.allValues = exports.values = allValues;

/**
  @function ownValues
  @param    {Object} [obj]
  @return   {Array}
  @summary  Returns an array of the values of `obj`'s enumerable properties,
            excluding those defined on `obj`'s prototype chain.
  @desc
      Note that unlike [::allValues], this function returns an *array*, not a [sequence::Stream]. I.e. it is a snapshot of the state of `obj`. In particular subsequent property deletions will *not* be reflected in the array.

*/
function ownValues(obj) {
  return ownKeys(obj) .. map(k -> obj[k]);
}
exports.ownValues = ownValues;

/**
  @function allPropertyPairs
  @param    {Object} [obj]
  @return   {sequence::Stream}
  @summary  Returns a [sequence::Stream] `[key1,val1], [key2,val2], ...` of `obj`'s 
            enumerable properties, including those defined on `obj`'s prototype chain.
  @desc
       As for [::allKeys]: If a property is modified in one iteration and then visited at a later time, its value in the loop is its value at that later time.
*/
function allPropertyPairs(obj) {
  return allKeys(obj) .. transform(k -> [k,obj[k]]);
}
exports.allPropertyPairs = exports.propertyPairs = allPropertyPairs;

/**
  @function ownPropertyPairs
  @param    {Object} [obj]
  @return   {Array}
  @summary  Returns an array `[key1,val1], [key2,val2], ...` of `obj`'s 
            enumerable properties, excluding those defined on `obj`'s prototype chain.
  @desc
      Note that unlike [::allPropertyPairs], this function returns an *array*, not a [sequence::Stream]. I.e. it is a snapshot of the state of `obj`. In particular subsequent property deletions will *not* be reflected in the array.
*/
function ownPropertyPairs(obj) {
  return ownKeys(obj) .. map(k -> [k,obj[k]]);
}
exports.ownPropertyPairs = ownPropertyPairs;

/**
   @function pairsToObject
   @altsyntax sequence .. pairsToObject([prototype])
   @param {sequence::Sequence} [sequence] Input sequence
   @param {optional Object} [prototype=null] Prototype for return object
   @summary Create an object from a [sequence::Stream] `[key1,val1],[key2,val2],...` of property pairs
*/
function pairsToObject(sequence, prototype) {
  __js if (prototype === undefined) prototype = Object.prototype;
  __js var rv = Object.create(prototype);
  sequence .. each {
    |prop|
    rv[prop[0]] = prop[1];
  }
  return rv;
}
exports.pairsToObject = pairsToObject;

/**
   @function extend
   @altsyntax dest .. extend(source)
   @param {Object} [dest] Destination Object
   @param {Object|Array} [source] Source Object(s)
   @return {Object} `dest` object
   @summary Extend `dest` with properties from the given source object
   @desc
      * Only "own" properties will be added to *dest* - i.e no
        properties inherited via prototypes will be copied.
*/
exports.extend = extendObject;

/**
   @function merge
   @param {Object|Array} [source*] Source Object(s) or Array of Objects
   @return {Object} New object with merged properties
   @summary Merge properties from the given source objects into a new object
   @desc
      * Properties from the source objects will be merged in the order that they
        appear in the argument list. I.e. properties appearing later will override
        properties appearing in objects to the left.
      * `source` can be a multiple object arguments, or a single Array argument.
      * null or undefined source objects will be ignored.
*/
exports.merge = mergeObjects;

/**
  @function clone
  @summary Shallow-clone an object or array
  @param {Object|Array} [source] Source Object or Array
  @return {Object} A new Object or Array with the same keys/values as the input.
  @desc
    The return type is a simple Object with the same keys and values - no
    prototype or class information is cloned.
    The return type when given either an Array or an `arguments` object will
    be a new Array with the same elements as `source`.
*/
__js exports.clone = function(obj) {
  if (isArrayLike(obj)) {
    return Array.prototype.slice.call(obj);
  }
  return exports.extend({}, obj);
};

/**
   @function override
   @altsyntax dest .. override(source*)
   @param {Object} [dest] Destination Object
   @param {Object|Array|undefined} [source*] Source Object(s) or Array(s) of Objects
   @return {Object} `dest` object
   @summary Override properties of `dest` with properties from the given source object(s)
   @desc
      * In contrast to [::extend], only enumerable properties on `dest` (those e.g. 
        accessible by a for-in loop) will be overridden.  No other properties from 
        `source` parameters will be be copied to `dest`.
      * Properties from the source objects will be applied in the order that they
        appear in the argument list. I.e. properties appearing later will override
        properties appearing in objects to the left.
      * `source` parameters can be arbitrarily nested arrays of objects. These will be 
        flattend before the objects contained in them will be applied to `dest`.
      * The `source` array is allowed to contain undefined or null values, which will be ignored. 
        This is to support the following pattern, where `settings` is an optional parameter:

            function foo(x, y, z, settings) {
              settings = { setting1: some_default_val_1,
                           setting2: some_default_val_2
                         } .. @override(settings);
              ...
            }

      * Note that all explicitly set elements in a `source` object will be applied as overrides,
        even if they are `null` or `undefined`. E.g. the code

            var setting = { foo: 1,
                            bar: 2
                          } .. @override({foo:undefined, bar: null});

        yields a settings object

            { foo: undefined, bar: null }
*/
exports.override = overrideObject;

/**
   @function mapValues
   @summary Create an object `{key1: f(val1), key2: f(val2), ... }` from a source object `{key1: val1, key2: val2, ...}`
   @param {Object} [obj] Source object
   @param {Function} [f] Transformation function
   @return {Object}
   @desc
      Source properties are determined by [::ownPropertyPairs], i.e. properties on `obj`'s prototype chain are
      excluded.

*/
exports.mapValues = (obj, f) -> obj .. ownPropertyPairs .. transform([k,v] -> [k,f(v)]) .. pairsToObject;

/**
   @function construct
   @deprecated Under review
   @param {Object} [proto] Prototype to inherit from
   @param {Arguments} [arguments] Arguments to pass to `_init`
   @return {Object} The newly-constructed object
   @summary Create and initialize a new object
   @desc
      This function is shorthand for the following construction pattern
      given a prototype object that has an optional `_init` initialization method:

          var rv = Object.create(proto);
          if (rv._init) rv._init.apply(rv, args);
          return rv;
*/
exports.construct = function(proto, args) {
  __js var rv = Object.create(proto);
  if (rv._init) rv._init.apply(rv, args);
  return rv;
};

/**
   @function Constructor
   @deprecated Under review
   @param {Object} [proto] Prototype to inherit from
   @return {Object} An object constructor
   @summary Create a constructor function for the given prototype.
   @desc
      
      This function builds a constructor function for the given prototype.
      The returned function can be used to construct an object without the `new` keyword.

      See [::construct] for details on how the object is created.

      ### Eample:

          var ClsProto = {};
          ClsProto._init = function(val) {
            this.value = val;
          };
          var Cls = Constructor(ClsProto);

          var instance = Cls(1);
          instance.value;
            // 1

          ObjProto.isPrototypeOf(instance);
            // true

*/
exports.Constructor = function(proto) {
  return () -> exports.construct(proto, arguments);
};

/**
   @function pick
   @summary Copy properties from an object to a new object
   @param {Object} [obj] Source object
   @param {sequence::Sequence} [props] Sequence of property names
   @desc
     ### Example:

         var A = { a: 'x', b: 'y', c: 'z' };

         B = A .. pick(['a', 'c']);
         // B is now { a: 'x', c: 'z' }
*/
exports.pick = (obj, props) -> props .. transform(p -> [p,obj[p]]) .. pairsToObject;
