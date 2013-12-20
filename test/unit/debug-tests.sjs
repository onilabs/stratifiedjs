var test = require('../lib/testUtil').test;
var debug = require('sjs:debug');

test("formatting an object literal", "{ key: 'value' }", function() {
	return debug.inspect({key: "value"});
});

test("formatting an HTML element", '[dom: <span>hi!</span>]', function() {
	var elem = document.createElement("span");
	elem.innerHTML = "hi!";
	return debug.inspect(elem).toLowerCase();
}).browserOnly();

test("splitting array elements over multiple lines", "[ [ 'aaaaaaaaaaaaaaaaaaaa',\n    'bbbbbbbbbbbbbbbbbbbb',\n    'cccccccccccccccccccc' ] ]", function() {
	return debug.inspect([[
		'aaaaaaaaaaaaaaaaaaaa',
		'bbbbbbbbbbbbbbbbbbbb',
		'cccccccccccccccccccc']]);
});

