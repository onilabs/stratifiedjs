@ = require('sjs:test/std');
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
var expected404Status = 404;

var {requiresConductance} = require('./helper');

context("request", function() {
  testEq('request(["data/returnQuery.template", {a:1,b:2}])', "a=1&b=2", function() {
    return http.request([getHttpURL("data/returnQuery.template"), {a:1,b:2}]);
  }).skip("requires template filter");

  testEq('request(["data/returnQuery.template", {a:1,b:2}])', "a=1&b=2", function() {
    return http.request([getHttpURL("data/returnQuery.template"), {a:1,b:2}]);
  }).skip("requires template filter");

  testEq('request("data/returnQuery.template", {query:{a:1,b:2}})', "a=1&b=2", function() {
    return http.request(getHttpURL("data/returnQuery.template"), {query:{a:1,b:2}});
  }).skip("requires template filter");

  test('request("no_such_url", {throwing:false})', function() {
    http.request(getHttpURL("no_such_url"), {throwing:false}) .. assert.eq("");
  });

  test('try {request("no_such_url")}catch(e){}', function() {
    assert.raises({filter: e -> e.status === expected404Status},
      -> http.request(getHttpURL("no_such_url")));
  })

  context("redirect", function() {
    test("bails out on infinite redirect", function() {
      var response = http.request(getHttpURL("/http/redirect?infinite=1"), {max_redirects:10, throwing: false, response:'full'});
      @info(response);
      // browser infinite redirect returns generic `0` error code
      response.status .. @assert.eq(@isBrowser ? 0 : 302);
    })

    test("persists settings", function() {
      var dest = getHttpURL("/http/ok");
      var response = http.request(getHttpURL("/http/redirect?dest="+encodeURIComponent(dest)), {response:'full'});
      @info(response);
      response.status .. @assert.eq(200); // make sure we got a "full" response, not the default "string"
    })

  }) .. requiresConductance();

  @context("error response data", function() {
    @test('for standard response', function() {
      try {
        http.request(getHttpURL("/http/fail"));
        assert.fail("No exception thrown");
      } catch(e) {
        if (!e.data) throw e;
        @info(e);
        @assert.eq(e.data, 'failure response data');
      }
    })

    @test('for arraybuffer response', function() {
      try {
        http.request(getHttpURL("/http/fail"), {response:'arraybuffer'});
        assert.fail("No exception thrown");
      } catch(e) {
        if (!e.data) throw e;
        @info(e, e.data);
        @assert.eq(e.data .. @arrayBufferToOctets, 'failure response data');
      }
    }).browserOnly();
  }) .. requiresConductance();
})

context("get", function() {
  testEq('get(["data/returnQuery.template", {a: 1, b: 2}])', "a=1&b=2", function () {
    return http.get([getHttpURL("data/returnQuery.template"), {a: 1, b: 2}]);
  }).skip("requires template filter");

  testEq('get(["data/returnQuery.template", { a: 1 }, {b: 2}])', "a=1&b=2", function () {
    return http.get([getHttpURL("data/returnQuery.template"), { a: 1 }, {b: 2}]);
  }).skip("requires template filter");

  test('try {get("invalid_url")}catch(e){}', function() {
    assert.raises({filter: e -> e.status === expected404Status},
      -> http.get(getHttpURL("no_such_url")));
  })
})

context("post", function() {
  var post_echo;
  test.beforeAll:: function(s) {
    post_echo = getHttpURL("/http/post_echo");
  }
  testEq("http.post", "a=1&b=2", function () {
    return http.post(post_echo, "a=1&b=2");
  });

  testEq("http.post 2", "a=1&b=b&c=3", function () {
    return http.post(post_echo, url.buildQuery([{a:1,b:"b"}, {c:3}]));
  });
}) .. requiresConductance();

context("json", function() {

  testEq('json("data.json")', 1, function () {
    return http.json(getHttpURL("integration/fixtures/data.json")).doc[0].value;
  });

})

context("xml", function() {
  testEq('xml("data.xml")', "1", function () {
  return http.xml(getHttpURL("integration/fixtures/data.xml")).getElementsByTagName("leaf")[0].getAttribute("value");
  }).skip("http.xml is obsolete");
})

context("jsonp", function() {
  if (suite.isBrowser) {
    // browser jsonp actually gets the `cp` url dynamically since it's
    // run as vanilla JS code:
    var jsonpType = 'js';
    var errorMessage = /Could not complete JSONP request to/;
  } else {
    // Server doesn't require us to get the `cb` argument right, but can only deal with
    // legitimate JSON responses (it won't execute JS):
    var jsonpType = 'json';
    var errorMessage = /Failed GET request to/;
  }

  function testJsonpRequest(opts) {
    return http.jsonp(getHttpURL("integration/fixtures/jsonp." + jsonpType), [opts]).data;
  }

  test("jsonp", function() {
    testJsonpRequest() .. assert.eq("result");
  });

  test("jsonp iframe", function() {
    testJsonpRequest({iframe:true}) .. assert.eq("result");
  });

  test("jsonp forcecb", function() {
    testJsonpRequest({forcecb:"foobar"}) .. assert.eq("result");
  })

  test("jsonp/indoc bad url should throw", function() {
    assert.raises({message: errorMessage},
      -> http.jsonp(getHttpURL("nonexistingurl")));
  })

  test("jsonp/iframe bad url should throw", function() {
    assert.raises({message: errorMessage},
      -> http.jsonp(getHttpURL("nonexistingurl"), {iframe: true}));
  }).skip("wontfix/cantfix");

  function searchIframe() {
    return http.jsonp(["http://ajax.googleapis.com/ajax/services/search/web", {v: "1.0", q : 'stratifiedjs' }], {iframe:true});
  }

  test("http.jsonp iframe cache issue", function() {
    searchIframe() .. assert.ok();
    // if the iframe caches (some browsers), the jsonp callback will not be called
    // (causing a timeout)
    searchIframe() .. assert.ok();
  }).timeout(10).skip("google api retired");

}).ignoreLeaks('_oni_jsonpcb').timeout(5);

context("full return objects", function() {
  testEq('head request', 'text/plain', function() {
    return http.request("http://code.onilabs.com/sjs/unstable/modules/http.sjs",
                        { method: 'HEAD', response: 'full' }).getHeader('Content-Type');
  }).skipIf(IE9);

  testEq('get request', true, function() {
    return http.request("http://code.onilabs.com/sjs/unstable/modules/http.sjs",
                        { method: 'GET', response: 'full' }).content.length > 0;
  });
})

context("raw return objects", function() {
  @stream = require('sjs:nodejs/stream');

  test('returns an unconsumed response stream', function() {
    var response = http.request("http://code.onilabs.com/sjs/unstable/modules/http.sjs", { response: 'raw' });
    assert.eq(response.headers['content-type'], 'text/plain');
    var data = response .. @stream.readAll();
    assert.ok(data.length > 1024);
  });

}).serverOnly();
