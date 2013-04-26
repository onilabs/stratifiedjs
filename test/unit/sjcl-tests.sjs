var testUtil = require('../lib/testUtil')
var test = testUtil.test;
var sjcl = require('sjs:sjcl');

test('pt == decrypt(encrypt(pt))', 'The quick brown fox', function() {
  return sjcl.decrypt('My random key', sjcl.encrypt('My random key', 'The quick brown fox'));
})