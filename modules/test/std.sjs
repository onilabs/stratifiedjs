/**
 @require ./suite
 @require ../std
 @summary Standard test utilities
 @desc
   This module exports all symbols from the following modules:
    - [./stuite::]
    - [../std::]

   Typically, test modules will use this module as:

       @ = require('sjs:test/std');
*/
module.exports = require(['./suite', '../std']);
