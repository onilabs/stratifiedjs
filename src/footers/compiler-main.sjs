if (require.main === module) {
	var seq = require('sjs:sequence'), fs = require('sjs:nodejs/fs');
	process.argv.slice(1) .. seq.each {|f|
		fs.readFile(f) .. exports.compile .. console.log
	}
}
