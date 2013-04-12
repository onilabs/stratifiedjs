var testUtil = require('../lib/testUtil');
var test = testUtil.test;
var str = require('sjs:string');

test('utf16ToUtf8', 'c692', function() {
  // f with hook = U+0192 = c6 92 in utf-8
  var utf16 = '\u0192';
  var utf8 = str.utf16ToUtf8(utf16);
  return utf8.charCodeAt(0).toString(16) + utf8.charCodeAt(1).toString(16);
});

test('utf8ToUtf16', 402, function() {
  // f with hook = U+0192 = c6 92 in utf-8
  var utf8 = String.fromCharCode(198) + String.fromCharCode(146);
  return str.utf8ToUtf16(utf8).charCodeAt(0);
});

test('octetsToBase64 1', 'YW55IGNhcm5hbCBwbGVhc3VyZS4=', function() {
  return str.octetsToBase64('any carnal pleasure.');
});

test('octetsToBase64 2', 'YW55IGNhcm5hbCBwbGVhc3VyZQ==', function() {
  return str.octetsToBase64('any carnal pleasure');
});

test('octetsToBase64 3', 'YW55IGNhcm5hbCBwbGVhc3Vy', function() {
  return str.octetsToBase64('any carnal pleasur');
});

test('octetsToBase64 4', 'YW55IGNhcm5hbCBwbGVhc3U=', function() {
  return str.octetsToBase64('any carnal pleasu');
});

test('base64ToOctets 1', 'any carnal pleasure.', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3VyZS4=');
});

test('base64ToOctets 2', 'any carnal pleasure', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3VyZQ==');
});

test('base64ToOctets 3', 'any carnal pleasur', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3Vy');
});

test('base64ToOctets 4', 'any carnal pleasu', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3U=');
});

test('base64ToOctets 5 (no padding)', 'any carnal pleasure.', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3VyZS4');
}).skip('not supported');

test('base64ToOctets 6 (no padding)', 'any carnal pleasure', function() {
  return str.base64ToOctets('YW55IGNhcm5hbCBwbGVhc3VyZQ');
}).skip('not supported');

test('base64ToOctets(octetsToBase64)', true, function() {
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

test('supplant', "Hello world 1", function() {
  return str.supplant("Hello {who} {version}", {who:"world", version:1});
});

test('supplant evaluates functions', "Hello world 2", function() {
  var ctx = {
    who: "world",
    version: 1,
    nextVersion: function() { return this.version + 1; }
  };
  return str.supplant("Hello {who} {nextVersion}", ctx);
});

test('supplant strictness', "No substitution found for \"who\"", function() {
  try {
    return str.supplant("Hello {who}", {version:1});
  } catch (e) {
    return e.message;
  }
});

test('sanitize', "abc&amp;foo;def&gt;ght&lt;", function() {
  return str.sanitize("abc&foo;def>ght<");
});

test('startsWith("foo", "oo")', false, function() { return str.startsWith("foo", "oo"); });
test('startsWith("foo", "foo")', true, function() { return str.startsWith("foo", "foo"); });
test('startsWith("foo", "f")', true, function() { return str.startsWith("foo", "f"); });
test('startsWith("one two one", "one")', true, function() { return str.startsWith("one two one", "one"); });

test('endsWith("bar", "b")', false, function() { return str.endsWith("bar", "b"); });
test('endsWith("bar", "bar")', true, function() { return str.endsWith("bar", "bar"); });
test('endsWith("bar", "r")', true, function() { return str.endsWith("bar", "r"); });
test('endsWith("one two one", "one")', true, function() { return str.endsWith("one two one", "one"); });

test('strip("\\t foo ")', 'foo', function() { return str.strip("\t foo "); });
test('strip(",,foo,", ",")', 'foo', function() { return str.strip(",,foo,", ","); });
test('strip("foo,bar,", ",")', 'foo,bar', function() { return str.strip("foo,bar,", ","); });

test('lstrip("\\t foo ")', 'foo ', function() { return str.lstrip("\t foo "); });
test('lstrip("||foo|", "|")', 'foo|', function() { return str.lstrip("||foo|", "|"); });

test('rstrip(" foo\\t ")', ' foo', function() { return str.rstrip(" foo\t "); });
test('rstrip("|foo||", "|")', '|foo', function() { return str.rstrip("|foo||", "|"); });
