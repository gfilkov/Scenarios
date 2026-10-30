const scenario = "train";
var recordingDisabled = false;
var recordingChecked = false;

// Creeating scene with 3 layers (canvases):
// bkg: bkg image
// env: environment additions: moon, rocks, rails, etc.
// mow: front: train and smoke.

//#region VARS
let scene = null;
let layermow, layerenv, layerbkg;
let canvasbkg = null;
let canvasmow = null;
let canvasenv = null;
let imageBkg = null;			// image
let contextmow = null;

let flakes = [];		// trinkets - raster
let puffs = [];			// puffs of smoke - padding
let smokeLength = 0;     // normalized, before scaling
let smokeSpeed = 0;     // "cruise" speed - X speed of the last flake
let wordStart = 0;		//  - indexes in the flakes[]
let wordStop = 0;

let oAudio;
let isAudioReady = false;

let startTime;
let prevTime;

let idleloops = 0;
let elapsedTime = 0;

let envScale = 1;	// scale for environment images
let trainScale = 1;

let railY = 0;	// as painted in updateEnv()
let railH = 0;

let trainX = 0;	// as painted in updateTrain()
let trainY = 0;

let funnel = null;	// to be calc in updateSmoke()
// NB: flakes depend on funnel position; as soon as funnel is set call setFlakes()

// smoke sine wave params
let rayUpperFactor;	// OY intercepts of bounding rays, factors.
let rayLowerFactor;

let rUpIntercept;
let rLoIntercept;
let rAxIntercept;	// median

let showMessage = false;

//// DEBUG
let corners = [];
let cornersT = [];	// train
//#endregion VARS

//#region CONFIG
let idleloopsMax = 64;
let moonX = 0.20;		// factor of gameWidth
let moonY = 0.10;		// left upper corner of img
let moonScale = 0.06;

trainScaleFactor = 0.75;	// fraction of gameWidth occupied by train image.

let scrollWidth = 0.5;	// relative; 0.5 means half of the img width is visible in viewport.

// REDO scales: all scales independent of each other. All are fractions of canvas.width
let stepScale = 0.015;	// distance between trinkets on the banner
let puffScale = 0.0002;
let flakeScale = 0.00005;
// Smoke stretching factor. How much the trinket at the end is larger compared to the start.
let puffStretch = 3;
let flakeStretch = 4;

compY = 0.25;	// vertical smoke compression factor (in the funnel)

// City labels lengths
let cityX = 350;	// city.png split into 2 columns
let cityY = 0;		// to be calculated
let cityFrom = [280, 264, 193, 350, 278, 260, 206];
let cityTo = [642, 516, 544, 562, 528, 620, 615];	// right edge width: cityTo[i] - cityX

//let cityFrom = [318];
//let cityTo = [642];	// vancouver	// [520];	// sochi

// fractions of the train size
let cityLblX = 0;
let cityLblY = 0;
let cityLblWidth = 0;	// max width; if wider - W to be adjusted.
let cityLblHeight = 0;
let cityLblStep = 370 / 3062;	// 370 / train.w

// wind params

// Smoke (raster) Vertical expansion rate (fraction of gameWidth)
let vExpRate = 0.002;

// Params: axis: wp*x + wq
// curve: wa*sin(wk*(funnel.x - x) + wc*elapsedTime)
// axis intercept:
let wq;		// OY intercept
let wp, wa, wk, wc;

// timing
let periodRocks_1 = 100;	// seconds
let periodRocks_2 = 30;
let periodRails = 2.5; // 5;
let periodLights = 4;

let frameTime = 30;	// default dt between frames (33 fps)
//#endregion CONFIG

//#region BEFORE PLAY BTN
// DON'T remove this! Focus in/out sinchro gets broken. Why csenario_three_template doesn't work!?
window.addEventListener('blur', function (e) {
	if (undefined === oAudio)
		return;

	oAudio.pause();
});
window.addEventListener('focus', function (e) {
	if (undefined === oAudio)
		return;

	if (gameOver >= 0)
		return;

	oAudio.play();
});

// DeepSeek: Function to center the canvas horizontally (using my setVideoSize())
function centerCanvas() {
	console.log(scenario + ".centerCanvas()");

	// scenario_trhree_template.js: returns max contained size of given aspect
	let size = setVideoSize(16, 9);

	// for scenario_three_template::startRecording() gameWidth/gameHeight must be defined,
	// otherwise it will be window inner size.
	//gameWidth = size.W;	// - must be already set in createScene()
	//gameHeight = size.H;

	// Calculate the left margin to center the canvas
	const marginLeft = (window.innerWidth - size.W) / 2;

	// apply to container DIV
	// divScene = $('div#sjs0')[0];
	divScene = document.getElementById("sjs0");
	if (null != divScene)
		divScene.style.marginLeft = `${marginLeft}px`;

	// apply the same to 'preview' video
	const preview = document.getElementById("preview");
	if (null != preview)
		preview.style.marginLeft = `${marginLeft}px`;
}
// Re-center the canvas on window resize
window.addEventListener('resize', centerCanvas);

//#region RASTER
// <scenario> calls ShowRaster::getRaster() => callback: <scenario>::RasterReady()
// ShowRaster::rasterParams shoul be ready here.

