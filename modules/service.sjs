/*
 * StratifiedJS 'service' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013-2016 Oni Labs, http://onilabs.com
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
   @summary   Utilities for managing services
   @inlibrary sjs:std
   @inlibrary mho:std
   @home      sjs:service
*/
'use strict';

@ = require([
  './string',
  './event',
  './sequence',
  './observable',
  './object',
  './cutil'
]);

/**
   @class Service
   @summary Function-as-service abstraction
   @desc
     A Service is a function of signature `function S([optional_params...], session_func)`,
     where `session_func` is a functional argument that takes one optional 
     arguments (this argument being the service's "interface").

     When invoking `S([...],session_func)`, `S` calls `session_func` to establish a "service session". `session_func` is called with a single (possibly void) argument, the "service session interface".

     The service session lasts until `session_func` exits (at which point `S` is expected to exit).
     `session_func` will typically be a [./#language/syntax::blocklambda].

     Services will typically be named "withRESOURCE" (e.g. [sjs:nodejs/http::withServer]) or 
     "runTYPESession" (e.g. 'runEditSession').

     Formally, a service `S` is expected to adhere to the following semantics:

     - Upon invocation, `S` makes exactly one call to `session_func` (after optionally blocking for initialization).
     - `S` optionally passes one argument to `session_func` (S's 'interface').
     - The lifetime of `S` is bound by `session_func`, i.e. `S` executes for as long as `session_func` executes (barring exceptional exit). 
       When `session_func` exits, `S` will exit (after optionally blocking for cleanup in `finally` clauses).
     - `S` must pass through any exceptions raised by `session_func`.
     - `session_func` has 'control flow authority' over `S`. Among other things, this means 
       that `S` cannot rely on exceptions raised from within its interface to filter 
       through calls made by `session_func`. I.e. `session_func` may catch exceptions and 
       not feed them through to the `S(session_func)` call).
     - `S` is allowed to abort `session_func`, but must throw an exception if it does so.
       See the section on 'Exceptional exit' below.
     - `S` must not subvert `session_func`'s control flow authority by using blocklambda
       break/return controlflow or non-exceptional exit of the `S(session_func)` call. See
       the section on 'Control flow subversion' below.

     ### Examples:

     - Most `"with..."` functions in the sjs/mho libs are services. E.g.: [sjs:nodejs/http::withServer],
       [sjs:sequence::withOpenStream], [sjs:sys::withEvalContext], [sjs:cutil::withBackgroundStrata],
       [sjs:service::withBackgroundServices], [sjs:service::withControlledService], [mho:websocket::withWebSocketClient].

     - A logging service that in turn uses a file writer service:

           function runLoggingSession(filename, logging_session) {
             @withFileWriter(filename) {
               |{write}|
  
               var itf = {
                 log: function(str) { write("#{new Date()}: #{str}\n"); }
               };
  
               logging_session(itf);
  
             }
           }

     ### Exceptional exit

     In general the lifetime of a service must be bound by its `session_func`. The
     service is allowed to abort `session_func`, but it must throw an exception
     if it does so. E.g.:

         function withServer(server, session) {
           waitfor {
             while (1) {
               if (!server.ping()) throw new Error("Server gone!");
               hold(1000);
             }
           }
           or {
             session({uptime: -> server.uptime()});
           }
         }

     A service may throw exceptions from its interface functions, but it must not 
     rely on those exceptions filtering through and causing `session_func` (and hence
     `S` itself) to be aborted. E.g. in the following example, `withAccumulator` will not
     get to see the exception raised by its interface, because it is caught within 
     `session_func`:
     

         function withAccumulator(session) {
           var accu = 0;
           session({
             add: function(x) { if (typeof x !== 'number') 
                                  throw 'Not a number'; 
                                accu += x;
                              }
           });
         }

         withAccumulator { |{add}|
           // try-catch here prevents the exception from filtering
           // through to accumulator
           try { add('not a number'); }catch(e) {}
         }

     If we want `withAccumulator` (instead of just `add`) to exit with an error, 
     the service could be rewritten like this:
     
         function withAccumulator(session) {
           var accu = 0, raise_error;
           waitfor {
             waitfor(var err) {
               raise_error = resume;
             }
             throw err;
           }
           or {
             session({
               add: function(x) { if (typeof x !== 'number')
                                    raise_error(new Error('Not a number');
                                  accu += x;
                                }
             });
           }
         }

     ### Control flow subversion

     A service must not 'silently' (i.e. without raising an exception) exit by
     subverting the control flow authority of `session_func`.
     E.g. in the above example, the `throw err;` line must not be omitted.
     Doing so can cause great confusion to the caller of the service.

     Additionally, blocklambda controlflow must not be used in the 
     interface functions to subvert the controlflow, because it will not work with
     services that have their interface accessed outside of their session_func (as is 
     e.g. the case when using a background service - see [::withBackgroundServices]).

     E.g., the following service would work correctly when called directly, but 
     not when called via [::withBackgroundServices]:

         function my_service(session) {
           var error_raised = false;
           session({
             error_exit: {|| error_raised=true; break;}
           });
           if (error_raised) throw new Error('exit with error');
         }
     
*/


