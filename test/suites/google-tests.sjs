var testUtil = require('../lib/testUtil');
var test = testUtil.test;
var g = require('sjs:webapi/google');

test('search', true, function() {
  var results = g.search("croczilla");
  return results.responseData.results[0].url != null;
});

test('search(., {start:4})', true, function() {
  var results = g.search("croczilla", {start:4});
  return results.responseData.results[0].url != null;
});

test('siteSearch(., {start:4})', true, function() {
  var results = g.siteSearch("news", "http://cnn.com", {start:4});
  console.log(results);
  return results.responseData.results[0].url != null;
});

test('translate', "Hallo", function() {
  var response = g.translate("hello", "de");
  if (!response.responseData) return response.responseDetails;
  return response.responseData.translatedText;
}).skip("translate is now a paid api");

test('load', true, function() {
  g.load("language", "1");
  return google.language.isFontRenderingSupported("hi");
}).browserOnly();
