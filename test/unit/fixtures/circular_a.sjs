var logging = require('sjs:logging');
exports.start = 1;
logging.info("circular_a start");
exports.b_module = require('./circular_b');
logging.info("circular_a end");
exports.end = 1;
