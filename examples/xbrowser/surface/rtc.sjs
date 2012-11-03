// HTML5 RTC helpers
// XXX this will go into a future xbrowser/rtc module:

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia || navigator.msGetUserMedia;

exports.hasGetUserMedia = function() { return !!navigator.getUserMedia };

exports.getUserMedia = function(constraints) {
  waitfor (var rv, success) {
    navigator.getUserMedia(constraints, 
                           { |stream| resume(stream, true) },
                           { |error|  resume(error, false) });
  }
  if (!success) throw rv;
  return rv;
};

