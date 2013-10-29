var {test, context, assert} = require('sjs:test/suite');
var {Registry} = require('sjs:service');

context('service registry') {||
  test.beforeEach {|s|
    s.reg = Registry();
  }

  test('value') {|s|
    s.reg.value('val1', 'one');
    s.reg.get('val1') .. assert.eq('one');
    assert.raises( -> s.reg.get('val2'));
  }

  test('factory') {|s|
    var val=1;
    s.reg.factory('val', -> val++);
    s.reg.get('val') .. assert.eq(1);
    s.reg.get('val') .. assert.eq(2);
  }

  test('lazy') {|s|
    var val=1;
    s.reg.lazy('val', -> val++);
    s.reg.get('val') .. assert.eq(1);
    s.reg.get('val') .. assert.eq(1);
  }

  context('dependencies') {||
    test.beforeEach {|s|
      s.log = [];

      s.reg.factory('c', function(reg) {
        reg.get('b') .. assert.eq('b');
        reg.get('a') .. assert.eq('a');
        s.log.push('c');
        return 'c';
      });

      s.reg.lazy('b', function(reg) {
        reg.get('a') .. assert.eq('a');
        s.log.push('b');
        return 'b';
      });

      s.reg.lazy('a', function(reg) {
        reg.get('v') .. assert.eq('val');
        s.log.push('a');
        return 'a';
      });

      s.reg.value('v', 'val');
    }

    test('recursive lazy dependencies are evaluated as needed') {|s|
      s.reg.get('c') .. assert.eq('c');
      s.log .. assert.eq(['a','b','c']);

      s.reg.get('a') .. assert.eq('a');
      s.reg.get('b') .. assert.eq('b');
      s.reg.get('c') .. assert.eq('c');
      s.log .. assert.eq(['a','b','c','c']);
    }

    test('clearCached') {|s|
      s.reg.get('c') .. assert.eq('c');
      s.log .. assert.eq(['a','b','c']);

      s.reg.clearCached();

      s.reg.get('c') .. assert.eq('c');
      s.log .. assert.eq(['a','b','c','a','b','c']);
    }

  }
    
  context("inheritance") {||
    test.beforeEach {|s|
      s.log = [];
      s.childReg = Registry(s.reg);
      s.reg.value('v', 'val');
      s.childReg.factory('childVal', function(r) {
        r.get('v') .. assert.eq('val');
        r.has('parentVal') .. assert.eq(true);
        r.get('parentVal') .. assert.eq('parent');
        s.log.push('child');
        return 'child';
      });

      s.reg.lazy('parentVal', function(r) {
        r.has('childVal') .. assert.eq(false);
        assert.raises( -> r.get('childVal'));

        r.get('v') .. assert.eq('val');
        s.log.push('parent');
        return 'parent';
      });
    }

    test('child defers to parent') {|s|
      s.childReg.get('childVal') .. assert.eq('child');
    }

    test('values are cached at the level they are created') {|s|
      s.childReg.get('childVal');
      s.log .. assert.eq(['parent','child']);

      s.childReg.clearCached();
      // parent still cached
      s.childReg.get('childVal');
      s.log .. assert.eq(['parent','child', 'child']);

      s.reg.clearCached();
      s.childReg.get('childVal');
      s.log .. assert.eq(['parent','child', 'child', 'parent', 'child']);
    }

  }

  test('calling registry as a shortcut for get()') {|s|
    s.reg.set('val', 123);
    s.reg('val') .. assert.eq(123);
  }

}
