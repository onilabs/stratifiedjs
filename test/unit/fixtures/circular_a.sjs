var logging = require('sjs:logging');
logging.info("circular_a start");
require('./circular_b');
logging.info("circular_a end");
