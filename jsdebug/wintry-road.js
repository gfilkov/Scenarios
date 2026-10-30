const scenario = "wintry-road";
var recordingDisabled = false;
var recordingChecked = false;

//#region VARS
var wiperl = null;
var wiperr = null;
var pivotR, pivotL;		// wipers pivot points
var wiperson = false;

var allwipedtime;	// for time safety catch: time when wipers are back.
var lastVisible = 0;	// last visible flake index in the raster
var wiping = false;
var allwiped = false;

var flakes = [];
var trinkets = [];	// flakes on the banner

var assetLoader;	// my AssetLoader2 in mow.js

var rcOrigin;	// new Rectangle(left, right, top, bottom);	// snowflakes origin: ShowRaster.js. Args - %

var scene = null;
var layermow, layercar, layerbkg;
var canvasbkg = null;
var canvasmow = null;	// flakes
var canvascar = null;
var car = null;	// sprite on layercar
var bkg = null;	// GIF

let divScene;
var cycle;
var ticker;

var startTime;
var prevTime;
var dtime;

// DEBUG
let testsprite;
let testpos = new Point(100, 100);

//#endregion VARS

//#region CONFIG
const carshieldH = 64;	// % from top to dashboard
var carscale = -1;	// to be assigned
const wiperscale = 0.37;	// use with carscale, because wiper is part of car.
const wiperMaxAngle = Math.PI * 0.6;	// angle at which wipers start moving back
const wiperfactor = 1.2;	// left wiper run-ahead factor
const wiperspeedfactor = 1;	// 0.2;	//1;

const snowAccumulationTime = 5000;	// msec
const snowWaitTime = 3000;

const flakesize = 32;	// average 
const flakesCount = 512;	// 256;
const speed = 20;
const initialDistance = 30;
let targetScaleFactor = 0.4 / 1685; //0.25 / 1685;	// empiric test on PC
let targetFlakeScale = 1;	// Scale of the flake on the windshield. Not using global targetScale here.
let maxScale = 1;	// to be calculated as gameWidth factor.

const blowFactor = 10;	// flake blow away probability factor

// max number of idle cycles while initializing. If over: initialization timeout.
const idleCycles = 64;
let cyclesCount = 0;
//#endregion CONFIG

//#region BEFORE PLAY BTN

let showMessage = false;	// user message



//#region RASTER
// <scenario> calls ShowRaster::getRaster() => callback: <scenario>::RasterReady()
// ShowRaster::rasterParams shoul be ready here.

// multi-slogan functionality
let iloop = 0;
let nLoops = 2;	// 2;
let loopOver = false;

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
// snowy-road-70.gif: 70% brightness version of snowy-road.gif
//var imgarray = ['snowy-road-90.gif', 'view-windshield-car-transparent.png', 'test_rect.png'];
var imgarray = ['imgs/wintry-road/snowy-road-90.gif', 'imgs/wintry-road/view-windshield-car-transparent.png', 'imgs/wintry-road/wiper_slim.png'];
//var imgarray = ['snowy-road-90.gif', 'view-windshield-car-transparent.png', 'target.png'];

// wiper_slim anchor: (18, 16)
var wiperAnchor = new Point(18, 16);

const flakesidx = imgarray.length;	// flakes start in imgarray

// DeepSeek: Function to center the canvas horizontally (using my setVideoSize())
let marginLeft;
function centerCanvas() {
	console.log(scenario + ".centerCanvas()");

	////////////////////// center viewport

	divScene.style.setProperty('object-fit', 'contain', 'important');
	divScene.style.setProperty('object-position', '50% 50%', 'important');

	divScene.style.setProperty('margin-left', 'auto', 'important');
	divScene.style.setProperty('margin-right', 'auto', 'important');

	//////////////////////
}
// Re-center the canvas on window resize
window.addEventListener('resize', centerCanvas);

// add snowflakes
let i = 0;
for (i = 0; i < 4; i++) {
	let src = "imgs/snowflakes-fuzzy/flake" + i + ".png";
	imgarray.push(src);
}
// clone - needed for scene.load()
var imgsrcs = imgarray.map((x) => x);

//////
// MoW_template::checkAssets() works well for THREE.JS scenarios.
// Using ugly patch here: #1: raster; #2: assetsLoaded() - callback of AssetLoader2 - all other assets.
const assets = 2;
let assetsCount = 0;
//////

