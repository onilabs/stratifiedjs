var { context, assert, test } = require("sjs:test/suite");
var logging = require("sjs:logging");

context("grouped tests") { ||
	test("are ordered") { ||
		assert.ok(true);
		logging.info("test");
		assert.ok(false, "failure reason");
		assert.ok(false, "failure reason");
	}
	test("skipping", -> null).skip();
}

context("envs") {||
	var f = null;
	test.beforeAll {||
		f = 0;
	}
	test.beforeEach {||
		f += 1;
	}
	
	test("foo") {||
		assert.ok(true);
	}
}
