function prefices() {
	return ["", "o", "ms", "moz", "webkit"];
}

function hexToRGB(hex) {
	var components = [];

	// Shift and mask
	components.push( (hex >> (8 * 2) ) & 0xFF);
	components.push( (hex >> (8 * 1) ) & 0xFF);
	components.push( (hex >> (8 * 0) ) & 0xFF);

	return components;
}

function collides(a, b) {

	//  ( aLeft < bRight ) && (aLeft > bLeft)
	//  aX   < bX   + bW   && aX   > bX   && 
	//  aY   < bY   + bH   && aY   > bY  
	if (a[0] <= b[0] + b[2] && a[0] + a[2] >= b[0] &&
		a[1] <= b[1] + b[3] && a[1] + a[3] >= b[1]) {
		return true; 
	}

}

// LUDUM-style tests 
/*
console.log("--- Tests ---");
assert(true  , collides([0, 0, 5, 5], [3, 3, 5, 5]) );
assert(true  , collides([3, 3, 5, 5], [0, 0, 5, 5]) );

assert(false , collides([0, 0, 5, 5], [6, 6, 5, 5]) );
assert(false , collides([6, 6, 5, 5], [0, 0, 5, 5]) );

assert(false , collides([0, 0, 5, 5], [2, 10, 5, 5]) );

console.log("------------");


function assert(a, b) {
	if (a == b) {
		console.log("✓ Pass (" + a + " == " + b + ")");
	} else {
		console.log("X Fail (" + a + " != " + b + ")");
	}
}
*/