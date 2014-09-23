/*
 * StratifiedJS 'dashdash' module
 *
 * Part of the Stratified JavaScript Standard Module Library
 * Version: '0.20.0-development'
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2013 Oni Labs, http://onilabs.com
 *
 *
 *   ***************************************************************
 *   *    DO NOT EDIT dashdash.sjs - IT IS A GENERATED FILE!       *
 *   *    EDIT THE SOURCE CODE UNDER stratifiedjs/src/deps AND RUN *
 *   *    stratifiedjs/src/build/make-sjs                          *
 *   ***************************************************************
 *
 *
 * This file is derived from the "dashdash" project
 * (https://github.com/trentm/node-dashdash),
 * which is available under the terms of the MIT License.
 *
 * Original License Text:
 *
 * # This is the MIT license
 *
 * Copyright (c) 2013 Trent Mick. All rights reserved.
 * Copyright (c) 2013 Joyent Inc. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
  @module    dashdash
  @summary   Options parser (tracking the [node-dashdash library](https://github.com/trentm/node-dashdash))
  @home      sjs:dashdash
  @desc
    This module tracks the [dashdash](https://github.com/trentm/node-dashdash) library by Trent Mick.
    The original library is written for node.js, but this version works in all environments.

    ### Usage
    
        var dashdash = require('sjs:dashdash');
        
        // Specify the options. Minimally `name` (or `names`) and `type`
        // must be given for each.
        var options = [
            {
                // `names` or a single `name`. First element is the `opts.KEY`.
                names: ['help', 'h'],
                // See "Option config" below for types.
                type: 'bool',
                help: 'Print this help and exit.'
            }
        ];
        
        // Shortcut form. As called it infers `sys.argv()`. See below for
        // the longer form to use methods like `.help()` on the Parser object.
        var opts = dashdash.parse({options: options});
        
        console.log("opts:", opts);
        console.log("args:", opts._args);
    
    
    ### Longer Example
    
    A more realistic starter script "foo.js" is as follows.
    This also shows using `parser.help()` for formatted option help.
    
        var dashdash = require('sjs:dashdash');
        
        var options = [
            {
                name: 'version',
                type: 'bool',
                help: 'Print tool version and exit.'
            },
            {
                names: ['help', 'h'],
                type: 'bool',
                help: 'Print this help and exit.'
            },
            {
                names: ['verbose', 'v'],
                type: 'arrayOfBool',
                help: 'Verbose output. Use multiple times for more verbose.'
            },
            {
                names: ['file', 'f'],
                type: 'string',
                help: 'File to process',
                helpArg: 'FILE'
            }
        ];
        
        var parser = dashdash.createParser({options: options});
        try {
            var opts = parser.parse();
        } catch (e) {
            console.error('foo: error: %s', e.message);
            process.exit(1);
        }
        
        console.log("# opts:", opts);
        console.log("# args:", opts._args);
        
        // Use `parser.help()` for formatted options help.
        if (opts.help) {
            var help = parser.help({includeEnv: true}).trimRight();
            console.log('usage: node foo.js [OPTIONS]\n'
                        + 'options:\n'
                        + help);
            process.exit(0);
        }
        
        // ...
    
    
    Some example output from this script (foo.js):
    
        $ node foo.js -h
        # opts: { help: true,
          _order: [ { name: 'help', value: true, from: 'argv' } ],
          _args: [] }
        # args: []
        usage: node foo.js [OPTIONS]
        options:
            --version             Print tool version and exit.
            -h, --help            Print this help and exit.
            -v, --verbose         Verbose output. Use multiple times for more verbose.
            -f FILE, --file=FILE  File to process
        
        $ node foo.js -v
        # opts: { verbose: [ true ],
          _order: [ { name: 'verbose', value: true, from: 'argv' } ],
          _args: [] }
        # args: []
        
        $ node foo.js --version arg1
        # opts: { version: true,
          _order: [ { name: 'version', value: true, from: 'argv' } ],
          _args: [ 'arg1' ] }
        # args: [ 'arg1' ]
        
        $ node foo.js -f bar.txt
        # opts: { file: 'bar.txt',
          _order: [ { name: 'file', value: 'bar.txt', from: 'argv' } ],
          _args: [] }
        # args: []
        
        $ node foo.js -vvv --file=blah
        # opts: { verbose: [ true, true, true ],
          file: 'blah',
          _order:
           [ { name: 'verbose', value: true, from: 'argv' },
             { name: 'verbose', value: true, from: 'argv' },
             { name: 'verbose', value: true, from: 'argv' },
             { name: 'file', value: 'blah', from: 'argv' } ],
          _args: [] }
        # args: []
    
    
    ### Environment variable integration
    
    If you want to allow environment variables to specify options to your tool,
    dashdash makes this easy. We can change the 'verbose' option in the example
    above to include an 'env' field:
    
            {
                names: ['verbose', 'v'],
                type: 'arrayOfBool',
                env: 'FOO_VERBOSE',         // <--- add this line
                help: 'Verbose output. Use multiple times for more verbose.'
            },
    
    then the **"FOO_VERBOSE" environment variable** can be used to set this
    option:
    
        $ FOO_VERBOSE=1 node foo.js
        # opts: { verbose: [ true ],
          _order: [ { name: 'verbose', value: true, from: 'env' } ],
          _args: [] }
        # args: []
    
    Boolean options will interpret the empty string as unset, '0' as false
    and anything else as true.
    
        $ FOO_VERBOSE= node examples/foo.js                 # not set
        # opts: { _order: [], _args: [] }
        # args: []
        
        $ FOO_VERBOSE=0 node examples/foo.js                # '0' is false
        # opts: { verbose: [ false ],
          _order: [ { key: 'verbose', value: false, from: 'env' } ],
          _args: [] }
        # args: []
        
        $ FOO_VERBOSE=1 node examples/foo.js                # true
        # opts: { verbose: [ true ],
          _order: [ { key: 'verbose', value: true, from: 'env' } ],
          _args: [] }
        # args: []
        
        $ FOO_VERBOSE=boogabooga node examples/foo.js       # true
        # opts: { verbose: [ true ],
          _order: [ { key: 'verbose', value: true, from: 'env' } ],
          _args: [] }
        # args: []
    
    Non-booleans can be used as well. Strings:
    
        $ FOO_FILE=data.txt node examples/foo.js
        # opts: { file: 'data.txt',
          _order: [ { key: 'file', value: 'data.txt', from: 'env' } ],
          _args: [] }
        # args: []
    
    Numbers:
    
        $ FOO_TIMEOUT=5000 node examples/foo.js
        # opts: { timeout: 5000,
          _order: [ { key: 'timeout', value: 5000, from: 'env' } ],
          _args: [] }
        # args: []
        
        $ FOO_TIMEOUT=blarg node examples/foo.js
        foo: error: arg for "FOO_TIMEOUT" is not a positive integer: "blarg"
    
    With the `includeEnv: true` config to `parser.help()` the environment
    variable can also be included in **help output**:
    
        usage: node foo.js [OPTIONS]
        options:
            --version             Print tool version and exit.
            -h, --help            Print this help and exit.
            -v, --verbose         Verbose output. Use multiple times for more verbose.
                                  Environment: FOO_VERBOSE=1
            -f FILE, --file=FILE  File to process
    
    
    ### Parser config
    
    Parser construction (i.e. `dashdash.createParser(CONFIG)`) takes the
    following fields:
    
    - `options` (Array of option specs). Required. See the
      `Option specs` section below.
    
    - `interspersed` (Boolean). Option. Default is true. If true this allows
      interspersed arguments and options. I.e.:
    
            node ./tool.js -v arg1 arg2 -h   # '-h' is after interspersed args
    
      Set it to false to have '-h' **not** get parsed as an option in the above
      example.
    
    
    ### Option specs
    
    Example using all fields:
    
        {
            names: ['file', 'f'],       // Required (or `name`).
            type: 'string',             // Required.
            env: 'MYTOOL_FILE',
            help: 'Config file to load before running "mytool"',
            helpArg: 'PATH',
            default: path.resolve(process.env.HOME, '.mytoolrc')
        }
    
    Each option spec in the `options` array must/can have the following fields:
    
    - `name` (String) or `names` (Array). Required. These give the option name
      and aliases. The first name (if more than one given) is the key for the
      parsed `opts` object.
    
    - `type` (String). Required. One of:
    
        - bool
        - string
        - number
        - integer
        - positiveInteger
        - arrayOfBool
        - arrayOfString
        - arrayOfNumber
        - arrayOfInteger
        - arrayOfPositiveInteger
    
      FWIW, these names attempt to match with asserts on
      [assert-plus](https://github.com/mcavage/node-assert-plus).
    
    - `env` (String or Array of String). Optional. An environment variable name
      (or names) that can be used as a fallback for this option. For example,
      given a "foo.js" like this:
    
            var options = [{names: ['dry-run', 'n'], env: 'FOO_DRY_RUN'}];
            var opts = dashdash.parse({options: options});
    
      Both `node foo.js --dry-run` and `FOO_DRY_RUN=1 node foo.js` would result
      in `opts.dry_run = true`.
    
      An environment variable is only used as a fallback, i.e. it is ignored if
      the associated option is given in `argv`.
    
    - `help` (String). Optional. Used for `parser.help()` output.
    
    - `helpArg` (String). Optional. Used in help output as the placeholder for
      the option argument, e.g. the "PATH" in:
    
            ...
            -f PATH, --file=PATH    File to process
            ...
    
    - `default`. Optional. A default value used for this option, if the
      option isn't specified in argv.
    
    
    ### Help config
    
    The `parser.help(...)` function is configurable as follows:
    
        Options:
            -w WEAPON, --weapon=WEAPON  Weapon with which to crush. One of: |
                                        sword, spear, maul                  |
            -h, --help                  Print this help and exit.           |
        ^^^^                            ^                                   |
            `-- indent                   `-- helpCol              maxCol ---'
    
    - `indent` (Number or String). Default 4. Set to a number (for that many
      spaces) or a string for the literal indent.
    - `nameSort` (String). Default is 'length'. By default the names are
      sorted to put the short opts first (i.e. '-h, --help' preferred
      to '--help, -h'). Set to 'none' to not do this sorting.
    - `maxCol` (Number). Default 80. Note that reflow is just done on whitespace
      so a long token in the option help can overflow maxCol.
    - `helpCol` (Number). If not set a reasonable value will be determined
      between `minHelpCol` and `maxHelpCol`.
    - `minHelpCol` (Number). Default 20.
    - `maxHelpCol` (Number). Default 40.
    - `includeEnv` (Boolean). Default false. If the option has associated
      environment variables (via the `env` option spec attribute), then
      append mentioned of those envvars to the help string.
    

*/

