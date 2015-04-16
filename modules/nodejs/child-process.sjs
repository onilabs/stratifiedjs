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

var isWindows = process.platform === 'win32';

var child_process = require('child_process');
@ = require(['../array', '../object', '../sequence', '../cutil', {id:'./stream', name:'stream'}]);
var array = require('../array');

var version = process.versions.node.split('.').map(n -> parseInt(n, 10));

// event emitted by child processes when stdout/stderr have closed has changed in node v0.7.7:
var STREAMS_CLOSED_SIGNAL = array.cmp(version, [0,7,7]) >= 0 ? 'close' : 'exit';

// support for detached processes was added in v0.7.10:
var SUPPORTS_DETACHED = array.cmp(version, [0,7,10]) >= 0;

// returning a value from `kill` was added in 0.8
var KILL_RETURNS_RESULT = array.cmp(version, [0,8]) >= 0;

__js var stdioGetters = exports._stdioGetters = [
  // NOTE: these *MUST* be lazy, in order to support `string` outputs
  // (which are set by mutating `stdio` just before [::run] returns)
  ['stdin', -> this.stdio[0]],
  ['stdout', -> this.stdio[1]],
  ['stderr', -> this.stdio[2]],
];

var formatCommandFailed = exports._formatCommandFailed = (code, signal, cmd) -> "child process #{cmd ? "`#{cmd}` " : ""}exited with #{signal !== null ? "signal: #{signal}" : "nonzero exit status: #{code}"}";
var setFailedCommand = function(err, cmd, args) {
  err.command = [cmd].concat(args);
  err.message = formatCommandFailed(err.code, err.signal, err.command .. @join(' '));
}
var CommandFailed = function(child) {
  var e = new Error(formatCommandFailed(child.exitCode, child.signal));
  e.childProcessFailed = true;
  e.code = child.exitCode;
  e.signal = child.signalCode;
  e.stdio = child.stdio;
  stdioGetters .. @each {|[k,g]|
    Object.defineProperty(e, k, {get: g});
  }
  return e;
};

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
   @summary Execute a child process
   @param {String} [command] Command to execute
   @param {Array} [args] Array of command-line arguments
   @param {optional Settings} [options]
   @param {optional Function} [block]
   @setting {Array|String} [stdio] Child's stdio configuration (see below for more details)
   @setting {Boolean} [throwing=true] Throw an error when the child process returns a nonzero exit status
   @setting {Boolean} [detached=false] The child will be a process group leader. (See below)
   @setting {String} [encoding="utf-8"] Encoding of stdout / stderr data when using `'string'` output
   @setting {String} [killSignal="SIGTERM"] Kill signal (on retraction)
   @setting {String} [killWait=true] Wait for child process to end after killing it
   @setting {String} [cwd] Current working directory of the child process
   @setting {Object} [env] Environment key-value pairs
   @setting {Number} [uid] User ID of the process
   @setting {Number} [gid] Group ID of the process
   @return {Object} A nodejs [ChildProcess](http://nodejs.org/api/child_process.html#child_process_class_childprocess) object with `code` and `signal` properties.
   @desc
      This function runs a child process and awaits its completion. If
      the call to `run()` is retracted, the child process is automatically killed.
      
      `run()` does not pass the command through a shell (like [::exec] does). This
      means you can pass an array of values, and don't have to worry about whitespace
      or other special characters that might be interpreted by a shell.

      If `block` is passed, the block will be run with a single argument (the child process),
      once the process has started. `run` will then wait for both `block` and the child process
      to complete, unless an error is thrown (in which case it will retract currently executing code).

      If no `block` is passed, `run` will run the child process and return once it has exited.


      ### `stdio` option:

      **Note:** The `stdio` option intentionally differs from the option of the same name in nodejs'
      [spawn function](http://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options).

      All `stdio` options supported by the underlying nodeJS `spawn` function are
      supported. In addition, each `stdio` value can be:

       - `'pipe'`:
        If `block` is given, create a pipe between the child process and the parent process.
        The parent end of the pipe is exposed to the parent as a property on the child_process object as ChildProcess.stdio[fd]. Pipes created for fds 0 - 2 are also available as ChildProcess.stdin, ChildProcess.stdout and ChildProcess.stderr, respectively.
        If no `block` is given, this acts just like `'string'`.
       - `'buffer'` (for anything but `stdin`): Accumulate all output in a Buffer.
       - `'string'` (for anything but `stdin`): Capture all output in a String.
         If you do not provide an `encoding` option, utf-8 is assumed.
       - `'ignore'`: Do not set this file descriptor in the child. For file descriptors 0-2 (stdio),
         this will attach the relevant descriptor to /dev/null.
       - a nodejs `Stream`: Share a readable or writable stream that refers to a tty, file, socket, or a pipe
         with the child process. Note that the stream must have an underlying descriptor.
       - a positive integer: The integer value is interpreted as a file descriptor that is is currently
         open in the parent process.
       - `null`, `undefined`: Use default value. This is `'pipe'` for `stdin`, `'inherit'` for
         `stdout` and `stderr`, and `'ignore'` for all other FDs.
       - a [sequence::Stream] (`stdin` only): The contents of the stream will be
         piped into the process' stdin.
       - `'ipc'`: See [the nodejs documentation](http://nodejs.org/api/child_process.html#child_process_options_stdio)

      The `'string'` and `'buffer'` options store the entire output in memory,
      so you should only use them when you are confident the output will
      safely fit in memory.

      The following shorthands are supported:

       - `'string'`: `['pipe','string','inherit']`
       - `'buffer'`: `['pipe','buffer','inherit']`
       - `'pipe'`: `['pipe','pipe','inherit']`
       - `'ignore'`: `['ignore','ignore','ignore']`
       - `'quiet'`: `['ignore','ignore','inherit']`
       - `'inherit'`: `['inherit','inherit','inherit']`
       - `undefined` or `null`: `['pipe','inherit','inherit']` if `block` is
         provided, otherwise `['pipe','pipe','pipe']` for backwards compatibility.

      Unlike the nodejs `spawn` function, most of the shorthands above
      default stderr to `'inherit'`. This is a conscious effort to limit the circumstances
      in which a command fails and nobody knows why, because its `stderr` is discarded.

      If you wish to access `stderr` programmatically, you must explicitly pass an array
      including `'pipe'`, `'string'`, etc  as the third element.

      ### `'pipe'` IO when no `block` is given:

      When `block` is not supplied, any `'pipe'` element in `stdio` (aside from `stdin`) is
      treated as if it were `'string'`. This may be surprising, but there are two good
      reasons for it:

       - It's backwards compatible - this is what StratifiedJS versions prior to 0.20 did implicitly,
         before the introduction of the `block` argument (and the `'string'` stdio option).
       - Actually using a `pipe` in these situations is useless, because you won't be able to
         read any data from the pipe after the command has finished.

      ### `'string'` and `'buffer'` IO when `block` is given:
      
      Note that the `string` and `buffer` output values accumulate the entire
      output of the given stream. For this reason, they will not be set until
      the process has ended. For any `stdio` values
      set to `'string'` or `'buffer'`, you should not rely on their
      value being set until [::run] returns.

      ### Warning: you must consume `'pipe'` outputs _immediately_:

      Due to [a bug in nodejs](https://github.com/joyent/node/issues/6595), you must
      consume data from readable pipes immediately when passing a block to `run`.

      As a general rule, you should do one of the following to each output
      stream at the start of `block`:

       - pass the stream to [./stream::contents]
       - attach the stream to another process' `stdin` (or some other method which
         consumes the underlying file descriptor)

      If you're consuming a stream in another way, you must be careful not to
      apply back-pressure to the stream, as `nodejs` may drop data instead of
      delaying its delivery.

      ### Failed commands:

      When the command fails or is killed by a signal (and `throwing` is true), an exception will be thrown.
      The child's `stdio`, `stdin`, `stdout`, `stderr`, `signal` and `code` properties will be copied
      to the error object for your inspection.

      Upon retraction (unless `settings.kill` is false), the child process will be killed with the
      `killSignal` specified in the options ('SIGTERM' by default), using [::kill].

      Note that the `options` hash is passed to [nodejs's spawn](http://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options)
      function, *not* to nodejs's `execFile`.

      ### Process groups:

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
var readString = function(encoding) {
  return function(stream, dest) {
    var rv = [];
    try {
      stream .. @stream.contents(encoding) .. @each(chunk -> rv.push(chunk));
    } finally {
      // Write whatever we've collected, so that we still get partial output on error.
      dest.push(encoding ? rv.join('') : Buffer.concat(rv));
    }
  }
};
var pumpFrom = contents -> stream -> contents .. @stream.pump(stream);
var stdioMap = ['stdin','stdout','stderr'];

var _processStdio = exports._processStdio = function(options, block) {
  var stdio = options.stdio;
  var stdioConversions = [];
  if(Array.isArray(stdio)) {
    stdio = stdio.slice(); // we mutate `stdio`, so clone it
  } else {
    if(stdio == 'inherit') {
      stdio = [0,1,2];
    } else {
      switch(stdio) {
        case 'string':
          stdio = [null, 'string', 'inherit'];
          break;
        case 'buffer':
          stdio = [null, 'buffer', 'inherit'];
          break;
        case 'pipe':
          stdio = ['pipe', 'pipe', 'inherit'];
          break;
        case 'ignore':
          stdio = ['ignore', 'ignore', 'ignore'];
          break;
        case 'quiet':
          stdio = ['ignore', 'ignore', 'inherit'];
          break;
        case undefined:
        case null:
          stdio = [null, null, null];
          break;
        default:
          throw new Error("Unknown `stdio` option: #{stdio}");
      }
    }
  }

  // some stdio options we support aren't known to `nodejs`, so
  // we replace them with a dumb `pipe` and perform conversions in parallel
  // with the child process execution.
  stdio .. @indexed .. @each {|[i, io]|
    if(@isStream(io)) {
      if(i !== 0) throw new Error("Input streams are only supported for `stdin`");
      stdioConversions.push([i, pumpFrom(io)]);
      stdio[i] = 'pipe';
    } else if (io === 'inherit') {
      stdio[i] = i;
    } else if (io === 'string' || ((io === 'pipe' || io == null) && !block && i > 0)) {
      // NOTE: whenever we have a `pipe` output (which is the default for FDS 1 & 2) and
      // we don't have a block, treat it as if we specified `string`.
      //
      // Not only is it useless to specify a `pipe` without a block (you won't see
      // any output), it also happens to be backwards-compatible with SJS<0.20.
      if(i === 0) throw new Error("'string' is not supported for stdin");
      stdioConversions.push([i, readString(options.encoding || 'utf-8')]);
      stdio[i] = 'pipe';
    } else if (io === 'buffer') {
      if(i === 0) throw new Error("'buffer' is not supported for stdin");
      stdioConversions.push([i, readString()]);
      stdio[i] = 'pipe';
    }
  }
  // apply defaults for null / undefined
  if(stdio[0] == null) stdio[0] = 'pipe';
  if(stdio[1] == null) stdio[1] = 1;
  if(stdio[2] == null) stdio[2] = 2;
  return {
    stdio: stdio,
    conversions: stdioConversions,
  };
}

exports.run = function(command, args, options, block) {
  if(!@isArrayLike(args)) {
    // shift options / block
    block = options;
    options = args;
    args = [];
  }
  if(typeof(options) === 'function') {
    // shift `block`
    block = options;
    options = null;
  }
  options = options ? options .. @clone() : {};

  // XXX these defaults may be surprising, but they match the
  // old `run` API which accepted no block.

  if(!block && !options.stdio) {
    options.stdio = ['pipe', 'pipe', 'pipe'];
  }

  var { stdio, conversions: stdioConversions } = _processStdio(options, block);

  options.stdio = stdio;
  options.kill = true;
  options.exitEvent = 'exit'; // don't wait for 'close', as that may never occur
  // in pipeline scenarios (and we're already doing the necessary work to make sure streams
  // are fully consumed before returning or throwing)
  var stdioReplacements = [];

  var child = exports.launch(command, args, options);
  // Add a flag which is used by sjs:stream/contents to workaround
  // https://github.com/joyent/node/issues/6595
  // XXX should we do this for _all_ readable streams, not just stdio?
  [child.stdout, child.stderr] .. @each {|child|
    if(child && child.read) {
      child.__oni_must_read_immediately = true;
    }
  };

  // On failure, it can be hard to know which error to report. The priority (lowest to highest) is:
  //  - Write failures (to stdin)
  //  - Command failure
  //  - Other IO conversion failure
  //  - Exception thrown from block
  // This _usually_ ends up with the most useful error being reported
  var err, ioErr, abort = @Condition();
  waitfor {
    if(block) {
      // we use an explicit `abort` condition here because we only want to retract
      // when an error is pending, and not just when the process completes.
      waitfor {
        block(child);
      } or {
        abort.wait();
      }
    }
  } and {
    waitfor {
      try {
        exports.wait(child, options);
      } catch(e) {
        if(!err) err = e;
        abort.set();
        // don't throw immediately; wait for stdio conversions to complete
      }
    } and {
      if(stdioConversions.length > 0) {
        var stdioLoop = -> @waitforAll(function([i, conv]) {
          var dest = [i];
          try {
            var rv = conv(child.stdio[i], dest);
          } catch(e) {
            if(i === 0 && (e.code === 'ECONNRESET' || e.code === 'EPIPE')) {
              // fix stdin write failure, because the default message is useless
              // (see https://github.com/joyent/node/issues/6043)
              e.message = "Failed writing to child process `stdin`";
              ioErr = e;
            } else {
              err = e;
            }
            if(!abort.isSet) {
              // if the child hasn't died yet, kill it to prevent deadlocks
              // (e.g. waiting for a process that is waiting for (failed) input)
              exports.kill(child, options .. @merge({wait:false}));
            }
            abort.set();
          } finally {
            if(dest[1] !== undefined) {
              stdioReplacements.push(dest);
            }
          }
        }, stdioConversions);
        if(isWindows) {
          // Windows doesn't always close a pipe when the process fails, so
          // we can't rely on this ever terminating. Retract stream collection
          // if the process fails.
          waitfor {
            abort.wait();
          } or {
            stdioLoop();
          }
        } else stdioLoop();
      }
    }
  } finally {
    stdioReplacements .. @each {|[i, v]|
      child.stdio[i] = v;
    }
  }

  stdioGetters .. @each {|[k, get]|
    child[k] = get.call(child);
  }

  if(err) {
    if(err.childProcessFailed) {
      // annotate error with additional info
      setFailedCommand(err, command, args);
      // special affordance for old-style ['pipe','pipe','pipe'] stdio settings,
      // we'll end up with `stderr` as a String, and nobody looks at it.
      // Include it in the error message:
      if(typeof(child.stderr) === 'string') err.message += "\n#{child.stderr}"
    }
    throw err;
  }
  if(ioErr) throw ioErr
  return child;
};

/**
   @function launch
   @summary Launch a child process
   @param {String} [command] Command to launch
   @param {optional Array} [args] Array of command-line arguments
   @param {optional Object} [options] Hash of options (see nodejs's child-process.spawn docs)
   @return {Object} [ ] [nodejs ChildProcess](http://nodejs.org/api/child_process.html#child_process_class_childprocess)
   @desc
     Unless you are doing something very advanced, you should generally use [::run] instead.

     This function simply wraps the `spawn` function of node's child_process module, but
     is called `launch` to avoid confusion with the SJS `spawn` construct.

     Any options to [::run] which differ from the underlying nodejs `child_process`
     module will not be supported by this function.

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
   @setting {Boolean} [kill=false] Kill the process if the call to `wait()` is retracted
   @setting {String} [killSignal="SIGTERM"] passed to [::kill] if the `kill` option is true
   @setting {Boolean} [killWait=true] wait for process to end after killing
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
  if(!opts) opts = {};
  var code, signal, error;
  var event = opts.exitEvent || STREAMS_CLOSED_SIGNAL; // NOTE: undocumented, used internally
  try {
    waitfor {
      waitfor(code, signal) {
        child.on(event, resume);
      } retract {
        child.removeListener(event, resume);
      }
      child.code = code;
      child.signal = signal;
    } or {
      waitfor(error) {
        child.on('error', resume);
      } retract {
        child.removeListener('error', resume);
      }
    }
  } retract {
    if(opts.kill) {
      exports.kill(child, opts .. @merge({wait: opts.killWait}));
    }
  }
  if(error !== undefined) {
    throw error;
  }
  if (opts.throwing === false) {
    return child;
  } else if(code != 0) {
    throw CommandFailed(child);
  }
  return child;
};

/**
   @function kill
   @summary Kill a child process
   @param {Object} [child] The child process object obtailed from `run`.
   @param {optional Object} [settings] Hash of options
   @setting {String} [killSignal='SIGTERM'] Signal used to kill the process
   @setting {Boolean} [wait=true] Whether to return immediately or 
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
      child.on('exit', resume);
      kill();
    } finally {
      child.removeListener('exit', resume);
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
