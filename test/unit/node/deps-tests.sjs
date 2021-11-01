// sanity tests of external deps
//
// These deps are tested / released independently, so this
// is just testing that our SJS wrapper works as expected.

@ = require('sjs:test/std');
@context(function() {
  @ .. @extend(require(['sjs:nodejs/tempfile', 'sjs:nodejs/rimraf', 'sjs:nodejs/mkdirp']));
  @test.beforeEach:: function(s) {
    s.root = @TemporaryDir();
  }

  @test.afterEach:: function(s) {
    require('sjs:nodejs/child-process').run('rm', ['-rf', s.root], {stdio:'inherit'});
  }

  @test("rimraf", function(s) {
    @fs.exists(s.root) .. @assert.ok();
    @fs.mkdir(@path.join(s.root, "dir"));
    @fs.writeFile(@path.join(s.root, "dir", "file"), "hello");
    @rimraf(s.root);
    @fs.exists(s.root) .. @assert.falsy();
  })

  @test("mkdirp", function(s) {
    @fs.exists(s.root) .. @assert.ok();
    var nested = @path.join(s.root, "dir", "file");
    @mkdirp(nested);
    @fs.exists(nested) .. @assert.ok();
  })
}).serverOnly();
