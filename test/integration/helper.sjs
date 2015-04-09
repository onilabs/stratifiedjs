var suite = require('sjs:test/suite');
exports.requiresConductance = t -> t.skipIf(suite.isBrowser && document.location.host == 'code.onilabs.com', "requires conductance server");
exports.isPhantomJS = suite.isBrowser && /PhantomJS/.test(window.navigator.userAgent);
