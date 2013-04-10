// we use the test/runner module to run our tests,
// but we have an out-of-band test module to verify
// that the runner actually works:
require('./_init_checks.sjs');


require("sjs:test/runner").run({
	suiteList: "./index.txt",
	base: module.id,
	default_opts: {
		showPassed: true,
		showSkipped: false,
		logLevel: require("sjs:logging").INFO,
	}
});
