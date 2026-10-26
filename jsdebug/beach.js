
//// 1st Capture version with single slogan.

// Using assetLoader = new AssetLoader2(imgs, sounds, videos, 'progress-bar', 'progress-rate');
// - with my addition to handle videos as well.

// code pattern - see: docs\sprite-based-scanario-diagram.txt

// Using sprit-js SJS scene
// SJS scene is rendered as <div class="sjs" id="sjs0" ...>
// Layers are rendered as children:
// default: <div id="sjs0-default" ...>
// layer: <canvas id="sjs0-layer" ...>		// shells

// Important for cspture:
// <canvas id="sjs0-video"	// bkg
// <canvas id="sjs0-layer"	// shells

////////
// NB: 'word' and 'scenario' params are the must
// passed in URL as params from scenario.play (PlayHandler.cs) handler.
// all other calls must provide word in params or in sessionStorage

const scenario = "shells";
var recordingDisabled = false;
var recordingChecked = false;

////////
// DEBUG
var debugLogged = false;

// Mouse coordinates.
let mouseX = 0, mouseY = 0;

// var divOverlay;	// created in MoW_template::showOverlay(); removed in MoW_template::startScenario()

let bkgVideo;

var isAudioReady = false;
var isVideoReady = false;	// => videoContainer.ready
var areSpritesReady = false;
var isShowStarted = false;

var isLayerReady = false;
const initTimeout = 10000000;	// 3000;

var startTime;

// Audio
const isIos = iOS();
var oAudio;

// Video
// reliable video size is available only when video is loaded - too late.
// Let's relay on pre-defined video properties
var videoSrc = "video/beach_pbar.mp4";

var progress;	// progress bar position: 0 - 1000
var iFrame = 0;
var iFramePrev = 0;

// Video: instead of waiting for video load to obtain the size, i will use presets:
// myVideo.videoHeight / myVideo.videoWidth;
var videoH = 410;
var videoW = 728;
var canvasH = videoH;
var canvasW = videoW;
var videoContainer = null; // object to hold video and associated info

// # conflicts with mow.js function isMobile()
// var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// === SPRITE stuff ===

var imgarray = [];
let i = 0;
for (i = 0; i < 11; i++) {
	let src = "imgs/shells/shell_" + i + ".png";
	imgarray.push(src);
}

var bkgSound = "sounds/03326.mp3";

var assetLoader;	// my AssetLoader2 in mow.js

var scene;
var layer;			// 'layer'
var layerVideo;		// ???
var cycle;
var ticker;
var sprites = [];
var contextMow;

var canvasBkg;
var canvas;

// Banner in % of context
// # bottom 99 - exception on SHELLS|SHELLS; find out why.
var rcInput = new Rectangle(1, 99, 48, 98);		// => rcScaled
// convergence factor mimicking perspective
var convFactor = 0.8;	//0.7;

var rcScaled;	// Debug: blue; defined by const rcInput - max allowed area for trinkets, input for terrain mapping.
var rcBannerMax;	// red; ShowRaster::GetBanner() - max enclosed in rcScale raster-wrapping rect.
var rcBanner;		// blue; raster-wrapping rect assuming preset targetScale.

var spriteSize = 128;	//base sprite size (average max)
var targetScale = 1.0;	// will be calculated based on canvas width and spriteScale
var spriteScale = 1/64;

// timeframe
var dryStart = 9.0;
var dryEnd = 13.0;
var wipeStart = 14.0;
var wipeEnd = 19.0;
var delta = 1.0;	// 1 sec between wipeSkirt rows

// progress bar to time mapping factor
progressfactor = 0.0233;	// 23.3 / 1000;

var loopCount = 1;	// 2;
var loopIdx = 0;

// important to skip blurred screen in recording.

// # will it interfere with blur/focus handlers in csenario_three_template?
// DON'T remove this! Focus in/out sinchro gets broken. Why csenario_three_template doesn't work!?
window.addEventListener('blur', function (e) {
	if (null != videoContainer) {
		videoContainer.video.pause();
		oAudio.pause();
	}
});
window.addEventListener('focus', function (e) {
	if (null != videoContainer) {
		videoContainer.video.play();
		oAudio.play();
	}
});

//////
// MoW_template::checkAssets() works well for THREE.JS scenarios.
// Using ugly patch here: #1: raster; #2: assetsLoaded() - callback of AssetLoader2 - all other assets.
const assets = 2;
let assetsCount = 0;
//////

