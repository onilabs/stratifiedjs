@ = require('sjs:test/std');

@context("project") {||
  @test("array") {||
    [1,2,3] .. @project(x->x+1) .. @assert.eq([2,3,4]);
  }
  @test("string") {||
    'abc' ..  @project(@capitalize) .. @assert.eq("ABC");
  }
  @test("generic stream") {||
    @integers(1,3) .. @project(x->x+1) .. @isConcreteSequence .. @assert.eq(false);
    @integers(1,3) .. @project(x->x+1) .. @toArray .. @assert.eq([2,3,4]);
  }
  @test("observable") {||
    var a = @ObservableVar(1);
    a .. @project(x->x+1) .. @isObservable .. @assert.eq(true);
    waitfor {
      a .. @project(x->x+1) .. @consume {
        |next|
        @assert.eq(next(), 2);
        @assert.eq(next(), 3);
        @assert.eq(next(), 4);
        @assert.eq(next(), 5);
      }
    }
    and {
      a.set(2);
      a.set(3);
      a.set(4);
    }
  }
  @test("observablearray") {||
    var a = @ObservableArrayVar([1,2,3]);
    var projection = a.stream .. @project(x->x..@map(x->x+1));
    projection .. @isObservable .. @assert.eq(false);
    projection .. @isStructuredObservable .. @assert.eq(true);
    projection .. @isObservableArray .. @assert.eq(true);
    waitfor {
      projection .. @consume {
        |next|
        @assert.eq(next(), [2,3,4]);
        @assert.eq(next(), [2,3]);
        @assert.eq(next(), [3,3]);
        @assert.eq(next(), [3,3,4]);
      }
    }
    and {
      a.remove(2);
      a.set(0,2);
      a.push(3);
    }
  }
} // project

@context("projectInner") {||
  @test("array") {||
    [[1,2,3],[2,3,4],[3,4,5]] .. @projectInner(x->x+1) .. @assert.eq([[2,3,4],[3,4,5],[4,5,6]]);
  }
  @test("arrays of generic streams") {||
    var projection = @integers(1,3) .. @map(x->@integers(x,x+2)) .. @projectInner(x->x+1);
    projection .. @isConcreteSequence .. @assert.eq(true);
    projection .. @first .. @isConcreteSequence .. @assert.eq(false);
    projection .. @map(@toArray) .. @assert.eq([[2,3,4],[3,4,5],[4,5,6]]);
  }
  @test("generic stream of streams") {||
    var projection = @integers(1,3) .. @transform(x->@integers(x,x+2)) .. @projectInner(x->x+1);
    projection .. @isConcreteSequence .. @assert.eq(false);
    projection .. @first .. @isConcreteSequence .. @assert.eq(false);
    projection .. @map(@toArray) .. @assert.eq([[2,3,4],[3,4,5],[4,5,6]]);
  }
  @test("generic stream of arrays") {||
    var projection = @integers(1,3) .. @transform(x->@integers(x,x+2)..@toArray) .. @projectInner(x->x+1);
    projection .. @isConcreteSequence .. @assert.eq(false);
    projection .. @first .. @isConcreteSequence .. @assert.eq(true);
    projection .. @map(@toArray) .. @assert.eq([[2,3,4],[3,4,5],[4,5,6]]);
  }
  @test("observable") {||
    var a = @ObservableVar([1,2,3]);
    var projection = a .. @projectInner(x->x+1);
    projection .. @isObservable .. @assert.eq(true);
    waitfor {
      projection .. @consume {
        |next|
        @assert.eq(next(), [2,3,4]);
        @assert.eq(next(), [3,4,5]);
        @assert.eq(next(), [4,5,6]);
        @assert.eq(next(), [5,6,7]);
      }
    }
    and {
      a.set([2,3,4]);
      a.set([3,4,5]);
      a.set([4,5,6]);
    }
  }
  @test("observablearray") {||
    var a = @ObservableArrayVar([1,2,3]);
    var projection = a.stream .. @projectInner(x->x+1);
    projection .. @isObservable .. @assert.eq(false);
    projection .. @isStructuredObservable .. @assert.eq(true);
    projection .. @isObservableArray .. @assert.eq(true);
    waitfor {
      projection .. @consume {
        |next|
        @assert.eq(next(), [2,3,4]);
        @assert.eq(next(), {mutations:[{type:'del', idx:2}]});
        @assert.eq(next(), {mutations:[{type:'set', val:3, idx:0}]});
        @assert.eq(next(), {mutations:[{type:'ins', val:4, idx:2}]});
      }
    }
    and {
      a.remove(2);
      a.set(0,2);
      a.push(3);
    }
  }
} // projectInner

@context("dereference") {||
  @test('generic stream') {||
    var a = @Stream(function(r) { r('a');hold(0); r('b'); r('c'); });
    var deref = a .. @dereference({a:1, b:2, c:3, d:4});
    deref .. @isConcreteSequence .. @assert.eq(false);
    deref .. @toArray .. @assert.eq([1,2,3]);
  }
}
