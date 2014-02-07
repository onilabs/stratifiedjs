This changelog lists the most prominent, developer-visible changes in each release.

## Version 0.17:

0.17 is a small release. The biggest change in this release is stricter
handling of URL strings in the nodejs envrionment. Previously, some functions
that accepted a URL happened to work with an absolute file path. This never
works on windows, and was never intentionally supported. So we've tightened
up checks to disallow using an absolute path where a URL is expected.

For example, if you have the absolute path of a module that you wish to require,
require(filePath) will now throw an error. Instead, you must use
require(filePath .. @url.fileURL). Note that relative URLs like "./lib/helpers"
are still fine, so only code that uses absolute paths will be affected.

The equivalent functionality in the browser is unaffected - e.g
require("/path/to/resource.sjs") still works fine, as this path will
be normalized against the document location.

Command line tools (like `sjs` itself) continue to accept both URLs and
file paths, using the new url::coerceToURL function.

 * new functions and symbols:
   
   * cutil::Queue.isFull
   * object::tap
   * string::base64ToArrayBuffer
   * test/suite::isWindows
   * test/suite::context.windowsOnly
   * test/suite::context.posixOnly
   * url::coerceToURL

## Version 0.16:

**NOTE:** version 0.15 was publicly released, but never announced,
and was shortly followed by 0.16. You are most likely upgrading
from 0.14 -> 0.16, so make sure to also read the 0.15 release
notes below.

#### Changes:

 * removed `rocket` webserver

 * removed `/doc` documentation browser

 * xbrowser/html::css now accepts the same arguments as url::build

## Version 0.15:

#### New features:

 * modules can now be made executable. use `if (require.main === module) { ... }` to run
   additional code when your module is being run (rather than just imported).

 * new @ (alternate namespace) syntax

 * the two-part ternary syntax: `x ? y` is now shorthand for `x ? y : undefined`.

 * the test runner now produces string diffs between expected and actual values

 * string::split now allows regular expression separators, and works consistently cross-browser
   even if String.prototype.split() is buggy.

 * The require method can accept an array of modules now which it will load in parallel. The
   return value is an object with a union of the exported properties from each module.

 * new modules:

   * bundle - executable module for bundling multiple sjs modules into a single .js file
   * compile/* - modules for generating minified source, documentation indexes, etc
   * regexp
   * service - service registry class, useful for dependency injection
   * std - collection of commonly-used modules
   * test/std - collection of commonly-used modules for testing
   * xbrowser/driver - serving a similar purpose to WebDriver / selenium, but simpler, and iframe-only

 * new functions and symbols:

   * cutil.StratumAborted
   * event::HostEmitter.when
   * event::when
   * function::trycatch
   * function::unbatched
   * nodejs/child-process::isRunning
   * object::Constructor
   * object::construct
   * quasi::toQuasi
   * require.hubs.addDefault(hub)
   * require.hubs.defined(prefix)
   * sequence::buffer
   * sequence::intersperse
   * sequence::isSequence
   * sequence::transform.par.unordered
   * shallow equality methods (in compare and assert modules)
   * string::capitalize
   * string::padBoth
   * string::padLeft
   * string::padRight
   * string::unindent
   * sys::argv
   * sys::executable
   * xbrowser/dom::stopPropagation

#### Changes:

 * the `sjs:events` module has been renamed to `sjs:event`.

 * process.ARGV retains the same number of arguments as it does for native nodejs programs
   (we used to start script arguments from argv[1], but they now start from argv[2] just like in nodejs.
   Note that the new `sys::argv` function is now the recommended way of accessing script arguments.

 * the "github:" `require()` hub has changed. You should now include a leading
   slash at the beginning of the path, i.e. "github:/onilabs/stratifiedjs/master"
   instead of just "github:onilabs/stratifiedjs/master". This ensures that
   relative module paths are resolved correctly for modules loaded from github.

 * logging methods now print to `stderr` by default

 * url.parse() no longer has a `queryKey` property. It has been
   replaced with the `params()` method, which URL-decodes all keys
   and values.

 * The optional `filter` and `transform` arguments to event.HostEmitter (and event.when) have been
   replaced with a settings object, which may have values for any of `filter`, `transform` and (now)
   `handle`. In typical use, `transform` is unnecessary.

 * event::Queue and event::Stream have now been moved to methods on the individual emitter - e.g
   instead of `Queue(emitter)`, use `emitter.queue()`.

 * array::contains has been moved to sequence::hasElem (it now operates on any Stream type, and
   has been renamed to avoid confusion with string::contains)

 * xbrowser/dom::isDOMNode has been renamed to isHtmlElement