// multi-slogan functionality
let iloop = 0;
let nLoops = 2;	// 2;

const slogans = rasterParams.text.split('||');
if (slogans.length > nLoops)
	nLoops = slogans.length;

// NB: uses global rasterParams object (ShowRaster.js). Set other properties if/as needed.
//rasterParams.fontFamily = 'LED';

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

//#region ASSETS
// array for Scene.loadImages()
var imgarray = ['imgs/train/bg.png'
	, 'imgs/train/lights.png'
	, 'imgs/train/moon.png'
	, 'imgs/train/rails.png'
	, 'imgs/train/snowflake1.png'
	, 'imgs/train/rocks_1.png'
	, 'imgs/train/rocks_2.png'
	, 'imgs/train/cities.png'
];

// add clouds (smoke flakes)
let i = 0;
for (i = 0; i < 5; i++) {
	let src = "imgs/train/cloud_" + i + ".png";
	imgarray.push(src);
}
for (i = 1; i < 5; i++) {
	let src = "imgs/train/cloud_s" + i + ".png";
	imgarray.push(src);
}

// for assetLoader
let imgs = {
	'bkg': 'imgs/train/bg.png',
	'lights': 'imgs/train/lights.png',
	'moon': 'imgs/train/moon.png',
	'rails': 'imgs/train/rails.png',
	'train': 'imgs/train/train_r.png',
	'rocks_1': 'imgs/train/rocks_1.png',
	'rocks_2': 'imgs/train/rocks_2.png',
	'cities': 'imgs/train/cities.png'
}

// object add property
// Dot Notation: object.new_property = new_value;
// Square Bracket Notation: object['new_property'] = new_value;
for (i = 0; i < 5; i++) {
	let prop = "cloud_" + i;
	let src = "imgs/train/" + prop + ".png";
	imgs[prop] = src;
}
for (i = 1; i < 5; i++) {
	let prop = "cloud_s" + i;
	let src = "imgs/train/" + prop + ".png";
	imgs[prop] = src;
}


//////
// MoW_template::checkAssets() works well for THREE.JS scenarios.
// Using ugly patch here: #1: raster; #2: assetsLoaded() - callback of AssetLoader2 - all other assets.
const assets = 2;
let assetsCount = 0;
//////


// MoW_template:: checkAssets() -> init(); showOverlay();
initAssets();
function initAssets() {
	console.log("initAssets()");

	let sounds = {
		'train': 'sounds/16004_1460553049.mp3'
	};

	let videos = {};

//	assetLoader = new AssetLoader2(imgarray, sounds, videos, 'progress-bar', 'progress-rate');
	assetLoader = new AssetLoader2(imgs, sounds, videos, 'progress-bar', 'progress-rate');

	// add callback
	assetLoader.load(assetsLoaded);
}

function assetsLoaded() {
	console.log("assetsLoaded()");
	// MoW_template:: checkAssets() -> init();showOverlay();

	assetsCount++;
	checkAssets(assets, assetsCount, 'AssetLoader2');
}

// MoW_template:: checkAssets() -> init(); showOverlay(); // checkAssets() calls when all assets ready
function init() {
	createScene();
	initAudio();
}

function initAudio() {
	console.log("initAudio()");

	if (iOS()) {
		oAudio = document.createElement("AUDIO");
		oAudio.id = "bkgSound";
		oAudio.src = assetLoader.sounds.train.src;
		oAudio.volume = 1;
		var onEnded = function () {
			this.play();
		};
		oAudio.addEventListener('ended', onEnded, false);
	}
	else {
		//oAudio = assetLoader.sounds.crows;
		// oAudio = new Audio(bkgSound);
		oAudio = assetLoader.sounds.train;
	}

	isAudioReady = true;
}

function createScene() {
	console.log("createScene()");

	// NB: Scene.reset()
	// Delete all layers present in this scene, delete the sprites and layers, and pause the ticker.

	// raster is defined in ShowRaster
	if (null === raster) {
		console.log("createScene(): no raster, exiting.");
		return false;
	}

	if (null !== scene) {
		console.log("createScene(): scene not null, (already inited?); exiting.");
	}

	// imageBkg = imgarray[0];		// Image object
	imageBkg = assetLoader.imgs.bkg;

	let val = setGameSize(imageBkg.width, imageBkg.height);	// mow_template
	gameWidth = val.W;
	gameHeight = val.H;

	scene = sjs.Scene({ w: gameWidth, h: gameHeight });

	scene.loadImages(imgarray, initScene);	// this::initScene(): Scene.loadImages() callback

	console.log('scene.w:', scene.w, 'scene.h', scene.h);

	// ### NB: despite csene !== null check, sporadically second scene element gets created!?
	removeGhosts();
}

function removeGhosts() {
	let xtra = $('div#sjs1');
	if (null !== xtra) {
		xtra.remove();
		console.log("Ghost 'div#sjs1' was removed.");
	}

	xtra = $('div#overlay');
	if (null !== xtra) {
		if (xtra.length > 1) {
			xtra[1].remove();
			console.log("Ghost 'div#overlay' was removed.");
		}
	}
}

