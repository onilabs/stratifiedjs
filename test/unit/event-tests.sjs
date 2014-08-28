var {test, context, assert} = require('sjs:test/suite');

var seq = require('sjs:sequence');
var obj = require('sjs:object');
var event = require('sjs:event');
var array = require('sjs:array');
var sys = require('builtin:apollo-sys');
var func = require('sjs:function');
var logging = require('sjs:logging');

// An abstraction for a host-environment event emitter that
// we can manually trigger event on:
var HostEmitter = function() {
  this.init.apply(this, arguments);
}
if (sys.hostenv == 'nodejs') {
  var nodeEvents = require('nodejs:events');
  HostEmitter.prototype = {
    init: function() {
      this.raw = new nodeEvents.EventEmitter();
    },
    trigger: function(name, val) {
      // we shovel `val` into  a `detail` property to match browser behaviour
      this.raw.emit(name, {detail: val});
    },
    listeners: function(name) {
      return this.raw.listeners(name);
    },
    cleanup: -> null,
  }
} else {
  HostEmitter.prototype = {
    init: function() {
      var em = this.raw = document.createElement("span");
      document.body.appendChild(this.raw); // needed in IE<9
      var listeners = {};
      var self = this;

      var add = function(name, l) {
        logging.info("Adding listener for #{name}");
        if (listeners[name] === undefined) {
          listeners[name] = [];
        }
        listeners[name].push(l);
      };
      var remove = function(name, l) {
        logging.info("Removing listener for #{name}");
        array.remove(listeners[name], l) .. assert.ok("removed a listener that did not exist!");
      };

      if (em.addEventListener) {
        em.addEventListener = func.seq(add, em.addEventListener.bind(em));
        em.removeEventListener = func.seq(remove, em.removeEventListener.bind(em));
        this.listeners = function(name) { return listeners[name] || []; };
      } else {
        // IE<9
        em.attachEvent = func.seq(add, em.attachEvent);
        em.detachEvent = func.seq(remove, em.detachEvent);
        this.listeners = function(name) { return listeners['on' + name] || []; };
      }
      
    },
    trigger: function(name, val) {
      var evt;
      if (document.createEvent) {
        evt = document.createEvent('HTMLEvents');
        evt.initEvent(name, false, false);
      } else {
        evt = document.createEventObject();
        evt.eventType = name;
      }
      evt.detail = val;
      logging.info(`dispatchEvent: ${evt.detail}`);

      if (this.raw.dispatchEvent) {
        this.raw.dispatchEvent(evt);
      } else { // IE<9
        // NOTE: can trigger only real event (e.g. 'click')
        this.raw.fireEvent('on'+evt.eventType,evt);
      }
    },
    cleanup: function() {
      document.body.removeChild(this.raw);
    },
  }
}



context("Emitter") {||
  test('block/resume') {||
    var result = (function() {
      var e = event.Emitter();
      waitfor {
        e .. event.wait();
        return 1;
      } or {
        e.emit();
        hold(100);
        return 2;
      }
    })();
    assert.eq(result, 1);
  }

  test('retract from wait()') {||
    var e = event.Emitter();
    waitfor {
      e .. event.wait();
    } or {
      hold(100);
    }
    //XXX now that we don't expose e.waiting anymore, this test is a bit pointless
    //assert.eq(e.waiting, []);
  };

  test('setting with a value') {||
    var e = event.Emitter();
    var results = [];
    waitfor {
      results.push(e .. event.wait());
      results.push(e .. event.wait());
    } or {
      e.emit("first");
      hold(100);
      e.emit("second");
      hold();
    }
    assert.eq(results, ["first", "second"]);
  };
}