initAssets();
function initAssets() {
	console.log("initAssets()");

	let sounds = {};
	let videos = {};

	assetLoader = new AssetLoader2(imgarray, sounds, videos, 'progress-bar', 'progress-rate');

	// add callback
	assetLoader.load(createScene);
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
	// initAudio();
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

	// check GIF size
	bkg = assetLoader.imgs[0];

	// annoying case: loaded, but width is 0
	if (0 == bkg.width) {
		console.log("createScene(): bkg.width is 0, exiting.");
		alert("createScene(): bkg.width is 0, exiting.");
		return false;
	}

	let val = setGameSize(bkg.width, bkg.height);	// mow_template
	gameWidth = val.W;
	gameHeight = val.H;

	scene = sjs.Scene({ w: gameWidth, h: gameHeight });	// creates 'div#sjs0'

	divScene = document.querySelector('div#sjs0');
	centerCanvas();

	scene.loadImages(imgsrcs, initScene);

	console.log('scene.w:', scene.w, 'scene.h', scene.h);
}

function initScene() {
	console.log("initScene()");

	layerbkg = scene.Layer("layerbkg", { useCanvas: true, autoClear: false });
	layermow = scene.Layer("layermow", { useCanvas: true });
	layercar = scene.Layer("layercar", { useCanvas: true });

	canvasbkg = $('canvas#sjs0-layerbkg')[0];

	targetFlakeScale = targetScaleFactor * scene.w;

	//#region DEBUG blue square
	//let options = { layer: layermow, size: [32, 32], color: "#0000FF" };
	//testsprite = scene.Sprite(null, options);
	//testsprite.setColor('#0000FF');
	//#endregion

	showOverlay();		// in MoW_template.js
}
//#endregion ASSETS

//#endregion BEFORE PLAY BTN

/////////////// Overlay: [PLAY] button ///////////////
// OnClick: MoW_template::startScenario() => startShow()
///////////////

// draw GIF frame on bkg canvas
function onDrawFrame(ctx, frame) {
	ctx.canvas.width = gameWidth;
	ctx.canvas.height = gameHeight;
	ctx.globalCompositeOperation = 'source-over';
	ctx.drawImage(frame.buffer, frame.x, frame.y, gameWidth, gameHeight);
}

//#region ANIMATION LOOP