/**
  @function parse
  @param {Settings} [settings]
  @setting {Object} [config]
  @setting {Array} [argv=require('sjs:sys').argv()]
  @setting {Object} [env]
  @setting {Number} [slice=0]
  @summary Parse an array of arguments.
  @desc
    Create a parser and parse the given `argv` (or [sys::argv]`()` if no
    `argv` option is given).

    See the [dashdash::] module docs for more information and examples.
 */

/**
  @class Parser
  @summary Use [::createParser] to create a Parser.
  @function createParser
  @param {Object} [config]
  @param {Boolean} [interspersed] Default true.
  @summary Create a [::Parser].
  @desc
    See the [dashdash::] module docs for more information and examples.

  @function Parser.parse
  @summary Parse an array of arguments.
  @param {optional Array} [argv=sys.argv()] Array of string arguments.
  @param {Settings} [settings]
  @setting {Array} [argv]
  @setting {Object} [env]
  @setting {Number} [slice=0]
  @desc
    `argv` should always be provided in a browser environment. In the
    nodejs environment it may be omitted, in which case the arguments
    will be taken from [sys::argv].

    See the [dashdash::] module docs for more information and examples.

  @function Parser.help
  @param {Settings} [options]
  @setting {Number|String} [indent] Number of indent spaces (or a string to be used)
  @setting {Number} [maxCol] Maximum line width (default 80).

  @summary Return a help string for this parser.
  @desc
    Only the most commonly-used options are listed here.
    See the [dashdash::] module docs for a full list of options.
 */



