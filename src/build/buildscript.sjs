// Apollo build tool
/*
 
  A dependency-driven, parallel buildscript for building apollo.
  Like SCons, but simpler, smaller, concurrent (== faster).

*/

var fs = require('apollo:node-fs');
var common = require('apollo:common');
var sys = require('sys');

//----------------------------------------------------------------------
// BUILD DEPENDENCIES

function build_deps() {

  //----------------------------------------------------------------------
  // top-level targets:

  PSEUDO("clean");
  BUILD("clean", ["rm -rf tmp", function() { log('all done')}]); 

  PSEUDO("build");
  BUILD("build", function() { log('all done') }, ["oni-apollo.js", "oni-apollo-node.js", "tmp/version_stamp"]);

  PSEUDO("compiler");
  BUILD("compiler", function() { log('all done') }, ["tmp/c1.js", "tmp/vm1node.js"]);

  // XXX figure out how to get in settings for debug mode (keeplines, etc)

  //----------------------------------------------------------------------
  // c1

  // minifier (used by MINIFY):
  CPP("tmp/c1jsmin.js", "-DC1_KERNEL_JSMIN",  
      ["src/c1/c1.js.in", "src/c1/kernel-jsmin.js.in"]); 
  // stringifier (used by STRINGIFY):
  CPP("tmp/c1jsstr.js", "-DC1_KERNEL_JSMIN -DSTRINGIFY", 
      ["src/c1/c1.js.in", "src/c1/kernel-jsmin.js.in"]); 
  // SJS compiler:
  CPP("tmp/c1.js", "-DC1_KERNEL_SJS", 
      ["src/c1/c1.js.in", "src/c1/kernel-sjs.js.in"]); 
  MINIFY("tmp/c1.js.min", "tmp/c1.js", 
         { pre: "(function(exports){", post: "})(__oni_rt.c1={});" });

  //----------------------------------------------------------------------
  // vm1

  // client-side:
  CPP("tmp/vm1client.js", "-DCLIENTSIDE", ["src/vm1/vm1.js.in"]);
  MINIFY("tmp/vm1client.js.min", "tmp/vm1client.js", 
         { pre: "var __oni_rt={};(function(exports){", 
           post: "exports.modules={};exports.modsrc={};})(__oni_rt);" });
  
  // nodejs-based:
  CPP("tmp/vm1node.js", "-DNODEJS", ["src/vm1/vm1.js.in"]);
  MINIFY("tmp/vm1node.js.min", "tmp/vm1node.js", 
         { pre: "global.__oni_rt={};(function(exports){", 
           post: "exports.modules={};exports.modsrc={};})(__oni_rt);" });

  //----------------------------------------------------------------------
  // sys module

  // common part:
  STRINGIFY("tmp/apollo-sys-common.sjs.min", "src/sys/apollo-sys-common.sjs",
            { pre: "__oni_rt.modsrc['sjs:apollo-sys-common.sjs']=", post: ";" });
  
  // xbrowser hostenv-specific part:
  STRINGIFY("tmp/apollo-sys-xbrowser.sjs.min", "src/sys/apollo-sys-xbrowser.sjs",
            { pre: "__oni_rt.modsrc['sjs:apollo-sys-xbrowser.sjs']=", post: ";" });

  // nodejs hostenv-specific part:
  STRINGIFY("tmp/apollo-sys-nodejs.sjs.min", "src/sys/apollo-sys-nodejs.sjs",
            { pre: "__oni_rt.modsrc['sjs:apollo-sys-nodejs.sjs']=", post: ";" });


  //----------------------------------------------------------------------
  // bootstrap code

  // xbrowser shim code:
  MINIFY("tmp/apollo-jsshim-xbrowser.js.min", 
         "src/bootstrap/apollo-jsshim-xbrowser.js");

  // common part:
  MINIFY("tmp/apollo-bootstrap-common.js.min", 
         "src/bootstrap/apollo-bootstrap-common.js");

  // xbrowser hostenv-specific part:
  MINIFY("tmp/apollo-bootstrap-xbrowser.js.min", 
         "src/bootstrap/apollo-bootstrap-xbrowser.js");

  // nodejs hostenv-specific part:
  MINIFY("tmp/apollo-bootstrap-nodejs.js.min", 
         "src/bootstrap/apollo-bootstrap-nodejs.js");
  

  //----------------------------------------------------------------------
  // apollo lib

  // xbrowser version:
  BUILD("oni-apollo.js", 
        ["cat $0 $1 $2 $3 $4 $5 $6 $7 > $TARGET",
         replacements_from_config
        ],
        ["src/headers/oni-apollo.js.txt",
         "tmp/vm1client.js.min",
         "tmp/c1.js.min",
         "tmp/apollo-sys-common.sjs.min",
         "tmp/apollo-sys-xbrowser.sjs.min",
         "tmp/apollo-jsshim-xbrowser.js.min",
         "tmp/apollo-bootstrap-common.js.min",
         "tmp/apollo-bootstrap-xbrowser.js.min",
         "src/build/config.json"]);

  // nodejs version:
  BUILD("oni-apollo-node.js", 
        ["cat $0 $1 $2 $3 $4 $5 $6 > $TARGET",
         replacements_from_config
        ],
        ["src/headers/oni-apollo-node.js.txt",
         "tmp/vm1node.js.min",
         "tmp/c1.js.min",
         "tmp/apollo-sys-common.sjs.min",
         "tmp/apollo-sys-nodejs.sjs.min",
         "tmp/apollo-bootstrap-common.js.min",
         "tmp/apollo-bootstrap-nodejs.js.min",
         "src/build/config.json"]);

  //----------------------------------------------------------------------
  // version stamping for module files and package.json:

  BUILD("tmp/version_stamp",
        [
          function() {
            var modules = fs.readdir("modules");
            for (var i=0; i<modules.length; ++i) {
              if (/.+\.(sjs|txt)$/.test(modules[i])) {
                log('Replacing version in modules/'+modules[i]);
                replacements_from_config("modules/"+modules[i]);
              }
            }
            modules = fs.readdir("rocket-modules");
            for (var i=0; i<modules.length; ++i) {
              if (/.+\.sjs$/.test(modules[i])) {
                log('Replacing version in rocket-modules/'+modules[i]);
                replacements_from_config("rocket-modules/"+modules[i]);
              }
            }
            log('Replacing version in package.json');
            replacements_from_config('package.json');
          },
          "touch $TARGET"
        ],
        ["src/build/config.json"]);

}

