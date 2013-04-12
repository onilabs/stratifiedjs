var {context, test, assert} = require("sjs:test/suite");

context("ok") {||
  test("succeeds") {||
    assert.ok(true);
    assert.not_ok(false);
  }

  test("fails") {||
    var err;

    err = assert.catchError(-> assert.ok(false));
    if(!err) throw new Error("assertion not thrown");

    err = assert.catchError(-> assert.not_ok(true));
    if(!err) throw new Error("assertion not thrown");
  }
}

context("raises") {||
  test("succeeds on error") {||
    assert.catchError( -> assert.raises() {||
      throw new Error();
    }) .. assert.eq(null);
  }
  test("fails on no error") {||
    assert.catchError( -> assert.raises() {||
      // noop
    }) .. assert.ok();
  }
}

context("eq") {||
  context("succeeds") {||
    test("for numbers") {||
      assert.eq(1,1);
      assert.eq(-34, -34);
    }
  }

  context("fails") {||
    test("when types differ") {||
      assert.raises(-> assert.eq("1", 1));
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
