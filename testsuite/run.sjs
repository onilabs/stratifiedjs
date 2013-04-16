// we use the test/runner module to run our tests,
// but we have an out-of-band test module to verify
// that the runner works with enough confidence
// to trust the rest of the test suite:
require('./_init_checks.sjs');


require("sjs:test/runner").run({
	moduleList: "./index.txt",
	base: module.id,
	defaults: {
		logLevel: require("sjs:logging").INFO,
	}
});
