var Test = function(projectName) {
	this.projectName = projectName; 
};

Test.prototype.hi = function() {
	console.log("Hello and welcome to " + this.projectName);
};