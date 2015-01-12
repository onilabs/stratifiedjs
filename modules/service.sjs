/*
 * StratifiedJS 'service' module
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
   @module    service
   @summary   Structures for simple dependency injection
   @home      sjs:service
*/

var { get, extend, hasOwn, ownKeys, ownPropertyPairs } = require('./object');
var { isFunction } = require('./function');
var { transform, each, sort, join } = require('./sequence');

/**
  @class Registry
  @summary Caching service registry
  @desc
    The Registry class implements a simple service locator.
    Services can be registered by name, using:

     - [::Registry::value] for values known at definition time
     - [::Registry::lazy] for values which should be computed the first time
       they are accessed, but cached for all future accesses.
     - [::Registry::factory] for values that should be re-computed
       each time they are accessed.

    A registry can also have a parent registry. If a given
    key is not defined for the current registry, results
    from the parent registry will be used instead.

    Registry objects are also functions - calling `registry(key)` is a
    shortcut for `registry.get(key)`.

  @function Registry
  @nonew
  @param {optional ::Registry} [parent] Registry to inherit from
*/
var RegistryProto = {};

/**
  @function Registry.factory
  @param {String} [key]
  @param {Function} [fn]
  @summary Define a value that is recomputed every time it is accessed
  @desc
    Each time `get` is called for `key`, it will return the result
    of calling `fn` with this [::Registry] as the first argument.

    See also [::Registry::lazy].
*/
RegistryProto.factory = function(key, factory) {
  if (!isFunction(factory)) {
    throw new Error("Not a function: #{factory}");
  }
  this._db[key] = { factory: factory, cache: false };
};

/**
  @function Registry.value
  @param {String} [key]
  @param {Object} [value]
  @summary Define a value
  @return {Object} the value passed in
  @desc
    Future calls to `get(key)` will return `val`.

  @function Registry.set
  @param {String} [key]
  @param {Object} [value]
  @summary Alias for [::Registry::value]
*/
RegistryProto.value = RegistryProto.set = function(key, val) {
  this._db[key] = { instance: val };
  return val;
};

/**
  @function Registry.lazy
  @param {String} [key]
  @param {Function} [fn]
  @summary Define a value that is initialized the first time it is accessed
  @desc
    The first time `key` is requested, `fn` will be called
    with this [::Registry] as the first argument. The return
    value of `fn` will in turn be returned from `get`, and
    will be cached for future calls to `get` with the same `key`.

    All cached values can be deleted by calling [::Registry::clearCached],
    which will cause all lazy values on this [::Registry] to be
    recomputed the next time they are accessed.
*/
RegistryProto.lazy = function(key, factory) {
  this._db[key] = {
    factory: factory,
    cache: true,
  };
};



/**
  @function Registry.get
  @param {String} [key]
  @param {optional Object} [default]
  @summary Get the current value for a given key
  @return {Object}
  @desc
    If the value has not been defined in this registry (or a parent),
    `default` will be returned or an error thrown if no `default` given.
*/
RegistryProto._NotFound = function(key) {
  return new Error("Key '#{key}' not found in #{this}");
};

RegistryProto.get = function(key, _default) {
  var pair = this._get(key);
  if (!pair) {
    if (arguments.length > 1) return _default;
    throw this._NotFound(key);
  }

  var [owner, service] = pair;
  if (service .. hasOwn('instance')) {
    return service.instance;
  } else {
    var instance = service.factory.call(owner, owner);
    if (service.cache) service.instance = instance;
    return instance;
  }
};

RegistryProto._get = function(key) {
  if (this._has(key)) return [this, this._db[key]];
  if (this._parent) return this._parent._get(key);
};

/* like _has, but this instance only - no inherited keys from _parent */
RegistryProto._has = function(key) {
  return this._db .. hasOwn(key);
};

/**
  @function Registry.has
  @param {String} [key]
  @summary Return whether a key is defined
  @return {Boolean}
  @desc
    Returns `true` if the value is defined in this registry (or a parent),
    `false` otherwise.
*/
RegistryProto.has = function(key) {
  return Boolean(this._get(key));
};

/**
  @function Registry.hasCached
  @param {String} [key]
  @summary Return whether a lazy value has been cached
  @return {Boolean}
  @desc
    Returns `true` if the key is defined as a [::Registry::lazy], and its
    value has already been generated.
*/
RegistryProto.hasCached = function(key) {
  var pair = this._get(key);
  if(pair) {
    var service = pair[1];
    return service .. hasOwn('factory') && service .. hasOwn('instance');
  }
  return false;
};

/**
  @function Registry.clearCached
  @summary Delete cached [::Registry::lazy] results from this [::Registry]
  @param {optional Array|String} [keys] Clear specific keys
  @desc
    If `keys` is specified (as either a String or an Array of Strings), those
    specific keys are cleared (whether they appear in this registry or a parent).

    It is an error to give a key which is not defined, however it is _not_
    an error if the given key is not actually `lazy`, or has not been generated.
    
    Otherwise, all cached value defined _on this specific registry_ (not a parent)
    will be cleared.

    **Note**: This function does not affect cached values in parent registries.
*/
RegistryProto.clearCached = function(keys) {
  if(!keys) {
    keys = this._db .. ownKeys; // .. each {|[key, val]|
  } else {
    if (!Array.isArray(keys)) keys = [keys];
  }
  keys .. each {|key|
    var val = this._get(key);
    if(!val) throw this._NotFound(key);
    val = val[1];
    if (val .. hasOwn('factory')) {
      delete val.instance;
    }
  };
};

RegistryProto.toString = function() {
  var keys = this._db .. ownKeys .. sort .. join(',');
  var additional = this._parent ? " (has parent)" : "";
  return "<#Registry: #{keys}#{additional}>";
};

exports.Registry = function(parent) {
  var rv = function() { return rv.get.apply(rv, arguments); };
  rv .. extend(RegistryProto);
  rv._db = {};
  rv._parent = parent;
  return rv;
};