//----------------------------------------------------------------------

/**
   @function withBackgroundServices
   @altsyntax withBackgroundServices { |itf| ... }
   @summary Creates a session for running [::Service]s in the background
   @param {Function} [session_func] Function which will be executed with a [::IBackgroundServicesSession]
   @desc
     `withBackgroundServices` is used to dynamically inject services into an existing session.

     Recall that when calling a [::Service] `S(..., session_func)`, `S` itself will call
     `session_func` to establish the session from which the service's interface is accessed. 

     Sometimes this arrangement is inconvenient, and we want to dyamically inject services into
     an __existing__ session. 

     `withBackgroundServices` is used to establish such a session, and 
     [::IBackgroundServicesSession::runService] is used to inject a service into it. Injected 
     services will have their lifetime bound by the background services session (and they can also
     be terminated 'early' through the interface returned by runService).

     As an example, a server might want to open/interact with/close a file in response to 
     asynchronous user input. Because open/close calls are not necessarily balanced, this 
     code would be different to write without withBackgroundServices:

         @withBackgroundServices { 
           |bs|

           var files = {};

           while (1) {
             var [cmd,arg] = getNextCommand();
             if (cmd === 'open') {
               files[arg] = bs.runService(withFile, arg);
             }
             else if (cmd === 'close') {
               files[arg][1]();
             }
             else if (cmd === 'show') {
               display(files[arg][0].readAll());
             }
           }
         }
*/
/**   
   @class IBackgroundServicesSession
   @summary Interface exposed by [::withBackgroundServices]

   @function IBackgroundServicesSession.runService
   @summary Inject a service into the session
   @param {::Service} [service] Service to inject
   @param {optional Objects} [...args] Arguments to provide to service
   @return {Array} Pair `[itf, terminate]` containing the service's interface `itf` and a function `terminate` for terminating the service early
   @desc
     `ibackgroundservicesession.runService` starts `service` with the given arguments and returns a pair `[itf, terminate]`.
     `itf` is the service's session interface, and `terminate` is a function that can be used
     to terminate the service's session.
     `service` will have the lifetime of its session bound to the enclosing 'background 
     services session' - if the former hasn't been terminated by the time the latter exits, 
     it will be terminated then.     
*/
function withBackgroundServices(session_f) {
  @withBackgroundStrata {
    |background_strata|
    session_f({
      runService: function(service, ...args) {
        var have_caller = true;
        var stratum;
        waitfor(var session_itf, is_err) {
          var cont = resume;
          stratum = background_strata.run {
            ||
            args.push({|itf| cont(itf, false); hold(); });
            try {
              service.apply(null, args);
            }
            catch (e) {
              if (have_caller) cont(e, true);
              else throw new Error("Background service threw: "+e);
            }
          }
        }
        retract {
          stratum.abort();
        }
        finally {
          have_caller = false;
        }
        if (is_err) throw session_itf;
        return [session_itf, 
                function /*terminate*/() { 
                  // 'true' to prevent retract clauses from being called;
                  // i.e. make it look like the inner session has exited.
                  // Not sure this is useful for anything in particular.
                  stratum.abort(true);
                }];
      }
    });
  }
}
exports.withBackgroundServices = withBackgroundServices;

