var {test, context, assert, isIE} = require('sjs:test/suite');
var logging = require('sjs:logging');

context("console") {||
  var {console} = require('sjs:xbrowser/console');

  var sendReturn = function(elem) {
    var eventObj = document.createEventObject ? document.createEventObject() : document.createEvent("Events");
    if(eventObj.initEvent) eventObj.initEvent("keydown", true, true);
  
    var keyCode = 13;
    eventObj.keyCode = keyCode;
    eventObj.which = keyCode;
    
    elem.dispatchEvent ? elem.dispatchEvent(eventObj) : elem.fireEvent("onkeydown", eventObj);
  }

  var exec = function(c, str) {
    var input = c.root.getElementsByTagName("input")[0];
    input.value = str;
    input.value .. assert.eq(str);
    input .. sendReturn();
  }

  test.afterEach {|state|
    if(state.console) state.console.shutdown();
  }

  // --------------------------------------------
  
  test("leaves no elements behind") {||
    var body = document.getElementsByTagName('body')[0];
    // childElementCount not supported on IE7
    var elemCount = -> 'childElementCount' in body ? body.childElementCount : body.childNodes.length;
    var initial = elemCount();
    assert.number(initial);

    var c = console();
    c.shutdown();

    assert.eq(elemCount(), initial);
  }

  test("aborts its running strata on shutdown") {|s|
    var c = s.console = console({collapsed:false});
    var testState = window.testState = { count: 0 };
      
    c .. exec("testState.logging = require('sjs:logging'); while(1) { testState.logging.info('LOOP'); testState.count++; hold(10); }");
    hold(12);
    // after 12ms, should have run loop twice
    assert.eq(testState.count, 2);
    c.shutdown();
    logging.info("shut down");

    hold(20);
    assert.eq(testState.count, 2);
  }.skipIf(isIE(), "doesn't work on IE");

}.browserOnly().ignoreLeaks('testState');
