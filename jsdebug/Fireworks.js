// ### Note my stupid frameework (easy to loose the track):
// Scenario must call MoW_templates::checkAssets(assets, assetsCount, msg)
// which calls MoW_templates::showOverlay(message), which creates overlay and startButton
// Otherwise scenario must call showOverlay() directly.

/* Adding gfWebRecorder.
*  Not changing any functionality except sound:  adding THREE.Listener to get sound stream.
*/


// Uses MoW_template.js as bootstrap template

// Using sprit-js SJS scene
// SJS scene is rendered as <div class="sjs" id="sjs0" ...>
// Layers are rendered as children:
// default: <div id="sjs0-default" ...>
// layer: <canvas id="sjs0-layer" ...>		// firework
// layer: <canvas id="sjs0-layermow" ...>	// fireballs

// Fireballs launching workflow:
/*
loop: fireworkPaint() =>
launchTargetedFirework(charCenters[charIdx][0], charCenters[charIdx][1]) =>
// Create new (custom: charIdx) firework and add to collection.
fireworks.push(new Firework(startX, startY, endX, endY, charIdx))

Firework.prototype.update =>
launchFireballs(this.mowi);
*/

var scenario = "fireworks";
var recordingDisabled = false;
var recordingChecked = false;

// NB: imgarray is only used in scene.loadImages(imgarray, startFire);
// sprites are created dynamically using imgs pathnames
var imgarray = ['imgs/city_backdrop.jpg',
	'imgs/fireworks/fire_sprite_h0.png', 'imgs/fireworks/fire_sprite_h1.png', 'imgs/fireworks/fire_sprite_h2.png', 'imgs/fireworks/fire_sprite_h3.png', 'imgs/fireworks/fire_sprite_h4.png',
	'imgs/fireworks/fireball_sprite_h0.png', 'imgs/fireworks/fireball_sprite_h1.png', 'imgs/fireworks/fireball_sprite_h2.png', 'imgs/fireworks/fireball_sprite_h3.png', 'imgs/fireworks/fireball_sprite_h4.png'];

var soundsarray = ['sounds/misc114.mp3', 'sounds/fireworks.mp3', 'sounds/zvuk-saljuta.mp3'];

// === SPRITE stuff ===
//#region SPRITE vars
var scene;
var layerBkg;		// 'background'
var layer;			// 'layer'
var layerMow;		// 'layermow'
var context;
var contextMow;
var imageBkg;
var spriteSize = 32;

var targetScale = 1.0;
var density = 0.6;	//1.0;

var hotspotX = 112;
var hotspotY = 16;

var cycle;
var cycle1;	// make movement smoother, not all at once

var ticker = null;	// mark that ticker exist but not initialized yet
var sprites = [];
//#endregion

// Charwise fireballs. charCenters[] is defined in ShowRaster.js. bangCenters[] - array of randomly shifted from charCenters points.
var charIdx = 0;
var bangCenters = [];
// number of 'prelude' fireworks before firing charwise ones
var preludeCount = 0;
var fireworksCount = 0;
// number of fireballs at home position
var homecount = 0;
var hueidx = Math.floor(random(0, 5));
var imgname;
var imgballname;

// shuffled indexes array (to launch fireballs in random order)
var idxMap;

// Audio
const listener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();
let audioSwoosh, audioFireworks, audioBang;

// Capture
let canvasBkg, canvas, frontCanvas;

// === CONFIGURATION ===
//#region CONFIGURATION
// Base firework acceleration.
// 1.0 causes fireworks to travel at a constant speed.
// Higher number increases rate firework accelerates over time.
const FIREWORK_ACCELERATION = 1.05;
// Minimum firework brightness.
const FIREWORK_BRIGHTNESS_MIN = 50;
// Maximum firework brightness.
const FIREWORK_BRIGHTNESS_MAX = 70;
// Base speed of fireworks.
const FIREWORK_SPEED = 5;
// Base length of firework trails.
const FIREWORK_TRAIL_LENGTH = 6;	// 3;
// Determine if target position indicator is enabled.
const FIREWORK_TARGET_INDICATOR_ENABLED = false;

// Minimum particle brightness.
const PARTICLE_BRIGHTNESS_MIN = 50;
// Maximum particle brightness.
const PARTICLE_BRIGHTNESS_MAX = 80;
// Base particle count per firework.
const PARTICLE_COUNT = 100;
// Minimum particle decay rate.
const PARTICLE_DECAY_MIN = 0.015;
// Maximum particle decay rate.
const PARTICLE_DECAY_MAX = 0.03;
// Base particle friction.
// Slows the speed of particles over time.
const PARTICLE_FRICTION = 0.95;
const PARTICLE_FRICTION_FINAL = 0.9;	// GF
// Base particle gravity.
// How quickly particles move toward a downward trajectory.
const PARTICLE_GRAVITY = 0.7;
// Variance in particle coloration.
const PARTICLE_HUE_VARIANCE = 20;
// Base particle transparency.
const PARTICLE_TRANSPARENCY = 1;
// Minimum particle speed.
const PARTICLE_SPEED_MIN = 1;
// Maximum particle speed.
const PARTICLE_SPEED_MAX = 10;
// Base length of explosion particle trails.
const PARTICLE_TRAIL_LENGTH = 8;	// 5;

// Alpha level that canvas cleanup iteration removes existing trails.
// Lower value increases trail duration.
const CANVAS_CLEANUP_ALPHA = 0.15;
// Hue change per loop, used to rotate through different firework colors.
const HUE_STEP_INCREASE = 0.5;

