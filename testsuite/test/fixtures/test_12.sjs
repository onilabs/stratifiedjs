var {context, test, assert} = require("sjs:test/suite");
test("skipped_1").skip();
test("skipped_2").skip("reason");
