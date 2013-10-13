var {test, assert, context} = require('sjs:test/suite');
var Url = require('sjs:url');

context("cross-frame communication") {||
  test.beforeAll {|s|
    s.frame = document.createElement("iframe");
    document.body.appendChild(s.frame);
  }
  test.afterAll {|s|
    document.body.removeChild(s.frame);
  }

  context("exceptions") {||
    test.beforeAll {|s|
      var url = Url.normalize('../fixtures/iframe-errors.html', module.id);
      s.frame.contentDocument.location.href = url;
      waitfor {
        while(!(s.frame.contentWindow && s.frame.contentWindow.fail)) {
          hold(100);
          //console.log('waiting');
        }
      } or {
        hold(2000);
        throw new Error("setup timed out");
      }
      s.window = s.frame.contentWindow;
    }
    test("synchronous errors are propagated") {|s|
      assert.raises({message: "immediate error thrown by iframe"}, -> s.window.fail());
    }

    test("errors after suspension are propagated") {|s|
      assert.raises({message: "delayed error thrown by iframe"}, -> s.window.delayfail());
    }
  }.timeout(2);

}.browserOnly();
