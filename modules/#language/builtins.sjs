/**
@summary Globally-available functions and objects
@type doc

@function require
@param {String|Array} [module] Module(s) to load
@desc
  `require()` will load and return the given module.

  If `module` is not an absolue url, it will be [sjs:url::normalize]d
  against [::module.id] to obtain a full URL.

  If `module` is an array, each module will be loaded in
  parallel and the return object will be the result of
  merging the exports from each module into a single object.

@variable module.id
@summary the fully-qualified URL of the current module

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
@summary exports object for the current module
@desc
  To export a given function or variable as part of this module,
  assign it to a property of `exports`:

  ### Example:
    
      exports.add = function(a, b) { return a + b; }
*/
