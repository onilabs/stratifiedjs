var { Constructor, hasOwn, ownKeys, ownPropertyPairs } = require('./object');
var { seq, isFunction } = require('./function');
var { each, sort, join } = require('./sequence');

/**
  @class Registry
  @summary Caching service registry
  @desc
    The Registry class implements a simple service locator.
    Services can be registered by name, using:

     - [::value] for values known at definition time
     - [::lazy] for values which should be computed the first time
       they are accessed, but cached for all future accesses.
     - [::factory] for values that should be re-computed
       each time they are accessed.

    A registry cal also have a parent registry. If a given
    key is not defined for the current registry, results
    from the parent registry will be used instead.

  @function Registry
  @nonew
  @param {optional ::Registry} [parent] Registry to inherit from
*/
var RegistryProto = {};
RegistryProto._init = function(parent){
  this._db = {};
  this._parent = parent;
};

/**
  @function Registry.factory
  @param {String} [key]
  @summary Define a value that is recomputed every time it is accessed
  @desc
    Each time `get` is called for `key`, it will return the result
    of calling `fn` with this [::Registry] as the first argument.

    See also [::lazy].
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
  @desc
    Future calls to `get(key)` will return `val`.
*/
RegistryProto.value = function(key, val) {
  this._db[key] = { instance: val };
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

    All cached values can be deleted by calling [::clearCached],
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
  @summary Get the current value for a given key
  @return {Object}
  @desc
    If the value has not been defined in this registry (or a parent),
    an error will be thrown.
*/
RegistryProto.get = function(key) {
  if (!this.has(key)) {
    throw new Error("Key '#{key}' not found in #{this}");
  }
  if (this._has(key)) {
    var service = this._db[key];
    if (!service .. hasOwn('instance')) {
      var instance = service.factory(this);
      if (service.cache) {
        service.instance = instance;
      }
      return instance;
    }
    return service.instance;
  }
  return this._parent.get(key);
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
  if (this._has(key)) return true;
  if (this._parent) return this._parent.has(key);
  return false;
};

/**
  @function Registry.clearCached
  @summary Delete all cached [::lazy] results from this [::Registry]
  @desc
    **Note**: This function does not affect cached values in parent registries.
*/
RegistryProto.clearCached = function() {
  this._db .. ownPropertyPairs .. each {|[key, val]|
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

exports.Registry = Constructor(RegistryProto);