// returns bool initialized
function initAllCustom() {
	console.log("initAllCustom()");

	let ready = true;

	canvasbkg = $('canvas#sjs0-layerbkg')[0];
	canvasmow = $('canvas#sjs0-layermow')[0];
	canvascar = $('canvas#sjs0-layercar')[0];

	if (undefined === canvasbkg || null === canvasbkg)
		ready = false;
	if (undefined === canvasmow || null === canvasmow)
		ready = false;
	if (undefined === canvascar || null === canvascar)
		ready = false;

	if (divScene.scrollWidth === 0) {
		divScene.style.width = gameWidth + 'px';
		divScene.style.height = gameHeight + 'px';
	}

	if (null === car) {
		let options = { layer: layercar, size: [imgarray[1].naturalWidth, imgarray[1].naturalHeight]};
		car = scene.Sprite(imgarray[1].src, options);

		//carscale = layercar.w / car.img.naturalWidth; // WTF! car.img.naturalWidth is 0?
		carscale = layercar.w / imgarray[1].naturalWidth;
		car.scale(carscale);

		// car.setColor('blue');	// DEBUG

		// looks like the sprite beavior is like this
		// by default its UL corner is (0, 0) - UL of the screen
		// when scaled, it keeps its center
		// in our case we need DY = scene.h - Yl // lower boundary of scaled sprite.

		// WTF!? All of a sudden there are no more car.img.naturalHeight !?
		// Looks like it happens in Debug and on IOS. I'll use imgarray[1].naturalWidth
		//let dy = canvascar.height - (car.img.naturalHeight + car.img.naturalHeight * carscale) / 2;
		//let dx = car.img.naturalWidth * (carscale - 1) / 2;

		let dy = canvascar.height - (imgarray[1].naturalHeight + imgarray[1].naturalHeight * carscale) / 2;
		let dx = imgarray[1].naturalWidth * (carscale - 1) / 2;

		// a little bit lower
		dy += gameHeight / 32;

		car.move(dx, dy);

		cycle.addSprite(car);
		car.canvasUpdate(layercar);

		ready = false;
	}

	if (null === wiperl) {
		wiperl = scene.Sprite(imgarray[2].src, layermow);
		wiperr = scene.Sprite(imgarray[2].src, layermow);
		ready = false;
	}

	// if loaded and !initialized (pivotL === undefined )
	if (undefined === pivotL && wiperl.imgNaturalWidth > 0 && wiperr.imgNaturalWidth > 0) {
		wiperl.opacity = wiperr.opacity = 0.6;

		wiperl.scale(carscale * wiperscale);
		wiperr.scale(carscale * wiperscale);

		let wipery = carshieldH * scene.h / 100;
		let wiperlx = scene.w / 8;
		let wiperrx = scene.w / 2;
		pivotL = new Point(wiperlx, wipery);
		pivotR = new Point(wiperrx, wipery);

		//gfPosition({ sp: sprite, x: x, y: y, ax: ax, ay: ay, angle: angle});
		gfPosition({ sp: wiperl, x: wiperlx, y: wipery, ax: wiperAnchor.x, ay: wiperAnchor.y /* , angle: -wiperMaxAngle * wiperfactor */ });
		gfPosition({ sp: wiperr, x: wiperrx, y: wipery * 1.03, ax: wiperAnchor.x, ay: wiperAnchor.y });

		ready = false;
	}

	//if (!areFlakesReady)
	if (0 == flakes.length) {
		initFlakes();
		cycle.addSprites(flakes);
		ready = false;
	}

	// NB: this works for the 1st time, 1st slogan only.
	// initTrinkets() depends on pivots
	if (undefined !== pivotL && 0 === trinkets.length) {
		initTrinkets();
		cycle.addSprites(trinkets);
		ready = false;
	}

	if (ready) {
		// Center the canvas initially
		centerCanvas();
	}

	console.log("initAllCustom(); ready:", ready);
	return ready;
}

let waitTime = 4;
function paint() {
	// IMPORTANT: calls exitCheck(), resumeRecord()
	// check if scenario_three_template::initialized
	if (!entryCheck())
		return;

	if (undefined === startTime) {
		let dt = new Date();
		startTime = dt.getTime();
		prevTime = startTime;
	}

	let newTime = new Date();
	dtime = (newTime - prevTime) / 1000;  // ms
	prevTime = newTime;

	// start show
	cycle.next(ticker.lastTicksElapsed);

	car.setAngle(random(-0.005, 0.005));

	updateWipers(dtime);
	wiperr.canvasUpdate(layermow);
	wiperl.canvasUpdate(layermow);

	/////////////// DEBUG
	////testsprite.canvasUpdate(layermow);
	//// draw banner and text rects
	//if (rcBanner)
	//	drawRect(layermow.ctx, rcBanner, 'blue');
	//if (rcText)
	//	drawRect(layermow.ctx, rcText, 'red');
	//// show mapped raster
	//trinkets.forEach((sp) => {
	//	putMark(layermow.ctx, sp.x, sp.y, bannerStep/2, 'white');
	//});
	//////////////////

	// show flakes
	flakes.forEach(updateFlake);

	// trinkets (sticky snowflakes); banner formation.
	updateTrinkets(newTime - startTime);

	// wipe accumulated slogan
	if (!wiping && newTime - startTime > snowAccumulationTime + 2 * snowWaitTime) {
		wiperson = true;
		wiping = true;
	}

	// game over condition
	if (blownTrinketsCount >= trinkets.length) {
		loopOver = true;
		checkLoop();	// check: last loop ? exit : nextLoop
	}

	// DEBUG
	//test1 = wiperl.collidesWithArray(trinkets);	// bool
	//test2 = wiperr.collidesWithArray(trinkets);

	cycle.update();

	// showMessage set in updateWipers()
	if (showMessage) {
		messageOnCanvas(canvascar, rasterParams.message, { clear: false });

		// if gameOver was signalled in checkLoops, set wait time to show message better
		if (0 == gameOver)
			gameOver = waitTime;
	}
}

function checkLoop() {
	console.log('checkLoop()');

	iloop += 1;

	if (iloop >= nLoops) {
		gameOver = 0;	// immediate leave; to be corrected
		console.log('Last loop, game over');
	}
	else {
		console.log('Next loop, iloop:', iloop);
		gameOver = -1;
		nextLoop();
	}
}

