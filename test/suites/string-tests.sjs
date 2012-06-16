var testUtil = require('../lib/testUtil');
var test = testUtil.test;
var str = require('apollo:string');

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

