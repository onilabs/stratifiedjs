@ = require('sjs:std');
exports.hasOutstandingChanges = function() {
	var result = @childProcess.run('git', ['diff', '--shortstat'], {stdio: ['ignore', 'pipe', 'ignore']});
	//console.log('[[' + result.stdout + ']]');
	return result.stdout.strip !== "";
};

exports.dumpDiff = function() {
	@childProcess.run('git', ['--no-pager', 'diff'], {stdio: 'inherit'});
};

exports.assertNoChanges = function() {
	if (exports.hasOutstandingChanges()) {
		exports.dumpDiff();
		@assert.fail("Uncommitted VCS changes found, see above for diff");
	}
};

if(require.main === module) exports.assertNoChanges();
