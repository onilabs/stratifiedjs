/**
@summary Globally-available functions and objects
@type doc

@syntax module-system
@summary Overview of the SJS module system
@desc
  Oni StratifiedJS implements a [CommonJS](http://commonjs.org/specs/modules/1.0/)-like module system,
  which allows you to load StratifiedJS code modules in the same way on both the server and the browser.


  A module is a file with extension *.sjs containing StratifiedJS code
  which, on loading, will be evaluated in its own scope. Variables and
  functions defined within the module will not be seen by other modules
  or by top-level code unless explicitly exported.


  You export symbols from a module by adding them to the [::exports] variable:

      // mymodule.sjs
      var B = 123;
      function add(a,b) { return a+b; }
      exports.A = 456;
      exports.calc = function(a,b) { alert(add(a,b)); };

  In this module, `B` and `add` would be hidden
  from the outside world, whereas, `A` and `calc`
  would be visible.

  To load a module, use the [::require] function.

  ### Module guidelines

  If you're building modules that you intend to publish and allow others to use,
  we ask that you follow our [Module Guidelines](http://onilabs.com//module-guidelines) wherever possible.
  This allows users to integrate your modules into their application with minimal effort.

@syntax inline-modules
@summary Embed SJS modules directly in HTML pages
@hostenv xbrowser
@desc
  SJS code can be embedded directly into HTML, using a `<script>` tag with `type="text/sjs"`.
  By default, code inside a script block is executed once the document is ready and the
  SJS runtime is initialized.

      <script type="text/sjs">
        console.log("Hello from");
        hold(1000);
        console.log(".. StratifiedJS!)";
      </script>

  If you provide a module name, the code will not be immediately executed - but will be available
  to other code via the [::require] function:

      <script type="text/sjs" module="myModule">
        exports.run = function() {
          // ...
        }
      </script>

      // elsewhere:
      require('myModule').run();

  Generally, embedding inline SJS code is discouraged - it is more more flexible to
  keep modules inside separate files so that they can be re-used and cached separately
  of any given HTML page.

@function require
@summary Load an SJS module
@param {String|Array} [module] Module identifier(s)
@param {Settings} [settings]
@setting {Boolean} [reload=false]
@setting {Boolean} [main=false]
@desc
  `require()` will load and return the module(s) given.

  ### Module resolution

  If `module` is not an absolute url, it will be [sjs:url::normalize]d
  against [::module.id] to obtain a full URL.

  If `module` does not contain a file extension, `require()` will append
  `.sjs` automatically. **In the nodejs environment only**, `require()` will fall
  back to the original path if the `.sjs` file cannot be found. This allows
  importing executable sjs scripts that lack an extension.

  Since using absolute URLs can be verbose and inflexible, `require` has a "hub"
  system to support shorthand URLs and custom code loading. The hubs are
  process-wide, and are configured via [::require.hubs]. Builtin hubs
  include "sjs:", "nodejs:" and "github:". Conductance applications also
  have access to the "mho:" hub.

  Here are some example module identifiers:

      // load mymodule.sjs from same directory as caller:
      var mymodule = require("./mymodule.sjs");

      // 'sjs' extension is optional:
      var mymodule = require("./mymodule");

      // load from absolute HTTP URL:
      var mymodule = require("http://my.server.com/mymodule");

      // load module foo directly from GitHub
      // (https://github.com/afri/testmodules, branch master):
      require("github:afri/testmodules/master/foo");

      // load a module from the Standard Library:
      var http = require('sjs:http');

      // load from file URL (works on server only):
      var mymodule = require("file:///Users/alex/mymodule");

      // load a module from nodejs path (server only):
      var mynodemodule = require("nodejs:mynodemodule");

      // load a built-in nodejs module (server only):
      var fs = require("nodejs:fs");
      var fs = require("fs");


  ### Module lifetime:

  Modules will be loaded *once* during the lifetime of the program;
  subsequent `require` calls to the same module will return
  the cached [::exports] object, unless explicitly reloaded using the `reload` setting.

  To get information about which modules are currently loaded, where
  they were `require`d from, etc., you can inspect the [::require.modules] object.

  ### Settings:

    - `main`: Require the module as a main module. See [::require.main].
    - `reload`: Force a full load of the module (e.g from disk or the network, even if it is already present in [::require.modules]).

    **Note:** This is not recursive. `require("mod.sjs", {reload:true})` will reload `mod.sjs`,
    but any modules `mod.sjs` requires may return cached versions.

    **Note:** This only affects the default module loader - hubs like `nodejs:` and `github:`
    have custom loaders which do not currently support this option.
    

  ### Loading modules from HTTP servers

  A call such as `require('./foo')` will cause the browser to make a request of the form:

      http://the_server.com/foo.sjs?format=compiled

  The parameter `format=compiled` indicates that the browser will accept a server-side compiled module.
  The server can safely ignore this format flag and just return the literal file 'foo.sjs'.
  In this way, modules can be served up by **any server capable of serving static files**.

  Server-side compilation is considered an 'experimental' feature at this point.
  It is supported by default when serving modules with the Oni Conductance server.

  ### Cross-domain module loading on browsers

  The standard builtin module retrieval system is capable of
  cross-domain loading of modules (i.e. where the
  module's URL differs from the domain of the document performing the
  `require`), on modern browsers ( >IE6).

  For this mechanism to work on modern browsers, the webserver hosting the modules needs to
  be [configured to send CORS access control headers](http://esw.w3.org/CORS_Enabled).

  ### Loading plain JS modules

  Plain JS modules can be loaded via require by explicitly specifying a '.js' extension 
  (e.g. `require('foo.js')`). Any CommonJS-style JS module should work fine.

  Just like SJS modules, variables and functions defined within the
  module will only be 'seen' by other modules if they are explicitly exported by adding them
  to the 'exports' variable. 

  JS modules also receive a module-specific `require` function, through which other files can be
  loaded by URL relative to the JS module (or via hubs). If the URL does not contain a file 
  extension, '.js' will be appended (and not '.sjs' like in the case where require() is called 
  from an SJS module).
  Note that any files loaded from JS modules in this way need to
  be synchronously available (e.g. preloaded with a prior `require` call from an SJS module).

  ### Loading GitHub modules

  In StratifiedJS 0.12 and greater, `require.hubs` is pre-configured to load modules with a 'github:' prefix directly from GitHub (much like the 'sjs:' prefix is configured to load from the canonical Standard Module Library location - see above). The syntax looks like this:

      require("github:USER/REPO/BRANCH_OR_TAG/MODULE_PATH");

  E.g. to load the module https://github.com/afri/testmodules/blob/master/foo.sjs and call its `hello` function, you could write:

      var foo = require("github:afri/testmodules/master/foo");
      foo.hello();

  The GitHub module loading process works **cross-browser** and without any intermediate proxies. The browser talks **directly** to the [GitHub API](http://developer.github.com/) using [JSONP-style requests](#sjs:http::jsonp).

  The loading functionality also works **transitively**. I.e. if you load a module from GitHub that in turn references another module through a relative url (e.g. `require('./anothermodule')`), it will load fine through this mechanism.

  ### Loading multiple modules

  If `module` is an array, each module will be loaded
  concurrently and the return object will be the result of
  merging the exports from each module into a single object.

  When loading an array of modules, the array elements may be strings, or they
  may be objects with the following properties:

  | Property    | Description                                    |
  | ----------- | -----------------------------------------------|
  | `id`        | the module to load                             |
  | `exclude`   | an array of symbol names to exclude            |
  | `include`   | an array of property names to include          |
  | `name`      | return this entire module as a single property |

  `id` is mandatory, and you should specify only one of the other properties.

  If `name` is specified, the only symbol added to the return object will be `name` - which will access the entire module object.
  If `include` is specified, each property listed will be copied from the imported module onto the return value.
  If `exclude` is specified, all properties present in the module will be copied to the return value.

  In order to prevent accidental conflicts between modules with identical property names,
  `require` will throw an error rather than assign two different values to the same property.
  You will need to use the `include`, `exclude` or `name` options to remove ambiguity if you
  encounter this error.

@variable require.hubs
@summary The configured `require()` hubs
@desc
  The way module identifiers are resolved can be customized through the `require.hubs` variable.
  This variable is an array of `[prefix|regexp, replacement_string|loader_object]` pairs.

  For a given `module_id`, StratifiedJS traverses this array in order, looking for regexp or prefix matches:

  - If a match with an associated `loader_object` is found, the resolution process terminates.

  - If a _prefix_ match with an associated `replacement_string` is found, the prefix of `module_id`
    will be replaced by the replacement string, and the hubs array will be iterated anew from the 
    beginning.

  - If a _regexp_ match with an associated `replacement_string` is found, `module_id` will 
    be amended by calling `module_id = module_id.replace(regexp, replacement_string)`, and the 
    hubs array will be iterated anew from the beginning.

  E.g. on the server, the prepopulated `require.hubs` array looks something like this:

      [ [ 'sjs:', 'file:///Users/alex/stratifiedjs/modules/' ],
        [ 'github:', { src: [Function: github_src_loader] } ],
        [ 'http:', { src: [Function: http_src_loader] } ],
        [ 'https:', { src: [Function: http_src_loader] } ],
        [ 'file:', { src: [Function: file_src_loader] } ],
        [ 'nodejs:', { loader: [Function: nodejs_loader] } ] ]

  A request to `"sjs:http"` may (for example) resolve to `"file:///Users/alex/stratifiedjs/modules/http"`.
  This new URL matches the `file:` prefix, for which the `require.hubs` array contains a `loader_object`
  entry specifying that the source code should be loaded via the built-in `file_src_loader` function.

  To map `sjs:` modules to a different location, you can replace the pre-populated entry in `require.hubs`, or just prepend a new pair, e.g.:

      require.hubs.unshift(["sjs:", "http://mydomain.com/sjs-mirror/"]);

      // all modules addresses as 'sjs:' will now be loaded from
      // the location above.

  ### Loader Objects

  Loader objects determine the way modules are loaded and compiled. They are an internal detail of the SJS implementation.
  Typically you will not need to care about the details unless you want to e.g. hook another compiler into SJS.
  There are many customization hooks, but for the full details of the loading/compiling process you will need to 
  dive into the system code (stratifiedjs/src/sys/*). Here's a brief overview:

  A loader_object has three optional keys:

      {
        src: String or Function
        loader: Function
        resolve: Function (can also be specified as loader.resolve)
      }

  Once a module identifier has been resolved to a loader object (as described above), the actual loading of the module
  proceeds as follows:

  1. Firstly a `resolve_spec` object will be built that, in addition to the keys from the loader_object, contains:

        {
          path: module_id (string),
          ext:  extension of path (part after last '.') - undefined if there is no extension
          type: Type of module, as inferred from the extension, or guessed from the module 
                initating the load ('js' if module was loaded from a js module, 'sjs' 
                if module was loaded from an sjs module).
                Will be a known type in the given hostenv (as listed in the hash 
                'require.extensions'):
                For xbrowser hostenv: 'js', 'sjs', 'html', 
                For nodejs hostenv: 'sjs', 'api', 'mho', 'js', 'html'
        }

  2. This `resolve_spec` object will be passed through the loader_object's `resolve` function, which can amend 
     it as appropriate.
     The default resolve function (if none specified in loader_object or on loader_object.loader) will append 
     `'.'+resolve_spec.type` to `resolve_spec.path` if `resolve_spec.ext` is undefined.

  3. The module will be loaded by calling

         resolve_spec.loader(resolve_spec.path, 
                             parent, // parent module
                             resolve_spec.src,
                             options,
                             resolve_spec);

     The default loader loads the source code by calling `resolve_spec.src(path)`, and compiles it by 
     calling `require.extensions[resolve_spec.type](source, descriptor)`


  ### Deprecated `require.alias`

  There is a deprecated module-local `require.alias` variable, which performs prefix replacement similar to require.hubs, but is only applies to the current module:

      require.alias.mymodules = "http://code.mydomain.com/modules/";
      var mymodule = require("mymodules:mymodule");

  ### External compilers

  There is also a facility for hooking external compilers (like CoffeeScript) into the `require` mechanism. See [this Google groups post](https://groups.google.com/d/msg/stratifiedjs/PjntilkeDiI/jGuWQhhTnn0J) for details.

@variable require.main
@summary The main module ID
@desc
  In various situations, a module can be run as the *main* module. This includes:

    - when specified as the `main` attribute of the `<script>` tag that loads `stratified.js`
    - when specified as the first arugment to the `sjs` command-line tool
    - when specified as the first argument to `conductance exec`
    - when invoked as an executable script with the shebang line:

          #!/usr/bin/env sjs

      or

          #!/usr/bin/env conductance

    - when explicitly required as a main module, using:

          require('module-id', {main: true});

  To test if the current module is the main module, you can use the following code:

      if (require.main === module) {
        // run main task
      }

  Various builtin modules use this functionality to provide an SJS
  module that can be invoked directly from the command line.

@function require.resolve
@summary Resolve a module ID without actually loading it
@desc
  require.resolve can be used to resolve the details of a given
  module ID, such as its canonical location.

  The returned object will have the following properties:

   - `path`: The module ID, with any hubs expanded (this is typically a URL, except in the case of custom loaders like `github:` and `nodejs:`)
   - loader: The module loader
   - src: The module source (String) or source loader (Function)

  require.resolve can also be used to resolve a directory location (if the 'module id' argument ends with a '/').

  Note that require.resolve automatically appends default extensions to the resolved path. In the
  'xbrowser' hostenv, this will be '.sjs' (unless a directory location is being resolved). In the
  'nodejs' hostenv, '.sjs' will be appended if the given file exists on disk with an 'sjs' extension.

@function require.url
@summary Resolve a module ID (or directory) to a URL without loading it
@desc
  `require.url(module)` is a shorthand for `require.resolve(module).path`. See the documentation for [::require.resolve]

@function require.hubs.addDefault
@param {Array} [hub]
@summary Add a hub if it is not yet defined
@return {boolean} Whether the hub was added
@desc
  `hub` is an array where the first element is the prefix, and the
  second element is the replacement.

  This function adds the given `hub` if [::require.hubs.defined] returns
  true for `hub[0]` (i.e the hub prefix):

      require.hubs.addDefault(['foo://', '/bar/qux']);

  For more information on hubs, see [::require.hubs].

@function require.hubs.defined
@param {String} [prefix]
@return {Boolean}
@summary Test if a prefix is covered by an existing hub
@desc
  Returns true if there is an entry in `require.hubs` which would
  match the given prefix. Note that this is not an exact match,
  nor does it test for the existence of a specific path - it
  only returns false for prefixes that could not match any hub.

  For example, due to the bultin `sjs:` hub, the following
  calls will all return `true`:

      require.hubs.defined('s');
      require.hubs.defined('sjs');
      require.hubs.defined('sjs:');
      require.hubs.defined('sjs:xyz');

  For more information on hubs, see [::require.hubs].

@variable require.modules
@summary The global module cache
@desc
  This object stores data about each loaded module under its
  [::module.id]. The specific data stored is an implementation detail
  and subject to change, but may be useful for inspecting.

@variable module.id
@summary The fully-qualified URL of the current module

@function module.getCanonicalId
@return {String|null}
@summary Returns the canonical ID for the current module
@desc
   See [::module.setCanonicalId].

@function module.setCanonicalId
@param {String} [id] 
@summary Sets the canonical ID for the current module
@desc
   A canonical ID is a unique identifier for a module. On setting, 
   the SJS runtime ensures that no other module currently in use has
   the same ID. An exception will be thrown if the ID is already in use.

   Once set for a module, a canonical ID cannot be changed: subsequent calls
   to module.setCanonicalId raise an exception.

   It is not generally required to assign canonical IDs to modules, unless they make use
   of certain functionality that depends on them. E.g. [type::Interface] uses canonical ID to 
   generate unique interface names.

   #### Considerations for choosing an ID name

   There is no prescribed format for the ID, but it should be chosen in a way that
   minimizes the likelyhood of clashing with the ID chosen by another module. 
   If there are e.g. two modules named 'utils.sjs' from different vendors, and both 
   these libraries chose `'utils'` as their canonical ID, then it effectively prevents
   those two modules from being used together in the same application.

   A good strategy is to choose URLs under your control, e.g.: 
   `'https://github.com/vendorA/projectX/utils'` and
   `'http://vendorB.com/modules/utils'`.

   Furthermore, the ID should be constant in time and space. While it
   is possible to use ephemeral IDs that are being generated 
   each time the module is loaded, as in e.g. `module.setCanonicalId(generateNewUUID())`, 
   this practice can break certain remoting scenarios, where two communicating systems 
   don't recognise the equality of a module they are both using.

   See also [::module.getCanonicalId].

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
  Strata are SJS's concurrent process abstraction. They are created and orchestrated transparently
  by SJS's structured concurrency operators (like [./syntax::waitfor-and]) and are not directly 
  accessible ('reified') in user code.  

  The exception is the unstructured concurrency operator [./syntax::spawn], which returns a reified stratum that can be manipulated by user code.

  You can use [../sys::isStratum] to check if a given object is a stratum.

@function Stratum.abort
@param {optional Boolean} [omit_retract=false] Whether to omit executing `retract` clauses
@summary Aborts the stratum if it is not finished yet, otherwise does nothing
@desc
  Calling `abort` on a stratum is similar to the implicit cancellation performed by [./syntax::waitfor-and]/[./syntax::waitfor-or]/[./syntax::waitfor-while]:

  * `abort` is synchronous: It will only return after the stratum has been retracted (i.e. once all `finally` and `retract` clauses on the stratum's callstack have been executed). However, any pending [::Stratum::value] calls will _immediately_ receive a [cutil::StratumAborted] exception.
  
  * An `abort` call can not be aborted itself. Even if aborted, it will only return once 
    the abortee has finished aborting (which might include blocking `retract`/`finally` clauses).
    An exception are 'cyclic aborts' - see below.

  * Unless `omit_retract` is set to `true`, aborting a stratum will be seen as a retraction inside the stratum, i.e. any pending `retract` clauses inside the stratum will be honored. This is also true for 'cyclic aborts' (see below). Otherwise, for `omit_retract=false`, `retract` clauses inside the stratum will not be executed. `finally` clauses will be executed in either case.

  * If the stratum throws an exception during abortion (in a finally or retract clause), the exception
  will be propagated to the abort call.


  #### Cyclic aborts

  A 'cyclic abort' is a stratum calling `abort` on itself, as in e.g: 
  
      var S = _task(function(){ 
        try { 
          hold(100); 
          S.abort(); 
          console.log('not reached'); 
        } retract { 
          console.log('retract called') 
        } 
      })();

  Here, `console.log('not reached')` will not be executed because `S.abort()` will immediately terminate `S` (but the retract clause will be honored).

  Another variant of a cyclic abort calls `abort` from within a `finally` clause:

      var S = _task(function(){ 
        try { 
          hold(100); 
          try {} finally { S.abort(); }
          console.log('this will be executed'); 
          hold(0); // <-- now the stratum will be aborted
          console.log('not reached');
        } retract { 
          console.log('retract called') 
        } 
      })();

  In this variant, the `finally` clause prevents `abort` from stopping 
  synchronous execution: The following (synchronous) code will be executed 
  until an actual suspend point (`hold` or `waitfor/resume`) is reached.


  While these cyclic aborts are allowed (even across multiple spawned strata), they can be indicative of flawed program logic, so be careful.
  If you really do need to abort a stratum from within (rather than returning 'normally' via return or via an exception), it might be more appropriate to use a
  non-synchronous form of abortion:

      var S = _task(function() { 
        try { 
          hold(100);
          _task S.abort();
          console.log('this will be executed');
          hold(); // <-- now the stratum will be aborted
          console.log('not reached');
        }
        retract {
          console.log('retract called');
        }
      })();


@function Stratum.value
@summary Returns the value of the spawned stratum expression
@desc

  - If the stratum isn't finished yet, `value()` blocks until it is.
  - If the stratum threw an exception, `value()` throws this exception.
  - If the stratum was aborted (through a call to [::Stratum::abort]), `value()` throws a [cutil::StratumAborted] exception _immediately_ (before executing any retract calls on the stratum)
  - If a stratum is exited with blocklambda controlflow (blocklambda return or break), `value()` will yield `undefined`.
  - 'Waiting on' a pending stratum with `value()` prevents exceptions thrown from the stratum from becoming uncatchable and aborting the current process.
  

@function Stratum.waiting
@summary Return the number of strata currently waiting for the spawned stratum to finish
@return {Number}
@desc
  A stratum is waiting for another if it is blocked on the other stratum's [::Stratum::value].

@function Stratum.running
@summary Return `true` if the stratum is still running, `false` otherwise
@return {Boolean}

@function Stratum.waitforValue
@deprecated Use [::Stratum::value] instead

*/
