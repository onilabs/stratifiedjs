var testUtil = require('../lib/testUtil');
var testEq = testUtil.test;
var {test, assert, context} = require('sjs:test/suite');
var g = require('sjs:webapi/google');
var logging = require('sjs:logging');

context {||
  testEq('search', true, function() {
    var results = g.search("croczilla");
    return results.responseData.results[0].url != null;
  });

  testEq('search(., {start:4})', true, function() {
    var results = g.search("croczilla", {start:4});
    return results.responseData.results[0].url != null;
  });

  testEq('siteSearch(., {start:4})', true, function() {
    var results = g.siteSearch("news", "http://cnn.com", {start:4});
    logging.info(results);
    return results.responseData.results[0].url != null;
  });

  testEq('translate', "Hallo", function() {
    var response = g.translate("hello", "de");
    if (!response.responseData) return response.responseDetails;
    return response.responseData.translatedText;
  }).skip("translate is now a paid api");

  testEq('BROKEN: load', true, function() {
    g.load("language", "1");
    return google.language.isFontRenderingSupported("hi");
  }).skip();
}.browserOnly().ignoreLeaks('_oni_jsonpcb');