// DeepSeek: Function to center the canvas horizontally (using my setVideoSize())
function centerCanvas() {
	// scenario_trhree_template.js: returns max contained size of given aspect
	let size = setVideoSize(16, 9);

	// defined in scenario_three_template.js
	gameWidth = size.W;
	gameHeight = size.H;

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



//#region RASTER
// <scenario> calls ShowRaster::getRaster() => callback: <scenario>::RasterReady()
// ShowRaster::rasterParams shoul be ready here.
const slogans = rasterParams.text.split('||');
if (slogans.length > loopCount)
	loopCount = slogans.length;

// NB: uses global rasterParams object (ShowRaster.js). Set other properties if/as needed.
rasterParams.fontFamily = 'LED';

// optional 'slogan' param - to override rasterParams.text for multi-slogan scenarios.
getRaster(rasterReady, slogans[loopIdx]);

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
	if (loopIdx > 0) {
		// repeat
		console.log(`Loop: ${loopIdx} Slogan: ${slogans[loopIdx]}`);

		// for some absolutely misterious reason raster (defined in ShowRaster) stays unchanged from loop 0!?
		raster = result;	// re-assign to be sure

		initSprites();
		videoContainer.video.play();
	}
}
//#endregion

// jagged array
// each line is taken for specific time; time intervals are equal. Here time span: 14 - 19; intervel 1 sec
var wipeSkirt = [
	[[0, 42], [38, 44], [75, 40], [100, 44]],
	[[0, 50], [46, 53], [74, 52], [100, 53]],
	[[0, 74], [63, 75], [88, 73], [100, 73]],
	[[0, 85], [19, 82], [64, 86], [79, 89], [100, 89]],
	[[0, 93], [41, 96], [90, 97], [100, 95]],
	[[0, 100], [100, 100]]
];

//// terrain mapping stuff
// src image size
var bannerTop = 208;
var bannerBot = 410;
var bannerWidth = 728;
var bannerHeight = bannerBot - bannerTop;

// jagged array (imitating beach terrain - rect grid with equal quads mapped to beach image.)
var terrainmap = [
	[[421, 486], [686, 491], [961, 483], [1241, 473], [1497, 472]],
	[[386, 551], [663, 561], [960, 560], [1264, 544], [1532, 540]],
	[[354, 627], [649, 632], [958, 631], [1278, 618], [1566, 618]],
	[[311, 698], [624, 701], [959, 700], [1303, 690], [1609, 694]],
	[[268, 770], [595, 784], [959, 783], [1332, 771], [1654, 768]],
	[[208, 841], [571, 859], [959, 859], [1356, 847], [1705, 852]],
	[[143, 898], [537, 913], [961, 913], [1391, 904], [1779, 903]],
	[[70, 963], [507, 979], [961, 979], [1420, 972], [1852, 962]],
	[[0, 1047], [478, 1053], [961, 1054], [1449, 1050], [1922, 1049]]
];
////

// teaser sprite - for debugging and decoration (out of banner sprite)
let spTeaser;


////////// inserting basic functions here after 'sprite-based-scanario-diagram.txt' pattern.

//#region BEFORE PLAY BTN

//#region ASSETS
initAssets();

function initAssets() {
	console.log("initAssets()");
	// there is imgarray of img sources
	var imgs = {};

	// add properties to imgs object using square brackets notation method
	// object['new_property'] = new_value;
	for (i = 0; i < imgarray.length; i++) {
		let key = 'shell' + i;
		imgs[key] = imgarray[i];
	}

	var sounds = {
		'waves': bkgSound
	};

	var videos = {
		'surf': videoSrc
	};

	// my version of AssetLoader() in mow.js with video added.
	assetLoader = new AssetLoader2(imgs, sounds, videos, 'progress-bar', 'progress-rate');

	// add callback
	assetLoader.load(assetsLoaded);
}

function assetsLoaded() {
	assetsCount++;
	checkAssets(assets, assetsCount, 'AssetLoader2');

	// MoW_template:: checkAssets() -> init();showOverlay();
}

// init is called from MoW_templates() when all assets are loaded
function init() {
	console.log("beach: init()");
	initAudio();
	initVideo();
}

function initAudio() {
	console.log("initAudio()");

	if (iOS()) {
		oAudio = document.createElement("AUDIO");
		oAudio.id = "myaudio";
		oAudio.src = bkgSound;
		oAudio.volume = 1;
		var onEnded = function () {
			this.play();
		};
		oAudio.addEventListener('ended', onEnded, false);
	}
	else {
		//oAudio = assetLoader.sounds.crows;
		// oAudio = new Audio(bkgSound);
		oAudio = assetLoader.sounds.waves;
	}

	isAudioReady = true;
}

