var {test, context, assert} = require('sjs:test/suite');
var {testFn} = require('../lib/testUtil');
var shellQuote = require('sjs:shell-quote');

context("parsing") {||
  testFn(shellQuote, 'parse', "'foo' bar baz", ['foo','bar','baz']);
  testFn(shellQuote, 'parse', "'foo'bar baz'frob'\"z\"", ['foobar','bazfrobz']).skip('BROKEN');
  testFn(shellQuote, 'parse', "foo'bar'", ['foobar']);
  testFn(shellQuote, 'parse', "the 'foo'\\''s' \"'good\\\"'\"", ['the','foo\'s', "'good\"'"]).skip('BROKEN');
}

context("quoting") {||
  testFn(shellQuote, 'quote', [['quote\'s and "quotes"']], '"quote\'s and \\"quotes\\""');
}
