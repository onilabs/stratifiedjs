/*
 * StratifiedJS 'lru-cache' module
 * Least Recently Used Cache
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2012 Oni Labs, http://onilabs.com
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
   @module  lru-cache
   @summary Least Recently Used Cache
   @home    sjs:lru-cache
*/

/**
   @class   Cache
   @summary LRU Cache Class
   @desc
     Use function [::makeCache] to create a new Cache instance
*/

function Cache() {};
var CacheProto = Cache.prototype = {};

/**
   @function makeCache
   @summary  Construct an initialized [::Cache] object
   @param {Number} [maxsize] Maximum size to which the cache is allowed to grow before items
                             will be disposed
*/
exports.makeCache = function(maxsize) {
  var obj = new Cache();
  obj.init(maxsize);
  return obj;
};


/**
   @function Cache.init
   @summary  (Re-)Initialize this [::Cache] instance
   @param {Number} [maxsize] Maximum size to which the cache is allowed to grow before items
                             will be disposed
   @desc
     [::makeCache] implicitly calls this method.
*/
CacheProto.init = function(maxsize) {
  this.maxsize = maxsize;
  this.clear();
};

var keyPrefix = "_";

/**
   @function Cache.clear
   @summary  Dispose of all elements in the cache
*/
CacheProto.clear = function() {
  this.size = 0;
  this.index = {};
  // init with a dummy node, so that we need fewer edge case checks
  this.lru = this.mru = { 
    key: "sentinel", // note: deliberately no prefix here
    size: 0
  };
};

/**
   @function Cache.put
   @summary  Put an item into the cache
   @param    {String} [key]
   @param    {Object} [value]
   @param    {optional Number} [size=1]
   @desc
     * Will discard least recently used items if the new item causes the cache to overrun its `maxsize`.
     * If the item's size is larger than the cache's `maxsize`, the item will not be put into
       the cache, and the cache content will not be modified.
*/
CacheProto.put = function(key, value, size) {
  if (size === undefined) size = 1;
  if (size > this.maxsize) return; // cache too small for this item

  // we give the key a prefix to avoid aliasing with any object properties:
  key = keyPrefix + key;
  var entry = { key: key, value: value, size: size };

  this.index[key] = entry;

  entry.older = this.mru;
  this.mru = this.mru.younger = entry;

  this.size += size;

  // discard items from cache until we get down to size
  while (this.size > this.maxsize) {
    this.size -= this.lru.size;
    delete this.index[this.lru.key]; // this is benign when deleting the sentinel
    this.lru.younger.older = undefined;
    this.lru = this.lru.younger;
  }
};

/**
   @function Cache.get
   @summary Retrieve item for the given key
   @param {String} [key]
   @return {Object | null}
   @desc
     * Returns `null` if the cache doesn't contain an item for the given key.
     * Otherwise, if an item for the key is found, the item will be moved into 
       the 'most recently used' position and returned.
*/
CacheProto.get = function(key) {
  key = keyPrefix + key;
  var entry = this.index[key];
  if (!entry) return null;
  
  // entry is now the most-recently used item:
  if (entry !== this.mru) {
    // splice out of linked list:
    if (entry !== this.lru)
      entry.older.younger = entry.younger;
    else {
      this.lru = entry.younger;
      entry.younger.older = undefined;
    }
    entry.younger.older = entry.older;
    // and insert as mru:
    entry.older = this.mru;
    this.mru = this.mru.younger = entry;
  }

  return entry.value;
};

/**
   @function Cache.discard
   @summary Removes an item from the cache
   @param {String} [key] Item to remove
   @return {Boolean} `true` if the item was removed; `false` if the item was not found
*/
CacheProto.discard = function(key) {
  key = keyPrefix + key;
  var entry = this.index[key];
  if (!entry) return false;

  this.size -= entry.size;
  delete this.index[key];

  // splice out of linked list:
  if (entry === this.lru) {
    if (entry === this.mru) {
      // we've delete the last item in the cache; reinitialize with sentinel:
      this.lru = this.mru = { 
        key: "sentinel", // note: deliberately no prefix here
        size: 0
      };
    }
    else {
      this.lru = entry.younger;
      entry.younger.older = undefined;
    }
  }
  else if (entry === this.mru) {
    entry.older.younger = undefined;
    this.mru = entry.older;
  }
  else {
    entry.older.younger = entry.younger;
    entry.younger.older = entry.older;
  }
  return true;
};