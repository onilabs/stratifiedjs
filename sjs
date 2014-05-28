#!/bin/bash
':' //; exec "$(command -v nodejs || command -v node || (echo 'Error: could not find `node` or `nodejs`' >&2; echo false))" "$0" "$@"
// vim: syntax=sjs:

var path = require('path');
var fs   = require('fs');
var sjs_home = path.dirname(fs.realpathSync(__filename));
var sjs_node = require(sjs_home + '/stratified-node');

function usage() {
  return (
    "Usage: sjs [options] [script.sjs [arguments]]\n\n" +
    "Without a script.sjs argument you get dropped into a stratified REPL\n\n" +
    "Options:\n" +
    "  -h, --help          display this help message\n" +
    "  -d, --dev           load development mode (src/build/devmode.sjs)\n" +
    "  -e, --eval STR      evaluate STR\n" +
    "\nDocumentation is at http://onilabs.com/stratifiedjs");
}


// -------------------- possible runner functions: --------------------

function runSJScript(url) {
  return function() {
    sjs_node.run(url);
  };
}

function runRepl(beforeHook) {
  return function() {
    var runRepl = function() {
      sjs_node.require('sjs:std', {callback: function(err, std) {
        if (err) throw err;
        global.__oni_altns = std;
        sjs_node.run('sjs:nodejs/repl');
      }});
    };

    // Drop into REPL:
    if(beforeHook) {
      beforeHook(runRepl);
    } else {
      runRepl();
    }
  };
};

function loadDevExtensions(next) {
  sjs_node.require("./src/build/devmode", {callback:
    function(err, devmode) {
      if(err) throw err;
      process.stdout.write("devmode loaded (try `dev.eval` and `dev.build`)\n");
      sjs_node.getGlobal().dev = devmode;
      return next();
    }
  });
};

function runEval(str) {
  return function() {
    // XXX eval'd code will be operating on global scope; place sjs's 'require' function there:
    var cwdModule = {
      id: sjs_node.pathToFileUrl('./')
    };
    sjs_node.getGlobal().require = sjs_node._makeRequire(cwdModule);
    var rv = sjs_node.eval(str);
    sjs_node.runMainExpression(rv);
  };
};

// -------------------- process options & run --------------------

function processArgs() {
  // default run function - execute REPL with no hooks
  var run = runRepl(null);

  for (var i=2; i<process.argv.length; ++i) {
    var flag = process.argv[i];
    switch (flag) {
    case "-h":
    case "--help":
      throw new Error(usage());
    case "-d":
    case "--dev":
      run = runRepl(loadDevExtensions);
      break;
    case '-e':
    case '--eval':
      ++i;
      var str = process.argv[i];
      run = runEval(str);
      break;
    default:
      // we assume 'flag' is a script. remove everything up to now from
      // argv (except `node`) and exec it:
      process.ARGV = process.argv = [process.argv[1]].concat(process.argv.slice(i));
      if (flag == '--') {
        return run;
      }
      if (flag[0] == '-') {
        throw new Error("Unknown flag '"+flag+"'\n" + usage());
      }
      run = runSJScript(flag);
      return run;
    }
  }
  return run;
}

function main() {
  try {
    var run = processArgs();
  } catch(e) {
    process.stderr.write(e.message + "\n");
    process.exit(1);
  }
  return run();
};

sjs_node.init(main);
