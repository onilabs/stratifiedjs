/*
 * Oni Apollo 'nodejs/child-process' module
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
  @module    nodejs/child-process
  @summary   Stratified wrapper of [nodejs's child_process lib](http://nodejs.org/api/child_process.html)
  @hostenv   nodejs
  @home      sjs:nodejs/child-process
*/

if (require('builtin:apollo-sys').hostenv != 'nodejs') 
  throw new Error('The nodejs/events module only runs in a nodejs environment');

var child_process = require('child_process');

// event emitted by child processes when stdout/stderr have closed has changed in node v0.7.7:
var version = /^(\d+)\.(\d+)\.(\d+)/.exec(process.versions.node);
version = parseInt(version[1])*1000000 + parseInt(version[2])*1000 + parseInt(version[3]);
var STREAMS_CLOSED_SIGNAL = version>7006 ? 'close' : 'exit';

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
   @param {optional Object} [options] Hash of options passed to [nodejs's spawn](http://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) and to [::kill]
   @return {Object} Object with 'stdout' and 'stderr' members
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
*/
exports.run = function(command, args, options) {
  var stdout = [], stderr = [];
  function appendTo(buffer) {
    return function(data) { buffer.push(data); }
  };

  var child = exports.launch(command, args, options);
  if(child.stdout) child.stdout.on('data', appendTo(stdout));
  if(child.stderr) child.stderr.on('data', appendTo(stderr));
  function join(arr) { return arr.join(''); };

  try {
    exports.wait(child);
  } catch(e) {
    // annotate error with stdout / err info
    e.stdout = join(stdout);
    e.stderr = join(stderr);
    throw e;
  } retract {
    kill(child, options);
  }
  return {stdout: join(stdout), stderr: join(stderr)};
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
   @param {Object} [child] The child process object obtailed from `run`.
   @desc
      If the child process exits abnormally (exit code != 0), an
      `Error` will be thrown with `code` and `signal` properties set to the exit code 
      and signal that terminated the process.
*/
exports.wait = function(child) {
  waitfor(var code, signal) {
    child.on(STREAMS_CLOSED_SIGNAL, resume);
  } retract {
    child.removeListener(STREAMS_CLOSED_SIGNAL, resume);
  }
  if(code != 0) {
    var err = new Error('child process exited with nonzero exit status: ' + code);
    err.code = code;
    err.signal = signal;
    throw err;
  }
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
*/
var kill = exports.kill = function(child, options) {
  function kill() {
    if (options && options.detached) // signal the process group
      process.kill(-child.pid, options && options.killSignal);
    else // signal just the process
      child.kill(options && options.killSignal);
  }

  if(options && options.wait === false) {
    kill();
  } else {
    waitfor() {
      child.on(STREAMS_CLOSED_SIGNAL, resume);
      kill();
      hold();
    } finally {
      child.removeListener(STREAMS_CLOSED_SIGNAL, resume);
    }
  }
};

