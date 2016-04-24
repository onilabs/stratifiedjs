/**
@summary StratifiedJS language syntax
@type doc

@syntax @altns
@summary The alternate namespace
@desc
  SJS defines a special module-local variable called `@`. This is known as the "altns" or "alternate namespace" symbol.

  The purpose of `@` is to manage imported symbols easily. For convenience of access,
  it is common to assign local variables for commonly-used symbols inside other modules, e.g:

      var { each, map, transform, toArray  } = require('sjs:sequence');
      var { ownKeys, ownPropertyPairs, get } = require('sjs:object');
      var { startsWith, endsWith, contains } = require('sjs:string');

  When such functions are combined with the [::double-dot] syntax, it allows
  for concise, clutter-free code:

      obj .. ownKeys
        .. filter(key -> !key .. startsWith("_"))
        .. each { |key|
        doSomethingWith(obj .. get(key));
      }

  Without a top-level variable for each of these functions, the code
  would still be concise, but starts to accumulate line noise -
  we know where `each` and `filter` come from, we don't need the constant
  repetition of the `seq.` prefix each time we use them.

      obj .. object.ownKeys
        .. seq.filter(key -> !key .. string.startsWith("_"))
        .. seq.each { |key|
        doSomethingWith(obj .. object.get(key));
      }

  However, binding imported functions and modules to a local variable has its downsides:

    - Each module is unique - moving code from one module to another may not work,
      as it may not have the required variables in scope.
    - Since StratifiedJS provides most of its functionality via modules, you often
      need a handful of import lines to make standard functionality available to
      each new module that you write.
    - You often end up with accidental variable clashes - e.g.
      if you have a variable or function paramater named `url`, this will
      shadow any module-level `var url = require('sjs:url')`.

  ## Intended use

  The `@` syntax is meant as a way to maintain the brevity of local variables while
  removing the effort involved in defining and maintaining these variables, as
  well as encouraging consistency between modules.

  It also provides a visual (and lexical) separation between local and imported
  symbols - a developer can easily tell that `@url` is probably the [url::] module,
  while `url` most likely refers to an actual URL string.

  It's recommended that you always place module-wide *imported* symbols into
  `@`, rather than binding them to local variables. There is nothing
  to enforce this rule, but following it will help to make your code
  consistent and readable.

  ### Initializing `@`:

  Initially, the value of `@` in each module is undefined. To use it, you should
  assign an object to it. Most commonly, you will assign a required module:

      @ = require('./common');

  **Note** that you do not need to use `var @`, since `@` is already defined as
  a module-local variable.

  You can also use the multiple-module loading feature of [./builtins::require]
  to merge multiple modules into `@`, e.g:

      @ = require(['sjs:string', 'sjs:object', 'sjs:sequence']);

  ### Using `@`

  `@xyz` is syntactic shorthand for `@.xyz` - so you can use properties
  of `@` as if they were just variabls starting with `@`. For example:

      @ = require('sjs:sequence');
      var numbers = [0,1,2,3,4,5];
      numbers .. @filter(x -> x % 2 == 0) .. @each(console.log);

  ### Adding to `@`

  You don't need to create `@` from a single object - once it's set, you can
  add more properties to it just like a regular object:

      @ = require('sjs:sequence');
      @url = require('sjs:url');

      // now @url is defined, in addition to the
      // sequence symbols like @map and @each

  ### Protecting against accidental mutation

  Keen readers will note that if we assign the [sequence::] module to `@`:

      @ = require('sjs:sequence');

  ..and then assign to `@url`:

      @url = require('sjs:url');

  Then we have accidentally added `url` to the [sequence::] module's exported properties!

  We certainly don't want that - `@` is supposed to be local to each module. So
  the syntax for `@` has an additional special case - whenever you assign to it
  directly as in `@ = someValue`, we actually assign a value *inherited*
  from `someValue`. In the `sequence` example, it's equivalent to:
  
      @ = Object.create(require('sjs:sequence'));
  
  So `@` will inherit all of the properties exported by the sequence module,
  but modifying `@` will affect only our inherited object - it won't affect
  the original object at all.



@syntax waitfor-resume
@summary Suspend execution until a callback is invoked
@desc
  Using SJS's `waitfor()` construct, called the *suspending waitfor*
  (not to be confused with the composition constructs `waitfor/and/or`),
  execution of a stratum can be suspended until explictly resumed:

      waitfor() {
        // ... "suspending code block" ...
      }
      // ... next code ...

  Here, the *suspending code block* (the code inside the curly brackets)
  will be executed and the stratum will suspend. `next code` will not be
  executed until the stratum is explicitly resumed. For this purpose,
  the `waitfor()` construct defines a function `resume` inside its suspending
  code block. Calling `resume()` will resume the corresponding suspended
  stratum at the point of `next code`. Only the first call to `resume`
  will have an effect (and only if the suspended waitfor has not been
  cancelled). Subsequent calls to `resume()` will be ignored.

  A call to `resume()` will immediately begin executing `next_code`. 
  When `next_code` finishes or suspends, the code after the `resume()` will be executed.
  
  Example: In a web browser we can use `waitfor()` with `window.setTimeout`
  to make a 'pause' function (similar to `hold(t)`):
  
      function pause(t) {
        waitfor() {
          window.setTimeout(resume, t);
        }
      }

  Parameters passed into the call to `resume()` can be captured by putting
  them into the `waitfor()`'s variable list:

      waitfor(var a, b, c) {
        window.r = resume;
      }
      console.log("a,b,c = "+a+","+b+","+c);
  
  
      //code running in another stratum:
      ... 
      window.r(1,2,3);
      ...


  This code will log `"a,b,c=1,2,3"`.


  The full syntax of the suspending waitfor construct is:


      waitfor ( [*return_var_decls*] ) *block*
      [ catch(e) *catch_block* ]
      [ retract *retract_block* ]
      [ finally *finally_block* ]


@syntax waitfor-and
@summary Execute multiple code paths, waiting for each to complete
@desc
  The basic `waitfor/and` syntax is:

      waitfor {
        ... some code ...
      }
      and {
        ... some other code ...
      }
      ... next code ...

  This code executes `some code` until it finishes or suspends. It then
  executes `some other code` until the latter finishes or suspends. Only
  when both `some code` and `some other code` have finished will the
  execution proceed with `next code`.


  `waitfor/and` can take more than 2 clauses, as well as optional catch/retract/finally clauses (like `try`). The full syntax is:


      waitfor *block1* and *block2* [ and *block3* [ and ... ] ]
      [ catch(e) *catch_block* ]
      [ retract *retract_block* ]
      [ finally *finally_block* ]



@syntax waitfor-or
@summary Execute multiple code paths, waiting only for the first to complete
@desc
  The basic `waitfor/or` syntax is:

      waitfor {
        ... some code ...
      }
      or {
        ... some other code ...
      }
      ... next code ...


  This code first executes `some code`. If `some
  code` finishes, then
  `some other code` will be skipped, and execution proceeds
  directly with `next code`. If, instead, `some
  code` suspends, `some other code` will be executed
  until it either suspends or finishes. When either `some
  code` or `some other code` finishes, while the other is
  suspends, the suspended code will be cancelled.


  One scenario where alt composition is helpful is to add timeouts:


      waitfor {
        var rv = do_request_to_database_server();
      }
      or {
        hold(1000);
        throw ("timeout in database server communication");
      }


  Here, we're timing out our database request after 1s. Note how we can
  treat `do_request_to_database_server` as a complete black box. SJS
  is modular!


  `waitfor/or` can take more than 2 clauses, as well as optional catch/retract/finally clauses (like `try`). The full syntax is:


      waitfor *block1* or *block2* [ or *block3* [ or ... ] ] 
      [ catch(e) *catch_block* ]
      [ retract *retract_block* ]
      [ finally *finally_block* ]



@syntax collapse
@summary Abort other branches in a waitfor/or
@desc
  The `collapse` keyword may only occur inside a
  `waitfor/or` construct.

  When encountered, all other branches will
  immediately be aborted.

  ### Example:

      waitfor {
        console.log('a1');
        hold(1000);
        console.log('a2');
      }
      or {
        console.log('b1');
        collapse; // this aborts all other waitfor..or clauses
        hold(2000);
        console.log('b2');
      }
      // This code prints a1, b1, b2.

@syntax try-retract
@summary Handle cancellation of the current stratum
@desc
  Cancellation of the current stratum can be "caught" much like exceptions using `try/retract`:

      try {
        ... some suspending code ...
      }
      retract {
        console.log("'some suspending code' has been cancelled!");
      }

  Cancellation is also honoured by `try/finally`; i.e. a `finally` clause
  will be executed whether a `try` block is left normally, by exception or
  by cancellation.


  As a shorthand, `catch`, `retract`, and `finally` blocks can be appended
  directly to a `waitfor()`, `waitfor/and`, or `waitfor/or`, without having to
  wrap it into a `try`-clause.


  Example: Here is a function that waits for a DOM event in the webbrowser:


      function waitforEvent(elem, event) {
        waitfor(var rv) {
          elem.addEventListener(event, resume, false);
        }
        finally {
          console.log("cleanup on "+elem.id+"...");
          elem.removeEventListener(event, resume, false);
        }
        return rv;
      }

@syntax spawn
@summary Unstructured spawning of strata
@desc
  In addition to the structured composition operators, StratifiedJS has the `spawn` operator to execute some code in the background in an unstructured fashion, similar to how you would "spawn a thread" in other programming languages:

      spawn <expression>;

  This *spawn expression* executes `expression` *synchronously* until `expression` suspends or finishes, and then returns a [./builtins::Stratum] object.

  Further execution of `expression` proceeds asynchronously until it finishes or is aborted through a call to `Stratum.abort`.

  **Note:** Instead of spawning a stratum it is often a better idea to use one of
  the *structured concurrency constructs* [::waitfor-and] and [::waitfor-or] where possible.

@syntax destructure
@summary Assign multiple variables from a single expression
@desc
  *proposed for ECMA-262 Edition 6*

  Destructuring is a convenient syntax for picking apart structured data, mirroring the way array and object literals are constructed. 

  E.g. if you have a function that returns an array, you can directly extract this to individual variables using the following destructuring assignment:


      function foo() { return ['x', 'y', 'z']; }
      var a,b,c;
      [a,b,c] = foo();
      // we'll now have a=='x', b=='y' and c=='z'

  Objects can also be destructured:

      function bar() { return {x:1, y:2, z:3; } }
      var a,b,c;
      ({x:a,y:b,z:c}) = bar();
      // we'll now have a==1, b==2 and c==3

  Note that object patterns cannot appear at the start of a statement, hence the parentheses around the object pattern in `({x:a,y:b,z:c}) = bar();`. 

  Often, the variable names and property names used are the same when destructuring objects. If so, you can use a [DRY](http://en.wikipedia.org/wiki/Don't_repeat_yourself) shorthand whereby the pattern `{author, content}` is equivalent to `{author:author, content:content}`.

  Please see the [destructuring docs at ecmascript.org](http://wiki.ecmascript.org/doku.php?id=harmony:destructuring) for full syntax details.

  Note that destructuring support as implemented in StratifiedJS does not currently support destructuring in `catch` clauses, but they do work everywhere else.

@syntax string-interpolation
@summary Embed values into string literals with "#{ ... }"
@desc
  *using the same syntax as Ruby and CoffeeScript*

  String interpolation allows you to insert the value of an expression into a string literal. It can only be used inside double-quotes:

      console.log("Hello, #{name}!");
      
      // equivalent to:
      console.log("Hello, " + name + "!");

@syntax quasi-quote
@summary Rich string interpolation (backtick-strings)
@desc

  *a simplified version of the ECMAScript Harmony [Quasi-Literal / Template String](http://wiki.ecmascript.org/doku.php?id=harmony:quasis) proposal*

  Quasi-quotes ("quasis") look like strings, but are delimited by backticks
  (\`) instead of single or double quotes.

  Within a quasi, you can insert interpolated expressions by placing them inside
  `${ ... }`.

  Unlike string interpolation, a quasi-quoted value is a rich object. It maintains
  the embedded values alongside the literal portions, allowing the recipient
  to choose how embedded values are converted.

  For example, quasi-quotes are accepted by functions in the standard [sjs:logging::] module.

  Instead of just converting each embedded value to a string (as string interpolation does), using quasis allows the logging module to be smarter about how values are presented. Specifically, it will pass any non-string values through `debug.inspect`:

      var name = { first: "john", last: "smith" };
      logging.info("New user: #{name}");
      // prints: INFO: New user: [Object object]
      logging.info(`New user: ${name}`);
      // prints: INFO: New user: { first: "john", last: "smith" }

  The [sjs:quasi::] module provides functions for dealing with quasi-quote objects at runtime.

  ### Shorthand interpolation

  As shorthand, you can omit the `{}` braces when inserting single variables or calling a named functions:

   - `$variable_name`
   - `$method(args ...)`

   Note that this only works for single-word variables and functions - you cannot use this shorthand for
   dotted properties like `$foo.bar` or `$str.trim()`.


@syntax double-dot
@summary Postfix function chaining operator
@desc

  *created for SJS; although we later discovered [elixir](http://elixir-lang.org/)'s `|>` pipe operator was created independently with the same functionality*
  
  The double-dot operator allows you to chain together expressions in a similar way to how the regular dot operator is often used to create [fluent interfaces](http://en.wikipedia.org/wiki/Fluent_interface), but without requiring any object-oriented wrappers. You can think of it like the pipe operator in UNIX shells, allowing you to 'pipe' the result of one expression into another function, resulting in expressions that are much easier to read and write than standard parenthesized expressions.
  
  When used, the expression on its left-hand side is passed as the first argument to the function call on its right-hand side. So the expression `a .. b(c)` gets rewritten to `b(a, c)`. For a concrete example, many of the functions in the [sjs:sequence::] module are intended to be used with the double-dot operator:
  

      var { each } = require('sjs:sequence');
      var numbers = [1,2,3];
    
      numbers .. each(console.log);
    
      // equivalent to:
      each(numbers, console.log);

  
  The double-dot allows you to write functions that take their subject as the first argument, much like methods on objects have the implicit `this` as their subject. Which means you can make extension functions designed to be used with objects that you don't control. e.g:


      var { remove } = require('sjs:array');
      var numbers = ["one", "two", "three"];
    
      numbers .. remove("two");
    
      // equivalent to:
      remove(numbers, "two");


  The builtin `array` type doesn't have a `remove` method - but with the double-dot operator we can write our own and still have it read left-to-right, just like methods on object do.

  Double-dot methods aren't just for single calls, either. They work as you would expect in a chain, which gives them their UNIX pipe-like quality:


      var { transform, each } = require('sjs:sequence');
      var addOne = function(x) { return x + 1; }
      var halve = function(x) { return x / 2; }
      var numbers = [1,2,3];
      
      numbers .. transform(addOne) .. transform(halve) .. each(console.log);
      
      // equivalent to:
      each(transform(transform(numbers, addOne), halve), console.log);
      
      // or, less brain-meltingly:
      var added = transform(numbers, addOne);
      var halved = transform(added, halve);
      each(halved, console.log);


  It's important to note that the double-dot operator binds *less* tightly than brackets and the single-dot operator. So when you're operating on the result of a double-dot call, you may need to use braces:


      var { sort } = require('sjs:sequence');
      var numbers = [3,2,1];
    
      // INCORRECT:
      var smallest = numbers .. sort()[0]
    
      // Instead, you'd need to write it as:
      var smallest = (numbers .. sort())[0]
    
      // Or, as separate statements:
      var ordered = numbers .. sort();
      var smallest = ordered[0]


  On the other hand, this precedence means that the function on the right-hand side of the dots isn't restricted to just a variable, as in:


      numbers .. seq.transform(addOne) .. seq.transform(halve) .. 
        seq.each(console.log);
      
      // you could even require the sequence module inline:
      numbers .. require('sjs:sequence').each(console.log);


  Since the double-dot can only appear to the left of a function call, the compiler will treat the right-hand side as a function call even if you leave out the parentheses (which will only make sense for functions that take a single argument):


      var { sort } = require('sjs:sequence');
    
      var sorted = [3,1,2] .. sort;
    
      // equivalent to:
      var sorted = [3,1,2] .. sort();
      // or
      var sorted = sort([3,1,2]);

@syntax blocklambda
@summary Block-like syntax supporting custom control-flow
@desc
  *adopted from the [block lambda revival](http://wiki.ecmascript.org/doku.php?id=strawman:block_lambda_revival) proposal for ECMAScript*
  
  Blocklambdas are a cross between anonymous functions and the builtin block syntax for conditional statements, loops, function bodies, etc.

  They are intended to be used with 'higher-order' functions which take a function parameter, and have a special call syntax ("paren-free call syntax") similar to that of blocks in the ruby language:


      function someFunction(f) {
        ...
        f(param1, param2);
        ...
      }
    
      someFunction { |param1, param2|
        // block_body
      }


  At runtime, blocklambda syntax is converted to a function object - so in the above example, `someFunction` will be called with a function object that will execute the block_body when called. Unlike ruby, the called function doesn't see a special "block" argument.

  In a variant of the paren-free call syntax, if `someFunction` takes more than one argument (the last one being a function argument), we can write:


      function someFunction(argument1, argument2, f) {
        ...
        f(param1, param2);
        ...
      }
    
      someFunction(argument1, argument2) { |param1, param2|
        // block_body
      }



  Here, `someFunction` will be called with three arguments - `argument1`, `argument2` and a function object that will execute block_body when called. Even though the blocklamda is 'tacked on' to the `someFunction(argument1, argument2)` call it will be appended to  `someFunction`'s argument list. (I.e. it will effectively be 'pulled under' the parentheses.)

  Blocklambdas are not just shorthand for `function() { ... }` syntax. They have important semantic differences:


  - The `this` binding of the surrounding code is maintained inside the blocklambda 
  - A `return` statement inside a blocklambda will return from the enclosing scope, *not* just from the block. This also means that you can't return a value to the caller of a blocklambda (you should use a function if you need that).
  - A `break` statement inside a blocklambda will cause the function that called the blocklambda to return.
  - A `continue` statement inside a blocklambda will skip the rest of the blocklambda body and return to the caller.


  These differences are all intended to make the blocklambda useable as a control-flow mechanism, akin to the builtin block syntax of JavaScript. It allows for block-like constructs that aren't part of the core language. For example, many of the [sjs:sequence::] module functions work well with blocklambdas:


      var { each } = require('sjs:sequence');
      var { ownKeys } = require('sjs:object');
      
      var obj = {a: "aye", b: "bee", c:"cee"};
      
      ownKeys(obj) .. each { |key|
        var value = obj[key];
        console.log("object.#{key} = #{value}");
      
        // stop iterating after we hit `b`
        if (key == "b") break;
      }
      
      // If the keys of `obj` are traversed alphabetically, this prints:
      //   object.a = aye
      //   object.b = bee
      // (c will not be processed, just as if we broke out of a loop early)
    
  This provides a similar syntax to the builtin `for(var key in obj) { ... }` but it ignores inherited properties, and is implemented with normal functions - you can use this syntax to implement your own control-flow mechanisms.

@syntax double-colon
@summary Prefix function chaining operator
@desc

   Similar to how the [::double-dot] operator allows you to chain function calls by _postfixing_ a function application to an expression, the double-colon operator allows you to _prefix_ a function `foo` to be applied to an expression which will be passed as first argument to `foo`:

       function foo(x,y,z) { ... }

       // normal function call syntax:
       foo('a', 'b', 'c');

       // equivalent double-dot postfix syntax:
       'a' .. foo('b', 'c');

       // equivalent double-colon prefix syntax:
       foo('b', 'c') :: 'a';

   The double-colon operator associates to the right:

       function bar(x,y,z) { ... }

       // normal function call syntax:
       foo(bar('a', 'b', 'c'), 'd', 'e');

       // equivalent double-dot syntax:
       'a' .. bar('b', 'c') .. foo('d', 'e');

       // equivalent double-colon syntax:
       foo('d', 'e') :: bar('b', 'c') :: 'a'

   Just as for the [::double-dot] operator, function call parenthesis can be
   omitted (which will only make sense for functions that take a single argument):

       function foo(x) { ... }
       function bar(x) { ... }

       // normal function call syntax:
       foo(bar('a'));

       // equivalent double-dot syntax:
       'a' .. bar .. foo;

       // equivalent double-colon syntax:
       foo :: bar :: 'a'

   Mixed double-colon and double-dot expressions have somewhat counter-intuitive semantics: While the double-dot operator binds stronger than the double-colon operator, if there is a chain `f .. g .. h` of double-dot calls on the left of a double-colon expression `f .. g .. h :: a`, the right side `a` will be passed as first argument to `f`:

       function f(x) { ... }
       function g(x) { ... }
       function h(x) { ... }

       f .. g .. h :: a;

       // is equivalent to:
      
       f(a) .. g .. h;
 
       // or, in normal syntax:
 
       h(g(f(a)));

   The semantics of mixed double-colon and double-dot expressions imply that the left-most expression in a double-dot chain on the left side of a double-colon expression must be a function (or function call) expression:

       // invalid: a string is not a function
       'a' .. f :: a;

  ### Uses

  There are two important use cases where double-colon syntax can make code easier to
  construct and maintain.

  Firstly, the syntax lends itself to wrapping/annotating functions:

       var {rateLimit} = require('sjs:function');

       var pollServer = rateLimit(10) :: function() { ... }

       // equivalent to:

       var pollServer = (function() { ... }) .. rateLimit(10);

       // or:

       var pollServer = rateLimit(function() { ... }, 10);

  Here the latter two forms are especially unsatisfactory if the function definition
  stretches over many lines.

  Secondly, double-colon syntax is convenient for constructing tree datastructures, such
  as e.g. HTML in conductance's [mho:surface/html::] module:

       @ = require(['mho:std', 'mho:html'])

       var my_form = 
          @Div .. @Class('form') ::
            [
               @H1 :: 'Enter your name',
               @Div .. @Class('input-field') ::
                 [
                    @B :: 'First Name', 
                    @Input()
                 ],
               @Div .. @Class('input-field') ::
                 [
                    @B :: 'Last Name',
                    @Input()
                 ]
            ];
               
       // equivalent to:

       var my_form = 
          @Div(
            [
              @H1('Enter your name'),
              @Div(
                [
                  @B('First Name'),
                  @Input()
                ]
              ) .. @Class('input-field'),
              @Div(
                [
                  @B('First Name'),
                  @Input()
                ]
              ) .. @Class('input-field')
            ]
          ) .. @Class('form');
       
  Note how this example leverages the somewhat counter-intuitive mixed double-colon/double-dot syntax described above.
             


@syntax arrow-function
@summary Shorthand function syntax
@desc

  *adopted from the proposed ECMA-262 Edition 6 arrow syntax and CoffeScript's arrow syntax*

  Arrow syntax is a shorthand for a function that only consists of a single expression and which returns the result of this expression.
  For example:

      var add = (x, y) -> x + y;
      // equivalent to:
      var add = function(x, y) { return x + y; };


  You can also bind the current value of `this` by using the "fat arrow" variant:

      var addOne = (x) => this.add(x, 1);
      // equivalent to:
      var x = function(x) { return this.add(x, 1); }.bind(this);


  The parentheses around the argument list are optional in the case of zero or one arguments, so the following are also valid lambda expressions:

      var addOne = x -> x + 1;
      var returnOne = -> 1;


  **Note:** The body of an arrow function needs to be an *expression*. Multiple expressions can be chained together using parentheses and the comma operator, e.g. `a -> (console.log(a), a+1)`, but you cannot put *statements* (such as `for(...) {...}`) into an arrow function. If you need statements, you should use the regular `function() {...}` syntax. 

@syntax calling-javascript
@summary Interfacing with plain Javascript code
@desc
  You can develop in StratifiedJS just like you would in conventional
  JavaScript.  StratifiedJS is mostly a superset of JavaScript, so most
  JavaScript programs should work just fine in StratifiedJS. You can
  also freely call JS code (such as your favorite UI libraries) from SJS
  and vice versa.

  Note that SJS when called from JS might not return what you expect. If
  the SJS function suspends while being called from JS, it will return
  a *continuation* object; not it's actual return value. That's the
  expected behaviour: Normal JS code cannot suspend and wait for the
  actual return value - this is one of the reasons for having SJS in the
  first place! See [this Google Groups post](https://groups.google.com/d/msg/oni-apollo/fXN-euKGhFA/0ajgeefzqfAJ) for a
  mechanism of getting normal JS code to wait for SJS functions.

  Currently, plain javascript code will not appear in
  SJS stack traces.

  You can embed plain JavaScript code within an .sjs file using the [::__js] syntax.
 
@syntax __js
@summary Embed javascript code
@desc
  You can embed plain javascript code inside SJS using the `__js` block
  and expression syntax:

      // block syntax
      __js {
        exports.foo = function() {
          // ...
        }
      }

      // expression syntax:
      [3,2,1].sort(__js (x,y) -> x-y)


  This is primarily used for low-level optimisations, similar
  to how `asm` blocks are used in C code. 

  Because `__js` blocks are limited in the same way as [::calling-javascript],
  you should use them only when you have determined the code will still
  function correctly without SJS features, and that the frequency of its
  use makes the speed improvement worth the reduced debuggability.

  It is advisable to wrap only complete functions as `__js`. If you wrap code inside
  an sjs function, note that some control flow features (most notably 
  `return` and `throw`) will not work as expected from inside the `__js` code.

  ### SJS features supported in __js code

  The code inside a `__js`
  block will be reproduced as-is into the compiled JS, so it only has access to some of  SJS's 'language sugaring' features. But it will
  also avoid any overhead imposed by the SJS runtime.

  The following SJS features *are* supported in __js:

  * [::arrow-function]
  * [::string-interpolation]
  * [::binary-conditional]
  * [::double-dot]
  * [::double-colon]
  * [::quasi-quote], provided the SJS runtime is present
  * [::destructure], but only in function argument lists
  * [::blocklambda], but no `return` or `break` statements are allowed in the blocklambda body

@syntax binary-conditional
@summary Binary version of the ternary conditional operator `?:`
@desc
  The ternary conditional operator in JavaScript takes the form `x ? y : z`:

      var val = x ? y : z;
      
      // equivalent to:
      var val;
      if (x) val = y;
      else   val = z;

  In SJS code, the ` : z` part may be omitted, in which case `undefined` is assumed.
  So `x ? y` is equivalent to `x ? y : undefined`.

*/
