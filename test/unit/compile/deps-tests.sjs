@ = require('sjs:test/std');
var { @compile } = require('sjs:compile/deps.js');

@context(function() {
  var deps = function(input) {
    var output = @compile(input);
    @logging.info('OUTPUT:', output);
    return output .. @map(pair -> pair[1]) .. @flatten;
  };

  @test("trivial requires", function() {
    deps("require('mod')") .. @assert.eq(['mod']);
    deps("require('mod1'); require('mod2');") .. @assert.eq(['mod1', 'mod2']);
  })

  @test("ignores dynamic require expressions", function() {
    // although we'd rather it didn't in trivial cases...
    deps("var x='mod1'; require(x);") .. @assert.eq([]);
    deps("var x='mod1'; require([x,'mod2']);") .. @assert.eq([undefined, 'mod2']);
  })

  @test("inline require expressions", function() {
    deps("require('logging').log(123);") .. @assert.eq(['logging']);
  })

  @test("function argument require expressions", function() {
    deps("log(require('mod'));") .. @assert.eq(['mod']);
    deps("console.log(require('mod'));") .. @assert.eq(['mod']);
  })
}).serverOnly();

