var testUtil = require('../lib/testUtil');
var getHttpURL = require("../lib/testContext").getHttpURL;
var testEq = testUtil.test;
var {test, assert, context} = require('sjs:test/suite');
var http = require('sjs:http');
var url = require('sjs:url');

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

  testEq('try {request("no_such_url")}catch(e){}', "404", function() {
    try {return http.request(getHttpURL("no_such_url"));}catch(e) { return e.status.toString(); }
  });

}

context("get") {||
  testEq('get(["data/returnQuery.template", {a: 1, b: 2}])', "a=1&b=2", function () {
    return http.get([getHttpURL("data/returnQuery.template"), {a: 1, b: 2}]);
  }).skip("requires template filter");

  testEq('get(["data/returnQuery.template", { a: 1 }, {b: 2}])', "a=1&b=2", function () {
    return http.get([getHttpURL("data/returnQuery.template"), { a: 1 }, {b: 2}]);
  }).skip("requires template filter");

  testEq('try {get("invalid_url")}catch(e){}', "404", function() {
    try {return http.get(getHttpURL("invalid_url"));}catch(e) { return e.status.toString(); }
  });
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


  function twitterSearchIframe(opts) {
    waitfor {
      return http.jsonp("http://search.twitter.com/search.json",opts);
    } or {hold(webserverJsonpTimeout);return "timeout"; }
  }

  testEq("http.jsonp iframe cache issue", true, function () {
    var a = twitterSearchIframe();
    // if the iframe caches (some browsers), the jsonp callback will not be called
    var b = twitterSearchIframe();
    return (a != "timeout") && (b != "timeout");
  });
}.ignoreLeaks('_oni_jsonpcb');

context("full return objects") {||
  testEq('head request', 'text/plain', function() {
    return http.request("http://code.onilabs.com/apollo/unstable/modules/http.sjs",
                        { method: 'HEAD', response: 'full' }).getHeader('Content-Type');
  });
}
