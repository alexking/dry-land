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
	this.onSubmarine = false; 

	var characterSchemes = [
		{
			"255,0,255" : 0x492B19,
			"100,255,0" : 0x000000
		},
		{ 
			"255,0,255" : 0xB09E8F,
			"100,255,0" : 0x402B20
		}
	];

	var characters = [[0, "0"], [1, "0"], [0, "1"], [1, "1"]];
	var character  = characters[which - 1]; 

	var player = new CanvasImage("assets/character" + character[1] + ".png"); 

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

	this.lastDamageCause = false; 
	this.health = 5; 
	this.maxHealth = 5; 
	this.holdingBreath = true; 
	this.breathHurtRate = 200;
	this.holdingBreathFor = 0;

	this.hitByFish = false;
	this.damagedByFish = 0;

	this.firingMissile = true; 
	this.direction = 1; 

	this.startTime = Date.now(); 

	// Missiles 
	this.missiles = [ ]; 

};

// Since this changes quite a bit 
Player.prototype.height = function() {
	return ((this.isSubmarine) ? 20: 32) * this.game.scale;
};

// Note: convert player width to standard "waist size" units, i.e. 32w
Player.prototype.width = function() {
	return ((this.inWater) ? 32 : 16) * this.game.scale;
};


Player.prototype.bounds = function() {
	return [
		this.position[0], 
		this.position[1], 
		this.width(),
		this.height()
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

var waterY = this.canvas.height() - this.waterLevel;


	// You can't go above the water level when in water 
	if (this.inWater && this.position[1] < this.canvas.height() - this.waterLevel - 16) {
		this.position[1] = this.canvas.height() - this.waterLevel - 16;
	}

	// Do not go outside the bounds of the canvas 
	if (this.position[1] > this.canvas.height() - this.height()) {
		this.position[1] = this.canvas.height() - this.height();
	}

	
	if (this.position[1] < 0) {
		this.position[1] = 0;
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

	// Are we in the water?
	if (waterY < this.position[1] + 32) {
		this.inWater = true; 
	}

	// Are we under water without a sub?
	if (!this.isSubmarine && this.inWater) {
		
		// Fishes kill use instantly. Come on. Look at those teeth. 
		if (this.hitByFish) {
			this.lastDamageCause = "fish"; 

			this.health = 0; 
		}

		// Well, is our head under water though? 
		if (this.waterLevel > ( this.canvas.height() - this.position[1] - 10)) {
			this.headUnderWater = true; 
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

				this.lastDamageCause = "water"; 
			}

		} else {
			this.headUnderWater = false; 
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
	if (this.onSubmarine) {

		// This is a very simple endgame state - just draw the sub with the player on top 
		this.canvas.drawSprite(this.underwaterSprite.get("submarine", this.direction), this.position[0], this.position[1]);
		this.canvas.drawSprite(this.sprite.get("walking", 1), this.position[0], this.position[1] - 24);

	} else if (this.isSubmarine) { 
		
		spriteNumber = this.direction; 

		if (this.health < 3) {
			spriteNumber = this.direction + 4; 
		}

		if (this.hitByFish) {
			spriteNumber = this.direction + 2; 
			this.hitByFish = false; 
			this.damagedByFish++; 

			this.lastDamageCause = "fish"; 
	
		}

		// Check if the damage from the fish should cause a health loss 
		if (this.damagedByFish > 25) {
			this.health--;
			this.damagedByFish = 0; 
		}

		this.canvas.drawSprite(this.underwaterSprite.get("submarine", spriteNumber), this.position[0], this.position[1]);

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
					position: [this.position[0] + 14, this.position[1] + 6],
					velocity: [this.direction == 1 ? 8 : -8, 0],
					direction: this.direction,
					hit: false, 
				});
			}

			this.firingMissile = true;

		} else {
			this.firingMissile = false; 
		}

	// Player 
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

		// Are we past the edges?
		if (missile.position[0] > 500 || missile.hit == 2) {
			return false; 
		}

		// Continue to propel 
		missile.position[0] += missile.velocity[0]; 
		missile.position[1] += missile.velocity[1]; 

		var sprite = missile.direction;

		if (missile.hit) {
			sprite = 3; 
			missile.hit = 2; 
		}

		self.canvas.drawSprite(self.underwaterSprite.get("missile", sprite), missile.position[0], missile.position[1]);

		// Keep it 
		return true; 

	});

	// If we are a submarine 
	if (this.isSubmarine) {

		// Draw a nice cover 
		var coverNumber = this.direction + 8;
		if (this.hitByFish) {
			coverNumber -= 2;
		}

		this.canvas.drawSprite(this.underwaterSprite.get("submarine", coverNumber), this.position[0], this.position[1]);
	}

};
