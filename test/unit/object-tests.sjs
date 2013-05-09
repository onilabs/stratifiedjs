var {test: testEq, testFn} = require('../lib/testUtil');
var o = require("sjs:object");
var {sort, toArray} = require("sjs:sequence");
var {test, assert, context} = require('sjs:test/suite');

test('clone object', function() {
  var Cls = function(a) {
    this.a = a;
  };
  Cls.prototype.p = "proto!"

  var initial = new Cls(1);
  var clone = o.clone(initial);
  assert.notEq(initial, clone); // prototypes should differ
  initial.b = 2;
  assert.eq(initial.a, 1);
});

testEq('clone array', [[1,2,3], [1,2]], function() {
  var initial = [1,2];
  var clone = o.clone(initial);
  initial.push(3);
  return [initial, clone];
});

test('clone arguments', function() {
  var initial;
  (function() { initial = arguments})(1, 2);
  var clone = o.clone(initial);
  clone.push(3);

  initial .. toArray() .. assert.eq([1,2]);
  clone .. assert.eq([1,2,3]);
});

testEq("merge argument list", {"a":1,"b":2}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge(a,b);
});

testEq("merge array of objects", {"a":1,"b":2}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge([a,b]);
});

// these next two aren't particularly likely scenarios, but just to test that we aren't recursively flattening:
testEq("merge array of arrays", {"a":1, "0": {"b":2}}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge([a, [b]]);
});

testEq("merge multiple array arguments", {"a":1, "0": {"b":2}}, function() {
	var a = {a:1};
	var b = {b:2};
	return o.merge(a, [b]);
});

context {||
	var Obj = function(props) {
		o.extend(this, props);
	};
	Obj.prototype.c = 'cee';
	var obj = new Obj({a:'aye', b:'bee'});

	testEq("keys", ["a","b", "c"], function() { return obj .. o.keys() .. sort(); });
	testEq("values", ["aye","bee", "cee"], function() { return obj .. o.values() .. sort(); });
	testEq("ownKeys", ["a","b"], function() { return obj .. o.ownKeys() .. sort(); });
	testEq("ownValues", ["aye","bee"], function() { return obj .. o.ownValues() .. sort(); });

	testFn(o, "has", [obj, 'a'], true);
	testFn(o, "hasOwn", [obj, 'a'], true);

	testFn(o, "has", [obj, 'c'], true);
	testFn(o, "hasOwn", [obj, 'c'], false);

	context("get()") {||
		testEq("own key", "aye", -> obj .. o.get('a'));
		testEq("inherited key", "cee", -> obj .. o.get('c'));
		test("missing key") {||
			assert.raises({message: 'Object (object) has no key: d'}, -> obj .. o.get('d'));
		}
		testEq("missing key with default", 'default', -> obj .. o.get('d', 'default'));
		testEq("missing key with undefined default", undefined, -> obj .. o.get('d', undefined));
	}

	context("getOwn()") {||
		testEq("own key", "aye", -> obj .. o.getOwn('a'));
		test("inherited key") {||
			assert.raises({message: 'Object (object) has no key: c'}, -> obj .. o.getOwn('c'));
		}
	}

	context("getPath") {||
		var noChild = {'parent':{}};
		var noGrandChild = {'parent':{'child':{}}};
		var full = {'parent':{'child':{'grandchild':'found'}}};

		testEq("valid path", 'found', -> full .. o.getPath('parent.child.grandchild'));

		test("missing leaf") {||
			assert.raises({message: "Object (object) has no key: grandchild (traversing: parent.child.grandchild)"},
				-> noGrandChild .. o.getPath('parent.child.grandchild'));
		}

		test("missing branch") {||
			assert.raises({message: "Object (string) has no key: child (traversing: parent.child.grandchild)"},
				-> {'parent':'child'} .. o.getPath('parent.child.grandchild'));
		}

		testEq("missing leaf with default", 'default',
			-> noGrandChild .. o.getPath('parent.child.grandchild', 'default'));

		testEq("missing branch with default", 'default',
			-> noChild .. o.getPath('parent.child.grandchild', 'default'));
	}
}
