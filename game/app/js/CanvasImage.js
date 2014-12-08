var CanvasImage = function(url) {
	this.debug = false;
	this.translateColors = false; 

	this.canvas = document.createElement("canvas");
	this.canvas.width = 1;
	this.canvas.height = 1;
	this.context = this.c = this.canvas.getContext("2d"); 
	this.c.fillRect(0, 0, 1, 1);

	this.image = new Image();
	this.image.src = url;

	var self = this; 
	this.image.onload = function() { self.loaded(); }; 
}; 

CanvasImage.prototype.loaded = function() {

	this.canvas.width = this.image.width;
	this.canvas.height = this.image.height;

	this.context.drawImage(this.image, 0, 0);

	this.replaceColors(); 

	if (this.debug) {
		document.body.appendChild(this.canvas);
	}
};

CanvasImage.prototype.drawable = function() {
	return this.canvas;
};

CanvasImage.prototype.replaceColors = function() {

	if (this.translateColors) {

		var imageData = this.c.getImageData(0, 0, this.canvas.width, this.canvas.height);
		var data = imageData.data; 

		for (var i = 0; i < data.length; i += 4) {
			var r = data[i];
			var g = data[i + 1];
			var b = data[i + 2];
			var a = data[i + 3];

		//	var hex = (r * 65536) + (g * 256) + b; 
			var rgb = r + "," + g + "," + b;


			if (typeof this.translateColors[rgb] !== "undefined") {
					
				var newColor = hexToRGB(this.translateColors[rgb]);
			
				data[i] 	= newColor[0]; 
				data[i + 1] = newColor[1]; 
				data[i + 2] = newColor[2]; 
			}

		}

		this.c.putImageData(imageData, 0, 0);

	}
};
