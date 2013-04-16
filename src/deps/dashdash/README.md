A light, featureful and explicit option parsing library for node.js.

[Why another one? See below](#why). tl;dr: The others I've tried are one of
too loosey goosey (not explicit), too big/too many deps, or ill specified.
YMMV.

Follow <a href="https://twitter.com/intent/user?screen_name=trentmick" target="_blank">@trentmick</a>
for updates to node-dashdash.

# Install

    npm install dashdash


# Usage

```javascript
var dashdash = require('dashdash');

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

// Shortcut form. As called it infers `process.argv`. See below for
// the longer form to use methods like `.help()` on the Parser object.
var opts = dashdash.parse({options: options});

console.log("opts:", opts);
console.log("args:", opts._args);
```


# Longer Example

A more realistic [starter script "foo.js"](./examples/foo.js) is as follows.
This also shows using `parser.help()` for formatted option help.

```javascript
var dashdash = require('./lib/dashdash');

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
    var opts = parser.parse(process.argv);
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
```


Some example output from this script (foo.js):

```
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
```


# Environment variable integration

If you want to allow environment variables to specify options to your tool,
dashdash makes this easy. We can change the 'verbose' option in the example
above to include an 'env' field:

```javascript
    {
        names: ['verbose', 'v'],
        type: 'arrayOfBool',
        env: 'FOO_VERBOSE',         // <--- add this line
        help: 'Verbose output. Use multiple times for more verbose.'
    },
```

then the **"FOO_VERBOSE" environment variable** can be used to set this
option:

```shell
$ FOO_VERBOSE=1 node foo.js
# opts: { verbose: [ true ],
  _order: [ { name: 'verbose', value: true, from: 'env' } ],
  _args: [] }
# args: []
```

With the `includeEnv: true` config to `parser.help()` the environment
variable can also be included in **help output**:

    usage: node foo.js [OPTIONS]
    options:
        --version             Print tool version and exit.
        -h, --help            Print this help and exit.
        -v, --verbose         Verbose output. Use multiple times for more verbose.
                              Environment: FOO_VERBOSE=1
        -f FILE, --file=FILE  File to process


# Parser config

Parser construction (i.e. `dashdash.createParser(CONFIG)`) takes the
following fields:

- `options` (Array of option specs). Required. See the
  [Option specs](#option-specs) section below.

- `interspersed` (Boolean). Option. Default is true. If true this allows
  interspersed arguments and options. I.e.:

        node ./tool.js -v arg1 arg2 -h   # '-h' is after interspersed args

  Set it to false to have '-h' **not** get parsed as an option in the above
  example.


# Option specs

Example using all fields:

```javascript
{
    names: ['file', 'f'],       // Required (or `name`).
    type: 'string',             // Required.
    env: 'MYTOOL_FILE',
    help: 'Config file to load before running "mytool"',
    helpArg: 'PATH',
    default: path.resolve(process.env.HOME, '.mytoolrc')
}
```

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


# Help config

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


# Why

Why another node.js option parsing lib?

- `nopt` really is just for "tools like npm". Implicit opts (e.g. '--no-foo'
works for every '--foo'). Can't disable abbreviated opts. Can't do multiple
usages of same opt, e.g. '-vvv' (I think). Can't do grouped short opts.

- `optimist` has surprise interpretation of options (at least to me).
  Implicit opts mean ambiguities and poor error handling for fat-fingering.
  `process.exit` calls makes it hard to use as a libary.

- `optparse` Incomplete docs. Is this an attempted clone of Python's `optparse`.
  Not clear. Some divergence. `parser.on("name", ...)` API is weird.

- `argparse` Dep on underscore. No thanks just for option processing.
  `find lib | wc -l` -> `26`. Overkill.
  Argparse is a bit different anyway. Not sure I want that.

- `posix-getopt` No type validation. Though that isn't a killer. AFAIK can't
  have a long opt without a short alias. I.e. no `getopt_long` semantics.
  Also, no whizbang features like generated help output.


# License

MIT. See LICENSE.txt.
