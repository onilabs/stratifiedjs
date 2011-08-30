//----------------------------------------------------------------------
// constructQueryString/constructURL

test('constructQueryString({a:1},{b:2})', "a=1&b=2", function() {
  return require('http').constructQueryString({a:1},{b:2});
});


test('constructQueryString({a:1,b:"foo&bar"})', "a=1&b=foo%26bar", function() {
  return require('http').constructQueryString({a:1,b:"foo&bar"});
});

test('constructQueryString([[null,[{a:1,b:["x","y"]},{c:3}],[[]]]])',
     "a=1&b=x&b=y&c=3", function() {
  return require('http').constructQueryString([[null,[{a:1,b:['x','y']},{c:3}],[[]]]]);
});

test('constructURL("foo.txt")', "foo.txt", function () {
  return require('http').constructURL("foo.txt");
});

test('constructURL("foo", "bar", "foo.txt")', "foo/bar/foo.txt", function () {
  return require('http').constructURL("foo", "bar", "foo.txt");
});

test('constructURL("foo/", "/bar/")', "foo/bar/", function () {
  return require('http').constructURL("foo/", "/bar/");
});

test('constructURL("foo?a=b")', "foo?a=b", function () {
  return require('http').constructURL("foo?a=b");
});

test('constructURL("foo?a=b", {b:1})', "foo?a=b&b=1", function () {
  return require('http').constructURL("foo?a=b", {b:1});
});

test('constructURL("foo?a=b", {b:[1,2]})', "foo?a=b&b=1&b=2", function () {
  return require('http').constructURL("foo?a=b", {b:[1,2]});
});

test('constructURL("foo?a=b", [{b:[1,2]}])', "foo?a=b&b=1&b=2", function () {
  return require('http').constructURL("foo?a=b", [{b:[1,2]}]);
});

test('constructURL(["http://foo", {bar:"x", zz:"w"}, {foo:[1,2,3]}])',
     "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3",
     function() {
       return require('http').constructURL(["http://foo", {bar:"x", zz:"w"}, {foo:[1,2,3]}]);
     });

test('constructURL([["http://foo", {bar:"x", zz:"w"}], [{foo:[1,2,3]}]])',
     "http://foo?bar=x&zz=w&foo=1&foo=2&foo=3",
     function() {
       return require('http').constructURL([["http://foo", {bar:"x", zz:"w"}], [{foo:[1,2,3]}]]);
     });

//----------------------------------------------------------------------
// canonicalizeURL

test('canonicalizeURL("/foo/bar.txt", "http://a.b/c/d/baz.txt")',
     "http://a.b/foo/bar.txt",
     function() {
       return require('http').canonicalizeURL("/foo/bar.txt", "http://a.b/c/d/baz.txt");
     });

test('canonicalizeURL("foo/bar.txt", "http://a.b/c/d/baz.txt")',
     "http://a.b/c/d/foo/bar.txt",
     function() {
       return require('http').canonicalizeURL("foo/bar.txt", "http://a.b/c/d/baz.txt");
     });

test('canonicalizeURL("././foo/./bar.txt", "http://a.b/c/d/")',
     "http://a.b/c/d/foo/bar.txt",
     function() {
       return require('http').canonicalizeURL("././foo/./bar.txt", "http://a.b/c/d/");
     });

test('canonicalizeURL(".././foo/../bar.txt", "http://a.b/c/d/")',
     "http://a.b/c/bar.txt",
     function() {
       return require('http').canonicalizeURL(".././foo/../bar.txt", "http://a.b/c/d/");
     });

//----------------------------------------------------------------------
// request

test('request(["data/returnQuery.template", {a:1,b:2}])', "a=1&b=2", function() {
  return require('http').request(["data/returnQuery.template", {a:1,b:2}]);
});

test('request(["data/returnQuery.template", {a:1,b:2}])', "a=1&b=2", function() {
  return require('http').request(["data/returnQuery.template", {a:1,b:2}]);
});

test('request("data/returnQuery.template", {query:{a:1,b:2}})', "a=1&b=2", function() {
  return require('http').request("data/returnQuery.template", {query:{a:1,b:2}});
});

test('request("invalid url", {throwing:false})', "", function() {
  return require('http').request("invalid url", {throwing:false});
});

test('try {request("invalid url")}catch(e){}', "404", function() {
  try {return require('http').request("invalid url");}catch(e) { return e.status.toString(); }
});

//----------------------------------------------------------------------
// get

test('get(["data/returnQuery.template", {a: 1, b: 2}])', "a=1&b=2", function () {
  return require("http").get(["data/returnQuery.template", {a: 1, b: 2}]);
});

test('get(["data/returnQuery.template", { a: 1 }, {b: 2}])', "a=1&b=2", function () {
  return require("http").get(["data/returnQuery.template", { a: 1 }, {b: 2}]);
});

test('try {get("invalid url")}catch(e){}', "404", function() {
  try {return require('http').get("invalid url");}catch(e) { return e.status.toString(); }
});

//----------------------------------------------------------------------
// post

test("http.post", "a=1&b=2", function () {
  return require("http").post("/post_echo", "a=1&b=2");
});

test("http.post 2", "a=1&b=b&c=3", function () {
  return require("http").post("/post_echo",
                              require("http").constructQueryString([{a:1,b:"b"},
                                                                    {c:3}]));
});

//----------------------------------------------------------------------
// json

test('json("data/data.json")', 1, function () {
  return require("http").json("data/data.json").doc[0].value;
});

//----------------------------------------------------------------------
// xml

//test('xml("data/data.xml")', "1", function () {
//  return require("http").xml("data/data.xml").getElementsByTagName("leaf")[0].getAttribute("value");
//});

//----------------------------------------------------------------------
// jsonp

var webserverJsonpTimeout = 5000;

function testJsonpRequest(opts) {
  waitfor {
    return require("http").jsonp("data/returnJsonp.template", [{query: {data:"bananas"}},opts]).data;
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
      return require("http").jsonp("nonexistingurl");
    } catch (e) {
      return "notfound";
    }
  } or {hold(webserverJsonpTimeout);return "timeout"; }
});

test("jsonp/in iframe bad url should throw", "notfound", function () {
  waitfor {
    try {
      return require("http").jsonp("nonexistingurl", {iframe:true});
    } catch (e) {
      return "notfound";
    }
  } or {hold(webserverJsonpTimeout);return "timeout"; }
});


function twitterSearchIframe(opts) {
  waitfor {
    return require("http").jsonp("http://search.twitter.com/search.json",opts);
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

test("http.script", 77, function() {
  waitfor {
    waitfor {
      require("http").script("data/testscript.js");
    }
    and {
      require("http").script("data/testscript.js");
    }
  }
  or { hold(webserverJsonpTimeout); return "timeout"; }
  // testscript_var should have been set by the testscript
  return testscript_var;
});

test("http.script throwing", true, function() {
  waitfor {
    try {
      require("http").script("data/nonexistant.js");
    }
    catch (e) {
    }
  }
  or { hold(webserverJsonpTimeout); return "timeout"; }
  // testscript_var should have been set by the testscript
  return true;
});
