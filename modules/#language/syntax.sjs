/**
@summary StratifiedJS language syntax
@type doc

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
    logging.print("New user: #{name}");
    // prints: New user: [Object object]
    logging.print(`New user: ${name}`);
    // prints: New user: { first: "john", last: "smith" }

  The [sjs:quasi::] module provides functions for dealing with quasi-quote objects at runtime.

  ### Shorthand interpolation

  As shorthand, you can omit the `{}` braces when inserting single variables or calling a named functions:

   - `$variable_name`
   - `$method(args ...)`

   Note that this only works for single-word variables and functions - you cannot use this shorthand for
   dotted properties like `$foo.bar` or `$str.trim()`.


@syntax double-dot
@summary Function chaining operator
@desc

  *created for SJS; although we later discovered [elixir](http://elixir-lang.org/)'s `|>` pipe operator was created independently with the same functionality*
  
  The double-dot operator allows you to chain together expressions in a similar way to how the regular dot operator is often used to create [fluent interfaces](http://en.wikipedia.org/wiki/Fluent_interface), but without requiring any object-oriented wrappers. You can think of it like the pipe operator in UNIX shells, allowing you to 'pipe' the result of one expression into another function, resulting in expressions that are much easier to read and write than standard parenthesized expressions.
  
  When used, the expression on its left-hand side is passed as the first argument to the function call on its right-hand side. So the expression `a .. b(c)` gets rewritten to `b(a, c)`. For a concrete example, many of the functions in the `sjs:sequence` module are intended to be used with the double-dot operator:
  

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


  Since the double-dot can only appear to the left of a function call, the compiler will treat the right-hand side as a function call even if you leave out the parentheses (which will only make sense for a function taking only one argument):


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



  Here, `someFunction` will be called with three arguments - `argument1`, `argument2` and a function object that will execute block_body when called. Even though the blocklamda is 'tacked on' to the `someFunction(argument1, argument2)` call it will be appended to  `someFunction`'s argument list. (I.e. it will effectively be 'pulled under' the parenthesis.)

  Blocklambdas are not just shorthand for `function() { ... }` syntax. They have important semantic differences:


  - The `this` binding of the surrounding code is maintained inside the blocklambda 
  - A `return` statement inside a blocklambda will return from the enclosing scope, *not* just from the block. This also means that you can't return a value to the caller of a blocklambda (you should use a function if you need that).
  - A `break` statement inside a blocklambda will cause the function that called the blocklambda to return.
  - A `continue` statement inside a blocklambda will skip the rest of the bloclmabda body and return to the caller.


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


  The parenthesis around the argument list are optional in the case of zero or one arguments, so the following are also valid lambda expressions:

    var addOne = x -> x + 1;
    var returnOne = -> 1;


  **Note:** The body of an arrow function needs to be an *expression*. Multiple expressions can be chained together using parentheses and the comma operator, e.g. `a -> (console.log(a), a+1)`, but you cannot put *statements* (such as `for(...) {...}`) into an arrow function. If you need statements, you should use the regular `function() {...}` syntax. 


@syntax using
@summary Factoring out try/finally
@desc

  **Note:** The `using` keyword is currently under review. It might change semantics or be removed in future versions of StratifiedJS.


  Similar to Python's `with` statement
  ([PEP-0343](http://www.python.org/dev/peps/pep-0343/)), SJS has a `using`
  statement for factoring out standard uses of `try/finally`:

      using (context_manager) {
        ... some code ...
      }

  This code executes the code block `some code`. When `some code` is
  exited (either normally, by exception or by cancellation),
  `context_manager.__finally__()` will be called, if this function exists.


  I.e. the above code is equivalent to something like:


      try {
        ... some code ...
      }
      finally { 
        if (context_manager && 
            typeof context_manager.__finally__ == "function")
          context_manager.__finally__();
      }


  Example of an event loop in StratifiedJS:


      using (var q = require("sjs:events").Queue(window, "keydown")) {
        while(true) {
          switch (q.get().keyCode) {
            ...
          }
        }
      }

  (in practice, you would just use [events::when]).
 
*/
