// plain JS, loaded in the browser to bootstrap our test suite
(function() {
  var karma = window.__karma__;
  var DEBUG = /debug\.html([#?].*)?$/.test(window.top.location.href);
  var FAIL = function(msg) {
    karma.result({
      description: msg,
      suite: [],
      success: false,
      time: 0,
      log: []
    });
    karma.complete();
    if(DEBUG) alert(msg);
  }
  karma.start = function (config) {
    try {
      config = config || {};
      var suitePath;

      if(DEBUG) {
        var suiteMatch = window.top.location.href.match(/[?&]suite=([^&#]+)/);
        suitePath = suiteMatch && suiteMatch[1];
        if (!suitePath) {
          return FAIL("When using debug.html you must specify your suite and arguments in the URL query params - e.g. debug.html?suite=test/run.html#--help");
        }
      } else {
        var argv = karma.argv = Array.prototype.slice.call((config && config.clientArgs) || []);
        suitePath = argv.shift();
      }

      if (!suitePath) {
        return FAIL("Please specify path to your suite script as the first argument");
      }

      require.hubs.unshift(['sjs:', '/rocket/__oni/sjs/modules/']);
    
      require('/rocket/' + suitePath,
        {callback: function(err, val) {
          if(err) FAIL(err.message || "");
          else karma.complete();
        }});
    } catch(e) {
      FAIL(e.message || "");
    }
  };
})();


