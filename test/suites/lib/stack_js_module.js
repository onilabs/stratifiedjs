var fail_normally = exports.fail_normally = function fail_normally() {
	var f1 = function f1() {
		f2();
	};

	var f2 = function f2() {
		f3();
	};

	var f3 = function f3() {
		throw new Error("inner error");
	};
	f1();
}

fail_normally.expected_stack_lines = ['lib/stack_js_module.js:11',
                                      'lib/stack_js_module.js:7',
                                      'lib/stack_js_module.js:3',
                                      'lib/stack_js_module.js:13'];

var getStackSummary = function(lvl) {
  lvl = lvl || 1;
  var lines;
  try {
    throw new Error("line marker");
  } catch(e) {
    lines = e.stack.split('\n');
    lines = lines.slice(lvl);
  }
  return lines.join('\n    < ');
}
