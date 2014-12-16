/**
 * Particle Systems
 */

var ParticleSystem = function(canvas, defaults) {
	this.canvas = canvas;

	this.emitters  = [];
	this.particles = []; 

	if (_.isUndefined(defaults)) {
		defaults = {};
	}

	_.defaults(defaults, {
		color: [255, 255, 255],
		lifetime: 250,
		velocity: [1, 0],
		randomVelocity: [0.5, 0.5],
		randomJitter: [0, 0],
		fade : true
	});

	// Particle defaults 
	this.defaults = defaults; 
};

ParticleSystem.prototype.draw = function() {
	var c = this.canvas.c; 

	// Emitters
	this.emitters = _.filter(this.emitters, function(emitter) {
		
		// Let the emitter emit things 
		return emitter.emit();

	});

	// Particles
	this.particles = _.filter(this.particles, function(particle) {

		// Draw
		return particle.draw();

	});


};

ParticleSystem.prototype.addParticle = function(position, options) {

	var particle = new Particle(this, position, options);

	this.particles.push(particle);

	return particle; 
};

ParticleSystem.prototype.addEmitter = function(position, data, rate) {
	
	// Construct
	var emitter = new ParticleEmitter(this, position, data, rate);
	
	// Add to emitters 
	this.emitters.push(emitter);

	return emitter; 
};

/**
 * ParticleEmitter
 * @param ParticleSystem  parent system
 * @param tuple           position 
 * @param array           data     array of arrays
 */
var ParticleEmitter = function(system, position, data, rate) {
	this.system = system; 
	this.position = position;
	this.data = data; 	
	this.rate = rate; 
	this.dead = false; 
};

ParticleEmitter.prototype.emit = function() {

	var self = this; 
	var canvas = this.system.canvas; 

	_.eachPixel(this.data, function(x, y, freq) {
	
		// Do we emit from this?
		if (freq) { 
			
			// Check if we should emit this time 
			if (_.random(1, self.rate) == 1) {

				self.system.addParticle([self.position[0] + x * canvas.scale, self.position[1] + y * canvas.scale]);

				// Emit!
				if (debug) {
					canvas.c.fillStyle = "red";
					canvas.c.fillRect(self.position[0] + x * canvas.scale, self.position[1] + y * canvas.scale, canvas.scale,canvas. scale);
				}
			}

		}

	});

	return ! this.dead; 

};

var Particle = function(system, position, options) {
	if (_.isUndefined(options)) {
		options = {};
	}

	this.system = system;
	this.position = position;
	this.options = options; 

	_.defaults(this.options, this.system.defaults);

	// Random velocity must be evaluated now 
	this.options.velocity = [ 
		this.options.velocity[0] + (_.random(-10, 10) / 10) * this.options.randomVelocity[0],
		this.options.velocity[1] + (_.random(-10, 10) / 10) * this.options.randomVelocity[1],
	];

	this.life = 0;
};

Particle.prototype.draw = function() {

	var scale = this.system.canvas.scale; 

	this.life++; 


	var color = this.options.color; 
	var opacity = color[3] * (1.0 - (this.life / this.options.lifetime ));

	this.system.canvas.c.fillStyle = "rgba(" + color[0] + ", " + color[1] + ", " + color[2] + ", " + opacity + ")";
	this.system.canvas.c.fillRect(this.position[0] , this.position[1] , scale, scale);

	var randomJitter = [
		(_.random(-10, 10) / 10) * this.options.randomJitter[0], 
		(_.random(-10, 10) / 10) * this.options.randomJitter[1]
	];

	// Move ourselves 
	this.position[0] += this.options.velocity[0] + randomJitter[0];
	this.position[1] += this.options.velocity[1] + randomJitter[1];

	if (this.life > this.options.lifetime) {
		return false;
	}

	return true; 
};



