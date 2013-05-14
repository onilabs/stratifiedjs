var logging = require('sjs:logging');
logging.info("circular_b start");
require('./circular_c');
logging.info("circular_b end");
