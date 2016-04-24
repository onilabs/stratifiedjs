@ = require('sjs:std');
exports.hasOutstandingChanges = function() {
	var result = @childProcess.run('git', ['diff', '--ignore-blank-lines'], {stdio: ['ignore', 'pipe', 'ignore']});
	var output = result.stdout.trim();
	//console.log('[[' + output + ']]');
	return output !== "";
};

exports.dumpDiff = function() {
	@childProcess.run('git', ['--no-pager', 'diff', '--ignore-blank-lines'], {stdio: 'inherit'});
};

exports.assertNoChanges = function() {
	if (exports.hasOutstandingChanges()) {
		exports.dumpDiff();
		@assert.fail("Uncommitted VCS changes found, see above for diff");
	}
};

if(require.main === module) exports.assertNoChanges();
