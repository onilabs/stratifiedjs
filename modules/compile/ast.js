/*
 * C1 Stratified JavaScript parser 
 *
 * Part of StratifiedJS
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2011 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the GPL v2, see
 * http://www.gnu.org/licenses/gpl-2.0.html
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

/*

 *** OVERVIEW ***

 This parser needs to be preprocessed with CPP (the C preprocessor)
 and a 'kernel' file to yield a full compiler. There are currently
 three kernels, each implementing a different compiler:
 
  kernel-js.js.in    : plain JS compiler (just for sanity checking)
  kernel-jsmin.js.in : JS/SJS minifier/stringifier
  kernel-sjs.js.in   : SJS compiler (targetting stratifiedjs vm)

 Which kernel file is included is determined by preprocessor flags;
 see below.

 For each JS construct, the parser makes a macro call, e.g. GEN_WHILE
 for a 'while' statement. The actual macro implementations are in the
 kernel files - see the full list of macros that kernel files need to
 implement below.

 This somewhat weird arrangement is so that we can build different
 compilers from the same parser source, but we don't have to build a
 generic AST. A generic AST (like e.g. Narcissus produces it) needs to
 be retraversed to do something useful with it, whereas with the macro
 approach we can perform syntax-directed translation tasks at the same
 time as parsing the source. We could use function calls instead of
 macros, but macros lead to smaller source and faster compilers.

 Most of the macros are expected to return a "parse value" for the
 given construct (this can be a syntax tree node, a string, nothing,
 or whatever). The parser feeds the parse values of expressions to the
 enclosing expression. The ultimate result of the compilation is
 whatever END_SCRIPT() returns. E.g. the following program:

  1 + 2

 would generate something like the following sequence of macro calls:

  BEGIN_SCRIPT(context)
  GEN_LITERAL("number", "1", ctx) // remember return value as 'A'
  GEN_LITERAL("number", "2", ctx) // remember return value as 'B'
  GEN_INFIX_OP(A, '+', B, ctx) // remember return value as 'C'
  GEN_EXP_STMT(C, ctx) // remember return value as 'D'
  ADD_SCRIPT_STMT(D, ctx)
  END_SCRIPT(ctx) // return value is the result of compilation

 The best way to understand how the macros fit together is to look at
 kernel-js.js.in.

 * INTERNALS

 As a parsing technique, we first tokenize the stream using two big
 context-sensitve regular expressions (TOKENIZER_SA and
 TOKENIZER_OP). The tokenizer switches between these two, depending on
 whether we're in a 'statement/argument' position, or in an 'operator'
 position - this is required because in JavaScript certain constructs
 have different meanings in different contexts. E.g. a '/' can be the
 start of a regular expression (in a "statement/argument" position) or
 a division operator (in an "operator position").

 Next, we use the "Pratt parsing technique"
 (http://en.wikipedia.org/wiki/Pratt_parser). This is a version of
 recursive descent parsing where we encode operator precedence
 information directly into semantic tokens (see 'SemanticToken' class,
 below). A good introduction to Pratt parsing for JS is at
 http://javascript.crockford.com/tdop/tdop.html. What Douglas
 Crockford calls 'lbp', 'nud', and 'led', we call 
 'excbp' (expression continuation binding power), 
 'expsf' (expression start function) and
 'excf'  (expression continuation function), respectively.


 *** PREPROCESSOR FLAGS ***

(These flags are also valid in kernel files)

one of these required:
   define C1_KERNEL_JS
   define C1_KERNEL_SJS
   define C1_KERNEL_DEPS
   define C1_KERNEL_JSMIN  : compiles with the given kernel (and sets #define SJS appropriately)

general:
   define DEBUG_C1 : c1 debugging
   define VERBOSE_COMPILE_ERRORS : extra detail on compile errors (only interesting when debugging c1)
   define ECMA_GETTERS_SETTERS : allow ecma-style getters/setters
   define SJS_CORE : parse core SJS statements (set below)
   define MULTILINE_STRINGS : allow strings to include newlines; map to '\n' (set below)
   define SJS___JS: parse SJS's "__js" keyword
   define SJS_DESTRUCTURE: allow destructuring assignments (see http://wiki.ecmascript.org/doku.php?id=harmony:destructuring)
   define SJS_BLOCKLAMBDA: allow block lambdas (see http://wiki.ecmascript.org/doku.php?id=strawman:block_lambda_revival)
   define SJS_ARROWS: allow arrays (fat & thin) (see http://wiki.ecmascript.org/doku.php?id=harmony:arrow_function_syntax ; coffeescript)
   define SJS_DOUBLEDOT: allow double dot call syntax
   define SJS_DOUBLECOLON: allow double colon call syntax
   define SJS_ALTERNATE_NAMESPACE: allow '@' and '@identifier'
   define INTERPOLATING_STRINGS: allow strings with ruby-like interpolation
   define QUASIS: allow quasi templates (`foo#{bar}baz`)
   define ONE_SIDED_CONDITIONALS: allows `foo ? bar` expressions (i.e. `foo ? bar : baz` without alternative `baz`). in the `false` case they yield `undefined`

for C1_KERNEL_JSMIN:
   define STRINGIFY  : encodes minified js/sjs as a string.

for C1_KERNEL_SJS:  OBSOLETE! VERBOSE EXCEPTIONS ARE ALWAYS USED NOW, NOT
                    PREDICATED ON THIS FLAG ANYMORE
   define VERBOSE_EXCEPTIONS: add lineNumber/fileName info to VM nodes.
   
*/
/* define DEBUG_C1 1 */

/*

 *** MACROS TO BE IMPLEMENTED BY KERNEL FILES ***

Misc:
=====

HANDLE_NEWLINES(n, pctx)
  Note: only called for newlines outside of ml-strings!
  
Contexts:
=========

BEGIN_SCRIPT(pctx)
ADD_SCRIPT_STMT(stmt, pctx)
END_SCRIPT(pctx)

BEGIN_FBODY(pctx)
ADD_FBODY_STMT(stmt, pctx)
END_FBODY(pctx)

BEGIN_BLOCK(pctx)
ADD_BLOCK_STMT(stmt, pctx)
END_BLOCK(pctx)

BEGIN_CASE_CLAUSE(cexp, pctx)
ADD_CASE_CLAUSE_STMT(stmt, pctx)
END_CASE_CLAUSE(pctx)

- called for do-while/while/for/for-in bodies:
BEGIN_LOOP_SCOPE(pctx)
END_LOOP_SCOPE(pctx)

- called for switch bodies:
BEGIN_SWITCH_SCOPE(pctx)
END_SWITCH_SCOPE(pctx)

- if SJS_BLOCKLAMBDA is defined:
BEGIN_BLAMBDABODY(pctx)
ADD_BLAMBDABODY_STMT(stmt, pctx)
END_BLAMBDABODY(pctx)

Statements:
===========

GEN_EMPTY_STMT(pctx)
GEN_EXP_STMT(exp, pctx)
GEN_LBL_STMT(lbl, stmt, pctx)
GEN_FUN_DECL(fname, pars, body, pctx)
GEN_VAR_DECL(decls, pctx)
  decls = array of decl
  decl = [id_or_pattern, optional initializer]
GEN_IF(test, consequent, alternative, pctx)
GEN_DO_WHILE(body, test, pctx)
GEN_WHILE(test, body, pctx)
GEN_FOR(init_exp, decls, test_exp, inc_exp, body, pctx)
GEN_FOR_IN(lhs_exp, decl, obj_exp, body, pctx)
GEN_CONTINUE(lbl, pctx)
GEN_BREAK(lbl, pctx)
GEN_RETURN(exp, pctx)
GEN_WITH(exp, body, pctx)
GEN_SWITCH(exp, clauses, pctx)
GEN_THROW(exp, pctx)
GEN_TRY(block, crf, pctx)
    crf is [ [catch_id,catch_block,catchall?]|null, null, finally_block|null ]
    (ammended for SJS, see below)

Expressions:
============

GEN_INFIX_OP(left, id, right, pctx)
  id: + - * / % << >> >>> < > <= >= == != === !== & ^ | && || ,
      instanceof in
GEN_ASSIGN_OP(left, id, right, pctx)
  id: = *= /= %= += -= <<= >>= >>>= &= ^= |=
GEN_PREFIX_OP(id, right, pctx)
  id: ++ -- delete void typeof + - ~ ! (for SJS also: 'spawn')
GEN_POSTFIX_OP(left, id, pctx)
  id: ++ --
GEN_LITERAL(type, value, pctx)
GEN_IDENTIFIER(name, pctx)
GEN_OBJ_LIT(props, pctx)
  props : array of ["prop", string|id, val]
          if ECMA_GETTERS_SETTERS is defined, also:
                   ["get", string|id, function_body]
                   ["set", string|id, id, function_body]
          if SJS_DESTRUCTURE is defined, also: (destructure pattern)
                   ["pat", string|id, line]
GEN_ARR_LIT(elements, pctx)
GEN_ELISION(pctx)
GEN_DOT_ACCESSOR(l, name, pctx)
GEN_NEW(exp, args, pctx)
GEN_IDX_ACCESSOR(l, idxexp, pctx)
GEN_FUN_CALL(l, args, pctx)
GEN_FUN_EXP(fname, pars, body, pctx)
GEN_CONDITIONAL(test, consequent, alternative, pctx)
GEN_GROUP(e, pctx)
GEN_THIS(pctx)
GEN_TRUE(pctx)
GEN_FALSE(pctx)
GEN_NULL(pctx)

Stratified constructs:
======================

GEN_PREFIX_OP(id, right, pctx) takes another operator: 'spawn'

GEN_WAITFOR_ANDOR(op, blocks, crf, pctx)
  op: 'and' | 'or'
  crf: see GEN_TRY
BEGIN_SUSPEND_BLOCK(pctx)
END_SUSPEND_BLOCK(pctx)
GEN_SUSPEND(has_var, decls, block, crf, pctx)
GEN_COLLAPSE(pctx)
  crf: see GEN_TRY
GEN_TRY(block, crf, pctx) 
    crf is [ [catch_id,catch_block,catchall?]|null, retract_block|null, finally_block|null ]
    (instead of the non-SJS version above)

- if SJS___JS is set:

BEGIN___JS_BLOCK(pctx)
END___JS_BLOCK(pctx)
GEN___JS(body, pctx)

- if SJS_BLOCKLAMBDA is set:
GEN_BLOCKLAMBDA(pars, body, pctx)

- if SJS_ARROWS is set:
GEN_THIN_ARROW(body_exp, pctx)
GEN_THIN_ARROW_WITH_PARS(pars_exp, body_exp, pctx)
GEN_FAT_ARROW(body_exp, pctx)
GEN_FAT_ARROW_WITH_PARS(pars_exp, body_exp, pctx)

- if SJS_DOUBLEDOT is set
GEN_DOUBLEDOT_CALL(l, r, pctx)

- if SJS_DOUBLECOLON is set
GEN_DOUBLECOLON_CALL(l, r, pctx)

- if SJS_ALTERNATE_NAMESPACE is set
GEN_ALTERNATE_NAMESPACE_OBJ(pctx)
GEN_ALTERNATE_NAMESPACE_IDENTIFIER(name, pctx)

- if INTERPOLATING_STRINGS is set:
GEN_INTERPOLATING_STR(parts, pctx)

- if QUASIS is set:
GEN_QUASI(parts, pctx) with even parts=strings, odd parts=expressions

*/




