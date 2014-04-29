/**
@summary StratifiedJS metadata syntax
@type doc

@desc
  Metadata comments are also known as "doc comments", although they are used
  for more than just documentation. Metadata comments are those that start
  with a double-star:
  
      /**
        @key value
        @key2 value2

        etc ...
      *\/
  
  For documentation-specific directives, see [./documentation::].
  
  Within a metadata comment, the following
  format applies:

  To set `key` = `"value"`:

      @key value

  To set `key` = `"true"`:

      @key

  or, for multi-line values:

      @key
        Line 1
        Line 2

  Multi-line values are indent-sensitive. The first value line must be
  indented more than to the `@key` line, and the field ends when it
  encounters content that is less indented than the first line.

  **Note:** Within a single metadata comment, `@key` lines must have a consistent indent
  (i.e the `@` symbols must align vertically).

@feature @require
@summary Declare a dependency on a module
@desc
  When using the [bundle::] module to collect a module's dependencies, it
  acts conservatively - any require() statement that uses a dynamic variable or
  is executed conditionally will not be taken into account.

  To ensure the bundler picks up a dependency, you can include it in
  a `@require` annotation. `mod` can be an absolute or relative module reference.

  ### Example:

      /**
        @require sjs:xbrowser/dom
        @require ./dom-helpers
      *\/

      var dom;
      if(hostenv == 'xbrowser') {
        dom = require(['sjs:xbrowser/dom', './dom-helpers']);
      }
      
      // ...

*/
