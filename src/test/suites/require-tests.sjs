var test = require('../testUtil').test;
test('force extension/sjs', "a=1&b=2", function() {
  return require('apollo:http.sjs').constructQueryString({a:1},{b:2});
});

test('force extension/js', 42, function() {
  return require('../data/testmodule.js').foo(1);
});

test('"this" object in modules', this, function() {
  return require('../data/testmodule.js').bar.apply(window);
});
