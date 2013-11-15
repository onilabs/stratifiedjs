if (require.main === module) {
	var seq = require('sjs:sequence'), fs = require('sjs:nodejs/fs');
	require('sjs:sys').argv() .. seq.each {|f|
		var filename = JSON.stringify(f);
		fs.readFile(f, 'utf-8') .. exports.compile({globalReturn: true, filename: filename, keeplines: true}) .. console.log
	}
}