// Minimum number of ticks per manual firework launch.
const TICKS_PER_FIREWORK_MIN = 5;
// Minimum number of ticks between each automatic firework launch.
const TICKS_PER_FIREWORK_AUTOMATED_MIN = 20;
// Maximum number of ticks between each automatic firework launch.
const TICKS_PER_FIREWORK_AUTOMATED_MAX = 80;
//#endregion
// === END CONFIGURATION ===

// === LOCAL VARS ===
//#region LOCAL VARS
//// Canvas dimentions set above for SJS
//// let canvas = document.getElementById('canvas');
// Set canvas dimensions.
//// canvas.width = window.innerWidth;
//// canvas.height = window.innerHeight;
// Set the context, 2d in this case.
//// let context = canvas.getContext('2d');

// Firework and particles collections.
let fireworks = [], particles = [];
// Mouse coordinates.
let mouseX, mouseY;
// Variable to check if mouse is down.let isMouseDown = false;
// Initial hue.
let hue = 120;
// Track number of ticks since automated firework.
let ticksSinceFireworkAutomated = 0;
// Track number of ticks since manual firework.
let ticksSinceFirework = 0;

let fireballs = [];

// targeted fireworks salvo start flag
let salvoOn = false;
//#endregion
// === END LOCAL VARS ===

//#region RASTER
// <scenario> calls ShowRaster::getRaster() => callback: <scenario>::RasterReady()
// ShowRaster::rasterParams shoul be ready here.

// multi-slogan functionality
let iloop = 0;
let loopCount = 1;	// nSalvos = 1;	// 2;

const slogans = rasterParams.text.split('||');
if (slogans.length > loopCount)
	loopCount = slogans.length;

// NB: uses global rasterParams object (ShowRaster.js). Set other properties if/as needed.
rasterParams.fontFamily = 'LED';

// optional 'slogan' param - to override rasterParams.text for multi-slogan scenarios.
getRaster(rasterReady, slogans[iloop]);

// callback
// strange thing happening... rasterReady() called more than once, breaking checkAssets() logic.
// Using safety catch myAssetsCount

let myAssetsCount = -1;
function rasterReady(result) {
	console.log("rasterReady('", result.Text, "')");

	if (myAssetsCount > 0) {
		console.warn("NB: extra call of rasterReady('", result.Text, "'); skipping.");
		return;
	}

	if (result.Success)
		isRasterReady = true;

	// raster = result;	// use global raster from ShowRaster
	rasterCount = getRasterCount(result);   // ShowRaster.js

	assetsCount++;
	checkAssets(assets, assetsCount, 'raster');

	myAssetsCount = assetsCount;

	// multi-slogan support:
	if (iloop > 0) {
		// repeat
		console.log(`Loop: ${iloop} Slogan: ${slogans[iloop]}`);

		// for some absolutely misterious reason raster (defined in ShowRaster) stays unchanged from loop 0!?
		raster = result;	// re-assign to be sure

		nextLoop();
	}
}
//#endregion


/////////////// Overlay: [PLAY] button ///////////////
// OnClick: MoW_template::startScenario() => startShow()
///////////////

//#region LOADING
// assets: 1: raster, 2: audioSwoosh. 3: audioFireworks, 4: audioBang (Optional 5: imageBkg)
let assets = 4;
let assetsCount = 0;

initAssets();

function initAssets() {
	console.log('initAssets()');

	// 2021-05-12 addition - bkg url param
	// urlParams: showRaster.js
	let bkgrequested = urlParams.get('bkg');

	////// using THREE loaders
	// audio
	audioSwoosh = new THREE.Audio(listener);
	audioFireworks = new THREE.Audio(listener);
	audioBang = new THREE.Audio(listener);

	audioLoader.load(soundsarray[0], function (buffer) {
		audioSwoosh.setBuffer(buffer);
		audioSwoosh.setLoop(false);
		audioSwoosh.setVolume(0.1);

		assetsCount++;
		checkAssets(assets, assetsCount, 'audioSwoosh');
	});
	audioLoader.load(soundsarray[1], function (buffer) {
		audioFireworks.setBuffer(buffer);
		audioFireworks.setLoop(false);
		audioFireworks.setVolume(1);

		assetsCount++;
		checkAssets(assets, assetsCount, 'audioFireworks');
	});
	audioLoader.load(soundsarray[2], function (buffer) {
		audioBang.setBuffer(buffer);
		audioBang.setLoop(false);
		audioBang.setVolume(1);

		assetsCount++;
		checkAssets(assets, assetsCount, 'audioBang');
	});

	// bkg image
	if (null !== bkgrequested) {
		imgarray[0] = 'imgs/bkg/' + bkgrequested + '.jpg';
		assets++;
	}

	imageBkg = new Image();
	imageBkg.src = imgarray[0];
	imageBkg.onload = function () {
		assetsCount++;
		checkAssets(assets, assetsCount, 'imageBkg');
	}
}

// init is called from MoW_templates() when all assets are loaded
function init() {
	console.log("Fireworks: init(): void");
}

//#endregion

// reset counters; change index map and colors; (re)create bangCenters array - randomly shifted from charCenters
function resetFireBalls(min, max) {
	charIdx = 0;
	preludeCount = Math.floor(random(min, max));
	// fireworksCount = 0;	// no need to wait for prelude on the 2nd loop

	// remap chars
	idxMap = createIdxMap(charCenters.length);

	// reset bangCenters
	let targetSize = targetScale * spriteSize;
	for (let i = 0; i < charCenters.length; i++) {
		let x = charCenters[i].X + targetSize * random(-1, 1);
		let y = charCenters[i].Y + targetSize * random(-1, 1);

		if (bangCenters.length < charCenters.length) {
			bangCenters.push(new Object());
		}
		bangCenters[i].X = x;
		bangCenters[i].Y = y;
	}

	// change color
	hueidx = Math.floor(random(0, 5));
	imgname = 'imgs/fireworks/fire_sprite_h' + hueidx + '.png';
	imgballname = 'imgs/fireworks/fireball_sprite_h' + hueidx + '.png';
}