function nextLoop() {
	console.log('nextLoop()');

	// assuming trinkets are created and inited
	prevTime = startTime = new Date();
	wiperson = false;
	wiping = false;
	allwiped = false;
	allwipedtime = undefined;
	lastVisible = 0;
	blownTrinketsCount = 0;

	cyclesCount = 0;
	initialized = false;

	if (da > 0)
		da = -da;

	// get new raster ASAP if there are more slogans: rasterReady()
	if (slogans.length > 1 && iloop < slogans.length) {
		console.log('Requested raster for slogans[', iloop, ']:', slogans[iloop]);
		myAssetsCount = -1;	// reset getRaster extra loop safety catch
		getRaster(rasterReady, slogans[iloop]);
	}

	resetTrinkets();
}
//#endregion ANIMATION LOOP

//#region SCENARIO-SPECIFIC
// init array of snow flakes[]
function initFlakes() {
	console.log('initFlakes()');

	// snowflakes
	// origin (%)
	let rw = 20;
	let rl = Math.floor(random(rw, 100 - 2 * rw));
	let rb = 20;
	rcOrigin = new Rectangle(rl, rl + rw, 0, rb);

	// put snowflakes to origin
	let idx = -1;
	for (i = 0; i < flakesCount; i++) {
		// 2 1st images - bkgs, the rest - flakes
		idx++;
		//		if (idx + flakesidx >= imgarray.length)		// NB: last item is DEBUG one (if loaded).
		if (idx + flakesidx >= imgarray.length - 1)
			idx = 0;

		let sp = scene.Sprite(imgarray[idx + flakesidx].src, layermow);

		// DEBUG blue square
		//let options = { layer: layermow, size: [32, 32], color: "#0000FF"};
		//let sp = scene.Sprite(null, options);
		//sp.setColor('#0000FF');

		resetFlake(sp);

		flakes.push(sp);
		// flakes[i] = sp;
	}
}

// init array of trinkets - snowflakes that will be sticking to the windshield
// using ShowRaster::mapRasterSizewise(rcBanner, itemSizeMax, itemSizeMin, density = 1)
// Trinkets size in fractions of scene.w (windshield width)
const fmax = 0.05;
const fmin = 0.0002;
function initTrinkets() {
	console.log('initTrinkets()');

	// Assumptions: we have a target scale of a snowflake. Calc target size. Calc banner size (trinket dist == trinket size).
	// center banner. Position trinkets.

	if (null === raster || 0 == raster.length) {
		//alert('No raster!');
		console.log('No raster');
		return;
	}

	trinkets = [];

	const wipery = carshieldH * scene.h / 100;

	const margX = scene.w * 0.05;	// windshield width
	const margY = wipery * 0.1;	// windshield height
	rcBanner = new Rectangle(margX, scene.w - margX, margY / 2, wipery - margY * 1.5);	// shift margY/2 up
	const itemSizeMax = scene.w * fmax;
	const itemSizeMin = scene.w * fmin;
	const density = 1.4;

	// mapRasterSizewise(rcBanner, itemSizeMax, itemSizeMin, density = 1)
	let mapped = mapRasterSizewise(rcBanner, itemSizeMax, itemSizeMin, density);

	// var bannerStep was set in mapRasterSizewise()

	// arc mapping
	let R = scene.w * 3; 1.5;
	let xc = scene.w / 2;

	mapped.forEach((charr) => {
		// char element
		charr.forEach((pnt) => {
			// pnt.X

			// select random flake image
			let idx = Math.floor(random(flakesidx, imgarray.length));
			let angle = random(0, 6.28); // 2*pi

			let sp = scene.Sprite(imgarray[idx].src, layermow);

			sp.setOpacity(0);
			sp.scale(bannerStep * density / flakesize);
			let x = pnt.X;
			let y = pnt.Y;

			let arched = mapToArc(x - xc, y, R);
			sp.position(arched.x + xc, arched.y);

			sp.rotate(angle);
			trinkets.push(sp);
		});
	});

	trinkets = shuffle(trinkets);
}


