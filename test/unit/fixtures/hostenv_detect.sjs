if (require("sjs:sys").hostenv === 'nodejs') {
	exports.what = "node";
} else {
	exports.what = "a browser";
}
