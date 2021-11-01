var suite = require("sjs:test/suite");
var {context, test, assert} = suite;
var {toArray} = require("sjs:sequence");

var shouldFail = function(f) {
  try {
    f();
  } catch(e) {
    if (e instanceof assert.AssertionError) {
      // it failed
      return e;
    }
  }
  throw new assert.AssertionError("expected function to fail, but it didn't");
}

var shouldSucceed = function(f) {
  try {
    f();
  } catch(e) {
    throw new assert.AssertionError("expected function to succeed, but it failed with error: " + e);
  }
}


context("ok", function() {
  test("succeeds", function() {
    assert.ok(true);
    assert.notOk(false);
  })

  test("fails", function() {
    var err;

    err = assert.catchError(-> assert.ok(false));
    if(!err) throw new Error("assertion not thrown");

    err = assert.catchError(-> assert.falsy(true));
    if(!err) throw new Error("assertion not thrown");
  })
})

context("eq", function() {
  context("succeeds", function() {
    test("for numbers", function() {
      assert.eq(1,1);
      assert.eq(-34, -34);
    })

    test("for complex JSON objects", function() {
      assert.eq(
        {foo: {bar: [1,2,3, {x: "y"}]}},
        {foo: {bar: [1,2,3, {x: "y"}]}});
    })

    test("for custom types", function() {
      var Foo = function() {
        this.x = 1;
      }
      Foo.prototype.y = 2;
      assert.eq(new Foo(), new Foo());
    })

    test('for nested nulls', function() {
      assert.eq([ null, null, null ], [ null, null, null ]);
    })

    test('on cyclic objects', function() {
      var sub = { one: { two: { three: null } } };
      sub.one.two.three = sub;

      assert.eq({a: sub}, {a: sub});
    })

    test("comparing a string literal to string object", function() {
      var so = (function() { return this; }).call("string!");
      assert.eq(so, "string!");
    })

  })

  context("fails", function() {
    test("when types differ", function() {
      assert.raises(
        {message: "Expected 1, got '1'\n[expected is a Number, actual is a String]"},
        -> assert.eq("1", 1));
    })

    // this used to throw 'Cannot create property '1' on boolean 'false' due to a return
    // value bug in sjs:compare::eq:
    test("nested null vs undefined", function() {
      assert.raises(
        {message: 'Expected { foo: null }, got { foo: undefined }\n[objects differ at property `foo`]'},
        -> assert.eq({foo:undefined}, {foo:null}));
    })

    context("custom types", function() {
      var Foo = function() {
        this.x = 1;
      }
      Foo.prototype.y = 2;

      var Bar = function(x) {
        this.x = x;
      }
      Bar.prototype.y = 2;

      var FooBar = function(x) {
        this.x = x;
      }
      FooBar.prototype = new Foo();


      test("differ", function() {
        assert.raises(
          {message: /\[prototypes differ\]/},
          -> assert.eq(new Foo(), new Bar(1)));

        assert.raises(
          {message: /\[objects differ at property `x`\]/},
          -> assert.eq(new Bar(1), new Bar(2)));
      })

      test("differ by inheritance", function() {
        assert.raises(
          {message: /\[prototypes differ\]/},
          -> assert.eq(new Foo(), new FooBar(1)));

        assert.raises(
          {message: /\[objects differ at property `x`\]/},
          -> assert.eq(new FooBar(1), new FooBar(2)));
      }).skipIf(suite.isIE() && suite.ieVersion() < 9, "requires native support for getPrototypeOf()");
    })

    test("comparing arrays to objects", function() {
      assert.raises(
        {message:/expected is a Object, actual is a Array/},
        -> assert.eq(["one", "two"], {0: "one", 1: "two"}));
    })

    test("comparing arrays with different elements", function() {
      assert.raises(
        {message:/objects differ at index `1`/},
        -> assert.eq(["one", "two"], ["one", "three"]));
    })

    test("comparing arrays with different sizes", function() {
      assert.raises(
        {message:/expected has 2 elements, actual has 3/},
        -> assert.eq(["one", "two", "three"], ["one", "three"]));
    })

    test("typed array comparison", function() {
      assert.eq(
          new Uint8Array([1,2,3]),
          new Uint8Array([1,2,3])
      );

      assert.raises(
        {message:/objects differ at index `2`/},
        -> assert.eq(
          new Uint8Array([1,2,3]),
          new Uint8Array([1,2,4])
        )
      );

      assert.raises(
        {message:/expected is a Int8Array, actual is a Uint8Array/},
        -> assert.eq(
          new Uint8Array([1,2,3]),
          new Int8Array([1,2,4])
        )
      );
    })

    context("comparing buffers", function() {
      test("against other kinds of buffers", function() {
        // Buffers and SlowBuffers are different types, but should be treated the same.
        var sb = new (require('nodejs:buffer').SlowBuffer)(4);
        var ch = '1'.charCodeAt(0);
        sb[0] = ch++;
        sb[1] = ch++;
        sb[2] = ch++;
        sb[3] = ch++;
        assert.eq(Buffer.from("1234"), sb);
      })

      test("against slices", function() {
        assert.eq(Buffer.from("1234"), Buffer.from("__1234__").slice(2, 6));
      })

      test("with different contents", function() {
        assert.raises(
          {message:/objects differ at index `6`/},
          -> assert.eq(Buffer.from("12345678"), Buffer.from("123456xx")));
      })

      test("with different length", function() {
        assert.raises(
          {message:/expected has 1 elements, actual has 4/},
          -> assert.eq(Buffer.from("1234"), Buffer.from("1")));
      })

      test("against other objects", function() {
        assert.raises(
          {message:/expected is a Array, actual is a Buffer/},
          -> assert.eq(Buffer.from([1,2,3,4]), [1,2,3,4]));

        assert.raises(
          {message:/expected is a Object, actual is a Buffer/},
          -> assert.eq(Buffer.from([1,2,3,4]), {length: 4, 0:1, 1:2, 2:3, 3:4}));
      })
    }).serverOnly();

    test("comparing different types", function() {
      function Foo () {this.x = 1};
      function Bar () {this.x = 1};
      assert.raises({message: /prototypes differ/}, -> assert.eq(new Foo(), new Bar()));
    })

    test('on different cyclic objects', function() {
      var sub1 = { one: { two: { three: null } } };
      var sub2= { one: { two: { three: null } } };
      sub1.one.two.three = sub1;
      sub2.one.two.three = sub2;

      assert.eq({a: sub1}, {a: sub2});
    })

    context("descriptive error messages", function() {
      test("different property names", function() {
        assert.raises(
          {message:/properties differ/},
          -> assert.eq({foo: 1}, {bar:1}));
      })

      test("different property count", function() {
        assert.raises(
          {message:/properties differ/},
          -> assert.eq({}, {foo: 1, bar:2}));
      })

      test("different (nested) property values", function() {
        assert.raises(
          {message: /objects differ at property `foo\.2`\]$/},
          -> assert.eq({foo: {0: 0, 1:1, 2:"two"}}, {foo: {0: 0, 1:1, 2:"2"}}));
      })

      test("different (nested) property value types", function() {
        assert.raises(
          {message: /\[objects differ at property `foo\[2\]`: expected is a Number, actual is a String\]/},
          -> assert.eq({foo: [1,2,'3']}, {foo: [1,2,3]}));
      })
    })
  })
  test("notEq", function() {
    assert.notEq(1, 2);
    assert.raises(
      {message: "Arguments are equal: { a: 1 }"},
      -> assert.notEq({a:1}, {a:1}));
  })
})


