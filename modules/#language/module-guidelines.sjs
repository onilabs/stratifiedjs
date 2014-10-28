/**
@summary StratifiedJS module guidelines
@type doc

@desc
  These guidelines are primarily for code which is intended to be published as a reusable library. It's often a good idea to follow these guidelines even for most non-library code, since you may want to turn such code into a library in the future.
  
  ## Guideline 1: Use relative imports wherever possible
  
  For any component, all require() calls to other modules within the component should be relative path references. i.e. if you develop a library called "libby" which contains a module "foo" and a module "bar" (which requires foo), then you should use:
  
      # file: bar.sjs
      var foo = require('./foo');
  
  You should *not* use a fully-qualified path such as:
  
      var foo = require('libby:foo');
  
  or:
  
      var foo = require('http://example.com/sjs-libs/libby/foo');
  
  Since this requires all users of your code to configure a "libby:" hub in the former case, and adds a runtime dependency on your server in the latter. Sticking to relative paths makes your code completely relocatable.
  
  ## Guideline 2: Make use of common hubs
  
  Unless you have a good reason not to, you should make use of the following hubs for their intended purpose. There is nothing special about these hubs, but sticking to the convention means less configuration and headaches for the users of your code.
  
  ### - lib:
  
  e.g: `require("lib:<packagename>/<module>");`
  
  This hub should be used for things you depend on but which are not distributed as part of your code.
  
  Users of a dependency manager which collects all dependencies into a single folder should only have to configure a single "lib:" hub for this location, and then all code using this scheme will work.
  
  Users not using dependency management can download all required libraries to a single location and configure "lib:" hub appropriately.
  
  For individual dependencies that are (for whatever reason) in an unusual location, the user of your library can still explicitly configure an individual module under `lib:` to point elsewhere, e.g:
  
      require.hubs.unshift(["lib:foo/", "http://example.com/sjs/foo/"]);
       
  ### - app:
  
  e.g: `require("app:<module>");`
  
  This hub is reserved for use by applications. Use of relative paths may make using this
  scheme unnecessary, but no library code should use this scheme.

  ### Framework-specific hubs:
  
  One notable exception to this rule is the case of a framework which loads code (as opposed to libraries, which are loaded by code). If your framework loads before application code, it may make sense to export its current location into a well-known hub so that the application can access your framework's API without specifying where it can be found.
  
  ## Guideline 3: Do not modify hubs
  
  If your library needs some non-relative resources, you'll need to use a hub. It is bad practice to configure this hub on behalf of your users, since that takes away control of how your component (within their application) can be deployed.
  
  Instead, provide instructions to users on what hubs are required, and how they ought to be configured.
  
  As a result of this guideline, you should aim to keep the number of hubs your code uses to a minimum (usually just "lib:"), since the effort of configuring them falls on every user of your code.
  
  This guideline should obviously be ignored if the purpose of your code is to provide a specific hub.
  
  ### Guideline 3 and a half: *Unobtrusive* configuration of hubs is OK
  
  If you expect your library to be used "live" from your server (or github, or wherever your library is published), you may want to provide some fallback configuration that will only be used if nothing else is available. This is particularly useful for libraries that people might use from the `sjs` command-line repl, as configuring hubs for one-time interactive use can be burdensome.
  
  Such code **must not** override any existing hubs, and should have no effect if the user has already configured an appropriate hub. An example of such code is:
  
      require.hubs.addDefault(["lib:foo/", "github:/user/foo/lib/"]);
  
  [./builtins::require.hubs.addDefault] will only add this hub if the "lib:foo/" prefix is not currently covered by an existing hub.
  
  If your library has many dependencies and you don't want to incur the overhead of checking each one individually, you can use the following guard:
  
      if (!require.hubs.defined("lib:")) {
        require.hubs.push(["lib:foo/", "github:/user/foo-sjs/master/lib/"]);
        require.hubs.push(["lib:bar/", "http://example.com/sjs/bar/"]);
      }
  
  ----
  
  ## Tools:
  
  Since sjs can be used across different environments, it's difficult to recommend a single tool for the purposes of dependency declaration / management. However, some obvious choices are worth mentioning:
  
  ### npm
  
  `npm` is the obvious choice if you need to have command-line scripts (or if you depend on packages already in `npm`), and **have no intention of running in any other environment**.
  
  Even if you don't want to run your code in a browser, others might, and using `npm` would prevent them from doing so easily.
  
  ### Bower
  
  bower is a good choice for library code. It provides no support for placing scripts on `$PATH`, but is otherwise suitable for most environments. It requires very little metadata to work, so depending on third-party code that has not explicitly been packaged for bower is usually straightforward.
  
  If you use `bower`, applications (in any environment) can configure the hub with:
  
      var url = require('sjs:url');
      var componentsUrl = url.normalize('./components', module.id);
      require.hubs.unshift(['lib:', componentsUrl]);
  
  .. or, if you know the absolute path to your components directory in advance:
  
      require.hubs.unshift(['lib:', '/static/components']);
  
  It's not the end of the world if your library also has executable scripts - you could direct your users to run `./components/foo/bin/foo` (or create a wrapper / alias to do so).
  
  */
