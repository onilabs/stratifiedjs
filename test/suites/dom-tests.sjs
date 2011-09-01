var testUtil = require('../lib/testUtil');
var test = testUtil.test;
if(testUtil.isBrowser) {
  var dom = require('apollo:dom');
  function synthesizeClick() {
    if (document.createEvent) {
      var click = document.createEvent("MouseEvents");
      click.initEvent("click", true, true);
      document.dispatchEvent(click);
    }
    else // IE
      document.fireEvent("onclick");
  }

  test('waitforEvent', true, function() {
    waitfor {
      dom.waitforEvent(document, 'click');
      return true;
    }
    or {
      hold(0);
      synthesizeClick();
      hold();
    }
    or {
      // timeout
      hold(1000);
    }
    return false;
  });

  test('eventQueue', true, function() {
    waitfor {
      using (var Q = dom.eventQueue(document, "click")) {
        for (var i=0; i<10; ++i) {
          hold(Math.random()*100);
          Q.get();
        }
      }
    }
    and {
      for (var j=0; j<10; ++j) {
        hold(Math.random()*100);
        synthesizeClick();
      }
    }
    if (Q.count() != 0) throw "Not all events consumed";
    synthesizeClick();
    if (Q.count() != 0) throw "Queue still listening when it shouldn't";
    return true;
  });

  test('cookies', true, function() {
    var dom = dom;
    var data = "  "+Math.random()+"\n\n\tfoo";
    dom.setCookie("testcookie", data);
    hold(100);
    if (data != dom.getCookie("testcookie")) throw "Cookie data corrupted";
    dom.removeCookie("testcookie");
    hold(100);
    if (dom.getCookie("testcookie") != "") throw "Can't clear cookie";
    return true;
  });
}
