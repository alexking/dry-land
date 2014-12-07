var Player = function(game, canvas, which) {
	this.keyName = false; 
	this.zeroOneTwo = 0; 
	this.zeroOneTwoDirection = 1; 
	this.randomSlowChange = false; 

	this.canvas = canvas; 
	this.game = game; 

	this.position = [0, 0]; 
	this.platform = false; 

	this.isSubmarine = false; 


	var characterSchemes = [
		{ 
			"0,0,0"    	  : 0x000000,
			"176,158,144" : 0x492B19,
			"64,43,33"    : 0x000000
		},
		{ 
			"0,0,0"    	  : 0x000000,
			"176,158,144" : 0xB09E8F,
			"64,43,33"    : 0x402B20
		}
	];

	var characters = [[0, "-tail"], [1, "-tail"], [0, ""], [1, ""]];
	var character  = characters[which - 1]; 

	var player = new CanvasImage("/assets/character" + character[1] + "0.png"); 

	player.translateColors = characterSchemes[character[0]];

	this.sprite = new Sprite(player.drawable(), {
		walking: {
			offsetX: 0, 		
			offsetY: 0, 
			gridX: 16,
			gridY: 32
		},
		swimming: {
			offsetX: 0, 
			offsetY: 32,
			gridX: 32,
			gridY: 32
		}
	}); 

	this.health = 5; 
	this.maxHealth = 5; 
	this.holdingBreath = true; 
	this.breathHurtRate = 200;
	this.holdingBreathFor = 0;

	this.firingMissile = true; 
	this.direction = 1; 

	this.startTime = Date.now(); 

	// Missiles 
	this.missiles = [ ]; 

};

Player.prototype.bounds = function() {
	return [
		this.position[0], 
		this.position[1], 
		32 * this.game.scale, 
		32 * this.game.scale
	];
};

/**
 * Loop 
 */
Player.prototype.draw = function() {
	var self = this;

	// How much time has elapsed 
	var elapsed = Date.now() - this.startTime ;

	// Animate every 100ms 
	if (elapsed > 100) {
		this.zeroOneTwo += this.zeroOneTwoDirection; 
	
		if (this.zeroOneTwo === 2 || this.zeroOneTwo === 0) {
			this.zeroOneTwoDirection = -1 * this.zeroOneTwoDirection;
		}

		this.startTime = Date.now();
	}


	if (!this.inWater) {
	
		// Gravity!
		this.position[1] += 5; 

	} else if (!this.isSubmarine) {

		this.position[1] += 1;

	} 

	// Do not go outside the bounds of the canvas 
	if (this.position[1] > this.canvas.height() - (32 * this.game.scale)) {
		this.position[1] = this.canvas.height() - (32 * this.game.scale);
	}

	if (this.position[1] < 0) {
		this.position[1] = 0;
	}	


	var waterY = this.canvas.height() - this.waterLevel;


	// You can't go above the water level when in water 
	if (this.inWater && this.position[1] < this.canvas.height() - this.waterLevel - 16) {
		this.position[1] = this.canvas.height() - this.waterLevel - 16;
	}

	// Check platform if we aren't a sub 
	if (this.platform && !this.isSubmarine) { 

		// If we are "on" it
		if (
			this.position[0] > this.platform[1] + 10 - (18 * this.game.scale) &&
			this.position[0] < this.platform[1] - 8 + (this.platform[3] * this.game.scale) 
		) {

			// Can't go through the top 
			if (this.position[1] > this.platform[0] - (32 * this.game.scale)  &&
				this.position[1] < this.platform[1] + (32 * this.game.scale)) {
				this.position[1] = this.platform[0] - (32 * this.game.scale) ; 
			}

		}


	}


	// Are we under water without a sub?
	if (!this.isSubmarine && waterY < this.position[1] + 32) {
		this.inWater = true; 

		// Well, is our head under water though? 
		if (this.waterLevel > ( this.canvas.height() - this.position[1] - 10)) {

			// Are we holding our breath?
			if (this.holdingBreath) {
				this.holdingBreathFor++; 
			} 

			// Did we take damage yet?
			if (this.holdingBreathFor > this.breathHurtRate) {

				// Reset the counter 
				this.holdingBreathFor = 0;

				// Take damage 
				this.health--;
			}

		} else {

			// Breath!
			if (this.holdingBreath && this.holdingBreathFor > 0) {
				this.holdingBreathFor -= 2; 
			} else {
				this.holdingBreathFor = 0;
			}
		}
	}


	if (_.random(1, 200) == 200) {
		this.randomSlowChange = ! this.randomSlowChange;
	}

	var zeroOneTwo = 1;
	
	var spriteNumber = 1; 

	var speed; 
	if (this.isSubmarine) { 

		this.canvas.drawSprite(this.underwaterSprite.get("submarine", this.direction), this.position[0], this.position[1]);

		speed = 3; 

		if (this.keys.pressing("left")) {

			this.position[0] -= speed; 
			this.direction = 2; 

		} else if (this.keys.pressing("right")) {

			this.position[0] += speed; 
			this.direction = 1;
		} 

		if (this.keys.pressing("down")) {

			this.position[1] += speed; 
			velocityY = speed;

		} else if (this.keys.pressing("up")) {
			this.position[1] -= speed; 
			velocityY = -1 * speed;
		}

		// Missile 
		if (this.keys.pressing("space")) {
			
			if (!this.firingMissile) {
			
				this.missiles.push({
					position: [this.position[0] + 14, this.position[1] + 18],
					velocity: [this.direction == 1 ? 8 : -8, 0],
					direction: this.direction
				});
			}

			this.firingMissile = true;

		} else {
			this.firingMissile = false; 
		}

	} else {

		var spriteToUse;
		if (this.inWater) {
			spriteToUse = "swimming"; 

			speed = 2; 


			if (this.keys.pressing("left")) {
				spriteNumber = 2;

				this.position[0] -= speed; 

			} else if (this.keys.pressing("right")) {
				spriteNumber = 4;

				this.position[0] += speed; 

			} 

			if (this.keys.pressing("down")) {
				spriteNumber = 1;

				this.position[1] += speed; 

			} else if (this.keys.pressing("up")) {
				spriteNumber = 3; 
				this.position[1] -= speed; 
			}

		} else {
			spriteToUse = "walking";

			if (this.keys.pressing("left")) {
				spriteNumber = 3 + this.zeroOneTwo; 
				this.position[0] -= 3; 
			} else if (this.keys.pressing("right")) {
				spriteNumber = 6 + this.zeroOneTwo;  
				this.position[0] += 3; 
			} else {
				spriteNumber = 1 + this.randomSlowChange;
			}

		}

		this.canvas.drawSprite(this.sprite.get(spriteToUse, spriteNumber), this.position[0], this.position[1]);

	}



	// Render each missile 
	this.missiles = _.filter(this.missiles, function(missile) {
		// Continue to propel 
		missile.position[0] += missile.velocity[0]; 
		missile.position[1] += missile.velocity[1]; 

		self.canvas.drawSprite(self.underwaterSprite.get("missile", missile.direction), missile.position[0], missile.position[1]);

		// Are we past the edges?
		if (missile.position[0] > 500) {
			return false; 
		}
		
		// Keep it 
		return true; 

	});

};
