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

  If one of the branches exists prematurely (e.g. via a `return` or exception) while the other one is suspended,
  the suspended branch will be cancelled. See the sections on "Cancellation" and "Handling retraction" on the [../#language/::] page for more details.

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

  See the sections on "Cancellation" and "Handling retraction" on the [../#language/::] page for more details.

  One scenario where waitfor/or composition is helpful is to add timeouts:


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

@syntax waitfor-while
@summary Execute two code paths with one controlled by the other
@desc
  Conceptually, waitfor/while performs 'asymmetric concurrency composition', where
  the 'while'-branch "controls" the lifetime of the 'waitfor'-branch.
  waitfor/while offers the immensely useful guarantee that the 'waitfor'-branch will never 
  be aborted before the 'while' branch. This means that finalization code in an aborted 
  'waitfor'-branch can rely on the fact that the 'while'-branch's finalization code has 
  fully completed.

  The code

       waitfor { A; } while { B; }

  is similar to:
   
       waitfor { A; hold(); } or { B; }

  However, the big difference is that in the waitfor/while snippet, if the code is aborted
  from the outside and `A` and `B` are still running, first `B` will be aborted
  and then `A`. In the waitfor/or snippet, abortion of `A` and `B` would be triggered simultaneously. 

  

  The basic `waitfor/while` syntax is:

       waitfor {
         ... some code ...
       }
       while {
         ... some other code ...
       }
       ... next code ...

  This code executes `some code` until it finishes or suspends. It then 
  executes `some other code` until the latter finishes or suspends.

  If `some code` is not finished when `some other code` finishes, `some code`
  will be aborted. 
   
  Only when both `some code` and `some other code` have finished, execution
  will proceed with `next code`.

  Aborting a waitfor/while has the effect of aborting `... some other code ...`, 
  which in turn - once finished - aborts `... some code ...` if the latter hasn't 
  finished yet.

  If one of the branches exists prematurely (e.g. via a `return` or exception) while the other one is suspended,
  the suspended branch will be cancelled. See the sections on "Cancellation" and "Handling retraction" on the [../#language/::] page for more details.

  `waitfor/while` can only take 2 clauses, but optional catch/retract/finally clauses (like `try`). The full syntax is:

      waitfor *block1* while *block2*
      [ catch(e) *catch_block* ]
      [ retract *retract_block* ]
      [ finally *finally_block* ]



@syntax try-catch-retract-finally
@summary Controlflow interception
@desc
  SJS provides a `try{}catch(e){}retract{}finally{}` construct to
  intercept controlflow.
  At least one of the `catch`,`retract` or `finally` clauses needs to be present.
  When specifying multiple clauses, they need to appear in the order given above.

  ### catch(e){}
  `catch(e){}` is invoked when an exception is thrown from within the `try{}` clause. The exception `e` will not be propagated up the callstack unless rethrown from within the `catch` clause. 

  ### retract{}
  The `retract` clauses "catches" cancellation of the current stratum. E.g.
  in the following code, `foo` will be retracted after 1 second and 
  the `retract` clause will be invoked:

      function foo() {
        try {
          console.log("long running code...");
          hold(1000000);
        }
        retract {
          console.log("retract clause invoked!");
          hold(10000);
          console.log("retract done");
        }
      }

      waitfor {
        foo();
      }
      or {
        hold(1000); // 1 second
        console.log('timeout');
      }
      console.log("all done");

  The cancellation path is always synchronous: The code that caused the cancellation will only resume once all `retract` and `finally` clauses
  along the cancelled callstack have completed. E.g. in the above example,
  `console.log("done")` will only be executed once the `retract` clause is 
  finished.
  The output of the code above will be:

      long running code...
      // after one second:
      timeout
      retract clause invoked!
      // after ten seconds:
      retract done
      all done
  
  ### finally{}

  The `finally{}` clause will be invoked whenever controlflow leaves the `try` 
  clause (and when it has passed all `catch` and `retract` clauses).
  
  *Any* controlflow will pass through `finally{}`, i.e. the `finally{}` clause
  will be executed whether a `try{}` clause is exited normally (sequentially,
  by `return`, or by `break`), by exception, or by cancellation.

  Code running in `finally{}` clauses **is not abortable** (unlike code running in a `catch(e){}`). E.g. in the following 
  code, the cancellation induced by the waitfor/or will have no effect until 
  the `hold(10);` line:

      function foo() {
        try {
          console.log('done with try');
        }
        finally {
          console.log('finally invoked');
          hold(10000); // wait ten seconds
          console.log('finally finished');
        }
        console.log('after finally');
        hold(10);
        console.log('not reached');
      }

      waitfor {
        foo();
      }
      or {
        hold(1000);
        console.log('timeout');
      }
      console.log('all done');

  The output of this code will be:

      done with try
      finally invoked
      // after one second:
      timeout
      // after ten seconds:
      finally finished
      after finally
      all done

  Note in particular that the line `console.log('after finally')` will be 
  executed, even though `foo()` has been aborted by that point. This is 
  because the code within the `finally{}` clause is not abortable. Abortion
  will only take effect at the first suspension point that is encountered, which
  in the example is the `hold(10)`.

  ** Amended `finally(c) {}` clause **

  For internal use (in the conductance
  bridge code), SJS contains an 'amended' form of the `finally` clause which,
  similar to a `catch(e) {}` clause, takes an argument. For more information
  on the argument format and the semantics, see unit/controlflow-tests.sjs in
  the SJS testsuite.


  ### Syntax shorthand

  As a shorthand, `catch`, `retract`, and `finally` clauses can be appended directly to a [::waitfor-and], [::waitfor-or], [::waitfor-while], or [::waitfor-resume], without having to wrap the statements in a `try` clause.

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

@syntax reifiedStratum
@summary Stratum object for the current function
@desc
   * `reifiedStratum` returns the [./builtins::Stratum] object for the current function.
   * `reifiedStratum` is not available within [::arrow-function]s or from the top-level of a script. Usage of the primitive in these contexts generates an exception.


@syntax destructure
@summary Assign multiple variables from a single expression
@desc

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

  Please see the [destructuring docs at mozilla.org](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) for full syntax details.

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

  ### Motivation

  Blocklambdas are a generalization of the block syntax of SJS's builtin primitives (conditional statements, loops, function bodies, etc.) that overcome some of the limitations of conventional callback functions. They play a central part in SJS and are used ideomatically in many settings, mainly with 
  [../sequence::Sequence]s and [../service::Service]s.

  As an illustration of the problem with conventional callbacks, assume we have some complex 
  datastructure and want to write a function that iterates over it, executing a piece of code
  for each element of the datastructure:

      function iterate(code) {
         ... for each element x in the datastructure call code(x) ...
      }

  This works fine with `code` being a conventional callback function as long as we want to 
  iterate over ALL elements of the datastructure, e.g.:

      iterate(function(x) { console.log(x); })

  But let's assume we only want to iterate until we find some particular element and then return
  that element. We would have to implement special logic in `iterate` to propagate some returns and 
  not others, e.g.:

      function iterate(code) {
         ... for each element x call rv = code(x) ...
         if (rv !== undefined) return rv;
         else ... continue iterating ...
      }
      
      ...

      iterate(function(x) { if (x === item_to_find) return x; })

  Another possibility that wouldn't require any special logic inside `iterate` would be to 
  designate a special exception thrown by `code` as a "return":

      var rv;
      try {
      }
      catch(e) {
        if (e.type === 'return')
          rv = e.rv;
        else throw e;
      }

      ...

      iterate(function(x) { if (x === item_to_find) throw {type: 'return', rv: x }; }

  Neither of these two approaches are particularly appealing. With blocklambdas we can regain the
  functionality of `break`, `return` and `continue` in a callback setting:

      function iterate(code) {
         ... for each element x in the datastructure call code(x) ...
      }

      ...
      
      function foo() {
        iterate { 
          |x| 
          if (x === item_to_find) 
            return x; // <-- exits foo with return value x
         }
         return 'item_not_found';
       }

       ...
      
       function foo() {
         iterate {
           |x|
           if (x === item_to_find)
             break; // <-- bails out of iterate
         }
         ... continue here ...
       }
        

  ### Syntax

  Blocklambdas have the following structure:

      {
        |argument_list|
        statements...
      }

  Here, `argument_list` has the same syntax as the argument list for a normal function (i.e. it can
  use destructuring, rest parameters, etc.

  Blocklambda can only be used in function calls, e.g.:
  
      some_function({ |...| ...});

      arr[idx]({ |...| ...});

      foo.bar(x,y, { |...| ... }, z, { |...| ... }, ...);


  As a shorthand, if the blocklambda is the only argument of the function call, it does not need to
  be placed in parentheses:
      
      some_function { |...| ...}; // equivalent to some_function({ |...| ...});

  As a variation of this shorthand, if `some_function` takes more than one argument, 
  with the final one being a blocklambda, that blocklambda can be placed _behind_ the parenthesized
  areguments list:

      some_function(a,b,c) { |...| ...} // equivalent to some_function(a,b,c,{|...|...});
      
      foo.bar(x,y) { |...| ...} // equivalent to foo.bar(x,y,{|...| ...})

  
  ### Semantics

  As stated above, blocklambdas can only be used in a function call. This function call is called
  a blocklambda's __anchor__.

  To the anchor function, the blocklambda looks like a conventional callback function:

      function log_type(bl) {
        console.log(typeof bl); // -> "function"
      }

      log_type { || }

  `break` can be used inside the blocklambda to bail out of the anchor function call:

      function count(cb) {
        var i=0;
        while (true)
          cb(++i);
      }

      count {
        |x|
        if (x > 10) break;
        console.log(x);
      }
      console.log('done');
      // logs 1,2,3,4,5,6,7,8,9,10,done
  
  `return` exits the function context _surrounding_ the anchor call. If there is no function context 
  (i.e. the blocklambda call is performed from the top-level of a script), `return` will throw an 
  exception.

      function forever(bl) {
        while (true) {
          bl();
        }
      }

      function countdown(cb) {
        var i=10;
        forever {
          ||
          console.log(i);
          if (--i == 0) return 'liftoff';
        }
      }

      var result = countdown(); 
      // logs 10,9,8,7,6,5,4,3,2,1 and assigns 'liftoff' to result.

  Both `break` and `return` retract the anchor call and any other calls that might be between the
  blocklambda call and the anchor call:

      function inner(cb) { 
        try {
          cb();
        }
        retract {
          console.log('inner retract');
        }
      }

      function outer(cb) {
        try {
          inner(cb);
        }
        retract {
          console.log('outer retract');
        }
      }

      outer { || console.log('breaking'); break; }
      console.log('done');
      // logs 'breaking', 'inner retract', 'outer retract', 'done'

  There is no way for a blocklambda to return a value to its anchor call. When executing a blocklambda,
  the anchor function will either see an 'undefined' return value, an exception thrown by the 
  blocklambda, or be retracted.

  Calling a blocklambda when its anchor call is not active any longer throws an exception:

      var cb;
      function defer(_cb) { cb = _cb }

      defer { || console.log('blocklambda') };
      cb(); // <--- throws "Blocklambda anchor inactive" exception


  Other features of blocklambdas:

  - `continue` can be used to skip the remainder of the blocklambda.
  - The `this` binding of the surrounding code is maintained inside the blocklambda.
  - `reifiedStratum` inside a blocklambda returns the [./builtins::Stratum] of the enclosing function
    context - if there is no enclosing function context, usage of `reifiedStratum` causes an exception to be thrown.

  ### Unroutable blocklambda returns and breaks

  As long as the anchor call is still active, blocklambdas can be called from strata that are not 
  rooted in the anchor call, e.g. via [../sys::spawn]. 
  However, in this case there will not be a path back to the anchor call, and any `return` or `break` 
  performed in the blocklambda will throw an "Unroutable blocklambda break/return" exception.

  The same consideration applies when manipulating the callstack parent chain via [./builtins::Stratum::adopt]: If at the initiation of a blocklamda `break` or `return`, the anchor call is unreachable, an
  exception will be thrown. Furthermore, if the anchor call _becomes_ unreachable during traversal
  of the callstack (e.g. by modifying the callstack in an upstream `finally` clause with 
  [./builtins::Stratum::adopt]), an exception will be thrown at that point.

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
  Arrow syntax is a shorthand for a function that only consists of a single expression and which returns the result of this expression.
  For example:

      var add = (x, y) -> x + y;
      // equivalent to:
      var add = function(x, y) { return x + y; };

  In contrast to JS, StratifiedJS has two versions of arrow functions, and the syntax is slightly
  different:

  * The 'thin arrow' version (`->`) has its own 'this' object.
  * The 'fat arrow' version (`=>`) binds 'this' from its enclosing context.
  * In contrast to JS, arrow functions in SJS have an 'arguments' object defined.
  * The parentheses around the argument list are optional in the case of zero or one arguments, so the following are valid:

      var addOne = x -> x + 1;
      var returnOne = -> 1;

  * In contrast to JS, the body of arrow functions in SJS always has to be an _expression_ and 
    cannot be a block. Any `{...}` is interpreted
    as object literal syntax (and does not need to be parenthesized like in JS):

        // this SJS code:
        () => {a:1}; // returns an object {a:1}
        // is equivalent to this JS code:
        () => ({a:1}); // returns an object {a:1}
        // and NOT this JS code:
        () => {a:1}; // executes a block with an 'a' labeled expression '1' and return undefined

  * [::reifiedStratum] cannot be used inside arrow functions.

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


  This is primarily used for low-level optimizations, similar
  to how `asm` blocks are used in C code. 

  Because `__js` blocks are limited in the same way as [::calling-javascript],
  you should use them only when you have determined the code will still
  function correctly without SJS concurrency orchestration features, 
  and that the frequency of its use makes the speed improvement worth 
  the reduced debuggability.

  It is advisable to wrap only complete functions as `__js`. If you wrap code inside
  an sjs function, note that some control flow features (most notably 
  `return` and `throw`) will not work as expected from inside the `__js` code.

  ### JS features supported in __js code

  The code inside a `__js` block will be parsed by the SJS engine, so it only
  supports the features of JavaScript that are also present in SJS (see 'Base language' under [sjs:#language/::]). In addition, some SJS syntax features are supported (see below).

  See also [::__raw_until] for a mechanism to embed any raw content in an SJS file (including JS with syntax features that are not supported in `__js`).

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

@syntax __raw_until
@summary Embed raw (unparsed) code
@desc
  `__raw_until` is used to embed unparsed code in an SJS file:

      __raw_until END_TOKEN
      ... unparsed content ...
      END_TOKEN
       
  Here, `END_TOKEN` is any character stream that does not contain spaces or newlines.

  Similar to [::__js], `__raw_until` is primarily used for low-level optimizations. 
  Unlike [::__js], the content defined in the `__raw_until` construct is not 
  parsed by the SJS engine. Therefore it can e.g. be used to defined 
  functions that make use of language features that don't form part of SJS.
  E.g.:

      __raw_until %%%
      function* generator() {
        var i=0;
        while (true) yield ++i;
      }
      %%%

  Note that because the SJS engine doesn't parse the raw content and 
  thus cannot infer anything about its internal structure, the raw content cannot
  be spliced into the output of an SJS file at arbitrary locations: Much like 
  variable and function declarations are hoisted to the top of a module or function, raw content will be moved to the top of the current module (if at top-level scope) or the closest enclosing function. E.g. the following code (somewhat counter-intuitively) produces the output `'first', 'second'`:

      console.log('second');
      __raw_until &^*xx
      console.log('first');
      &^*xx

  Therefore, as a matter of style, `__raw_until` should only be used for declarations (which would be hoisted anyway), or be added to the top of a module or function only.


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

@syntax dfunc
@summary Decontextualized function expressions
@desc
  A 'dfunc' denotes a specialized function expression that is isolated from its lexical environment,
  meaning it lacks access to variables and context of its defining scope unless explicitly passed in.
  This detachment makes dfuncs transportable, allowing them to be transmitted across networks, 
  executed remotely, or stored in databases, unlike traditional functions that are bound to
  their closures. 

  Dfuncs are similar to functions created with the `new Function` constructor, but they employ 
  regular non-quoted syntax for defining the body, thereby enhancing readability, debugging, and 
  maintainability by facilitating syntax highlighting and static analysis, which are hindered 
  when code is defined within a string. Additionally, dfuncs establish a closure through code
  executed during their first invocation. Symbols defined in this closure will be private to the 
  dfunc and not be seen in the global scope (or any other scope).

  See also [sjs:vmbridge::withVMBridge].

  ### Syntax

  Dfuncs are defined using two syntax variations: `@{ DFUNC_BODY }` for a context-isolated version, 
  and `@(x1, x2, ...) { DFUNC_BODY }` for importing specific variables from the surrounding 
  lexical scope. 
  Inside `DFUNC_BODY`, you can include arbitrary code which gets executed during the initial call 
  to the dfunc, effectively serving as the closure for the dfunc.
  This code must ultimately yield a function definition. 
  Both on the first invocation and on subsequent calls, the dfunc executes this resulting function.
   
  ### Examples

      // simple usage:
      remote_data.sort(@{ (x,y) -> x-y });

      // symbols from the environment can be explicitly imported into a dfunc:
      var DISTANCE = 0.3;
      var is_close = @(DISTANCE) { (x,y) -> Math.abs(x-y)<DISTANCE };

      // setting up an environment in the dfunc body:
      var ANCHOR = 10;
      var filter_close = @(is_close, ANCHOR) {
        @ = require('sjs:sequence'); // will be executed once
        seq -> seq  .. @filter(x -> is_close(x,ANCHOR));
      };

      // keeping state in the dfunc's closure:
      var count_invocations = @{
        var counter = 0; // counter is private to the dfunc
        (function() { 
          console.log(++counter + " calls made to count_invocations");
         });
      };



*/
