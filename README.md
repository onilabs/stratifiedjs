Oni StratifiedJS - Multi-Platform Stratified JavaScript Implementation
======================================================================

Oni StratifiedJS (previously known as "Oni Apollo") is the reference
[StratifiedJS Language](http://onilabs.com/reference) implementation + a
supporting set of modules. It runs server-side (based on NodeJS) as well
as client-side (cross-browser).

For an overview see [onilabs.com/stratifiedjs](http://onilabs.com/stratifiedjs).

Please post questions to the [StratifiedJS Google Group](https://groups.google.com/forum/#!forum/stratifiedjs).


How to run/install
------------------

For server-side use, you can just execute the `sjs` executable
(provided you have nodejs installed).

For client-side use, just include `stratified.js` in your html,
as described at [onilabs.com/stratifiedjs](http://onilabs.com/stratifiedjs).

For a complete sjs web app stack, check out [conductance.io](https://conductance.io).

Prebuilt packages:
------------------

Users of the [bower](http://bower.io/) or [npm](https://npmjs.org/)
package managers can install the `stratifiedjs` package using either of
these tools. `npm` users should install globally (`npm install -g`)
to add the `sjs` binary to your `$PATH`.


What's in this repository:
==========================

stratified.js
-------------

 - Client-side cross-browser StratifiedJS runtime.
 - ~25kB gzipped, MIT-licensed.
 - For more information please read the docs at [onilabs.com/stratifiedjs](http://onilabs.com/stratifiedjs).

stratified-node.js, 'sjs' executable
---------------------------------------

 - Server-side StratifiedJS runtime for NodeJS.
 - If you've got NodeJS installed, just run `sjs` to get a serverside SJS REPL.
 - See also this [StratifiedJS Google Group post](https://groups.google.com/forum/#!topic/oni-apollo/ZDkxczAZcgw)

modules/
--------

 - 'Oni StratifiedJS Standard Module Library'
 - All MIT-licensed.
 - Runs server-side or client-side.
 - Documentation at [onilabs.com/modules](http://onilabs.com/modules).

src/
----

 - build tools and source code from which stratified.js and
   stratified-node.js are assembled.

emacs/
--------

 - StratifiedJS syntax highlighting support for emacs (GPL).

vim/
--------

 - StratifiedJS syntax highlighting support for vim (Vim licence, GPL compatible).


How to build
------------

Everything is already pre-built.

No need to compile anything unless you change something in the src/
directory. In that case, you can use the src/build/make-sjs tool to
reassemble stratified.js and stratified-node.js. The build process
should work on most unixy environments out of the box (in particular
it requires CPP - the C preprocessor).


Considerations for client-side use
----------------------------------

Note that, by default, if you load standard library modules using code
such as

    var http = require('sjs:http');

the module will be requested from

    LOCATION_WHERE_STRATIFIED_JS_WAS_LOADED_FROM/modules

This location can only be inferred if you load stratified.js in the
'normal' way. If you rename stratified.js to something else, or you
don't load it through a &lt;script> tag, you'll need to manually
configure the 'sjs' hub before you can make calls such as
`require('sjs:http')`.

To (re-)configure the 'sjs hub', you can use code such as this:

    require.hubs.unshift(
      ["sjs:",
       "http://code.mydomain.com/sjs-mirror/modules/"]
      ]);
    // all modules addressed as 'sjs:' will now be loaded from the
    // location above.

Note that many browsers cannot load modules over the `file:`
protocol. You can use a standard web server to serve
stratified.js and the modules/ directory, or load stratified.js &
modules/ from http://code.onilabs.com/ as described at
[onilabs.com/stratifiedjs](http://onilabs.com/stratifiedjs).

