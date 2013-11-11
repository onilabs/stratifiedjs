/**
@summary StratifiedJS language syntax
@type doc

@syntax collapse
@summary Abort other branches in a waitfor/or
@desc
  The `collapse` keyword may only occur inside a
  `waitfor/or` block.

  When encountered, all other branches will
  immediately be aborted.

@syntax Quasi quotes
@summary Rich string interpolation (backtick-strings)
@desc
  Quasi-quotes ("quasis") look like strings, but are delimited by backticks
  (\`) instead of single or double quotes.

  Within a quasi, you can insert interpolated expressions by placing them inside
  `${ ... }`.

  Unlike string interpolation, a quasi-quoted value is a rich object. It maintains
  the original values alongside the literal portions. TODO: complete...

  ### Shorthand interpolation

  As shorthand, you can omit the `{}` braces when inserting single variables or calling a named functions:

   - `$variable_name`
   - `$method(args ...)`

   Note that this only works for single-word variables and functions - you cannot use this shorthand for
   dotted properties like `$foo.bar` or `$str.trim()`.
*/