/**
  turn off docs from this point onwards:
  @docsoff
*/

// prevent errors in xbrowser env
var sys = require('builtin:apollo-sys');
var global = sys.getGlobal();
var process = sys.hostenv == 'xbrowser' ? {env: {}} : global.process;
var assert = require('./assert');
var { each, map, join, indexed } = require('./sequence');
var { ownKeys, clone } = require('./object');

var format = function(str /*, replacements ... */) {
    // upstream uses node.js' util/format function,
    // which isn't available in the browser.
    var str = arguments[0];
    var idx = 1;
    var args = arguments;
    return str.replace(/%(.)/g, function(text, fmt) {
        var obj = args[idx++];
        if (fmt == 'j') return JSON.stringify(obj);
        return String(obj);
    });
}

/**
 * dashdash - A light, featureful and explicit option parsing library for
 * node.js.
 */

// ---- internal support stuff

function space(n) {
    var s = '';
    for (var i = 0; i < n; i++) {
        s += ' ';
    }
    return s;
}


/**
 * Return an array of lines wrapping the given text to the given width.
 * This splits on whitespace. Single tokens longer than `width` are not
 * broken up.
 */
function textwrap(s, width) {
    var words = s.trim().split(/\s+/);
    var lines = [];
    var line = '';
    words..each(function (w) {
        var newLength = line.length + w.length;
        if (line.length > 0)
            newLength += 1;
        if (newLength > width) {
            lines.push(line);
            line = '';
        }
        if (line.length > 0)
            line += ' ';
        line += w;
    });
    lines.push(line);
    return lines;
}


