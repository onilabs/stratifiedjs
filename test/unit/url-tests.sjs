var testUtil = require('../lib/testUtil');
var testFn = testUtil.testFn;
var suite = require('sjs:test/suite');
var {test, assert, context, isWindows} = suite;
var url = require('sjs:url');
var { startsWith, lstrip } = require('sjs:string');
var { hostenv } = require('sjs:sys');
var { each } = require('sjs:sequence');

context('build query string', function() {
  testFn(url, 'buildQuery', [{a:1}, {b:2}], 'a=1&b=2');
  testFn(url, 'buildQuery', {a:1,b:"foo&bar"}, "a=1&b=foo%26bar");
  testFn(url, 'buildQuery', [[[null,[{a:1,b:["x","y"]},{c:3}],[[]]]]], "a=1&b=x&b=y&c=3");
})

context('parsing', function() {
  test('authority bug', function() {
    // this used to parse as path='/baz' and authority = 'foo.com/foo/@bar'
    // because url.parse incorrectly allowed slashes in the url userinfo part.
    url.parse('http://foo.com/foo/@bar/baz').path .. assert.eq('/foo/@bar/baz');
  })
  test('decodes query string', function() {
    url.parse('http://example.com?q%20s=x%26').params() .. assert.eq({'q s':'x&'});
  })

  test('params() fails for invalid utf-8 sequences', function() {
    var u = url.parse('http://example.com?q=%c3%28');
    assert.raises( -> u.params());
  })
})

context('build URL', function() {
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
})

context("normalize URL", function() {
  testFn(url, 'normalize', ["/foo/bar.txt", "http://a.b/c/d/baz.txt"], "http://a.b/foo/bar.txt");
  testFn(url, 'normalize', ["/foo//bar.txt", "http://a.b/c/d/baz.txt"], "http://a.b/foo/bar.txt");
  testFn(url, 'normalize', ["foo/bar.txt", "http://a.b/c/d/baz.txt"], "http://a.b/c/d/foo/bar.txt");
  testFn(url, 'normalize', ["././foo/./bar.txt", "http://a.b/c/d/"], "http://a.b/c/d/foo/bar.txt");
  testFn(url, 'normalize', [".././foo/../bar.txt", "http://a.b/c/d/"], "http://a.b/c/bar.txt");
  testFn(url, 'normalize', ["foo/bar.txt", "http://www.noendingslash"], "http://www.noendingslash/foo/bar.txt");
  testFn(url, 'normalize', ["#loc1", "http://a.b/dir/foo.txt"], "http://a.b/dir/foo.txt#loc1");
  testFn(url, 'normalize', ["?x=1", "http://a.b/dir/foo.txt"], "http://a.b/dir/foo.txt?x=1");
  testFn(url, 'normalize', ["/#loc1", "http://a.b/dir/foo.txt"], "http://a.b/#loc1");
  testFn(url, 'normalize', ["bar.txt#loc1", "http://a.b/dir/foo.txt"], "http://a.b/dir/bar.txt#loc1");
  testFn(url, 'normalize', ["../../../../bar.txt", "http://a.b/c/d/"], "http://a.b/bar.txt");
  testFn(url, 'normalize', ["..", "http://a.b/c/d/"], "http://a.b/c/");
  testFn(url, 'normalize', [".", "http://a.b/c/d/"], "http://a.b/c/d/");
  testFn(url, 'normalize', ["..", "http://a.b/c/d"], "http://a.b/");
  testFn(url, 'normalize', [".", "http://a.b/c/d"], "http://a.b/c/");
})