// map point to arc. y: 0 at the top of banner, grows down. x: 0 at the center of the banner.
function mapToArc(x, y, R) {
	let yp = y * (1 - y / R);	// vertical perspective factor
	let alfa = x / R;			// arc lenth on the top of banner
	let xm = (R - yp) * Math.sin(alfa);
	let ym = R - (R - yp) * Math.cos(alfa);

	return new Point(xm, ym);
}

// (re)set flake sprite to initial position (for next loop)
function resetFlake(sp) {
	let x = random(rcOrigin.left, rcOrigin.right) * layerbkg.w / 100;
	let y = random(rcOrigin.top, rcOrigin.bottom) * layerbkg.h / 100;

	sp.opacity = 0.99;	// WTF!? scale does not work without that.
	sp.scale(targetFlakeScale / 8);

	sp['onshield'] = false;
	sp['initialpos'] = new Point(x, y);
	sp.position(x, y);

	// NB: sprite.target - inbuilt!
	//sp['target'] = new Point(scene.w / 2, scene.h / 2);
	// make target area a little wider and a bit lower than windshield.
	let dw = 0.25;
	let dh = 0.15;
	sp['targetpos'] = new Point(random(-scene.w * dw, scene.w * (1 + dw)),
		random(0, (carshieldH * scene.h / 100) * (1 + dh)));

	let distF = random(0.9, 1.1);
	// make it very random at init
	if (sp.dist === undefined)
		sp['dist'] = random(initialDistance / 4, initialDistance * 4);
	else
		sp.dist = initialDistance * distF;

	// rotation
	if (sp.img.src.endsWith('0.png')) {
		sp.rv = 0;
	}
	else {
		sp.rv = random(-0.5, 0.5);
	}
}

function resetTrinkets() {
	console.log('resetTrinkets()');

	trinkets = [];

	// a simple old - fashioned for loop - async - friendly
	for (let index = 0; index < trinkets.length; ++index) {
		const element = trinkets[index];
		cycle.removeSprite(element);
	}

	initTrinkets();

	cycle.addSprites(trinkets);
}

function updateFlake(sp) {
	// out of screen
	if (sp.x < 0 || sp.x > scene.w || sp.y < 0 || sp.y > carshieldH * scene.h) {
		resetFlake(sp);
		return;
	}

	// rotate. onshield or not
	sp.applyVelocity();

	if (sp.onshield) {
		sp.scale(targetFlakeScale);

		sp.canvasUpdate(layermow);
		return;
	}

	// should be inited in resetFlake(), but to be safe...
	if (sp.dist === undefined)
		sp['dist'] = random(initialDistance / 4, initialDistance * 4);

	sp.dist = sp.dist - speed * dtime;
	// let tangent = 1 / (1 + sprite.distance);    // too exponential. Try instead:
	let tangent = 2 / (2 + sp.dist);
	let scale = tangent * targetFlakeScale;

	//sp.setXScale(scale);
	//sp.setYScale(scale)

	if (scale > maxScale)
		scale = maxScale;
	sp.scale(scale);

	let dx = (sp.targetpos.x - sp.initialpos.x) * tangent;
	let dy = (sp.targetpos.y - sp.initialpos.y) * tangent;
	let x = sp.initialpos.x + dx;
	let y = sp.initialpos.y + dy;
	sp.position(x, y);

	if (sp.dist <= 0) {
		sp.position(sp.targetpos.x, sp.targetpos.y);
		sp.onshield = true;
		sp.xv = speed * 2;
		sp.yv = 0;

		// direction
		let dx = sp.x - sp.initialpos.x;
		let dy = sp.y - sp.initialpos.y;

		// divert it horizontally (with car winshield in mind), the lower, the more.
		if (dy > 0) {
			let f = sp.y / scene.h / 4;
			dy *= f;
		}
		sp.orientVelocity(dx, dy);

		// console.log('Hit shield: sp.x:' + sp.x + 'sp.y:' + sp.y + 'sp.xv: ' + sp.xv + 'sp.yv:' + sp.yv);
	}
}

