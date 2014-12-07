window.onload = function() {

	var game = new Game(); 
	game.scale = 2; 

	var canvas = new Canvas(game, document.getElementById("canvas")); 
	
	var c = canvas.context; 

	var start = new Sprite("/assets/start.png", {
		button: {
			offsetX: 0,
			offsetY: 0,
			gridX: 52, 
			gridY: 18
		}
	});

	var ui = new Sprite("/assets/ui.png", {
		heart: {
			offsetX: 0, 		
			offsetY: 0, 
			gridX: 8,
			gridY: 8
		},
		text: {
			offsetX: 0,
			offsetY: 8,
			gridX: 100,
			gridY: 16
		},
		cause: {
			offsetX: 0,
			offsetY: 40,
			gridX: 100,
			gridY: 8
		}

	}); 

	var underwater = new Sprite("/assets/underwater.png", {
		submarine: {
			offsetX: 0, 		
			offsetY: 0, 
			gridX: 32,
			gridY: 32
		},
		missile: {
			offsetX: 0, 		
			offsetY: 64, 
			gridX: 16,
			gridY: 16
		},
		pipe: {
			offsetX: 0, 		
			offsetY: 32, 
			gridX: 32,
			gridY: 16
		},
		fish: {
			offsetX: 0, 		
			offsetY: 96, 
			gridX: 32,
			gridY: 16
		}
	}); 

	Fish.underwaterSprite = underwater; 

	var player = new Player(game, canvas, _.random(1, 4));

	player.canvas = canvas; 
	player.inWater = false; 
	player.platform  = [canvas.centerY(18), canvas.centerX(52), 18, 52];
	player.position = [canvas.centerX(16), 0];
	player.underwaterSprite = underwater;

	var alternate = true; 
	var zeroOneTwo = 1; 
	var zeroOneTwoDirection = 1; 

	var startTime = Date.now(); 
	var tickTime = Date.now(); 
	var frames = 0; 
	var ticks = 0; 

	var waterDelay = 500; 
	var waterLevel = 0; 

	var healthTotal = 5; 
	var health = 5; 

	var fishes = []; 

	// Keys 
	var keys = new Keys();
	keys.bind();

	function loop() {

		// Check for game over 
		if (player.health === 0) {

			canvas.flood("rgba(100, 0, 0, 0.8)");

			canvas.drawSprite(ui.get("text", 1), canvas.centerX(72), canvas.centerY(10)); 

			canvas.drawSprite(ui.get("cause", 1, 1), canvas.centerX(57), canvas.centerY(5) + 20); 

			return; 	
		}

		// Look for the 50ms tick 
		if (Date.now() - tickTime > 50) {
			ticks++; 
			Fish.ticks = ticks; 

			tickTime = Date.now(); 
		}

		canvas.clear();

		frames ++; 

		if ( frames % 10 == 1) {
			alternate = ! alternate;
		}

		if (frames % 2 == 1) {
			
			// Draw some water 
			if (waterLevel < canvas.height()) {
				waterLevel += 1; 
				player.waterLevel = waterLevel;
				Fish.waterLevel = waterLevel;
			}

		}
	
		var waterY = canvas.height() - waterLevel;

		// Water BG
		c.fillStyle = "rgba(34, 32, 52, 1)"; //"#30374E";
		c.fillRect(0, canvas.height() - waterLevel - 1, canvas.width(), waterLevel); 

		// Had the platform been destroyed yet? 
		if (waterY < player.platform[1]) {
		
			// Destroy the platform 
			player.platform = false; 
		} else {

			// Place the "start button"
			if (waterLevel < 50) {
				canvas.drawSprite(start.get("button", 1, 1), canvas.centerX(52), canvas.centerY(18));
			
				if (waterLevel > 25) {
					canvas.drawSprite(start.get("button", 1, 2), canvas.centerX(52), canvas.centerY(18), ((waterLevel - 25) / 25));
				}

			} else if (waterLevel < 100) {

				// So code duplication 
				canvas.drawSprite(start.get("button", 1, 2), canvas.centerX(52), canvas.centerY(18));
			
			} else if (waterLevel < 400) {
				canvas.drawSprite(start.get("button", 1, 3), canvas.centerX(52), canvas.centerY(18));
				
				var opacity = 1; 
				if (waterLevel > 300) {
					opacity = 0.1; 
				} else {

				}
				canvas.drawSprite(start.get("button", 1, 4), canvas.centerX(52), canvas.centerY(18) + ((waterLevel - 100) * 3) );
			} 


		
		}

		// Draw water 
		c.fillStyle = "rgba(48, 56, 77, 1)"; //"#30374E";
		c.fillRect(0, canvas.height() - waterLevel, canvas.width(), waterLevel); 

		// Only handle sub display until we are the sub
		if (!player.isSubmarine) {

			// Is it sub time? I think it's sub time.
			canvas.drawSprite(underwater.get("submarine", 1), - 56, 500 - 40);
		}

		// And a pipe. We need a pipe. 
 		canvas.drawSprite(underwater.get("pipe", (ticks % 4) +2 ) , 400, 500 - 24);

 		// Is the pipe colliding with anything 
 		if (collides([400, 500 - (12 * game.scale), game.scale * 12, game.scale * 12], player.bounds())) {

 			// Yes, explain this 
			canvas.drawSprite(ui.get("cause", 1, (player.submarine ? -1 : 0) ), 180, 500 - 20); 

 		}


 		// Is the sub colliding with anything 
 		if (collides([0, 500 - 40, game.scale * 34, game.scale * 20], player.bounds())) {

 			// Sub activated 
 			player.isSubmarine = true; 

 		}

		// Tell the player what keys are being pressed
		player.keys = keys;

		// Let it draw itself - not sure this is a good idea 
		player.draw();
		

		// If the water is over 200, start spawning fish 
		if (waterLevel > 100) {

			// What are the chances? (somewhere around 1 in 100)
			if (_.random(1, 100) == 1) {
				this.fishes.push(new Fish(canvas));
			}

		}

		// Draw every fish 
		this.fishes = _.filter(this.fishes, function(fish) {
			return fish.draw();
		});


		// UI 
		var healthX = 10; 
		for (var healthNumber = 0; healthNumber < player.maxHealth; healthNumber++) { 

			if (player.health > healthNumber) {
				canvas.drawSprite(ui.get("heart", 1), healthX, 10);
			} else { 
				canvas.drawSprite(ui.get("heart", 2), healthX, 10);
			}

			healthX += 9 * game.scale; 
		}



		// Debug code 
		var debugY = 20; 
		var debugOffsetX = healthX; 

		c.font = "14px Helvetica";

		c.fillStyle = "rgba(255, 255, 255, 0.5)";
		c.fillText("Frames: " + frames % 30, debugOffsetX + 10, debugY); 
		c.fillText("Seconds: " + Math.round((Date.now() - startTime) / 1000), debugOffsetX + 100, debugY); 
		c.fillText("FPS: " + Math.round(frames / ((Date.now() - startTime) / 1000)), debugOffsetX + 200, debugY); 
		c.fillText("M: " + player.missiles.length, debugOffsetX + 260, debugY); 
		

		// Request the next frame 
		window.requestAnimationFrame(loop);

	}

	window.requestAnimationFrame(function() {
		loop();
	});


	


};