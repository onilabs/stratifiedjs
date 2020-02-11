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
     A Service is a function of signature `function S([optional_params...], client_scope)`,
     where `client_scope` is a functional argument that takes one or more optional 
     arguments (these arguments being the service's "interface").

     `S` is expected to adhere to the following semantics:

     - Upon invocation, `S` makes exactly one call to `client_scope` (after optionally blocking for initialization).
     - `S` optionally passes one or more arguments to `client_scope` (S's 'interface').
     - The lifetime of `S` is bound by `client_scope`, i.e. `S` executes for as long as `client_scope` executes (barring exceptional exit). 
       When client_scope exits, `S` will exit (after optionally blocking for cleanup in `finally` clauses).
     - `S` must pass through any exceptions raised by `client_scope`.
     - `client_scope` has 'control flow authority' over `S`. Among other things, this means 
       that `S` cannot rely on exceptions raised from within its interface to filter 
       through calls made by `client_scope`. I.e. `client_scope` may catch exceptions and 
       not feed them through to the `S(client_scope)` call).
     - `S` is allowed to abort `client_scope`, but must throw an exception if it does so.
       See the section on 'Exceptional exit' below.
     - `S` must not subvert `client_scope`'s control flow authority by using blocklambda
       break/return controlflow or non-exceptional exit of the `S(client_scope)` call. See
       the section on 'Control flow subversion' below.

     ### Examples:

     - Most `"with..."` functions in the sjs/mho libs are services. E.g.: [sjs:nodejs/http::withServer],
       [sjs:sequence::withOpenStream], [sjs:sys::withEvalContext], [sjs:cutil::withSpawnScope],
       [sjs:service::withServiceScope], [mho:websocket-client::withWebSocketClient].

     - A logging service that in turn uses a file writer service:

           function logging_service(filename, scope) {
             @withFileWriter(filename) {
               |{write}|
  
               var itf = {
                 log: function(str) { write("#{new Date()}: #{str}\n"); }
               };
  
               scope(itf);
  
             }
           }

     ### Exceptional exit

     In general the lifetime of a service must be bound by its `client_scope`. The
     service is allowed to abort `client_scope`, but it must throw an exception
     if it does so. E.g.:

         function withServer(server, scope) {
           waitfor {
             while (1) {
               if (!server.ping()) throw new Error("Server gone!");
               hold(1000);
             }
           }
           or {
             scope({uptime: -> server.uptime()});
           }
         }

     A service may throw exceptions from its interface functions, but it must not 
     rely on those exceptions filtering through and causing `client_scope` (and hence
     `S` itself) to be aborted. E.g. in the following example, `accumulator` will not
     get to see the exception raised by its interface, because it is caught within 
     `client_scope`:
     

         function accumulator(scope) {
           var accu = 0;
           scope({
             add: function(x) { if (typeof x !== 'number') 
                                  throw 'Not a number'; 
                                accu += x;
                              }
           });
         }

         accumulator { |itf|
           // try-catch here prevents the exception from filtering
           // through to accumulator
           try { itf.add('not a number'); }catch(e) {}
         }

     If we want `accumulator` to exit with an error (instead of just `add`), 
     the service could be rewritten like this:
     
         function accumulator(scope) {
           var accu = 0, raise_error;
           waitfor {
             waitfor(var err) {
               raise_error = resume;
             }
             throw err;
           }
           or {
             scope({
               add: function(x) { if (typeof x !== 'number')
                                    raise_error(new Error('Not a number');
                                  accu += x;
                                }
             });
           }
         }

     ### Control flow subversion

     A service must not 'silently' (i.e. without raising an exception) exit by
     subverting the control flow authority of `client_scope`.
     E.g. in the above example, the `throw err;` line must not be omitted.
     Doing so can cause great confusion to the caller of the server.

     Additionally, blocklambda controlflow must not be used in the 
     interface functions to subvert the controlflow, because it will not work with
     using services that have their lifetime detached from their 'use' scopes (see 
     [::withServiceScope].
     E.g., the following service would work correctly when called directly, but 
     not when called via [::withServiceScope]:

         function my_service(scope) {
           var error_raised = false;
           scope({
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
      Cmd .. @filter(cmd -> cmd === 'stop') .. @first;
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
      Cmd .. @filter(cmd -> cmd === 'start') .. @first;
    }
    and {
      State.set(['stopped']);
    }
    State.set(['initializing']);
    service.apply(null, call_args);
  } // while (1)
}

function ServiceUnavailableError() { 
  var err = new Error("Service unavailable");
  err.__oni_service_unavailable = true;
  return err;
}

/**
   @class ServiceUnavailableError
   @inherit Error
   @summary Error raised by [::AttachedServiceInterface::start] if the service is terminated and by [::AttachedServiceInterface::use] if the service is or becomes unavailable.

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
   @function withServiceScope
   @altsyntax withServiceScope { |service_scope_itf| ... }
   @summary A [::Service] for bounding the lifetime of other [::Service]s to `scope`
   @param {Function} [scope] Scope function which will be executed with a [::ServiceScopeInterface]
   @desc
     `withServiceScope` is used detach the lifetime of services from their 'use' scopes.
*/
function withServiceScope(client_scope) {
  @withSpawnScope {
    |spawn_scope|

    client_scope(
/**   
   @class ServiceScopeInterface
   @summary Interface exposed by [::withServiceScope]

   @function ServiceScopeInterface.attach
   @summary Attach a service to the service scope
   @param {::Service} [service] Service to attach
   @param {optional Object} [...args] Arguments to provide to service
   @return {::AttachedServiceInterface} Interface through which the service can be controlled
   @desc
     This function attaches a service to the given scope and returns an [::AttachedServiceInterface] through
     which the service can be controlled.
     Attaching a service will NOT automatically start it. Services start out in state `'stopped'`.

     When the scope exits all running services will be aborted, and attempting to use them will cause 
     a [::ServiceUnavailableError]. See [::AttachedServiceInterface::stop] for stopping a running service
     before the scope exits, and note the subtle difference ([::AttachedServiceInterface::stop] will not 
     cause 'retract' clauses in the service to be executed, whereas a scope exit will).
     After scope exit, services will have state `'terminated'`.
     
*/
      {
        attach: function(service, ...args) {

          var State = @ObservableVar(['stopped']);
          var Cmd = @Emitter();
          
          spawn_scope.spawn {
            ||
            try {
              runServiceHandlerStateMachine({service:service, args:args, State:State, Cmd:Cmd});
            }
            finally {
              State.set(['terminated']);
            }
          }

          function start() {
            var state = State .. @filter(s->s[0] !== 'stopping') .. @current;
            if (state[0] === 'stopped') {
              waitfor {
                // this 'start' call might have been reentrantly from a 'stop' call. in this case
                // we must only progress when we're sure we're in 'initializing'.
                // Otherwise synchronous follow-up code might still see state 'stopped'
                State .. @filter(s->s[0] === 'initializing') .. @current;
              }
              and {
                Cmd.emit('start');
              }
            }
            else if (state[0] === 'terminated')
              throw ServiceUnavailableError();
          }

          function stop() {
            var state = State .. @filter(s->s[0] !== 'initializing') .. @current;
            if (state[0] === 'running') {
              waitfor {
                // this 'start' call might have been reentrantly from a 'start' call. in this case
                // we must only progress when we're sure we're in 'stopping'.
                // Otherwise synchronous follow-up code might still see state 'running'
                State .. @filter(s->s[0] === 'stopping') .. @current;
              }
              and {
                Cmd.emit('stop');
              }
            }
          }

          function use(use_scope) {
            start(); // this is a synchronous call; we are now in 'initializing' or 'running' 
                     // - other states indicate service is not runnable (shuts down immediately)
            State .. @filter(s-> s[0] !== 'initializing') .. @each.track {
              |[status, itf]|
              if (status !== 'running') throw ServiceUnavailableError();
              use_scope(itf);
              break;
            }
          }

/**
   @class AttachedServiceInterface
   @summary Interface exposed by services attached to a service scope by [::ServiceScopeInterface].

   @function AttachedServiceInterface.start
   @summary Start the service if it isn't running yet
   @desc
     - If the service is in state 'stopping', `start()` waits until the next state is reached.
     - Throws an [::ServiceUnavailableError] if the service is in state 'terminated'.
     - Returns with no further action if the service is 'running' or 'initializing'.
     - Starts the given service if it isn't running yet and returns as soon as the service 
     has entered the 'initializing' state.

   @function AttachedServiceInterface.stop
   @summary Stops the service if it is currently running
   @desc
     - If the service is in state 'initializing', `stop()` waits until the next state is reached.
     - Returns with no further action if the service is 'stopped', 'stopping' or 'terminated'.
     - Stops the given service if it is running and returns as soon as the service has entered its 
     'stopping' state.
     
     Note that stopping a service does not *abort* the service - it just causes the block passed to the
     service to exit. In practice this means that - in contrast to a service being torn down by the scope 
     exiting - 'retract' clauses in the service will not be executed.

   @function AttachedServiceInterface.use
   @param {Function} [use_scope] Scope function which will be executed with the services interface
   @summary Use the interface of a service attached to a service scope.
   @desc
     Starts the service if it isn't running yet, waits until it is in the 'running' state and calls
     `use_scope` with the service's interface. 
     If the service is stopped (either explicitly or by virtue of the service scope exiting) while executing 
     `itf.use(f)`, `f` will be aborted and a [::ServiceUnavailableError] will be thrown.
     
     Attempting to use an attached service whose scope has exited will throw a [::ServiceUnavailableError].

   @variable AttachedServiceInterface.Status
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
        }
      }
    );
  }
}
exports.withServiceScope = withServiceScope;