function initScene() {
	console.log("initScene()");

	layerbkg = scene.Layer("layerbkg", { useCanvas: true, autoClear: false });
	layerenv = scene.Layer("layerenv", { useCanvas: true });
	layermow = scene.Layer("layermow", { useCanvas: true, autoClear: false });;

	canvasbkg = $('canvas#sjs0-layerbkg')[0];
	canvasenv = $('canvas#sjs0-layerenv')[0];
	canvasmow = $('canvas#sjs0-layermow')[0];

	divScene = document.querySelector('div#sjs0');
	//divScene.style.display = "none";	// - NO! It sets layers to 0, breaking all.

	// ENV scale: assuming all ENV images have the same width
	let image = assetLoader.imgs.rocks_1;
	//envScale = canvasbkg.width / image.width;

	let visibleWidth = image.width * scrollWidth;
	envScale = canvasbkg.width / visibleWidth;

	// secs -> msecs; make sure it works only once
	if (periodLights < 1000) {
		periodRocks_1 *= 1000;
		periodRocks_2 *= 1000;
		periodRails *= 1000;
		periodLights *= 1000;

		// add speed property
		assetLoader.imgs.rocks_1.speed = assetLoader.imgs.rocks_1.width / periodRocks_1;
		assetLoader.imgs.rocks_2.speed = assetLoader.imgs.rocks_2.width / periodRocks_2;
		assetLoader.imgs.rails.speed = assetLoader.imgs.rails.width / periodRails;
		assetLoader.imgs.lights.speed = assetLoader.imgs.lights.width / periodLights;

		// add scrollStartTime property - time from latest image scroll start (null -> uninited)
		assetLoader.imgs.rocks_1.scrollStartTime = null;
		assetLoader.imgs.rocks_2.scrollStartTime = null;
		assetLoader.imgs.rails.scrollStartTime = null;
		assetLoader.imgs.lights.scrollStartTime = null;

		// add scrollWidth, envScale;
		// NB: IMAGE already has scrollW read-only property
		assetLoader.imgs.rocks_1.scrollW = scrollWidth;
		assetLoader.imgs.rocks_2.scrollW = scrollWidth;
		assetLoader.imgs.rails.scrollW = 1;
		assetLoader.imgs.lights.scrollW = scrollWidth;

		assetLoader.imgs.rocks_1.envScale = envScale;
		assetLoader.imgs.rocks_2.envScale = envScale;
		assetLoader.imgs.rails.envScale = canvasbkg.width / image.width / assetLoader.imgs.rails.scrollW * 0.5;
		assetLoader.imgs.lights.envScale = envScale;
	}

	// train
	let train = assetLoader.imgs.train;
	trainScale = canvasmow.width / train.width * trainScaleFactor;

	// trinkets
	makeSmoke();

	// Center the canvas initially
	centerCanvas();

	showOverlay();		// in MoW_template.js
}

//#endregion ASSETS
//#endregion BEFORE PLAY BTN

/////////////// Overlay: [PLAY] button ///////////////
// OnClick: MoW_template::startScenario() => startShow()
///////////////

//#region ANIMATION LOOP
function sceneReady() {
	console.log('sceneReady(): void');

	return true;
}
function initAllCustom() {
	console.log("initAllCustom()");

	let ready = true;

	if (undefined === canvasbkg || null === canvasbkg) {
		canvasbkg = $('canvas#sjs0-layerbkg')[0];
		ready = false;
	}

	if (undefined === canvasenv || null === canvasenv) {
		canvasenv = $('canvas#sjs0-layerenv')[0];
		ready = false;
	}

	if (undefined === canvasmow || null === canvasmow) {
		canvasmow = $('canvas#sjs0-layermow')[0];
		ready = false;
	}

	if (divScene.scrollWidth === 0) {
		console.log("divScene size is 0! Patching with gameWidth:", gameWidth);
		divScene.style.width = gameWidth + 'px';
		divScene.style.height = gameHeight + 'px';
	}

	//if (!areFlakesReady)
	if (0 == flakes.length) {
		makeSmoke();
		ready = false;
	}

	if (!isAudioReady) {
		if (undefined == oAudio)
			initAudio();
		else {
			isAudioReady = true;
			try {
				if (!iOS()) {
					oAudio.loop = true;
				}
				// oAudio.play();	// will start at paint() entry.
			}
			catch (err) {
				alert(err.message);
			}
		}

		ready = false;
	}

	return ready;
}

let ticks = 0;
let saved = false;
function paint() {
	// IMPORTANT: calls exitCheck(), resumeRecord()
	if (!entryCheck()) {
		if (idleloops++ > idleloopsMax) {
			console.log("Initialization timeout(", idleloops, "); gameOver");
			gameOver = 0;	// right away
		}
	}

	//// start show
	if (undefined === startTime) {
		let dt = new Date();
		prevTime = dt;
		startTime = dt.getTime();
	}

	// start ambient (background) audio. (It should be ready at this point.)
	if (oAudio.paused && gameOver < 0)
		oAudio.play();
	////

	//// poor man timer: count elapsed time excluding debug stops.
	// assuming if dt > 500 - it was debug stop, exclude it, replace with frameTime
	let dt = new Date() - prevTime;
	if (dt > 500) {
		dt = frameTime;
	}
	elapsedTime += dt;
	//// updateTime();	// DEBUG: display elapsedTime on canvas
	////

	updateEnv(dt);

	if (saved) {
		// no idea why cts.save()/restore does not work as expected.
		// no clear - smoke paints all over.
		// clear all: no train!? Clearing just smoke - OK
		// contextmow.clearRect(0, 0, canvasmow.width, canvasmow.height);
		contextmow.clearRect(0, 0, funnel.x*1.005, funnel.y*1.005);
		contextmow.restore();	// only once, then out of stack
		contextmow.save();		// for next restore
	}
	else {
		updateTrain(dt);	// defines funnel
		putLabels();		// City FROM - TO labels
		contextmow.save();
		saved = true;
	}

	updateSmoke(dt);
	updateLights(dt);

	// DEBUG
	// drawWind();

	// at the very end of the loop
	ticks++;
	prevTime = new Date();
}

