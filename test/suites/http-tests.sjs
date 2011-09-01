var testUtil = require('../testUtil');
var test = testUtil.test;
var http = require('apollo:http');
//----------------------------------------------------------------------
// constructQueryString/constructURL

test('constructQueryString({a:1},{b:2})', "a=1&b=2", function() {
  return http.constructQueryString({a:1},{b:2});
});


test('constructQueryString({a:1,b:"foo&bar"})', "a=1&b=foo%26bar", function() {
  return http.constructQueryString({a:1,b:"foo&bar"});
});

test('constructQueryString([[null,[{a:1,b:["x","y"]},{c:3}],[[]]]])',
     "a=1&b=x&b=y&c=3", function() {
  return http.constructQueryString([[null,[{a:1,b:['x','y']},{c:3}],[[]]]]);
});

test('constructURL("foo.txt")', "foo.txt", function () {
  return http.constructURL("foo.txt");
});

test('constructURL("foo", "bar", "foo.txt")', "foo/bar/foo.txt", function () {
  return http.constructURL("foo", "bar", "foo.txt");
});

test('constructURL("foo/", "/bar/")', "foo/bar/", function () {
  return http.constructURL("foo/", "/bar/");
});

test('constructURL("foo?a=b")', "foo?a=b", function () {
  return http.constructURL("foo?a=b");
});

test('constructURL("foo?a=b", {b:1})', "foo?a=b&b=1", function () {
  return http.constructURL("foo?a=b", {b:1});
});

test('constructURL("foo?a=b", {b:[1,2]})', "foo?a=b&b=1&b=2", function () {
  return http.constructURL("foo?a=b", {b:[1,2]});
});

test('constructURL("foo?a=b", [{b:[1,2]}])', "foo?a=b&b=1&b=2", function () {
  return http.constructURL("foo?a=b", [{b:[1,2]}]);
});

test('constructURL(["http://foo", {bar:"x", zz:"w"}, {foo:[1,2,3]}])',
     "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3",
     function() {
       return http.constructURL(["http://foo", {bar:"x", zz:"w"}, {foo:[1,2,3]}]);
     });

test('constructURL([["http://foo", {bar:"x", zz:"w"}], [{foo:[1,2,3]}]])',
     "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3",
     function() {
       return http.constructURL([["http://foo", {bar:"x", zz:"w"}], [{foo:[1,2,3]}]]);
     });

//----------------------------------------------------------------------
// canonicalizeURL

test('canonicalizeURL("/foo/bar.txt", "http://a.b/c/d/baz.txt")',
     "http://a.b/foo/bar.txt",
     function() {
       return http.canonicalizeURL("/foo/bar.txt", "http://a.b/c/d/baz.txt");
     });

test('canonicalizeURL("foo/bar.txt", "http://a.b/c/d/baz.txt")',
     "http://a.b/c/d/foo/bar.txt",
     function() {
       return http.canonicalizeURL("foo/bar.txt", "http://a.b/c/d/baz.txt");
     });

test('canonicalizeURL("././foo/./bar.txt", "http://a.b/c/d/")',
     "http://a.b/c/d/foo/bar.txt",
     function() {
       return http.canonicalizeURL("././foo/./bar.txt", "http://a.b/c/d/");
     });

test('canonicalizeURL(".././foo/../bar.txt", "http://a.b/c/d/")',
     "http://a.b/c/bar.txt",
     function() {
       return http.canonicalizeURL(".././foo/../bar.txt", "http://a.b/c/d/");
     });

// file:// URLs must be absolute
test('parseURL("file://foo/bar") throws an exception',
     "Invalid URL: file://foo/bar",
     function() {
       return http.parseURL("file://foo/bar");
     });

test('canonicalizeURL("./bar.txt", "file://foo.txt")',
     "Invalid URL: file://foo.txt",
     function() {
       return http.canonicalizeURL("./bar.txt", "file://foo.txt");
     });

//----------------------------------------------------------------------
// request

//TODO: is this needed in other tests? Can we not hardcode the server path?
var baseURL = "http://localhost:7070/test/run.sjs";
var relativeURL = function(relativePath) {
  if(testUtil.isBrowser) return relativePath;

  // node can't resolve relative paths, assume server location:
  return http.canonicalizeURL(relativePath, baseURL);
};

test('request(["data/returnQuery.template", {a:1,b:2}])', "a=1&b=2", function() {
  return http.request([relativeURL("data/returnQuery.template"), {a:1,b:2}]);
});

