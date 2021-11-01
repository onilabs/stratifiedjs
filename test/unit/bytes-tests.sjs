@ = require(['sjs:test/std', 'sjs:bytes']);

var input = [1,2,3];
var types = [
	['Uint8Array', 'isUint8Array', 'toUint8Array', new Uint8Array([1,2,3])],
	['ArrayBuffer', 'isArrayBuffer', 'toArrayBuffer', (new Uint8Array([1,2,3])).buffer],
];

if(!@isBrowser) {
	types.push(['Buffer', 'isBuffer', 'toBuffer', Buffer.from([1,2,3])]);
}

@context("Array", function() {
	@test("Array isBytes", function() {
		input .. @isBytes .. @assert.eq(false);
	})

	types .. @each {|[className, testMethod, convertMethod, sourceExample]|
		@test("Array .. #{testMethod} should be false", function() {
			input .. @[testMethod] .. @assert.eq(false);
		})

		@test("Array .. #{convertMethod}", function() {
			var converted = input .. @[convertMethod];
			converted .. @assert.eq(sourceExample);
		})
	}
})

// because the types are all functionally equivalent, we just test
// each permutation of (type, conversion, test) against all other binary types.
types .. @each {|[className, testMethod, convertMethod, sourceExample]|
	@context(className, function() {
		var cls = @sys.getGlobal(className);
		cls .. @assert.ok();

		@test("isBytes", function() {
			sourceExample .. @isBytes .. @assert.eq(true);
		})

		types .. @each {|[desc, _, _, example]|
			var isSelf = example === sourceExample;

      // since ca. node v 4.5, buffers are also unit8arrays:
      if (desc ==='Buffer' && className ==='Uint8Array') continue;

			@test("#{desc} .. #{testMethod} should be #{isSelf}", function() {
				example .. @[testMethod] .. @assert.eq(isSelf);
			})

			@test("#{desc} .. #{convertMethod}", function() {
				if(isSelf) {
					example .. @[convertMethod] .. @assert.is(example);
				} else {
					example .. @[convertMethod] .. @assert.eq(sourceExample);
				}
			})
		}

	})
}
