/**
 * NOTE: Do not edit dashdash-tests.sjs; it
 * is copied from the upstream tests
 * (at src/deps/dashdash/tests/basics.test.js)
 */

var {test:mkTest, context, assert} = require('sjs:test/suite');
var {testFn} = require('../lib/testUtil');
var object = require('sjs:object');
var seq = require('sjs:sequence');
var dashdash = require('sjs:dashdash');


// shim to run dashdash's upstream tests without (much) modification
var t = assert;
var test = function(desc, fn) {
  mkTest(desc, -> fn(object.merge(assert, {end: -> null})));
}
var format = require('sjs:string').supplant;
var debug = require('sjs:logging').info;

// ---- tests

test('exports', function (t) {
    t.ok(dashdash.createParser, 'dashdash.createParser');
    t.ok(dashdash.parse, 'dashdash.parse');
    t.ok(dashdash.Parser, 'dashdash.Parser');
    t.end();
});

test('createParser', function (t) {
    var options = [{name: 'help', type: 'bool'}];
    var parser = dashdash.createParser({options: options});
    t.ok(parser);
    t.end();
});

test('Parser', function (t) {
    var options = [{name: 'help', type: 'bool'}];
    var parser = new dashdash.Parser({options: options});
    t.ok(parser);
    t.end();
});

test('parse', function (t) {
    var options = [{name: 'help', type: 'bool'}];
    var argv = 'node tool.js --help'.split(/\s+/g);
    var opts = dashdash.parse({options: options, argv: argv});
    t.ok(opts);
    t.end();
});


test('old Parser.parse() API', function (t) {
    var options = [{name: 'v', type: 'bool'}];
    var parser = new dashdash.Parser({options: options});
    var opts = parser.parse('-v'.split(/\s+/g));
    debug('opts:', opts);
    t.ok(opts.v);
    opts = parser.parse('-v'.split(/\s+/g), 0);
    t.ok(opts.v);
    t.end();
});


test('slice', function (t) {
    var options = [{name: 'v', type: 'bool'}];
    var parser = new dashdash.Parser({options: options});
    var opts = parser.parse({argv: '-v'.split(/\s+/g)});
    t.ok(opts.v);
    t.equal(opts._args.length, 0);
    var opts = parser.parse({argv: '-v'.split(/\s+/g), slice: 0});
    t.ok(opts.v);
    t.equal(opts._args.length, 0);
    t.end();
});


