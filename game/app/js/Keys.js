var Keys = function() {
	this.keys = [];

	this.codeToName = {
		38: "up",
		87: "up",
		40: "down",
		83: "down",
		37: "left",
		65: "left",
		39: "right",
		68: "right",
		32: "space", 
		27: "esc"
	};
};

Keys.prototype.pressing = function(name) {
	return _.indexOf(this.keys, name) !== -1;
};

Keys.prototype.keyDown = function(code) {

	var keyName = _.isUndefined(this.codeToName[code]) ? false : this.codeToName[code]; 
	
	// Don't add twice 
	if (keyName && _.indexOf(this.keys, keyName) == -1) {
		this.keys.push(keyName); 
	}
};


Keys.prototype.keyUp = function(code) {
	// What key just changed?
	var keyName = _.isUndefined(this.codeToName[code]) ? false : this.codeToName[code]; 

	this.keys = _.without(this.keys, keyName); 

};

Keys.prototype.bind = function() {
	var self = this; 

	window.onkeydown = function(event) {
		self.keyDown(event.keyCode); 

		// Cancel event 
		return false; 
	};

	window.onkeyup = function(event) {
		self.keyUp(event.keyCode); 

		// Cancel event	
		return false; 
	};

	window.onblur = function(event) {
		self.keys = []; 

		// Cancel event	
		return false; 
	};

};