context() {||
  test.beforeEach {|s|
    s.emitter = new HostEmitter();
  }

  test.afterEach {|s|
    s.emitter.cleanup();
    // normal usage should never leave listeners attached
    assert.eq(s.emitter.listeners('click').length, 0, 'test left listeners attached!');
  }

  context("HostEmitter") {||
    test("captures specific event and unregisters listener") {|s|
      var result = [];
      waitfor {
        event.events(s.emitter.raw, 'click') .. seq.consume {
          |next_event|
          // `consume` only starts iterating the stream when we call 'next_event':
          assert.eq(s.emitter.listeners('click').length, 0);
          while(true) {
            logging.info("waiting");
            var e = next_event().detail;
            assert.eq(s.emitter.listeners('click').length, 1);
            logging.info("got");
            result.push(e);
            logging.info(`got event: ${e}`);
            if (e >= 3) break; // stop after event 3
          }
        }
        assert.eq(s.emitter.listeners('click').length, 0);
      } and {
        s.emitter.trigger('click', 1);
        s.emitter.trigger('drag', 2);
        s.emitter.trigger('click', 3);
        s.emitter.trigger('click', 4);
      }

      assert.eq(result, [1,3]);
    }

    test("captures multiple events from multiple emitters") {|s|
      var result = [];
      var emitter2 = new HostEmitter();
      event.events([s.emitter.raw, emitter2.raw], ['click', 'drag']) .. seq.consume {
        |next_event|
        assert.eq(s.emitter.listeners('click').length, 0);
        assert.eq(s.emitter.listeners('drag').length, 0);
        waitfor {
          while(true) {
            result.push(next_event().detail);
            assert.eq(s.emitter.listeners('click').length, 1);
            assert.eq(s.emitter.listeners('drag').length, 1);
          }
        } or {
          s.emitter.trigger('click', 1);
          s.emitter.trigger('drag', 2);
          emitter2.trigger('click', 3);
        }
      }
      assert.eq(s.emitter.listeners('click').length, 0);
      assert.eq(s.emitter.listeners('drag').length, 0);

      assert.eq(result, [1, 2, 3]);
    }

    context('nodejs') {||
      test('multiple event arguments') {|s|
        waitfor {
          (event.events(s.emitter.raw, 'click') .. event.wait)
            .. assert.eq([1,2]);
        } and {
          s.emitter.raw.emit('click', 1, 2);
        }
      }

      test('empty event arguments') {|s|
        waitfor {
          (event.events(s.emitter.raw, 'click') .. event.wait)
            .. assert.eq(undefined);
        } and {
          s.emitter.raw.emit('click');
        }
      }
    }.serverOnly();

    test('wait() shortcut') {|s|
      var result = [];
      waitfor {
        result.push((event.events(s.emitter.raw, 'click') .. event.wait).detail);
      } and {
        s.emitter.trigger('click', 1);
        s.emitter.trigger('click', 2);
      }
      assert.eq(result, [1]);
    }

    test("filter") {|s|
      waitfor {
        event.wait(event.events(s.emitter.raw, 'click', {filter:x -> x.detail > 2})).detail .. assert.eq(3);
      } and {
        s.emitter.trigger('click', 1);
        s.emitter.trigger('click', 2);
        s.emitter.trigger('click', 3);
        s.emitter.trigger('click', 4);
      }
    }

    test("transform") {|s|
      waitfor {
        event.events(s.emitter.raw, 'click', {transform:x -> x.detail}) .. event.wait .. assert.eq(1);
      } and {
        s.emitter.trigger('click', 1);
      }
    }

    test("filter + transform") {|s|
      waitfor {
        event.events(s.emitter.raw, 'click', {filter: x -> x > 2, transform: x -> x.detail}) .. event.wait .. assert.eq(3);
      } and {
        s.emitter.trigger('click', 1);
        s.emitter.trigger('click', 2);
        s.emitter.trigger('click', 3);
        s.emitter.trigger('click', 4);
      }
    }
  }

  context('events') {||
    var allEvents = [
      { type: "boring", value: 0 },
      { type: "important", value: 1 },
      { type: "important", value: 2 },
      { type: "important", value: 3 },
    ];

    var opts = {
      filter: x -> x.type == 'important',
      transform: x -> x.detail,
    };

    test("operates synchronously by default") {|s|
      var log = [];
      waitfor {
        event.events(s.emitter.raw, 'click', opts) ..
          seq.each {|e|
            logging.info("Got event: #{e.value}");
            log.push(e.value);
            if (e.value == 3) break;
            hold(500);
          }
      } and {
        allEvents .. seq.each {|e|
          s.emitter.trigger('click', e);
          hold(250);
        }
      }
      log .. assert.eq([1,3]);
    }

    test("with tailbuffer") {|s|
      var log = [];
      waitfor {
        event.events(s.emitter.raw, 'click', opts) ..
          seq.tailbuffer(10) ..
          seq.each {|e|
          log.push(e.value);
          if (e.value == 3) break;
          hold(100);
        }
      } and {
        allEvents .. seq.each {|e|
          s.emitter.trigger('click', e);
        }
      }
      log .. assert.eq([1, 2, 3]);
    }
  }

  context('queue') {||
    var runTest = function(events, triggerBlock) {
      var results = [];
      waitfor {
        events .. seq.tailbuffer(10) .. seq.each {
          |ev|
          results.push(ev.detail);
          hold(10);
        }
      }
      or {
        triggerBlock();
        assert.eq(results, [1]);
        while(results.length < 3) hold(10);
      }
      assert.eq(results, [1, 2, 3]);
    };

    test('queues sjs events') {||
      var emitter = event.Emitter();
      runTest(emitter) {||
        emitter.emit({detail: 1});
        emitter.emit({detail: 2});
        emitter.emit({detail: 3});
      }
    }

    test('queue native events') {|s|
      var emitter = event.events(s.emitter.raw, 'click');
      runTest(emitter) {||
        s.emitter.trigger('click', 1);
        s.emitter.trigger('click', 2);
        s.emitter.trigger('click', 3);
      }
    }

    test('multiple randomly-timed events') {|s|
      var emitter = event.events(s.emitter.raw, 'click');
      waitfor {
        emitter .. seq.tailbuffer(100) .. seq.consume {
          |get_event|
          for (var i=0; i<10; ++i) {
            get_event();
            hold(Math.random()*100);
          }
        }
      }
      and {
        for (var j=0; j<10; ++j) {
          s.emitter.trigger('click');
          hold(Math.random()*100);
        }
      }
    }

  }
}