var cases = [
    // no opts
    {
        options: [],
        argv: 'node tool.js',
        expect: {
            _args: []
        }
    },
    {
        options: [],
        argv: 'node tool.js a b c',
        expect: {
            _args: ['a', 'b', 'c']
        }
    },
    {
        options: [ {name: 'help', type: 'bool'} ],
        argv: 'node tool.js a b',
        expect: {
            _args: ['a', 'b']
        }
    },

    // '--'
    {
        options: [ {name: 'help', type: 'bool'} ],
        argv: 'node tool.js -- a',
        expect: {
            _args: ['a']
        }
    },
    {
        options: [ {name: 'help', type: 'bool'} ],
        argv: 'node tool.js a -- b',
        expect: {
            _args: ['a', 'b']
        }
    },
    {
        options: [ {name: 'help', type: 'bool'} ],
        argv: 'node tool.js a -- --help',
        expect: {
            _args: ['a', '--help']
        }
    },

    // '--long-opt'
    {
        options: [ {name: 'help', type: 'bool'} ],
        argv: 'node tool.js --help',
        expect: {
            help: true,
            _args: []
        }
    },
    {
        options: [ {name: 'help', type: 'bool'} ],
        argv: 'node tool.js --help a b',
        expect: {
            help: true,
            _args: ['a', 'b']
        }
    },
    {
        options: [ {name: 'help', type: 'bool'} ],
        argv: 'node tool.js a --help b',
        expect: {
            help: true,
            _args: ['a', 'b']
        }
    },
    {
        options: [ {name: 'help', type: 'bool'} ],
        argv: 'node tool.js a --help b',
        interspersed: true,
        expect: {
            help: true,
            _args: ['a', 'b']
        }
    },
    {
        options: [ {name: 'help', type: 'bool'} ],
        argv: 'node tool.js a --help b',
        interspersed: false,
        expect: {
            _args: ['a', '--help', 'b']
        }
    },
    {
        options: [ {name: 'help', type: 'bool'} ],
        argv: 'node tool.js --help=foo',
        expect: /argument given to .* option that does not take one/,
    },
    {
        options: [ {name: 'file', type: 'string'} ],
        argv: 'node tool.js --file',
        expect: /do not have enough args/
    },
    {
        options: [ {name: 'file', type: 'string', 'default': '/dev/null'} ],
        argv: 'node tool.js',
        expect: {
            file: '/dev/null',
            _args: []
        }
    },
    {
        options: [ {name: 'file', type: 'string'} ],
        argv: 'node tool.js --file foo.txt',
        expect: {
            file: 'foo.txt',
            _args: []
        }
    },
    {
        options: [ {name: 'file', type: 'string'} ],
        argv: 'node tool.js --file=foo.txt',
        expect: {
            file: 'foo.txt',
            _args: []
        }
    },

    // short opts
    {
        options: [ {name: 'h', type: 'bool'} ],
        argv: 'node tool.js -',
        expect: {
            _args: ['-']
        }
    },
    {
        options: [ {name: 'h', type: 'bool'} ],
        argv: 'node tool.js -h',
        expect: {
            h: true,
            _args: []
        }
    },
    {
        options: [ {name: 'f', type: 'string'} ],
        argv: 'node tool.js -f',
        expect: /do not have enough args/
    },
    {
        options: [ {name: 'f', type: 'string'} ],
        argv: 'node tool.js -f foo.txt',
        expect: {
            f: 'foo.txt',
            _args: []
        }
    },
    {
        options: [ {name: 'f', type: 'string'} ],
        argv: 'node tool.js -ffoo.txt',
        expect: {
            f: 'foo.txt',
            _args: []
        }
    },
    {
        options: [ {name: 'l', type: 'bool'},
                   {names: ['all', 'a'], type: 'bool'} ],
        argv: 'node ls.js -l -a dir',
        expect: {
            l: true,
            all: true,
            _order: [ {key: 'l', value: true, from: 'argv'},
                {key: 'all', value: true, from: 'argv'} ],
            _args: ['dir']
        }
    },
    {
        options: [ {name: 'l', type: 'bool'},
                   {names: ['all', 'a'], type: 'bool'} ],
        argv: 'node ls.js -l dir -a',
        expect: {
            l: true,
            all: true,
            _order: [ {key: 'l', value: true, from: 'argv'},
                {key: 'all', value: true, from: 'argv'} ],
            _args: ['dir']
        }
    },
    {
        options: [ {name: 'l', type: 'bool'},
                   {names: ['all', 'a'], type: 'bool'} ],
        argv: 'node ls.js -l dir -a',
        interspersed: false,
        expect: {
            l: true,
            _order: [ {key: 'l', value: true, from: 'argv'} ],
            _args: ['dir', '-a']
        }
    },
    {
        options: [ {name: 'l', type: 'bool'},
                   {names: ['all', 'a'], type: 'bool'} ],
        argv: 'node ls.js -la dir',
        expect: {
            l: true,
            all: true,
            _args: ['dir']
        }
    },

    // type=number
    {
        options: [
            {name: 'a', type: 'number'},
            {name: 'b', type: 'number'},
            {name: 'c', type: 'number'},
            {name: 'd', type: 'number'},
            {name: 'e', type: 'number'},
            ],
        argv: 'node tool.js -a 5 -b4 -c -1 -d -3.14159 -e 1.0e42 foo',
        expect: {
            a: 5,
            b: 4,
            c: -1,
            d: -3.14159,
            e: 1.0e42,
            _args: ['foo']
        }
    },
    {
        options: [ {names: ['timeout', 't'], type: 'number'} ],
        argv: 'node tool.js -t 5a',
        /* JSSTYLED */
        expect: /arg for "-t" is not a number/
    },

    // type: arrayOf*
    {
        options: [ {names: ['verbose', 'v'], type: 'arrayOfBool'} ],
        argv: 'node tool.js -vvv foo bar',
        expect: {
            verbose: [true, true, true],
            _args: ['foo', 'bar']
        }
    },
    {
        options: [ {names: ['verbose', 'v'], type: 'arrayOfBool'} ],
        argv: 'node tool.js foo bar',
        expect: {
            // verbose: undefined,
            _args: ['foo', 'bar']
        }
    },
    {
        options: [ {names: ['weapon', 'w'], type: 'arrayOfString'} ],
        argv: 'node tool.js -w club --weapon mallet -w sword bang',
        expect: {
            weapon: ['club', 'mallet', 'sword'],
            _args: ['bang']
        }
    },
    {
        options: [ {names: ['split', 's'], type: 'arrayOfNumber'} ],
        argv: 'node tool.js --split 10 -s 5 -s 0.01 bang',
        expect: {
            split: [10, 5, 0.01],
            _args: ['bang']
        }
    },

    // help
    {
        options: [
            {names: ['help', 'h'], type: 'bool', help: 'Show help and exit.'}
        ],
        argv: 'node tool.js --help',
        expectHelp: /-h, --help\s+Show help and exit./
    },

    // integer
    {
        options: [ {name: 't', type: 'integer'} ],
        argv: 'node tool.js -t 0',
        expect: { t: 0, _args: [] }
    },
    {
        options: [ {name: 't', type: 'integer'} ],
        argv: 'node tool.js -t 42',
        expect: { t: 42, _args: [] }
    },
    {
        options: [ {name: 't', type: 'integer'} ],
        argv: 'node tool.js -t42',
        expect: { t: 42, _args: [] }
    },
    {
        options: [ {name: 't', type: 'integer'} ],
        argv: 'node tool.js -t -5',
        expect: { t: -5, _args: [] }
    },
    {
        options: [ {name: 't', type: 'integer'} ],
        argv: 'node tool.js -t-5',
        expect: { t: -5, _args: [] }
    },
    {
        options: [ {name: 't', type: 'integer'} ],
        argv: 'node tool.js -t 1e2',
        /* JSSTYLED */
        expect: /arg for "-t" is not an integer/
    },
    {
        options: [ {name: 't', type: 'integer'} ],
        argv: 'node tool.js -t 0x32',
        /* JSSTYLED */
        expect: /arg for "-t" is not an integer/
    },
    {
        options: [ {name: 't', type: 'integer'} ],
        argv: 'node tool.js -t 3.1',
        /* JSSTYLED */
        expect: /arg for "-t" is not an integer/
    },
    {
        options: [ {name: 't', type: 'integer'} ],
        argv: 'node tool.js -t 42.',
        /* JSSTYLED */
        expect: /arg for "-t" is not an integer/
    },
    {
        options: [ {name: 't', type: 'integer'} ],
        argv: 'node tool.js -t 1e-2',
        /* JSSTYLED */
        expect: /arg for "-t" is not an integer/
    },
    {
        options: [ {name: 't', type: 'arrayOfInteger'} ],
        argv: 'node tool.js',
        expect: { _args: [] }
    },
    {
        options: [ {name: 't', type: 'arrayOfInteger'} ],
        argv: 'node tool.js -t 42',
        expect: { t: [42], _args: [] }
    },
    {
        options: [ {name: 't', type: 'arrayOfInteger'} ],
        argv: 'node tool.js -t 1 -t 2 -t -3',
        expect: { t: [1, 2, -3], _args: [] }
    },
    {
        options: [ {name: 't', type: 'arrayOfInteger'} ],
        argv: 'node tool.js -t 1 -t 1e2',
        /* JSSTYLED */
        expect: /arg for "-t" is not an integer/
    },

    // positiveInteger
    {
        options: [ {name: 't', type: 'positiveInteger'} ],
        argv: 'node tool.js -t 0',
        expect: { t: 0, _args: [] }
    },
    {
        options: [ {name: 't', type: 'positiveInteger'} ],
        argv: 'node tool.js -t 42',
        expect: { t: 42, _args: [] }
    },
    {
        options: [ {name: 't', type: 'positiveInteger'} ],
        argv: 'node tool.js -t42',
        expect: { t: 42, _args: [] }
    },
    {
        options: [ {name: 't', type: 'positiveInteger'} ],
        argv: 'node tool.js -t -5',
        /* JSSTYLED */
        expect: /arg for "-t" is not a positive integer/
    },
    {
        options: [ {name: 't', type: 'arrayOfPositiveInteger'} ],
        argv: 'node tool.js -t42',
        expect: { t: [42], _args: [] }
    },
    {
        options: [ {name: 't', type: 'arrayOfPositiveInteger'} ],
        argv: 'node tool.js -t 42 -t -5',
        /* JSSTYLED */
        expect: /arg for "-t" is not a positive integer/
    },

    // env
    {
        options: [ {name: 'v', env: 'FOO_VERBOSE', type: 'bool'} ],
        argv: 'node foo.js -v',
        /* JSSTYLED */
        expect: {
            v: true,
            _args: [],
            _order: [ {key: 'v', value: true, from: 'argv'} ]
        }
    },
    {
        options: [ {name: 'v', env: 'FOO_VERBOSE', type: 'bool'} ],
        argv: 'node foo.js -v',
        env: {FOO_VERBOSE: '1'},
        /* JSSTYLED */
        expect: {
            v: true,
            _args: [],
            _order: [ {key: 'v', value: true, from: 'argv'} ]
        }
    },
    {
        options: [ {name: 'v', env: 'FOO_VERBOSE', type: 'bool'} ],
        argv: 'node foo.js',
        env: {FOO_VERBOSE: '1'},
        expect: {
            v: true,
            _args: [],
            _order: [ {key: 'v', value: true, from: 'env'} ]
        }
    },
    {
        options: [ {name: 'v', env: 'FOO_VERBOSE', type: 'bool'} ],
        argv: 'node foo.js',
        env: {FOO_VERBOSE: '0'},
        expect: {
            v: false,
            _args: [],
            _order: [ {key: 'v', value: false, from: 'env'} ]
        }
    },
    {
        options: [ {name: 'v', env: 'FOO_VERBOSE', type: 'bool'} ],
        argv: 'node foo.js',
        env: {FOO_VERBOSE: ''},
        /* JSSTYLED */
        expect: { _args: [] }
    },

    // env help
    {
        options: [
            {names: ['a'], type: 'string', env: 'A', help: 'Phrase'},
            {names: ['b'], type: 'string', env: 'B', help: 'Sentence.'},
            {names: ['c'], type: 'string', env: 'C', help: 'Question?'},
            {names: ['d'], type: 'string', env: 'D', help: 'Exclamation!'},
            {names: ['e'], type: 'string', env: 'E', help: ' '},
            {names: ['f'], type: 'string', env: 'F', help: ''},
            {names: ['g'], type: 'string', env: 'G'},
            {names: ['h'], type: 'bool', env: 'H'},
        ],
        argv: 'node tool.js --help',
        helpOptions: { includeEnv: true },
        expectHelp: [
            /-a ARG\s+Phrase. Environment: A=ARG/,
            /-b ARG\s+Sentence. Environment: B=ARG/,
            /-c ARG\s+Question\? Environment: C=ARG/,
            /-d ARG\s+Exclamation! Environment: D=ARG/,
            /-e ARG\s+Environment: E=ARG/,
            /-f ARG\s+Environment: F=ARG/,
            /-g ARG\s+Environment: G=ARG/,
            /-h\s+Environment: H=1/,
        ]
    },

    // env (number)
    {
        options: [ {names: ['timeout', 't'], env: 'FOO_TIMEOUT', type: 'number'} ],
        argv: 'node foo.js -t 42',
        env: {},
        /* JSSTYLED */
        expect: { timeout: 42, _args: [] }
    },
    {
        options: [ {names: ['timeout', 't'], env: 'FOO_TIMEOUT', type: 'number'} ],
        argv: 'node foo.js',
        env: {FOO_TIMEOUT: '32'},
        /* JSSTYLED */
        expect: { timeout: 32, _args: [] }
    },
    {
        options: [ {names: ['timeout', 't'], env: 'FOO_TIMEOUT', type: 'number'} ],
        argv: 'node foo.js -t 52',
        env: {FOO_TIMEOUT: '32'},
        /* JSSTYLED */
        expect: { timeout: 52, _args: [] }
    },

    // Test that a validation fail in env throws, but NOT if a valid
    // value is given in CLI opts (i.e. when env is ignored).
    {
        options: [ {names: ['timeout', 't'], env: 'FOO_TIMEOUT', type: 'number'} ],
        argv: 'node foo.js -t 52',
        env: {FOO_TIMEOUT: 'wallawalla'},
        /* JSSTYLED */
        expect: { timeout: 52, _args: [] }
    },
    {
        options: [ {names: ['timeout', 't'], env: 'FOO_TIMEOUT', type: 'number'} ],
        argv: 'node foo.js',
        env: {FOO_TIMEOUT: 'wallawalla'},
        expect: /arg for "FOO_TIMEOUT" is not a number: "wallawalla"/
    },

    // env (arrayOfBool)
    {
        options: [ {name: 'v', env: 'FOO_VERBOSE', type: 'arrayOfBool'} ],
        argv: 'node foo.js',
        env: {FOO_VERBOSE: 'blah'},
        /* JSSTYLED */
        expect: { v: [true], _args: [] }
    },
    {
        options: [ {name: 'v', env: 'FOO_VERBOSE', type: 'arrayOfBool'} ],
        argv: 'node foo.js -v',
        env: {FOO_VERBOSE: 'blah'},
        /* JSSTYLED */
        expect: { v: [true], _args: [] }
    },
    {
        options: [ {name: 'v', env: 'FOO_VERBOSE', type: 'arrayOfBool'} ],
        argv: 'node foo.js -vv',
        env: {FOO_VERBOSE: 'blah'},
        /* JSSTYLED */
        expect: { v: [true, true], _args: [] }
    },

    // key name transformation
    {
        options: [ {names: ['dry-run', 'n'], type: 'bool'} ],
        argv: 'node foo.js --dry-run',
        /* JSSTYLED */
        expect: { dry_run: true, _args: [] }
    },
    {
        options: [ {name: 'foo-bar-', type: 'bool'} ],
        argv: 'node foo.js --foo-bar-',
        /* JSSTYLED */
        expect: { foo_bar_: true, _args: [] }
    },

    // issue #1: 'env' not taking precendence over 'default'
    {
        options: [ {
            names: ['file', 'f'],
            env: 'FOO_FILE',
            'default': 'default.file',
            type: 'string'
        } ],
        argv: 'node foo.js',
        expect: { file: 'default.file', _args: [] }
    },
    {
        options: [ {
            names: ['file', 'f'],
            env: 'FOO_FILE',
            'default': 'default.file',
            type: 'string'
        } ],
        env: {FOO_FILE: 'env.file'},
        argv: 'node foo.js',
        expect: { file: 'env.file', _args: [] }
    },
    {
        options: [ {
            names: ['file', 'f'],
            env: 'FOO_FILE',
            'default': 'default.file',
            type: 'string'
        } ],
        argv: 'node foo.js -f argv.file',
        env: {FOO_FILE: 'env.file'},
        expect: { file: 'argv.file', _args: [] }
    },

    {
        options: [ {
            names: ['verbose', 'v'],
            env: 'FOO_VERBOSE',
            'default': false,
            type: 'bool'
        } ],
        argv: 'node foo.js',
        expect: { verbose: false, _args: [] }
    },
    {
        options: [ {
            names: ['verbose', 'v'],
            env: 'FOO_VERBOSE',
            'default': false,
            type: 'bool'
        } ],
        argv: 'node foo.js',
        env: {FOO_VERBOSE: '1'},
        expect: { verbose: true, _args: [] }
    },
    {
        options: [ {
            names: ['verbose', 'v'],
            env: 'FOO_VERBOSE',
            'default': false,
            type: 'bool'
        } ],
        argv: 'node foo.js',
        env: {FOO_VERBOSE: '0'},
        expect: { verbose: false, _args: [] }
    },
    {
        options: [ {
            names: ['verbose', 'v'],
            env: 'FOO_VERBOSE',
            'default': false,
            type: 'bool'
        } ],
        argv: 'node foo.js -v',
        env: {FOO_VERBOSE: '0'},
        expect: { verbose: true, _args: [] }
    },
];
cases .. seq.indexed .. seq.each {|[num, c]|
    var expect = c.expect;
    delete c.expect;
    var expectHelps = c.expectHelp;
    if (!Array.isArray(expectHelps)) {
        expectHelps = expectHelps ? [expectHelps] : [];
        for (var i = 0; i < expectHelps.length; i++) {
            if (typeof (expectHelps[i]) === 'string') {
                expectHelps[i] = new RegExp(expectHelps[i]);
            }
        }
    }
    delete c.expectHelp;
    var helpOptions = c.helpOptions;
    delete c.helpOptions;
    var argv = c.argv;
    delete c.argv;
    if (typeof (argv) === 'string') {
        argv = argv.split(/\s+/);
    }
    // remove nodejs & module path, in line with sys.argv()
    argv = argv.slice(2);
    var env = c.env;
    delete c.env;
    var envStr = '';
    if (env) {
        env .. object.ownKeys .. seq.each(function(e) {
            envStr += "#{e}=#{env[e]}";
        });
    }
    var testName = "case #{num}: #{envStr}#{argv.join(' ')}";
    test(testName, function (t) {
        debug('--', num)
        debug('c: ', c)
        var parser = new dashdash.Parser(c);
        var opts;
        if (expect instanceof RegExp) {
            assert.raises({message: expect}, -> parser.parse({argv: argv, env: env}));
        } else if (expect) {
            opts = parser.parse({argv: argv, env: env});
            if (!expect._order) {
                delete opts._order; // don't test it, if not in case data
            }
            debug('opts: ', opts)
            t.eq(opts, expect);
        }
        if (expectHelps.length) {
            var help = parser.help(helpOptions);
            expectHelps .. seq.each(function (eH) {
                t.ok(eH.test(help), format(
                    'help did not match '+eH+': "'+help+'"', eH, help));
            });
        }
        t.end();
    });
}