let da = -Math.PI * wiperspeedfactor;
function updateWipers(dt) {
	if (!wiperson)
		return;

	// truncate wiper angles to relevant values ( angle == 50+ - not nice)
	if (wiperl.angle > Math.PI)
		wiperl.angle -= Math.PI;

	if (wiperl.angle < -Math.PI)
		wiperl.angle += Math.PI;

	if (wiperr.angle > Math.PI)
		wiperr.angle -= Math.PI;

	if (wiperr.angle < -Math.PI)
		wiperr.angle += Math.PI;

	// Up and back once. comment out to repeat mode.
	if (wiperr.angle > 0.1 && da > 0) {
		wiperson = false;

		// time when wipers are back.
		allwipedtime = new Date();

		//// reset trinkets if there are more loops
		//if ((1 == slogans.length && iloop < 1) || (slogans.length > 1 && iloop < slogans.length - 1)) {
		//	resetTrinkets();
		//}
	}

	//  repeat mode.
	if (wiperr.angle > 0.1 || wiperr.angle < -wiperMaxAngle) {
		da = -da;
		allwiped = true;

		if (iloop == nLoops - 1)
			showMessage = true;	// user message
	}

	//function gfRotate(sp, angle, anchor = null)
	gfRotate(wiperl, da * dt * wiperfactor, wiperAnchor);
	gfRotate(wiperr, da * dt, wiperAnchor);

	// DEBUG
	// console.log('wiperr.angle: ' + wiperr.angle + ' = ' + wiperr.angle / Math.PI * 180);
	// wiperr.angle: -0.01884955592153876 = -1.08
	// wiperr.angle: -0.03769911184307752 = -2.16
	// wiperr.angle: -0.057805304826052194 = -3.312
	// ...
	// wiperr.angle: -1.901291873952544 = -108.93600000000008

	let k = 0.18;
	// assuming initially wiper.xscale == wiper.yscale
	wiperl.xscale = wiperl.yscale * (1 - k * Math.sin(-wiperl.angle));
	wiperr.xscale = wiperr.yscale * (1 - k * Math.sin(-wiperr.angle));

	// alas, scaling requires re-positioning of the asset on the pivot point
	gfPosition({ sp: wiperl, x: pivotL.x, y: pivotL.y, ax: wiperAnchor.x, ay: wiperAnchor.y /* , angle: -wiperMaxAngle * wiperfactor */ });
	gfPosition({ sp: wiperr, x: pivotR.x, y: pivotR.y * 1.03, ax: wiperAnchor.x, ay: wiperAnchor.y });
}

// arg: elapsed time
function updateTrinkets(t) {
	if (t < snowWaitTime)
		return;

	if (lastVisible < trinkets.length) {
		// accumulating
		let idx = Math.floor((t - snowWaitTime) / snowAccumulationTime * trinkets.length);
		for (let i = lastVisible; i <= idx; i++) {
			// safety catch
			if (i < trinkets.length && null !== trinkets[i]) {
				trinkets[i].setOpacity(0.99);
			}
		}
		lastVisible = idx;
	}

	// wipe when wipers go counter-clock; not wiping otherwise
	//if (wiping && da < 0) {
	if (wiping && !allwiped) {
		trinkets.forEach(wipeTrinket);
	}

	if (allwiped) {
		trinkets.forEach(blowTrinkets);
	}

	// ### all of a sudden there are no trinkets visible!? This helps:
	for (let i = 0; i < trinkets.length; i++) {
		if (null !== trinkets[i]) {
			// if not deleted/wiped yet
			trinkets[i].canvasUpdate(layermow);
		}
	}
}

var nwiped = 0;
function wipeTrinket(sp, idx) {
	// safety catch
	if (idx < 0 || idx >= trinkets.length)
		return;

	// NB: sp.collidesWith(wiperr) - not good. It works scarcely - wiper has to be right on the trinket.
	// Use poor-man solution - bearing to the trinket.

	// LET: wiped flake moves with the wiper, keeping the same dist from pivot.
	// set sp.radius

	if (sp.radius === undefined) {
		if (isWiped(sp, wiperl.angle, pivotL)) {
			// checks and sets distance (sp.radius)
			nwiped++;
			sp.radius = -sp.radius;	// mark as 'left'
		} else if (isWiped(sp, wiperr.angle, pivotR)) {
			nwiped++;
		}
	}

	// move with wiper
	if (sp.radius !== undefined) {
		let x, y, len;
		if (sp.radius < 0) {
			// move with left wiper
			len = wiperl.w * wiperl.xscale;
			x = pivotL.x - sp.radius * Math.cos(wiperl.angle);
			y = pivotL.y - sp.radius * Math.sin(wiperl.angle);
		}
		else {
			// move with right wiper
			len = wiperr.w * wiperr.xscale;
			x = pivotR.x + sp.radius * Math.cos(wiperr.angle);
			y = pivotR.y + sp.radius * Math.sin(wiperr.angle);
		}

		gfPosition({ sp: sp, x: x, y: y });
	}
}

