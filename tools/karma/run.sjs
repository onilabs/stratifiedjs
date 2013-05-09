waitfor {
  var runner = require("sjs:test/runner");
} and {
  require('../../test/init_checks.sjs');
}
var logging = require('sjs:logging');
var url = require('sjs:url');
var opts = {
  moduleList: "_index.txt",
  base: url.normalize('../../test/', module.id),
  logLevel: logging.INFO,
  exit: false,
};
runner.run(opts, window.__karma__.argv);
