// ### debug version for gfloader:
// sits in /js/; has root at /mowtestweb (scripts refs: "js/script.js")

// Using sprite.js SJS scene
// SJS scene is rendered as <div class="sjs" id="sjs0" ...>
// Layers are rendered as children:
// default: <div id="sjs0-default" ...>		// bkg
// layer: <canvas id="sjs0-layermow" ...>	// snow and wipers sprites
// layer: <canvas id="sjs0-layermow" ...>	// car

//// ### RTC recording - big issues with merger. Got rid of bkg canvas, using just one.

// no 'try/catch', let window.onerror in MoW_template handle exceptions

var scenario = "birds";
var recordingDisabled = false;
var recordingChecked = false;
// var rotateRequest = true;   // optional; scenario requests horiz screen


var imgarray = ['imgs/Rain_Clouds.jpg', 'imgs/birdL.png', 'imgs/birdR.png'];

// raster
//var urlVars = getUrlVars();    // mow.js
//var magicText = urlVars.text;	// defined a 'word' in ShowRaster.js

// Birds
var offsetX, offsetY;
var scale;
const bannerScale = 0.5; // defines minimal margin (horiz or vert) between screen rect and banner rect.
const density = 0.1;

const homeDensity = 1;	// controls homeScale: birds scale at target position

let homeScale;	// bird scale at home position (before fade away)
const minscale = 0.1;
let birdscale;
const birdset = 8;	// 32;	// number of bird sprites in a row to span gameWidth
let birdscale0;	// at initial position, defined by birdset

let homeRate = 0.0;			// nHome/trinkets.count
const fadeThreshold = 0.9;	// at which homeRate to start fadeout

let fading = false;

const batch = 12;
const batchms = 320;
let count;
//let prevTime;
//let curTime;
let homeTime = 2000;	// birds stay at home for 2 secs before flying away

const birdW = 80;
const birdH = 64;

// Scene
let canvas;
////var canvasBkg;
let context;
//let gameHeight = window.innerHeight;	// defined in: scenario_three_template
//let gameWidth = window.innerWidth;
let bannerW, bannerH;
let scene = null;
let layerShow;	////, layerBkg;
let bkSprite = null;

////////////////// user message
let layerMessage, canvasText;
//////////////////

var trinkets = [];	// birds[] - use generic name

// ### const fadeouttime = 600;
var volume = 1;

var assetLoader;
var oAudio;

// sprite.js loop
var cycle;
var ticker;
var startTime;

var gui;
// DAT.GUI params
var params = {
	windowW: gameWidth,
	windowH: gameHeight,
	rasterDim: 0,
	rasterCount: 0,
	rasterW: 0,
	rasterH: 0,
	muted: false,
	paused: false,
	volume: 1.0,
	time: 0.0
};

// Poor-man Async
var rasterCount = 0;
var isRasterReady = false;
var isLayerReady = false;
var areTrinketsReady = false;
var isAudioReady = false;
var isCaptureResolved = false;	// see CAPTURE VARS
var initialized = false;	// everything ready
const initTimeout = 10000000;	// 3000;
const timeDelta = 200;

//////////////////// Capture //////////////

// startButton is created on the fly in MoW_template.js
// calls back startShow()

// getRaster();	// ShowRaster.js => rasterReady() callback
//getRasterFromApi(word, 'led1');
//var test = await getRasterFromApi('PROBA', 'led1');


////// DEBUG
const DEBUG_MARK = false;	// mark target positions
let focusX, focusY;	// focus point (infinity point the flock flies to)

// word = "TESTING";
// word = "NO";
// word = "PROBA|PERA";

// ### params already processed by ShowRaster here: rasterParams.text, rasterParams.message, ...
// let myparams = getScenarioParams();
// let myword = myparams.word;
// if (null === myword || myword.length == 0)
	// myword = scenario;

// let myMessage = myparams.message;	// user message
// let myMessage = "User Message";

var raster;	// to be assigned in rasterReady()
getRaster();	// ShowRaster.js => rasterReady()

initAssets();

// callback
function rasterReady(result) {
    console.log("rasterReady('", result.Text, "')");

	if (result.Success)
		isRasterReady = true;

	raster = result;
	rasterCount = getRasterCount(raster);
}

