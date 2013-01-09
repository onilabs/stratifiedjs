var {test, time } = require('../lib/testUtil');



var sequence = require('apollo:sequence');

time("sequence test", function() {
  var dummy;
  sequence.integers() .. 
    sequence.map(x => x*x) ..
    sequence.pack(next => [next(), next()]) ..
    sequence.map([x,y] => [x*y, x+y]) ..
    sequence.unpack(x=>x) ..
    sequence.take(10000) ..
    sequence.each { 
      |x|
      dummy = x;
    }
});