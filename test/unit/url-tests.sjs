var testUtil = require('../lib/testUtil');
var testFn = testUtil.testFn;
var suite = require('sjs:test/suite');
var {test, assert, context, isWindows} = suite;
var url = require('sjs:url');
var { startsWith, lstrip } = require('sjs:string');
var { hostenv } = require('sjs:sys');
var { each } = require('sjs:sequence');

context('build query string') {||
  testFn(url, 'buildQuery', [{a:1}, {b:2}], 'a=1&b=2');
  testFn(url, 'buildQuery', {a:1,b:"foo&bar"}, "a=1&b=foo%26bar");
  testFn(url, 'buildQuery', [[[null,[{a:1,b:["x","y"]},{c:3}],[[]]]]], "a=1&b=x&b=y&c=3");
}

context('parsing') {||
  test('decodes query string') {||
    url.parse('http://example.com?q%20s=x%26').params() .. assert.eq({'q s':'x&'});
  }

  test('params() fails for invalid utf-8 sequences') {||
    var u = url.parse('http://example.com?q=%c3%28');
    assert.raises( -> u.params());
  }
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
  testFn(url, 'normalize', ["#loc1", "http://a.b/dir/foo.txt"], "http://a.b/dir/foo.txt#loc1");
  testFn(url, 'normalize', ["?x=1", "http://a.b/dir/foo.txt"], "http://a.b/dir/foo.txt?x=1");
  testFn(url, 'normalize', ["/#loc1", "http://a.b/dir/foo.txt"], "http://a.b/#loc1");
  testFn(url, 'normalize', ["bar.txt#loc1", "http://a.b/dir/foo.txt"], "http://a.b/dir/bar.txt#loc1");
}

context {|| // serverOnly()
  var fs = require('sjs:nodejs/fs');
  context("toPath") {||
    test("fails for non URL") {||
      var s = "some non-URL";
      assert.raises({message: "Not a file:// URL: #{s}"}, -> url.toPath(s));
    }

    test("fails for non-file URL") {||
      var s = "http://example.com";
      assert.raises({message: "Not a file:// URL: #{s}"}, -> url.toPath(s));
    }

    test("decodes URL escapes") {||
      if (isWindows)
        assert.eq(url.toPath("file:///foo/%20bar"), "foo\\ bar");
      else
        assert.eq(url.toPath("file:///foo/%20bar"), "/foo/ bar");
    }

    test("accepts uppercased URLs") {||
      if (isWindows)
        assert.eq(url.toPath("FILE:///FOO"), "FOO");
      else
        assert.eq(url.toPath("FILE:///FOO"), "/FOO");
    }

    test("returns relative paths", -> assert.eq(url.toPath("file://foo%20/%20bar/baz"), "foo / bar/baz")).posixOnly();
  }

  context("fileURL") {||
    context() {||
      // behaviour differs depending on environment
      if (suite.isBrowser) {
        test("leaves a relative path", -> assert.eq(url.fileURL("foo/bar"), "file://foo/bar"));
      } else {
        var tmpdir = fs.realpath(process.env['TEMP'] || '/tmp');
        var prefix = url.fileURL(tmpdir);
        // on nodejs, run this test from a known absolute cwd
        test.beforeAll {|s|
          s.cwd = process.cwd();
          process.chdir(tmpdir);
        }
        test.afterAll {|s|
          process.chdir(s.cwd);
        }

        test("resolves a relative path") {||
          url.fileURL("foo/bar") .. assert.eq(prefix + "/foo/bar");
        }
      }
    }

    test("keeps an absolute path") {||
      if(isWindows)
        assert.eq(url.fileURL("C:\\foo\\bar"), "file:///C:/foo/bar");
      else
        assert.eq(url.fileURL("/foo/bar"), "file:///foo/bar");
    }

    test("escapes URL characters") {||
      if(isWindows)
        assert.eq(url.fileURL("C:/foo/ bar#baz"), "file:///C:/foo/%20bar%23baz");
      else
        assert.eq(url.fileURL("/foo/ bar#baz"), "file:///foo/%20bar%23baz");
    }

    test("keeps trailing slash") {||
      if (isWindows) {
        assert.eq(url.fileURL("C:/foo/bar/"), "file:///C:/foo/bar/");
        assert.eq(url.fileURL("C:\\foo\\bar\\"), "file:///C:/foo/bar/");
      } else {
        assert.eq(url.fileURL("/foo/bar/"), "file:///foo/bar/");
      }
    }
  }

  context('windows file:// URIs') {||
    // Some additional sanity checks for windows file:// issues
    // see: http://blogs.msdn.com/b/ie/archive/2006/12/06/file-uris-in-windows.aspx
    
    context {||
      test('module.id starts with file:///') {||
        assert.ok(module.id .. startsWith("file:///"))
      }

      var localFile = 'file:///C:/Users/oni/sjs/a.sjs';
      test('file:// URLs are normalized correctly') {||
        assert.eq(url.normalize('../', localFile), 'file:///C:/Users/oni/');
      }

      test('toPath on absolute file:// URL') {||
        assert.eq(url.toPath(localFile), 'C:\\Users\\oni\\sjs\\a.sjs');
      }

      test("UNC path -> file:// conversion") {||
        var _url = "file://server/dir/file";
        var path = "\\\\server\\dir\\file"
        assert.eq(url.toPath(_url), path);
        assert.eq(url.fileURL(path), _url);
      }
    }.windowsOnly();
  }

  context("coerceToURL") {||
    test("coerces non-URLs to file URLs") {||
      [
        './local/file',
        'C:\\local\\file',
        '/var/local/file',
        'filename',
      ] .. each {|path|
        path .. url.coerceToURL() .. assert.eq(path .. url.fileURL);
      }
    }

    test("leaves URLs as-is") {||
      [
        'file://C:/path',
        'file:///path/to/file',
        'http://example.com/path',
        'sjs:test/run',
      ] .. each {|u|
        u .. url.coerceToURL() .. assert.eq(u);
      }
    }
  }

}.serverOnly();