function initAllCustom() {
	console.log("initAllCustom()");

	let ready = true;

	if (!isAudioReady) {
		if (undefined == oAudio)
			initAudio();
		else
			isAudioReady = true;

		ready = false;
	}

	// too late here! loop needs ticker, ticker needs scene
	//if (undefined === scene) {
	//	initScene();
	//	ready = false;
	//}

	////////////////////// sjs specific: center viewport
	let sjs = document.getElementById("sjs0");
	sjs.style.setProperty('object-fit', 'contain', 'important');
	sjs.style.setProperty('object-position', '50% 50%', 'important');

	sjs.style.setProperty('margin-left', 'auto', 'important');
	sjs.style.setProperty('margin-right', 'auto', 'important');

	//////////////////////

	if (undefined === canvas) {
		canvas = $('canvas#sjs0-layerShow')[0];

		canvas.style.setProperty('object-fit', 'contain', 'important');
		canvas.style.setProperty('object-position', '50% 50%', 'important');

		canvas.style.setProperty('margin-left', 'auto', 'important');
		canvas.style.setProperty('margin-right', 'auto', 'important');
		ready = false;
	}

	if (0 === trinkets.length) {
		initTrinkets();
		cycle.addSprites(trinkets);
		ready = false;
	}

	return ready;
}

// This function calls showOverlay() in MoW_template.js
function initAssets() {
	console.log("initAssets()");

	var imgs = {
		'bkg': 'imgs/Rain_Clouds.jpg',
		'birdL': 'imgs/birdL.png',
		'birdR': 'imgs/birdR.png'
	};

	var sounds = {
		'crows': 'sounds/Flock-of-crows-cawing.mp3'
	};


	var videos = {};
	// my version of AssetLoader() in mow.js with video added.
	assetLoader = new AssetLoader2(imgs, sounds, videos, 'progress-bar', 'progress-rate');

////	assetLoader = new AssetLoader(imgs, sounds, 'progress-bar', 'progress-rate');
	// assetLoader.message = 'QQQ';		// custom overlay message


	assetLoader.load(assetsLoaded);
}

function assetsLoaded() {
	console.log("assetsLoaded()");

	showOverlay();		// in MoW_template.js
	initAudio();
}

// init Audio object
function initAudio() {
	if (iOS()) {
		oAudio = document.createElement("AUDIO");
		oAudio.id = "myaudio";
		oAudio.src = "sounds/Flock-of-crows-cawing.mp3";
		oAudio.volume = 1;
		var onEnded = function () {
			this.play();
		};
		oAudio.addEventListener('ended', onEnded, false);
	}
	else {
		oAudio = assetLoader.sounds.crows;
	}
	params.muted = oAudio.muted;
	params.paused = oAudio.paused;
	params.volume = oAudio.volume;
	params.time = oAudio.currentTime;
}

function initForm() {
	console.log("initForm()");

	if (!raster) {
		alert("No raster");
		stopShow();
	}

	// fullscreen (in MoW_template)
	let value = tryFullScreen();	// max usable viewport

	let size = setVideoSize(16, 9); // scenario_three_template

	// for scenario_three_template::startRecording() gameWidth/gameHeight must be defined,
	// otherwise it will be window inner size.
	gameWidth = size.W;
	gameHeight = size.H;

	// focus point (infinity point the flock flies to)
	focusX = 0;	// gameWidth / 8;
	focusY = 0;	// gameHeight / 8;

	//scale = scaleByWindow();
	scale = scaleByDensity();

	bannerW = rasterSize.Width * scale;
	bannerH = rasterSize.Height * scale;


	//// if scaled by density, banner may overlap the viewport; correct
	let maxBannerW = gameWidth * 0.9;
	let maxBannerH = gameHeight * 0.9;
	let correct = false;

	// correct scale and banner by width
	if (bannerW > maxBannerW) {
		scale *= maxBannerW / bannerW;
		correct = true;
	}

	// correct scale and banner by height
	if (bannerH > maxBannerH) {
		scale *= maxBannerH / bannerH;
		correct = true;
	}

	if (correct) {
		bannerW = rasterSize.Width * scale;
		bannerH = rasterSize.Height * scale;
	}
	//// if scaled by density

	//// birdscale0: bird scale at init position
	birdscale0 = gameWidth / birdset / birdW;

	//// homeScale: bird scale at home position (before fade away)
	let bannerArea = bannerW * bannerH;
	let spriteArea = birdH * birdW;
	homeScale = Math.sqrt(bannerArea / spriteArea / rasterCount) * homeDensity;

	offsetX = gameWidth / 2;
	offsetY = gameHeight / 2;
}

