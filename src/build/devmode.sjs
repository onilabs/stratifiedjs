// devmode:
// Functions to help building and debugging a compiler
// change without affecting the full apollo runtime.

var sys = require('sys');
var http = require('sjs:http');
var node_vm = require('vm');
var { merge } = require('sjs:object');
var child_process = require('sjs:nodejs/child-process');
var apollo_home = http.canonicalizeURL('../../', module.id);

function load(name) {
  var base = http.constructURL(['file:///', process.cwd() + '/'])
  name = http.canonicalizeURL(name, base);
  delete require.modules[name];
  return require(name);
}

// build c1.js and vm1node.js. if debug is true, -DDEBUG_VM and -DDEBUG_C1 will be enabled
exports.build = function(debug) {
  var cmd = http.parseURL(apollo_home).path + "/src/build/make-apollo compiler";
  var opts = {};
  if(debug) {
    opts.env = merge(process.env, {APOLLO_CFLAGS: '-DDEBUG_VM -DDEBUG_C1'});
  }
  var result = child_process.exec(cmd, opts);
  if(result.stdout) sys.puts(result.stdout);
  if(result.stderr) sys.puts(result.stderr);
};

// eval an expression using the compiler / vm code from tmp
// (*not* the currently active runtime)
exports.eval = function eval(code, settings) {
  sys.puts("\n");
  var js = exports.compile(code, settings);
  sys.puts("COMPILED (js)  : " + js);
  sys.puts('------------------------------------');
  var res = node_vm.runInNewContext(js, {
      __oni_rt: vm
    }, '(input)');
  sys.puts('------------------------------------');
  sys.puts("result: " + res);
  return res;
};

exports.compile = function compile(code, settings) {
  if(!settings) settings = {};
  var filename = settings.filename || "sjs_eval_code";
  filename = "'#{filename.replace(/\'/g,'\\\'')}'";
  var mode = settings.mode || "normal";
  var c1 = load(settings.compiler || apollo_home + '/tmp/c1.js');
  var vm = load(settings.vm || apollo_home + '/tmp/vm1node.js');

  sys.puts("COMPILING (sjs): " + code);
  var js = c1.compile(code, {filename:filename, mode:mode});
  return js;
};
