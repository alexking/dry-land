var Character = function(which) {

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

	this.player = new CanvasImage("assets/character" + character[1] + ".png"); 

	this.player.translateColors = characterSchemes[character[0]];

	this.sprite = new Sprite(this.player.drawable(), {
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
};