// multi-slogan addition: next loop with new raster
function nextLoop() {
	// Safety valve: remove old sprites - faded sprites should be already removed
	for (var i = 0, sp; sp = sprites[i]; i++) {
		cycle.remove(sp);
	}
	sprites = [];
	homecount = 0;

	// InitRaster(ctx, rcInput, show = false)
	InitRaster(contextMow, rcInput, true);	// ShowRaster.js
	targetScale = getTargetScale(rcBanner, spriteSize, spriteSize, getRasterCount(raster), density);
	resetFireBalls(5, 10);
}

// Banner in % of context
var rcInput = new Rectangle(5, 95, 5, 35);

function startFire() {
	// fireworks context
	context = scene.layers.layer.ctx;
	// fireballs context
	contextMow = scene.layers.layermow.ctx;

	nextLoop();

	// offx, offy, ticks
	cycle = sjs.Cycle([[0, 0, 5],
	[0, 32, 5],
	[0, 64, 5],
	[0, 96, 5],
	[0, 128, 5],
	[0, 160, 5],
	[0, 192, 5],
	[0, 224, 5]]);

	// 2nd cycle to make movement smoother
	cycle1 = sjs.Cycle([[0, 0, 3],
	[0, 32, 3],
	[0, 64, 3],
	[0, 96, 3],
	[0, 128, 3],
	[0, 160, 3],
	[0, 192, 3],
	[0, 224, 3]]);

	cycle.addSprites(sprites);

	idxMap = createIdxMap(charCenters.length);
}

///// SPRITE stuff end

// === HELPERS ===
//#region HELPERS
// Get a random number within the specified range.
function random(min, max) {
	return Math.random() * (max - min) + min;
}

// Calculate the distance between two points.
function calculateDistance(aX, aY, bX, bY) {
	let xDistance = aX - bX;
	let yDistance = aY - bY;
	return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}
//#endregion
// === END HELPERS ===

// === EVENT LISTENERS ===
//#region EVENT LISTENERS
// Track current mouse position within canvas. // GF: replace 'canvas.addEventListener' = > 'body.addEventListener'
document.body.addEventListener('mousemove', (e) => {
	mouseX = e.pageX;	// - canvas.offsetLeft
	mouseY = e.pageY;	// - canvas.offsetTop
});

// Track when mouse is pressed.
document.body.addEventListener('mousedown', (e) => {
	e.preventDefault()
	isMouseDown = true

	e = e || window.event;
	var elementId = (e.target || e.srcElement).id;
});

// Track when mouse is released.
document.body.addEventListener('mouseup', (e) => {
	e.preventDefault()
	isMouseDown = false
});

// DeepSeek: Function to center the canvas horizontally (using my setVideoSize())
function centerCanvas() {
	// scenario_trhree_template.js: returns max contained size of given aspect
	let size = setVideoSize(16, 9);

	// Calculate the left margin to center the canvas
	const marginLeft = (window.innerWidth - size.W) / 2;

	// apply to container DIV
	divScene = $('div#sjs0')[0];

	////////////////////// center viewport

	divScene.style.setProperty('object-fit', 'contain', 'important');
	divScene.style.setProperty('object-position', '50% 50%', 'important');

	divScene.style.setProperty('margin-left', 'auto', 'important');
	divScene.style.setProperty('margin-right', 'auto', 'important');

	//////////////////////
}

// Re-center the canvas on window resize
window.addEventListener('resize', centerCanvas);

//#endregion
// === END EVENT LISTENERS ===

// === PROTOTYPING ===
//#region PROTOTYPING
// Creates a new firework.
// Path begins at 'start' point and ends and 'end' point.
// GF: custom params: mowi, mowj - char and point indexes
// add mowi param to Firework
// add mowi, mowij params to Fireball
function Firework(startX, startY, endX, endY, mowi) {
	// Set current coordinates.
	this.x = startX;
	this.y = startY;
	// Set starting coordinates.
	this.startX = startX;
	this.startY = startY;
	// Set end coordinates.
	this.endX = endX;
	this.endY = endY;
	// Get the distance to the end point.
	this.distanceToEnd = calculateDistance(startX, startY, endX, endY);
	this.distanceTraveled = 0;
	// Create an array to track current trail particles.
	this.trail = [];
	// Trail length determines how many trailing particles are active at once.
	this.trailLength = FIREWORK_TRAIL_LENGTH;
	// While the trail length remains, add current point to trail list.
	while (this.trailLength--) {
		this.trail.push([this.x, this.y]);
	}
	// Calculate the angle to travel from start to end point.
	this.angle = Math.atan2(endY - startY, endX - startX);
	// Set the speed.
	this.speed = FIREWORK_SPEED;
	// Set the acceleration.
	this.acceleration = FIREWORK_ACCELERATION;
	// Set the brightness.
	this.brightness = random(FIREWORK_BRIGHTNESS_MIN, FIREWORK_BRIGHTNESS_MAX);
	// Set the radius of click-target location.
	this.targetRadius = 2.5;

	// GF: mowi - char index. If defined -  launch fireballs
	//this.mowi = (typeof mowi === 'undefined') ? -1 : mowi;
	if (typeof mowi === 'undefined') {
		this.mowi = -1;
	}
	else {
		this.mowi = mowi;
	}

	fireworksCount++;
}

