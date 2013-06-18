#!/usr/bin/env node
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
    "  -c, --compile FILE  compile FILE\n" +
    "\nDocumentation is at http://onilabs.com/stratifiedjs");
}


// -------------------- possible runner functions: --------------------

function runSJScript(url) {
  return function() {
    if (url.indexOf(":") == -1) {
      // scheme-less; we assume its a file.
      // Note that file: URLs *must* be absolute paths.
      url = "file://" + fs.realpathSync(url);
    }
    sjs_node.require(url, {
      // we provide a callback to prevent nodejs from showing a useless
      // call stack when there is an error:
      callback: function(err) {
        if (err) {
          err = err.toString().replace(/^Error: Cannot load module/, "Error executing");
          err = err.replace(/\(in apollo-sys-common.sjs:\d+\)$/, "");
          console.log(err.toString());
          process.exit(1);
        }
      },
      main: true
    });
  };
}

function runRepl(beforeHook) {
  return function() {
    var runRepl = function() {
      sjs_node.require('sjs:nodejs/repl', {
        callback: function(err, m) {
          if (err) throw err;
          m.runREPL();
        }
      });
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
    sjs_node.getGlobal().require = sjs_node.require;
    return sjs_node.eval(str);
  };
};

function runCompile(filename) {
  return function() {
    var src = require("fs").readFileSync(filename);
    filename = "'" + filename.replace(/\'/g,'\\\'') + "'";
    var compiled = __oni_rt.c1.compile(src, {globalReturn:true, filename:filename});
    require("util").puts(compiled);
  };
};

// -------------------- process options & run --------------------

function processArgs() {
  // default run function - execute REPL with no hooks
  var run = runRepl(null);

  for (var i=1; i<process.argv.length; ++i) {
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
    case '-c':
    case '--compile':
      ++i;
      var filename = process.argv[i];
      run = runCompile(filename);
      break;
    default:
      if (flag[0] == '-') {
        throw new Error("Unknown flag '"+flag+"'\n" + usage());
      }
      // we assume 'flag' is a script. remove everything up to now from
      // path and exec it:
      process.ARGV = process.argv = process.argv.slice(i);
      run = runSJScript(flag);
      return run;
    }
  }
  return run;
}

function main() {
  process.ARGV = process.argv = process.argv.slice(1); // remove 'node' from argv

  try {
    var run = processArgs();
  } catch(e) {
    process.stderr.write(e.message + "\n");
    process.exit(1);
  }
  return run();
};

process.on('uncaughtException',function(error){
  console.error('Uncaught: '+error.toString());
  if (process.listeners('uncaughtException').length == 1) {
    // the user has not installed a handler - kill the process
    process.exit(1);
  }
})

sjs_node.init(main);
