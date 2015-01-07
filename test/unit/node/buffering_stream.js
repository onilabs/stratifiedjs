var util = require('util');
var Duplex = require('stream').Duplex;
var WRITE_DELAY = 50;
var WRITE_TIME = 20;
var WRITE_BUFFER = 50;

//
// A buffering stream that acts kind of like gzip (but without compression) -
// writes will succeed fairly quickly until WRITE_BUFFER items are queued, after
// which point writes will take WRITE_TIME.
//
// If any writes are pending, WRITE_DELAY ms later the chunks will be shifted
// onfo the readable side of the stream, and emitted when requested by a _read()
//
var BufferingStream = function() {
	Duplex.call(this, {highWaterMark:1});
	this.chunks = [];
	this.pending = [];
	this.pendingMove = null;
	this.atCapacity = false;
	// this.on('readable', function() { console.log("* BufferingStream readable");});
};
util.inherits(BufferingStream, Duplex);

BufferingStream.prototype.end = function() {
	// console.log("BufferingStream end");
	Duplex.prototype.end.apply(this, arguments);
	this._write(null, null, function() { /* noop */});
};

BufferingStream.prototype._read = function(size) {
	// console.log("_read");
	var self = this;
	self.atCapacity = false;
	
	// XXX if _read pushes items synchronously, `readable` events are emitted too late and cause premature EOF
	setTimeout(self.emitBufferedItems.bind(self), 0);
	// self.emitBufferedItems();
};

BufferingStream.prototype.emitBufferedItems = function() {
	if(this.atCapacity) return;
	// if (this.chunks.length > 0) console.log('pumping up to ' + this.chunks.length + " readable chunks");
	while(this.chunks.length > 0) {
		// console.log("Emitting " + this.chunks[0]);
		if(!this.push(this.chunks.shift())) {
			// console.log("read buffer full; " + this.chunks.length + " chunks still buffered");
			this.atCapacity = true;
			break;
		}
	}
};

BufferingStream.prototype._write = function(chunk, encoding, cb) {
	var self = this;
	// console.log("_write: ", chunk === null);
	// console.log("Appending " + chunk + " to " + this.pending.length + " pending chunks");
	self.pending.push(chunk);
	if(!self.pendingMove) {
		setTimeout(function() {
			// console.log("_moving " + self.pending.length + " onto " + (self.chunks.length));
			self.chunks = self.chunks.concat(self.pending);
			self.pending = [];
			self.pendingMove = false;
			self.emitBufferedItems();
		}, WRITE_DELAY);
		self.pendingMove = true;
	}
	if(self.pending.length > WRITE_BUFFER) {
		// console.log("pretend to be slow at writing...");
		setTimeout(function() { cb(); }, WRITE_TIME);
	} else {
		setImmediate(function() { cb(); });
	}
};
BufferingStream.prototype._id = 'BufferingStream';

exports.BufferingStream = BufferingStream;