// Update a firework prototype.
// 'index' parameter is index in 'fireworks' array to remove, if journey is complete.
Firework.prototype.update = function (index) {
	// Remove the oldest trail particle.
	this.trail.pop();
	// Add the current position to the start of trail.
	this.trail.unshift([this.x, this.y]);

	// Animate the target radius indicator.
	if (FIREWORK_TARGET_INDICATOR_ENABLED) {
		if (this.targetRadius < 8) {
			this.targetRadius += 0.3;
		} else {
			this.targetRadius = 1;
		}
	}

	// Increase speed based on acceleration rate.
	this.speed *= this.acceleration;

	// Calculate current velocity for both x and y axes.
	let xVelocity = Math.cos(this.angle) * this.speed * ticker.lastTicksElapsed;
	let yVelocity = Math.sin(this.angle) * this.speed * ticker.lastTicksElapsed;
	// Calculate the current distance travelled based on starting position, current position, and velocity.
	// This can be used to determine if firework has reached final position.
	this.distanceTraveled = calculateDistance(this.startX, this.startY, this.x + xVelocity, this.y + yVelocity);

	// Check if final position has been reached (or exceeded).
	if (this.distanceTraveled >= this.distanceToEnd) {
		// Destroy firework by removing it from collection.
		fireworks.splice(index, 1);
		// Create particle explosion at end point.  Important not to use this.x and this.y, 
		// since that position is always one animation loop behind.
		createParticles(this.endX, this.endY);

		//// GF
		if (this.mowi > -1) {
			launchFireballs(this.mowi);

			// hiss-bang
			audioFireworks.isPlaying = false;
			audioFireworks.offset = 0.0;
			audioFireworks.startTime = 0.0;

			audioFireworks.play();
		}
		else {
			// swoosh
			audioSwoosh.isPlaying = false;
			audioSwoosh.offset = 0.0;
			audioSwoosh.startTime = 0.0;

			audioSwoosh.play();
		}
	} else {
		// End position hasn't been reached, so continue along current trajectory by updating current coordinates.
		this.x += xVelocity;
		this.y += yVelocity;
	}
}

// Draw a firework.
// Use CanvasRenderingContext2D methods to create strokes as firework paths. 
Firework.prototype.draw = function () {
	// Begin a new path for firework trail.
	context.beginPath();
	// Get the coordinates for the oldest trail position.	
	let trailEndX = this.trail[this.trail.length - 1][0];
	let trailEndY = this.trail[this.trail.length - 1][1];
	// Create a trail stroke from trail end position to current firework position.
	context.moveTo(trailEndX, trailEndY);
	context.lineWidth = 1;
	context.lineTo(this.x, this.y);
	// Set stroke coloration and style.
	// Use hue, saturation, and light values instead of RGB.
	context.strokeStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
	// Draw stroke.
	context.stroke();

	if (FIREWORK_TARGET_INDICATOR_ENABLED) {
		// Begin a new path for end position animation.
		context.beginPath();
		// Create an pulsing circle at the end point with targetRadius.
		context.arc(this.endX, this.endY, this.targetRadius, 0, Math.PI * 2);
		// Draw stroke.
		context.stroke();
	}
}

// Creates a new particle at provided 'x' and 'y' coordinates.
function Particle(x, y) {
	// Set current position.
	this.x = x;
	this.y = y;
	// To better simulate a firework, set the angle of travel to random value in any direction.
	this.angle = random(0, Math.PI * 2);
	// Set friction.
	this.friction = PARTICLE_FRICTION;
	// Set gravity.
	this.gravity = PARTICLE_GRAVITY;
	// Set the hue to somewhat randomized number.
	// This gives the particles within a firework explosion an appealing variance.
	this.hue = random(hue - PARTICLE_HUE_VARIANCE, hue + PARTICLE_HUE_VARIANCE);
	// Set brightness.
	this.brightness = random(PARTICLE_BRIGHTNESS_MIN, PARTICLE_BRIGHTNESS_MAX);
	// Set decay.
	this.decay = random(PARTICLE_DECAY_MIN, PARTICLE_DECAY_MAX);
	// Set speed.
	this.speed = random(PARTICLE_SPEED_MIN, PARTICLE_SPEED_MAX);
	// Create an array to track current trail particles.
	this.trail = [];
	// Trail length determines how many trailing particles are active at once.
	this.trailLength = PARTICLE_TRAIL_LENGTH;
	// While the trail length remains, add current point to trail list.
	while (this.trailLength--) {
		this.trail.push([this.x, this.y]);
	}
	// Set transparency.
	this.transparency = PARTICLE_TRANSPARENCY;
}

// Update a particle prototype.
// 'index' parameter is index in 'particles' array to remove, if journey is complete.
Particle.prototype.update = function (index) {
	// Remove the oldest trail particle.
	this.trail.pop();
	// Add the current position to the start of trail.
	this.trail.unshift([this.x, this.y]);

	// Decrease speed based on friction rate.
	this.speed *= this.friction;
	// Calculate current position based on angle, speed, and gravity (for y-axis only).
	this.x += Math.cos(this.angle) * this.speed * ticker.lastTicksElapsed;
	this.y += Math.sin(this.angle) * this.speed * ticker.lastTicksElapsed + this.gravity;

	// MoW: parent fireball drift
	if (typeof this.parent !== "undefined") {
		if (parent.dy != 0) {
			this.x += this.parent.dx;
			this.y += this.parent.dy;
		}
	}

	// Apply transparency based on decay.
	this.transparency -= this.decay;
	// Use decay rate to determine if particle should be destroyed.
	if (this.transparency <= this.decay) {
		// Destroy particle once transparency level is below decay.

		// MoW!
		if (typeof this.parent !== "undefined") {
			// decrement parent FireBall live particles counter
			this.parent.liveparticles--;
		}

		particles.splice(index, 1);
	}
}

