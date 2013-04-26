var testEq = require('../lib/testUtil').test;
var yql=require('sjs:webapi/yql');
var {test, context, assert} = require('sjs:test/suite');

context {||
  testEq("query", "Stratified", function() {
    var rv = yql.query("select * from html where url=@url and xpath='//h1'",
                      {url:"http://www.stratifiedjs.org"});
    return rv.results.h1.content;
  });

  testEq("getFile", true, function() {
    var file = yql.getFile("http://stratifiedjs.org/presentations/OSCON2010/");
    return file.indexOf("Alexander Fritze") != -1;
  });
}.ignoreLeaks('_oni_jsonpcb');