/*
 * C1 JS/SJS->minified/stringified compiler kernel  
 *
 * Part of Oni StratifiedJS
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2011 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the GPL v2, see
 * http://www.gnu.org/licenses/gpl-2.0.html
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

//----------------------------------------------------------------------
// helpers:

function push_scope(pctx) {
  pctx.scopes.push({stmts:[]});
}
function pop_scope(pctx) {
  return pctx.scopes.pop();
}
function top_scope(pctx) {
  return pctx.scopes[pctx.scopes.length-1];
}

//define DEBUG_EXTENTS 1
//define DEBUG_TOKENS 1

//----------------------------------------------------------------------
// misc:


/* estree types */
function Loc(source, start, end) {
  if(source) this.source = source;
  this.start = start;
  this.end = end;
}
Loc.prototype.toString = function() { return this.start+":"+this.end; };
Loc.prototype.clone = function() {
  return new Loc(this.source, this.start, this.end);
}
Loc.prototype.merge = function(end) {
  if(!end) throw new Error("empty `end` passed to loc.merge");
  return new Loc(this.source, this.start, end.end);
}
function Pos(line, col) {
  this.line = line;
  this.column = col;
}
Pos.prototype.toString = function() { return "("+this.line+","+this.column+")"; };
var NodeProto = {};
NodeProto._init = function(pctx, extents) {
  if(pctx.extents) {
    _delegateExtents.call(this, extents);
  }
}
function Node(pctx) { }
Node.prototype = NodeProto;
Node.prototype.toString = function() {
  return "#<"+this.type+" node>";
}

function _delegateExtents(extents) {
  var node = this;
  var start = extents;
  var end;
  if(Array.isArray(extents)) {
    if(extents.length > 1) end = extents[1];
    start = extents[0];
  }

  if(!node) throw new Error("no node given!");
  if(!start) { throw new Error("Bad delegate for " + summarize(node)); }
  if(start.loc) {
    if(end && !end.loc) throw new Error("locless:" + end);
    node.loc = end ? start.loc.merge(end.loc) : start.loc;
  }
  if(!node.loc) throw new Error("empty location on " + node);
  if(start.range) {
    node.range = end ? [start.range[0], end.range[1]] : start.range;
  }
}


var NodeType = function(type, cons) {
  var proto = Object.create(NodeProto);
  proto.type = type;
  var rv = function(pctx, extents /*, ... */) {
    if(!pctx || !Object.hasOwnProperty.call(pctx, 'token')) {
      throw new Error("Not pctx: " + (pctx ? pctx.type : null) + "\n" + JSON.stringify(pctx));
    }
    var instance = Object.create(proto);
    Node.call(instance, pctx);
    cons.apply(instance, Array.prototype.slice.call(arguments, 2).concat([pctx, extents]));
    instance._init(pctx, extents);
    return instance;
  }
  rv.prototype = proto;
  Node[type] = rv;
  return proto;
};

var addComments = function(pctx, node) {
  if(pctx.comment) node.comments = []; // XXX
}

NodeType('Program', function Program(pctx) {
  this.body = [];
  addComments(pctx, this);
});
Node.Program.prototype._init = function() { /* noop */ }
Node.Program.prototype._end = function(pctx) {
  if(pctx.extents) _delegateExtents.call(this, this.body);
}

NodeType("BlockStatement", function(body, pctx) {
  this.body = body;
});

NodeType('MemberExpression', function(object, property, computed, pctx) {
  this.computed = computed;
  this.object = object;
  this.property = property;
});
// Node.MemberExpression.prototype.extents = function() { return [this.object, this.property] };

NodeType('Identifier', function(id, pctx) {
  this.name = id;
});

NodeType('BinaryExpression', function(left, id, right) {
  this.operator = id;
  this.left = left;
  this.right = right;
});

function UnaryExpression(pctx, ext, id, right, prefix) {
  var rv;
  if(id === '--' || id == '++') {
    rv = Node.UpdateExpression(pctx, ext, id, right, prefix);
  } else {
    rv = Node.UnaryExpression(pctx, ext, id, right, prefix);
  }
  return rv;
}
NodeType('UnaryExpression', function(id, right, prefix) {
  this.operator = id;
  this.argument = right;
  this.prefix = prefix;
});
NodeType('UpdateExpression', function(id, right, prefix) {
  this.operator = id;
  this.argument = right;
  this.prefix = prefix;
});

NodeType('AssignmentExpression', function(left, id, right) {
  this.operator = id;
  this.left = left;
  this.right = right;
});

NodeType('SequenceExpression', function(seq) {
  this.expressions = seq;
});
NodeType('ArrowFunctionExpression', function(params, body) {
  this.body = body;

  this.id = null;
  this.expression = true;
  var p = this.params = [];
  function collect(param) {
    if(param) {
      if(param instanceof Node.BinaryExpression) {
        if(param.operator !== ',') throw new Error("Unsupported operator in param list: " + param.operator);
        collect(param.left);
        collect(param.right);
      } else if(param instanceof Node.SequenceExpression) {
        for (var i=0; i<param.expressions.length; i++) {
          collect(param.expressions[i]);
        }
      } else {
        p.push(param);
      }
    }
  }
  collect(params);
  processParams(params);
});
Node.ArrowFunctionExpression.prototype.defaults = [];
Node.ArrowFunctionExpression.prototype.rest = null; // ?
Node.ArrowFunctionExpression.prototype.generator = false;

var StringLiteral = function(pctx, ext, val) {
  return Node.Literal(pctx, ext, '<string>', JSON.stringify(val), val);
}
NodeType('Literal', function(type, raw, expr, pctx, ext) {
  if(expr === undefined) {
    switch(type) {
      case '<number>':
      case '<string>':
      case '<regex>':
        // XXX this seems dodgy...
        // console.log("WARN: eval " + raw);
        expr = eval(raw); break;
      default: throw new Error("Unsupported literal type: "+type);
    }
  }
  this.raw = raw;
  this.value = expr;
  if(type === '<regex>') {
    var parts = raw.split('/'); // "/foo/g" -> ["", "foo", "g"];
    this.regex = {
      pattern: parts[1],
      flags: parts[2] || "",
    };
  }
});
Node.Literal.prototype.toString = function() { return "#<Literal("+this.raw+")>"; };
NodeType('Property', function(spec, pctx, ext) {
  this.kind = 'init'; // XXX
  this.method = false;
  this.shorthand = false;
  this.computed = false;

  this.key = Node.Identifier(pctx, ext, spec[1]);
  switch(spec[0]) {
    case 'prop':
      this.value = spec[2];
      break;

    case 'pat':
      this.value = this.key;
      this.shorthand = true;
      break;

    default:
      throw new Error("`"+spec[0]+"` props not supported");
  }                                                               });

NodeType('VariableDeclarator', function(id, value) {
  this.id = id;
  this.init = value || null;
});

NodeType('VariableDeclaration', function(decls, pctx, ext) {
  this.kind = 'var';
  this.declarations = decls.map(function(decl) {
    return Node.VariableDeclarator(pctx, decl[2] || ext, decl[0], decl[1]);
  });
});

NodeType('ArrayExpression', function(elems) {
  this.elements = elems;
  if(this.elements.indexOf(null) !== -1) {
    // elisions can't be values; must be a pattern
    this.type = 'ArrayPattern';
  }
});

NodeType('ObjectPattern', function(props) {
  this.properties = props;
});

NodeType('ConditionalExpression', function(test, cons, alt, pctx, ext) {
  this.test = test;
  this.consequent = cons;
  if(alt === undefined) alt = Node.Identifier(pctx, ext, 'undefined');
  this.alternate = alt;
});

function appendToken(pctx, token, dest) {
  if(pctx.loc || pctx.range) {
    var length = 0;
  }

  var copied = false;
  var copy = function() {
    if(!copied) {
      copied = true;
      // XXX it's assumed that token.clone exists on all reusable tokens
      if(token.clone) token = token.clone();
    }
  }


  var value;
  var range;
  if(token.id === '<string>') {
    // XXX this logic really belongs in the tokenizer...
    copy();
    value = token.value;
    if(token.inner) {
      var current = currentlyOpenToken(pctx);
      if(!current || current[0] !== token.inner) {
        console.log("Currently open tokens:", pctx.open_tokens);
        throw new Error("bad token nesting");
      }
      value = token.inner + token.value + token.inner;

      if(token.range) {
        range = token.range;
      } else {
        var endIndex = pctx.lastIndex;
        var startIndex = endIndex - (token.length);
        if (current[1]++ == 0) {
          // leading token takes the opening `"`
          startIndex--;
        }

        // trailing token takes the closing `"'
        if(pctx.src.charAt(endIndex) === token.inner) {
          endIndex++;
        }
        range = [startIndex, endIndex];
      }
    }
  }

  if(pctx.loc) {
    copy();
    if(!range) range = [pctx.lastIndex-token.length,pctx.lastIndex];
    var startPos = new Pos(pctx.line - (token.lines || 0), pctx.getColumn(range[0]));
    var endPos = new Pos(pctx.line, pctx.getColumn(range[1]));
    var loc = new Loc(pctx.filename, startPos, endPos);
    token.loc = loc;
  }

  if(pctx.range) {
    copy();
    token.range = range;
  }


  if (['"','`'].indexOf(token.id) !== -1) {
      pctx.open_tokens.push([token.id,0]);
      return token;
  }

  if(!dest) return token;

  switch(token.id) {
    case '<id>':
      type = 'Identifier';
      value = token.value;
      break;

    case '<@id>':
      type = 'Identifier';
      value = '@'+token.value;
      break;

    case '<string>':
      type = 'String';
      break;

    case '<regex>':
      type = 'RegularExpression';
      value = token.value;
      break;

    case '<number>':
      type = 'Numeric';
      value = token.value;
      break;

    default:
      // operator or keyword
      if(token.id.charAt(0) === '<' && token.id.charAt(token.id.length-1) === '>') {
        throw new Error("Line 123: Unknown token: " + token.id);
      }
      value = token.id;
      type = /^[a-zA-Z]+$/.test(token.id) ? 'Keyword' : 'Punctuator';
      if(value == 'null') type = 'Null';
  }
  dest.push(Node.Token(pctx, token, type, value));
  return token;
}

var currentlyOpenToken = function(pctx) {
  return pctx.open_tokens[pctx.open_tokens.length-1]
};

function emitToken(pctx, token, dest) {
  var value, type;
  if(token.id !== '<eof>') {
    if(token.id.indexOf('istr') === 0) {
      var current = currentlyOpenToken(pctx);

      if(current[1] === 0) {
        // empty string start - add a fake token
        var str = new Literal("<string>", '');
        var offset = token.id.length - 6; // istr-" = 0 offset, itsr-#{ = 1
        str.range = [pctx.lastIndex - 2 - offset, pctx.lastIndex - offset];
        str.inner = '"';
        appendToken(pctx, str, dest);
        // token has bad extents; fix up
        token.range = str.range;
        token.loc = str.loc;
      }

      if(token.id === 'istr-'+current[0]) {
        pctx.open_tokens.pop();
      }
      return token;
    }

    token = appendToken(pctx, token, dest);
  }

  return token;
};