//----------------------------------------------------------------------
// specialized build tasks

var config;
function get_config() {
  if (!config)
    config = require('apollo:docutil').parseCommentedJSON(
      fs.readFile("src/build/config.json"));
  return config;
}

function replacements_from_config(target) {
  var config = get_config();
  var src = fs.readFile(target).toString();

  var repl = src.replace(/Version: '[^']*'/g, "Version: '"+config.version+"'")
                .replace(/"version"\s*:\s*"[^"]*"/, '"version" : "'+config.npm_version+'"')
                .replace(/Apollo '[^']*' Standard Module Library/g, 
                         "Apollo '"+config.version+"' Standard Module Library");

  if (repl != src)
    fs.writeFile(target, repl);
}

//----------------------------------------------------------------------
// high-level builders

function MINIFY(target, source, flags) {
  flags = common.mergeSettings({keeplines:true}, flags);
  BUILD(
    target,
    function() {
      var src = fs.readFile(source).toString();
      var c = require('../../tmp/c1jsmin.js');
      var out = c.compile(src, flags);
      var pre = flags.pre || "";
      var post = flags.post || "";
      fs.writeFile(target, pre + out + post);
      return target;
    },
    [source, "tmp/c1jsmin.js"]);
}

function STRINGIFY(target, source, flags) {
  flags = common.mergeSettings({keeplines:true}, flags);
  BUILD(
    target,
    function() {
      var src = fs.readFile(source).toString();
      var c = require('../../tmp/c1jsstr.js');
      var out = c.compile(src, flags);
      var pre = flags.pre || "";
      var post = flags.post || "";
      fs.writeFile(target, pre + out + post);
      return target;
    },
    [source, "tmp/c1jsstr.js"]);
}

// CPP: run C preprocessor
function CPP(target, defs, deps) {
  var cmd = "cpp -P -undef -Wundef -std=c99 -traditional-cpp -nostdinc -Wtrigraphs -fdollars-in-identifiers";
  var extraflags = process.env['APOLLO_CFLAGS'] || '';
  BUILD(target, cmd + " " + extraflags + " " + defs + " $0 $TARGET", deps);
}

