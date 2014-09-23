/*
 * StratifiedJS 'object' module
 * Functions for working with objects
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013 Oni Labs, http://onilabs.com
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
*/

var { each, transform, Stream } = require('./sequence');
var { extendObject, mergeObjects, flatten, isArrayLike } = require('builtin:apollo-sys');

var hasProperty = function(k) { return k in this; }
var hasOwnProperty = Object.prototype.hasOwnProperty;

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
__js  exports.getPath = function(subject, path, defaultValue) {
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
exports.has = function(subject, key) { return hasProperty.call(subject, key); }
exports.hasOwn = function(subject, key) { return hasOwnProperty.call(subject, key); }

/**
   @function keys
   @param {Object} [obj]
   @return {sequence::Stream}
   @summary  Returns a [sequence::Stream] of the names of `obj`'s enumerable properties, including those defined on `obj`'s prototype chain.
   @desc     
      See also [::ownKeys].
*/
function keys(obj) {  
  return Stream(function(r) { for (var p in obj) r(p) });
}
exports.keys = keys;

/**
   @function ownKeys
   @param {Object} [obj]
   @return {sequence::Stream}
   @summary  Returns a [sequence::Stream] of the names of `obj`'s own enumerable properties, 
             i.e. excluding those defined on `obj`'s prototype chain.
   @desc     
       Note that you can also use the ECMA-263/5 function `Object.keys` - 
       on older JS engines StratifiedJS adds a shim to emulate this function. 

       See also [::keys].
*/
var ownKeys = exports.ownKeys = Object.keys;

/**
  @function values
  @param    {Object} [obj]
  @return   {sequence::Stream}
  @summary  Returns a [sequence::Stream] of the values of `obj`'s enumerable properties,
            including those defined on `obj`'s prototype chain.
*/
function values(obj) {
  return keys(obj) .. transform(k => obj[k]);
}
exports.values = values;

/**
  @function ownValues
  @param    {Object} [obj]
  @return   {sequence::Stream}
  @summary  Returns a [sequence::Stream] of the values of `obj`'s enumerable properties,
            excluding those defined on `obj`'s prototype chain.
*/
function ownValues(obj) {
  return ownKeys(obj) .. transform(k => obj[k]);
}
exports.ownValues = ownValues;

/**
  @function propertyPairs
  @param    {Object} [obj]
  @return   {sequence::Stream}
  @summary  Returns a [sequence::Stream] `[key1,val1], [key2,val2], ...` of `obj`'s 
            enumerable properties, including those defined on `obj`'s prototype chain.
*/
function propertyPairs(obj) {
  return keys(obj) .. transform(k => [k,obj[k]]);
}
exports.propertyPairs = propertyPairs;

/**
  @function ownPropertyPairs
  @param    {Object} [obj]
  @return   {sequence::Stream}
  @summary  Returns a [sequence::Stream] `[key1,val1], [key2,val2], ...` of `obj`'s 
            enumerable properties, excluding those defined on `obj`'s prototype chain.
*/
function ownPropertyPairs(obj) {
  return ownKeys(obj) .. transform(k => [k,obj[k]]);
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
  if (prototype === undefined) prototype = Object.prototype;
  var rv = Object.create(prototype);
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
      * `source` is allowed to contain undefined or null values, which will be ignored. 
        This is to support the following pattern, where `settings` is an optional parameter:

            function foo(x, y, z, settings) {
              settings = { setting1: some_default_val_1,
                           setting2: some_default_val_2
                         } .. @override(settings);
              ...
            }
*/
__js exports.override = function(/*dest, source...*/) {
  var dest = arguments[0];
  var sources = flatten(Array.prototype.slice.call(arguments, 1));
  // strip out undefined sources:
  for (var h = sources.length-1; h>=0; --h) {
    if (sources[h] == null)
      sources.splice(h, 1);
  }
  var hl = sources.length;
  if (hl) {
    // copy values:
    for (var o in dest) {
      for (var h=hl-1; h>=0; --h) {
        var source = sources[h];
        if (o in source) {
          dest[o] = source[o];
          break;
        }
      }
    }
  }
  return dest;
};


/**
   @function construct
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
  var rv = Object.create(proto);
  if (rv._init) rv._init.apply(rv, args);
  return rv;
};

/**
   @function Constructor
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
  @function tap
  @param {Object} [object]
  @param {Function} [fn]
  @summary Call `fn` with `obj`, then return `obj`
  @desc
    Often useful for debugging, `tap` allows you to
    insert a side-effect into a chain of function calls
    without having to break them up into separate
    statements or assign termporary variables.

    ### Example:
    
        var numbers = [ 1, 2, 3, 4, 5 ]
          .. map(n -> n*n)
          .. tap(x -> console.log("Squares:", x))
          .. filter(n -> n % 2)
          .. toArray
          .. tap(x -> console.log("Odd squares:", x))

        // Squares: [ 1, 4, 9, 16, 25 ]
        // Odd squares: [ 1, 9, 25 ]
        // -> [ 1, 9, 25 ]
*/
exports.tap = (o, fn) -> (fn(o),o);
