var logging = require('sjs:logging');
logging.info("circular_b start");
exports.c_module = require('./circular_c');
logging.info("circular_b end");