//----------------------------------------------------------------------
// BUILD & PSEUDO:

var builders = {}, pseudos = {};

// BUILD: "builder construction function"
// Sets task and dependencies for a given target.
// task can be a shell command or a function
function BUILD(target, task, deps) {
  deps = deps || [];
  // builders are dependent on the buildscript itself:
  if (target !== "src/build/buildscript.sjs")
    deps.push("src/build/buildscript.sjs");
  
  var stratum;
  builders[target] = function() {
    if (!stratum) {
      stratum = spawn _run_builder(target, task, deps);
    }
    return stratum.waitforValue();
  }
}

// PSEUDO: Mark given target as a pseudo-target; i.e. there is no
// corresponding disk file for it.
function PSEUDO(target) {
  pseudos[target] = true;
}


//----------------------------------------------------------------------
// implementation helpers: 

function log(s) { process.stdout.write(s+"\n"); }


function timestamp(target, istarget) {
  if (!pseudos[target]) {
    try {
      return fs.stat(target).mtime;
    }
    catch (e) { /* file doesn't exist yet */}
  }
  // non-existant file or pseudo.
  return istarget ? new Date(0) : new Date("2100");
}

function _run_builder(target, task, deps) {
  // first run dependencies:
  if (deps.length) {
    require('apollo:cutil').waitforAll(
      function(dep) {
        if (builders[dep]) 
          builders[dep]();
        else
          if (!/^src\//.test(dep)) // warn for missing builder if file is not in src/
            log('Warning: no builder for '+dep);
      },
      deps);
  }
  // check if we need to run the task:
  var ts = timestamp(target, true);
  var dirty = (deps.length == 0);
  for (var i=0; i<deps.length; ++i) {
    if (timestamp(deps[i]) > ts) {
//      console.log('TARGET '+target+': '+deps[i]+' ('+timestamp(deps[i])+') >'+ts+' ('+i+')');
      dirty = true;
      break;
    }
  }
  // now run the build task:
  if (dirty) {
    try {
      _run_task(target, task, deps);
    }
    catch (e) {
      process.stderr.write("Error executing task for '"+target+"':"+e);
      throw e;
    }
  }
  return target;
}

function _run_task(target, task, deps) {
  if (require('apollo:common').isArray(task)) {
    for (var i=0; i<task.length; ++i)
      _run_task(target, task[i], deps);
  }
  else if (typeof task == "function")
    task(target, deps);
  else if (typeof task == "string") {
    // we assume it's a shell command
    // do some replacements first:
    task = task.replace(/\$(\d+)/g, function(m,n) { return deps[n]; });
    task = task.replace(/\$TARGET/g, target);
    log("Executing '"+task+"'");
    require('apollo:node-child-process').exec(task);
  }
  else 
    throw new Error("Unknown task type in builder '"+target+"'");    
}

// Build the given target:
function build_target(target) {
  // make sure we're in the right path:
  var apollo_home = require('path').dirname(fs.realpath(process.argv[0]))+"/../../";
  process.chdir(apollo_home);
  
  // make sure there's a tmp dir:
  if (!fs.isDirectory("tmp")) {
    log("Executing 'mkdir tmp'");
    fs.mkdir("tmp",0777);
  }

  try {
    build_deps();
    builders[target]();
  }
  catch(e) { process.stdout.write("\nBUILD ERROR\n"); process.exit(1); }
}

//----------------------------------------------------------------------
// main:

function usage() {
  process.stdout.write("Oni Apollo build tool\n\n");
  process.stdout.write("Usage: make-apollo [options] [target]\n\n");
  process.stdout.write("Options:\n");
  process.stdout.write("  -h, --help         display this help message\n");
  process.stdout.write("\nTargets:\n");
  process.stdout.write("  clean              clean temporaries\n");
  process.stdout.write("  build              full build (default)\n");
  process.stdout.write("\n");
}

function process_args() {
  var targets = [];
  for (var i=1; i<process.argv.length; ++i) {
    var flag = process.argv[i];
    switch(flag) {
    case "-h":
    case "--help":
      usage();
      process.exit(0);
      break;
    default:
      return process.argv.slice(i);
      break;
    }
  }
  return ["build"];
}

var targets = process_args();
for(var i=0; i<targets.length; i++) {
  var target = targets[i];
  sys.puts("\nBuilding target: " + target);
  build_target(target);
}

