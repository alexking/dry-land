var Fish = function(canvas) {

	this.canvas = canvas; 

	// We determine the fish size by how many fish you've killed
	this.fishSize = Fish.fishKilled >= fishBeforeLevel2 ? 2 : 1; 

	// Spawn somewhere in canvas 
	this.direction = _.random(1, 2); 

	var randomHeight = _.random(canvas.height() - Fish.waterLevel, canvas.height() - 50); 

	this.position = [this.direction == 2 ?  -100 : 600, randomHeight];
	
	this.fishCountdown = false; 

};

Fish.prototype.bounds = function(bitey) {
	if (_.isUndefined(bitey)) {

		return [
			this.position[0], 
			this.position[1], 
			this.fishSize == 1 ? 50 : 100, 
			this.fishSize == 1 ? 32 : 64
		];
	} else {
		return [
			this.position[0] + (this.direction == 1 ? 0 : (this.fishSize == 1 ? 36 : 84) ), 
			this.position[1] + (this.fishSize == 1 ? 5 : 10), 
			20, 
			this.fishSize == 1 ? 20 : 40
		];
	}
};

Fish.prototype.die = function() {
	this.fishCountdown = 1; 
};

Fish.prototype.draw = function() {
	
	var sprite = this.direction + ((Fish.ticks % 2) * 2);

	if (this.fishCountdown !== false) {
		this.fishCountdown --; 

		sprite = this.direction + 4;
	}


	this.canvas.drawSprite(Fish.underwaterSprite.get("fish" + this.fishSize, sprite), this.position[0], this.position[1]);
	
	if (this.direction == 2) {
		this.position[0] += 3;
	} else {
		this.position[0] -= 3; 
	}

	// Dead fish 
	if (this.fishCountdown === 0) {
		return false; 
	}

	// Are we offscreen?
	if (this.position[0] > this.canvas.width() + 150 || this.position[0] < -150) {
		return false; 
	}

	// Return true if you want to keep being a fish!
	return true; 
};