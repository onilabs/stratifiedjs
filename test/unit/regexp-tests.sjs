var {test, context, assert} = require('sjs:test/suite');

var {each, map} = require('sjs:sequence');
var regexp = require('sjs:regexp');

test('escape') {||
  var specials = [
    '.', '*', '+', '?', '^', '=', '!', ':', '$',
    '{', '}', '(', ')', '|', '[', ']', '/', '\\'
  ];

  var allSpecials = specials.join('');

  var escaped = regexp.escape(allSpecials);
  escaped .. assert.eq('\\' + specials.join('\\'));


  specials .. each {|ch|
    var escaped = regexp.escape(ch);
    escaped .. assert.eq('\\' + ch);
    var re = new RegExp(escaped);
    re.exec(ch) .. assert.ok("#{ch} incorrectly escaped");
  }

  var re = new RegExp(escaped);
  re.exec(allSpecials) .. assert.ok("#{allSpecials} incorrectly escaped");
}

context('findAll') {||
  test("returns all matches") {||
    "foof far faz" .. regexp.findAll(/f./g) .. map(m -> m[0]) .. assert.eq(['fo', 'f ', 'fa', 'fa']);
  }

  test("rejects a non-global regexp") {||
    assert.raises( -> "foof far faz" .. regexp.findAll(/f./));
  }

  test("rejects a zero-width regexp") {||
    assert.raises( -> "foof far faz" .. regexp.findAll(/()/g));
  }
}