function exitCheckCustom() {
	console.log('exitCheckCustom()');
	oAudio.pause();
}

//#endregion ANIMATION LOOP

//#region SCENARIO-SPECIFIC
// NB: all puffs (smoke) and flakes (banner) are positioned in units
// i.e. raster scale: step 1
// Scaling will be done later in setFlakes()
function makeSmoke() {
	console.log("makeSmoke()");

	// few groups of puffs
	let nclouds = Math.floor(random(6, 10));

	let xpos = 0;

	for (let i = 0; i < nclouds; i++) {
		let n = Math.floor(random(16, 24));
		xpos = appendPuffs(n, 2, xpos);
		let gap = Math.floor(random(1, 3));
		xpos += gap;
	}

	xpos = appendRaster();
}

// min-max number of puffs, horiz step, max (rightmost) X
// function appendPuffs(nmin, nmax, step, right) {
// new versions: separate arrays for puffs (smokw) and flakes (raster)
function appendPuffs(count, step, right) {
	console.log("appendPuffs()");

	if (null === contextmow) {
		contextmow = canvasmow.getContext("2d");
	}

	let xmax = 0;

	for (var i = 0; i < count; i++) {
		var n = i % 4 + 1;

		let key = 'cloud_' + n;
		let image = assetLoader.imgs[key];
		let puff = new SimpleCanvasImage(image, contextmow);
		puff.visible = false;

		let x = Math.random() * step;
		let y = -Math.random() * 8;

		x += right;
		puff.position(x, y);
		if (x > xmax) xmax = x;

		// DEBUG
		// console.log('x:', x, 'y:', y);

		puffs.push(puff);
	}

	return xmax;
}

// max (rightmost) X
// new versions: separate arrays for puffs (smoke) and flakes (raster)
// NB: adding some intelligence: as soon as raster is used ("appended") we may call get raster for the next slogan.
function appendRaster() {
	console.log("appendRaster()");

	flakes = [];
	if (null === contextmow) {
		contextmow = canvasmow.getContext("2d");
	}

	let xmax = 0;

	// new format raster is centered. left X is -rasterSize.Width/2
	let X0 = iloop == 0 ? rasterSize.Width : 0;

	// in ShowRaster:
	forEachRasterPoint(raster, myCallback);

	// callback({ X: pnt.X, Y: pnt.Y, iChar: i, iPoint: j, iLine: pnt.LineIndex});
	function myCallback(rp) {
		let n = (rp.iChar + rp.iPoint) % 4 + 1;

		let key = 'cloud_s' + n;
		let image = assetLoader.imgs[key];
		let flake = new SimpleCanvasImage(image, contextmow);

		// normalize size by rasterSize.Height
		let x = (rp.X + X0) / rasterSize.Height;
		let y = rp.Y / rasterSize.Height;    // 0 - 1

		flake.position(x, y);
		if (x > xmax) xmax = x;

		flakes.push(flake);
	}

	// slogan AI ;)
	if (iloop++ < slogans.length - 1) {
		console.log('Requested raster for slogans[', iloop, ']:', slogans[iloop]);
		myAssetsCount = -1;	// reset getRaster extra loop safety catch
		getRaster(rasterReady, slogans[iloop]);
	}

	return xmax;
}

// called from updateTrain() once, when funnel gets defined
// set positions, size and speed for the whole array
// NB: depends on funnel
function setFlakes() {
	console.log("setFlakes()");

	//// speed vars
	//let v0 = -vf * funnel.x; // speed of flake[0]
	//let v1 = -vf * smokeLength * xScale;
	//// v(x) = v0 + x * (v1 - v0)/smokeLength;

	//// DEBUG
	//let xmin = 1000;
	//let xmax = -1000;
	//let ymin = 1000;
	//let ymax = -1000;
	//for (let i = 0; i < flakes.length; i++) {
	//	let flake = flakes[i];
	//	if (flake.x < xmin) xmin = flake.x;
	//	if (flake.y < ymin) ymin = flake.y;
	//	if (flake.x > xmax) xmax = flake.x;
	//	if (flake.y > ymax) ymax = flake.y;
	//}
	//// check min/max here
	////

	// debug-checked flake.x, flake.y here for "пора валить": (0, 10, 0, 0.875)
	for (let i = 0; i < flakes.length; i++) {
		let flake = flakes[i];
		let x = flake.x;	// original relative coordinates.
		let y = flake.y;

		// memorize raster coordinates
		//flake.x0 = x;
		//flake.y0 = y;
		flake.rasterPos = new Point(x, y);
		flake.idx = i;

		// set flake to initial position/scale (at Funnel)
		let pos = initFlake(flake);

		flake.visible = false;

		// speed: not using in this implementation, using SIN smoke curve instead
		//flake.vx = -(v0 + flake.x * (v1 - v0) / smokeLength);
		//flake.vy = (flake.vx * (y - fy) / (funnel.x - fx));

		// horiz speed: secs to pass the screen:
		let speedx = funnel.x / 4000;	// 4 secs
		flake.vx = -speedx;
		flake.vy = 0;

		// issue culprit; anchorx already set correctly in initFlake()
		// flake.anchorx = x;
	}
}

