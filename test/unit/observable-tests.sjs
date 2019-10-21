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

	@test("only ever skips intermediate events when observing") {||
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


} // context 'synchronize'

@context("ObservableWindowVar") {||

  @test("typing") {||
    var a = @ObservableWindowVar(10);
    @assert.eq(a .. @isStream, false);
    @assert.eq(a .. @isObservableWindowVar, true);
    @assert.eq(a.stream .. @isStream, true);
    @assert.eq(a.stream .. @isStructuredStream('rolling'), true);
  }

  @test("add/stream") {||
    var A = @ObservableWindowVar(3);
    var rv = [];
    waitfor {
      A.stream .. @each { |x| rv.push(x); }
    }
    or {
      [1,2,3,4,5,6] .. @each {|x| A.add(x); }
    }
    @assert.eq(rv, [[],[1],[1,2],[1,2,3],[2,3,4],[3,4,5],[4,5,6]]);
    A.stream .. @first .. @assert.eq([4,5,6]);
  }
  @test("add/stream async") {||
    var A = @ObservableWindowVar(3);
    var rv = [];
    waitfor {
      A.stream .. @each { |x| rv.push(x); }
    }
    or {
      [1,2,3,4,5,6] .. @each {|x| hold(0); A.add(x); }
    }
    @assert.eq(rv, [[],[1],[1,2],[1,2,3],[2,3,4],[3,4,5],[4,5,6]]);
    A.stream .. @first .. @assert.eq([4,5,6]);
  }
  @test("base stream") {||
    var A = @ObservableWindowVar(3);
    var rv = [];
    waitfor {
      A.stream.base .. @each { |x| rv.push(x); }
    }
    or {
      [1,2,3,4,5,6] .. @each {|x| A.add(x); }
    }
    @assert.eq(rv, [[0,[]],[0,[1]],[0,[2]],[0,[3]],[1,[4]],[1,[5]],[1,[6]]]);
    A.stream.base .. @first .. @assert.eq([0,[4,5,6]]);
  }
  @test("multiple streams") {||
    var A = @ObservableWindowVar(3);
    var rv1 = [];
    var rv2 = [];
    waitfor {
      A.stream .. @each { |x| rv1.push(x); }
    }
    or {
      [1,2,3,4,5,6] .. @each {|x| A.add(x); hold(0); }
    }
    or {
      A.stream .. @each { |x| rv2.push(x); }
    }
    @assert.eq(rv1, [[], [1], [1,2], [1,2,3], [2,3,4], [3,4,5], [4,5,6]]);
    @assert.eq(rv2, [[1], [1,2], [1,2,3], [2,3,4], [3,4,5], [4,5,6]]);
  }
  @test("lagging receiver") {||
    var A = @ObservableWindowVar(3);
    A.stream .. @consume {
      |next|
      A.add(1); A.add(2);
      @assert.eq(next(), [1,2]);
      A.add(3); A.add(4);
      @assert.eq(next(), [2,3,4]);
      A.add(5); A.add(6);
      @assert.eq(next(), [4,5,6]);
    }
  }
  @test("lagging receiver async") {||
    var A = @ObservableWindowVar(3);
    A.stream .. @consume {
      |next|
      A.add(1); A.add(2); hold(0);
      @assert.eq(next(), [1,2]); hold(0);
      A.add(3); A.add(4); hold(0);
      @assert.eq(next(), [2,3,4]); hold(0);
      A.add(5); A.add(6); hold(0);
      @assert.eq(next(), [4,5,6]);
    }
  }
  @test("multiple lagging receivers") {||
    var A = @ObservableWindowVar(3);
    A.stream .. @consume {
      |next1|
      A.stream .. @consume {
        |next2|
        A.add(1); A.add(2);
        @assert.eq(next1(), [1,2]);
        A.add(3); 
        @assert.eq(next2(), [1,2,3]);
        A.add(4);
        @assert.eq(next1(), [2,3,4]);
        A.add(5); 
        @assert.eq(next2(), [3,4,5]);
        A.add(6); hold(0);
        @assert.eq(next1(), [4,5,6]);
        @assert.eq(next2(), [4,5,6]);
      }
    }
  }


} // context 'ObservableWindowVar'

