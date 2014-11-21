/*
 * StratifiedJS 'nodejs/child-process' module
 * Stratified wrapper for nodejs events
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
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
  @module    nodejs/child-process
  @summary   Stratified wrapper of [nodejs's child_process lib](http://nodejs.org/api/child_process.html)
  @hostenv   nodejs
  @home      sjs:nodejs/child-process
*/

if (require('builtin:apollo-sys').hostenv != 'nodejs')
  throw new Error('The nodejs/child-process module only runs in a nodejs environment');

var child_process = require('child_process');
var array = require('../array');

var version = process.versions.node.split('.').map(n -> parseInt(n, 10));

// event emitted by child processes when stdout/stderr have closed has changed in node v0.7.7:
var STREAMS_CLOSED_SIGNAL = array.cmp(version, [0,7,7]) >= 0 ? 'close' : 'exit';

// support for detached processes was added in v0.7.10:
var SUPPORTS_DETACHED = array.cmp(version, [0,7,10]) >= 0;

// returning a value from `kill` was added in 0.8
var KILL_RETURNS_RESULT = array.cmp(version, [0,8]) >= 0;

/**
   @function exec
   @summary Execute a child process and return output
   @deprecated Use [::run] instead
   @param {String} [command] Command to execute
   @param {optional Object} [options] Hash of options (see nodejs's child-process.exec docs)
   @return {Object} Object with 'stdout' and 'stderr' members
   @desc
      If the child process exits abnormally (exit code != 0), an
      `Error` will be thrown with `code` and `status` signal set to
      the exit code and signal that terminated the process (if any).
      Upon `retract`, the child process will be killed (with SIGTERM).
*/
exports.exec = function(command, options) {
  waitfor(var err, stdout, stderr) {
    var child = child_process.exec(command, options, resume);
  }
  retract {
    kill(child);
  }
  if (err) throw err;
  return { stdout: stdout, stderr: stderr };
};


/**
   @function run
   @summary Execute a child process and return output
   @param {String} [command] Command to execute
   @param {optional Array} [args] Array of command-line arguments
   @param {optional Settings} [options] Hash of options passed to [nodejs's spawn](http://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options), to [::kill] and to [::wait]
   @setting {String} [encoding] Encoding of stdout / stderr data
   @return {Object} Object with 'stdout' and 'stderr' members (both Strings)
   @desc
      This function is just like the deprecated [::exec], but takes an
      array of arguments instead of a string. This has a number of
      advantages:

      * arguments containing whitespace are not interpreted as
        multiple arguments.

      * No subshell is executed; the specified file is executed directly.
      
      * Options (such as 'detached' - see below) can be passed to 
        [nodejs's spawn](http://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options)

      When the command fails, any `stderr` and `stdout` output that was captured so far is
      added to the exception thrown (accessible by the `stderr` and `stdout` properties).

      Upon retraction, the child process will be killed with the
      `killSignal` specified in the options ('SIGTERM' by default), using [::kill].

      Note that the `options` hash are used as options to [nodejs's spawn](http://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options)
      function, *not* to nodejs's `execFile`.

      ### Usage Note

      It is often a good idea to run external programs as a *process group*, rather than a 
      process. In this way, when we need to terminate a program, we can send a kill to the 
      process group, rather than just the process, and any sub-processes spawned by the 
      program will also be terminated. See also this [nodejs google group post](https://groups.google.com/d/topic/nodejs/-8fwv9ZjlvQ/discussion).

      To run as a process group, specify `{ detached: true }` in the `options`. Retraction
      will automatically cause the process group rather than just the process to be
      terminated, e.g.:

          // Abort 'my_program' and any sub-processes if not finished within
          // 10 seconds:
          waitfor {
            child_process.run('my_program', [], { detached: true, killSignal: 'SIGKILL' });
          }
          or {
            hold(10000);
          }

      **NOTE**: `detached` is not supported in nodejs v0.6 and earlier.
*/
exports.run = function(command, args, options) {
  var stdout = [], stderr = [];
  if(!options) options = {};
  function appendTo(buffer) {
    return function(data) { buffer.push(data); }
  };

  var child = exports.launch(command, args, options);
  var collect = function(stream, dest) {
    if(!stream) return;
    stream.setEncoding(options.encoding || 'utf-8');
    stream.on('data', appendTo(dest));
  };
  collect(child.stdout, stdout);
  collect(child.stderr, stderr);
  function join(arr) { return arr.join(''); };

  try {
    exports.wait(child, options);
  } catch(e) {
    // annotate error with stdout / err info
    e.stdout = join(stdout);
    e.stderr = join(stderr);
    throw e;
  } retract {
    kill(child, options);
  }
  return {stdout: join(stdout), stderr: join(stderr), code: child.code, signal: child.signal};
};