NodeType('Token', function(type, value) {
  this.type = type;
  this.value = value;
  // if(token.loc) this.loc = token.loc;
  // if(token.range) this.range = token.range;
});
// XXX fix this inheritance?
// Node.Token.prototype._init = function(pctx) {
//   // get extents from token, not pctx
//   _delegateExtents.call(this, pctx.token);
// }

//----------------------------------------------------------------------
// contexts:





function Extent(source) {
  if(!source.loc) throw new Error("invalid extent");
  this.loc = source.loc;
  this.range = source.range;
}
Extent.prototype.toString = function() {
  return "#<Extent " + this.loc + " // " + this.range + " >";
}
Extent.prototype.merge = function(other) {
  if(other.range[1] < this.range[1]) return;
  if(this.loc) this.loc = this.loc.merge(other.loc);
  if(this.range) this.range = [this.range[0], other.range[1]];
}

function push_extent(pctx, token, reason) {
  if(!pctx.extents) return;
  if(token && !token.loc) throw new Error("bad token: " + token);
  var extents = token ? [new Extent(token)] : pctx.extents[pctx.extents.length-1].slice();
  pctx.extents.push(extents);
};



// XXX remove (developer aid);
function summarize(thing) {
  if(!thing) return thing;
  if(Array.isArray(thing)) {
    return "["+thing.map(summarize).join(", ")+"]";
  }
  if(thing instanceof Node) return String(thing);
  if(thing.id && thing.tokenizer) return "Token(`"+thing.id+"` // "+(thing.range||[]).join(",")+")";
  return thing;
}
function extent_indent(pctx) {
  var rv='', i=pctx.extents.length;
  while(i>0) { rv += ' '; i-- };
  return rv;
}
function pop_extent(pctx, reason) {
  if(!pctx.extents) return null;
  var rv = pctx.extents.pop();
  if(!rv) throw new Error("extents exhausted");
  return rv;
};


function end_extent(pctx, e) {
  if(!pctx.extents || pctx.extents.length == 0) return;
  var current = pctx.extents[pctx.extents.length-1];
  e = Array.isArray(e) ? e[e.length-1] : e;
  if(current.length > 1) {
    current[1].merge(e);
  } else {
    current[1] = new Extent(e);
  }
}









NodeType('SwitchCase', function(scope) {
  this.test = scope.exp;
  this.consequent = scope.stmts;
});









//----------------------------------------------------------------------
// statements:
NodeType("EmptyStatement", function(pctx) {
});

NodeType("ExpressionStatement", function(expr, pctx, ext) {
  this.expression = expr;
});

NodeType('LabeledStatement', function(lbl, body, pctx, ext) {
  this.label = Node.Identifier(pctx, ext, lbl);
  this.body = body;
});

var processParams = function(params) {
  var process = function(param) {
    // rewrite array expressions as patterns
    if(param.type === 'ArrayExpression') {
      param.type = 'ArrayPattern';
    } else if (param.type === 'ObjectPattern') {
      param.properties.forEach(function(prop) {
        process(prop.value);
      });
    }
  };

  if (!params) return params;
  if (Array.isArray(params)) params.forEach(process);
  else process(params)
  return params;
}
NodeType('Function', function (name, params, body, decl, expression, pctx, ext) {
  this.type = "Function"+(decl?"Declaration":"Expression");
  this.id = name && name.length ? Node.Identifier(pctx, ext, name) : null;
  this.params = processParams(params);
  this.body = body;
  this.expression = expression;
});

Node.Function.prototype.defaults = [];
Node.Function.prototype.rest = null; // ?
// Node.Function.prototype.comments = [];
Node.Function.prototype.generator = false;




NodeType('IfStatement', function(test, cons, alt) {
  this.test = test;
  this.consequent = cons;
  this.alternate = alt;
});

NodeType('WhileStatement', function(test, body) {
  this.test = test;
  this.body = body;
});

NodeType('DoWhileStatement', function(body, test) {
  this.test = test;
  this.body = body;
});

NodeType('ForStatement', function(init, decls, test, inc, body, pctx, ext) {
  this.update = inc;
  this.test = test;
  this.init = null;
  this.body = body;
  if(init)
    this.init = init;
  else if(decls)
    this.init = Node.VariableDeclaration(pctx, decls.extent || ext, decls);
});


NodeType('ForInStatement', function(lhs, decl, obj, body, pctx, ext) {
  this.body = body;
  this.right = obj;
  this.left = null;
  if(lhs)
    this.left = lhs;
  else if (decl)
    this.left = Node.VariableDeclaration(pctx, ext, [decl]);
});
Node.ForInStatement.prototype.each = false;

NodeType('ContinueStatement', function(lbl, pctx) {
  this.label = lbl;
});

NodeType('BreakStatement', function(lbl, pctx) {
  this.label = lbl;
});

NodeType("ReturnStatement", function(val) {
  this.argument = val;
});

NodeType('WithStatement', function(exp, body) {
  this.object = exp;
  this.body = body;
});

NodeType('SwitchStatement', function(exp, clauses) {
  this.discriminant = exp;
  this.cases = clauses;
});

NodeType('ThrowStatement', function(exp) {
  this.argument = exp;
});

function gen_block(body, pctx, ext) {
  var block = Node.BlockStatement(pctx, ext, body);
  return block;
}

var hiddenVar = function(pctx, ext) {
  // XXX make this avoid collisions with user vars?
  return Node.Identifier(pctx, ext, '__unused');
}
NodeType('CatchClause', function(param, body, pctx, ext) {
  this.param = param || hiddenVar(pctx, ext);
  this.body = body;
});

function gen_crf(s, crf, pctx, ext) {
  var handlerBody = null;
  var handlerParam = null;
  if (crf[0]) {
    handlerParam = Node.Identifier(pctx, ext, crf[0][0]);
    handlerBody = crf[0][1];
  }
  if (crf[1]) {
    if(handlerBody)
      handlerBody.body = handlerBody.body.concat(crf[1].body);
    else
      handlerBody = crf[1];
  }
  if(handlerParam || handlerBody)
    s.handlers = [Node.CatchClause(pctx, ext, handlerParam, handlerBody)];
  if (crf[2])
    s.finalizer = crf[2];
}

NodeType('TryStatement', function(block, crf, pctx, ext) {
  this.block = block;
  gen_crf(this, crf, pctx, ext);
});
// some blocks (like waitfor/and) are represented in the AST as:
//  - a blockstatement
//  - a TryStatement (when accompanied by catch / retract / finally)
function CoerceToTry(pctx, ext, block, crf) {
  var has_crf = false;
  for(var i=0; i<crf.length; i++) {
    if(crf[i]) {
      has_crf=true;
      break;
    }
  }
  if(!has_crf) return block;
  return Node.TryStatement(pctx, ext, block, crf);
}
Node.TryStatement.prototype.guardedHandlers = [];
Node.TryStatement.prototype.finalizer = null;
Node.TryStatement.prototype.handlers = [];

//----------------------------------------------------------------------
// expressions:





// note the intentional space in ' =>' below; it is to fix cases like '= => ...'

function gen_doubledot_call(l, r, pctx, ext) {
  // XXX not very elegant
  if (r.type === 'CallExpression') r['arguments'].unshift(l);
  else r = Node.CallExpression(pctx, ext, r, [l]);
  r.is_doubledot = true;
  return r;
}


function gen_doublecolon_call(l, r, pctx, ext) {
  // XXX not very elegant
  if (l.is_doubledot) {
    // walk up the call tree until we find the first argument that isn't a doubledot:
    var target = l;
    while (target.type === 'CallExpression' && target['arguments'][0].is_doubledot) {
      target = target['arguments'][0];
    }
    if (target['arguments'][0].type === 'CallExpression') {
      target['arguments'][0]['arguments'].unshift(r);
    }
    else {
      target['arguments'][0] = Node.CallExpression(pctx, ext, target['arguments'][0], [r]);
    }
    return l;
  }
  else if (l.type === 'CallExpression') {
    l['arguments'].unshift(r);
    return l;
  }
  else
    return Node.CallExpression(pctx, ext, l, [r]);
}



function interpolating_string(pctx, ext, parts) {
  // console.log("GEN_INTERPOLATING_STR", parts);
  var deref = function(x) {
    if (Array.isArray(x))
      return x[0];
    return StringLiteral(pctx, ext, x);
  }
  var rv = deref(parts.shift());
  while(parts.length > 0) {
    rv = Node.BinaryExpression(pctx, ext, rv, '+', deref(parts.shift()));
  }
  return rv;
}

function quasi(pctx, ext, parts) {
  var rv = [];
  for (var i=0,l=parts.length;i<l;++i) {
    if (i % 2)
      rv.push(parts[i]);
    else {
      rv.push(StringLiteral(pctx, ext, parts[i]));
    }
  }
  return Node.ArrayExpression(pctx, ext, rv);
}








NodeType('CallExpression', function(fun, args) {
  this.callee = fun;
  this['arguments'] = args;
});

NodeType('NewExpression', function(fun, args) {
  this.callee = fun;
  this['arguments'] = args;
});



function group_exp(pctx, ext, e) {
  var seq = [];
  function collect(e) {
    if(e instanceof Node.BinaryExpression && e.operator === ",") {
      collect(e.left);
      collect(e.right);
    } else {
      seq.push(e);
    }
  }
  collect(e);
  if(seq.length === 1) {
    return seq[0];
  }
  return Node.SequenceExpression(pctx, ext, seq);
}

NodeType('ThisExpression', function(pctx) {
});





// Stratified constructs:

function gen_waitfor_andor(op, blocks, crf, pctx, ext) {
  var rv =[];
  for (var i=0; i<blocks.length; ++i){
    rv = rv.concat(blocks[i].body);
  }
  return CoerceToTry(pctx, ext, Node.BlockStatement(pctx, ext, rv), crf);
}


function gen_suspend(has_var, decls, block, crf, pctx, ext) {
  var body = block;
  if(has_var && decls.length) {
    body = Node.BlockStatement(pctx, ext,
        [Node.VariableDeclaration(pctx, ext, decls)].concat(block.body));
  }
  return CoerceToTry(pctx, ext, body, crf);
}



// XXX so that break / continue / etc are valid, we wrap in an imaginary while() loop

function gen_blocklambda(pars, body, pctx, ext) {
  body = Node.BlockStatement(pctx, ext, [
      Node.WhileStatement(pctx, ext, Node.Literal(pctx, ext, '<bool>', 'true', true), body)
  ]);
  return Node.Function(pctx, ext, null, pars, body, false, false);
}


//----------------------------------------------------------------------
// Helpers

function Hash() {}
Hash.prototype = {
  lookup: function(key) { return this["$"+key]; },
  put: function(key, val) { this["$"+key] = val; },
  del: function(key) { delete this["$"+key]; }
};

//----------------------------------------------------------------------
// Tokenizer