//----------------------------------------------------------------------

var GLOBAL_BACKGROUND_SERVICES;
waitfor () {
  spawn withBackgroundServices { 
    |background_services|
    GLOBAL_BACKGROUND_SERVICES = background_services;
    try {
      resume();
      hold();
    }
    catch (e) {
      throw new Error("Uncaught error in global background services: "+e);
    }
  }
}

/**
   @function runGlobalBackgroundService
   @summary Run a service with unbounded lifetime
   @param {::Service} [service] Service to run
   @param {optional Objects} [...args] Arguments to provide to service
   @return {Array} Pair `[itf, terminate]` containing the service's interface `itf` and a function `terminate` for terminating the service early
   @desc
     `runGlobalBackgroundService` runs a service with unbounded lifetime (i.e. the service will
     run as long as the current process, unless it is terminated explicitly). In effect, 
     `runGlobalBackgroundService` is identical to calling [::IBackgroundServicesSession::runService] 
     on a background services session that encompasses the complete process lifetime.

     Note that services will not be shut down cleanly on process exit (i.e. `finally` clauses are not guaranteed to be executed). 
     With some hostenvs (like xbrowser), this is technically not feasible, and on others it is currently not implemented.

*/
exports.runGlobalBackgroundService = GLOBAL_BACKGROUND_SERVICES.runService;

//----------------------------------------------------------------------

/**
   @class ServiceUnavailableError
   @inherit Error
   @summary Error raised by [::IControlledService::start] if the controlled service has terminated and by [::IControlledService::use] if the controlled service is or becomes unavailable.

   @function isServiceUnavailableError
   @param {Object} [e] Object to test
   @summary Returns `true` if `e` is a [::ServiceUnavailableError]
*/

__js function ServiceUnavailableError(e) { 
  var mes = "Service unavailable";
  if (e) 
    mes += '\n' + @indent("(Service threw "+e+")",4);
  var err = new Error(mes);
  err.__oni_service_unavailable = true;
  return err;
}

__js {
  function isServiceUnavailableError(e) {
    return e && e.__oni_service_unavailable === true;
  }
  exports.isServiceUnavailableError = isServiceUnavailableError;
} // __js



/**
   @function withControlledService
   @summary Executes a session with an [::IControlledService] interface controlling a given service.
   @param {::Service} [controlled_service] The controlled service
   @param {optional Objects} [...args] Arguments to provide to controlled service
   @param {Function} [session_f] Session function which will be passed an [::IControlledService] interface
   @desc
     The controlled service starts out in state 'stopped'.
*/
/**
   @class IControlledService
   @summary Interface exposed by [::withControlledService]
   
   @function IControlledService.start
   @param {optional Boolean} [sync=false] If `false`, `start` will return as soon as service is initializing, otherwise `start` will wait until service is running.
   @summary Start the controlled service if it isn't running yet
   @desc
     - If the service is in state 'stopping', `start` waits until the next state is reached.
     - Throws a [::ServiceUnavailableError] if the service is in state 'terminated'.
     - Starts the given service if it is in state 'stopped'.
     - For `sync`=`false` (the default), returns when the service is in state 'initializing' or 'running'.
     - For `sync`=`true`, returns when the service is in state 'running'. If the service cannot start
       (i.e. it moves from 'initializing' to 'stopped' or 'terminated'), [::ServiceUnavailableError] is thrown.

   @function IControlledService.stop
   @param {optional Boolean} [sync=false] If `false`, `stop` will return as soon as service is stopping, otherwise `stop` will wait until service is fully stopped.
   @summary Stops the controlled service if it is currently running
   @desc
     - If the service is in state 'initializing', `stop` waits until the next state is reached.
     - Stops the given service if it is in state 'running'.
     - For `sync`=`false` (the default), returns when the service is in state 'stopped', 'stopping' or 'terminated'.
     - For `sync`=`true`, returns when the service is in state 'stopped' or 'terminated'.
     
     Note that stopping a service does not *abort* the service - it just causes the block passed to the
     service to exit. In practice this means that - in contrast to a service being torn down by the session 
     exiting - 'retract' clauses in the service will not be executed.

   @function IControlledService.use
   @param {Function} [use_session_f] Session function which will be executed with the service's interface
   @summary Establish a 'use' session for a controlled service
   @desc
     Starts the service if it isn't running yet, waits until it is in the 'running' state and calls
     `use_session_f` with the service's interface to establish a 'use session'.

     Unlike establishing a session with a direct call of a service function, a 'use session' does not bound
     the lifetime of the service. After the 'use session' exits, the service continues running until it is 
     explicitly stopped (via [::IControlledService::stop]) or by exiting the [::withControlledService] session.

     If the service is stopped (either explicitly or by virtue of the service session exiting) while executing 
     `itf.use(f)`, `f` will be aborted and a [::ServiceUnavailableError] will be thrown.
     
     Attempting to use a controlled service whose associated [::withControlledService] session has exited will throw a [::ServiceUnavailableError].

   @variable IControlledService.Status
   @summary [./observable::Observable] of the controlled service's current status
   @desc
     The status can be one of: `'stopped'`, `'initializing'`, `'running'`, `'stopping'` or `'terminated'`.

*/
// helper for withControlledService
function runControlledServiceStateMachine({service,args,State,Cmd}) {
  var call_args = args .. @clone;
  call_args.push(function(itf) {
    waitfor {
      Cmd .. @filter(__js cmd -> cmd === 'stop') .. @first;
    }
    and {
      State.set(['running', itf]);
    }
    finally {
      State.set(['stopping']);
    }
  });

  while (1) {
    waitfor {
      Cmd .. @filter(__js cmd -> cmd === 'start') .. @first;
    }
    and {
      State.set(['stopped']);
    }
    State.set(['initializing']);
    service.apply(null, call_args);
  } // while (1)
}