context("stream") {||
  test('basic iteration') {||
    var stream = event.Emitter();
    var result = [];
    waitfor {
      stream .. seq.each {|item|
        result.push(item);
      }
    } or {
      hold(10);
      stream.emit(1)
      hold(10);
      stream.emit(2)
      stream.emit(3)
      stream.emit(4)
    }
    result .. assert.eq([1,2,3,4]);
  };

  test('buffers up to one item if iteration blocks') {||
    var stream = event.Emitter();
    var result = [];
    waitfor {
      stream .. seq.tailbuffer .. seq.each {|item|
        result.push(item);
        if (item == 1) hold(150);
      }
    } or {
      stream.emit(1)
      hold(100);
      stream.emit(2)
      stream.emit(3)
      stream.emit(4)
      hold(150);
      stream.emit(5)
      hold(100);
    }
    result .. assert.eq([1,4,5]);
  }

  test('ignore events before iteration') {||
    var stream = event.Emitter();
    var result = [];
    waitfor {
      stream.emit(1)
      hold(10);
      stream.emit(2)
      hold(10);
      stream.emit(3)
      stream.emit(4)
    } or {
      
      stream .. seq.each {|item|
        result.push(item);
      }
    }
    result .. assert.eq([2,3,4]);
  };
}

context('wait()') {||
  test('with filter arg') { ||
    var stream = event.Emitter();
    var rv;
    waitfor {
      rv = stream .. event.wait(x -> x == 2 );
    } or {
      stream.emit(1);
      stream.emit(2);
      stream.emit(3);
    }
    rv .. assert.eq(2);
  }
}
