var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var {test, assert, context} = require('sjs:test/suite');
var http = require('sjs:http');

context("constructQueryString/constructURL") {||

  testEq('constructQueryString({a:1},{b:2})', "a=1&b=2", function() {
    return http.constructQueryString({a:1},{b:2});
  });


  testEq('constructQueryString({a:1,b:"foo&bar"})', "a=1&b=foo%26bar", function() {
    return http.constructQueryString({a:1,b:"foo&bar"});
  });

  testEq('constructQueryString([[null,[{a:1,b:["x","y"]},{c:3}],[[]]]])',
      "a=1&b=x&b=y&c=3", function() {
    return http.constructQueryString([[null,[{a:1,b:['x','y']},{c:3}],[[]]]]);
  });

  testEq('constructURL("foo.txt")', "foo.txt", function () {
    return http.constructURL("foo.txt");
  });

  testEq('constructURL("foo", "bar", "foo.txt")', "foo/bar/foo.txt", function () {
    return http.constructURL("foo", "bar", "foo.txt");
  });

  testEq('constructURL("foo/", "/bar/")', "foo/bar/", function () {
    return http.constructURL("foo/", "/bar/");
  });

  testEq('constructURL("foo?a=b")', "foo?a=b", function () {
    return http.constructURL("foo?a=b");
  });

  testEq('constructURL("foo?a=b", {b:1})', "foo?a=b&b=1", function () {
    return http.constructURL("foo?a=b", {b:1});
  });

  testEq('constructURL("foo?a=b", {b:[1,2]})', "foo?a=b&b=1&b=2", function () {
    return http.constructURL("foo?a=b", {b:[1,2]});
  });

  testEq('constructURL("foo?a=b", [{b:[1,2]}])', "foo?a=b&b=1&b=2", function () {
    return http.constructURL("foo?a=b", [{b:[1,2]}]);
  });

  testEq('constructURL(["http://foo", {bar:"x", zz:"w"}, {foo:[1,2,3]}])',
      "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3",
      function() {
        return http.constructURL(["http://foo", {bar:"x", zz:"w"}, {foo:[1,2,3]}]);
      });

  testEq('constructURL([["http://foo", {bar:"x", zz:"w"}], [{foo:[1,2,3]}]])',
      "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3",
      function() {
        return http.constructURL([["http://foo", {bar:"x", zz:"w"}], [{foo:[1,2,3]}]]);
      });

}

context("canonicalizeURL") {||

  testEq('canonicalizeURL("/foo/bar.txt", "http://a.b/c/d/baz.txt")',
      "http://a.b/foo/bar.txt",
      function() {
        return http.canonicalizeURL("/foo/bar.txt", "http://a.b/c/d/baz.txt");
      });

  testEq('canonicalizeURL("foo/bar.txt", "http://a.b/c/d/baz.txt")',
      "http://a.b/c/d/foo/bar.txt",
      function() {
        return http.canonicalizeURL("foo/bar.txt", "http://a.b/c/d/baz.txt");
      });

  testEq('canonicalizeURL("././foo/./bar.txt", "http://a.b/c/d/")',
      "http://a.b/c/d/foo/bar.txt",
      function() {
        return http.canonicalizeURL("././foo/./bar.txt", "http://a.b/c/d/");
      });

  testEq('canonicalizeURL(".././foo/../bar.txt", "http://a.b/c/d/")',
      "http://a.b/c/bar.txt",
      function() {
        return http.canonicalizeURL(".././foo/../bar.txt", "http://a.b/c/d/");
      });

  testEq('canonicalizeURL("foo/bar.txt", "http://www.noendingslash")',
      "http://www.noendingslash/foo/bar.txt",
      function() {
        return http.canonicalizeURL("foo/bar.txt", "http://www.noendingslash");
      });

  test('node.js request fails on non-http URLs', function() {
    assert.raises({message: 'Unsupported protocol: file'}, -> http.request('file:///'));
  }).serverOnly();

}

