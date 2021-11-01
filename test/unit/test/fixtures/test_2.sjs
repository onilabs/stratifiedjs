var {context, test, assert} = require("sjs:test/suite");

context("test_2 context_1", function() {
  test("test one", -> null);
  test("test two", -> null);
})

context("test_2 context_2", function() {
  test("test one", -> null);
  test("test two", -> null);
})