// NB: video may load slowly on the phone. Especially if memory is low.
// Adding ready check: video.onloadeddata event handling
function initVideo() {
	console.log("initVideo()");

	bkgVideo = assetLoader.videos.surf;

	// bkgVideo.onloadeddata - too late, event consumed in AssetLoader2

	bkgVideo.autoPlay = false; // ensure that the video does not auto play
	bkgVideo.loop = false; // set the video to loop. (disables 'onended' event)
	videoContainer = {  // we will add properties as needed
		video: bkgVideo,
		ready: false,
	};

	// set to max contained size.
	// can't change VIDEO aspect ratio; myVideo.videoWidth - internal value. myVideo.width - assigned.
	// video size changes, but myVideo.width stays 0. Must assign the value to use it.

	// fullscreen (in MoW_template)
	let value = tryFullScreen();

	let videoScale = Math.min(
		value.w / videoW,
		value.h / videoH);

	canvasH = videoScale * videoH;
	canvasW = videoScale * videoW;

	videoContainer.scale = videoScale;

	//// getRaster();	// ShowRaster.js => rasterReady() callback
	//getRasterFromApi(slogans[loopIdx], 'led1');

	bkgVideo.addEventListener("ended", onended);		// flags loop end.

	videoContainer.ready = true;
	isVideoReady = true;
}
//#endregion



/////////////// Overlay: [PLAY] button ///////////////
// OnClick: MoW_template::startScenario() => startShow()
/////////////// 

function initScene() {
	console.log("initScene()");

	// raster is defined in ShowRaster
	if (null == raster) {
		stopShow();	// mow.js
		return false;
	}

	scene = sjs.Scene({ w: canvasW, h: canvasH });
	layerVideo = scene.Layer("video", { useCanvas: true });
	layer = scene.Layer("layer", { useCanvas: true });

	// hide before startShow()
	let mysjs = document.getElementById("sjs0");
	mysjs.style.display = "none";

	layerVideo.w = layer.w = canvasW;
	layerVideo.h = layer.h = canvasH;

	cycle = sjs.Cycle([[0, 0, 5]]);

	scene.loadImages(imgarray, initSprites);

	// shells context
	contextMow = scene.layers.layer.ctx;

	// DEBUG
	if (typeof contextMow === "undefined") {
		debugger;
		alert('init(); contextMow undefined');
	}
	if (typeof rcInput === "undefined") {
		debugger;
		alert('init(); rcInput undefined');
	}

	// assets average size: 128x128
	let imgW = imgH = 128;

	// set size relative to canvas width: 1/64
	targetScale = canvasW / imgW * spriteScale;

	//////////
	// get recorder sources ready
	divScene = document.querySelector('div#sjs0');
	canvasBkg = document.querySelector('#sjs0-video');
	canvas = document.querySelector('#sjs0-layer');

	// Center the canvas initially
	centerCanvas();

	isLayerReady = true;
	return true;
}

// simplified scaling - pre-set fraction of canvas width (with possiblility of further correction),
// instead of fitting the slogan inside banner rect.
// Rects (shown in debug mode)
// rcScaled (blue) - max allowed rect - src map area.
// rcBannerMax (red) - ShowRaster::GetBanner() - max enclosed in rcScale raster-wrapping rect.
// rcBanner (green) - raster-wrapping rect assuming preset targetScale.

