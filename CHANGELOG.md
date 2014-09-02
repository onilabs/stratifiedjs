This changelog lists the most prominent, developer-visible changes in each release.

## Version 0.19:

This version includes a number of additions to nodejs-specific modules, as well
as a reworked `events` module which now represents events as a `Stream`.
It also includes a new `observable` module, which previously lived in the
Conductance codebase.

 * New modules:

   * observable (moved from Conductance's `mho:observable`)
   * nodejs/mkdirp
   * nodejs/rimraf
   * nodejs/tempfile

 * New functions and symbols:

   * array::haveCommonElements
   * assert::suspends
   * sequence::dedupe
   * sequence::each.track
   * sequence::last
   * sequence::mirror
   * sequence::tailbuffer
   * sequence::unique
   * sequence::uniqueBy
   * nodejs/fs::createReadStream
   * nodejs/fs::createWriteStream
   * nodejs/fs::withReadStream
   * nodejs/fs::withWriteStream
   * nodejs/http::Server::address
   * nodejs/http::Server::close
   * nodejs/http::Server::eachRequest
   * nodejs/stream::end
   * nodejs/stream::DelimitedReader

 * Changes

   * The `event` module has been refactored to treat events as a Stream (see event::EventStream).
     This removes the need for a number of special-purpose methods in the `event` module, and
     allows all of the `sequence` module functions to be used on event streams.

     Some important API differences are:

     * To get an event stream from a native host emitter, use `event::events(emitter)` rather
       than the old event::HostEmitter(emitter)

     * Event streams no longer have their own methods (like .wait()),
       since the sjs:sequence module already contains this functionality (sequence::first())

     * `event.when(emitters, events, block)` becomes
       `event.events(emitters, events) .. sequence.each(block)`

   * The semantics of ObservableVar has changed slightly. Any modification (via `set()` or
     `modify()`) will have no effect if the new value is equal to the current value (under `===`).
     This prevents spurious work from occurring when successive values are identical. It
     also removes the need for an explicit `unchanged` value to be given to `modify` (although
     this is still present for backwards compatibility).

     If you require similar behaviour for deep equality (i.e `compare::eq` instead of just `===`),
     you can explicitly create a deduplicated version of any sequence using `sequence::dedupe`.
   
   * The .waitforValue() method on stratum objects (#language/builtins::Stratum)
     has been renamed to just .value(). The old name is still present for
     backwards compatibility.
 
 * Changes to external process termination:

   * On POSIX platforms (Mac & Linux), the toplevel sjs runtime now handles deadly process signals
     (such as SIGINT, SIGTERM, etc). The behaviour should be identical to previous versions,
     except that retract/finally blocks now act as you would expect during process termination
     (such blocks are now executed fully, even when they involve suspending code).

   * Due to underlying platform limitations, cleanup code from retract/finally
     blocks will not run as expected in the following circumstances:

      - On Windows, cleanup code will not run at all if the process is killed.

      - When calling `process.exit()`, cleanup code will run (on UNIX),
        but only until it suspends - the process will then terminate, without
        waiting for the suspended code to complete.

        To terminate the current process when there may be other code which may require
        non-atomic (i.e suspending) cleanup, you can use `process.kill(process.pid, 'SIGINT')`.

## Version 0.18:

A small release to accompany Conductance-0.4:

 * new functions and symbols:

    * nodejs/fs::utimes
    * nodejs/fs::futimes
    * sequence::monitor
    * string::octetsToArrayBuffer
    * string::arrayBufferToOctets

 * changes

    * sequence::each no longer returns the original sequence
    * better support for Windows line endings in source code
    * minor fixes to file:// URL handling (particularly on Windows)
    * test/suite: apply timeout to beforeAll/beforeEach blocks

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