// scale banner to take preset part of screen (may get too sparce banner)
function scaleByWindow() {
	// rasterSize: { Width: 100, Height: 16 }
	var scaleW = gameWidth / rasterSize.Width;
	var scaleH = gameHeight / rasterSize.Height;
	scale = scaleW < scaleH ? scaleW : scaleH;

	// bannerScale defines minimal bmargin (horiz or vert) between screen rect and banner rect.
	scale *= bannerScale;
	return scale;
}

// NB: birdH, birdW - are initial measures of sprite; birds are scaled down on the fly.
// Scale relative to raster size: The larger scale, the larger sprite.
function scaleByDensity() {
	let rasterArea = rasterSize.Width * rasterSize.Height;
	let spriteArea = birdH * birdW;

	scale = Math.sqrt(density * spriteArea * rasterCount / rasterArea);

	return scale;
}

function startAudio() {
	console.log("startAudio()");

	try {
		if (!iOS()) {
			oAudio.loop = true;
		}
		oAudio.play();
	}
	catch (err) {
		alert(err.message);
	}
}

function initScene() {
	console.log("initScene()");

	// 	gameWidth, gameHeigh - defined in initForm, after attempt to set full scrren
	scene = sjs.Scene({ w: gameWidth, h: gameHeight });
	
	// scene.loadImages(imgarray, startTicker);	// start time loop even if the scene is not ready yet.

	// layers
	layerShow = scene.Layer("layerShow", { useCanvas: true, autoPause: false });
	canvas = document.querySelector('#sjs0-layerShow');
	divScene = document.querySelector('div#sjs0');

	////////////////// user message
	layerMessage = scene.Layer("layerMessage", { useCanvas: true, autoPause: false, autoClear: false });
	canvasText = document.querySelector('#sjs0-layerMessage');
	// messageOnCanvas(canvasText, 'Testing one-two-three', { color: 'blue', strokeColor: 'blue' });
	//messageOnCanvas(canvasText, 'Testing one-two-three', { color: 'blue', strokeColor: 'white' });
	//messageOnCanvas(canvasText, 'Testing one-two-three', { color: 'blue'});
	//////////////////

	isLayerReady = true;

	cycle = sjs.Cycle([[20, 20, 4],
	[120, 20, 4],
	[220, 20, 4],
	[320, 20, 4],
		[420, 20, 4]]);

	//cycle.addSprite(bkSprite);
	//cycle.addSprites(trinkets); => initAllCustom(); trinkets not ready yet

	/////////// DEBUG
	if (DEBUG_MARK) {
		context = canvas.getContext('2d');

		// mark offset
		putMark(context, offsetX, offsetY);

		// mark center
		let x = gameWidth / 2;
		let y = gameHeight / 2;
		let r = 4;
		putMark(context, x, y, r)

		// mark banner
		var bannerHalfW = bannerW / 2;
		var bannerHalfH = bannerH / 2;

		putMark(context, x - bannerHalfW, y - bannerHalfH, r);
		putMark(context, x - bannerHalfW, y + bannerHalfH, r);
		putMark(context, x + bannerHalfW, y - bannerHalfH, r);
		putMark(context, x + bannerHalfW, y + bannerHalfH, r);

		//// mark positions
		//for (var i = 0; i < raster.length; i++) {
		//	for (var j = 0; j < raster[i].length; j++) {
		//		let x = raster[i][j].X * scale + offsetX;
		//		let y = raster[i][j].Y * scale + offsetY;
		//		putMark(context, x, y, 4, 'blue');
		//	}
		//}
	}
	///////////
}

// init birds, sit them on the borders, orient to target
function initTrinkets() {
	console.log("initTrinkets");

	count = batch;
	trinkets = [];
		
	for (let i = 0; i < raster.Characters.length; i++) {
		console.log(`char: ${raster.Characters[i].Character}`);

		const coords = raster.Characters[i].Coordinates;
		for (let i = 0; i < coords.length; i++) {
			// ctx.fillRect(coords[i].X + X0, coords[i].Y + Y0, 1, 1);
				
			// random start location on the window border
			let x = gameWidth * Math.random();
			let y = gameHeight * Math.random();
			if (trinkets.length % 2 === 0) {
				x = (x < gameWidth / 2) ? -2 * birdW : gameWidth + birdW;
			} else {
				y = (y < gameHeight / 2) ? -2 * birdH : gameHeight + birdH;
			}

			// trinket target position
			let rx = coords[i].X * scale + offsetX - birdW / 2;
			let ry = coords[i].Y * scale + offsetY - birdH / 2;
			let dx = rx - x;
			let dy = ry - y;
				
			// bird's left/right orientation
			let bird;
			if (x < gameWidth / 2) {
				bird = scene.Sprite(assetLoader.imgs.birdR.src, layerShow);
				bird.orient(dx, dy);
			} else {
				bird = scene.Sprite(assetLoader.imgs.birdL.src, layerShow);
				bird.orient(-dx, -dy);
			}
				
			bird.size(birdW, birdH);

			bird.move(x, y);

			// velocity
			bird.xv = dx / gameWidth * 10;
			bird.yv = dy / gameHeight * 10;

			// # add target property: target (home position on the banner)
			bird.target = { x: rx, y: ry };
			bird.home = { x: rx, y: ry };	// target will be updated in fade()
			bird.pos0 = { x: x, y: y };

			bird.update();
			trinkets.push(bird);
		}
	}

	trinkets = shuffle(trinkets);
}