function initSprites() {
	console.log("initSprites()");

	if (undefined === scene) {
		console.log("initSprites() aborted: Scene undefined");
		return;
	}

	// letters are too tall. Try to correct:
	let yscale = 0.6;

	// calc physical rect on canvas (from old unmapped version)
	let ctx = contextMow;
	rcScaled = new Rectangle(rcInput.left * canvasW / 100, rcInput.right * canvasW / 100, rcInput.top * canvasH / 100, rcInput.bottom * canvasH / 100);

	let bannerCenter = new Point((rcScaled.left + rcScaled.right) / 2, (rcScaled.top + rcScaled.bottom) / 2);

	// calc banner rect: physical text boundaries
	if (!rasterSize)	// ShowRaster
		rasterSize = raster.Statistics.TextSize;

	rcBannerMax = getBanner(rcScaled, rasterSize);

	// shell image index
	let imgidx = Math.floor(random(0, imgarray.length));

	// multy-slogan addition
	// remove sprites from previous loop; except teaser
	if (sprites.length > 1) {
		for (let i = 0; i < sprites.length; i++) {
			if (undefined == sprites[i].teaser) {
				cycle.removeSprite(sprites[i]);
			}
		}
		sprites = [];
		sprites.push(spTeaser);
	}

	// create scaled raster array: assuming 1 shell size step
	var raster1 = [];

	// 1: map raster to the image bottom side, rectangular mapping.
	// banner rect - based on raster size and spriteSize
	let targetSize = spriteSize * targetScale;
	let bannerW = rasterSize.Width * targetSize;
	let bannerH = rasterSize.Height * targetSize;
	rcBanner = new Rectangle(bannerCenter.x - bannerW / 2, bannerCenter.x + bannerW / 2,
		bannerCenter.y - bannerH / 2, bannerCenter.y + bannerH / 2);

	// fix banner rect if it overlaps area: rcScaled
	if (rcBanner.left < rcScaled.left || rcBanner.bottom > rcScaled.bottom) {
		let scaleFix = 1;
		if (rcBanner.left < rcScaled.left) {
			scaleFix = rcScaled.w / rcBanner.w;
		}
		else {
			scaleFix = rcScaled.h / rcBanner.h;
		}

		let wfix = rcBanner.w * scaleFix;
		let hfix = rcBanner.h * scaleFix;

		// fix banner
		rcBanner = new Rectangle(bannerCenter.x - wfix / 2, bannerCenter.x + wfix / 2,
			bannerCenter.y - hfix / 2, bannerCenter.y + hfix / 2);

		targetSize *= scaleFix
	}

	// map raster to raster1 - contained in rcBanner
	// rcBanner.center.x

	// in ShowRaster:
	forEachRasterPoint(raster, myCallback);

	// callback({ X: pnt.X, Y: pnt.Y, iChar: i, iPoint: j, iLine: pnt.LineIndex});
	function myCallback(rp) {
		let pnt = new Object;
		pnt.X = rcBanner.center.x + rp.X * targetSize;
		pnt.Y = rcBanner.center.y + rp.Y * targetSize;

		raster1.push(pnt);
	}

	// 2. remap raster rect onto terrain.
	rastermapped = mapraster(terrainmap, rcScaled, raster1);

	// Scaling factor
	let nCols = terrainmap[0].length;
	let nRows = terrainmap.length;

	let topW = terrainmap[0][nCols - 1][0] - terrainmap[0][0][0];
	let botW = terrainmap[nRows - 1][nCols - 1][0] - terrainmap[nRows - 1][0][0];
	let topScale = targetScale * topW / botW;

	rastermapped.forEach(function (pnt) {
		// putCross(ctx, pnt.X, pnt.Y, 12, 'blue');

		let sp = scene.Sprite(imgarray[imgidx++], layer);
		if (imgidx >= imgarray.length) {
			imgidx = 0;
		}

		let x = pnt.X;
		let y = pnt.Y;

		// interpolate scale
		let scale = interpolate(rcScaled.bottom, rcScaled.top, targetScale, topScale, y);

		// positionCenter(sp, x, y);
		// Adding yscale (another cratch!)
		// y starts from top. Correct top
		let delta = (1 - yscale) * (rcScaled.bottom - rcScaled.top);
		positionCenter(sp, x, delta + y * yscale);

		sp.scale(scale);
		sp.rotate(random(0, 2 * Math.PI));
		// absolutely idiotic miracle: opacity == 1 or opacity == 1.0 - scale does not work!? opacity 0.99 - OK
		sp.opacity = 0.0;	// 0.99; - shows shells briefly at the start
		sprites.push(sp);
	});

	if (loopIdx == 0) {
		addTeaser();
	}

	cycle.addSprites(sprites);

	areSpritesReady = true;
}


// remap raster rect onto terrain.
/*
map: 2-dim array (matrix) of points, point coords in rcInput bounds (calculate rcInput)
  (produced by PngMarkersReader tool).
assumptions: NxM matrix, original points are the nodes of NxM grid with equal quads (same H, same W);
  top row - nin Y; 1st point in the row - min X.
rcOut: rectangle in output bkg (scaled to device viewport)

raster1: scaled to be contained in the rect: banX, banY, banW, banH

returns mapped 2-dim array of points
*/

