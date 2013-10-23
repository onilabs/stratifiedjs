var logging = require('sjs:logging');
var object = require('sjs:object')

logging.info("circular_c start");
exports.a_module = require('./circular_a') .. object.clone();
logging.info("circular_c end");
