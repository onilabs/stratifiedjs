var testUtil = require('../lib/testUtil');
var test = testUtil.test;

var s = require("apollo:sequence");

test("each(['a','b','c'], f)", 'abc', function() {
  var rv = "";
  s.each(['a','b','c'], function(x) { rv += x });
  return rv;
});

test("each(['a','b','c']) {|x| ...}", 'abc', function() {
  var rv = "";
  s.each(['a','b','c']) { |x| rv += x };
  return rv;
});

test("['a','b','c'] .. each{|x| ...}", 'abc', function() {
  var rv = "";
  ['a','b','c'] .. s.each { |x| rv += x };
  return rv;
});

test("'abc' .. each{|x| ...}", 'abc', function() {
  var rv = "";
  'abc' .. s.each { |x| rv += x };
  return rv;
});

test("['a','b','c'] .. iterate{ |next| ...}", 'abc', function() {
  var rv = "", eos = {};
  ['a','b','c'] .. s.iterate(eos) { 
    |next|
    var x;
    while((x = next()) != eos)
      rv += x;
  }
  return rv;
});

test("['a','b','c'] .. iterate{ |next| hold(.) ...}", 'abcx', function() {
  var rv = "", eos = 'x';
  ['a','b','c'] .. s.iterate(eos) { 
    |next|
    var x;
    hold(10);
    while((x = next()) != eos) {
      hold(10);
      rv += x;
    }
    // try to retrieve another eos:
    rv += next();
  }
  return rv;
});

test("'abcdefghij' .. parallelize(5) .. each", 'abcdefghij', function() {
  var rv = '';
  var eachs = 0, max_concurrent_eachs = 0;
  'abcdefghij' .. s.parallelize(5) .. s.each {
    |x|
    ++eachs;
    max_concurrent_eachs = Math.max(eachs, max_concurrent_eachs);
    rv += x;
    hold(Math.random()*100);
    --eachs;
  }
  if (max_concurrent_eachs != 5) return "Parallelism didn't feed through";
  return rv;
});


test("'abcdefghij' .. parallelize(5) .. iterate", 'abcdefghij', function() {
  var rv = '';
  var loops = 0;
  'abcdefghij' .. s.parallelize(5) .. s.iterate {
    |next|
    var x;
    ++loops;
    while (x = next()) {
      rv += x;
      hold(Math.random()*100);
    }
  }
  if (loops != 5) return "Parallelism didn't feed through";
  return rv;
});

test("isStream()", true, function() {
  return !s.isStream([1,2,3,4]) && s.isStream([1,2,3,4] .. s.take(5));
});