/**
 * Transform an option name to a "key" that is used as the field
 * on the `opts` object returned from `<parser>.parse()`.
 *
 * Transformations:
 * - '-' -> '_': This allow one to use hyphen in option names (common)
 *   but not have to do silly things like `opt["dry-run"]` to access the
 *   parsed results.
 */
function optionKeyFromName(name) {
    return name.replace(/-/g, '_');
}



// ---- Option types

function parseBool(option, optstr, arg) {
    return Boolean(arg);
}

function parseString(option, optstr, arg) {
    assert.string(arg, 'arg');
    return arg;
}

function parseNumber(option, optstr, arg) {
    assert.string(arg, 'arg');
    var num = Number(arg);
    if (isNaN(num)) {
        throw new Error(format('arg for "%s" is not a number: "%s"',
            optstr, arg));
    }
    return num;
}

function parseInteger(option, optstr, arg) {
    assert.string(arg, 'arg');
    var num = Number(arg);
    if (!/^[0-9-]+$/.test(arg) || isNaN(num)) {
        throw new Error(format('arg for "%s" is not an integer: "%s"',
            optstr, arg));
    }
    return num;
}

function parsePositiveInteger(option, optstr, arg) {
    assert.string(arg, 'arg');
    var num = Number(arg);
    if (!/^[0-9]+$/.test(arg) || isNaN(num)) {
        throw new Error(format('arg for "%s" is not a positive integer: "%s"',
            optstr, arg));
    }
    return num;
}

var types = {
    bool: {
        takesArg: false,
        parseArg: parseBool
    },
    string: {
        takesArg: true,
        helpArg: 'ARG',
        parseArg: parseString
    },
    number: {
        takesArg: true,
        helpArg: 'NUM',
        parseArg: parseNumber
    },
    integer: {
        takesArg: true,
        helpArg: 'INT',
        parseArg: parseInteger
    },
    positiveInteger: {
        takesArg: true,
        helpArg: 'INT',
        parseArg: parsePositiveInteger
    },
    arrayOfBool: {
        takesArg: false,
        array: true,
        parseArg: parseBool
    },
    arrayOfString: {
        takesArg: true,
        helpArg: 'ARG',
        array: true,
        parseArg: parseString
    },
    arrayOfNumber: {
        takesArg: true,
        helpArg: 'NUM',
        array: true,
        parseArg: parseNumber
    },
    arrayOfInteger: {
        takesArg: true,
        helpArg: 'INT',
        array: true,
        parseArg: parseInteger
    },
    arrayOfPositiveInteger: {
        takesArg: true,
        helpArg: 'INT',
        array: true,
        parseArg: parsePositiveInteger
    },
};



// ---- Parser