context("shallow equality", function() {
  test("shallowEq", function() {
    var child = {b:1};
    var childClone = {b:1};
    assert.raises(
      {message: "Expected { a: { b: 1 } }, got { a: { b: 1 } }\n" +
          "[objects differ at property `a`]"},
      -> assert.shallowEq({a:child}, {a:childClone}));

    assert.shallowEq({a:child}, {a:child});
  })
 
  test("notShallowEq", function() {
    assert.notShallowEq(1, 2);
    assert.notShallowEq({a: [1,2,3]}, {a: [1,2,3]});
    assert.raises(
      {message: "Arguments are equal: { a: 1 }"},
      -> assert.notShallowEq({a:1}, {a:1}));
  })
})

context("contains", function() {
  test("contains", function() {
    var arr = [0, {x:1}, 2];

    assert.contains(arr, arr[1]);
    assert.contains(arr, {x:1});
    assert.raises(
      {message: "[ 0, { x: 1 }, 2 ] does not contain { x: 2 }"},
      -> assert.contains(arr, {x:2}));

    assert.contains("the lil string", "lil string");

    assert.raises(
      {message: "'the big string' does not contain 'lil string'"},
      -> assert.contains("the big string", "lil string"));
  })

  test("notContains", function() {
    var arr = [0, {x:1}, 2];

    assert.notContains(arr, {x:2});
    assert.raises(
      {message: "[ 0, { x: 1 }, 2 ] contains { x: 1 }"},
      -> assert.notContains(arr, {x:1}));

    assert.raises(
      {message: "[ 0, { x: 1 }, 2 ] contains { x: 1 }"},
      -> assert.notContains(arr, arr[1]));

    assert.raises(
      {message: "'the big string' contains 'g string'"},
      -> assert.notContains("the big string", "g string"));
  })
})

