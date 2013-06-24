var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var testFn = testUtil.testFn;
var str = require('sjs:string');
var {test, context, assert} = require('sjs:test/suite');

context("isString") {||
  test("on primitive", -> assert.ok(str.isString("str!")));
  test("on object", -> assert.ok(str.isString(new String("str!"))));
}

testEq('utf16ToUtf8', 'c692', function() {
  // f with hook = U+0192 = c6 92 in utf-8
  var utf16 = '\u0192';
  var utf8 = str.utf16ToUtf8(utf16);
  return utf8.charCodeAt(0).toString(16) + utf8.charCodeAt(1).toString(16);
});

testEq('utf8ToUtf16', 402, function() {
  // f with hook = U+0192 = c6 92 in utf-8
  var utf8 = String.fromCharCode(198) + String.fromCharCode(146);
  return str.utf8ToUtf16(utf8).charCodeAt(0);
});

testEq('octetsToBase64 1', 'YW55IGNhcm5hbCBwbGVhc3VyZS4=', function() {
  return str.octetsToBase64('any carnal pleasure.');
});

testEq('octetsToBase64 2', 'YW55IGNhcm5hbCBwbGVhc3VyZQ==', function() {
  return str.octetsToBase64('any carnal pleasure');
});

testEq('octetsToBase64 3', 'YW55IGNhcm5hbCBwbGVhc3Vy', function() {
  return str.octetsToBase64('any carnal pleasur');
});

testEq('octetsToBase64 4', 'YW55IGNhcm5hbCBwbGVhc3U=', function() {
  return str.octetsToBase64('any carnal pleasu');
});

testEq('base64ToOctets 1', 'any carnal pleasure.', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3VyZS4=');
});

testEq('base64ToOctets 2', 'any carnal pleasure', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3VyZQ==');
});

testEq('base64ToOctets 3', 'any carnal pleasur', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3Vy');
});

testEq('base64ToOctets 4', 'any carnal pleasu', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3U=');
});

testEq('base64ToOctets 5 (no padding)', 'any carnal pleasure.', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3VyZS4');
}).skip('not supported');

testEq('base64ToOctets 6 (no padding)', 'any carnal pleasure', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3VyZQ');
}).skip('not supported');

testEq('base64ToOctets(octetsToBase64)', true, function() {
  var octets = "";
  for (var i=0; i<256; ++i)
    octets += String.fromCharCode(i);
  if (octets.length != 256) return "length mismatch 1 ("+octets.length+")";
  octets = str.base64ToOctets(str.octetsToBase64(octets));
  if (octets.length != 256) return "length mismatch 2 ("+octets.length+")";
  for (var i=0; i<256; ++i)
    if (octets.charCodeAt(i) != i) return "mismatch at "+i;
  return true;  
});

testEq('supplant', "Hello world 1", function() {
  return str.supplant("Hello {who} {version}", {who:"world", version:1});
});

testEq('supplant evaluates functions', "Hello world 2", function() {
  var ctx = {
    who: "world",
    version: 1,
    nextVersion: function() { return this.version + 1; }
  };
  return str.supplant("Hello {who} {nextVersion}", ctx);
});

testEq('supplant strictness', "No substitution found for \"who\"", function() {
  try {
    return str.supplant("Hello {who}", {version:1});
  } catch (e) {
    return e.message;
  }
});

testEq('sanitize', "abc&amp;foo;def&gt;ght&lt;", function() {
  return str.sanitize("abc&foo;def>ght<");
});

context("substring tests") {||
  testEq('startsWith("foo", "oo")', false, function() { return str.startsWith("foo", "oo"); });
  testEq('startsWith("foo", "foo")', true, function() { return str.startsWith("foo", "foo"); });
  testEq('startsWith("foo", "f")', true, function() { return str.startsWith("foo", "f"); });
  testEq('startsWith("one two one", "one")', true, function() { return str.startsWith("one two one", "one"); });

  testEq('endsWith("bar", "b")', false, function() { return str.endsWith("bar", "b"); });
  testEq('endsWith("bar", "bar")', true, function() { return str.endsWith("bar", "bar"); });
  testEq('endsWith("bar", "r")', true, function() { return str.endsWith("bar", "r"); });
  testEq('endsWith("one two one", "one")', true, function() { return str.endsWith("one two one", "one"); });

  test('contains("abcd", "bc")', -> str.contains("abcd", "bc") .. assert.ok());
  test('contains("abcd", "ba")', -> str.contains("abcd", "ba") .. assert.notOk());
}

context('strip') {||
  testEq('strip("\\t foo ")', 'foo', function() { return str.strip("\t foo "); });
  testEq('strip(",,foo,", ",")', 'foo', function() { return str.strip(",,foo,", ","); });
  testEq('strip("foo,bar,", ",")', 'foo,bar', function() { return str.strip("foo,bar,", ","); });

  testEq('lstrip("\\t foo ")', 'foo ', function() { return str.lstrip("\t foo "); });
  testEq('lstrip("||foo|", "|")', 'foo|', function() { return str.lstrip("||foo|", "|"); });

  testEq('rstrip(" foo\\t ")', ' foo', function() { return str.rstrip(" foo\t "); });
  testEq('rstrip("|foo||", "|")', '|foo', function() { return str.rstrip("|foo||", "|"); });
}

context('split') {||
  testFn(str, 'split', ['a b c d', ' ', 2], ['a','b','c d']);
  testFn(str, 'split', ['a b c d', ' ', 1], ['a','b c d']);
  testFn(str, 'split', ['a b c', ' ', 2], ['a','b','c']);
  testFn(str, 'split', ['a b', ' ', 2], ['a','b']);

  testFn(str, 'rsplit', ['a b c d', ' ', 2], ['a b','c', 'd']);
  testFn(str, 'rsplit', ['a b c d', ' ', 1], ['a b c', 'd']);
  testFn(str, 'rsplit', ['a b c', ' ', 2], ['a','b','c']);
  testFn(str, 'rsplit', ['a b', ' ', 2], ['a','b']);
}

context('padding') {||
  testFn(str, 'padLeft', ['x', 5     ], '    x');
  testFn(str, 'padLeft', ['x', 5, '-'], '----x');
  testFn(str, 'padRight',['x', 5     ], 'x    ');
  testFn(str, 'padRight',['x', 5, '-'], 'x----');

  testFn(str, 'padBoth', ['x' , 5     ], '  x  ');
  testFn(str, 'padBoth', ['x' , 5, '-'], '--x--');
  testFn(str, 'padBoth', ['xy', 5     ], '  xy ');
  testFn(str, 'padBoth', ['xy', 5, '-'], '--xy-');
  testFn(str, 'padBoth', ['xy', 6     ], '  xy  ');
  testFn(str, 'padBoth', ['xy', 6, '-'], '--xy--');

  testFn(str, 'padLeft', [123, 2], '123');
  testFn(str, 'padRight',[123, 2], '123');
  testFn(str, 'padBoth', [123, 2], '123');

}