// set flake to initial position/scale (at Funnel)
function initFlake(flake) {
	let stScale = stepScale * canvasmow.width;
	let fScale = flakeScale * canvasmow.width;

	// rasterPos.y: (0 - 1)
	// compY: "compress" vertically smoke in the funnel
	let x = funnel.x + flake.rasterPos.x * stScale;	// right from funnel;
	let y = funnel.y + (flake.rasterPos.y - 1) * stScale * compY;	// above funnel

	flake.target = new Point(x, y);     // memorize to reset on the next loop
	flake.prevPos = new Point(x, y);	// to assign on very end of update()

	// base coord for 'vertical wind'
	flake.anchorx = x;

	flake.position(x, y);
	flake.scale(fScale);
}

// called from updateTrain() once, ahen funnel gets defined
// set scale and Y; X is 0 for all - to be throttled at the Funnel.
function setPuffs() {
	console.log("setPuffs()");

	// base: stepScale, others are factors
	let xScale = stepScale * canvasmow.width;
	let pScale = puffScale * canvasmow.width;

	for (let i = 0; i < puffs.length; i++) {
		let puff = puffs[i];
		let x = puff.x;	// original relative coordinates.
		let y = puff.y;

		// "compress" vertically smoke in the funnel
		x = x * xScale * 2 + funnel.x;
		y = y * xScale/64 + funnel.y;

		puff.target = new Point(x, y);     // memorize to reset on the next loop
////		puff.prevPos = new Point(x, y);	// to assign on very end of update()

		puff.position(x, y);
		puff.scale(pScale);
		puff.visible = false;

		// horiz speed: secs to pass the screen:
		let speedx = funnel.x / 4000;	// 4 secs
		puff.vx = -speedx;
		puff.vy = 0;
	}
}

// DEBUG function to test and ILLUSTRATE the algorythm
// call from paint()
let xprev, yprev;
let showNormals = false;
function drawWind() {
	if (null === contextmow) {
		contextmow = canvasmow.getContext("2d");
	}

	if (undefined === xprev) {
		xprev = funnel.x;
		yprev = funnel.y;
	}

	let ctx = contextmow;

	ctx.strokeStyle = "blue";

	ctx.beginPath();
	ctx.moveTo(funnel.x, funnel.y);
	ctx.lineTo(0, rUpIntercept);
	ctx.lineTo(0, rLoIntercept);
	ctx.closePath();
	ctx.stroke();

	// median
	ctx.strokeStyle = "green";
	ctx.beginPath();
	ctx.moveTo(funnel.x, funnel.y);
	ctx.lineTo(0, rAxIntercept);
	ctx.stroke();

	// sine wave
	ctx.beginPath();
	//ctx.moveTo(funnel.x, funnel.y);
	ctx.strokeStyle = "white";

	let num = 128;
	for (let i = 0; i < num; i++) {
		let x = funnel.x / num * (num - i);
		let y = sineWave(x);
		ctx.lineTo(x, y);
	}

	ctx.stroke();

	if (!showNormals) return;

	// tangent and normal
	// tangent/normal are calculated with error !?
	// always slightly rotated in positive (counter-clock) direction. Why?
	// Try using prev point
	let len = 20;

	for (let i = 0; i < num; i += 10) {
		let x = funnel.x / num * (num - i);
		let y = sineWave(x);

		// sineWave() tangent/normal - not correct; using current - prev points instead.
		// let tangent = res.T.multiplyScalar(len);
		// let normal = res.N.multiplyScalar(len);

		// using prev pos
		let t = new THREE.Vector2(x - xprev, y - yprev).normalize();
		let tangent = t.multiplyScalar(len);
		xprev = x;
		yprev = y;

		let normal = tangent.clone();

		// .rotateAround(center : Vector2, angle : Float) : this
		normal.rotateAround(new THREE.Vector2(0, 0), Math.PI / 2);	// now it is normal

		ctx.strokeStyle = "blue";
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + tangent.x, y + tangent.y);
		ctx.stroke();

		ctx.strokeStyle = "green";
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + normal.x, y + normal.y);
		ctx.stroke();
	}
}

// For (Vertical) wind emulation
let nwaves = random(0.5, 1);	//  mow::random
function sineWave(x) {
	// mow::lerp2(x1, x2, y1, y2, x)
	let y0 = lerp2(0, funnel.x, rAxIntercept, funnel.y, x);	// axis
	let amp = lerp2(0, funnel.x, rAxIntercept - rUpIntercept, 0, x);	// amplitude

	let K = nwaves * 2 * Math.PI / funnel.x;
	let arg = K * x + elapsedTime / 1000;

	let y = amp * Math.sin(arg) + y0;

	return y;
}

