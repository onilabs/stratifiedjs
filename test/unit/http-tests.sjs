var {test, assert, context} = require('sjs:test/suite');
var http = require('sjs:http');

test('node.js request fails on non-http URLs', function() {
  assert.raises({message: 'Unsupported protocol: file'}, -> http.request('file:///'));
}).serverOnly();
