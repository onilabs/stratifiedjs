exports.foo = function(a) { return a+41; };
exports.bar = function() { return this; };
exports.dynamicRequire = function() {
	return require('./module1').one;
};
