var testUtil = require('./lib/testUtil');
var test = testUtil.test;

if(!testUtil.isBrowser) {

  var s = require("sjs:nodejs/stream");

  // ReadableStringStream:
  test("ReadableStringStream emits data", "data", function() {
    var stream = new s.ReadableStringStream("data");
    var data = '';
    stream.on('data', function(newData) {
      data += newData;
    });
    waitfor() {
      stream.on('end', resume);
    }
    return data;
  });

  test("ReadableStringStream supports pause/resume", "[pause] [resume] data", function() {
    var stream = new s.ReadableStringStream("data");
    stream.pause();
    var data = '';
    stream.on('data', function(newData) {
      data += newData;
    });
    data += "[pause] ";
    hold(100);
    stream.resume();
    data += "[resume] ";
    waitfor() {
      stream.on('end', resume);
    }
    return data;
  });

  test("WritableStringStream", "[data][end]", function() {
    var stream = new s.WritableStringStream();
    waitfor {
      waitfor() { stream.on('end', resume); }
    }
    and {
      stream.write('[data]');
      stream.end('[end]');
    }
    return stream.data;
  });

  test("pump", "DATA", function() {
    var src = new s.ReadableStringStream('data');
    src.pause();
    var dest = new s.WritableStringStream();
    s.pump(src, dest, d -> d.toUpperCase());
    return dest.data;
  });

}
