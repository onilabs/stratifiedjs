module.exports = function(config) {
  config.set({
    basePath: '../../',

    frameworks: [
      'sjs',
    ],

    client: {
      // workaround for https://github.com/karma-runner/karma/issues/961
      captureConsole: true,
      hubs: {
        'sjs:': '/__sjs/modules/'
      },
    },

    files: [
      'test/json2.js', // required for IE<8 only
    ],

    proxies: {
      // http tests rely on dynamic behaviour (served by conductance)
      '/http': 'http://localhost:7071/http',

      // bundle-tests rely on conductance bundle functionality
      '/test/integration/fixtures': 'http://localhost:7071/test/integration/fixtures'
    },

    exclude: [],

    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['quiet'],

    // web server port
    port: 9876,

    // cli runner port
    runnerPort: 9100,

    colors: true,

    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    browsers: [
      'PhantomJS',
      // 'tools/bin/manual-browser',
      // 'tools/bin/android-browser',
    ],

    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 0,

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false,

    // plugins to load
    plugins: [
      'karma-chrome-launcher'
      ,'karma-firefox-launcher'
      ,'karma-ie-launcher'
      ,'karma-script-launcher'
      ,'karma-phantomjs-launcher'
      ,'karma-sjs-adapter'
      ,'karma-quiet-reporter'
    ],
  });
};
