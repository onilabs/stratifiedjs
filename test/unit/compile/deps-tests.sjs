@ = require('sjs:test/std');
var { @compile } = require('sjs:compile/deps.js');

@context {||
  var deps = function(input) {
    var output = @compile(input);
    @logging.info('OUTPUT:', output);
    return output .. @map(pair -> pair[1]) .. @flatten;
  };

  @test("trivial requires") {||
    deps("require('mod')") .. @assert.eq(['mod']);
    deps("require('mod1'); require('mod2');") .. @assert.eq(['mod1', 'mod2']);
  }

  @test("ignores dynamic require expressions") {||
    // although we'd rather it didn't in trivial cases...
    deps("var x='mod1'; require(x);") .. @assert.eq([]);
    deps("var x='mod1'; require([x,'mod2']);") .. @assert.eq([undefined, 'mod2']);
  }

  @test("inline require expressions") {||
    deps("require('logging').log(123);") .. @assert.eq(['logging']);
  }

  @test("function argument require expressions") {||
    deps("log(require('mod'));") .. @assert.eq(['mod']);
    deps("console.log(require('mod'));") .. @assert.eq(['mod']);
  }
}.serverOnly();

