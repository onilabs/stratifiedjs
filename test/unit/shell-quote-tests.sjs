var {test, context, assert} = require('sjs:test/suite');
var {testFn} = require('../lib/testUtil');
var shellQuote = require('sjs:shell-quote');
var {parse, quote} = shellQuote;
var {each} = require('sjs:sequence');

context("parsing") {||
  testFn(shellQuote, 'parse', "'foo' bar baz", ['foo','bar','baz']);
  testFn(shellQuote, 'parse', "'foo'bar baz'frob'\"z\"", ['foobar','bazfrobz']);
  testFn(shellQuote, 'parse', "foo'bar'", ['foobar']);
  testFn(shellQuote, 'parse', "the 'foo'\\''s' \"'good\\\"'\"", ['the','foo\'s', "'good\"'"]);

  testFn(shellQuote, 'parse', 'a \'b\' "c"', [ 'a', 'b', 'c' ]);
  testFn(shellQuote, 'parse',
    'beep "boop" \'foo bar baz\' "it\'s \\"so\\" groovy"',
    [ 'beep', 'boop', 'foo bar baz', 'it\'s "so" groovy' ]
  );
  testFn(shellQuote, 'parse',
    'a\' b c d \'e f" g"',
    [ 'a b c d e', 'f g' ]
  );
  testFn(shellQuote, 'parse', 'a b\\ c d', [ 'a', 'b c', 'd' ]);
  testFn(shellQuote, 'parse', "'a b c'\\''s'", [ "a b c's" ]);
  testFn(shellQuote, 'parse', '\\$beep bo\\`op', [ '$beep', 'bo`op' ]);
  testFn(shellQuote, 'parse', 'echo "foo = \\"foo\\""', [ 'echo', 'foo = "foo"' ]);
  testFn(shellQuote, 'parse', '', []);
  testFn(shellQuote, 'parse', ' ', []);
  testFn(shellQuote, 'parse', "\t", []);

  test('functional env expansion') {||
    assert.eq(parse('a $XYZ c', getEnv), [ 'a', 'xxx', 'c' ]);
    function getEnv (key) {
      return 'xxx';
    }
  };

  test('expand environment variables') {||
    assert.eq(parse('a $XYZ c', { XYZ: 'b' }), [ 'a', 'b', 'c' ]);
    assert.eq(parse('a${XYZ}c', { XYZ: 'b' }), [ 'abc' ]);
    assert.eq(parse('a${XYZ}c $XYZ', { XYZ: 'b' }), [ 'abc', 'b' ]);
    assert.eq(parse('"-$X-$Y-"', { X: 'a', Y: 'b' }), [ '-a-b-' ]);
    assert.eq(parse("'-$X-$Y-'", { X: 'a', Y: 'b' }), [ '-$X-$Y-' ]);
    assert.eq(parse('qrs"$zzz"wxy', { zzz: 'tuv' }), [ 'qrstuvwxy' ]);
    assert.eq(parse("qrs'$zzz'wxy", { zzz: 'tuv' }), [ 'qrs$zzzwxy' ]);
    assert.eq(parse("qrs${zzz}wxy"), [ 'qrswxy' ]);
    assert.eq(parse("ab$x", { x: 'c' }), [ 'abc' ]);
    assert.eq(parse("ab\\$x", { x: 'c' }), [ 'ab$x' ]);
    assert.eq(parse("ab${x}def", { x: 'c' }), [ 'abcdef' ]);
    assert.eq(parse("ab\\${x}def", { x: 'c' }), [ 'ab${x}def' ]);
    assert.eq(parse('"ab\\${x}def"', { x: 'c' }), [ 'ab${x}def' ]);

    assert.eq(parse('a $XYZ c', { XYZ: '"b"' }), [ 'a', '"b"', 'c' ]);
    assert.eq(parse('a $XYZ c', { XYZ: '$X', X: 5 }), [ 'a', '$X', 'c' ]);
    assert.eq(parse('a"$XYZ"c', { XYZ: "'xyz'" }), [ "a'xyz'c" ]);
  }

  test('special shell parameters') {||
    var chars = '*@#?-$!0_'.split('');
    chars..each {|c|
      var env = {};
      env[c] = 'xxx';
      assert.eq(parse('a $' + c + ' c', env), [ 'a', 'xxx', 'c' ]);
    };
  };
}

context("quoting") {||
  testFn(shellQuote, 'quote', [[ 'a', 'b', 'c d' ]], 'a b \'c d\'');
  testFn(shellQuote, 'quote', [[ 'a', 'b', "it's a \"neat thing\"" ]], 'a b "it\'s a \\"neat thing\\""');
  testFn(shellQuote, 'quote', [[ '$', '`', '\'' ]], '\\$ \\` "\'"');
  testFn(shellQuote, 'quote', [[]], '');
  testFn(shellQuote, 'quote', [['quote\'s and "quotes"']], '"quote\'s and \\"quotes\\""');
}