// Call from MoW_template. Triggered by startButton; calls startShow() in scenario script
// Start ticker here.
function startShowCustom() {
	console.log("startShowCustom()");

	initForm();
	initScene();

	let dt = new Date();
	startTime = dt.getTime();
	prevTime = startTime;
		
	ticker = scene.Ticker(30, paint);
	//ticker.run(); => scenario_three_template::startShow()

	startAudio();
}

let debugging = false;

// to disentangle that horrible noodle-style code in paint() I'll use stages.
// stage: 0: launch batches; 1: fly home; 2: stay at home; 3: fly/scale away; 4: fade away
let stage = 0;
let homecount = 0;
function paint() {
	// IMPORTANT: calls exitCheck(), resumeRecord()
	if (!entryCheck())
		return;

	let dt = new Date();
	let curTime = dt.getTime();

	// start show; paint bkg
	context = canvas.getContext('2d');
	context.drawImage(assetLoader.imgs.bkg, 0, 0, canvas.width, canvas.height);

	// run cycle: update sprites
	cycle.next(ticker.lastTicksElapsed, true);

	// to avoid recording of blur screen the recorder is set to pause initially.
	resumeRecord();

	// Switch to control stages, trinkets loop after.
	switch (stage) {
		// launch birds in batches; 'count' is the number of trinkets to be updated, the rest stay idle.
		case 0:
			if (count < trinkets.length) {
				// time difference in ms
				if (curTime - prevTime > batchms) {
					count += batch;
					if (count > trinkets.length)
						count = trinkets.length;
					prevTime = curTime;
				}
			}
			if (count >= trinkets.length) {
				// DEBUG
				console.log(`paint(${stage}); count: ${count}; switching to stage ${stage + 1}`);
				count = trinkets.length;
				stage++;
			}
			break;
		// birds fly home (bird.target == bird.home, as set on creation)
		case 1:
			homeRate = homecount / trinkets.length;
			if (homeRate >= fadeThreshold) {
				prevTime = curTime;
				// DEBUG
				console.log(`paint(${stage}); homecount: ${homecount}; homeRate: ${homeRate}; switching to stage ${stage + 1}`);
				stage++;
			}
			break;
		// birds stay at home
		case 2:
			if (curTime - prevTime > homeTime) {
				// switch targets to Focus point
				for (var i = 0; i < count; i++) {
					let bird = trinkets[i];
					bird.pos0.x = bird.home.x;	// new start position
					bird.pos0.y = bird.home.y;
					bird.target.x = focusX;			// new target
					bird.target.y = focusY;
				}
				fading = true;

				stage++;
				// DEBUG
				console.log(`paint(${stage}); Birds stayed home for: ${homeTime}; switching to stage ${stage + 1}`);
			}
			break;
		// birds fly / scale away
		case 3:
			if (rasterParams.message)	// defined in ShowRaster
				messageOnCanvas(canvasText, rasterParams.message, { color: 'blue', strokeColor: 'white' });

			// case 3 will be set on probing last bird (opacity ~= 0)
			if (trinkets[trinkets.length - 1].opacity < 0.1)
				stage++;

			break;
		case 4:
			// exit stage
			stopfade();
			break;
		default:
		// Code to execute if no cases match
			throw new Error("Unknown stage in paint()!");
	}

	// use just trinket speed/update
	birdscale = homeScale;
	homecount = 0;
	for (let i = 0; i < count; i++) {
		let bird = trinkets[i];

		// deltas to target
		let dx = bird.target.x - bird.x;
		let dy = bird.target.y - bird.y;

		// vicinity
		if ((Math.abs(dx) < birdW / 3) && (Math.abs(dy) < birdH / 3)) {
			homecount++;
		}
			
		// orientation
		if (bird.xv > 0) {
			bird.orient(dx, dy);
		} else {
			bird.orient(-dx, -dy);
		}

		// velocity
		bird.xv = (dx + 16) / gameWidth * 16;
		bird.yv = (dy + 16) / gameHeight * 16;

		if (stage < 2) {
			// flying home
			let dist = distance(bird.pos0.x, bird.pos0.y, bird.home.x, bird.home.y);
			let curdist = distance(bird.x, bird.y, bird.home.x, bird.home.y);
			birdscale = lerp2(dist, 0, birdscale0, homeScale, curdist);
		}
		else if (stage > 2) {
			// fly away, scale away

			// the whole distance from home to focus
			let dist = distance(bird.home.x, bird.home.y, focusX, focusY);
			let curdist = distance(bird.x, bird.y, focusX, focusY);
			birdscale = lerp2(dist, 0, homeScale, 0.1, curdist);

			let opacity = lerp2(dist, 0, 1.0, 0.05, curdist);

			bird.setOpacity(opacity * opacity);	// make curve steep, not linear
			if (opacity > 1) opacity = 1;
			if (opacity < 0.05) opacity = 0.05;

			// Exit trigger - simplistic, use the last bird
			if (trinkets.length - 1 == i) {
				// fade sound
				let volume = opacity;

				if (iOS()) {
					oAudio.volume = volume;
				}
				else {
					assetLoader.sounds.crows.volume = volume;
				}

				if(opacity < 0.1)
					stage++;	// exit stage
			}
		}

		bird.scale(birdscale);
		bird.applyVelocity();

		bird.update();
	}

	cycle.update();

	params.muted = oAudio.muted;
	params.paused = oAudio.paused;
	params.volume = oAudio.volume;
	params.time = oAudio.currentTime;
}
function exitCheckCustom() {
	console.log('exitCheckCustom()');

	// DOM <AUDIO> element
	if (!oAudio.paused) {
		console.log('stop audio');
		oAudio.pause();
	}
}