function mapraster(map, rcOut, raster1) {
	console.log("mapraster()");

	// assuming raster1 is contained in rcOut:
	// Cut output rect to grid (quads) by map dimension.
	// number of quadrants
	let nQ = map.length - 1;
	let mQ = map[0].length - 1;

	// size of quadrants
	let xQ = rcOut.w / mQ;
	let yQ = rcOut.h / nQ;

	// calc map-containing rect rcMap
	// top should be in the 1st row
	let rcMapTop = 10000;
	for (i = 0; i < map[0].length; i++) {
		if (map[0][i][1] < rcMapTop)
			rcMapTop = map[0][i][1];
	}

	// bottom - last row
	let rcMapBottom = -1000;
	for (i = 0; i < map[nQ].length; i++) {
		if (map[nQ][i][1] > rcMapBottom)
			rcMapBottom = map[nQ][i][1];
	}

	// left - in 1st column
	let rcMapLeft = 10000;
	for (i = 0; i < map.length; i++) {
		if (map[i][0][0] < rcMapLeft)
			rcMapLeft = map[i][0][0];
	}

	// right - last column
	let rcMapRight = -1000;
	for (i = 0; i < map.length; i++) {
		if (map[i][mQ][0] > rcMapRight)
			rcMapRight = map[i][mQ][0];
	}

	// map to rcOut scale
	let scaleX = rcOut.w / (rcMapRight - rcMapLeft);
	let scaleY = rcOut.h / (rcMapBottom - rcMapTop);

	// foreach raster1 point find quad iQ and relative (0..1) remainder rX
	// interpolate it to map coords xMap, yMap; calc trinket scale
	// recalc map coords to rcOut

	const mapped = [];
	raster1.forEach(function (rpnt) {
		let x = rpnt.X;
		let y = rpnt.Y;

		// find quad and relative (0..1) coord in the quad
		let iQ = Math.floor((x - rcOut.left) / xQ);
		// let remx = x % xQ; NB: straight-forward but glitch-prone way.
		let remx = (x - rcOut.left) - iQ * xQ;
		let rx = remx / xQ;

		let jQ = Math.floor((y - rcOut.top) / yQ);
		let remy = (y - rcOut.top) - jQ * yQ;
		let ry = remy / yQ;

		// make sure not to exceed array boundaries
		let ileft, iright, jbot, jtop;
		if (iQ >= mQ) {
			ileft = mQ - 1;
			iright = mQ;
			rx += 1;
		}
		else {
			ileft = iQ;
			iright = iQ + 1;
		}

		if (jQ >= nQ) {
			jbot = nQ - 1;
			jtop = nQ;
			ry += 1;
		}
		else {
			jbot = jQ;
			jtop = jQ + 1;
		}

		// safety catch
		if (ileft < 0) ileft = 0;

		// find 'meridian' in the quad: top and bot points
		let xbot = lerp(terrainmap[jbot][ileft][0], terrainmap[jbot][iright][0], rx);
		let xtop = lerp(terrainmap[jtop][ileft][0], terrainmap[jtop][iright][0], rx);

		let ybot = lerp(terrainmap[jbot][ileft][1], terrainmap[jbot][iright][1], rx);
		let ytop = lerp(terrainmap[jtop][ileft][1], terrainmap[jtop][iright][1], rx);

		// find mapped point on the meridian: this is coords in rcMap; recalc them to rcOut
		let xmapped = lerp(xbot, xtop, ry);
		let ymapped = lerp(ybot, ytop, ry);

		// recalc map coords to rcOut
		let pnt = new Object();
		pnt.X = rcOut.left + (xmapped - rcMapLeft) * scaleX;
		pnt.Y = rcOut.top + (ymapped - rcMapTop) * scaleY;

		// something went south in these overcomplicated calculations. Coorrect Y to move it in rcBanner 
		pnt.Y += rcBanner.h / 2;

		mapped.push(pnt);
	});

	return mapped;
}


// amt = 0..1
function lerp(start, end, amt) {
	return (1 - amt) * start + amt * end
}

// add teaser sprite that stays unfaded
function addTeaser() {
	console.log("addTeaser()");

	imgidx = Math.floor(random(0, imgarray.length));
	spTeaser = scene.Sprite(imgarray[imgidx], layer);
	spTeaser.scale(targetScale * 1.4);
	spTeaser.rotate(random(0, 2 * Math.PI));
	spTeaser.opacity = 0.0;

//	let halfWidth = spriteSize * spTeaser.xscale / 2;
	let fullwidth = spriteSize * spTeaser.xscale;

	// left or right
	let x = random(0, 2.0) > 1.0 ? canvasW - fullwidth : fullwidth;
	positionCenter(spTeaser, x, canvasH - fullwidth);

	// set tease custom property
	spTeaser["teaser"] = true;

	sprites.push(spTeaser);
}

