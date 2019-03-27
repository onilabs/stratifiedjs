@ = require('sjs:test/std');

@context("ObservableArrayVar") {||
  @test("!isObservableVar") {||
    var a = @ObservableArrayVar();
    @assert.eq(a .. @isObservableVar, false);
  }
  @test(".stream isStream") {||
    var a = @ObservableArrayVar();
    @assert.eq(a.stream .. @isStream, true);
  }
  @test(".stream isStructuredObservable") {||
    var a = @ObservableArrayVar();
    @assert.eq(a.stream .. @isStructuredObservable, true);
  }
  @test(".stream !isObservable") {||
    var a = @ObservableArrayVar();
    @assert.eq(a.stream .. @isObservable, false);
  }
  @test(".stream !isObservableVar") {||
    var a = @ObservableArrayVar();
    @assert.eq(a.stream .. @isObservableVar, false);
  }
  @test(".stream isObservableArray") {||
    var a = @ObservableArrayVar();
    @assert.eq(a.stream .. @isObservableArray, true);
  }

  @test("stream format & ops") {||
    var a = @ObservableArrayVar();
    waitfor {
      var i=0; 
      var m= [[],
              {mutations:[{type:'ins', val:'a', idx:0}]},
              {mutations:[{type:'ins', val:'b', idx:1}]},
              ['x', 'y', 'z'],
              {mutations:[{type:'set', val:'w', idx:1}]},
              {mutations:[{type:'del', idx:1}]}
             ];
      a.stream .. @each {|x|
        @assert.eq(x, m[i++]);
        if (i=== m.length) break;
      }
    }
    and {
      a.insert(0, 'a');
      a.push('b');
      @assert.eq(a.stream .. @current, ['a', 'b']);
      @assert.eq(a.get(), ['a', 'b']);
      @assert.eq(a.getLength(), 2);
      a.reset(['x', 'y', 'z']);
      a.set(1, 'w');
      a.remove(1);
      @assert.eq(a.stream .. @current, ['x', 'z']);
      @assert.eq(a.get(), ['x', 'z']);
      @assert.eq(a.getLength(), 2);
    }
  }

} // ObservableArrayVar

@context("reconstitute") {||
  @test("array") {||
    [1,2,3,4] .. @reconstitute .. @assert.eq([1,2,3,4]);
  }
  @test("generic stream") {||
    @integers(0,10) .. @reconstitute .. @toArray .. @assert.eq(@integers(0,10) .. @toArray);
  }
  @test("ObsVar") {||
    var a = @ObservableVar(1);
    waitfor {
      var i=0;
      var m = [1,2,3,4];
      @assert.eq(a .. @reconstitute .. @isObservableVar, true);
      @assert.eq(a .. @reconstitute .. @isObservable, true);
      a .. @reconstitute .. @each {|x|
        @assert.eq(x, m[i++]);
        if (i=== m.length) break;
      }
    }
    and {
      a.set(2);
      a.modify(x -> ++x);
      a.set(4);
    }
  }
  @test("ObsArrayVar") {||
    var a = @ObservableArrayVar();
    waitfor {
      var i=0; 
      var m= [[],['a'], ['a', 'b'], ['x', 'y', 'z'], ['x', 'w', 'z'], ['x', 'z']];
      @assert.eq(a.stream .. @reconstitute .. @isObservable, true);
      a.stream .. @reconstitute .. @each {|x|
        @assert.eq(x, m[i++]);
        if (i=== m.length) break;
      }
    }
    and {
      a.insert(0, 'a');
      a.push('b');
      a.reset(['x', 'y', 'z']);
      a.set(1, 'w');
      a.remove(1);
    }
  }
} // reconstitute
