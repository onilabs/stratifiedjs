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
     where `session_func` is a functional argument that takes one or more optional 
     arguments (these arguments being the service's "interface").

     When invoking `S([...],session_func)`, `S` calls `session_func` to establish a "service session", 
     optionally (but typically) passing a service session interface to `session_func`.

     The service session lasts until `session_func` exits (at which point `S` is expected to exit).
     `session_func` will typically be a [./#language/syntax::blocklambda].

     Services will typically be named "withRESOURCE" (e.g. [sjs:nodejs/http::withServer]) or 
     "runTYPESession" (e.g. 'runEditSession').

     Formally, a service `S` is expected to adhere to the following semantics:

     - Upon invocation, `S` makes exactly one call to `session_func` (after optionally blocking for initialization).
     - `S` optionally passes one or more arguments to `session_func` (S's 'interface').
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
       [sjs:service::withBackgroundServices], [mho:websocket-client::withWebSocketClient].

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
// helpers:
function runServiceHandlerStateMachine({service,args,State,Cmd}) {
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

__js function ServiceUnavailableError(e) { 
  var mes = "Service unavailable";
  if (e) 
    mes += '\n' + @indent("(Service threw "+e+")",4);
  var err = new Error(mes);
  err.__oni_service_unavailable = true;
  return err;
}

/**
   @class ServiceUnavailableError
   @inherit Error
   @summary Error raised by [::IBackgroundService::start] if the service is terminated and by [::IBackgroundService::use] if the service is or becomes unavailable.

   @function isServiceUnavailableError
   @param {Object} [e] Object to test
   @summary Returns `true` if `e` is a [::ServiceUnavailableError]
*/
__js {
  function isServiceUnavailableError(e) {
    return e && e.__oni_service_unavailable === true;
  }
  exports.isServiceUnavailableError = isServiceUnavailableError;
} // __js

//----------------------------------------------------------------------
/**
   @function withBackgroundServices
   @altsyntax withBackgroundServices { |itf| ... }
   @summary Creates a session for running [::Service]s in the background
   @param {Function} [session_func] Function which will be executed with a [::IBackgroundServicesSession]
   @desc
     `withBackgroundServices` is a [::Service] that creates a session for running other [::Service]s in
     the background. Such background services have their lifetimes bounded by the session established through
     the withBackgroundServices call, and can be interacted with through "sub-sessions" established by 
     [::IBackgroundService::use]. I.e. `withBackgroundServices` decouples the overall 
     lifetime of a service from individual sessions where it is used.

     Background services are attached to the session using [::IBackgroundServicesSession::attach] and
     then controlled with a [::IBackgroundService] interface. With this interface, background services 
     can be started ([::IBackgroundService::start]), stopped ([::IBackgroundService::stop]) and 
     interacted with ([::IBackgroundService::use]).
*/
function withBackgroundServices(session) {
  @withBackgroundStrata {
    |background_strata|

    session(
/**   
   @class IBackgroundServicesSession
   @summary Interface exposed by [::withBackgroundServices]

   @function IBackgroundServicesSession.attach
   @summary Attach a service to the session
   @param {::Service} [service] Service to attach
   @param {optional Object} [...args] Arguments to provide to service
   @return {::IBackgroundService} Interface through which the service can be controlled
   @desc
     This function attaches a service to the given session and returns an [::IBackgroundService] interface 
     through which the service can be controlled.
     Attaching a service will NOT automatically start it. Services start out in state `'stopped'`.

     When the session exits all running background services will be aborted. 
     Attempting to use a background service (through [::IBackgroundService::use]) after session exit 
     will cause a [::ServiceUnavailableError]. 

     See [::IBackgroundService::stop] for stopping a running service
     before the session exits, and note the subtle difference: [::IBackgroundService::stop] will not 
     cause 'retract' clauses in the service to be executed, whereas the session exit will.
     After session exit, services will have state `'terminated'`.
     
*/
      {
        attach: function(service, ...args) {

          var State = @ObservableVar(['stopped']);
          var Cmd = @Emitter();
          
          background_strata.run {
            ||
            try {
              runServiceHandlerStateMachine({service:service, args:args, State:State, Cmd:Cmd});
              State.set(['terminated']);
            }
            catch(e) {
              State.set(['terminated',e]);
              throw e;
            }
            retract {
              State.set(['terminated']);
            }
          }

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

/**
   @class IBackgroundService
   @summary Interface exposed by services attached to a service session by [::IBackgroundServicesSession::attach].

   @function IBackgroundService.start
   @param {optional Boolean} [sync=false] If `false`, `start` will return as soon as service is initializing, otherwise `start` will wait until service is running.
   @summary Start the service if it isn't running yet
   @desc
     - If the service is in state 'stopping', `start` waits until the next state is reached.
     - Throws a [::ServiceUnavailableError] if the service is in state 'terminated'.
     - Starts the given service if it is in state 'stopped'.
     - For `sync`=`false` (the default), returns when the service is in state 'initializing' or 'running'.
     - For `sync`=`true`, returns when the service is in state 'running'. If the service cannot start
       (i.e. it moves from 'initializing' to 'stopped' or 'terminated'), [::ServiceUnavailableError] is thrown.

   @function IBackgroundService.stop
   @param {optional Boolean} [sync=false] If `false`, `stop` will return as soon as service is stopping, otherwise `stop` will wait until service is fully stopped.
   @summary Stops the service if it is currently running
   @desc
     - If the service is in state 'initializing', `stop` waits until the next state is reached.
     - Stops the given service if it is in state 'running'.
     - For `sync`=`false` (the default), returns when the service is in state 'stopped', 'stopping' or 'terminated'.
     - For `sync`=`true`, returns when the service is in state 'stopped' or 'terminated'.
     
     Note that stopping a service does not *abort* the service - it just causes the block passed to the
     service to exit. In practice this means that - in contrast to a service being torn down by the session 
     exiting - 'retract' clauses in the service will not be executed.

   @function IBackgroundService.use
   @param {Function} [use_session_f] Session function which will be executed with the services interface
   @summary Establish a 'use' session for a background service
   @desc
     Starts the service if it isn't running yet, waits until it is in the 'running' state and calls
     `use_session_f` with the service's interface to establish a 'use session'.

     Unlike establishing a session with a direct call of a service function, a 'use session' does not bound
     the lifetime of the service. After the 'use session' exits, the service continues running until it is 
     explicitly stopped (via [::IBackgroundService::stop]) or by exiting of the service session to which the
     background service is attached (via [::IBackgroundServicesSession::attach]).

     If the service is stopped (either explicitly or by virtue of the service session exiting) while executing 
     `itf.use(f)`, `f` will be aborted and a [::ServiceUnavailableError] will be thrown.
     
     Attempting to use an attached service whose service session has exited will throw a [::ServiceUnavailableError].

   @variable IBackgroundService.Status
   @summary [./observable::Observable] of the service's current status
   @desc
     The status can be one of: `'stopped'`, `'initializing'`, `'running'`, `'stopping'` or `'terminated'`.

*/
          return {
            use: use,
            start: start,
            stop: stop,
            Status: State .. @transform([status]->status)
          };
        } // attach
      } // IBackgroundServicesSession
    ); // session
  } // withBackgroundStrata
}
exports.withBackgroundServices = withBackgroundServices;
