/**
@summary StratifiedJS documentation directives
@type doc

@desc
  Documentation in StratifiedJS is embedded in [./metadata::] comments.

  The current documentation format is not yet fully documented,
  so for now you will need to follow by example using the
  StratifiedJS standard library source code (there is a [source]
  link at the bottom of each documentation page, which may help).

// TODO: other documentation directives


@feature sjs-lib-index.txt
@summary Per-folder metadata
@desc
  StratifiedJS' documentation tools use this file to assign
  metadata to a folder. In particular tools
  will not traverse any directory unless it contains a
  `sjs-lib-index.txt` file, to avoid indexing unrelated source code.

  The format of this file is the same as in SJS source code, except the
  command delimiters (`/**` and `*\/`) are not required.

  ### Example:
  
      # sjs-lib-index.txt
      @name MyLib
      @summary Tools for doing great things
      @version 1.0.5


*/
