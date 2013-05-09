module.exports = function(karma) {
  karma.configure({

    basePath: '../../',

    frameworks: [],

    files: [
      'test/json2.js', // required for IE<8 only
      'oni-apollo.js',
      'tools/karma/boot.js',
    ],

    proxies: {
      '/rocket/': 'http://' + process.env['ROCKET_HOST'] + '/'
    },

    exclude: [],

    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['progress'],


    // web server port
    port: 9876,


    // cli runner port
    runnerPort: 9100,


    colors: true,


    // possible values: karma.LOG_DISABLE || karma.LOG_ERROR || karma.LOG_WARN || karma.LOG_INFO || karma.LOG_DEBUG
    logLevel: karma.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    browsers: [
      'Chrome',
      'PhantomJS',
      'tools/bin/manual-browser',
      'tools/bin/android-browser',
    ],


    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false,


    // plugins to load
    plugins: [
      'karma-chrome-launcher'
      ,'karma-script-launcher'
      ,'karma-phantomjs-launcher'
    ],
  });
};
