var {test, context, assert} = require('sjs:test/suite');

context {||

var fs = require('sjs:nodejs/fs');
var object = require('sjs:object');
var url = require('sjs:url');
var seq = require('sjs:sequence');

test("sjs:xbrowser/console") {||
	var bundle = require('sjs:bundle');
	var tmpfile = '/tmp/sjs-test-bundle.js';

	var modulesPath = url.normalize('../../modules/', module.id) .. url.toPath;
	bundle.create({
		alias: ["#{modulesPath}=/apollo/"],
		sources: ['sjs:xbrowser/console'],
		bundle: tmpfile,
	});
	var contents = fs.readFile(tmpfile).toString();

	// set up some "globals"
	var __oni_rt_bundle = {};
	var document = {
		location: {
			origin: 'HOST'
		}
	};

	eval(contents);
	var exportedKeys = object.ownKeys(__oni_rt_bundle) .. seq.sort();
	// unfortunately brittle based on what xbrowser/console actually imports...
	assert.eq(exportedKeys, [
		'HOST/apollo/array.sjs',
		'HOST/apollo/object.sjs',
		'HOST/apollo/sequence.sjs',
		'HOST/apollo/string.sjs',
		'HOST/apollo/xbrowser/console.sjs',
	]);
}

}.serverOnly();