// poor-man async: check in the paint() loop if everything is ready

// returns bool initialized
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

	if (undefined === canvas) {
		canvas = $('canvas')[0];
		ready = false;
	}

	return ready;
}

// sprite.js version of render() - called on each cycle.
function paint() {
	//console.log("paint()");
	// IMPORTANT: calls exitCheck(), resumeRecord()
	if (!entryCheck())
		return;

	let debugShow = false; // show area and banner rectangles.

	cycle.next(ticker.lastTicksElapsed);

	// wash away stage. Get time in washaway map
	let timepair = null;

	// NB: keeping debugPaint() at the bottom ate a lots of my blood! Sprites did not show!
	if (debugShow)
		debugPaint();
	else {
		// message
		if (loopIdx == loopCount - 1) {
			// if last loop
			if (progress > 700)
				messageOnCanvas(canvas, rasterParams.message, { color: 'blue', strokeColor: 'blue' });
		}
	}

	updateCanvas();

	// my big issue here: video.currentTime is not reliable. Different browsers give different timing.
	// using 'mytime' instead - derived from progress
	let mytime = progress * progressfactor;

	if (mytime >= wipeStart && mytime < wipeEnd) {
		timepair = getTimePair(mytime, 1.0, wipeStart, wipeEnd);
	}

	let allFadedTest = true;
	sprites.forEach(function (sp) {
		// absolutely idiotic miracle: opacity == 1 or opacity == 1.0 - scale does not work!? opacity 0.99 - OK

		if (null != timepair) {
			updateFading(sp, timepair);
		} else if (mytime >= dryStart && mytime < dryEnd) {
			updateDrying(sp, mytime);
			allFadedTest = false;
		}

		sp.update();
	});
}

function debugPaint() {
	// putCross(contextMow, 200, 200, 12, 'blue');

	messageOnCanvas(canvas, Math.round(progress), { color: 'blue', strokeColor: 'blue' });

	contextMow.beginPath();
	contextMow.lineWidth = "1";
	contextMow.strokeStyle = "yellow";
	contextMow.rect(rcBannerMax.left, rcBannerMax.top, rcBannerMax.w, rcBannerMax.h);
	contextMow.stroke();

	contextMow.beginPath();
	contextMow.lineWidth = "1";
	contextMow.strokeStyle = "blue";
	contextMow.rect(rcScaled.left, rcScaled.top, rcScaled.w, rcScaled.h);
	contextMow.stroke();

	contextMow.beginPath();
	contextMow.lineWidth = "1";
	contextMow.strokeStyle = "green";
	contextMow.rect(rcBanner.left, rcBanner.top, rcBanner.w, rcBanner.h);
	contextMow.stroke();

	// coord grid inside rcScaled
	let rx, ry;		// relative coordinates, 0..1
	let dx = 0.1;
	let dy = 0.05;
	//let dx = 0.1 * canvas.width;
	//let dy = 0.05 * canvas.height;

	let yl = (1 - dy) * canvas.height;	// lowest horiz line

	contextMow.strokeStyle = "red";
	contextMow.fillStyle = "red";
	contextMow.font = "bold 16px Arial";

	rx = dx;
	while (rx < 1) {
		let x = rx * canvas.width;
		//contextMow.fillText(rx.toFixed(2), x, rcScaled.bottom);
		contextMow.fillText(rx.toFixed(2), x, (canvas.height + rcScaled.bottom) / 2);

		contextMow.lineWidth = "1";
		contextMow.beginPath();
		contextMow.moveTo(x, rcScaled.top);
		contextMow.lineTo(x, rcScaled.bottom);
		contextMow.stroke();
		rx += dx;
	}

	ry = dy;
	while (ry < 1) {
		let y = ry * canvas.height;
		contextMow.fillText(ry.toFixed(2), 0, y);

		if (ry > 0.5) {
			contextMow.lineWidth = "1";
			contextMow.beginPath();

			contextMow.moveTo(rcScaled.left, y);
			contextMow.lineTo(rcScaled.right, y);
			contextMow.stroke();
		}

		ry += dy;
	}
}


function exitCheckCustom() {
	console.log('exitCheckCustom()');

	// DOM <AUDIO> element
	if (!oAudio.paused) {
		console.log('stop audio');
		oAudio.pause();
	}
}

