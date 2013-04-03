var testUtil = require('../lib/testUtil');
var test = testUtil.test;

var { Quasi, isQuasi, joinQuasis, mapQuasi } = require("sjs:quasi");

test('isQuasi(``)', true, function() { return isQuasi(``); });
test('isQuasi(`foo`)', true, function() { return isQuasi(`foo`); });
test('isQuasi(`foo${"bar"}baz`)', true, function() { return isQuasi(`foo${"bar"}baz`); });
test('isQuasi("")', false, function() { return isQuasi(''); });
test('isQuasi([])', false, function() { return isQuasi([]); });
test('isQuasi({})', false, function() { return isQuasi({}); });
test('isQuasi({parts:[]})', false, function() { return isQuasi({parts:[]}); });

test('isQuasi(Quasi([]))', true, function() { return isQuasi(Quasi([])); });
test('isQuasi(Quasi(["a", 1, "b"]))', true, function() { return isQuasi(Quasi(['a', 1, 'b'])); });

test('Quasi(["a", 1, "b"]) equals `a${1}b`', `a${1}b`, function() {
  return Quasi(['a', 1, 'b']);
});

test('joinQuasis(``,``) equals ``', ``, function() { return joinQuasis(``,``); });
test('joinQuasis(`a${1}`,`b`) equals `a${1}b`', `a${1}b`, function() { return joinQuasis(`a${1}`,`b`); });
test('joinQuasis(`a`,`${2}b`) equals `a${2}b`', `a${2}b`, function() { return joinQuasis(`a`,`${2}b`); });
test('joinQuasis(`a${1}`,`${2}b`) equals `a${1}${2}b`', `a${1}${2}b`, function() { return joinQuasis(`a${1}`,`${2}b`); });
test('joinQuasis(`a${1}`,`${2}b`, `${3}`) equals `a${1}${2}b${3}`', `a${1}${2}b${3}`, function() { return joinQuasis(`a${1}`,`${2}b`, `${3}`); });

test('mapQuasi(`start${0}middle${1}end`, (v) -> v + 1)', ["start",1,"middle",2,"end"], function() { return mapQuasi(`start${0}middle${1}end`, function(val) { return val + 1; }); });