// Draw a particle.
// Use CanvasRenderingContext2D methods to create strokes as particle paths. 
Particle.prototype.draw = function () {
	// Begin a new path for particle trail.
	context.beginPath();
	// Get the coordinates for the oldest trail position.	
	let trailEndX = this.trail[this.trail.length - 1][0];
	let trailEndY = this.trail[this.trail.length - 1][1];
	// Create a trail stroke from trail end position to current particle position.


	//// MoW FireBall
	if (typeof this.parent !== "undefined") {
		let w = Math.floor(random(1, 16));
		context.lineWidth = w;	// 15;
	}
	else
		context.lineWidth = 1;

	context.moveTo(trailEndX, trailEndY);
	context.lineTo(this.x, this.y);
	// Set stroke coloration and style.
	// Use hue, brightness, and transparency instead of RGBA.
	context.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.transparency})`;
	context.stroke();
}
//#endregion
// === END PROTOTYPING ===

// === APP HELPERS ===
//#region APP HELPERS
// Cleans up the canvas by removing older trails.
//
// In order to smoothly transition trails off the canvas, and to make them 
// appear more realistic, we're using a composite fill.
// Set the initial composite mode to 'destination-out' to keep content that
// overlap with the fill we're adding.
//
// see: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
function cleanCanvas() {
	// Set 'destination-out' composite mode, so additional fill doesn't remove non-overlapping content.
	context.globalCompositeOperation = 'destination-out';
	// Set alpha level of content to remove.
	// Lower value means trails remain on screen longer.
	context.fillStyle = `rgba(0, 0, 0, ${CANVAS_CLEANUP_ALPHA})`;
	// Fill entire canvas.
	context.fillRect(0, 0, context.canvas.width, context.canvas.height);
	// Reset composite mode to 'lighter', so overlapping particles brighten each other.
	context.globalCompositeOperation = 'lighter';
}

// Create particle explosion at 'x' and 'y' coordinates.
function createParticles(x, y) {
	// Set particle count.
	// Higher numbers may reduce performance.
	let particleCount = PARTICLE_COUNT;
	while (particleCount--) {
		// Create a new particle and add it to particles collection.
		particles.push(new Particle(x, y));
	}
}

function createParticles_gf(x, y, f = 1) {
	// Set particle count.
	// Higher numbers may reduce performance.
	let particleCount = 4;	// PARTICLE_COUNT / 16;
	while (particleCount--) {
		// Create a new particle and add it to particles collection.
		let p = new Particle(x, y);
		p.speed *= f;
		p.friction = PARTICLE_FRICTION_FINAL;
		p.gravity /= 4;
		particles.push(p);
	}
}

// Launch fireworks automatically.
function launchAutomatedFirework(context) {
	// Determine if ticks since last automated launch is greater than random min/max values.
	if (ticksSinceFireworkAutomated >= random(TICKS_PER_FIREWORK_AUTOMATED_MIN, TICKS_PER_FIREWORK_AUTOMATED_MAX)) {
		// Check if mouse is not currently clicked.
		if (!isMouseDown) {
			// Set start position to bottom center.
			let startX = context.canvas.width / 2;
			let startY = context.canvas.height;
			// Set end position to random position, somewhere in the top half of screen.
			let endX = random(0, context.canvas.width);
			let endY = random(0, context.canvas.height / 2);
			// Create new firework and add to collection.
			fireworks.push(new Firework(startX, startY, endX, endY));
			// Reset tick counter.
			ticksSinceFireworkAutomated = 0;
		}
	} else {
		// Increment counter.
		ticksSinceFireworkAutomated++;
	}
}

// Launch firework to the target (char center)
// # increments charIdx
function launchTargetedFirework(endX, endY) {

	//if (0 == charIdx) {
	//	salvoOn = true;	// start of salvo
	//	// alert('salvo ON');
	//}

	// Set start position to bottom center.
	let startX = context.canvas.width / 2;
	let startY = context.canvas.height;

	// Create new firework and add to collection. Assign random index.
	fireworks.push(new Firework(startX, startY, endX, endY, idxMap[charIdx]));

	// Reset tick counter.
	ticksSinceFirework = 0;

	// increment counter
	charIdx++;
}
////

// Launch fireworks manually, if mouse is pressed.
function launchManualFirework() {
	// Check if ticks since last firework launch is less than minimum value.
	if (ticksSinceFirework >= TICKS_PER_FIREWORK_MIN) {
		// Check if mouse is down.
		if (isMouseDown) {
			// Set start position to bottom center.
			let startX = context.canvas.width / 2;
			let startY = context.canvas.height;
			// Set end position to current mouse position.
			let endX = mouseX;
			let endY = mouseY;
			// Create new firework and add to collection.
			fireworks.push(new Firework(startX, startY, endX, endY));

			// Reset tick counter.
			ticksSinceFirework = 0;
		}
	} else {
		// Increment counter.
		ticksSinceFirework++;
	}
}

// Update all active fireworks.
function updateFireworks() {
	// Loop backwards through all fireworks, drawing and updating each.
	for (let i = fireworks.length - 1; i >= 0; --i) {
		fireworks[i].draw();
		fireworks[i].update(i);
	}
}

// Update all active particles.
function updateParticles() {
	// Loop backwards through all particles, drawing and updating each.
	for (let i = particles.length - 1; i >= 0; --i) {
		particles[i].draw();
		particles[i].update(i);
	}
}
//#endregion
// === END APP HELPERS ===

//// DEBUG
let xx = 200;
let yy = 200;
let fireBall = null;
function fireworkPaint() {
	// Adjusts coloration of fireworks over time.
	hue += HUE_STEP_INCREASE;

	// Clean the canvas.
	cleanCanvas();


	//// DEBUG
	//if (null == fireBall)
	//	fireBall = new FireBall(xx, yy);
	//else
	//	fireBall.update();
	//// Update particles.
	//updateParticles();
	//return;
	////


	// Update fireworks.
	updateFireworks();

	// Update particles.
	updateParticles();

	// Launch automated fireworks.
	launchAutomatedFirework(context);

	// Launch manual fireworks.
	launchManualFirework();

	// GF: Scenario
	// if prelude is over and all previous have faded out: fire to char
	if (fireworksCount > preludeCount && sprites.length < 2) {
		if (charIdx < charCenters.length) {
			let idx = idxMap[charIdx];
			// function increments charIdx
			launchTargetedFirework(bangCenters[idx].X, bangCenters[idx].Y);
		}
	}

	// update all in fireballs array; sets salvo off, checks exit condition
	if (salvoOn)
		updateFireballs();
}

// Launch fireballs for specified char index from charcenter to char points
function launchFireballs(i) {
	// sprite.js: lastTicksElapsed is the number of ticks elapsed during two runs of the paint function.
	// If performances are good the value should be 1. More than 1 - performance is slow.
	// let delta = ticker.lastTicksElapsed;

	for (var j = 0; j < raster.Characters[i].Coordinates.length; j++) {
		let sp = scene.Sprite(imgname, layerMow);
		sp["mowi"] = i;
		sp["mowj"] = j;
		sp['home'] = false;
		sp.setH(spriteSize);
		sp.scale(0.2 * targetScale, 0.2 * targetScale);
		setHotspot(sp, hotspotX, hotspotY);
		// position sprite
		positionGF(sp, bangCenters[i].X, bangCenters[i].Y);

		// distance to target
		let d = getDistanceGF(sp, raster.Characters[i].Coordinates[j].X, raster.Characters[i].Coordinates[j].Y);

		// init speed is proportional to distance
		sp.xv = d / rcBanner.w * 2 * random(0.9, 1.1);
		// sp.xv = d / rcBanner.w * 2 * random(0.9, 1.1) * delta;

		let dx = raster.Characters[i].Coordinates[j].X - bangCenters[i].X;
		let dy = raster.Characters[i].Coordinates[j].Y - bangCenters[i].Y;
		sp.orientVelocity(dx, dy);
		sp.orient(dx, dy);

		// random offset
		let idx = random(0, sp.imgNaturalHeight / sp.h);
		sp.setYOffset(sp.h * idx);

		sprites.push(sp);
		// 2nd cycle to make sprites movement more smooth
		if (0 == j % 2) {
			cycle.addSprite(sp);
		}
		else {
			cycle1.addSprite(sp);
		}
	}
}

// fireball behavior
// ### names mingle here: sp fireball I keep until home, than FireBall class instance is created 
function updateFireball(sp) {
	let i = sp.mowi;
	let j = sp.mowj;

	// start - target distance
	let dist = sjs.math.hypo(raster.Characters[i].Coordinates[j].X - bangCenters[i].X, raster.Characters[i].Coordinates[j].Y - bangCenters[i].Y);

	// get distance from start
	//let dstart = sp.distance(charCenters[i][0], charCenters[i][1]);
	let dstart = getDistanceGF(sp, bangCenters[i].X, bangCenters[i].Y);

	if (dstart > dist) {
		// set sprite home.
		homecount++;
		sp.home = true;
	}

	if (sp.home) {
		// target
		let tx = raster.Characters[i].Coordinates[j].X;
		let ty = raster.Characters[i].Coordinates[j].Y;

		// create fireball
		fireballs.push(new FireBall(tx, ty));
		// fireballs.push(new FireBall(tx, ty, sp.xv, sp.xv));
		salvoOn = true;

		// delete sp (AFTER fireball created to use sp.x, sp.y)
		removeSprite(sp);

		// bang on 1st one
		if (homecount == 1) {
			audioBang.isPlaying = false;
			audioBang.offset = 0.0;
			audioBang.startTime = 0.0;

			audioBang.play();
		}
	}
	else {
		let f = dstart / dist;
		let scalex = interpolate(0, 1, 0.01, 0.35, f);
		let scaley = interpolate(0, 1, 0.025, 0.25, f);
		sp.scale(scalex * targetScale, scaley * targetScale);

		sp.applyVelocity();
		sp.update();
	}

	//// if all home: fade out, randomize motion
	//if (sp.home && homecount >= sprites.length) {
	//	// dim
	//	// scale
	//	// add vertical speed
	//	// ### add chaotic movement
	//	sp.xv += sp.yv * (2 * sp.x - window.innerWidth) / window.innerWidth * random(-0.02, 0.05);
	//}
}


// ### exit condition: sprites => fireballs
function removeSprite(sp) {
	// to remove we need index
	let idx = sprites.indexOf(sp);
	sprites.splice(idx, 1);
}

// check if game is over; next loop otherwise
// check for exit: in resetFireBalls()
function checkNextLoop() {
	iloop++;

	// exit condition
	if (iloop >= loopCount) {
		// stopShow();
		console.log('gameOver: checkNextLoop(): iloop:', iloop, 'nSalvos:', loopCount);
		gameOver = 0;	// exit right away
		return;
	}

	allFading = false;	// reset

	if (1 == slogans.length) {
		// skip raster
		resetFireBalls(5, 10);
	}
	else {
		myAssetsCount = -1;
		getRaster(rasterReady, slogans[iloop]);	// => nextLoop();
    }
}

//// to be moved to mow,js

function setHotspot(sp, x, y) {
	sp['hotspot'] = new Point(x, y);
	sp.transformOrigin(x, y);
}

// position sprite hotspot (default: center) to x, y
function positionGF(sp, x, y) {
	if (typeof sp.hotspot === 'undefined') {
		sp['hotspot'] = new Point(sp.w / 2, sp.h / 2);
	}

	let dx = sp.hotspot.x;
	let dy = sp.hotspot.y;
	sp.position(x - dx, y - dy);
}

// get hotspot position on canvas
function getPositionGF(sp) {
	if (typeof sp.hotspot === 'undefined') {
		sp['hotspot'] = new Point(sp.w / 2, sp.h / 2);
	}

	return new Point(sp.x + sp.xTransformOrigin, sp.y + sp.yTransformOrigin);
}

// get hotspot distance
function getDistanceGF(sp, x, y) {
	let dx = sp.x + sp.xTransformOrigin - x;
	let dy = sp.y + sp.yTransformOrigin - y;

	return Math.sqrt(dx * dx + dy * dy);
}

// create index map array
function createIdxMap(n) {
	var map = new Array(n);
	for (var i = 0; i < n; i++) {
		map[i] = i;
	}
	return shuffle(map);	// mow.js
}

//#region ANIMATION LOOP
// returns bool initialized
function initAllCustom() {
	console.log("initAllCustom()");

	let ready = true;

	if (undefined === canvas) {
		canvas = $('canvas')[0];
		ready = false;
	}

	// Center the canvas initially
	centerCanvas();

	return ready;
}

// sprite.js version of render() - called on each cycle.
let timer = new Timer();  // THREE.Timer
function paint() {
	const delta = timer.getDelta();	// ### pass down to all functions to adjust speed/synchronize objects

	// IMPORTANT: calls exitCheck(), resumeRecord()
	if (!entryCheck())
		return;

	// asynchronous whims?
	if (undefined === cycle)
		return;

	cycle.next(ticker.lastTicksElapsed);
	cycle1.next(ticker.lastTicksElapsed);

	// DEBUG show raster
	//drawRaster(contextMow, raster, rad, "white");
	//drawCharCenters(contextMow, charCenters, rad, "red");

	for (var i = 0, sp; sp = sprites[i]; i++) {
		if (typeof sp.debug !== 'undefined' && sp.debug) {
			sp.applyVelocity();
			updateDebugFireball(sp);
			sp.update();
		}
		else {
			updateFireball(sp);
		}
	}

	// NB: without these 2 lines no BKG is recorded in RTC!?
	let ctx = canvasBkg.getContext("2d");
	ctx.drawImage(imageBkg, 0, 0, canvasBkg.width, canvasBkg.height);

	fireworkPaint();

	////// debug
	//let msg = '(' + mouseX + ', ' + mouseY + ')';
	//let info = document.getElementById("info");
	//info.innerHTML = msg;
	//info.style.zIndex = 1000;

	// if last salvo
	if (iloop == loopCount - 1 && allFading)
		messageOnCanvas(frontCanvas, rasterParams.message, { color: 'yellow', strokeColor: 'yellow' });
}

// Called from scenario_three_template::exitCheck()
// exitCheck calls stopShow() or showPreview() to stop game.
// optional
//function exitCheckCustom() {
//	console.log('exitCheckCustom(): void');
//}
//#endregion  ANIMATION LOOP

//#region CAPTURE

function sceneReady() {
	console.log('sceneReady()');

	if (undefined === canvas) {
		console.log('canvas undefined, exiting');
		return false;
	}

	// audioSwoosh - the 1st one to sound
	if (undefined === audioSwoosh) {
		console.log('audio not ready, exiting');
		return false;
	}

	return true;
}


// called from scenario_three_template:startShow()
function startShowCustom() {
	console.log('startShowCustom()');

	// mow_template: set global gameWidth, gameHeight to the size of background object
	let val = setGameSize(imageBkg.width, imageBkg.height);
	gameWidth = val.W;
	gameHeight = val.H;

	//// sprite.js scene 
	scene = sjs.Scene({ w: gameWidth, h: gameHeight });
	///////////////

	scene.loadImages(imgarray, startFire);

	// layers

	////
	// do not autoclear bkg canvas on each paint() call.
	layerBkg = scene.Layer("bkg", { useCanvas: true, autoClear: false });
	canvasBkg = $('canvas#sjs0-bkg')[0];
	let ctx = canvasBkg.getContext("2d");

	// Make sure the image is loaded first otherwise nothing will draw.
	ctx.drawImage(imageBkg, 0, 0, canvasBkg.width, canvasBkg.height);
	//ctx.drawImage(imageBkg, 0, 0, imageBkg.width, imageBkg.height, 0, 0, gameWidth, gameHeight);
	////

	layer = scene.Layer("layer", { useCanvas: true });
	layerMow = scene.Layer("layermow", { useCanvas: true });

	canvas = $('canvas#sjs0-layer')[0];	// main canvas
	frontCanvas = $('canvas#sjs0-layermow')[0];	// front canvas

	ticker = scene.Ticker(20, paint);	// 20 - faster // 30 - slower
	//ticker.run(); => scenario_three_template::startShow()
}

function sceneRemoveCustom() {
	console.log('sceneRemoveCustom()');

	// canvas.remove();
	divScene = $('div#sjs0')[0];
	divScene.remove();

	// there is no ticker.stop(), have to use ticker.pause()
	ticker.pause();
}

// called from scenario_three_template::setMobileRecorder()
function setMobileRecorderCustom(recorder) {
	console.log('setMobileRecorderCustom()');

	// recorder.bgCanvas = canvasBkg;
	recorder.bgCanvas = $('canvas#sjs0-bkg')[0];

	canvas = $('canvas#sjs0-layer')[0];	// main canvas
	frontCanvas = $('canvas#sjs0-layermow')[0];	// front canvas

	recorder.canvas = canvas;
	recorder.frontCanvas = frontCanvas;
}
//#endregion

////////////////
// particle.decay ~= 0.005; speed down; no new particles
// particle.speed /= 32;

// FireBall: cluster of particles burning for preset time.
// Uses Particles.
class FireBall {
	static id = 0;	// fireball identifier
	static speedFactor = null;

	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.vx;
		this.vy;
		this.dx = 0;	// last update move distance
		this.dy = 0;

		this.gravity = context.canvas.width;

		this.id = FireBall.id++;
		this.liveparticles = 0;

		this.start = new Date();
		this.lifetime = 6000;	// msecs
		this.lasttime = this.start;
		this.tlapsed = 0;

		this.bangs = 0;	// particles bangs count
		this.fading = false;	// no new particles after life time

		// init speed
		if (null == FireBall.speedFactor) {
			FireBall.speedFactor = context.canvas.width / 1024 / 1024 / 16;
		}

		this.vx = (this.x - rcBanner.center.x) * FireBall.speedFactor;
		this.vy = (this.y - rcBanner.center.y) * FireBall.speedFactor;

		// try to make speed more isotropic (if banner width is much longer than its height, vx will be much higher than)
		this.vx *= rcBanner.h / rcBanner.w;



		// let lower fireballs spread wider
		this.vx *= (1 + 4 * (this.y - rcBanner.top) / context.canvas.width);


		// DEBUG
		// console.log(`FireBall(): x: ${this.x}, y: ${this.y}`);
	}

	// idx - dynamic value - index in fireballs[]; call from for() loop.
	update(idx) {
		let curtime = new Date();
		this.tlapsed = curtime - this.start;

		// update position
		let tdelta = curtime - this.lasttime;
		this.lasttime = curtime;

		// NB: start moving when all home, otherwise text gets distorted
		if (sprites.length == 0) {
			let x = this.x;		// old position
			let y = this.y;
			this.x += this.vx * tdelta;
			this.y += this.vy * tdelta;

			this.y += this.gravity * FireBall.speedFactor;

			this.dx = this.x - x;	// fireball move
			this.dy = this.y - y;
		}

		// check lifetime
		if (this.tlapsed > this.lifetime) {
			if (!this.fading) {
				this.fading = true;
				this.fade();
			}

			if (this.liveparticles < 1) {
				// destroy fireball
				fireballs.splice(idx, 1);
			}
			return;
		}

		// add particles
		let delta = PARTICLE_COUNT - this.liveparticles;
		if (delta > 0) {
			if (this.bangs % 5 == 0) {
				// regular (no reference to parent), 'external' particles with factored speed
				//let speedF = 0.5 * targetScale;

				let speed0 = (PARTICLE_SPEED_MAX + PARTICLE_SPEED_MIN) / 2;
				let speedF = lerp2(0, this.lifetime, speed0, 0.5, this.tlapsed);
				speedF *= 0.5 * targetScale;

				createParticles_gf(this.x, this.y, speedF);
			}
			else {
				// 'own' particles - have reference to parent FireBall
				this.liveparticles += this.createParticles(this.x, this.y, delta);
			}

			this.bangs++;
		}

		// DEBUG
		// console.log(`update: x: ${this.x}, y: ${this.y}: this.liveparticles ${this.liveparticles}`);
	}

	createParticles(x, y, particleCount) {
		// console.log(`createParticles: x: ${x}, y: ${y}: particleCount ${particleCount}`);

		let count = 0;

		// Set particle count.
		// Higher numbers may reduce performance.
		while (particleCount--) {
			// Create a new particle and add it to particles collection.
			let particle = new Particle(x, y);

			particle.friction = PARTICLE_FRICTION;	// PARTICLE_FRICTION_FINAL; ### BAD
			//particle.decay /= 2;	// constant decay creates pulses!

			//let speedF = lerp2(0, this.lifetime, 8, 2, this.tlapsed);
			let speedF = lerp2(0, this.lifetime, 12, 6, this.tlapsed);
			particle.speed /= speedF;
			particle.speed *= targetScale;

			// gravity: no change: blocks falling down
			particle.gravity = 0.1;

			// IMPORTANT: tag the particle as belonging to this FireBall
			particle.parent = this;

			particles.push(particle);
			count++;
		}

		return count;
	}

	// set own particles to fade
	fade() {
		for (let i = 0; i < particles.length; i++) {
			if (particles[i].parent?.id == this.id) {
				particles[i].decay = PARTICLE_DECAY_MIN/2;
			}
		}
	}
}

// Update all active fireballs.
// DEBUG
let allFading = false;
function updateFireballs() {
	// check for salvo end
	if (0 == fireballs.length) {
		salvoOn = false;
		// alert(iloop + ' salvo OFF');

		checkNextLoop();
		return;
	}

	// Loop backwards through all fireballs, updating each.
	let allFadingTest = true;
	for (let i = fireballs.length - 1; i >= 0; --i) {
		if (!fireballs[i].fading)
			allFadingTest = false;

		// fireball may be deleted in update(), test fading before update()
		fireballs[i].update(i);
	}

	if (allFadingTest)
		allFading = true;
}