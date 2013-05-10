var testUtil = require('../lib/testUtil');
var logging = require('sjs:logging');
var getHttpURL = require("../lib/testContext").getHttpURL;
var testEq = testUtil.test;
var suite = require('sjs:test/suite');
var {test, assert, context} = suite;
var http = require('sjs:http');
var url = require('sjs:url');
var sys = require('builtin:apollo-sys');

var IE9 = suite.isIE() && suite.ieVersion() < 10;
var expected404Status = IE9 ? undefined : 404;

context("request") {||

  testEq('request(["data/returnQuery.template", {a:1,b:2}])', "a=1&b=2", function() {
    return http.request([getHttpURL("data/returnQuery.template"), {a:1,b:2}]);
  }).skip("requires template filter");

  testEq('request(["data/returnQuery.template", {a:1,b:2}])', "a=1&b=2", function() {
    return http.request([getHttpURL("data/returnQuery.template"), {a:1,b:2}]);
  }).skip("requires template filter");

  testEq('request("data/returnQuery.template", {query:{a:1,b:2}})', "a=1&b=2", function() {
    return http.request(getHttpURL("data/returnQuery.template"), {query:{a:1,b:2}});
  }).skip("requires template filter");

  testEq('request("no_such_url", {throwing:false})', "", function() {
    return http.request(getHttpURL("no_such_url"), {throwing:false});
  });

  test('try {request("no_such_url")}catch(e){}') {||
    assert.raises({filter: e -> e.status === expected404Status},
      -> http.request(getHttpURL("no_such_url")));
  }
}

context("get") {||
  testEq('get(["data/returnQuery.template", {a: 1, b: 2}])', "a=1&b=2", function () {
    return http.get([getHttpURL("data/returnQuery.template"), {a: 1, b: 2}]);
  }).skip("requires template filter");

  testEq('get(["data/returnQuery.template", { a: 1 }, {b: 2}])', "a=1&b=2", function () {
    return http.get([getHttpURL("data/returnQuery.template"), { a: 1 }, {b: 2}]);
  }).skip("requires template filter");

  test('try {get("invalid_url")}catch(e){}') {||
    assert.raises({filter: e -> e.status === expected404Status},
      -> http.get(getHttpURL("no_such_url")));
  }
}

context("post") {||
  testEq("http.post", "a=1&b=2", function () {
    return http.post(getHttpURL("/post_echo"), "a=1&b=2");
  }).skip("machinery for this test is not in place atm");

  testEq("http.post 2", "a=1&b=b&c=3", function () {
    return http.post(getHttpURL("/post_echo"), url.buildQuery([{a:1,b:"b"}, {c:3}]));
  }).skip("machinery for this test is not in place atm");
}

context("json") {||

  testEq('json("data.json")', 1, function () {
    return http.json(getHttpURL("integration/fixtures/data.json")).doc[0].value;
  });

}

context("xml") {||
  testEq('xml("data.xml")', "1", function () {
  return http.xml(getHttpURL("integration/fixtures/data.xml")).getElementsByTagName("leaf")[0].getAttribute("value");
  }).skip("http.xml is obsolete");
}

context("jsonp") {||
  var webserverJsonpTimeout = 5000;

  function testJsonpRequest(opts) {
    waitfor {
      return http.jsonp(getHttpURL("data/returnJsonp.template"), [{query: {data:"bananas"}},opts]).data;
    }
    or {
      hold(webserverJsonpTimeout);
      return "timeout";
    }
  }

  testEq("jsonp", "bananas", function () {
    return testJsonpRequest();
  }).skip("requires template filter");

  testEq("jsonp in iframe", "bananas", function () {
    return testJsonpRequest({iframe:true});
  }).skip("requires template filter");

  testEq("jsonp forcecb", "bananas", function () {
    return testJsonpRequest({forcecb:"foobar"});
  }).skip("requires template filter");

  testEq("jsonp/indoc bad url should throw", "notfound", function () {
    waitfor {
      try {
        return http.jsonp("nonexistingurl");
      } catch (e) {
        return "notfound";
      }
    } or {hold(webserverJsonpTimeout);return "timeout"; }
  });

  testEq("jsonp/in iframe bad url should throw", "notfound", function () {
    waitfor {
      try {
        return http.jsonp("nonexistingurl", {iframe:true});
      } catch (e) {
        return "notfound";
      }
    } or {hold(webserverJsonpTimeout);return "timeout"; }
  }).skip("wontfix/cantfix");



  function searchIframe() {
    waitfor {
      return http.jsonp(["http://ajax.googleapis.com/ajax/services/search/web", {v: "1.0", q : 'stratifiedjs' }], {iframe:true});
    } or {hold(webserverJsonpTimeout);return "timeout"; }
  }

  testEq("http.jsonp iframe cache issue", true, function () {
    var a = searchIframe();
    // if the iframe caches (some browsers), the jsonp callback will not be called
    var b = searchIframe();
    return (a != "timeout") && (b != "timeout");
  });
}.ignoreLeaks('_oni_jsonpcb');

context("full return objects") {||
  testEq('head request', 'text/plain', function() {
    return http.request("http://code.onilabs.com/apollo/unstable/modules/http.sjs",
                        { method: 'HEAD', response: 'full' }).getHeader('Content-Type');
  }).skipIf(IE9);

  testEq('get request', true, function() {
    return http.request("http://code.onilabs.com/apollo/unstable/modules/http.sjs",
                        { method: 'GET', response: 'full' }).content.length > 0;
  });
}

context("raw return objects") {||
  test('returns an unconsumed response stream', function() {
    var response = http.request("http://code.onilabs.com/apollo/unstable/modules/http.sjs", { response: 'raw' });
    assert.eq(response.headers['content-type'], 'text/plain');
    var data = "";
    var chunk;
    while(chunk = sys.readStream(response)) {
      data += chunk;
    }
    assert.ok(data.length > 1024);
  });
}.serverOnly();
