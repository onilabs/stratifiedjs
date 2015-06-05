@ = require('sjs:test/std');
@context{||
  // TODO: re-enable some of the more useful rules here
  var OPTS = {
    rules: {
      'no-redeclare': 0,
      'curly':0,
      'eqeqeq': 0,
    },
  };

  @lint = require('sjs:compile/lint');
  @doc = require('../integration/documentation');
  var root = @url.normalize('../../modules/', module.id) .. @url.toPath();
  @doc.walk(root) {|[base, dirs, files]|
    files .. @each {|filename|
      var path = @path.join(base, filename);
      //console.log(path);
      @test(filename) {||
        if(@lint.verify({filename: path, config: OPTS}) !== 0) {
          @assert.fail("Lint failed");
        }
      }
    }
  }
}.serverOnly();