// PAT_NBWS == \s+ without \n or \r
//define [ \f\t\v\u00A0\u2028\u2029]+ \\s+
// we ignore '//'-style comments as well as hashbangs (XXX not quite right)

// whitespace/comments with newlines
// doesn't work on IE: define PAT_COMMENT \/\*[^]*?\*\/







// symbols that can appear in an 'statement/argument position':
// symbols that can appear in an 'operator position':





// tokenizer for tokens in a statement/argument position:
var TOKENIZER_SA = /(?:[ \f\t\v\u00A0\u2028\u2029]+|\/\/.*|#!.*)*(?:((?:(?:\r\n|\n|\r)|\/\*(?:.|\n|\r)*?\*\/)+)|((?:0[xX][\da-fA-F]+)|(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?))|(\/(?:\\.|\[(?:\\[^\r\n]|[^\n\r\]])*\]|[^\[\/\r\n])+\/[gimy]*)|(==|!=|->|=>|>>|<<|<=|>=|--|\+\+|\|\||&&|\.\.|\:\:|[-*\/%+&^|]=|[;,?:|^&=<>+\-*\/%!~.\[\]{}()\"`]|[$@_\w]+)|('(?:\\[^\r\n]|[^\\\'\r\n])*')|('(?:\\(?:(?:[^\r\n]|(?:\r\n|\n|\r)))|[^\\\'])*')|(\S+))/g;


// tokenizer for tokens in an operator position:
var TOKENIZER_OP = /(?:[ \f\t\v\u00A0\u2028\u2029]+|\/\/.*|#!.*)*(?:((?:(?:\r\n|\n|\r)|\/\*(?:.|\n|\r)*?\*\/)+)|(>>>=|===|!==|>>>|<<=|>>=|==|!=|->|=>|>>|<<|<=|>=|--|\+\+|\|\||&&|\.\.|\:\:|[-*\/%+&^|]=|[;,?:|^&=<>+\-*\/%!~.\[\]{}()\"`]|[$@_\w]+))/g;


// tokenizer for tokens in an interpolating string position:
var TOKENIZER_IS = /((?:\\[^\r\n]|\#(?!\{)|[^#\\\"\r\n])+)|(\\(?:\r\n|\n|\r))|((?:\r\n|\n|\r))|(\"|\#\{)/g;

// tokenizer for tokens in an quasi-literal:
var TOKENIZER_QUASI = /((?:\\[^\r\n]|\$(?![\{a-zA-Z_$@])|[^$\\\`\r\n])+)|(\\(?:\r\n|\n|\r))|((?:\r\n|\n|\r))|(\`|\$\{|\$(?=[a-zA-Z_$@]))/g;



//----------------------------------------------------------------------
// Syntax Table

function SemanticToken() {}
SemanticToken.prototype = {
  //----------------------------------------------------------------------
  // parser 'api'

  // expression starter function
  exsf: function(pctx) { throw new Error("Unexpected '" + this + "'"); },
  // expression continuation binding power
  excbp: 0,

  // expression continuation
  excf: function(left, pctx) { throw new Error("Unexpected '" + this + "'"); },
  // statement function
  stmtf: null,

  // tokenizer for next token:
  tokenizer: TOKENIZER_SA,
  
  //----------------------------------------------------------------------
  // helpers
  
  toString: function() { return "'"+this.id+"'"; },

  //----------------------------------------------------------------------
  // semantic token construction 'api'
  
  exs: function(f) {
    this.exsf = f;
    return this;
  },
  exc: function(bp, f) {
    this.excbp = bp;
    if (f) this.excf = f;
    return this;
  },
  stmt: function(f) {
    this.stmtf = f;
    return this;
  },
  // encode infix operation
  ifx: function(bp, right_assoc) {
    this.excbp = bp;
    if (right_assoc) bp -= .5;
    this.excf = function(left, pctx) {
      push_extent(pctx, left, this.id + " (ifx)");
      var right = parseExp(pctx, bp);
      
      return Node.BinaryExpression(pctx, pop_extent(pctx, 'GEN_INFIX_OP'), left, this.id, right);
    };
    return this;
  },
  // encode assignment operation
  asg: function(bp, right_assoc) {
    this.excbp = bp;
    if (right_assoc) bp -= .5;
    this.excf = function(left, pctx) {
      push_extent(pctx, left, 'assign op');
      var right = parseExp(pctx, bp);
      
      return Node.AssignmentExpression(pctx, pop_extent(pctx, 'GEN_ASSIGN_OP'), left, this.id, right);
    };
    return this;
  },
  // encode prefix operation
  pre: function(bp) {
    return this.exs(function(pctx) {
      push_extent(pctx, this, 'pre');
      var right = parseExp(pctx, bp);
      
      end_extent(pctx, right);
      return UnaryExpression(pctx, pop_extent(pctx, 'GEN_PREFIX_OP'), this.id, right, true);
    });
  },
  // encode postfix operation
  pst: function(bp) {
    return this.exc(bp, function(left, pctx) {
      push_extent(pctx, left, 'pst');
      
      end_extent(pctx, this);
      return UnaryExpression(pctx, pop_extent(pctx, 'GEN_POSTFIX_OP'), this.id, left, false);
    });
  }  
};

//-----
function Literal(type, value, length) {
  this.id = type;
  this.value = value;
  this.length = length !== undefined ? length : (value ? value.length : 0); // XXX why do we have undefined literal values?
}
Literal.prototype = new SemanticToken();
Literal.prototype.tokenizer = TOKENIZER_OP;
Literal.prototype.toString = function() { return "literal '"+this.value+"'"; };
Literal.prototype.exsf = function(pctx) {
  
  var rv = Node.Literal(pctx, (pctx.extents ? pctx.extents[pctx.extents.length-1] : null), this.id, this.value, undefined);   return rv;
};

//-----
function Identifier(value) {
  this.length = value.length;
  if (value.charAt(0) === '@') {
    this.alternate = true;
    this.id = "<@id>";
    this.value = value.substr(1);
  }
  else
    this.value = value;
}
Identifier.prototype = new Literal("<id>");
Identifier.prototype.exsf = function(pctx) {
  if (this.alternate === true) {
    if (this.value.length) {
      
      var ext = (pctx.extents ? pctx.extents[pctx.extents.length-1] : null);   return Node.MemberExpression(pctx, ext,       Node.Identifier(pctx, ext, '@'),       Node.Identifier(pctx, ext, this.value), false);
    }
    else {
      
      return Node.Identifier(pctx, (pctx.extents ? pctx.extents[pctx.extents.length-1] : null), '@');
    }
  }
  else {
    
    return Node.Identifier(pctx, (pctx.extents ? pctx.extents[pctx.extents.length-1] : null), this.value);
  }
};

//-----
// base syntax table
var ST = new Hash();
function S(id, tokenizer) {
  var t = new SemanticToken();
  t.id = id;
  t.length = id.length;
  if (tokenizer)
    t.tokenizer = tokenizer;
  ST.put(id, t);

  // XXX pretty hacky. The AST backend attaches extent information to each token,
  // but that requires tokens are never reused. So that backend clones each reusable
  // token before attaching that information.
  t.clone = function() {
    var rv = new SemanticToken();
    for(var k in this) {
      if(Object.prototype.hasOwnProperty.call(this, k)) {
        rv[k] = this[k];
      }
    }
    return rv;
  };

  return t;
}

/*
BP: Binding Power
P: Precedence
A: Associativity (L: left, R: right)
*: Designates an SJS-specific construct

BP  P  A    Operator      Operand Types                  Operation Performed
270  1 L     []           MemberExp Expression        
       L     .            MemberExp Identifier        
       R     new          MemberExp Arguments        
260  2 L     ( )          CallExpression Arguments       Function Call
       L     { }          CallExpression BlockArguments  Block Lambda Call
  (    L     []           CallExpression Expression        )
  (    L     .            CallExpression Identifier        )  
*255   L     ..           ArgExp CallExpression          Double Dot Call
250  3 n/a   ++           LeftHandSideExp                PostfixIncrement
       n/a   --           LeftHandSideExp                PostfixDecrement
240  4 R     delete       UnaryExp                       Call Delete Method
       R     void         UnaryExp                       Eval and Return undefined
       R     typeof       UnaryExp                       Return Type of an Object
  (    R     ++           UnaryExp                       PrefixIncrement )
  (    R     --           UnaryExp                       PrefixDecrement )
       R     +            UnaryExp                       UnaryPlus
       R     -            UnaryExp                       UnaryMinus
       R     ~            UnaryExp                       BitwiseNot
       R     !            UnaryExp                       LogicalNot
230  5 L     *            MultExp UnaryExp               Multiplication
       L     /            MultExp UnaryExp               Division
       L     %            MultExp UnaryExp               Remainder
220  6 L     +            AddExp MultExp                 Addition
       L     -            AddExp MultExp                 Subtraction
210  7 L     <<           ShiftExp AddExp                BitwiseLeftShift
       L     >>           ShiftExp AddExp                SignedRightShift
       L     >>>          ShiftExp AddExp                UnsignedRightShift
*205   R     ::           CallExpression ArgExp          Double Colon Call
200  8 L     <            RelExp ShiftExp                LessThanComparison
       L     >            RelExp ShiftExp                GreaterThanComparison
       L     <=           RelExp ShiftExp                LessThanOrEqualComparison
       L     >=           RelExp ShiftExp                GreaterThanOrEqualComparison
       L     instanceof   RelExp ShiftExp                Call HasInstance Method
       L     in           RelExp ShiftExp                Call HasProperty Method
190 9  L     ==           EqualExp RelExp                IsEqual
       L     !=           EqualExp RelExp                IsNotEqual
       L     ===          EqualExp RelExp                IsStrictlyEqual
       L     !==          EqualExp RelExp                IsStrictlyNotEqual
180 10 L     &            BitwiseAndExp EqualExp         BitwiseAnd
170 11 L     ^            BitwiseXorExp EqualExp         Bitwise Xor
160 12 L     |            BitwiseOrExp EqualExp          BitwiseOr
150 13 L     &&           LogicalAndExp BitwiseOrExp     LogicalAnd
140 14 L     ||           LogicalOrExp LogicalAndExp     LogicalOr
130 15 R     ? :          LogicalOrExp AssignExp AssignExp   ConditionalExpression
120 16 R      =           LeftHandSideExp AssignExp      AssignmentExpression
       R     *=           LeftHandSideExp AssignExp      AssignmentWithMultiplication
       R     /=           LeftHandSideExp AssignExp      AssignmentWithDivision
       R     %=           LeftHandSideExp AssignExp      AssignmentWithRemainder
       R     +=           LeftHandSideExp AssignExp      AssignmentWithAddition
       R     -=           LeftHandSideExp AssignExp      AssignmentWithSubtraction
       R     <<=          LeftHandSideExp AssignExp      AssignmentWithBitwiseLeftShift
       R     >>=          LeftHandSideExp AssignExp      AssignmentWithSignedRightShift
       R     >>>=         LeftHandSideExp AssignExp      AssignmentWithUnsignedRightShift
       R     &=           LeftHandSideExp AssignExp      AssignmentWithBitwiseAnd
       R     ^=           LeftHandSideExp AssignExp      AssignmentWithBitwiseOr
       R     |=           LeftHandSideExp AssignExp      AssignmentWithLogicalNot
*      R     ->           Args AssignExp                 Thin Arrow 
*      R     ->           AssignExp                      Thin Arrow (prefix form)
*      R     =>           Args AssignExp                 Fat Arrow
*      R     =>           AssignExp                      Fat Arrow (prefix form)
*115         spawn        SpawnExp                       StratifiedJS 'spawn'
*112         __js         JS_EXP                         non-blocking JS optimized expression
110 17 L     ,            Expression AssignExp           SequentialEvaluation

expressions up to BP 100

*/


S("[").
  // array literal
  exs(function(pctx) {
    push_extent(pctx, null, 'GEN_ARR_LIT');
    var elements = [];
    while (pctx.token.id != "]") {
      if (elements.length) scan(pctx, ",");
      if (pctx.token.id == ",") {
        elements.push((function(pctx) {  return null; })(pctx));
      }
      else if (pctx.token.id == "]")
        break; // allows trailing ','
      else
        elements.push(parseExp(pctx, 110));
    }
    scan(pctx, "]");
    
    return Node.ArrayExpression(pctx, pop_extent(pctx, 'GEN_ARR_LIT'), elements);
  }).
  // indexed property access
  exc(270, function(l, pctx) {
    push_extent(pctx, null, '[ exc');
    var idxexp = parseExp(pctx);
    end_extent(pctx, pctx.token);
    scan(pctx, "]");
    
    return Node.MemberExpression(pctx, pop_extent(pctx, 'GEN_IDX_ACCESSOR'), l, idxexp, true);
  });

// regexp to identify symbols that are valid identifier names according to ES5 (all the keywords):
// (this is not the actual identifier name syntax; it is just a regexp to discriminate between
//  our operator & keyword symbols)
var VALID_IDENTIFIER_NAME = /^[a-z]+$/;

S(".").exc(270, function(l, pctx) {
  push_extent(pctx, null, '[dot] exc');
  var name;
  if (pctx.token.id == "<id>")
    name = pctx.token.value;
  else if (VALID_IDENTIFIER_NAME.test(pctx.token.id)) // ES5 allows keywords to be used as identifier names
    name = pctx.token.id;
  else
    throw new Error("Expected an identifier, found '"+pctx.token+"' instead");
  end_extent(pctx, pctx.token);
  scan(pctx);
  
  var ext = pop_extent(pctx, 'GEN_DOT_ACCESSOR');   var ident = Node.Identifier(pctx, pctx.token, name);   return Node.MemberExpression(pctx, ext, l, ident, false);
});

S("new").exs(function(pctx) {
  push_extent(pctx, null, 'new');
  var exp = parseExp(pctx, 260);
  var args = [];
  if (pctx.token.id == "(") {
    scan(pctx); // swallow '('
    while (pctx.token.id != ")") {
      if (args.length) scan(pctx, ",");
      args.push(parseExp(pctx, 110));
    }
    end_extent(pctx, pctx.token);
    scan(pctx, ")");
  }
  
  return Node.NewExpression(pctx, pop_extent(pctx, 'GEN_NEW'), exp, args);
});

S("(").
  // grouping/parameter list
  exs(function (pctx) {
    if (pctx.token.id == ')') {
      // empty parameter list
      var op = scan(pctx, ')');
      if (op.id != '->' &&
          op.id != '=>')
        throw new Error("Was expecting '->' or '=>' after empty parameter list, but saw '"+pctx.token.id+"'");
      scan(pctx);
      return op.exsf(pctx);
    }
    push_extent(pctx, null, 'GEN_GROUP');
    var e = parseExp(pctx);
    var closer = pctx.token;
    end_extent(pctx, closer);
    scan(pctx, ")");
    
    var ext = pop_extent(pctx, 'GEN_GROUP');
    // the inner expression may ignore the closing paren,
    // but the outer expression shouldn't
    end_extent(pctx, closer);
    return group_exp(pctx, ext, e);
  }).
  // function call
  exc(260, function(l, pctx) {
    push_extent(pctx, null, 'funcall(');
    var args = [];
    while (pctx.token.id != ")") {
      if (args.length) scan(pctx, ",");
      args.push(parseExp(pctx, 110)); // only parse up to comma
    }
    end_extent(pctx, pctx.token);
    scan(pctx, ")");
    // special case for blocklambdas: pull the blocklambda into the argument list
    // f(a,b,c) {|..| ...} --> f(a,b,c,{|..| ...})
    if (pctx.token.id == '{') {
      // look ahead for '|' or '||'
      TOKENIZER_SA.lastIndex = pctx.lastIndex;
      while (1) {
        var matches = TOKENIZER_SA.exec(pctx.src);
        if (matches && 
            (matches[4] == '|' ||
             matches[4] == '||')) {
          // ok, we've got a blocklambda -> pull it in
          args.push(parseBlockLambda(scan(pctx).id, pctx));
        }
        else if (matches && matches[1]) {
          continue;
        }
        break;
      }
    }

    
    return Node.CallExpression(pctx, pop_extent(pctx, 'GEN_FUN_CALL'), l, args);
  });

S("..").exc(255, function(l, pctx) {
  push_extent(pctx, l, "..");
  var r = parseExp(pctx, 255);
  
  return gen_doubledot_call(l, r, pctx, pop_extent(pctx, 'GEN_DOUBLEDOT_CALL'));
});

S("++").pre(240).pst(250).asi_restricted = true;
S("--").pre(240).pst(250).asi_restricted = true;

S("delete").pre(240);
S("void").pre(240);
S("typeof").pre(240);
S("+").pre(240).ifx(220);
S("-").pre(240).ifx(220);
S("~").pre(240); 
S("!").pre(240);

S("*").ifx(230);
S("/").ifx(230);
S("%").ifx(230);

// +,-: see above

S("<<").ifx(210);
S(">>").ifx(210);
S(">>>").ifx(210);

S("::").exc(205, function(l, pctx) {
  push_extent(pctx, l, "::");
  var r = parseExp(pctx, 110);
  
  return gen_doublecolon_call(l, r, pctx, pop_extent(pctx, 'GEN_DOUBLECOLON_CALL'));
});


S("<").ifx(200);
S(">").ifx(200);
S("<=").ifx(200);
S(">=").ifx(200);
S("instanceof").ifx(200);

S("in").ifx(200);

S("==").ifx(190);
S("!=").ifx(190);
S("===").ifx(190);
S("!==").ifx(190);

S("&").ifx(180);
S("^").ifx(170);
S("|").ifx(160);
S("&&").ifx(150);
S("||").ifx(140);

S("?").exc(130, function(test, pctx) {
  push_extent(pctx, null, '? ternary');
  var consequent = parseExp(pctx, 110);
  if (pctx.token.id == ":") {
    scan(pctx, ":");
    var alternative = parseExp(pctx, 110);
  }
  if(alternative) { end_extent(pctx, alternative); }
  
  return Node.ConditionalExpression(pctx, pop_extent(pctx, 'GEN_CONDITIONAL'), test, consequent, alternative);
});

S("=").asg(120, true);
S("*=").asg(120, true);
S("/=").asg(120, true);
S("%=").asg(120, true);
S("+=").asg(120, true);
S("-=").asg(120, true);
S("<<=").asg(120, true);
S(">>=").asg(120, true);
S(">>>=").asg(120, true);
S("&=").asg(120, true);
S("^=").asg(120, true);
S("|=").asg(120, true);

S("->")
  // prefix form without parameters expression
  .exs(function(pctx) {
    push_extent(pctx, pctx.token, 'arrow call');
    var body = parseExp(pctx, 119.5); // 119.5 because of right-associativity
    
    return Node.ArrowFunctionExpression(pctx, pop_extent(pctx, 'GEN_THIN_ARROW'), null, body);
  })
  // infix form with parameters expression
  .exc(120, function(left, pctx) {
    push_extent(pctx, left, 'arrow call');
    var body = parseExp(pctx, 119.5);
    
    return Node.ArrowFunctionExpression(pctx, pop_extent(pctx, 'GEN_THIN_ARROW'), left, body);
  });
S("=>")
  // prefix form without parameters expression
  .exs(function(pctx) {
    push_extent(pctx, pctx.token, 'arrow call');
    var body = parseExp(pctx, 119.5); // 119.5 because of right-associativity
    
    return Node.ArrowFunctionExpression(pctx, pop_extent(pctx, 'GEN_THIN_ARROW'), null, body);
  })
  // infix form with parameters expression
  .exc(120, function(left, pctx) {
    push_extent(pctx, left, 'arrow call');
    var body = parseExp(pctx, 119.5);
    
    return Node.ArrowFunctionExpression(pctx, pop_extent(pctx, 'GEN_THIN_ARROW'), left, body);
  });

S("spawn").pre(115);

S(",").ifx(110, true);

// helper to parse a token into a valid property name:
function parsePropertyName(token, pctx) {
  var id = token.id;
  if (id == "<@id>")
    return '@'+token.value;
  if (id == "<id>"
      || id == "<string>" || id == "<number>")
    return token.value;
  if (id == '"') {
    if ((token = scan(pctx)).id != "<string>" ||
        scan(pctx, undefined, TOKENIZER_IS).id != 'istr-"')
      throw new Error("Non-literal strings can't be used as property names ("+token+")");
    return '"'+token.value+'"';
  }
  if (VALID_IDENTIFIER_NAME.test(token.id)) // ES5 allows keywords to be used as identifier names
    return token.id;
  throw new Error("Invalid object literal syntax; property name expected, but saw "+token);
}

function parseBlock(pctx) {
  
  push_scope(pctx);
  push_extent(pctx, null, 'BLOCK');
  while (pctx.token.id != "}") {
    var stmt = parseStmt(pctx);
    
    top_scope(pctx).stmts.push(stmt);
  }
  end_extent(pctx, pctx.token);
  scan(pctx, "}");
  
  return gen_block(pop_scope(pctx).stmts, pctx, pop_extent(pctx, 'BLOCK'));
}

function parseBlockLambdaBody(pctx) {
  push_extent(pctx, null, 'BLAMBDA_BODY');
  
  push_scope(pctx);
  while (pctx.token.id != "}") {
    var stmt = parseStmt(pctx);
    
    top_scope(pctx).stmts.push(stmt);;
  }
  scan(pctx, "}");
  
  return Node.BlockStatement(pctx, pop_extent(pctx, 'BLAMBDA_BODY'), pop_scope(pctx).stmts);
}
function parseBlockLambda(start, pctx) {
  // collect parameters
  push_extent(pctx, pctx.token, 'BLOCKLAMBDA');
  var pars;
  if (start == '||') {
    pars = [];
    scan(pctx);
  } else {
    pars = parseFunctionParams(pctx, '|', '|');
  }

  var body = parseBlockLambdaBody(pctx);
  
  return gen_blocklambda(pars, body, pctx, pop_extent(pctx, 'GEN_BLOCKLAMBDA'));
}

S("{").
  exs(function(pctx) {
    var start = pctx.token.id;
    if (start == "|" || start == "||") {
      // block lambda */
      return parseBlockLambda(start, pctx);
    }
    else {
      // object literal:
      var props = [];
      push_extent(pctx, null, 'objlit');
      while (pctx.token.id != "}") {
        if (props.length) scan(pctx, ",");
        var prop = pctx.token;
        if (prop.id == "}")
          break; // allows trailing ','
        prop = parsePropertyName(prop, pctx);
        scan(pctx);
        if (pctx.token.id == ":") {
          // 'normal' property
          scan(pctx);
          var exp = parseExp(pctx, 110); // only parse up to comma
          props.push(["prop",prop,exp]);
        }
        else if (pctx.token.id == "}" || pctx.token.id == ",") {
          if (prop.charAt(0) == "'" || prop.charAt(0) == '"')
            throw new Error("Quoted identifiers not allowed in destructuring patterns ("+prop+")");
          props.push(["pat", prop, pctx.line]);
        }
        else
          throw new Error("Unexpected token '"+pctx.token+"'");
      }
      scan(pctx, "}", TOKENIZER_OP); // note the special tokenizer case here
      
      var ext = pop_extent(pctx, 'GEN_OBJ_LIT');   var rv = [];                                for (var i=0; i<props.length; ++i) {          rv.push(Node.Property(pctx, ext, props[i]));   }                                           return Node.ObjectPattern(pctx, ext, rv);
    }
  }).
  // block lambda call:
  exc(260, function(l, pctx) {
    push_extent(pctx, l, 'blocklambda call');
    var start = pctx.token.id;
    if (start != "|" && start != "||")
      throw new Error("Unexpected token '"+pctx.token+"' - was expecting '|' or '||'");
    var args = [parseBlockLambda(start, pctx)];
    
    return Node.CallExpression(pctx, pop_extent(pctx, 'GEN_FUN_CALL'), l, args);
  }).
  // block:
  stmt(parseBlock);

// deliminators
S(";").stmt(function(pctx) {  return Node.EmptyStatement(pctx, (pctx.extents ? pctx.extents[pctx.extents.length-1] : null)); });
S(")", TOKENIZER_OP);
S("]", TOKENIZER_OP);
S("}"); // note the special tokenizer case for object literals, above
S(":");

S("<eof>").
  exs(function(pctx) { throw new Error("Unexpected end of input (exs)"); }).
  stmt(function(pctx) { throw new Error("Unexpected end of input (stmt)"); });

// statements/misc

// helper to parse a function body:
function parseFunctionBody(pctx) {
  
  push_scope(pctx);
  push_extent(pctx, pctx.token, 'fbody');
  scan(pctx, "{");
  while (pctx.token.id != "}") {
    var stmt = parseStmt(pctx);
    
    top_scope(pctx).stmts.push(stmt);
  }
  end_extent(pctx, pctx.token);
  scan(pctx, "}");
  
  return gen_block(pop_scope(pctx).stmts, pctx, pop_extent(pctx, 'fbody'));
}

function parseFunctionParam(pctx) {
  var t = pctx.token;
  scan(pctx);
  var left = t.exsf(pctx);
  while (pctx.token.id != '|' && pctx.token.excbp > 110) {
    t = pctx.token;
    scan(pctx);
    left = t.excf(left, pctx);
  }
  return left;
}

function parseFunctionParams(pctx, starttok, endtok) {
  if (!starttok) { starttok = '('; endtok = ')'; }
  var pars = [];
  scan(pctx, starttok);
  while (pctx.token.id != endtok) {
    if (pars.length)
      scan(pctx, ",");
    switch(pctx.token.id) {
      case "{":
      case "[":
        pars.push(parseFunctionParam(pctx));
        break;
      case "<id>":
        pars.push(pctx.token.exsf(pctx));
        scan(pctx);
        break;
      default:
        throw new Error("Expected function parameter but found '"+pctx.token+"'");
    }
  }
  scan(pctx, endtok);
  return pars;
}

S("function").
  // expression function form ('function expression')
  exs(function(pctx) {
    var fname = "";
    push_extent(pctx, null, 'function.exs');
    if (pctx.token.id == "<id>") {
      fname = pctx.token.value;
      scan(pctx);
    }
    var pars = parseFunctionParams(pctx);
    var body = parseFunctionBody(pctx);
    end_extent(pctx, body);
    
    return Node.Function(pctx, pop_extent(pctx, 'GEN_FUN_EXP'), fname, pars, body, false, false);
  }).
  // statement function form ('function declaration')
  stmt(function(pctx) {
    push_extent(pctx, null, 'function.stmt');
    if (pctx.token.id != "<id>") throw new Error("Malformed function declaration");
    var fname = pctx.token.value;
    scan(pctx);
    var pars = parseFunctionParams(pctx);
    var body = parseFunctionBody(pctx);
    end_extent(pctx, body);
    
    return Node.Function(pctx, pop_extent(pctx, 'GEN_FUN_DECL'), fname, pars, body, true, false);
  });

S("this", TOKENIZER_OP).exs(function(pctx) {  return Node.ThisExpression(pctx, (pctx.extents ? pctx.extents[pctx.extents.length-1] : null)); });
S("true", TOKENIZER_OP).exs(function(pctx) {  return Node.Literal(pctx, (pctx.extents ? pctx.extents[pctx.extents.length-1] : null), '<bool>', 'true', true); });
S("false", TOKENIZER_OP).exs(function(pctx) {  return Node.Literal(pctx, (pctx.extents ? pctx.extents[pctx.extents.length-1] : null), '<bool>', 'false', false); });
S("null", TOKENIZER_OP).exs(function(pctx) {  return Node.Literal(pctx, (pctx.extents ? pctx.extents[pctx.extents.length-1] : null), '<null>', 'null', null); });

S("collapse", TOKENIZER_OP).exs(function(pctx) {  return Node.EmptyStatement(pctx, (pctx.extents ? pctx.extents[pctx.extents.length-1] : null)); });

S('"', TOKENIZER_IS).exs(function(pctx) {
  var parts = [], last=-1;
  while (pctx.token.id != 'istr-"') {
    switch (pctx.token.id) {
    case "<string>":
      // XXX not sure this retrospective collecting of adjacent
      // strings makes sense here; maybe this should be built into the
      // tokenization. (The problem is that the tokenizer splits
      // strings on '\n')
      if (last!=-1 && typeof parts[last] == 'string') {
        parts[last] += pctx.token.value;
      }
      else {
        parts.push(pctx.token.value);
        ++last;
      }
      break;
    case 'istr-#{':
      scan(pctx);
      // we push an array to distinguish from strings:
      // (the kernel might generate a string for 'parseExp', which would leave
      // no way to distinguish between expressions and literal parts of the string
      // in GEN_INTERPOLATING_STR).
      parts.push([parseExp(pctx)]); 
      ++last;
      break;
    case "<eof>":
      throw new Error("Unterminated string");
      break;
    default:
      throw new Error("Internal parser error: Unknown token in string ("+pctx.token+")");
    }
    end_extent(pctx, pctx.token);
    scan(pctx, undefined, TOKENIZER_IS);
  }

  if (last == -1) {
    end_extent(pctx, pctx.token);
    parts.push('');
    last = 0;
  }

  scan(pctx);

  if (last == 0 && typeof parts[0] == 'string') {
    var val = '"'+parts[0]+'"';
    var rv = Node.Literal(pctx, (pctx.extents ? pctx.extents[pctx.extents.length-1] : null), '<string>', val, undefined);   return rv;
  }
  return interpolating_string(pctx, (pctx.extents ? pctx.extents[pctx.extents.length-1] : null), parts);
});

S('istr-#{', TOKENIZER_SA);
S('istr-"', TOKENIZER_OP);

S('`', TOKENIZER_QUASI).exs(function(pctx) {
  var parts = [], current=0;
  push_extent(pctx, pctx.token, "GEN_QUASI");
  while (pctx.token.id != 'quasi-`') {
    switch (pctx.token.id) {
    case '<string>':
      // strings always go into an even position. If we get a string
      // with current=odd it means the tokenizer gave us two adjacent
      // strings (can happen because the tokenizer splits strings on
      // '\n'). In this case we append the new string to the last string:
      if (current % 2)
        parts[current-1] += pctx.token.value;
      else {
        parts.push(pctx.token.value);
        ++current;
      }
      break;
    case 'quasi-${':
      scan(pctx);
      // expressions always go into an odd position. If we're in an even
      // position we insert an empty string:
      if ((current % 2) == 0) {
        parts.push('');
        ++current;
      }
      parts.push(parseExp(pctx));
      ++current;
      break;
    case 'quasi-$':
      // expressions always go into an odd position. If we're in an even
      // position we insert an empty string:
      if ((current % 2) == 0) {
        parts.push('');
        ++current;
      }
      parts.push(parseQuasiInlineEscape(pctx));
      ++current;
      break;

    case '<eof>':
      throw new Error('Unterminated string');
      break;
    default:
      throw new Error('Internal parser error: Unknown token in string ('+pctx.token+')');
    }
    end_extent(pctx, pctx.token);
    scan(pctx, undefined, TOKENIZER_QUASI);
  }
  scan(pctx);
  
  // xxx can this happen?
  if (current == 0) {
    parts.push('');
  }

  return quasi(pctx, pop_extent(pctx, 'GEN_QUASI'), parts);;
});

function parseQuasiInlineEscape(pctx) {
  // scan an identifier:
  var identifier = scan(pctx);
  if (pctx.token.id !== "<id>" && pctx.token.id !== "<@id>") throw new Error("Unexpected " + pctx.token + " in quasi template");
  if (pctx.src.charAt(pctx.lastIndex) != '(') {
    // $variable
    return identifier.exsf(pctx);
  }
  else {
    push_extent(pctx, pctx.token, 'parseQuasiInlineEscape');
    scan(pctx); // consume identifier
    scan(pctx, '('); // consume '('
    // $func(args)
    var args = [];
    while (pctx.token.id != ')') {
      if (args.length) scan(pctx, ',');
      args.push(parseExp(pctx, 110)); // only parse up to comma
    }
    return Node.CallExpression(pctx, pop_extent(pctx, 'GEN_FUN_CALL'), identifier.exsf(pctx), args);
  }
}

S('quasi-${', TOKENIZER_SA);
S('quasi-$', TOKENIZER_SA);
S('quasi-`', TOKENIZER_OP);

function isStmtTermination(token) {
  return token.id == ";" || token.id == "}" || token.id == "<eof>";
}

function parseStmtTermination(pctx) {
  if (pctx.token.id != "}" && pctx.token.id != "<eof>" && !pctx.newline) {
    end_extent(pctx, pctx.token);
    scan(pctx, ";");
  }
}

function parseVarDecls(pctx, noIn) {
  var decls = [];
  var parse = noIn ? parseExpNoIn : parseExp;
  do {
    if (decls.length) scan(pctx, ",");
    push_extent(pctx, pctx.token, 'parseVarDecls');
    var id_or_pattern = parse(pctx, 120), initialiser=null;
    if (pctx.token.id == "=") {
      scan(pctx);
      initialiser = parse(pctx, 110);
      end_extent(pctx, initialiser);
    }
    decls.push([id_or_pattern, initialiser, pop_extent(pctx, 'parseVarDecls')]);
  } while (pctx.token.id == ",");
  end_extent(pctx, decls[decls.length-1][2]);
  return decls;
}
    
S("var").stmt(function(pctx) {
  push_extent(pctx, null, 'var.stmt');
  var decls = parseVarDecls(pctx);
  parseStmtTermination(pctx);
  
  return Node.VariableDeclaration(pctx, pop_extent(pctx, 'GEN_VAR_DECL'), decls);
});

S("else");

S("if").stmt(function(pctx) {
  push_extent(pctx, null, 'if.stmt');
  scan(pctx, "(");
  var test = parseExp(pctx);
  scan(pctx, ")");
  var consequent = parseStmt(pctx);
  var alternative = null;
  if (pctx.token.id == "else") {
    scan(pctx);
    alternative = parseStmt(pctx);
  }
  
  return Node.IfStatement(pctx, pop_extent(pctx, 'GEN_IF'), test, consequent, alternative);
});

S("while").stmt(function(pctx) {
  push_extent(pctx, null, '.stmt');
  scan(pctx, "(");
  var test = parseExp(pctx);
  scan(pctx, ")");
  /* */
  var body = parseStmt(pctx);
  /* */
  
  return Node.WhileStatement(pctx, pop_extent(pctx, 'GEN_WHILE'), test, body);
});

S("do").stmt(function(pctx) {
  push_extent(pctx, null, '.stmt');
  /* */
  var body = parseStmt(pctx);
  /* */
  scan(pctx, "while");
  scan(pctx, "(");
  var test = parseExp(pctx);
  end_extent(pctx, pctx.token);
  scan(pctx, ")");
  parseStmtTermination(pctx);
  
  return Node.DoWhileStatement(pctx, pop_extent(pctx, 'GEN_DO_WHILE'), body, test);
});

S("for").stmt(function(pctx) {
  push_extent(pctx, null, '.stmt');
  scan(pctx, "(");
  var start_exp = null;
  var decls = null;
  if (pctx.token.id == "var") {
    push_extent(pctx, pctx.token, 'for var decls');
    scan(pctx); // consume 'var'
    decls = parseVarDecls(pctx, true);
    decls.extent = pop_extent(pctx, 'for var decls');
  }
  else {
    if (pctx.token.id != ';')
      start_exp = parseExpNoIn(pctx);
  }

  if (pctx.token.id == ";") {
    scan(pctx);
    var test_exp = null;
    if (pctx.token.id != ";")
      test_exp = parseExp(pctx);
    scan(pctx, ";");
    var inc_exp = null;
    if (pctx.token.id != ")")
      inc_exp = parseExp(pctx);
    scan(pctx, ")");
    /* */
    var body = parseStmt(pctx);
    /* */
    
    return Node.ForStatement(pctx, pop_extent(pctx, 'GEN_FOR'), start_exp, decls, test_exp, inc_exp, body);
  }
  else if (pctx.token.id == "in") {
    scan(pctx);
    //XXX check that start_exp is a valid LHS
    if (decls && decls.length > 1)
      throw new Error("More than one variable declaration in for-in loop");
    var obj_exp = parseExp(pctx);
    scan(pctx, ")");
    /* */
    var body = parseStmt(pctx);
    /* */
    var decl = decls ? decls[0] : null;
    
    return Node.ForInStatement(pctx, pop_extent(pctx, 'GEN_FOR_IN'), start_exp, decl, obj_exp, body);
  }
  else
    throw new Error("Unexpected token '"+pctx.token+"' in for-statement");
});

S("continue").stmt(function(pctx) {
  push_extent(pctx, null, '.stmt');
  var label = null;
  if (pctx.token.id == "<id>" && !pctx.newline) {
    label = pctx.token.value;
    end_extent(pctx, pctx.token);
    scan(pctx);
  }
  parseStmtTermination(pctx);
  
  return Node.ContinueStatement(pctx, pop_extent(pctx, 'GEN_CONTINUE'), label);
});

S("break").stmt(function(pctx) {
  push_extent(pctx, null, '.stmt');
  var label = null;
  if (pctx.token.id == "<id>" && !pctx.newline) {
    label = pctx.token.value;
    end_extent(pctx, pctx.token);
    scan(pctx);
  }
  parseStmtTermination(pctx);
  
  return Node.BreakStatement(pctx, pop_extent(pctx, 'GEN_BREAK'), label);
});

S("return").stmt(function(pctx) {
  push_extent(pctx, null, '.stmt');
  var exp = null;
  if (!isStmtTermination(pctx.token) && !pctx.newline) {
    exp = parseExp(pctx);
    end_extent(pctx, pctx.token);
  }
  parseStmtTermination(pctx);
  
  return Node.ReturnStatement(pctx, pop_extent(pctx, 'GEN_RETURN'), exp);
});

S("with").stmt(function(pctx) {
  push_extent(pctx, null, '.stmt');
  scan(pctx, "(");
  var exp = parseExp(pctx);
  scan(pctx, ")");
  var body = parseStmt(pctx);
  end_extent(pctx, body);
  
  return Node.WithStatement(pctx, pop_extent(pctx, 'GEN_WITH'), exp, body);
});

S("case");
S("default");

S("switch").stmt(function(pctx) {
  push_extent(pctx, null, 'switch.stmt');
  scan(pctx, "(");
  var exp = parseExp(pctx);
  scan(pctx, ")");
  scan(pctx, "{");
  /* */
  var clauses = [];
  while (pctx.token.id != "}") {
    var clause_exp = null;
    push_extent(pctx, pctx.token, 'case clause');
    if (pctx.token.id == "case") {
      scan(pctx);
      clause_exp = parseExp(pctx);
    }
    else if (pctx.token.id == "default") {
      scan(pctx);
    }
    else
      throw new Error("Invalid token '"+pctx.token+"' in switch statement");
    scan(pctx, ":");
    end_extent(pctx, pctx.token);
    
    push_scope(pctx);                              top_scope(pctx).exp = clause_exp;
    while (pctx.token.id != "case" && pctx.token.id != "default" && pctx.token.id != "}") {
      var stmt = parseStmt(pctx);
      
      end_extent(pctx, stmt);
      top_scope(pctx).stmts.push(stmt);
    }
    clauses.push((function(pctx) {
      
      return Node.SwitchCase(pctx, pop_extent(pctx, 'case clause'), pop_scope(pctx)); 
    })(pctx));
  }
  /* */
  end_extent(pctx, pctx.token);
  scan(pctx, "}");
  
  return Node.SwitchStatement(pctx, pop_extent(pctx, 'GEN_SWITCH'), exp, clauses);
});

S("throw").stmt(function(pctx) {
  push_extent(pctx, null, 'throw.stmt');
  if (pctx.newline) throw new Error("Illegal newline after throw");
  var exp = parseExp(pctx);
  end_extent(pctx, exp);
  parseStmtTermination(pctx);
  
  return Node.ThrowStatement(pctx, pop_extent(pctx, 'GEN_THROW'), exp);;
});

S("catch");
S("finally");

// parse catch-retract-finally
// returns [ [catch_id,catch_block,catchall?]|null,
//           retract|null,
//           finally|null ]
function parseCRF(pctx) {
  var rv = [];
  var a = null;
  if (pctx.token.id == "catch"
      // XXX catchall should only work for try, not for waitfor!
      || pctx.token.value == "catchall" // XXX maybe use a real syntax token
     ) {
    var all = pctx.token.value == "catchall";
    a = [];
    scan(pctx);
    a.push(scan(pctx, "(").value);
    scan(pctx, "<id>");
    scan(pctx, ")");
    scan(pctx, "{");
    a.push(parseBlock(pctx));
    a.push(all);
  }
  rv.push(a);
  if (pctx.token.value == "retract") { // XXX maybe use a real syntax token
    scan(pctx);
    scan(pctx, "{");
    rv.push(parseBlock(pctx));
  }
  else
    rv.push(null);
  if (pctx.token.id == "finally") {
    scan(pctx);
    scan(pctx, "{");
    rv.push(parseBlock(pctx));
  }
  else
    rv.push(null);
  return rv;
}

S("try").stmt(function(pctx) {
  push_extent(pctx, null, '.stmt');
  scan(pctx, "{");
  var block = parseBlock(pctx);
  var op = pctx.token.value; // XXX maybe use proper syntax token
  if (op != "and" && op != "or") {
    // conventional 'try'
    var crf = parseCRF(pctx);
    if (!crf[0] && !crf[1] && !crf[2])
      throw new Error("Missing 'catch', 'finally' or 'retract' after 'try'");
    
    return Node.TryStatement(pctx, pop_extent(pctx, 'GEN_TRY'), block, crf);
  }
  else {
    var blocks = [block];
    do {
      scan(pctx);
      scan(pctx, "{");
      blocks.push(parseBlock(pctx));
    } while (pctx.token.value == op);
    var crf = parseCRF(pctx);
    
    return gen_waitfor_andor(op, blocks, crf, pctx, pop_extent(pctx, 'GEN_WAITFOR_ANDOR'));
  }
});

S("waitfor").stmt(function(pctx) {
  push_extent(pctx, null, 'waitfor.stmt');
  if (pctx.token.id == "{") {
    // DEPRECATED and/or forms
    scan(pctx, "{");
    var blocks = [parseBlock(pctx)];
    var op = pctx.token.value; // XXX maybe use syntax token
    if (op != "and" && op != "or") throw new Error("Missing 'and' or 'or' after 'waitfor' block");
    do {
      scan(pctx);
      scan(pctx, "{");
      blocks.push(parseBlock(pctx));
    } while (pctx.token.value == op);
    var crf = parseCRF(pctx);
    
    return gen_waitfor_andor(op, blocks, crf, pctx, pop_extent(pctx, 'GEN_WAITFOR_ANDOR'));
  }
  else {
    // suspend form
    scan(pctx, "(");
    var has_var = (pctx.token.id == "var");
    if (has_var) scan(pctx);
    var decls = [];
    if (pctx.token.id == ")") {
      if (has_var) throw new Error("Missing variables in waitfor(var)");
    }
    else
      decls = parseVarDecls(pctx);
    scan(pctx, ")");
    scan(pctx, "{");
    
    /*nothing*/
    var block = parseBlock(pctx);
    var crf = parseCRF(pctx);
    
    /*nothing*/
    
    return gen_suspend(has_var, decls, block, crf, pctx, pop_extent(pctx, 'GEN_SUSPEND'));
  }    
});


S("__js").stmt(function(pctx) {
  push_extent(pctx, null, '__JS.stmt');
  
  
  var body = parseStmt(pctx);
  
  
  
  pop_extent(pctx, 'GEN_JS'); return body;
}).
  exs(function(pctx) {
    push_extent(pctx, this, '__JS.exp');
    
    var right = parseExp(pctx, 112);
    
    
    end_extent(pctx, right);
    pop_extent(pctx, 'GEN_JS_EXP'); return right;
  });


// reserved keywords:
S("abstract");
S("boolean");
S("byte");
S("char");
S("class");
S("const");
S("debugger");
S("double");
S("enum");
S("export");
S("extends");
S("final");
S("float");
S("goto");
S("implements");
S("import");
S("int");
S("interface");
S("long");
S("native");
S("package");
S("private");
S("protected");
S("public");
S("short");
S("static");
S("super");
S("synchronized");
S("throws");
S("transient");
S("volatile");

//----------------------------------------------------------------------
// Parser

function makeParserContext(src, settings) {
  var ctx = {
    src       : src,
    line      : 1,
    lastIndex : 0,
    token     : null
  };
  ctx.getColumn = function(idx) {
      // console.log("COLUMN @ line:");
      var pos = idx;
      if(this.src.charAt(idx) === '\n') {
        // console.log("Is a newline");
        pos--;
      }
      var lineStart = this.src.lastIndexOf('\n', pos)+1;

      // console.log("lineStart["+idx+"] = "+lineStart);
      if(lineStart>idx) return 0;
      // var lineEnd = this.src.indexOf('\n', idx);
      // if(lineEnd === -1) lineEnd = this.src.length-1;
      // console.log("LINE: "+idx+"="+JSON.stringify(this.src.charAt(idx))+" :: " + JSON.stringify([
      //     lineStart,
      //     idx,
      //     lineEnd,
      //     this.src.slice(lineStart, lineEnd),
      //     // this.src.slice(lineStart, idx),
      //     idx - lineStart,
      // ]));
      return idx - lineStart;
  };

  // TODO: track this eagerly, rather than on-demand?
  Object.defineProperty(ctx, 'column', {get:
    function() { return this.getColumn(this.lastIndex); }
  });

  if (settings)
    for (var a in settings)
      ctx[a] = settings[a];

  return ctx;
}


function compile(src, settings) {
  // XXX The regexps of our lexer currently assume that there is never
  // a '//' comment on the last line of the source text. This will
  // currently match as separate /'s, since we're not checking for
  // '$'.  We could amend our regexps and amend the check for EOF
  // below in the scan function, or we can ensure there's always a
  // '\n' at the end. Doing the latter for now, since I suspect it
  // wins performance-wise:

  var pctx = makeParserContext(src+"\n", settings);
  try {
    return parseScript(pctx);
  }
  catch (e) {
    var mes = e.mes || e;
    var line = e.line || pctx.line;
    var exception = new Error("SJS syntax error "+(pctx.filename?"in "+pctx.filename+",": "at") +" line " + line + ": " + mes);
    exception.line = line;
    exception.column = pctx.getColumn(pctx.column);
    exception.compileError = {message: mes, line: line};
    throw exception;
  }
}
exports.compile = exports.parse = compile;

function parseScript(pctx) {
  if (typeof pctx.scopes !== 'undefined')                        throw new Error("Internal parser error: Nested script");   pctx.scopes = [];                                            pctx.open_tokens = [];   if(pctx.tokens) {     pctx.all_tokens = [];   }   if(pctx.range||pctx.range) pctx.extents = [];   pctx.program = Node.Program(pctx);   push_scope(pctx);
  scan(pctx);
  while (pctx.token.id != "<eof>") {
    var stmt = parseStmt(pctx);
    
    top_scope(pctx).stmts.push(stmt);;
  }
  if(pctx.tokens) pctx.program.tokens = pctx.all_tokens;   pctx.program.body = pop_scope(pctx).stmts;   if(pctx.extents && pctx.extents.length > 0) throw new Error(pctx.extents.length + " extents remaining after parse");   pctx.program._end(pctx);   return pctx.program;
}

function parseStmt(pctx) {
  var t = pctx.token;
  push_extent(pctx, t, 'parseStmt');
  var _ast_extentLength = pctx.extents ? pctx.extents.length : null;
  scan(pctx);
  if (t.stmtf) {
    // a specialized statement construct
    var rv = t.stmtf(pctx);
    if(_ast_extentLength !== null) {     if(pctx.extents.length !== _ast_extentLength)       throw new Error("mismatch extent: " + rv + " - Expected " +_ast_extentLength+", got " + pctx.extents.length);   }
    pop_extent(pctx, 'parseStmt');
    end_extent(pctx, rv);
    return rv;
  }
  else if (t.id == "<id>" && pctx.token.id == ":") {
    // a labelled statement
    scan(pctx); // consume ':'
    // XXX should maybe code this in non-recursive style:
    var stmt = parseStmt(pctx);
    
    if(_ast_extentLength !== null) {     if(pctx.extents.length !== _ast_extentLength)       throw new Error("mismatch extent: " + stmt + " - Expected " +_ast_extentLength+", got " + pctx.extents.length);   }
    return Node.LabeledStatement(pctx, pop_extent(pctx, 'GEN_LBL_STMT'), t.value, stmt);
  }
  else {
    // an expression statement
    var exp = parseExp(pctx, 0, t);
    end_extent(pctx, exp);
    parseStmtTermination(pctx);
    
    if(_ast_extentLength !== null) {     if(pctx.extents.length !== _ast_extentLength)       throw new Error("mismatch extent: " + exp + " - Expected " +_ast_extentLength+", got " + pctx.extents.length);   }
    return Node.ExpressionStatement(pctx, pop_extent(pctx, 'GEN_EXP_STMT'), exp);
  }
}

// bp: binding power of enclosing exp, t: optional next token
function parseExp(pctx, bp, t) {
  bp = bp || 0;
  if (!t) {
    t = pctx.token;
    scan(pctx);
  }
  var _ast_extentLength = pctx.extents ? pctx.extents.length : null;
  push_extent(pctx, t, 'parseExp');
  var left = t.exsf(pctx);
  while (bp < pctx.token.excbp) {
    // automatic semicolon insertion:
    if (pctx.newline && t.asi_restricted)
      break;
    t = pctx.token;
    end_extent(pctx, t);
    scan(pctx);
    left = t.excf(left, pctx);
    end_extent(pctx, t);
  }
  var exprEnd = pop_extent(pctx, '<parseExp');
  end_extent(pctx, exprEnd);
  if(_ast_extentLength !== null) {     if(pctx.extents.length !== _ast_extentLength)       throw new Error("mismatch extent: " + left + " - Expected " +_ast_extentLength+", got " + pctx.extents.length);   }
  return left;
}

// parse up to keyword 'in' ( where bp might be < bp(in) )
function parseExpNoIn(pctx, bp, t) {
  bp = bp || 0;
  if (!t) {
    t = pctx.token;
    scan(pctx);
  }
  push_extent(pctx, t, 'parseExpNoIn');
  var _ast_extentLength = pctx.extents ? pctx.extents.length : null;
  var left = t.exsf(pctx);
  while (bp < pctx.token.excbp && pctx.token.id != 'in') {
    t = pctx.token;
    // automatic semicolon insertion:
    if (pctx.newline && t.asi_restricted)
      return left;
    scan(pctx);
    left = t.excf(left, pctx);
  }
  if(_ast_extentLength !== null) {     if(pctx.extents.length !== _ast_extentLength)       throw new Error("mismatch extent: " + left + " - Expected " +_ast_extentLength+", got " + pctx.extents.length);   }
  pop_extent(pctx, '<parseExpNoIn');
  return left;
}


function scan(pctx, id, tokenizer) {
  if (!tokenizer) {
    if (pctx.token)
      tokenizer = pctx.token.tokenizer;
    else
      tokenizer = TOKENIZER_SA;
  }
  
  if (id && (!pctx.token || pctx.token.id != id))
    throw new Error("Unexpected " + pctx.token + ", looking for " + id + " on " + pctx.line);
  pctx.token = null;
  pctx.newline = 0;
  while (!pctx.token) {
    tokenizer.lastIndex = pctx.lastIndex;
    var matches = tokenizer.exec(pctx.src);
    if (!matches) {
      pctx.token = ST.lookup("<eof>");
      break;
    }
    pctx.lastIndex = tokenizer.lastIndex;

    if (tokenizer == TOKENIZER_SA) {
      if (matches[4]) {
        pctx.token = ST.lookup(matches[4]);
        if (!pctx.token) {
          pctx.token = new Identifier(matches[4]);
        }
      }
      else if (matches[1]) {
        var m = matches[1].match(/(?:\r\n|\n|\r)/g);
        if (m) {
          pctx.line += m.length;
          pctx.newline += m.length;
          ;
        }
        // go round loop again
      }
      else if (matches[5]) {
        pctx.token = new Literal("<string>", matches[5]);
      }
      else if (matches[6]) {
        var val = matches[6];
        var m = val.match(/(?:\r\n|\n|\r)/g);
        pctx.line += m.length;
        pctx.newline += m.length;
        var length = val.length;
        var lit = val.replace(/\\(?:\r\n|\n|\r)/g, "").replace(/(?:\r\n|\n|\r)/g, "\\n");
        pctx.token = new Literal("<string>", lit
            , val.length);
        pctx.token.lines = m.length;
      }
      else if (matches[2])
        pctx.token = new Literal("<number>", matches[2]);
      else if (matches[3])
        pctx.token = new Literal("<regex>", matches[3]);
      else if (matches[7])
        throw new Error("Unexpected characters: '"+matches[7]+"'");
      else
        throw new Error("Internal scanner error");
      //print("sa:"+pctx.token);
    }
    else if (tokenizer == TOKENIZER_OP) { // tokenizer == TOKENIZER_OP
      if (matches[2]) {
        pctx.token = ST.lookup(matches[2]);
        if (!pctx.token) {
          pctx.token = new Identifier(matches[2]);
        }
      }
      else if (matches[1]) {
        var m = matches[1].match(/(?:\r\n|\n|\r)/g);
        if (m) {
          pctx.line += m.length;
          pctx.newline += m.length;
          ;
        }
        // go round loop again
      }
      else {
        // We might be in an SA position after an omitted
        // newline. switch tokenizers and try again. The SA tokenizer will
        // bail if it can't match a token either.
        tokenizer = TOKENIZER_SA;
        // go round loop again
      }
      //print("op:"+pctx.token);
    }
    else if (tokenizer == TOKENIZER_IS) {
      // interpolating string tokenizer
      if (matches[1]) {
        pctx.token = new Literal("<string>", matches[1]);
        pctx.token.inner = '"';
      } else if (matches[2]) {
        ++pctx.line;
        ++pctx.newline;
        // go round loop again
      }
      else if (matches[3]) {
        ++pctx.line;
        ++pctx.newline;
        pctx.token = new Literal("<string>", '\\n', 1);
        pctx.token.inner = '"';
        pctx.token.lines = 1;
      }
      else if (matches[4]) {
        pctx.token = ST.lookup("istr-"+matches[4]);
      }
    }
    else if (tokenizer == TOKENIZER_QUASI) {
      // quasiliteral tokenizer
      if (matches[1]) {
        pctx.token = new Literal("<string>", matches[1]);
        pctx.token.inner = '`';
      } else if (matches[2]) {
        ++pctx.line;
        ++pctx.newline;
        // go round loop again
      }
      else if (matches[3]) {
        ++pctx.line;
        ++pctx.newline;
        pctx.token = new Literal("<string>", '\\n');
        pctx.token.inner = '`';
      }
      else if (matches[4]) {
        pctx.token = ST.lookup("quasi-"+matches[4]);
      }
    }
    else
      throw new Error("Internal scanner error: no tokenizer");
  }
  pctx.token = emitToken(pctx, pctx.token, pctx.all_tokens);;
  return pctx.token;
}