//TODO is `launch` too similar to `run`? maybe `popen` or even `fork`?
/**
   @function launch
   @summary Launch a child process
   @param {String} [command] Command to launch
   @param {optional Array} [args] Array of command-line arguments
   @param {optional Object} [options] Hash of options (see nodejs's child-process.spawn docs)
   @return {Object} [ ] [nodejs ChildProcess](http://nodejs.org/api/child_process.html#child_process_class_childprocess)
   @desc
     This function wraps the `spawn` function of node's child_process module, but
     is called `launch` to avoid confusion with the SJS `spawn` construct.

     The returned process will not yet have started - you will typically want to set
     up event handlers on the child and then call `wait(child)`.
*/
exports.launch = function(command, args, options) {
  return child_process['spawn'](command, args, options);
};

/**
   @function wait
   @summary Wait for a child process to finish
   @param {Object} [child] The child process object obtained from `run`.
   @param {Settings} [opts] settings
   @return {Object} The child process object passed in.
   @setting {Boolean} [throwing=true] Set to `false` to suppress the default error-throwing behaviour when the child is unsuccessful
   @desc
      `wait` (upon the child's completion) will set `child.code` and `child.signal`.

      If the child process exits abnormally (exit code != 0) and If `opts.throwing` is not `false`, an
      `Error` will be thrown with `code` and `signal` properties set to the exit code
      and signal that terminated the process. Otherwise (when `opts.throwing` is `false`),
      the `child` object will be returned.
*/
exports.wait = function(child, opts) {
  var code, signal, error;
  waitfor {
    waitfor(code, signal) {
      child.on(STREAMS_CLOSED_SIGNAL, resume);
    } retract {
      child.removeListener(STREAMS_CLOSED_SIGNAL, resume);
    }
  } or {
    waitfor(error) {
      child.on('error', resume);
    } retract {
      child.removeListener('error', resume);
    }
  }
  if(error !== undefined) {
    throw error;
  }
  child.code = code;
  child.signal = signal;
  if (opts && opts.throwing === false) {
    return child;
  } else if(code != 0) {
    var err = new Error('child process exited with nonzero exit status: ' + code);
    err.code = code;
    err.signal = signal;
    throw err;
  }
  return child;
};

/**
   @function kill
   @summary Kill a child process
   @param {Object} [child] The child process object obtailed from `run`.
   @param {optional Object} [settings] Hash of options
   @setting {String} [killSignal='SIGTERM'] Signal used to kill the process
   @setting {Boolean} [wait=false] Whether to return immediately or 
            wait for the process to have actually ended
   @setting {Boolean} [detached=false] If `true`, the process to be killed is assumed to be
                      a process group leader, and the process group will be killed instead
                      of just the process.
   @desc
     If `wait` is true and the process is not currently running, no kill is performed - this
     function returns immediately.
*/
var kill = exports.kill = function(child, options) {
  function kill() {
    if (SUPPORTS_DETACHED && options && options.detached) // signal the process group
      process.kill(-child.pid, options && options.killSignal);
    else // signal just the process
      child.kill(options && options.killSignal);
  }

  if(options && options.wait === false) {
    kill();
  } else {
    if (KILL_RETURNS_RESULT && !child .. isRunning()) return;
    waitfor() {
      child.on(STREAMS_CLOSED_SIGNAL, resume);
      kill();
    } finally {
      child.removeListener(STREAMS_CLOSED_SIGNAL, resume);
    }
  }
};

/**
  @function isRunning
  @summary Check whether the given process is running
  @return {Boolean}
  @param {Object|Number} [child|pid]
*/
var isRunning = exports.isRunning = function() {
  if (!KILL_RETURNS_RESULT) return function() {
    throw new Error("isRunning() requires nodejs version 0.8 or greater");
  };
  return function(child) {
    var pid = typeof(child) === 'object' ? child.pid : child;
    if (pid == null) throw new Error("invalid PID");
    try {
      return process.kill(pid, 0);
    } catch(e) {
      if (e.code === 'EPERM') return true;
      if (e.code == 'ESRCH') return false;
      throw e;
    }
  };
}();