// for flakes (raster)
function addWind(flake) {
	let y = sineWave(flake.anchorx);

	// calc normal using prev pos
	let tangent = new THREE.Vector2(flake.x - flake.prevPos.x, flake.y - flake.prevPos.y).normalize();
	let normal = tangent.clone();

	// .rotateAround(center : Vector2, angle : Float) : this
	normal.rotateAround(new THREE.Vector2(0, 0), Math.PI / 2);	// now it is normal

	let vExp = vExpRate * gameWidth;
	let stScale = stepScale * canvasmow.width;

	// expansion scalar
	let exp = lerp2(funnel.x, 0, (funnel.y - flake.target.y), vExp * (0.5 - flake.rasterPos.y) * stScale, flake.anchorx);

	let delta = normal.multiplyScalar(exp);

	return { X: flake.anchorx + delta.x, Y: y + delta.y};	// corrected position
}

// called from updateTrain() once, ahen funnel gets defined
function setWind() {
	console.log("setWind()");

	// mow:: random(min, max)
	rayUpperFactor = random(0.3, 0.55);	// OY intercepts of bounding rays, factors.
	rayLowerFactor = random(0.6, 0.95);

	rUpIntercept = funnel.y * rayUpperFactor;
	rLoIntercept = funnel.y * rayLowerFactor;
	rAxIntercept = (rUpIntercept + rLoIntercept) / 2;	// median
}

// DEBUG: show elapsedTime on canvas
function updateTime() {
	const ctx = canvasenv.getContext("2d");

	ctx.font = "20px Arial";
	ctx.fillStyle = "white";
	ctx.fillText(elapsedTime, 50, 100);
}

function updateEnv(dt) {
	// draw rocks_1
	//drawScrollingImage(assetLoader.imgs.rocks_1);
	drawScrollingImage(canvasenv, assetLoader.imgs.rocks_1, 0.6);

	// rocks_2
	//drawScrollingImage(assetLoader.imgs.rocks_2, 0.8, -0.25);	// 1/4 lower
	drawScrollingImage(canvasenv, assetLoader.imgs.rocks_2, 0.4);

	// rails (returns position data: destination Y and H); set once
	let val = drawScrollingImage(canvasenv, assetLoader.imgs.rails, 0.6);
	if (0 === railH) {
		railY = val.Y;
		railH = val.H;

		//// DEBUG
		//corners.push(new Point(1, railY));
		//corners.push(new Point(canvasenv.width - 1, railY)); 
		//corners.push(new Point(canvasenv.width - 1, railY + railH - 1)); 
		//corners.push(new Point(1, railY + railH - 1));
	}
	//// DEBUG: mowsprite::markCorners()
	//let ctx = canvasenv.getContext("2d");
	//markCorners(ctx, corners, 'white');
	////

	// # train, lights on top of train and flakes: canvasmow: updateSmoke()

	if (showMessage)
		messageOnCanvas(canvasenv, rasterParams.message, { strokeColor: 'white', clear: false });
}

function updateLights(dt) {
	// canvasmow - doesn't work with context.save/restore()
	drawScrollingImage(canvasenv, assetLoader.imgs.lights, 0.3);
}

// yscale - yscale of the destination image; offBottom - dest image.H ratio
// returns position data: destination Y and H
function drawScrollingImage(canvas, image, yscale = 1, offBottom = 0) {
	// init scrollStartTime
	if (null === image.scrollStartTime) {
		image.scrollStartTime = elapsedTime;
	}

	const context = canvas.getContext("2d");

	// envScale is calculated in initScene
	//	drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)

	let sx = (elapsedTime - image.scrollStartTime) * image.speed;	// x-source
	let sy = 0;
	let dx = 0;	// x-destination
	let dx0 = 0;	// x-destination of 1st drawing
	let dx1 = 0;	// x-destination of 2nd drawing == end of 1st one
	let imageVisibleWidth = image.width * image.scrollW;
	let imageH = image.height * image.envScale * yscale;	// scaled imageH

	dx0 = -sx * image.envScale;	// left edge of destination drawing
	dx1 = (image.width - sx) * image.envScale;	// right edge of destination drawing - start of 2nd drawing

	dHeight = canvas.height * image.envScale * yscale;
	let dy = canvas.height - dHeight - dHeight * offBottom;

	// 1st (left) drawing
	context.drawImage(image, sx, sy, imageVisibleWidth, image.height,
		dx, dy, canvas.width, dHeight);

	if (dx1 < 0) {
		// scroll over
		image.scrollStartTime = elapsedTime;
	}
	else if (dx1 < canvas.width) {
		// 2nd (right) drawing
		context.drawImage(image, 0, sy, imageVisibleWidth, image.height,
			dx1, dy, canvas.width, dHeight);
	}

	return { Y: dy, H: dHeight };
}

