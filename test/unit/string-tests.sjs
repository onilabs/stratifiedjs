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

test('supplant escaping') {||
  str.supplant("Hello \\{world} {version}", {version:1}) .. assert.eq('Hello {world} 1');
  
  // unbalanced brackets
  str.supplant("Hello \\{world {version}", {version:1}) .. assert.eq('Hello {world 1');
  str.supplant("Hello world {version}}", {version:1}) .. assert.eq('Hello world 1}');

  // escaping backslashes
  str.supplant("Hello \\\\{who}", {who:'world'}) .. assert.eq('Hello \\world');
};

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

testEq('sanitize quotes', "foo&#39;s and &quot;bars&quot;", function() {
  return str.sanitize("foo's and \"bars\"");
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

  test('substrings longer than inputs') {||
    // because indexOf() returns -1 on failure, we have to special case suffixes that are 1 char longer then the source
    'xxx' .. str.endsWith('yyyy') .. assert.eq(false);
    'xxx' .. str.startsWith('yyyy') .. assert.eq(false);
  }
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
  var NPG = ''.match(/(.)?/)[1]; // non-participating group result. This varies across browser, but we take whatever we get in `split`

  testFn(str, 'split', ['a b c d', ' ', 2], ['a','b','c d']);
  testFn(str, 'split', ['a b c d', ' ', 1], ['a','b c d']);
  testFn(str, 'split', ['a b c', ' ', 2], ['a','b','c']);
  testFn(str, 'split', ['a b', ' ', 2], ['a','b']);

  testFn(str, 'rsplit', ['a b c d', ' ', 2], ['a b','c', 'd']);
  testFn(str, 'rsplit', ['a b c d', ' ', 1], ['a b c', 'd']);
  testFn(str, 'rsplit', ['a b c', ' ', 2], ['a','b','c']);
  testFn(str, 'rsplit', ['a b', ' ', 2], ['a','b']);

  testFn(str, 'split', ['a b  c d', / /, 2], ['a','b', ' c d']);
  testFn(str, 'split', ['bbaaccaaddaaee', /aa/, 2], ['bb', 'cc', 'ddaaee']);
  testFn(str, 'split', ['a b  c d', /( )/, 2], ['a', ' ', 'b', ' ', ' c d']);
  testFn(str, 'split', ['a b    ', /( +)/], ['a',' ', 'b', '    ', '']);
  testFn(str, 'split', ['a b .c', /( +(\.)?)/], ['a',' ', NPG, 'b', ' .', '.', 'c']);

  testFn(str, 'rsplit', [' a  b c d', / /, 2], [' a  b','c', 'd']);
  testFn(str, 'rsplit', ['aabbaaccaaddaaee', /aa/, 2], ['aabbaacc', 'dd', 'ee']);
  testFn(str, 'rsplit', ['a b  c d', /( )/, 2], ['a b ', ' ', 'c', ' ', 'd']);
  testFn(str, 'rsplit', ['a b    ', /( +)/], ['a',' ', 'b', '    ', '']);
  testFn(str, 'rsplit', ['a b .c', /( +(\.)?)/], ['a',' ', NPG, 'b', ' .', '.', 'c']);

  test('split edge cases') {||
    // from http://stevenlevithan.com/demo/split.cfm
    var split = str.split;
    ''..split()                                   .. assert.eq([""]);
    ''..split(/./)                                .. assert.eq([""]);
    ''..split(/.?/)                               .. assert.eq([]);
    ''..split(/.??/)                              .. assert.eq([]);
    'ab'..split(/a*/)                             .. assert.eq(["", "b"]);
    'ab'..split(/a*?/)                            .. assert.eq(["a", "b"]);
    'ab'..split(/(?:ab)/)                         .. assert.eq(["", ""]);
    'ab'..split(/(?:ab)*/)                        .. assert.eq(["", ""]);
    'ab'..split(/(?:ab)*?/)                       .. assert.eq(["a", "b"]);
    'test'..split('')                             .. assert.eq(["t", "e", "s", "t"]);
    'test'..split()                               .. assert.eq(["test"]);
    '111'..split(1)                               .. assert.eq(["", "", "", ""]);
    'test'..split(/(?:)/, 2)                      .. assert.eq(["t", "e", "st"]);
    'test'..split(/(?:)/, undefined)              .. assert.eq(["t", "e", "s", "t"]);
    'a'..split(/-/)                               .. assert.eq(["a"]);
    'a'..split(/-?/)                              .. assert.eq(["a"]);
    'a'..split(/-??/)                             .. assert.eq(["a"]);
    'a'..split(/a/)                               .. assert.eq(["", ""]);
    'a'..split(/a?/)                              .. assert.eq(["", ""]);
    'a'..split(/a??/)                             .. assert.eq(["a"]);
    'ab'..split(/-/)                              .. assert.eq(["ab"]);
    'ab'..split(/-?/)                             .. assert.eq(["a", "b"]);
    'ab'..split(/-??/)                            .. assert.eq(["a", "b"]);
    'a-b'..split(/-/)                             .. assert.eq(["a", "b"]);
    'a-b'..split(/-?/)                            .. assert.eq(["a", "b"]);
    'a-b'..split(/-??/)                           .. assert.eq(["a", "-", "b"]);
    'a--b'..split(/-/)                            .. assert.eq(["a", "", "b"]);
    'a--b'..split(/-?/)                           .. assert.eq(["a", "", "b"]);
    'a--b'..split(/-??/)                          .. assert.eq(["a", "-", "-", "b"]);
    ''..split(/()()/)                             .. assert.eq([]);
    '.'..split(/()()/)                            .. assert.eq(["."]);
    '.'..split(/(.?)(.?)/)                        .. assert.eq(["", ".", "", ""]);
    '.'..split(/(.??)(.??)/)                      .. assert.eq(["."]);
    '.'..split(/(.)?(.)?/)                        .. assert.eq(["", ".", NPG, ""]);
    'tesst'..split(/(s)*/)                        .. assert.eq(["t", NPG, "e", "s", "t"]);
    'tesst'..split(/(s)*?/)                       .. assert.eq(["t", NPG, "e", NPG, "s", NPG, "s", NPG, "t"]);
    'tesst'..split(/(s*)/)                        .. assert.eq(["t", "", "e", "ss", "t"]);
    'tesst'..split(/(s*?)/)                       .. assert.eq(["t", "", "e", "", "s", "", "s", "", "t"]);
    'tesst'..split(/(?:s)*/)                      .. assert.eq(["t", "e", "t"]);
    'tesst'..split(/(?=s+)/)                      .. assert.eq(["te", "s", "st"]);
    'test'..split('t')                            .. assert.eq(["", "es", ""]);
    'test'..split('es')                           .. assert.eq(["t", "t"]);
    'test'..split(/t/)                            .. assert.eq(["", "es", ""]);
    'test'..split(/es/)                           .. assert.eq(["t", "t"]);
    'test'..split(/(t)/)                          .. assert.eq(["", "t", "es", "t", ""]);
    'test'..split(/(es)/)                         .. assert.eq(["t", "es", "t"]);
    'test'..split(/(t)(e)(s)(t)/)                 .. assert.eq(["", "t", "e", "s", "t", ""]);
    '.'..split(/(((.((.??)))))/)                  .. assert.eq(["", ".", ".", ".", "", "", ""]);
    '.'..split(/(((((.??)))))/)                   .. assert.eq(["."]);

    ('A<B>bold</B>and' +
      '<CODE>coded</CODE>')..split(/<(\/)?([^<>]+)>/) .. assert.eq(["A", NPG, "B", "bold", "/", "B", "and", NPG, "CODE", "coded", "/", "CODE", ""]);
  }
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

context('unindent') {||
  testFn(str, 'unindent', ['foo'], 'foo');
  testFn(str, 'unindent', ['  foo'], 'foo');
  testFn(str, 'unindent', ['  foo', 1], ' foo');
  testFn(str, 'unindent', ['  foo  \n  bar  \n   baz'], 'foo  \nbar  \n baz');
  testFn(str, 'unindent', ['  foo  \n  bar  \n   baz', 2], 'foo  \nbar  \n baz');
  testFn(str, 'unindent', ['  foo  \n  bar  \n   baz', 1], ' foo  \n bar  \n  baz');
  testFn(str, 'unindent', ['\t  foo  \n   bar  \n  \t baz'], 'foo  \nbar  \n baz');
  testFn(str, 'unindent', ['\t  foo  \n   bar  \n  \t baz', 2], ' foo  \n bar  \n\t baz');
  testFn(str, 'unindent', ['  foo  \n bar  \n   baz'], 'foo  \n bar  \n baz');

}

context('capitalize') {||
  testFn(str, 'capitalize', ['foo bar'], 'Foo bar');  
  testFn(str, 'capitalize', [' foo bar'], ' foo bar');  
  testFn(str, 'capitalize', ['f'], 'F');  
  testFn(str, 'capitalize', [''], '');
}

testEq('octetsToArrayBuffer', ['a','b','c'], function() {
  var buf = str.octetsToArrayBuffer('abc');
  var rv = [];
  var view = new Uint8Array(buf);
  for (var i=0; i<view.byteLength; ++i)
    rv.push(String.fromCharCode(view[i]));
  return rv;
});

testEq('octetsToArrayBuffer, provided buffer', ['a','b','c'], function() {
  var buf = str.octetsToArrayBuffer('abc', new ArrayBuffer(3));
  var rv = [];
  var view = new Uint8Array(buf);
  for (var i=0; i<view.byteLength; ++i)
    rv.push(String.fromCharCode(view[i]));
  return rv;
});

testEq('octetsToArrayBuffer, provided buffer, offset', ['a','b','c'], function() {
  var buf = str.octetsToArrayBuffer('abc', new ArrayBuffer(4), 1);
  var rv = [];
  var view = new Uint8Array(buf);
  for (var i=1; i<view.byteLength; ++i)
    rv.push(String.fromCharCode(view[i]));
  return rv;
});

testEq('arrayBufferToOctets', 'abc', function() {
  var arr = new Uint8Array(['a'.charCodeAt(0), 'b'.charCodeAt(0), 'c'.charCodeAt(0)]);
  return str.arrayBufferToOctets(arr.buffer);
});

testEq('arrayBufferToOctets, offset', 'abc', function() {
  var arr = new Uint8Array([0, 'a'.charCodeAt(0), 'b'.charCodeAt(0), 'c'.charCodeAt(0)]);
  return str.arrayBufferToOctets(arr.buffer, 1);
});

testEq('arrayBufferToOctets, offset, length', 'abc', function() {
  var arr = new Uint8Array([0, 'a'.charCodeAt(0), 'b'.charCodeAt(0), 'c'.charCodeAt(0), 0]);
  return str.arrayBufferToOctets(arr.buffer, 1, 3);
});

testEq('arrayBufferToOctets: large inputs', true, function() {
  var arr = new Uint8Array(600000);
  // this used to cause a 'maximum call stack size exceeded' error
  str.arrayBufferToOctets(arr.buffer);
  return true;
});

context {||
  var cafebuf = new Buffer('636166c3a9', 'hex');
  var cafestr = 'caf\u00e9';

  test("encode") {||
    cafestr .. str.encode('utf-8') .. assert.eq(cafebuf);
    str.encode('utf-8')(cafestr) .. assert.eq(cafebuf);
    assert.raises({message:"Not a string"},
      -> str.encode(new Buffer([]), 'hex'));
  }

  test('decode') {||
    cafebuf .. str.decode('utf-8') .. assert.eq(cafestr);
    str.decode('utf-8')(cafebuf) .. assert.eq(cafestr);
    assert.raises({message:"Not a buffer"},
      -> str.decode('str', 'hex'));
  }
}.serverOnly();