context("is", function() {
  test("uses ===", function() {
    assert.is(1, 1);

    assert.raises(
      {message: "Expected '1', got 1"},
      -> assert.is(1, '1'));

    assert.raises(
      {message: 'Expected {}, got {}'},
      -> assert.is({}, {}));
  })

  test("isNot", function() {
    assert.isNot(1, 2);
    assert.isNot({}, {});

    var same = {};
    assert.raises(
      {message: "Both arguments equal: {}"},
      -> assert.isNot(same, same));
  })
})

context("raises", function() {
  var MyError = function(m) { this.message = m || "MyError"; };
  MyError.prototype = new Error();

  var MyErrorSubclass = function() { MyError.apply(this, arguments); };
  MyErrorSubclass.prototype = new MyError();

  var noop = () -> null;
  var throwA = function(type, msg) {
    return function() { throw new type(msg); }
  }

  test("succeeds on error", function() {
    shouldSucceed( -> assert.raises(throwA(Error)));
  })

  test("fails on no error", function() {
    shouldFail( -> assert.raises(noop));
  })

  test("filters errors by type", function() {
    shouldSucceed( -> assert.raises({inherits: MyError}, throwA(MyError)));
    shouldFail( -> assert.raises({inherits: MyError}, throwA(Error)));
    shouldFail( -> assert.raises({inherits: MyError}, noop));
  })

  test("filters errors inheriting the given type", function() {
    shouldSucceed( -> assert.raises({inherits: MyError}, throwA(MyErrorSubclass)));
    shouldFail( -> assert.raises({inherits: MyError}, throwA(Error)));
    shouldFail( -> assert.raises({inherits: MyError}, noop));
  })

  test("filters errors inheriting the given prototype", function() {
    shouldSucceed( -> assert.raises({inherits: MyError.prototype}, throwA(MyError)));
    shouldSucceed( -> assert.raises({inherits: MyError.prototype}, throwA(MyErrorSubclass)));
    shouldFail( -> assert.raises({inherits: MyError.prototype}, throwA(Error)));
    shouldFail( -> assert.raises({inherits: MyError.prototype}, noop));
  })

  test("filters errors by message", function() {
    shouldSucceed( -> assert.raises({message: "specific" }, throwA(MyError, "specific")));
    shouldFail( -> assert.raises({message: "spec" }, throwA(MyError, "specific")));
    shouldFail( -> assert.raises({message: "specific" }, throwA(MyError)));
  })

  test("filters errors by message regex", function() {
    shouldSucceed( -> assert.raises({message: /peCIF/i}, throwA(MyError, "specific")));
    shouldFail( -> assert.raises({message: /peCIF/i }, throwA(MyError)));
  })

  test("filters errors by predicate", function() {
    shouldSucceed( -> assert.raises({filter: (e) -> e.message == "specific" }, throwA(MyError, "specific")));
    shouldFail( -> assert.raises({filter: (e) -> e.message == "specific" }, throwA(MyError, "generic")));
  })

  test("filters errors on multiple conditions", function() {
    var specific_instance = new MyErrorSubclass("specific");
    var opts = {
      inherits: MyError,
      message: "specific",
      filter: (err) -> err === specific_instance,
    };
      
    shouldSucceed( -> assert.raises(opts) {|| throw specific_instance });
    shouldFail( -> assert.raises(opts, noop));
    shouldFail( -> assert.raises(opts, throwA(MyErrorSubclass))); // fails message check
    shouldFail( -> assert.raises(opts, throwA(MyErrorSubclass, "specific"))); // fails filter
    shouldFail( -> assert.raises(opts, throwA(Error, "specific"))); // fails filter and inherits check
  })


  test("includes description in thrown error", function() {
    var msg = "badness failed to ensue";
    try {
      assert.raises({desc: msg}, throwA(MyError, "specific"));
    } catch(e) {
      assert.eq(e.message, "Nothing raised (badness failed to ensue)");
    }
  })

  test("fails on invalid option", function() {
    var ran_block = false;
    try {
      assert.raises({someOpt: true}, function() { ran_block = true; });
    } catch(e) {
      assert.eq(e.message, "Unknown option: someOpt");
      assert.falsy(ran_block, "assert.raises ran the provided block");
    }
  })
})

