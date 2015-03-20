/**
 * This file contains all of the syntactic constructs that
 * should be parsed identially by SJS / JS.
 * For SJS-specific syntax needs to be addressed
 * specifically in ast-tests.sjs
 */

function foo() {
	return 1;
}

console.log("string!\"");
console['log'];
var array = [1, "two", /three/];
var regex_flags = /foo/gm;
var { destructure } = obj;
var x = (1);
var x = (1,2);
var x = (1,2,3);
x ? 1 : 2;
if(x) { 1 } else if (y) { 2 } else { 3 };
if(x) { 1 }
while(1) { loop(); }
do { loop() } while(1);
lbl: 1;
for (var i=0; i<a.length; a++) {
	loop();
}
for (i=0; i<a.length; a++) {
	loop();
}
for(;;) loop();
for(var k in x) { loop(); }
for(k in x) { loop(); }
while(1) {
	break;
	continue;
}
with(x) { y }
switch(x) {
	case 1:
		x === 1;
		break;
	default:
		break;
}
throw exc;
try {
	fail();
} catch(e) {
	fail(e);
} finally {
	cleanup();
}
try { x } catch(e) { y }
new Foo(a, b, c);
(function() { })();
this;
true;
false;
null;
(function([a,b,c]) { });
([a,b,c]) => null;
(function({a, b:c}) { });
(function({a, b:[c,d]}) { });
var [a,,c] = arr;

// pre-function comment
function foo() {
	// leading function comment
	
	//pre-expression comment
	bar();
}
