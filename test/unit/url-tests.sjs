var testUtil = require('../lib/testUtil');
var testFn = testUtil.testFn;
var suite = require('sjs:test/suite');
var {test, assert, context} = suite;
var url = require('sjs:url');

context('build query string') {||
  testFn(url, 'buildQuery', [{a:1}, {b:2}], 'a=1&b=2');
  testFn(url, 'buildQuery', {a:1,b:"foo&bar"}, "a=1&b=foo%26bar");
  testFn(url, 'buildQuery', [[[null,[{a:1,b:["x","y"]},{c:3}],[[]]]]], "a=1&b=x&b=y&c=3");
}

context('build URL') {||
  testFn(url, 'build', ["foo.txt"], "foo.txt");
  testFn(url, 'build', ["foo", "bar", "foo.txt"], "foo/bar/foo.txt");
  testFn(url, 'build', ["foo/", "/bar/"], "foo/bar/");
  testFn(url, 'build', ["foo?a=b"], "foo?a=b");
  testFn(url, 'build', ["foo?a=b", {b:1}], "foo?a=b&b=1");
  testFn(url, 'build', ["foo?a=b", {b:[1,2]}], "foo?a=b&b=1&b=2");
  testFn(url, 'build', ["foo?a=b", [{b:[1,2]}]], "foo?a=b&b=1&b=2");
  testFn(url, 'build', ["http://foo", "bar"], "http://foo/bar");
  testFn(url, 'build', [["http://foo", {bar:"x", zz:"w"}, {foo:[1,2,3]}]], "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3");
  testFn(url, 'build', [[["http://foo", {bar:"x", zz:"w"}], [{foo:[1,2,3]}]]], "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3");
}

context("normalize URL") {||
  testFn(url, 'normalize', ["/foo/bar.txt", "http://a.b/c/d/baz.txt"], "http://a.b/foo/bar.txt");
  testFn(url, 'normalize', ["foo/bar.txt", "http://a.b/c/d/baz.txt"], "http://a.b/c/d/foo/bar.txt");
  testFn(url, 'normalize', ["././foo/./bar.txt", "http://a.b/c/d/"], "http://a.b/c/d/foo/bar.txt");
  testFn(url, 'normalize', [".././foo/../bar.txt", "http://a.b/c/d/"], "http://a.b/c/bar.txt");
  testFn(url, 'normalize', ["foo/bar.txt", "http://www.noendingslash"], "http://www.noendingslash/foo/bar.txt");
}

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
  test("returns relative paths", -> assert.eq(url.toPath("file://foo%20/%20bar/baz"), "foo / bar/baz"));
  test("accepts uppercased URLs", -> assert.eq(url.toPath("FILE:///FOO/"), "/FOO/"));
}

context("fileURL") {||
  context() {||
    // behaviour differs depending on environment
    if (suite.isBrowser) {
      test("leaves a relative path", -> assert.eq(url.fileURL("foo/bar"), "file://foo/bar"));
    } else {
      // on nodejs, run this test from a known absolute cwd
      test.beforeAll {|s|
        s.cwd = process.cwd();
        process.chdir("/tmp");
      }
      test.afterAll {|s|
        process.chdir(s.cwd);
      }

      test("resolves a relative path", -> assert.eq(url.fileURL("foo/bar"), "file:///tmp/foo/bar"));
    }
  }

  test("keeps an absolute path", -> assert.eq(url.fileURL("/foo/bar"), "file:///foo/bar"));
  test("escapes URL characters", -> assert.eq(url.fileURL("/foo/ bar"), "file:///foo/%20bar"));
}