// update sprite opacity on fading stage
function updateFading(sp, timepair) {

	// # issue here: sprite x, y are coords of top left corner BEFORE scaling.
	// need to recalc X: sp center; y, y1: scaled image

	// px
	let pxcenter = sp.x + spriteSize / 2;
	let pycenter = sp.y + spriteSize / 2;
	let pytop = pycenter - spriteSize * sp.yscale / 2;
	let pybottom = pycenter + spriteSize * sp.yscale / 2;
	// %
	let xcenter = pxcenter / layer.w * 100;
	let ytop = pytop / layer.h * 100;
	let ybottom = pybottom / layer.h * 100;

	// get wave skirt Y percent
	let skirtY = getSkirtYT(wipeSkirt, xcenter, timepair.idx, timepair.dt, delta);
	// pixels
	// let sY = skirtY * layer.h;

	// if skirt is above - no change
	if (skirtY < ytop) {
		sp.opacity = 0.99;
	} else if (skirtY > ybottom) {
		// wipe
		if (!sp.teaser) {
			sp.opacity = 0.0;
			// to remove we need index
			let idx = sprites.indexOf(sp);
			sprites.splice(idx, 1);
		}
	} else {
		allFadedTest = false;	// this one is still fading

		// shake and fade away
		sp.rotate(random(-0.2, 0.2));
		if (!sp.teaser) {
			let opacity = interpolate(ytop, ybottom, 0.99, 0.01, skirtY);
			sp.opacity = opacity;
		}

		/////////
		// debug
		//if (!debugLogged) {
		//	debugLogged = true;

		//	console.log('myVideo.currentTime: ' + myVideo.currentTime);
		//	console.log('ytop: ' + ytop);
		//	console.log('ybottom: ' + ybottom);
		//	console.log('skirtY: ' + skirtY);
		//	console.log('sp.y: ' + sp.y);
		//	console.log('sp.yscale: ' + sp.yscale);
		//	console.log('layer: ' + layer.w + ', ' + layer.h);
  //      }
	}
}

// my primitive scenario: lithoral band, where shells are partially visible. Band starts narrow, then get wider.
// below band all visible. Above band - invisible. On the band - partial.
function updateDrying(sp, mytime) {
	let ybottom = rcBanner.bottom / canvasBkg.height * 100;
	let ytop = rcBanner.top / canvasBkg.height * 100;

	let bandbottom = (ybottom - ytop) / 5;
	let bandtop = (ybottom - ytop) / 2;

	// skirt band
	let bandwidth = interpolate(dryStart, dryEnd, bandbottom, bandtop, mytime);

	// virtual wave skirt - there is no clear skirt on the video
	let yskirt = interpolate(dryStart, dryEnd, ybottom + bandwidth, ytop, mytime);

	let pycenter = sp.y + spriteSize / 2;
	let ycenter = pycenter / layer.h * 100;

	// all below skirt - visible; on the band - drying up; above band - invisible
	if (ycenter > yskirt) {
		sp.opacity = 0.99;
	} else if (ycenter < yskirt - bandwidth) {
		sp.opacity = 0.0;
	} else {
		sp.opacity = interpolate(yskirt, yskirt - bandwidth, 0.99, 0.0, ycenter);
	}
}

// assuming
function updateCanvas() {
	let ctx = scene.layers.video.ctx;
	let canvas = ctx.canvas;

	// only draw if loaded and ready
	if (videoContainer !== undefined && videoContainer.ready) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// now just draw the video the correct size
		ctx.drawImage(videoContainer.video, 0, 0, canvas.width, canvas.height);

		progress = getProgress();
		//console.log('progress:', Math.round(progress));
	}
	// all done for display
	// request the next frame in 1/60th of a second
	// requestAnimationFrame(updateCanvas);
}

// relative progress value: 0 - 1000
function getProgress() {
	let ctx = scene.layers.video.ctx;
	var ImageData = ctx.getImageData(0, 0, ctx.canvas.width, 2);

	let i, j, r, g, b, a;
	for (i = iFramePrev; i < ctx.canvas.width; i++) {
		// RGBA; progress bar: R == 0, G == 0, B > 200, A == 255
		j = 4 * i;
		r = ImageData.data[j];
		g = ImageData.data[j + 1];
		b = ImageData.data[j + 2];
		a = ImageData.data[j + 3];
		if (r + g > b) {
			// not blue bar
			iFrame = i;
			break;
		}
	}

	if (videoContainer.video.currentTime < 0.1) {
		// reset
		iFrame = iFramePrev = 0;
	}
	else {
		iFramePrev = iFrame;
	}

	return iFrame / ctx.canvas.width * 1000;
}

