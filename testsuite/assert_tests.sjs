var {context, test, assert} = require("sjs:test/suite");
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


context("ok") {||
  test("succeeds") {||
    assert.ok(true);
    assert.notOk(false);
  }

  test("fails") {||
    var err;

    err = assert.catchError(-> assert.ok(false));
    if(!err) throw new Error("assertion not thrown");

    err = assert.catchError(-> assert.falsy(true));
    if(!err) throw new Error("assertion not thrown");
  }
}

context("eq") {||
  context("succeeds") {||
    test("for numbers") {||
      assert.eq(1,1);
      assert.eq(-34, -34);
    }

    test("for complex JSON objects") {||
      assert.eq(
        {foo: {bar: [1,2,3, {x: "y"}]}},
        {foo: {bar: [1,2,3, {x: "y"}]}});
    }

    test("for custom types") {||
    }
    test('for nested nulls') {||
      assert.eq([ null, null, null ], [ null, null, null ]);
    }

    test('on cyclic objects') {||
      var sub = { one: { two: { three: null } } };
      sub.one.two.three = sub;

      assert.eq({a: sub}, {a: sub});
    }

    test("comparing a string literal to string object") {||
      var so = (function() { return this; }).call("string!");
      assert.eq(so, "string!");
    }

  }

  context("fails") {||
    test("when types differ") {||
      assert.raises(
        {message: "Expected 1, got '1'\n[expected is a Number, actual is a String]"},
        -> assert.eq("1", 1));
    }

    test("comparing arrays to objects") {||
      assert.raises(
        {message:/expected is a Object, actual is a Array/},
        -> assert.eq(["one", "two"], {0: "one", 1: "two"}));
    }

    test("comparing arrays with different elements") {||
      assert.raises(
        {message:/objects differ at property '1'/},
        -> assert.eq(["one", "two"], ["one", "three"]));
    }

    test("comparing arrays with different sizes") {||
      assert.raises(
        {message:/expected has 2 elements, actual has 3/},
        -> assert.eq(["one", "two", "three"], ["one", "three"]));
    }

    test("comparing different types") {||
      function Foo () {this.x = 1};
      function Bar () {this.x = 1};
      assert.raises({message: /prototypes differ/}, -> assert.eq(new Foo(), new Bar()));
    }

    test('on different cyclic objects') {||
      var sub1 = { one: { two: { three: null } } };
      var sub2= { one: { two: { three: null } } };
      sub1.one.two.three = sub1;
      sub2.one.two.three = sub2;

      assert.eq({a: sub1}, {a: sub2});
    }

    context("descriptive error messages") {||
      test("different property names") {||
        assert.raises(
          {message:/properties differ/},
          -> assert.eq({foo: 1}, {bar:1}));
      }

      test("different property count") {||
        assert.raises(
          {message:/properties differ/},
          -> assert.eq({}, {foo: 1, bar:2}));
      }

      test("different (nested) property values") {||
        assert.raises(
          {message: /objects differ at property 'foo\.2'\]$/},
          -> assert.eq({foo: {0: 0, 1:1, 2:"two"}}, {foo: {0: 0, 1:1, 2:"2"}}));
      }

      test("different (nested) property value types") {||
        assert.raises(
          {message: /\[objects differ at property 'foo.2': expected is a Number, actual is a String\]/},
          -> assert.eq({foo: [1,2,'3']}, {foo: [1,2,3]}));
      }
    }
  }
}


context("raises") {||
  var MyError = function(m) { this.message = m || "MyError"; };
  MyError.prototype = new Error();

  var MyErrorSubclass = function() { MyError.apply(this, arguments); };
  MyErrorSubclass.prototype = new MyError();

  var noop = () -> null;
  var throwA = function(type, msg) {
    return function() { throw new type(msg); }
  }

  test("succeeds on error") {||
    shouldSucceed( -> assert.raises(throwA(Error)));
  }

  test("fails on no error") {||
    shouldFail( -> assert.raises(noop));
  }

  test("filters errors by type") {||
    shouldSucceed( -> assert.raises({inherits: MyError}, throwA(MyError)));
    shouldFail( -> assert.raises({inherits: MyError}, throwA(Error)));
    shouldFail( -> assert.raises({inherits: MyError}, noop));
  }

  test("filters errors inheriting the given type") {||
    shouldSucceed( -> assert.raises({inherits: MyError}, throwA(MyErrorSubclass)));
    shouldFail( -> assert.raises({inherits: MyError}, throwA(Error)));
    shouldFail( -> assert.raises({inherits: MyError}, noop));
  }

  test("filters errors inheriting the given prototype") {||
    shouldSucceed( -> assert.raises({inherits: MyError.prototype}, throwA(MyError)));
    shouldSucceed( -> assert.raises({inherits: MyError.prototype}, throwA(MyErrorSubclass)));
    shouldFail( -> assert.raises({inherits: MyError.prototype}, throwA(Error)));
    shouldFail( -> assert.raises({inherits: MyError.prototype}, noop));
  }

  test("filters errors by message") {||
    shouldSucceed( -> assert.raises({message: "specific" }, throwA(MyError, "specific")));
    shouldFail( -> assert.raises({message: "spec" }, throwA(MyError, "specific")));
    shouldFail( -> assert.raises({message: "specific" }, throwA(MyError)));
  }

  test("filters errors by message regex") {||
    shouldSucceed( -> assert.raises({message: /peCIF/i}, throwA(MyError, "specific")));
    shouldFail( -> assert.raises({message: /peCIF/i }, throwA(MyError)));
  }

  test("filters errors by predicate") {||
    shouldSucceed( -> assert.raises({filter: (e) -> e.message == "specific" }, throwA(MyError, "specific")));
    shouldFail( -> assert.raises({filter: (e) -> e.message == "specific" }, throwA(MyError, "generic")));
  }

  test("filters errors on multiple conditions") {||
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
  }


  test("includes description in thrown error") {||
    var msg = "badness failed to ensue";
    try {
      assert.raises({desc: msg}, throwA(MyError, "specific"));
    } catch(e) {
      assert.eq(e.message, "Nothing raised (badness failed to ensue)");
    }
  }

  test("fails on invalid option") {||
    var ran_block = false;
    try {
      assert.raises({someOpt: true}, function() { ran_block = true; });
    } catch(e) {
      assert.eq(e.message, "Unknown option: someOpt");
      assert.falsy(ran_block, "assert.raises ran the provided block");
    }
  }
}

context("AssertionError") {||
  test("error message") {||
    assert.eq(new assert.AssertionError("err").message, "err");
  }

  test("error message with description") {||
    assert.eq(new assert.AssertionError("err", "desc").message, "err (desc)");
  }
}

context("catchError") {||
  test("returns error") {||
    var err = new Error("e!");
    assert.eq(assert.catchError() {||
      throw err;
    }, err);
  }
  test("returns null for no error") {||
    assert.eq(assert.catchError(-> true), null);
  }
}

context("atomic") {||
  test("succeeds for an atomic function") {||
    var fn = -> null;
    assert.atomic("desc", fn);
    assert.atomic(fn);
  }

  test("fails for a suspending function") {||
    var fn = function() {
      hold(0);
      return null;
    }

    assert.raises({message: "Function is not atomic (desc)"}, -> assert.atomic("desc", fn));
    assert.raises({message: "Function is not atomic"}, -> assert.atomic(fn));
  }
}
