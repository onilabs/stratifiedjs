/*
 * Oni Apollo 'node-events' module
 * Stratified wrapper for nodejs events
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2011 Oni Labs, http://onilabs.com
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
  @module    node-child-process
  @summary   Stratified wrapper of nodejs's child_process lib
  @hostenv   nodejs
*/

if (require('sjs:apollo-sys').hostenv != 'nodejs') 
  throw new Error('node-events only runs in a nodejs environment');

var child_process = require('child_process');

/**
   @function exec
   @summary Execute a child process and return output
   @param {String} [command] Command to execute
   @param {Object} [optional options] Hash of options (see nodejs's child-process.exec docs) 
   @return {Object} Object with 'stdout' and 'stderr' members
*/
exports.exec = function(command, options) {
  waitfor(var err, stdout, stderr) {
    var child = child_process.exec(command, options, resume);
  }
  retract {
    // XXX support signals other than SIGTERM
    child.kill();
  }
  if (err) throw err;
  return { stdout: stdout, stderr: stderr };
};

