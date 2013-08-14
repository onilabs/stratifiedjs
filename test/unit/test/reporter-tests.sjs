var suite = require('sjs:test/suite');
var {test, context, assert, isBrowser} = suite;
var reporter = require('sjs:test/reporter');
var obj = require('sjs:object');
var seq = require('sjs:sequence');
var str = require('sjs:string');

var defaultReporter = isBrowser ? reporter.HtmlReporter : reporter.NodejsReporter;

context("error diffing") {||
	test.beforeEach {|s|
		s.reporter = new defaultReporter({headless:true, diff:true});
		var realErrors = false;
		//realErrors = true; // uncomment to print real errors. NOCOMMIT
		if (realErrors) {
			s.diff = function(a,b) {
				assert.eq.apply(assert, arguments);
				assert.fail("shouldn't get here");
			}
		} else {
			var chunks = [];
			s.reporter.print = function(txt, nl) {
				if (txt !== undefined) chunks[chunks.length-1] += txt;
				if (nl !== false) {
					chunks.push([]);
				}
			}
			s.reporter.color = function(col, txt) {
				if (!txt) return txt;
				var attrs = str.isString(col) ? col : obj.ownValues(col) .. seq.sort .. seq.join('|');
				if (attrs == 'normal') return txt;
				return "<#{attrs}:#{txt}>";
			}
			s.diff = function(a,b) {
				chunks = [];
				s.reporter.printDiff({actual: a, expected: b});
				return chunks .. seq.filter(c -> c.length > 0) .. seq.slice(1) .. seq.toArray; // remove header
			}
		}
	}

	test("no diff displayed when `diff` option is false") {|s|
		s.reporter.opts.diff = false;
		s.diff("one two three four", "one two three") .. assert.eq([]);
	}

	test("no diff displayed when nothing in common") {|s|
		s.diff("11111\n11111\n11111", "two") .. assert.eq([]);
	}

	test("no diff displayed when comparing string to non-string") {|s|
		var o1 = {a:1,b:2, c:3};
		var o2 = o1 .. obj.merge({c:4});
		s.diff(JSON.stringify(o1), JSON.stringify(o2)) .. assert.ok();
		s.diff(o1, JSON.stringify(o2)) .. assert.eq([]);
	}

	test("no diff displayed when structure is unserializable") {|s|
		var o1 = {a:1,b:2, c:3};
		var o2 = o1 .. obj.merge({c:4});
		o1.x = o1; // circular
		s.diff(o1, o2) .. assert.eq([]);
	}

	test("no diff displayed when commonality is <3 chars") {|s|
		s.diff("11 0000000", "11 1111111") .. assert.eq([]);
		s.diff("111 000000", "111 111111") .. assert.eq([
			'111 <red:000000><green:111111>']);
	}

	test("diff for multi-line strings") {|s|
		s.diff("one\ntwo\nthree", "one\nfour\nthree") .. assert.eq([
			'one',
			'<red:two><green:four>',
			'three',
		]);
	}

	test("line numbers are shown when diff exceeds 4 lines") {|s|
		s.diff("one\ntwo\nthree\nfour\nfive", "one\ntwo\n3\nfour\nfive") .. assert.eq([
			'<dim:1 | >one',
			'<dim:2 | >two',
			'<dim:3 | ><red:three><green:3>',
			'<dim:4 | >four',
			'<dim:5 | >five',
		]);
	}

	test("line number padding") {|s|
		s.diff("1\n2\n3\n4\nfive\n6\n7\n8\n9", "1\n2\n3\n4\n5\n6\n7\n8\n9") .. assert.eq([
			'<dim:1 | >1',
			'<dim:2 | >2',
			'<dim:3 | >3',
			'<dim:4 | >4',
			'<dim:5 | ><red:five><green:5>',
			'<dim:6 | >6',
			'<dim:7 | >7',
			'<dim:8 | >8',
			'<dim:9 | >9',
		]);

		s.diff("1\n2\n3\n4\nfive\n6\n7\n8\n9\n10", "1\n2\n3\n4\n5\n6\n7\n8\n9\n10") .. assert.eq([
			'<dim: 1 | >1',
			'<dim: 2 | >2',
			'<dim: 3 | >3',
			'<dim: 4 | >4',
			'<dim: 5 | ><red:five><green:5>',
			'<dim: 6 | >6',
			'<dim: 7 | >7',
			'<dim: 8 | >8',
			'<dim: 9 | >9',
			'<dim:10 | >10',
		]);
	}

	test("diff for objects") {|s|
		s.diff(
			{
				a:'one',
				b:'two',
			},
			{
				a:'one',
				c:'three',
			}
		) .. assert.eq([
			'{',
			'  "a": "one",',
			'  "<red:b><green:c>": "<red:two><green:three>"',
			'}'
		]);
	}

	test("multi-line diffs") {|s|
		s.diff("1\n2\n3\n5\n7", "1\n2\n3\n3\n4\n5\n7") .. assert.eq([
			'<dim:1 | >1',
			'<dim:2 | >2',
			'<dim:3 | >3',
			'<dim:4 | ><green:3>',
			'<dim:5 | ><green:4>',
			'<dim:6 | >5',
			'<dim:7 | >7',
		]);
	}

	test("character-mode diff with markers when all diffs are whitespace") {|s|
		s.diff("\n1\n2\n3\n4\n5\n6", "1\n2\t\n3\n4 \n5\n\n6\n") .. assert.eq([
			'<dim:1 | ><red:<nl>>',
			'<dim:2 | >1<nl>',
			'<dim:3 | >2<green:\t><nl>',
			'<dim:4 | >3<nl>',
			'<dim:5 | >4<green: ><nl>',
			'<dim:6 | >5<nl>',
			'<dim:7 | ><green:<nl>>',
			'<dim:8 | >6<green:<nl>>',
			'<dim:9 | >',
		]);
	}

	test("whitespace-only diff on an inspected object") {|s|
		s.diff(['a','b',' c'], ['a','b','  c']) .. assert.eq([
			'<dim:1 | >[<nl>',
			'<dim:2 | >  "a",<nl>',
			'<dim:3 | >  "b",<nl>',
			'<dim:4 | >  " <green: >c"<nl>',
			'<dim:5 | >]',
		]);
	}
}.skipIf(suite.isIE() && suite.ieVersion() < 9, "known bug");
