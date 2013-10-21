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

context('matches') {||
  test("returns all matches") {||
    "foof far faz" .. regexp.matches(/f./g) .. map(m -> m[0]) .. assert.eq(['fo', 'f ', 'fa', 'fa']);
  }

  test("rejects a non-global regexp") {||
    assert.raises( -> "foof far faz" .. regexp.matches(/f./));
  }

  test("handles a zero-width regexp") {||
    // not actually useful, but we need to make sure it doesn't loop infinitely
    "abc" .. regexp.matches(/()/g) .. map(m -> [m[0], m.index]) .. assert.eq([
      ["", 0],
      ["", 1],
      ["", 2],
      ["", 3]]);
  }
}