/**
 * Parser constructor.
 *
 * @param config {Object} The parser configuration
 *      - options {Array} Array of option specs. See the README for how to
 *        specify each option spec.
 *      - interspersed {Boolean} Default true. Whether to allow interspersed
 *        arguments (non-options) and options. E.g.:
 *              node tool.js arg1 arg2 -v
 *        '-v' is after some args here. If `interspersed: false` then '-v'
 *        would not be parsed out. Note that regardless of `interspersed`
 *        the presence of '--' will stop option parsing, as all good
 *        option parsers should.
 */
function Parser(config) {
    assert.object(config, 'config');
    assert.arrayOfObject(config.options, 'config.options');
    assert.optionalBool(config.interspersed, 'config.interspersed');
    var self = this;

    // Allow interspersed arguments (true by default).
    this.interspersed = (config.interspersed !== undefined
        ? config.interspersed : true);

    this.options = config.options..map(clone);
    this.optionFromName = {};
    this.optionFromEnv = {};
    for (var i = 0; i < this.options.length; i++) {
        var o = this.options[i];
        assert.ok(types[o.type],
            format('invalid config.options.%d.type: "%s" in %j',
                   i, o.type, o));
        assert.optionalString(o.name, format('config.options.%d.name', i));
        assert.optionalArrayOfString(o.names,
            format('config.options.%d.names', i));
        assert.ok((o.name || o.names) && !(o.name && o.names),
            format('exactly one of "name" or "names" required: %j', o));
        assert.optionalString(o.help, format('config.options.%d.help', i));
        var env = o.env || [];
        if (typeof (env) === 'string') {
            env = [env];
        }
        assert.optionalArrayOfString(env, format('config.options.%d.env', i));

        if (o.name) {
            o.names = [o.name];
        } else {
            assert.string(o.names[0],
                format('config.options.%d.names is empty', i));
        }
        o.key = optionKeyFromName(o.names[0]);
        o.names..each(function (n) {
            if (self.optionFromName[n]) {
                throw new Error(format(
                    'option name collision: "%s" used in %j and %j',
                    n, self.optionFromName[n], o));
            }
            self.optionFromName[n] = o;
        });
        env..each(function (n) {
            if (self.optionFromEnv[n]) {
                throw new Error(format(
                    'option env collision: "%s" used in %j and %j',
                    n, self.optionFromEnv[n], o));
            }
            self.optionFromEnv[n] = o;
        });
    }
}

Parser.prototype.optionTakesArg = function optionTakesArg(option) {
    return types[option.type].takesArg;
};

/**
 * Parse options from the given argv.
 *
 * @param inputs {Object}
 *      - argv {Array} Optional. The argv to parse. Defaults to
 *        `sys.argv()`.
 *      - slice {Number} The index into argv at which options/args begin.
 *        Default is 0, as appropriate for `sys.argv()`.
 *      - env {Object} Optional. The env to use for 'env' entries in the
 *        option specs. Defaults to `process.env`.
 * @returns {Object} Parsed `opts`. It has special keys `_args` (the
 *      remaining args from `argv`) and `_order` (gives the order that
 *      options were specified).
 */
