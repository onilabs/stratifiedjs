(function() {
	var scripts = document.getElementsByTagName("script");
	// console.log(scripts);
	var cb;
	for (var i=scripts.length-1; i>=0; i--) {
		var script = scripts[i];
		var src = script.getAttribute("src");
		var match = src && src.match(/.*integration\/fixtures\/jsonp\.js\?callback=([^&$]+)/);
		if (match) {
			cb = match[1];
			break;
		}
	}
	if (!cb) console.log("no callback found!");
	else eval(cb + "({'data':'result'})");
})();
