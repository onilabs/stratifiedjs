# Usage

```javascript
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
```


# Longer Example

A more realistic starter script "foo.js" is as follows.
This also shows using `parser.help()` for formatted option help.

```javascript
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

Boolean options will interpret the empty string as unset, '0' as false
and anything else as true.

```shell
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
```

Non-booleans can be used as well. Strings:

```shell
$ FOO_FILE=data.txt node examples/foo.js
# opts: { file: 'data.txt',
  _order: [ { key: 'file', value: 'data.txt', from: 'env' } ],
  _args: [] }
# args: []
```

Numbers:

```shell
$ FOO_TIMEOUT=5000 node examples/foo.js
# opts: { timeout: 5000,
  _order: [ { key: 'timeout', value: 5000, from: 'env' } ],
  _args: [] }
# args: []

$ FOO_TIMEOUT=blarg node examples/foo.js
foo: error: arg for "FOO_TIMEOUT" is not a positive integer: "blarg"
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
  `Option specs` section below.

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