test('request(["data/returnQuery.template", {a:1,b:2}])', "a=1&b=2", function() {
  return http.request([relativeURL("data/returnQuery.template"), {a:1,b:2}]);
});

test('request("data/returnQuery.template", {query:{a:1,b:2}})', "a=1&b=2", function() {
  return http.request(relativeURL("data/returnQuery.template"), {query:{a:1,b:2}});
});

test('request("no_such_url", {throwing:false})', "", function() {
  return http.request(relativeURL("no_such_url"), {throwing:false});
});

test('try {request("no_such_url")}catch(e){}', "404", function() {
  try {return http.request(relativeURL("no_such_url"));}catch(e) { return e.status.toString(); }
});

//----------------------------------------------------------------------
// get

test('get(["data/returnQuery.template", {a: 1, b: 2}])', "a=1&b=2", function () {
  return http.get([relativeURL("data/returnQuery.template"), {a: 1, b: 2}]);
});

test('get(["data/returnQuery.template", { a: 1 }, {b: 2}])', "a=1&b=2", function () {
  return http.get([relativeURL("data/returnQuery.template"), { a: 1 }, {b: 2}]);
});

test('try {get("invalid_url")}catch(e){}', "404", function() {
  try {return http.get(relativeURL("invalid_url"));}catch(e) { return e.status.toString(); }
});

//----------------------------------------------------------------------
// post

test("http.post", "a=1&b=2", function () {
  return http.post(relativeURL("/post_echo"), "a=1&b=2");
});

test("http.post 2", "a=1&b=b&c=3", function () {
  return http.post(relativeURL("/post_echo"),
                              http.constructQueryString([{a:1,b:"b"},
                                                                    {c:3}]));
});

//----------------------------------------------------------------------
// json

test('json("data/data.json")', 1, function () {
  return http.json(relativeURL("data/data.json")).doc[0].value;
});

//----------------------------------------------------------------------
// xml

test('xml("data/data.xml")', "1", function () {
 return http.xml(relativeURL("data/data.xml")).getElementsByTagName("leaf")[0].getAttribute("value");
});

//----------------------------------------------------------------------
// jsonp

var webserverJsonpTimeout = 5000;

function testJsonpRequest(opts) {
  waitfor {
    return http.jsonp(relativeURL("data/returnJsonp.template"), [{query: {data:"bananas"}},opts]).data;
  }
  or {
    hold(webserverJsonpTimeout);
    return "timeout";
  }
}

test("jsonp", "bananas", function () {
  return testJsonpRequest();
});

test("jsonp in iframe", "bananas", function () {
  return testJsonpRequest({iframe:true});
});

test("jsonp forcecb", "bananas", function () {
  return testJsonpRequest({forcecb:"foobar"});
});

test("jsonp/indoc bad url should throw", "notfound", function () {
  waitfor {
    try {
      return http.jsonp("nonexistingurl");
    } catch (e) {
      return "notfound";
    }
  } or {hold(webserverJsonpTimeout);return "timeout"; }
});

test("jsonp/in iframe bad url should throw", "notfound", function () {
  waitfor {
    try {
      return http.jsonp("nonexistingurl", {iframe:true});
    } catch (e) {
      return "notfound";
    }
  } or {hold(webserverJsonpTimeout);return "timeout"; }
});


function twitterSearchIframe(opts) {
  waitfor {
    return http.jsonp("http://search.twitter.com/search.json",opts);
  } or {hold(webserverJsonpTimeout);return "timeout"; }
}

test("http.jsonp iframe cache issue", true, function () {
  var a = twitterSearchIframe();
  // if the iframe caches (some browsers), the jsonp callback will not be called
  var b = twitterSearchIframe();
  return (a != "timeout") && (b != "timeout");
});

//----------------------------------------------------------------------
// script

//XXX http.script has been removed. delete these tests if they aren't needed
test("http.script", 77, function() {
  waitfor {
    waitfor {
      require("sys").puts(http.script);
      http.script(relativeURL("data/testscript.js"));
    }
    and {
      http.script(relativeURL("data/testscript.js"));
    }
  }
  or { hold(webserverJsonpTimeout); return "timeout"; }
  // testscript_var should have been set by the testscript
  return testscript_var;
}).skip("http.script no longer exists");

test("http.script throwing", true, function() {
  waitfor {
    try {
      http.script(relativeURL("data/nonexistant.js"));
    }
    catch (e) {
    }
  }
  or { hold(webserverJsonpTimeout); return "timeout"; }
  // testscript_var should have been set by the testscript
  return true;
}).skip("http.script no longer exists");
