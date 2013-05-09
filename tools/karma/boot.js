// plain JS, loaded in the browser to bootstrap our test suite
(function() {
  var karma = window.__karma__;
  karma.start = function (config) {
    config = config || {};
    var argv = Array.prototype.slice.call((config && config.argv) || ['--list']);
    if(/debug\.html(#.*)?$/.test(window.top.location.href)) {
      argv = undefined; // take argv from document.location.href, just like the default HTML runner
    }
    karma.argv = argv;

    require.hubs.unshift(['sjs:', '/rocket/__oni/apollo/modules/']);
    
    // TODO: can we paramaterize this require() call so that others can use boot.js?
    require('/rocket/tools/karma/run',

      {callback: function(err, val) {
        if(err) {
          karma.result({
            description: err.message || "",
            suite: [],
            success: false,
            time: 0,
            log: []
          });
        }
        karma.complete();
      }});
  };
})();