function withControlledService(base_service, ...args_and_session_f) {
  var session_f = args_and_session_f.pop();
  var args = args_and_session_f;

  var State = @ObservableVar(['stopped']);
  var Cmd = @Emitter();

  function start(sync) {
    var state = State .. @filter(__js s->s[0] !== 'stopping') .. @current;
    if (state[0] === 'stopped') {
      waitfor {
        // this 'start' call might have been reentrantly from a 'stop' call. in this case
        // we must only progress when we're sure we're in 'initializing'.
        // Otherwise synchronous follow-up code might still see state 'stopped'
        State .. @filter(__js s->s[0] === 'initializing') .. @current;
      }
      and {
        Cmd.emit('start');
      }
    }
    else if (state[0] === 'terminated')
      throw ServiceUnavailableError(state[1]);
    
    if (sync) {
      var state = State .. @filter(__js s->s[0] !== 'initializing') .. @current;
      if (state[0] !== 'running') throw ServiceUnavailableError(state[0] === 'terminated' ? state[1]);
    }
  }
  
  function stop(sync) {
    var state = State .. @filter(__js s->s[0] !== 'initializing') .. @current;
    if (state[0] === 'running') {
      waitfor {
        // this 'start' call might have been reentrantly from a 'start' call. in this case
        // we must only progress when we're sure we're in 'stopping'.
        // Otherwise synchronous follow-up code might still see state 'running'
        State .. @filter(__js s->s[0] === 'stopping') .. @current;
      }
      and {
        Cmd.emit('stop');
      }
    }
    
    if (sync) {
      State .. @filter(__js s->s[0] === 'stopped' || s[0] === 'terminated') .. @current;
    }
  }
  
  function use(use_session_f) {
    start(true); // this is a synchronous call; we are now in 'running' 
    // - other states indicate service is not runnable (shuts down immediately)
    State .. @each.track {
      |[status, itf_or_err]|
      if (status !== 'running') throw ServiceUnavailableError(status === 'terminated' ? itf_or_err);
      use_session_f(itf_or_err);
      break;
    }
  }
  
  
  waitfor {
    try {
      runControlledServiceStateMachine({service:base_service, args:args, State:State, Cmd:Cmd});
    }
    catch(e) {
      State.set(['terminated', e]);
    }
    retract {
      State.set(['terminated']);
    }
  }
  while {
    session_f({
      use: use,
      start: start,
      stop: stop,
      Status: State .. @transform([status]->status)
    });
  }
}

exports.withControlledService = withControlledService;
