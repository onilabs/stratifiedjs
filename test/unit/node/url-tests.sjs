var {context, test, assert} = require("sjs:test/suite");
context {||

var url = require("sjs:nodejs/url");

context("toPath") {||
  test("fails for non URL") {||
    var s = "some non-URL";
    assert.raises({message: "Not a file:// URL: #{s}"}, -> url.toPath(s));
  }

  test("fails for non-file URL") {||
    var s = "http://example.com";
    assert.raises({message: "Not a file:// URL: #{s}"}, -> url.toPath(s));
  }

  test("decodes URL escapes", -> assert.eq(url.toPath("file:///foo%20bar"), "/foo bar"));
  test("returns relative paths", -> assert.eq(url.toPath("file://foo%20/%20bar"), "foo / bar"));
  test("accepts uppercased URLs", -> assert.eq(url.toPath("FILE:///FOO/"), "/FOO/"));
}

context("fromPath") {||
  test.beforeAll {|s|
    s.cwd = process.cwd();
    process.chdir("/tmp");
  }
  test.afterAll {|s|
    process.chdir(s.cwd);
  }

  test("resolves a relative path", -> assert.eq(url.fromPath("foo/bar"), "file:///tmp/foo/bar"));
  test("keeps an absolute path", -> assert.eq(url.fromPath("/foo/bar"), "file:///foo/bar"));
  test("escapes URL characters", -> assert.eq(url.fromPath("/foo/ bar"), "file:///foo/%20bar"));
}

}.serverOnly();
