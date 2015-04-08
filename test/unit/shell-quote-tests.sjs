@ = require('sjs:test/std');
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

  testFn(shellQuote, 'quote', ['single string'], "'single string'");
  testFn(shellQuote, 'quote', [[ 'a', 'b', 'c d' ]], 'a b \'c d\'');
  testFn(shellQuote, 'quote', [[ 'a', 'b', "it's a \"neat thing\"" ]], 'a b "it\'s a \\"neat thing\\""');
  testFn(shellQuote, 'quote', [[ '$', '`', '\'' ]], "'$' '`' \"'\"");
  testFn(shellQuote, 'quote', [[]], '');
  testFn(shellQuote, 'quote', [['quote\'s and "quotes"']], '"quote\'s and \\"quotes\\""');
}



var roundtripTests = {
  bash: function(args) {
    var proc = process.execPath;
    var cmd = "exec #{process.execPath .. shellQuote.quote()} -e 'console.log(JSON.stringify(process.argv.slice(2)))' STOP_PARSING_OPTIONS #{args .. shellQuote.quote}";
    @info(cmd);
    var proc = @childProcess.run('bash', ['-euc',cmd], {'stdio':['ignore','pipe', 2]});
    proc.stdout .. JSON.parse .. @assert.eq(args, 'roundtrip through `bash`');
  },

  shellQuote: function(args) {
    args .. shellQuote.quote() .. shellQuote.parse() .. @assert.eq(args, 'roundtrip through shell-quote');
  }
}

var testRoundtrip = function(/* args */) {
  var args = arguments .. @toArray;

  // on the server, we can just throw a bunch of quoted arrays at bash
  // and check they come out the same at the other end:
  test("bash roundtrip: #{@inspect(args)}") {||
    roundtripTests.bash(args);
  }.serverOnly();

  test("shell-quote roundtrip: #{@inspect(args)}") {||
    roundtripTests.shellQuote(args);
  }
};
testRoundtrip('word1', 'word2 word3');
testRoundtrip('$foo');
testRoundtrip('#foo');
testRoundtrip('"#foo"');
testRoundtrip("'#foo'");
testRoundtrip('"$double quote with \'$single quotes\'"');
testRoundtrip('\'$single quote with "$double quotes"\'');
testRoundtrip('`backticks`');
testRoundtrip('"`backticks`"');
testRoundtrip("'`backticks`'");
testRoundtrip('--opt');
testRoundtrip('"foo\n\tbar"');
testRoundtrip('foo\n\tbar');
testRoundtrip('\'foo\n\tbar\'');


// uncomment this to run an (infinite) fuzz test
//test('fuzz') {||
//  console.log("WARN: this test never returns on success");
//  while(true) {
//    var words = [];
//    var rnd = function(max) {
//      var min = 0;
//      if (arguments.length == 2) {
//        [ min, max ] = arguments;
//      }
//      @assert.ok(min < max);
//      return Math.round(Math.random() * (max - min)) + min;
//    }
//    var rndchars = function(len) {
//      var min = 31; // start at 32, but pretend 31 is tab
//      var max = 126;
//      var rv = "";
//
//      for(var i=0; i<len; i++) {
//        var code = rnd(min, max);
//        if (code == 31) code = '\t'.charCodeAt(0);
//        rv += String.fromCharCode(code);
//      }
//      return rv;
//    }
//
//    var args = @integers(0, rnd(6)) .. @map(-> rndchars(rnd(20)));
//
//    console.log(args);
//    if (!@isBrowser) roundtripTests.bash(args);
//    roundtripTests.shellQuote(args);
//  }
//}.timeout(1000);