// on loop end
function onended() {
	console.log("onended(): loopCount:", loopCount, 'loopIdx:', loopIdx);

	// loopCount is preset for single slogan (1, 2 or 3) or slogans count if multiple.
	if (loopIdx++ < loopCount - 1) {
		if (1 == slogans.length) {
			console.log('Re-init sprites for the same slogan:', slogans[0]);
			initSprites();	// 2-nd loop with the same magic word
			videoContainer.video.play();
		}
		else {
			console.log('Requested raster for slogans[', loopIdx, ']:', slogans[loopIdx]);
			myAssetsCount = -1;	// reset getRaster extra loop safety catch
			getRaster(rasterReady, slogans[loopIdx]);
		}
	} else {
		// stopShow();
		console.log('Raising gameOver flag.');
		gameOver = 0;	// Right away
	}
}


/////////// test tools
// Use or copy from beach_design
/////////// end of test tools


// timeframe/behavior functions
// get Y of the skirt for the row (2D sub-array). X, Y - percent.
function getSkirtY(arr, x) {
	// pair = [x,y]
	let idx = 0;
	let i = 0;
	let pair;
	let y = null;
	try {
		for (i = 0; i < arr.length; i++) {
			pair = arr[i];
			if (x < pair[0]) {
				idx = i;
				break;
			}
		}
		//y = interpolate(arr[idx - 1][0], arr[idx][0], arr[idx - 1][1], arr[idx][1], x);
		// safety check
		if (0 === idx) {
			y = arr[0][1];
		}
		else {
			y = interpolate(arr[idx - 1][0], arr[idx][0], arr[idx - 1][1], arr[idx][1], x);
		}
	}
	catch (e) {
		console.error(e.message);
		console.log('arr.length:', arr.length, 'x:', x, 'idx:', idx, 'i:', i);
	}

	return y;
}

// for given time find irow - idx in skirt-time-map array and time since idx time.
// assumptions: each sub-array is skirt map for T + dt. ist one: tmin; last one: tmax; time - seconds, x,y - percent.
// returns {idx, dt}
function getTimePair(t, delta, tmin, tmax) {
	if (t < tmin || t > tmax) {
		return null;
	}

	// find time row - index of sub-array
	let irow = Math.floor((t - tmin) / delta);

	// find time span from irow
	let dt = t - (tmin + irow * delta);

	return {
		idx: irow,
		dt: dt
	};
}

// get Y of the skirt for x at time t; map - whole skirt-time-map array.
// assumptions: each sub-array is skirt map for T + dt. ist one: tmin; last one: tmax; time - seconds, x,y - percent.
// {idx, dt} - returned from getTimePair()
function getSkirtYT(map, x, idx, dt, delta) {
	if (idx >= map.length - 1) {
		return 100.0;
	}

	let ytop = getSkirtY(map[idx], x);
	let ybot = getSkirtY(map[idx + 1], x);

	// interpolate(x0, x1, f0, f1, x);
	let y = interpolate(0, delta, ytop, ybot, dt);

	return y;
}

// places element inside container
function placeElement(id, x_pos, y_pos) {
	var d = document.getElementById(id);
	d.style.position = "absolute";
	d.style.left = x_pos + 'px';
	d.style.top = y_pos + 'px';
}

//#region CAPTURE
//// RTC issue: not always scene (canvas) is ready at the Play button

//// solution
//scenario_three_template:: recorder !== null
//    - started
//initAll(): if RTC: if null === recorder: startRecording()
//startRecording() -> <scenario>::sceneReady()	// check all components for RTC

function sceneReady() {
	console.log('sceneReady()');

	// canvas required for RTCs
	if (undefined === canvas) {
		console.log('canvas undefined, exiting');
		return false;
	}

	// sound based on THREE.Listener will be handled in scenario_three_template::setMobileRecorder()
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

	initScene();
	try {
		if (!iOS()) {
			oAudio.loop = true;
		}
		oAudio.play();
	}
	catch (err) {
		alert(err.message);
	}

	videoContainer.video.play();

	let divsjs = document.getElementById("sjs0");
	divsjs.style.display = "block";

	ticker = scene.Ticker(30, paint);
	//ticker.run(); => scenario_three_template::startShow()

	let dt = new Date();
	startTime = dt.getTime();
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

function setMobileRecorderCustom(recorder) {
	console.log('setMobileRecorderCustom()');

	// video
	canvasBkg = $('canvas#sjs0-video')[0];
	canvas = $('canvas#sjs0-layer')[0];

	recorder.audio = oAudio;

	recorder.bgCanvas = canvasBkg;
	recorder.canvas = canvas;
}
//#endregion
