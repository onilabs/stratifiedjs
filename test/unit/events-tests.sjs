var {test, context, assert} = require('sjs:test/suite');

var seq = require('sjs:sequence');
var obj = require('sjs:object');
var events = require('sjs:events');
var array = require('sjs:array');
var sys = require('builtin:apollo-sys');
var func = require('sjs:function');
var logging = require('sjs:logging');

// An abstraction for a host-environment event emitter that
// we can manually trigger events on:
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
      var e = events.Emitter();
      waitfor {
        e.wait();
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
    var e = events.Emitter();
    waitfor {
      e.wait();
    } or {
      hold(100);
    }
    assert.eq(e.waiting, []);
  };

  test('setting with a value') {||
    var e = events.Emitter();
    var results = [];
    waitfor {
      results.push(e.wait());
      results.push(e.wait());
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
        using (var emitter = events.HostEmitter(s.emitter.raw, 'click')) {
          assert.eq(s.emitter.listeners('click').length, 1);
          while(true) {
            logging.info("waiting");
            var e = emitter.wait().detail;
            logging.info("got");
            result.push(e);
            logging.info(`got event: ${e}`);
            if (e >= 3) break; // stop after event 3
          }
        }
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
      using (var emitter = events.HostEmitter([s.emitter.raw, emitter2.raw], ['click', 'drag'])) {
        assert.eq(s.emitter.listeners('click').length, 1);
        assert.eq(s.emitter.listeners('drag').length, 1);
        waitfor {
          while(true) {
            result.push(emitter.wait().detail);
          }
        } or {
          s.emitter.trigger('click', 1);
          s.emitter.trigger('drag', 2);
          emitter2.trigger('click', 3);
        }
      }

      assert.eq(result, [1, 2, 3]);
    }

    test('wait() shortcut') {|s|
      var result = [];
      waitfor {
        result.push(events.wait(s.emitter.raw, 'click').detail);
      } and {
        s.emitter.trigger('click', 1);
        s.emitter.trigger('click', 2);
      }
      assert.eq(result, [1]);
    }

    test("filter") {|s|
      waitfor {
        events.wait(s.emitter.raw, 'click', {filter:x -> x.detail > 2}).detail .. assert.eq(3);
      } and {
        s.emitter.trigger('click', 1);
        s.emitter.trigger('click', 2);
        s.emitter.trigger('click', 3);
        s.emitter.trigger('click', 4);
      }
    }

    test("transform") {|s|
      waitfor {
        events.wait(s.emitter.raw, 'click', {transform:x -> x.detail}) .. assert.eq(1);
      } and {
        s.emitter.trigger('click', 1);
      }
    }

    test("filter + transform") {|s|
      waitfor {
        events.wait(s.emitter.raw, 'click', {filter: x -> x > 2, transform: x -> x.detail}) .. assert.eq(3);
      } and {
        s.emitter.trigger('click', 1);
        s.emitter.trigger('click', 2);
        s.emitter.trigger('click', 3);
        s.emitter.trigger('click', 4);
      }
    }
  }

  context('when') {||
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
        events.when(s.emitter.raw, 'click', opts) {|e|
          log.push(e.value);
          if (e.value == 3) break;
          hold(200);
        }
      } and {
        allEvents .. seq.each {|e|
          s.emitter.trigger('click', e);
          hold(100);
        }
      }
      log .. assert.eq([1,3]);
    }

    test("buffers events when `queue` specified") {|s|
      var log = [];
      waitfor {
        events.when(s.emitter.raw, 'click', opts .. obj.merge({queue: true})) {|e|
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
    var runTest = function(emitter, opts, triggerBlock) {
      var results = [];
      using(var q = emitter.queue(opts)) {
        waitfor {
          while(true) {
            var e = q.get().detail;
            results.push(e);
            hold(10);
          }
        } or {
          triggerBlock();
          assert.eq(results, [1]);
          while(results.length < 3) hold(10);
        }
        assert.eq(results, [1, 2, 3]);
      }
    }

    test('queues sjs events') {||
      var emitter = events.Emitter();
      runTest(emitter, null) {||
        emitter.emit({detail: 1});
        emitter.emit({detail: 2});
        emitter.emit({detail: 3});
      }
    }

    test('queues native events') {|s|
      var emitter = events.from(s.emitter.raw, 'click');
      runTest(emitter, null) {||
        s.emitter.trigger('click', 1);
        s.emitter.trigger('click', 2);
        s.emitter.trigger('click', 3);
      }
    }

    test('leaves underlying emitter running when `bound` is false') {|s|
      var emitter = events.from(s.emitter.raw, 'click');
      using(var q = emitter.queue({bound: false})) {
        assert.eq(s.emitter.listeners('click').length, 1);
      }
      assert.eq(s.emitter.listeners('click').length, 1);
      emitter.stop();
    }

    test('multiple randomly-timed events') {|s|
      var emitter = events.from(s.emitter.raw, 'click');
      waitfor {
        using (var Q = emitter.queue()) {
          for (var i=0; i<10; ++i) {
            hold(Math.random()*100);
            Q.get();
          }
        }
      }
      and {
        for (var j=0; j<10; ++j) {
          hold(Math.random()*100);
          s.emitter.trigger('click');
        }
      }
      assert.eq(Q.count(), 0, "Not all events consumed");
      s.emitter.trigger('click');
      assert.eq(Q.count(), 0, "Queue still listening when it shouldn't");
    }

  }
}


context("stream") {||
  test('basic iteration') {||
    var evt = events.Emitter();
    var result = [];
    waitfor {
      evt.stream() .. seq.each {|item|
        result.push(item);
      }
    } or {
      hold(10);
      evt.emit(1)
      hold(10);
      evt.emit(2)
      evt.emit(3)
      evt.emit(4)
    }
    result .. assert.eq([1,2,3,4]);
  };

  test('buffers up to one item if iteration blocks') {||
    var evt = events.Emitter();
    var result = [];
    waitfor {
      evt.stream() .. seq.each {|item|
        result.push(item);
        if (item == 1) hold(15);
      }
    } or {
      evt.emit(1)
      hold(10);
      evt.emit(2)
      evt.emit(3)
      evt.emit(4)
      hold(15);
      evt.emit(5)
    }
    result .. assert.eq([1,4,5]);
  }

  test('only buffers once iteration begins') {||
    var evt = events.Emitter();
    var result = [];
    var stream = evt.stream();
    waitfor {
      evt.emit(1)
      hold(10);
      evt.emit(2)
      hold(10);
      evt.emit(3)
      evt.emit(4)
    } or {
      stream .. seq.each {|item|
        result.push(item);
      }
    }
    result .. assert.eq([2,3,4]);
  };
}