context(function() { // serverOnly()
  var fs = require('sjs:nodejs/fs');
  context("toPath", function() {
    test("fails for non URL", function() {
      var s = "some non-URL";
      assert.raises({message: "Not a file:// URL: #{s}"}, -> url.toPath(s));
    })

    test("fails for non-file URL", function() {
      var s = "http://example.com";
      assert.raises({message: "Not a file:// URL: #{s}"}, -> url.toPath(s));
    })

    test("decodes URL escapes", function() {
      if (isWindows)
        assert.eq(url.toPath("file:///foo/%20bar"), "foo\\ bar");
      else
        assert.eq(url.toPath("file:///foo/%20bar"), "/foo/ bar");
    })

    test("accepts uppercased URLs", function() {
      if (isWindows)
        assert.eq(url.toPath("FILE:///FOO"), "FOO");
      else
        assert.eq(url.toPath("FILE:///FOO"), "/FOO");
    })

    test("returns relative paths", -> assert.eq(url.toPath("file://foo%20/%20bar/baz"), "foo / bar/baz")).posixOnly();
  })

  context("fileURL", function() {
    context(function() {
      // behaviour differs depending on environment
      if (suite.isBrowser) {
        test("leaves a relative path", -> assert.eq(url.fileURL("foo/bar"), "file://foo/bar"));
      } else {
        var tmpdir = fs.realpath(process.env['TEMP'] || '/tmp');
        var prefix = url.fileURL(tmpdir);
        // on nodejs, run this test from a known absolute cwd
        test.beforeAll:: function(s) {
          s.cwd = process.cwd();
          process.chdir(tmpdir);
        }
        test.afterAll:: function(s) {
          process.chdir(s.cwd);
        }

        test("resolves a relative path", function() {
          url.fileURL("foo/bar") .. assert.eq(prefix + "/foo/bar");
        })
      }
    })

    test("keeps an absolute path", function() {
      if(isWindows)
        assert.eq(url.fileURL("C:\\foo\\bar"), "file:///C:/foo/bar");
      else
        assert.eq(url.fileURL("/foo/bar"), "file:///foo/bar");
    })

    test("escapes URL characters", function() {
      if(isWindows)
        assert.eq(url.fileURL("C:/foo/ bar#baz"), "file:///C:/foo/%20bar%23baz");
      else
        assert.eq(url.fileURL("/foo/ bar#baz"), "file:///foo/%20bar%23baz");
    })

    test("keeps trailing slash", function() {
      if (isWindows) {
        assert.eq(url.fileURL("C:/foo/bar/"), "file:///C:/foo/bar/");
        assert.eq(url.fileURL("C:\\foo\\bar\\"), "file:///C:/foo/bar/");
      } else {
        assert.eq(url.fileURL("/foo/bar/"), "file:///foo/bar/");
      }
    })
  })

  context('windows file:// URIs', function() {
    // Some additional sanity checks for windows file:// issues
    // see: http://blogs.msdn.com/b/ie/archive/2006/12/06/file-uris-in-windows.aspx
    
    context(function() {
      test('module.id starts with file:///', function() {
        assert.ok(module.id .. startsWith("file:///"))
      })

      var localFile = 'file:///C:/Users/oni/sjs/a.sjs';
      test('file:// URLs are normalized correctly', function() {
        assert.eq(url.normalize('../', localFile), 'file:///C:/Users/oni/');
      })

      test('toPath on absolute file:// URL', function() {
        assert.eq(url.toPath(localFile), 'C:\\Users\\oni\\sjs\\a.sjs');
      })

      test("UNC path -> file:// conversion", function() {
        var _url = "file://server/dir/file";
        var path = "\\\\server\\dir\\file"
        assert.eq(url.toPath(_url), path);
        assert.eq(url.fileURL(path), _url);
      })
    }).windowsOnly();
  })

  context("coerceToURL", function() {
    test("coerces non-URLs to file URLs", function() {
      [
        './local/file',
        'C:\\local\\file',
        '/var/local/file',
        'filename',
      ] .. each {|path|
        path .. url.coerceToURL() .. assert.eq(path .. url.fileURL);
      }
    })

    test("leaves URLs as-is", function() {
      [
        'file://C:/path',
        'file:///path/to/file',
        'http://example.com/path',
        'sjs:test/run',
      ] .. each {|u|
        u .. url.coerceToURL() .. assert.eq(u);
      }
    })
  })

  context("coerceToPath", function() {
    test("leave non-URLs as-is", function() {
      [
        './local/file',
        'C:\\local\\file',
        '/var/local/file',
        'filename',
      ] .. each {|path|
        path .. url.coerceToPath() .. assert.eq(path);
      }
    })

    test("coerce 'file:' URLs to paths", function() {
      [
        'file://C:/path',
        'file:///path/to/file',
        'file:test/run',
      ] .. each {|u|
        u .. url.coerceToPath() .. assert.eq(u .. url.toPath);
      }
    })
  })

}).serverOnly();

