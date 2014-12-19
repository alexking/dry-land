var Keys = function() {
	this.keys = [];

	this.onKeyDown = false; 
	this.onKeyUp = false; 

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
		27: "esc",
		77: "m"
	};
};

Keys.prototype.pressing = function(name) {
	return _.indexOf(this.keys, name) !== -1;
};

Keys.prototype.toggle = function(key, callback) {
	var self = this; 

	var keyReleased = true; 

	// When a key goes down
	window.addEventListener("keydown", function(event) {
		
		// Check if it matches the key we want 
		if (self.keyToName(event.keyCode) == key) {

			// If the key has been released, then tell the callback
			if (keyReleased) {
				callback(key);

				// The key has not been released yet 
				keyReleased = false; 
			}

			// Listen for the up event for this key 
			var keyUpEvent = function(event) {

				// Is this the key we were looking for?
				if (self.keyToName(event.keyCode) == key) {

					// Release the key 
					keyReleased = true; 

					// Stop listening 
					window.removeEventListener("keyup", keyUpEvent);

				}
			};

			window.addEventListener("keyup", keyUpEvent);
		}

	});

};

Keys.prototype.keyDown = function(code) {

	var keyName = _.isUndefined(this.codeToName[code]) ? false : this.codeToName[code]; 

	if (this.onKeyDown){
		this.onKeyDown(keyName);
	}

	// Don't add twice 
	if (keyName && _.indexOf(this.keys, keyName) == -1) {
		this.keys.push(keyName); 
	}
};

Keys.prototype.keyToName = function(code) {
	return _.isUndefined(this.codeToName[code]) ? false : this.codeToName[code]; 
};

Keys.prototype.keyUp = function(code) {
	// What key just changed?
	var keyName = this.keyToName(code);

	if (this.onKeyUp){
		this.onKeyUp(keyName);
	}

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

	window.onkeypress = function(e) {
		self.lastKey = String.fromCharCode(e.keyCode);
	};

};
