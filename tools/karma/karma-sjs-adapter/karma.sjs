#!/usr/bin/env sjs
var seq = require('sjs:sequence');
var str = require('sjs:string');
var path = require('nodejs:path');
var fs = require('sjs:nodejs/fs');

var karmaPath = __oni_rt.nodejs_require.resolve('karma');
var karmaBase = path.normalize(path.join(karmaPath, '../../'));
var karmaBin = path.join(karmaBase, 'bin/karma');

if (!fs.exists(karmaBin)) {
  console.error("ERROR: Couldn't locate `karma` binary at #{karmaBin}");
  process.exit(1);
}

// ------------------
// run karma

var args = require('sjs:sys').argv();
var idx = args.indexOf('--');
var karmaArgs = idx == -1 ? args : args.slice(0, idx);
var clientArgs = idx == -1 ? [] : args.slice(idx+1);
var command = (karmaArgs .. seq.filter(x -> !(x .. str.startsWith('-'))) .. seq.toArray)[0];

if (command != 'run' && clientArgs.length > 0) {
  // karma only lets us pass arguments via the `run` command.
  // So we do it via an enironment variable (understood by the karma-sjs-adapter)
  // for other commands
  process.argv = process.argv.slice(0, 2).concat(karmaArgs);
  process.env['KARMA_CLIENT_ARGS'] = JSON.stringify(clientArgs);
}
__oni_rt.nodejs_require(karmaBin);