function stopfade() {
	console.log("birds::stopfade()");

	if (iOS()) {
		oAudio.pause();
		oAudio.volume = 1.0
	}
	else {
		assetLoader.sounds.crows.pause();
		assetLoader.sounds.crows.volume = 1.0;
	}

	gameOver = 0;	// exit at once regardless the message: there is enought time for message review.
}


//#region CAPTURE
function sceneReady() {
	console.log('sceneReady()');

	if (undefined === canvas) {
		console.log('canvas undefined, exiting');
		return false;
	}

	if (!isAudioReady) {
		console.log('audio not ready, exiting');
		return false;
	}

	return true;
}

function setMobileRecorderCustom(recorder) {
	console.log('setMobileRecorderCustom()');

	// for mobiles
	recorder.canvas = canvas;
	recorder.frontCanvas = canvasText;
	recorder.audio = oAudio;
}

function sceneRemoveCustom() {
	if (ticker.paused) {
		console.log('sceneRemoveCustom(): ticker already stopped');
		return;
	}
	else {
		console.log('sceneRemoveCustom(): ticker stop');
	}

	// canvas.remove();
	divScene = $('div#sjs0')[0];
	divScene.remove();

	// there is no ticker.stop(), have to use ticker.pause()
	ticker.pause();
}
//#endregion

//////////////////// DEBUG //////////////
// keep this region in jsdebug version; clip it off in js version.
//#region DEBUG
function putMark(context, x, y, r, color) {
	if (undefined == color)
		color = 'red';

	context.beginPath();
	context.arc(x, y, r, 0, 2 * Math.PI);
	context.fillStyle = color;
	context.fill();
}

// show trinkets initial scale (make void loop in paint())
function showTrinketsInit() {
	let k = 0;

	for (let i = 0; i < 6; i++) {
		let x = birdW * (i + 1);
		for (let j = 0; j < 4; j++) {
			if (k >= trinkets.length)
				return;

			let bird = trinkets[k];
			let y = birdH * (j + 1);
			//bird.scale(birdscale0);		// good with birdset = 12;
			bird.scale(homeScale);

			//var birdW = 80;
			//var birdH = 64;

			//bird.size(100, 100);	// works as scaling!
			//bird.size(160, 128);	// no errors, nothing shown!?

			//bird.scale(2);	// works! use scale() - safer.

			bird.position(x, y);

			k++;
		}
	}
}

// trinkest positioned on banner
function showTrinketsBanner(scale) {
	for (let i = 0; i < trinkets.length; i++) {
		let bird = trinkets[i];
		bird.scale(scale);
		bird.position(bird.home.x, bird.home.y);
	}
}
//#endregion DEBUG