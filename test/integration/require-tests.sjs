var {test, assert, context} = require('sjs:test/suite');

test('load module from github') {||
  var data = require('github:/onilabs/stratifiedjs/master/test/unit/fixtures/utf8').test2();
  data.charAt(data.length-1) .. assert.eq('\u0192');
}.ignoreLeaks('_oni_jsonpcb');
