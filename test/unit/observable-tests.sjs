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