Parser.prototype.parse = function parse(inputs) {
    var self = this;

    // Old API was `parse([argv, [slice]])`
    if (Array.isArray(arguments[0])) {
        inputs = {argv: arguments[0], slice: arguments[1]};
    }

    if (inputs === undefined) inputs = {};
    assert.object(inputs, 'inputs');
    assert.optionalArrayOfString(inputs.argv, 'inputs.argv');
    assert.optionalNumber(inputs.slice, 'inputs.slice');
    var argv = inputs.argv || require('sjs:sys').argv();
    var slice = inputs.slice !== undefined ? inputs.slice : 0;
    var args = argv.slice(slice);
    var env = inputs.env || process.env;
    var opts = {};
    var _order = [];

    function addOpt(option, optstr, key, val, from) {
        var type = types[option.type];
        var parsedVal = type.parseArg(option, optstr, val);
        if (type.array) {
            if (!opts[key]) {
                opts[key] = [];
            }
            opts[key].push(parsedVal);
        } else {
            opts[key] = parsedVal;
        }
        var item = { key: key, value: parsedVal, from: from };
        _order.push(item);
    }

    // Parse args.
    var _args = [];
    var i = 0;
    while (i < args.length) {
        var arg = args[i];

        // End of options marker.
        if (arg === '--') {
            i++;
            break;

        // Long option
        } else if (arg.slice(0, 2) === '--') {
            var name = arg.slice(2);
            var val = null;
            var idx = name.indexOf('=');
            if (idx !== -1) {
                val = name.slice(idx + 1);
                name = name.slice(0, idx);
            }
            var option = this.optionFromName[name];
            if (!option) {
                throw new Error(format('unknown option: "--%s"', name));
            }
            var takesArg = this.optionTakesArg(option);
            if (val !== null && !takesArg) {
                throw new Error(format('argument given to "--%s" option '
                    + 'that does not take one: "%s"', name, arg));
            }
            if (!takesArg) {
                addOpt(option, '--'+name, option.key, true, 'argv');
            } else if (val !== null) {
                addOpt(option, '--'+name, option.key, val, 'argv');
            } else if (i + 1 >= args.length) {
                throw new Error(format('do not have enough args for "--%s" '
                    + 'option', name));
            } else {
                addOpt(option, '--'+name, option.key, args[i + 1], 'argv');
                i++;
            }

        // Short option
        } else if (arg.charAt(0) === '-' && arg.length > 1) {
            var j = 1;
            while (j < arg.length) {
                var name = arg.charAt(j);
                var val = arg.slice(j + 1);  // option val if it takes an arg
                // debug('name: %s (val: %s)', name, val)
                var option = this.optionFromName[name];
                if (!option) {
                    if (arg.length > 2) {
                        throw new Error(format(
                            'unknown option: "-%s" in "%s" group',
                            name, arg));
                    } else {
                        throw new Error(format('unknown option: "-%s"', name));
                    }
                }
                var takesArg = this.optionTakesArg(option);
                if (!takesArg) {
                    addOpt(option, '-'+name, option.key, true, 'argv');
                } else if (val) {
                    addOpt(option, '-'+name, option.key, val, 'argv');
                    break;
                } else {
                    if (i + 1 >= args.length) {
                        throw new Error(format('do not have enough args '
                            + 'for "-%s" option', name));
                    }
                    addOpt(option, '-'+name, option.key, args[i + 1], 'argv');
                    i++;
                    break;
                }
                j++;
            }

        // An interspersed arg
        } else if (this.interspersed) {
            _args.push(arg);

        // An arg and interspersed args are not allowed, so done options.
        } else {
            break;
        }
        i++;
    }
    _args = _args.concat(args.slice(i));

    // Parse environment.
    ownKeys(this.optionFromEnv)..each(function (envname) {
        var val = env[envname];
        if (val === undefined)
            return;
        var option = self.optionFromEnv[envname];
        if (opts[option.key] !== undefined)
            return;
        var takesArg = self.optionTakesArg(option);
        if (takesArg) {
            addOpt(option, envname, option.key, val, 'env');
        } else if (val !== '') {
            // Boolean envvar handling:
            // - VAR=<empty-string>     not set (as if the VAR was not set)
            // - VAR=0                  false
            // - anything else          true
            addOpt(option, envname, option.key, (val !== '0'), 'env');
        }
    });

    // Apply default values.
    this.options..each(function (o) {
        if (o['default'] !== undefined && opts[o.key] === undefined) {
            opts[o.key] = o['default'];
        }
    });

    opts._order = _order;
    opts._args = _args;
    return opts;
};


/**
 * Return help output for the current options.
 *
 * E.g.: if the current options are:
 *      [{names: ['help', 'h'], type: 'bool', help: 'Show help and exit.'}]
 * then this would return:
 *      '  -h, --help     Show help and exit.\n'
 *
 * @param config {Object} Config for controlling the option help output.
 *      - indent {Number|String} Default 4. An indent/prefix to use for
 *        each option line.
 *      - nameSort {String} Default is 'length'. By default the names are
 *        sorted to put the short opts first (i.e. '-h, --help' preferred
 *        to '--help, -h'). Set to 'none' to not do this sorting.
 *      - maxCol {Number} Default 80. Note that long tokens in a help string
 *        can go past this.
 *      - helpCol {Number} Set to specify a specific column at which
 *        option help will be aligned. By default this is determined
 *        automatically.
 *      - minHelpCol {Number} Default 20.
 *      - maxHelpCol {Number} Default 40.
 *      - includeEnv {Boolean} Default false.
 * @returns {String}
 */