// check if sprite is in wiped sector of the wiper
// flake sprite, wiper angle, wiper pivot
function isWiped(sp, angle, pivot) {
	let vect = new Vector(sp.x - pivot.x, pivot.y - sp.y);
	let bearing = vect.toRadians();
	let dist = sp.distance(pivot.x, pivot.y);

	let wiped = (angle < -bearing && dist <= wiperr.w * wiperr.xscale);
	if (wiped) {
		sp['radius'] = dist;
	}

	return wiped;
}

var blownTrinketsCount = 0;
function blowTrinkets(sp, idx) {
	// removed
	if (null == sp)
		return;

	// out of screen
	if (sp.x < 0 || sp.x > scene.w || sp.y < 0 || sp.y > pivotR.y) {
		//sp.remove();	// no effect on trinkets[] ?
		//trinkets.splice(idx);	// remove from array - stops right away?!

		// just count
		trinkets[idx] = null;
		blownTrinketsCount++;
		return;
	}

	let test = Math.floor(random(0, blowFactor));
	if (test >= 2)
		return;

	// start blow away for this trinket.
	if (sp.xv != 0 || sp.yv != 0) {	// already set
		sp.applyVelocity();
		return;
	}

	// rcOrigin - in %%
	//let xorg = random(rcOrigin.left, rcOrigin.right) * layerbkg.w / 100;
	//let yorg = random(rcOrigin.top, rcOrigin.bottom) * layerbkg.h / 100;

	let xorg = rcOrigin.left + rcOrigin.w / 2 * layerbkg.w / 100 * random(0.9, 1.1);
	let yorg = rcOrigin.top + rcOrigin.h / 2 * layerbkg.h / 100 * random(0.9, 1.1);

	sp.xv = speed * 8 * random(0.9, 1.1);		// speed; WTF!? they are just cvreeping, not flying
	sp.yv = 0;

	// direction
	let dx = sp.x - xorg;
	let dy = sp.y - yorg;

	// divert it horizontally (with car winshield in mind), the lower, the more.
	if (dy > 0) {
		let f = sp.y / scene.h / 4;
		dy *= f;
	}
	sp.orientVelocity(dx, dy);
	sp.applyVelocity();
}

//#endregion SCENARIO-SPECIFIC

//#region CAPTURE
function sceneReady() {
	console.log('sceneReady()');

	if (undefined === canvasmow || null === canvasmow) {
		console.log('canvasmow undefined, exiting');
		return false;
	}

	// no sound

	return true;
}

// called from scenario_three_template:startShow()
function startShowCustom() {
	console.log('startShowCustom()');

	divScene.style.display = "block";

	//// DEBUG. WTF!
	if (divScene.width < 1) {
		divScene.width = gameWidth;
		divScene.height = gameHeight;
	}

	// NB: don't use imgarray[0] as URL. AssetLoader replaces strings with IMG objects!

	// var mygifler = gifler(imgarray[0].src);	// promise
	// Nothing worked for me as described.
	// Had to use onDrawFrame and set size on each draw.

	gifler(imgarray[0].src)
		.frames(canvasbkg, onDrawFrame);

	cycle = sjs.Cycle([[0, 0, 5]]);
	ticker = scene.Ticker(30, paint);

	//ticker.run(); => scenario_three_template::startShow()
}

function sceneRemoveCustom() {
	console.log('sceneRemoveCustom()');

	// Delete all layers present in this scene, delete the sprites and layers, and pause the ticker.
	scene.reset();

	// makes div empty, but does not remove!?
	divScene.remove();
}

function setMobileRecorderCustom(recorder) {
	console.log('setMobileRecorderCustom()');

	// recorder.bgCanvas = canvasBkg;
	recorder.bgCanvas = canvasbkg;
	recorder.canvas = canvasmow;	// main canvas
	recorder.frontCanvas = canvascar;
}
//#endregion CAPTURE

//// DEBUG
function onclick() {
	wiperson = !wiperson;
}
