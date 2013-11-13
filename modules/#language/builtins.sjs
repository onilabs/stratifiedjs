/**
@summary Globally-available functions and objects
@type doc

@function require
@summary Load an SJS module by URL
@param {String|Array} [module] Module(s) to load
@desc
  `require()` will load and return the given module.

  If `module` is not an absolue url, it will be [sjs:url::normalize]d
  against [::module.id] to obtain a full URL.

  ### Loading multiple modules

  If `module` is an array, each module will be loaded in
  parallel and the return object will be the result of
  merging the exports from each module into a single object.

  When loading an array of modules, the array elements may be strings, or they
  may be objects with the following properties:

   - id - the module to load
   - exclude: an array of symbol names to exclude
   - include: an array of property names to include
   - name: return this entire module as a single property

  `id` is mandatory, and you should specify only one of the other properties.

  If `name` is specified, the only symbol added to the return object will be `name` - which will access the entire module object.
  If `include` is specified, each property listed will be copied from the imported module onto the return value.
  If `exclude` is specified, all properties present in the module will be copied to the return value.

  In order to prevent accidental conflicts between modules with identical property names,
  `require` will throw an error rather than assign two different values to the same property.
  You will need to use the `include`, `exclude` or `name` options to remove ambiguity if you
  encounter this error.

@variable module.id
@summary The fully-qualified URL of the current module

@variable module.exports
@summary The exported symbols for the current module
@desc
  Typically, objects exported by a module are added individually
  as properties on the [::exports] object.

  However, If you wish to *replace* the exports of the current module
  with a given object, you can only do that by assigning to
  `module.exports` - if you tried to assign to `exports`, that would
  just reassign a local variable, leaving `module.exports` unaffected.

  One common reason to do this is if you want your module to be directly
  executable.

  ### Example:

      var main = function() {
        // primary module functionality
      }

      // add another property to the module
      main.foo = function() { /* ... *\/ }

      // replace `exports` with `main`:
      module.exports = main;

  Then, you could use the module like so:

      var mod = require('./module-name');
      mod(/* call mod directly *\/);
      mod.foo(/* or use an exported property *\/);

@variable exports
@summary Exports object for the current module
@desc
  To export a given function or variable as part of this module,
  assign it to a property of `exports`:

  ### Example:
    
      exports.add = function(a, b) { return a + b; }

@function hold
@param {Optional Number} [time]
@summary Suspend execution of the current stratum
@desc
  If `time` is given, `hold` will suspend the current stratum for approximately `time` milliseconds:

      hold(1000);
      // the next code will be executed after around 1s

  Calling `hold` with an `undefined` argument suspends the current stratum indefinitely.

  Note that `hold` only suspends the stratum that it appears in; it doesn't block the whole program and it doesn't 'busy-wait'. Other concurrent strata can continue to execute during this time. If you are running SJS in a browser, the UI will stay fully responsive during periods of suspension.


@class Stratum
@summary The return value of [./syntax::spawn]
@desc
  Stratum objects cannot be created directly - they are created by
  the StratifiedJS runtime in response to a [./syntax::spawn] invocation.

@function Stratum.abort
@summary Aborts the stratum (if it is not finished yet)

@function Stratum.waitforValue
@summary Returns the value of the spawned stratum expression
@desc

      If the stratum isn't finished yet, `waitforValue` blocks until it is.
      If the stratum threw an exception, `waitforValue` throws this exception.
      If the stratum was aborted (through a call to `Stratum.abort`), `waitforValue` throws a [cutil::StratumAborted] exception.</td>


@function Stratum.waiting
@summary Return the number of strata currently waiting for the spawned stratum to finish
@return {Number}
@desc
  A stratum is waiting for another if it is blocked on the other stratum's [::Stratum.waitforValue].

*/