function updateTrain(dt) {
	//const context = canvasmow.getContext("2d");

	// envScale is calculated in initScene
	//	drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)

	// TRAIN
	let image = assetLoader.imgs.train;
	let sWidth = image.width;
	let sHeight = image.height;

	let dWidth = image.width * trainScale;
	let dHeight = image.height * trainScale;

	trainX = (canvasmow.width - dWidth) * 0.7;

	// move up to rails
	// rails bottom: 
	let railBottomY = railY + railH * 0.6;

	//let dy = canvasmow.height - dHeight;	// on canvas bottom
	trainY = railBottomY - dHeight;	// on rails bottom

	contextmow.drawImage(image, 0, 0, sWidth, sHeight, trainX, trainY, dWidth, dHeight);

	// set funnel
	if (null === funnel) {
		// funnel position: on top of train
		funnel = new Point(trainX + dWidth * 0.52, trainY);

		// NB: flakes depend on funnel position; as soon as funnel is set call setFlakes()
		setFlakes();
		setPuffs();
		setWind();
	}

	//// DEBUG: put small rect
	//context.strokeStyle = "white";
	//context.beginPath();
	//context.rect(funnel.x, funnel.y, 2, 2);
	//context.stroke();

	//// DEBUG: mark corners of train image
	//if (cornersT.length === 0) {
	//	cornersT.push(new Point(trainX, trainY));
	//	cornersT.push(new Point(trainX + dWidth, trainY));
	//	cornersT.push(new Point(trainX + dWidth, trainY + dHeight));
	//	cornersT.push(new Point(trainX, trainY + dHeight));
	//}

	//markCorners(contextmow, cornersT, 'green');
	////
}

// flafes (banner) / puffs switch
//let isBanner = true;
let isBanner = false;
let puffBatch = 0;
let ipuff = 0;	// released puffs counter
function updateSmoke(dt) {
	// envScale is calculated in initScene
	//	drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
	if (0 === puffBatch) {
		puffBatch = random(puffs.length * 0.4, puffs.length * 0.6);
		puffBatch = Math.floor(puffBatch);

		console.log('puffBatch:', puffBatch);
	}

	updateFlakes(dt);
	updatePuffs(dt);

	// toggle isBanner
	let gap = stepScale * canvasmow.width * 4;	// * 32;	// HUGE !?


	// NB: works only once; 1st bunch before banner; puffBatch < 0 means done.
	// 1st batch of puffs released; ipuff incremented in updatePuffs()
	if (puffBatch > 0) {
		if (!isBanner && ipuff > puffBatch) {
			// leave X-gap
			if (puffs[puffBatch].x < funnel.x - gap) {
				isBanner = true;
				puffBatch = -1;		// disabled
			}
		}
	}

	// banner released (leave X-gap)
	if (flakes[flakes.length - 1].x < funnel.x - gap) {
		isBanner = false;
	}

	// reset banner to init position when last one leaves the screen
	if (flakes[flakes.length - 1].x < 0) {
		checkNextLoop();
		isBanner = true;
	}
}

// check if game is over; next loop otherwise.
// options implemented in checkNextLoop():
// - done, exit
// - next loop with the same raster
// - get new raster
function checkNextLoop() {
	if (slogans.length > 1) {
		// iloop++
		appendRaster();	// recreates flakes[], increments iloop (when requesting new raster)
		setFlakes();	// sets flake's custom properties
	}
	else
		iloop++;

	if (iloop > nLoops) {
		// no next loop, exit
		console.log(`gameOver: checkNextLoop(): iloop: ${iloop} nLoops: ${nLoops}`);
		gameOver = 0;
		return;
	}

	// reset flakes to funnel queue
	for (let i = 0; i < flakes.length; i++) {
		initFlake(flakes[i]);
		flakes[i].visible = false;
	}

	if (iloop >= nLoops)
		showMessage = true;	// last loop, show user message
}

function updateFlakes(dt) {
	let fScale = flakeScale * canvasmow.width;

	for (let i = 0; i < flakes.length; i++) {
		let flake = flakes[i];

		//// DEBUG: show trinkets at initial positions.
		//flake.paint();
		//continue;
		//////

		// slide anchor point (horiz wind)
		// flake slides if visible or isBanner (invisible stack starts moving and popping out)
		if (flake.visible || isBanner) {
			flake.anchorx += flake.vx * dt;
			flake.x = flake.anchorx;
		}

		// flake pops out
		if (isBanner && !flake.visible && flake.anchorx < funnel.x) {
			flake.visible = true;
		}

		// apply vertical wind and scale
		if (flake.visible) {
			let w = addWind(flake);
			//flake.positionCenter(w.X, w.Y);
			flake.position(w.X, w.Y);

			exp = lerp2(funnel.x, 0, 0.5, 4, flake.x);
			flake.scale(fScale * exp / 2);
		}

		// very last step: remember previous position (for tangent/normal)
		flake.prevPos.x = flake.x;
		flake.prevPos.y = flake.y;

		flake.paint();
	}
}

