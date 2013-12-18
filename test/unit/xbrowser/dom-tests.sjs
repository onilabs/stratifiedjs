var suite = require('sjs:test/suite');
var {context, test, assert} = suite;
var testUtil = require('../../lib/testUtil');
var testEq = testUtil.test;
var relativeURL = require("../../lib/testContext").getHttpURL;

var IE7 = suite.isIE() && suite.ieVersion() < 8;

if(testUtil.isBrowser) {
  var dom = require('sjs:xbrowser/dom');

  testEq('cookies', true, function() {
    var data = "  "+Math.random()+"\n\n\tfoo";
    dom.setCookie("testcookie", data);
    hold(100);
    if (data != dom.getCookie("testcookie")) throw "Cookie data corrupted";
    dom.removeCookie("testcookie");
    hold(100);
    if (dom.getCookie("testcookie") != "") throw "Can't clear cookie";
    return true;
  });

  var webserverJsonpTimeout = 5000;

  testEq("dom.script", 77, function() {
    waitfor {
      waitfor {
        dom.script(relativeURL("unit/fixtures/testscript.js"));
      }
      and {
        dom.script(relativeURL("unit/fixtures/testscript.js"));
      }
    }
    or { hold(webserverJsonpTimeout); return "timeout"; }
    // testscript_var should have been set by the testscript
    return testscript_var;
  }).ignoreLeaks('testscript_var');

  testEq("dom.script throwing", true, function() {
    waitfor {
      try {
        dom.script(relativeURL("unit/fixtures/nonexistant.js"));
      }
      catch (e) {
      }
    }
    or { hold(webserverJsonpTimeout); return "timeout"; }
    return true;
  });

  context("matchesSelector") {||
    testEq("matchesSelector", true, function() {
      var elem = document.createElement('div');
      elem.innerHTML = "<div class='foo'><div id='bar'></div></div>";
      return dom.matchesSelector(elem.firstChild.firstChild, '.foo #bar');
    });

    testEq("~matchesSelector", false, function() {
      var elem = document.createElement('div');
      elem.innerHTML = "<div class='foo'><div id='barx'></div></div>";
      return dom.matchesSelector(elem.firstChild.firstChild, '.foo #bar');
    });
  }.skipIf(IE7);

  testEq("traverseDOM", true, function() {
    var elem = document.createElement('div');
    elem.innerHTML = "<div data-x='foo'><div id='bar'></div></div>";
    dom.traverseDOM(elem.firstChild.firstChild, elem) {
      |e|
      if (e.getAttribute('data-x')) return true;
    }
    return false;
  });

  context("findNode") {||
    testEq("findNode", 'bar', function() {
      var elem = document.createElement('div');
      elem.innerHTML = "<div class='foo'><div data-x='bar'><div id='baz'></div></div></div>";
      var node = dom.findNode('.foo [data-x]',elem.firstChild.firstChild.firstChild, elem);
      return node ? node.getAttribute('data-x') : null;
    });

    testEq("findNode exclusive", 'not found', function() {
      var elem = document.createElement('div');
      elem.setAttribute('class', 'xyz');
      elem.innerHTML = "<div class='foo'><div data-x='bar'><div id='baz'></div></div></div>";
      var node = dom.findNode('.xyz',elem.firstChild.firstChild.firstChild, elem);
      return node ? 'found' : 'not found';
    });

    testEq("findNode inclusive", 'found', function() {
      var elem = document.createElement('div');
      elem.setAttribute('class', 'xyz');
      elem.innerHTML = "<div class='foo'><div data-x='bar'><div id='baz'></div></div></div>";
      var node = dom.findNode('.xyz',elem.firstChild.firstChild.firstChild, elem, true);
      return node ? 'found' : 'not found';
    });
  }.skipIf(IE7);

  context('isDOMNode') {||
    test('on DOM node', -> dom.isDOMNode(document.createElement('div')) .. assert.ok);
    test('on non-html DOM node', -> dom.isDOMNode(document.createElement('some-elem')) .. assert.ok);
    test('on text DOM node', -> dom.isDOMNode(document.createTextNode('txt')) .. assert.ok);
  }
}

