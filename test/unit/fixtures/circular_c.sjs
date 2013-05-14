var logging = require('sjs:logging');
logging.info("circular_c start");
require('./circular_a');
logging.info("circular_c end");
