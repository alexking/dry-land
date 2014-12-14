var Canvas = function(game, element) {
	var self = this; 

	this.element = element; 
	this.game = game; 

	// Create a 2d context 
	this.context = this.c = this.element.getContext("2d");

	// Default to no smooth scaling 
	this.smoothScaling(false);

	this.scale = game.scale; 

	// Mouse 
	this.mouseX = 0;
	this.mouseY = 0; 
	this.mouseDown = false; 

	var border = 14; 

	// Get our bounding rectangle 
	var getBounds = function() {
		self.bounds = self.element.getBoundingClientRect();
	};

	// Keep it up to date 
	window.addEventListener('resize', getBounds);
	getBounds();
	
	window.onmousemove = function(e) {
		self.mouseX = e.pageX - self.bounds.left - border; 
		self.mouseY = e.pageY - self.bounds.top - border;
	};

	window.addEventListener("mousedown", function() {
		self.mouseDown = true; 
		console.log(self.mouseX + ", " + self.mouseY);
	});

	window.addEventListener("mouseup", function() {
		self.mouseDown = false; 
	});

};

Canvas.prototype.clear = function() { 
	this.c.clearRect(0, 0, this.element.width, this.element.height);
};

Canvas.prototype.flood = function(fill) {
	this.c.fillStyle = fill;  
	this.c.fillRect(0, 0, this.element.width, this.element.height);
};

Canvas.prototype.drawSprite = function(info, x, y, opacity) {
	this.drawImage(info[0], info[1], info[2], info[3], info[4], x, y, opacity);
}; 

Canvas.prototype.drawBounds = function(bounds) {
	if (debug) {
		this.c.strokeStyle = "white";
		this.c.strokeRect(bounds[0] + 0.5, bounds[1] + 0.5, bounds[2], bounds[3]); 
	}
};

Canvas.prototype.cursor = function(type) {
	// Set the cursor to hand 
	this.element.style.cursor = type;
};

Canvas.prototype.drawImage = function(image, imageX, imageY, imageW, imageH, x, y, opacity) {

	// Handle alpha 
	if (!_.isUndefined(opacity)) {
		this.c.save(); 
		this.c.globalAlpha = opacity;
	}

	// Draw image 
	try {
	this.c.drawImage(image, imageX, imageY, imageW, imageH, x, y, imageW * this.scale, imageH * this.scale);
	} catch(err) {
		console.log(err);
	}

	// Much elegant 
	if (!_.isUndefined(opacity)) {
		this.c.restore();
	}
};

/**
 * Cross browser image scaling 
 */
Canvas.prototype.smoothScaling = function (value) {
	var c = this.context; 

	_.each(prefices(), function(prefix) {
		if (prefix === "") {
			c.imageSmoothingEnabled = false;
		} else {
			c[prefix + "ImageSmoothingEnabled"] = false;
		} 
	});

};



/**
 * Center 
 */
Canvas.prototype.centerX = function(value) {
	return this.centerObjectIn(value, this.width());
};

Canvas.prototype.centerY = function(value) {
	return this.centerObjectIn(value, this.height());
};

Canvas.prototype.centerObjectIn = function(obj, dest) {
	return (dest / 2)  - ((obj * this.scale) / 2); 

};

/**
 * Canvas width and height 
 */
Canvas.prototype.width = function() {
	return this.element.width; 
};

Canvas.prototype.height = function() {
	return this.element.height; 
};