context("AssertionError", function() {
  test("error message", function() {
    assert.eq(new assert.AssertionError("err").message, "err");
  })

  test("error message with description", function() {
    assert.eq(new assert.AssertionError("err", "desc").message, "err (desc)");
  })

  test("error message with quasi description", function() {
    var msg = `the ${"object"} is: ${[1, "2", 3]}`;
    assert.eq(new assert.AssertionError("err", msg).message, "err (the object is: [ 1, '2', 3 ])");
  })
})

context("catchError", function() {
  test("returns error", function() {
    var err = new Error("e!");
    assert.eq(assert.catchError() {||
      throw err;
    }, err);
  })
  test("returns null for no error", function() {
    assert.eq(assert.catchError(-> true), null);
  })
})

context("atomic", function() {
  test("succeeds for an atomic function", function() {
    var fn = -> null;
    assert.atomic("desc", fn);
    assert.atomic(fn);
  })

  test("fails for a suspending function", function() {
    var fn = function() {
      hold(0);
      return null;
    }

    assert.raises({message: "Function is not atomic (desc)"}, -> assert.atomic("desc", fn));
    assert.raises({message: "Function is not atomic"}, -> assert.atomic(fn));
  })
})

context("suspends", function() {
  test("succeeds for a suspending function", function() {
    var fn = function() {
      hold(0);
      return null;
    }
    assert.suspends("desc", fn);
    assert.suspends(fn);
  })

  test("fails for an atomic function", function() {
    var fn = function() {
      return null;
    }

    assert.raises({message: "Function did not suspend (desc)"}, -> assert.suspends("desc", fn));
    assert.raises({message: "Function did not suspend"}, -> assert.suspends(fn));
  })
})

context("type checking", function() {
  test('by type name', function() {
    assert.string("foo");
    assert.number(23);
    assert.func(-> null);
    assert.bool(true);
    assert.object({});

    assert.raises({message: 'string required'}, -> assert.string(123));
    assert.raises({message: 'number required'}, -> assert.number('23'));
    assert.raises({message: 'function required'}, -> assert.func({}));
    assert.raises({message: 'boolean required'}, -> assert.bool(null));
    assert.raises({message: 'object required'}, -> assert.object('str'));

    assert.raises({message:'string required (mystr)'}, -> assert.string(123, 'mystr'));
  })

  test('arrayOf<Type>', function() {
    assert.arrayOfString(["foo"]);
    assert.raises({message:'[string] required (desc)'}, -> assert.arrayOfString(123, 'desc'));
    assert.raises({message:'[string] required'}, -> assert.arrayOfString(123));
    assert.raises({message:'string required'}, -> assert.arrayOfString([123]));
  })

  test('optional<Type>', function() {
    assert.optionalString("foo");
    assert.optionalString(undefined);
    assert.optionalString(null);

    assert.raises({message:'string required'}, -> assert.optionalString(123));
    assert.raises({message:'string required'}, -> assert.optionalString([123]));
  })

  test('optionalArrayOf<Type>', function() {
    assert.optionalArrayOfString(["foo"]);
    assert.optionalArrayOfString(undefined);
    assert.optionalArrayOfString(null);

    assert.raises({message:'[string] required'}, -> assert.optionalArrayOfString(123));
    assert.raises({message:'string required'}, -> assert.optionalArrayOfString([123]));
  })
})
