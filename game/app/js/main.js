var debug = false; 
var debugConsole = false; 

var hardness = 8;
var fishBeforeLevel2 = hardness * 1; 
var fishBeforeLevel3 = hardness * 2; 
var volume = 0.4; 


window.onload = function() {

	// Play some music 
	var context = new AudioContext();

	var out = new WebAudiox.LineOut(context);
	out.volume = volume; 

	var sourceNode; 
	var sourceNode2; 
	var sourceNode3; 

	var gainNode1 = context.createGain(); 
	var gainNode2 = context.createGain(); 
	var gainNode3 = context.createGain(); 

	gainNode1.connect(out.destination);
	gainNode2.connect(out.destination);
	gainNode3.connect(out.destination);

	gainNode1.gain.value = 1;
	gainNode2.gain.value = 0;
	gainNode3.gain.value = 0;

	WebAudiox.loadBuffer(context, "assets/sound/music.mp3", function(buffer) {

		// Play 
		sourceNode = context.createBufferSource();
		sourceNode.buffer = buffer;
		sourceNode.connect(gainNode1);
		sourceNode.loop = true; 
		sourceNode.loopEnd = 9.6; 

		sourceNode2 = context.createBufferSource();
		sourceNode2.buffer = buffer;
		sourceNode2.connect(gainNode2);
		sourceNode2.loop = true; 
		sourceNode2.loopStart = 9.6; 
		sourceNode2.loopEnd   = 2 * 9.6; 

		sourceNode3 = context.createBufferSource();
		sourceNode3.buffer = buffer;
		sourceNode3.connect(gainNode3);
		sourceNode3.loop = true; 
		sourceNode3.loopStart = 2 * 9.6; 
		sourceNode3.loopEnd   = 3 * 9.6; 
	
		sourceNode.start(0);
		sourceNode2.start(0, 9.6);
		sourceNode3.start(0, 2 * 9.6);


	});




	var game = new Game(); 
	game.scale = 2; 

	var canvas = new Canvas(game, document.getElementById("canvas")); 
	
	var c = canvas.context; 

	var title = new Image();
	title.src = "assets/title.png"; 


	var start = new Sprite("assets/start.png", {
		button: {
			offsetX: 0,
			offsetY: 0,
			gridX: 52, 
			gridY: 18
		}
	});

	var ui = new Sprite("assets/ui.png", {
		heart: {
			offsetX: 0, 		
			offsetY: 0, 
			gridX: 8,
			gridY: 8
		},
		text: {
			offsetX: 0,
			offsetY: 8,
			gridX: 72,
			gridY: 16
		},
		cause: {
			offsetX: 0,
			offsetY: 40,
			gridX: 100,
			gridY: 8
		},
		score: {
			offsetX: 0,
			offsetY: 56,
			gridX: 100,
			gridY: 8
		},
		numbers: {
			offsetX: 0,
			offsetY: 64,
			gridX: 4,
			gridY: 8
		},
		lines: {
			offsetX: 0,
			offsetY: 72,
			gridX: 100,
			gridY: 8
		},
		border: {
			offsetX: 0,
			offsetY: 80,
			gridX: 24,
			gridY: 40
		}
	}); 

	var underwater = new Sprite("assets/underwater.png", {
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
		fish1: {
			offsetX: 0, 		
			offsetY: 96, 
			gridX: 32,
			gridY: 16
		},
		fish2: {
			offsetX: 0, 		
			offsetY: 112, 
			gridX: 64,
			gridY: 32
		},
		fish3: {
			offsetX: 0, 		
			offsetY: 144, 
			gridX: 64,
			gridY: 248
		}
	}); 

	Fish.underwaterSprite = underwater; 

	var player = new Player(game, canvas, _.random(1, 4));

	player.canvas = canvas; 
	player.inWater = false; 
	player.onSubmarine = false; 
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

	// Endgame 
	var distanceToPipe = 100;		
	var endgame = 0; 

	var fishes = []; 
	Fish.fishKilled = 0; 

	// Keys 
	var keys = new Keys();
	keys.bind();

	var startScreen = true; 
	var started = false; 
	var paused = false; 
	//var escReleased = true;

	keys.toggle("esc", function() {
		paused = !paused; 

		if (paused) {
			out.volume = 0;
		} else {
			out.volume = volume;
		}
	});

	var muted = false; 
	keys.toggle("m", function() {
		muted = !muted;

		if (muted) {
			out.volume = 0;
		} else {
			out.volume = volume;
		}
	});

/*
	keys.onKeyDown = function(name) {
		if (name == "esc") {
			if (escReleased) {
				escReleased = false; 
				paused = !paused; 
			}

			if (paused) {
				out.volume = 0;
			} else {
				out.volume = volume;
			}
		}
	};

	keys.onKeyUp = function(name) {
		if (name == "esc") {
			escReleased = true; 
		}
	};*/


	// Create characters
	var characters = _.map(_.range(4), function(number) { return new Character(number + 1); });

	var characterPositions = _.shuffle([
		[ 352, 175 ], 
		[ 120, 175 ],
		[ 430, 135 ],
		[ 57,  124 ]
	]);

	var chosenCharacter = false;

	function loop() {

		if (startScreen && !started) {

			canvas.flood("#888");

			// Mouse bounds 
			var mouseBounds = [canvas.mouseX,   canvas.mouseY,   1, 1]; 

			// Set the cursor to normal
			canvas.cursor("auto");

			// Check if we've already chosen a character 
			if (chosenCharacter) {

				// Draw the start button 
				canvas.drawSprite(start.get("button", 1, 1), canvas.centerX(52), canvas.centerY(18));

				// Check for clicks 
				var boxBounds  = [canvas.centerX(52), canvas.centerY(18), 104, 36]; 
					
				// Show bounds
				canvas.drawBounds(boxBounds);
				canvas.drawBounds(mouseBounds);

				if (collides(boxBounds, mouseBounds)) {
				
					if (canvas.mouseDown) {
						canvas.cursor("pointer");
						started = true; 
					} else {
						canvas.cursor("auto");
					}

				} 

			} else {

				canvas.drawImage(title, 0, 0, 217, 139, canvas.centerX(217), canvas.centerY(73));
	
				_.each(characterPositions, function(position, key) {
					canvas.drawSprite(characters[key].sprite.get("walking", 3), position[0], position[1] );
									
					// Box
					var boxBounds  = [position[0] - 8, position[1] - 5, 48, 80]; 
					
					// Show bounds
					canvas.drawBounds(boxBounds);
					canvas.drawBounds(mouseBounds);
					
					// Check for mouse hovers 
					if (collides(boxBounds, mouseBounds)) {
						canvas.drawSprite(ui.get("border", 1), position[0] - 8, position[1] - 5); 
					
						canvas.cursor("pointer");

						if (canvas.mouseDown) {
							chosenCharacter = true; 
							player.setCharacter(key + 1); 
						}

					} else {

						canvas.drawSprite(ui.get("border", 2), position[0] - 8, position[1] - 5, 0.1); 
					}

				}); 

				canvas.drawSprite(ui.get("lines", 1), canvas.centerX(44), 130); 

			}


			window.requestAnimationFrame(loop);
			return; 

		}

		if (paused) {
			
			window.requestAnimationFrame(loop);
			return ;
		}

		// Check for game over 
		if (player.health === 0) {

			canvas.flood("rgba(100, 0, 0, 0.8)");

			canvas.drawSprite(ui.get("text", 1), canvas.centerX(72), canvas.centerY(10)); 

			var causeSprite = player.lastDamageCause == "water" ? 1 : 2;
			canvas.drawSprite(ui.get("cause", 1, causeSprite), canvas.centerX(57), canvas.centerY(5) + 20); 

			return; 	
		}

		// Check for game won
		if (endgame > 200 && waterLevel < 0) {

			canvas.drawSprite(ui.get("text", 2), canvas.centerX(72), canvas.centerY(10)); 

			return; 
		}

		// Look for the 50ms tick 
		if (Date.now() - tickTime > 50) {
			ticks++; 
			Fish.ticks = ticks; 

			tickTime = Date.now(); 
		}

		// Background color 
		canvas.flood("#888");

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
		c.fillRect(-1, canvas.height() - waterLevel , canvas.width(), waterLevel); 

		// Don't do this in the endgame 
		if (!endgame) { 

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
					
					var whichDirt = 4; 
					//if (waterLevel > 120) {
					//	whichDirt++; 
					//}	
					
					canvas.drawSprite(start.get("button", 1, whichDirt), canvas.centerX(52), canvas.centerY(18) + ((waterLevel - 100) * 3) );
				} 	
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

		// Handle sound mixing 
		if (player.onSubmarine) {
			
			gainNode3.gain.value = 0;
			gainNode2.gain.value = 0; 
			gainNode1.gain.value = 1;

		} else if (player.isSubmarine) {
			gainNode3.gain.value = 0;
			gainNode2.gain.value = 1; 
			gainNode1.gain.value = 0; 
		} else if (player.inWater && player.headUnderWater) {
			gainNode3.gain.value = 1;
			gainNode2.gain.value = 0; 
			gainNode1.gain.value = 0; 
		} else {
			gainNode3.gain.value = 0;
			gainNode2.gain.value = 0; 
			gainNode1.gain.value = 1; 
		} 

		// And a pipe. We need a pipe. 
		if (endgame > 100) { 
 			canvas.drawSprite(underwater.get("pipe", 6) , 400, 500 - 24);
		} else {	
 			canvas.drawSprite(underwater.get("pipe", (ticks % 4) +2 ) , 400, 500 - 24);
 		}

 		// Is the pipe colliding with anything 
 		if (collides([400, 500 - (12 * game.scale), game.scale * 12, game.scale * 12], player.bounds())) {

 			// Yes, explain this if not in the end game
 			if (endgame === 0) {
				canvas.drawSprite(ui.get("cause", 1, (player.submarine ? -1 : 0) ), 180, 500 - 20); 
			}
 		}

 		// Is the sub colliding with anything 
 		var tmpSubBounds = [-60, 500 - 40, game.scale * 34, game.scale * 20]; 
 		if (!player.isSubmarine && collides(tmpSubBounds, player.bounds())) {

 			// Sub activated 
 			player.isSubmarine = true; 

 			// Move the player to the same place the sub was 
 			player.position = [-50, 500 - 40];
 		}

		// Show bounds
 		if (debug) { 
			c.strokeStyle = "white";
			c.strokeRect(tmpSubBounds[0] + 0.5, tmpSubBounds[1] + 0.5, tmpSubBounds[2], tmpSubBounds[3]); 
		}

		// Tell the player what keys are being pressed
		player.keys = keys;

		// Let it draw itself - not sure this is a good idea 
		player.draw();

		var giantX = false; 

		// Are we in the end game yet? 
		if (Fish.fishKilled > fishBeforeLevel3 && this.fishes.length === 0) { 
			endgame++; 

			// Giant fish comes in

			if (waterLevel < 20) {
				player.onSubmarine = true; 
			}

			if (endgame > 200) {
		
				// Drain water!
				waterLevel -= 2;

				// Go back
				giantX = (500 - distanceToPipe) + (endgame - 200); 

			} else if (endgame > distanceToPipe) {
				
				// Drain water!
				waterLevel -= 2;

				// Wait
				giantX = 500 - distanceToPipe;

			} else {

				// Go forward 
				giantX = 500 - endgame; 
			}

			canvas.drawSprite(underwater.get("fish3", 1), giantX, 300);

		} else {

			// If we've killed all the fish we need to, stop spawning fish
			if (Fish.fishKilled <= fishBeforeLevel3) { 

				// If the water is over 80, start spawning fish 
				if (waterLevel > 80) {

					// What are the chances? (somewhere around 1 in 100)
					if (_.random(1, 80) == 1) {
						this.fishes.push(new Fish(canvas));
					}

				}

			}

		}

		// Check if the missiles are colliding with the end game fish, or the pipe
		var testBounds = [ [400, 470, 20, 20] ];
		
		if (giantX !== false) {
			testBounds.push( [giantX, 300, 200, 90]);
			testBounds.push( [giantX, 440, 200, 90]);
		}


		player.missiles = _.map(player.missiles, function(missile) {
			
			var missileBounds = [missile.position[0] + 6, missile.position[1] + 10, 32, 8];

			_.each(testBounds, function(bounds) {
				if (debug) { 	
					// Show bounds
					c.strokeStyle = "white";
					c.strokeRect(bounds[0] + 0.5, bounds[1] + 0.5, bounds[2], bounds[3]); 
				}

				// Tell the missile it hit something 
				if (collides(bounds, missileBounds)) {
					missile.hit ++; 
				}
			});

			return missile;

		}); 


		// Draw every fish 
		fishCollide = false;  
		this.fishes = _.filter(this.fishes, function(fish) {

			// Check if this fish is colliding with the player 
			var fishBounds = fish.bounds("bitey"); 
			fishCollide = fishCollide || collides(fishBounds, player.bounds());

			// Check if the fish is colliding with any of the players missiles 
			var fishHit = false; 
			fishBounds = fish.bounds(); 
			player.missiles = _.map(player.missiles, function(missile) {
				
				var missileBounds = [missile.position[0] + 6, missile.position[1] + 10, 32, 8];

				if (debug) { 	
					// Show bounds
					c.strokeStyle = "white";
					c.strokeRect(missileBounds[0] + 0.5, missileBounds[1] + 0.5, missileBounds[2], missileBounds[3]); 
				}

				// Tell the missile it hit something 
				if (collides(fishBounds, missileBounds)) {
					missile.hit = true; 
					fishHit = true;
				}

				return missile;

			}); 

			if (fishHit) {
				Fish.fishKilled++;
				fish.die(); 
			}

			var keepFish = fish.draw();

			if (debug) { 
		
				// Show bounds
				c.strokeStyle = fishHit ? "red" : "white"; 
				c.strokeRect(fishBounds[0] + 0.5, fishBounds[1] + 0.5, fishBounds[2], fishBounds[3]); 
				c.strokeRect(fishBounds[0] + 1.5, fishBounds[1] + 1.5, 1, 1); 

				fishBounds = fish.bounds("bitey"); 

				// Show bounds
				c.strokeStyle = "yellow"; 
				c.strokeRect(fishBounds[0] + 0.5, fishBounds[1] + 0.5, fishBounds[2], fishBounds[3]); 
				c.strokeRect(fishBounds[0] + 1.5, fishBounds[1] + 1.5, 1, 1); 

			}


			return keepFish; 
		});

		// Are we being eaten by a fish?
		if (fishCollide) {
			player.hitByFish = true; 
		}

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

		var layoutX = healthX + 12; 
		var layoutY = 10; 
		canvas.drawSprite(ui.get("score", 1), layoutX, layoutY);

		layoutX += 90;

		var fishText = Fish.fishKilled + "";
		_.each(fishText.split(""), function(number) {
			
			var sprite = parseInt(number);
			sprite = sprite === 0 ? 10 : sprite; 

			canvas.drawSprite(ui.get("numbers", sprite), layoutX, layoutY);

			layoutX += 8;
		}); 

		// Debug code 
		var debugY = 20; 
		var debugOffsetX = layoutX; 

		c.font = "14px Helvetica";

		if (debug) { 
		
			// Show bounds
			var playerBounds = player.bounds(); 
			c.strokeStyle = fishCollide ? "red" : "white"; 
			c.strokeRect(playerBounds[0] + 0.5, playerBounds[1] + 0.5, playerBounds[2], playerBounds[3]); 
			c.strokeRect(playerBounds[0] + 1.5, playerBounds[1] + 1.5, 1, 1); 
		}

		if (debugConsole) {

			c.fillStyle = "rgba(255, 255, 255, 0.5)";
			c.fillText("DmgTyp: " + player.lastDamageCause, debugOffsetX + 150, debugY); 
			c.fillText("FPS: " + Math.round(frames / ((Date.now() - startTime) / 1000)), debugOffsetX + 20, debugY); 
		}	

		// Request the next frame 
		window.requestAnimationFrame(loop);

	}

	window.requestAnimationFrame(function() {
		loop();
	});


	


};