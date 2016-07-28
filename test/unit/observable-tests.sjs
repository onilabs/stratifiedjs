@ = require('sjs:test/std');

@context("ObservableVar") {||
  @test("isStream") {||
    var a = @ObservableVar();
    @assert.eq(a .. @isStream, true);
  }
  @test("isObservableVar") {||
    var a = @ObservableVar();
    @assert.eq(a .. @isObservableVar, true);
  }

	@test("conflict") {||
		var a = @ObservableVar();
		@assert.raises({filter:@isConflictError}, function() {
			waitfor {
				a.modify(function() {
					hold(10);
					return 'new 1';
				});
			} and {
				hold(0);
				a.modify(function() {
					hold(10);
					return 'new 2';
				});
			}
		});
	}

	@test("observe multiple values at once") {||
		var log = [];
		var a = @ObservableVar("a0");
		var b = @ObservableVar("b0");
		var c = @ObservableVar("c0");

		waitfor {
			@observe(a, b, c, (a,b,c)->[a,b,c]) .. @each {|[_a, _b, _c]|
				log.push([_a, _b, _c]);
				if (_c === "c1") {
					break;
				}
			};
		} or {
			a.set("a1");
			c.set("c1");
			c.set("c2");
		}

		log .. @assert.eq([
			["a0", "b0", "c0"],
			["a1", "b0", "c0"],
			["a1", "b0", "c1"],
		]);
	}

	@test("combine multiple observables") {||
		var log = [];
		var a = @ObservableVar("a0");
		var b = @ObservableVar("b0");
		var c = @ObservableVar("c0");
		var obs = @observe(a,b,c, (a,b,c)->[a,b,c]);

		waitfor {
			obs .. @each {|[_a, _b, _c]|
				log.push([_a, _b, _c]);
				if (_c === "c1") {
					break;
				}
			};
		} or {
			a.set("a1");
			c.set("c1");
			c.set("c2");
		}

		log .. @assert.eq([
			["a0", "b0", "c0"],
			["a1", "b0", "c0"],
			["a1", "b0", "c1"],
		]);
	}

	@test("only ever skips intermediate events events when observing") {||
		var log = [];
		var a = @ObservableVar("a0");

		waitfor {
			a .. @each {|val|
				hold(10);
				log.push(val);
			}
		} or {
			a.set("a1");
			a.set("a2");
			a.set("a3");
			a.set("a4");
			hold(100);
		}

		log .. @assert.eq(["a0","a4"]);
	}
}.timeout(2);

@context("observe") {||
	@test("emits initial value") {||
		var log = [];
		var a = @ObservableVar(0);
		var c = @observe(a, _a -> _a + 1);

		waitfor {
			c .. @each {|val|
				log.push(val);
			}
		} or {
			a.set(1);
		}

		log .. @assert.eq([1, 2]);
	}

	@test("is recomputed each time it's accessed") {||
		var count = 0;
		var c = @observe(@ObservableVar(), -> count++);
		c .. @first() .. @assert.eq(0);
		c .. @first() .. @assert.eq(1);
	}
}

@test('each.track edge case') {||
  // if the block of an each.track blocks while an upstream value is generated, 
  // we're ok to lose intermediate values, but we want to make sure that we 
  // always see the last one
  var rv = '';
  var X = @ObservableVar('');
  waitfor {
    X .. @changes .. @each.track {
      |x|
      try {
        rv += x;
        hold();
      }
      finally {
        hold(0);
      }
    }
  }
  or {
    X.set('a');
    X.set('b');
    X.set('c');
    X.set('d');
    hold(0);
  }
  rv .. @assert.eq('ad');
}

@context("synchronize") {||
  @test('B inited from A') {
    ||
    var A = @ObservableVar('foo');
    var B = @ObservableVar('bar');
    waitfor {
      @synchronize(A,B);
    }
    or {
    }
    @assert.eq(B .. @current, 'foo');
  }

  @test('B inited from A; aToB') {
    ||
    var A = @ObservableVar('foo');
    var B = @ObservableVar('bar');
    waitfor {
      @synchronize(A,B, {aToB: x -> x.toUpperCase(), bToA: x -> 'not called'});
    }
    or {
    }
    @assert.eq(B .. @current, 'FOO');
    @assert.eq(A .. @current, 'foo');
  }

  @test('setting A; aToB') {
    ||
    var A = @ObservableVar('foo');
    var B = @ObservableVar('bar');
    waitfor {
      @synchronize(A,B, {aToB: x -> x.toUpperCase(), bToA: x -> 'not called'});
    }
    or {
      A.set('xxx');
    }
    @assert.eq(B .. @current, 'XXX');
    @assert.eq(A .. @current, 'xxx');
  }

  @test('setting B; bToA') {
    ||
    var A = @ObservableVar('foo');
    var B = @ObservableVar('bar');
    waitfor {
      @synchronize(A,B, {aToB: x -> x.toUpperCase(), bToA: x -> 'xxx'});
    }
    or {
      B.set('test');
    }
    @assert.eq(B .. @current, 'test');
    @assert.eq(A .. @current, 'xxx');
  }


}
