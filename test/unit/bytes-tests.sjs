@ = require(['sjs:test/std', 'sjs:bytes']);

var input = [1,2,3];
var types = [
	['Uint8Array', 'isUint8Array', 'toUint8Array', new Uint8Array([1,2,3])],
	['ArrayBuffer', 'isArrayBuffer', 'toArrayBuffer', (new Uint8Array([1,2,3])).buffer],
];

if(!@isBrowser) {
	types.push(['Buffer', 'isBuffer', 'toBuffer', new Buffer([1,2,3])]);
}

@context("Array") {||
	@test("Array isBytes") {||
		input .. @isBytes .. @assert.eq(false);
	}

	types .. @each {|[className, testMethod, convertMethod, sourceExample]|
		@test("Array .. #{testMethod} should be false") {||
			input .. @[testMethod] .. @assert.eq(false);
		}

		@test("Array .. #{convertMethod}") {||
			var converted = input .. @[convertMethod];
			converted .. @assert.eq(sourceExample);
		}
	}
}

// because the types are all functionally equivalent, we just test
// each permutation of (type, conversion, test) against all other binary types.
types .. @each {|[className, testMethod, convertMethod, sourceExample]|
	@context(className) {||
		var cls = @sys.getGlobal(className);
		cls .. @assert.ok();

		@test("isBytes") {||
			sourceExample .. @isBytes .. @assert.eq(true);
		}

		types .. @each {|[desc, _, _, example]|
			var isSelf = example === sourceExample;
			@test("#{desc} .. #{testMethod} should be #{isSelf}") {||
				example .. @[testMethod] .. @assert.eq(isSelf);
			}

			@test("#{desc} .. #{convertMethod}") {||
				if(isSelf) {
					example .. @[convertMethod] .. @assert.is(example);
				} else {
					example .. @[convertMethod] .. @assert.eq(sourceExample);
				}
			}
		}

	}
}