Parser.prototype.help = function help(config) {
    config = config || {};
    assert.object(config, 'config');
    var indent;
    if (config.indent === undefined) {
        indent = space(4);
    } else if (typeof (config.indent) === 'number') {
        indent = space(config.indent);
    } else if (typeof (config.indent) === 'string') {
        indent = config.indent;
    } else {
        assert.fail('invalid "config.indent": not a string or number: '
            + config.indent);
    }
    assert.optionalString(config.nameSort, 'config.nameSort');
    var nameSort = config.nameSort || 'length';
    assert.ok(~['length', 'none'].indexOf(nameSort),
        'invalid "config.nameSort"');
    assert.optionalNumber(config.maxCol, 'config.maxCol');
    assert.optionalNumber(config.maxHelpCol, 'config.maxHelpCol');
    assert.optionalNumber(config.minHelpCol, 'config.minHelpCol');
    assert.optionalNumber(config.helpCol, 'config.helpCol');
    assert.optionalBool(config.includeEnv, 'config.includeEnv');
    var maxCol = config.maxCol || 80;
    var minHelpCol = config.minHelpCol || 20;
    var maxHelpCol = config.maxHelpCol || 40;

    var lines = [];
    var maxWidth = 0;
    this.options..each(function (o) {
        var type = types[o.type];
        var arg = o.helpArg || type.helpArg || 'ARG';
        var line = '';
        var names = o.names.slice();
        if (nameSort === 'length') {
            names.sort(function (a, b) {
                if (a.length < b.length)
                    return -1;
                else if (b.length < a.length)
                    return 1;
                else
                    return 0;
            })
        }
        names..indexed..each(function ([i, name]) {
            if (i > 0)
                line += ', ';
            if (name.length === 1) {
                line += '-' + name
                if (type.takesArg)
                    line += ' ' + arg;
            } else {
                line += '--' + name
                if (type.takesArg)
                    line += '=' + arg;
            }
        });
        maxWidth = Math.max(maxWidth, line.length);
        lines.push(line);
    });

    // Add help strings.
    var helpCol = config.helpCol;
    if (!helpCol) {
        helpCol = maxWidth + indent.length + 2;
        helpCol = Math.min(Math.max(helpCol, minHelpCol), maxHelpCol);
    }
    this.options..indexed..each(function ([i,o]) {
        if (!o.help && !(config.includeEnv && o.env)) {
            return;
        }
        var line = lines[i];
        var n = helpCol - (indent.length + line.length);
        if (n >= 0) {
            line += space(n);
        } else {
            line += '\n' + space(helpCol);
        }
        var help = (o.help || '').trim();
        if (o.env && o.env.length && config.includeEnv) {
            if (help.length && !~'.!?'.indexOf(help.slice(-1))) {
                help += '.';
            }
            if (help.length) {
                help += ' ';
            }
            help += 'Environment: ';
            var type = types[o.type];
            var arg = o.helpArg || type.helpArg || 'ARG';
            var envs = (Array.isArray(o.env) ? o.env : [o.env])..map(function (e) {
                if (type.takesArg) {
                    return e + '=' + arg;
                } else {
                    return e + '=1';
                }
            });
            help += envs..join(', ');
        }
        line += textwrap(help, maxCol - helpCol)..join(
            '\n' + space(helpCol));
        lines[i] = line;
    });

    var rv = '';
    if (lines.length > 0) {
        rv = indent + lines..join('\n' + indent) + '\n';
    }
    return rv;
};



// ---- exports

function createParser(config) {
    return new Parser(config);
}

/**
 * Parse argv with the given options.
 *
 * @param config {Object} A merge of all the available fields from
 *      `dashdash.Parser` and `dashdash.Parser.parse`: options, interspersed,
 *      argv, env, slice.
 */
var parse = exports.parse = function parse(config) {
    assert.object(config, 'config');
    assert.optionalArrayOfString(config.argv, 'config.argv');
    assert.optionalObject(config.env, 'config.env');
    var config = clone(config);
    var argv = config.argv;
    delete config.argv;
    var env = config.env;
    delete config.env;

    var parser = new Parser(config);
    return parser.parse({argv: argv, env: env});
}

module.exports = {
    createParser: createParser,
    Parser: Parser,
    parse: parse
};
