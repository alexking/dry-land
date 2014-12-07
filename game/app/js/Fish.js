var Fish = function(canvas) {

	this.canvas = canvas; 

	// Spawn somewhere in canvas 
	this.direction = _.random(1, 2); 
	this.position = [this.direction == 2 ? -50 : 550, _.random(canvas.width() - Fish.waterLevel, canvas.width())];
	
};

Fish.prototype.draw = function() {
	
	var sprite = this.direction + ((Fish.ticks % 2) * 2);

	this.canvas.drawSprite(Fish.underwaterSprite.get("fish", sprite), this.position[0], this.position[1]);
	
	if (this.direction == 2) {
		this.position[0] += 3;
	} else {
		this.position[0] -= 3; 
	}

	// Return true if you want to keep being a fish!
	return true; 
};