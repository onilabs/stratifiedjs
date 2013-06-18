#!/usr/bin/env sjs
var object = require('sjs:object');
var seq = require('sjs:sequence');
var str = require('sjs:string');
var path = require('nodejs:path');
var fs = require('sjs:nodejs/fs');
var {wait} = require('sjs:events');
var childProcess = require('sjs:nodejs/child-process');
var url = require('sjs:url');
var toolsDir = url.normalize('../', module.id) .. url.toPath();

// ------------------------------------------------------------------
// node_modules-based lookups are busted in the face of symlinks, so
// we explicitly make sure $NODE_PATH has:
// - tools/karma (our plugin location)
// - karma/index.js/../node_modules (so we can use karma's http-proxy)

var existingNodePath = process.env.NODE_PATH;
var existingPaths = existingNodePath ? existingNodePath.split(path.delimiter) : [];
var pluginPath = path.join(toolsDir, 'karma');
var karmaPath = __oni_rt.nodejs_require.resolve('karma');

var karmaBase = path.normalize(path.join(karmaPath, '../../'));
var karmaBin = path.join(karmaBase, 'bin/karma');
var karmaDeps = path.join(karmaBase, 'node_modules');

if (!fs.exists(karmaBin)) {
  console.log("ERROR: Couldn't locate `karma` binary at #{karmaBin}");
  process.exit(1);
}

process.env.NODE_PATH = [pluginPath, karmaDeps].concat(existingPaths).join(path.delimiter);

// ------------------
// set up rocket port

var rocketPort = 7071;
var envKey = 'ROCKET_PORT';
if (process.env[envKey]) {
  rocketPort = parseInt(process.env[envKey]);
} else {
  process.env[envKey] = String(rocketPort);
}


// ------------------
// run karma

var args = process.argv.slice(1);
var idx = args.indexOf('--');
var leadingArgs = idx == -1 ? args : args.slice(0, idx);
var command = (leadingArgs .. seq.filter(x -> !(x .. str.startsWith('-'))) .. seq.toArray)[0];

var action = function () {
  var child = childProcess.launch(karmaBin, args, {stdio:'inherit', detached: true, env:process.env});
  waitfor {
    try {
      childProcess.wait(child);
    } retract {
      // karma dies poorly. Usually TERM is enough to kill it, but
      // sometimes it requires a KILL (generally when it can't find a browser)
      // console.log("Killing karma");
      var options = {wait: true, signal:'SIGTERM', detatched: true};
      waitfor {
        childProcess.kill(child, options);
      } or {
        hold(1 * 1000);
        console.log("Waiting for `karma` to exit ... (pid #{child.pid})");
        hold(13 * 1000);
        console.log("Karma still running; sending KILL");
        options.signal = 'SIGKILL';
        childProcess.kill(child, options);
      }
    }
  } or {
    process .. wait('SIGINT');
  }
}

// -----------------------------------------------
// run rocket if we're starting a karma server

var rocketCtl = require('../../test/lib/rocket_ctrl')
try {
  if (command == 'start') {
    rocketCtl.withRocket(rocketPort, {stdio: 'inherit'}, action);
  } else {
    action();
  }
} catch(e) {
  // console.log(e.message ? e.message : "");
  process.exit(1);
}