@context('sample') {||
  @test('typing') {||
    var A = @integers() .. @sample;
    var B = @integers() .. @rollingWindow(3) .. @sample;
    @assert.eq(A .. @isStream, true);
    @assert.eq(A .. @isStructuredStream, false);
    @assert.eq(B .. @isStream, true);
    @assert.eq(B .. @isStructuredStream('rolling'), true);
  }
  @test('sampling unstructured stream') {||
    var Input = @ObservableVar(1);
    var Sampled = Input .. @sample;
    Sampled .. @consume {
      |next|
      @assert.eq(next(), 1);
      Input.set(2);
      Input.set(3);
      @assert.eq(next(), 3);
      hold(0);
      Input.set(4);
      Input.set(5);
      hold(0);
      @assert.eq(next(), 5);
    }
  }
  @test('sampling rolling stream') {||
    var Input = @ObservableWindowVar(3);
    var Sampled = Input.stream .. @sample;
    Sampled .. @consume {
      |next|
      @assert.eq(next(), []);
      Input.add(2);
      Input.add(3);
      @assert.eq(next(), [2,3]);
      hold(0);
      Input.add(4);
      Input.add(5);
      hold(0);
      @assert.eq(next(), [3,4,5]);
    }
  }
}

@context('updatesToObservable') {||
  @test('typing') {||
    var A = @integers() .. @updatesToObservable(->undefined);
    var B = @integers() .. @rollingWindow(3) .. @updatesToObservable(->undefined);
    @assert.eq(A .. @isStream, true);
    @assert.eq(A .. @isStructuredStream, false);
    @assert.eq(B .. @isStream, true);
    @assert.eq(B .. @isStructuredStream, false);
  }
  @test('sampling unstructured stream') {||
    var Input = @ObservableVar(100);
    var Sampled = Input .. @changes .. @updatesToObservable(->(hold(0),1));
    Sampled .. @consume {
      |next|
      @assert.eq(next(), 1);
      hold(0);
      Input.set(2);
      Input.set(3);
      @assert.eq(next(), 3);
      hold(0);
      Input.set(4);
      Input.set(5);
      hold(0);
      @assert.eq(next(), 5);
    }
  }
  @test('sampling unstructured stream - quirky') {||
    var Input = @ObservableVar(100);
    var Sampled = Input .. @changes .. @updatesToObservable(->(hold(0),1));
    Sampled .. @consume {
      |next|
      @assert.eq(next(), 1);
//      hold(0);
      Input.set(2);
      Input.set(3);
      // NOTE THIS QUIRK - we'll see value 2 and not 3. The VM logic of
      // the code in updatesToObservable is sound here. It's an unfortunate 
      // interplay of a `collapse` that needs to be resolved synchronously 
      // when driving the fully set-up waitfor/and in the updatesToObservable
      // code all synchronously from `getInitial`.
      // We could fix this, but it is almost certainly of no practical importance.
      @assert.eq(next(), 2);
      hold(0);
      @assert.eq(next(), 3);
      Input.set(4);
      Input.set(5);
      hold(0);
      @assert.eq(next(), 5);
    }
  }
  @test('override initial value') {||
    var Input = @ObservableVar(1000);
    var Sampled = Input .. @changes .. @updatesToObservable(->(hold(1000),100));
    Sampled .. @consume {
      |next| 
      waitfor {
        @assert.eq(next(), 1);
      }
      and {
        // set the input after the stream has started being iterated (initiated by next() call)
        Input.set(1);
      }
      Input.set(2);
      Input.set(3);
      @assert.eq(next(), 3);
      hold(0);
      Input.set(4);
      Input.set(5);
      hold(0);
      @assert.eq(next(), 5);
    }
  }
}
