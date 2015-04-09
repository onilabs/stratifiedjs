var {test, assert, context} = require('sjs:test/suite');
var { isPhantomJS } = require('./helper');

test('load module from github') {||
  var data = require('github:/onilabs/stratifiedjs/master/test/unit/fixtures/utf8').test2();
  data.charAt(data.length-1) .. assert.eq('\u0192');
}.ignoreLeaks('_oni_jsonpcb').skipIf(isPhantomJS, "phantomJS bug?");
