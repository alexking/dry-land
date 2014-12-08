
var Sprite = function(image, data) {
	
	// Auto load urls 
	if (_.isString(image)) {
		this.image = new Image();
		this.image.src = image; 
	} else {
		this.image = image; 
	}

	this.data = data; 
};


Sprite.prototype.get = function(name, x, y) {
	
	// Defaults 
	x = _.isUndefined(x) ? 0 : (x - 1);
	y = _.isUndefined(y) ? 0 : (y - 1);

	var gridX = this.data[name].gridX; 
	var gridY = this.data[name].gridY; 

	var offsetX = this.data[name].offsetX; 
	var offsetY = this.data[name].offsetY; 

	return [ this.image, (gridX * x) + offsetX, (gridY * y) + offsetY, gridX, gridY ];

};