function updatePuffs(dt) {
	for (let i = 0; i < puffs.length; i++) {
		let puff = puffs[i];

		//// DEBUG: show puffs at initial positions
		//puff.visible = true;
		//puff.paint();
		//continue;
		////

		// puff slides if visible or !isBanner (invisible stack starts moving and popping out)
		if (puff.visible || !isBanner) {
			puff.x += puff.vx * dt;
		}

		// puff pops out
		if (!isBanner && !puff.visible && puff.x < funnel.x) {
			puff.visible = true;

			if(puffBatch >= 0)		// enabled
				ipuff++;
		}

		// push back to line-up - after the last one in the invisible queue.
		// if last one is visible - set puff to funnel.
		if (puff.x < 0) {
			puff.visible = false;

			let lastpuff = 0 === i ? puffs[puffs.length - 1] : puffs[i - 1];

			if (lastpuff.visible) {
				// set to funnel: a bit more to right
				puff.position(funnel.x + 8, puff.target.y);
			}
			else {
				// set to queue
				let xnew, dist;

				if (0 === i) {
					// after the last one; use dist to #1
					dist = puffs[1].target.x - puff.target.x;
					xnew = lastpuff.x + dist;
				}
				else {
					// after preceeding: keep same distance
					dist = puff.target.x - lastpuff.target.x;
					xnew = lastpuff.x + dist;
				}
				puff.position(xnew, puff.target.y);
			}
		}

		// apply vertical wind and scale
		if (puff.visible) {
			let y = sineWave(puff.x);

			// Y-spreading
			let dy0 = puff.target.y - funnel.y;		// spread at pop-out
			let exp = lerp2(funnel.x, 0, 1, 4, puff.x);

			puff.y = y + dy0 * exp;

			let pScale = puffScale * canvasmow.width;
			exp = lerp2(funnel.x, 0, 0.5, 4, puff.x);
			puff.scale(pScale * exp/2);
		}

		// very last step: remember previous position (for tangent/normal)
		//puff.prevPos.x = puff.x;
		//puff.prevPos.y = puff.y;

		puff.paint();
	}
}


// paste city from - to labels
function putLabels() {
	//const context = canvasmow.getContext("2d");

	let image = assetLoader.imgs.cities;

	// init
	if (0 === cityLblX) {
		console.log('putLabels(): init');

		// how-to: (absoluteX - X on train.png)
		// cityLblX = 924 / trainW;	// fraction of train width
		// =>
		// let absoluteX = cityLblX * dWidth; // =>
		// absoluteX = 924 / trainW * trainW * trainScale = [924 * trainScale]

		cityLblX = 924 * trainScale;	// center, correct
		cityLblY = 100 * trainScale;
		cityLblWidth = cityX * trainScale;	// max width; if wider - W to be adjusted.
		cityLblHeight = cityLblWidth / 8;
		cityLblStep = 370 * trainScale;		// correct

		cityY = image.height / cityFrom.length;
	}

	let iFrom = Math.floor(Math.random() * cityFrom.length);
	let iTo = Math.floor(Math.random() * cityTo.length);

	// coordinates in source image:	
	let sx = 0;
	let sWidth = cityFrom[iFrom];
	let sy = iFrom * cityY;
	let sHeight = cityY;

	// coordinates on canvas:
	let dWidth = cityLblWidth * sWidth / cityX;		// relative to image clip width
	let dx = trainX + cityLblX - dWidth / 2;
	let dy = trainY + cityLblY;
	let dHeight = cityLblHeight;

	// City From
	contextmow.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

	// City To
	sx = cityX;
	sWidth = cityTo[iTo] - cityX;
	sy = iTo * cityY;

	dWidth = cityLblWidth * sWidth / cityX;
	dx = trainX + cityLblX + cityLblStep - dWidth / 2;
	contextmow.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}
//#endregion SCENARIO-SPECIFIC

//#region CAPTURE
function sceneReady() {
	console.log('sceneReady()');

	if (undefined === canvasmow) {
		console.log('canvasmow undefined, exiting');
		return false;
	}

	if (!isAudioReady) {
		console.log('audio not ready, exiting');
		return false;
	}

	return true;
}

// called from scenario_three_template:startShow()
// NB: when recording starts (if capture).
function startShowCustom() {
	console.log('startShowCustom()');

	scene.loadImages(imgarray, paintBkg);

	ticker = scene.Ticker(20, paint);	// 30
	//ticker.run(); => scenario_three_template::startShow()
}

function paintBkg() {
	let ctx = canvasbkg.getContext("2d");

	// Make sure the image is loaded first otherwise nothing will draw.
	ctx.drawImage(imageBkg, 0, 0, canvasbkg.width, canvasbkg.height);

	// add moon
	//let moon = imgarray[2];		// Image object
	let moon = assetLoader.imgs.moon;		// Image object

	//	drawImage(image, dx, dy)
	//	drawImage(image, dx, dy, dWidth, dHeight)
	//	drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)

	let dx = moonX * canvasbkg.width;
	let dy = moonY * canvasbkg.height;
	let moonD = canvasbkg.width * moonScale;
	ctx.drawImage(moon, dx, dy, moonD, moonD);
}

function sceneRemoveCustom() {
	console.log('sceneRemoveCustom()');

	oAudio.pause();

	// Delete all layers present in this scene, delete the sprites and layers, and pause the ticker.
	scene.reset();

	// canvas.remove();
	divScene = $('div#sjs0')[0];
	divScene.remove();
}

// called from scenario_three_template::setMobileRecorder()
function setMobileRecorderCustom(recorder) {
	console.log('setMobileRecorderCustom()');

	recorder.audio = oAudio;

	recorder.bgCanvas = canvasbkg;
	recorder.canvas = canvasenv;
	recorder.frontCanvas = canvasmow;
}
//#endregion