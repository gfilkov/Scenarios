var scenario = "autumn";
var recordingDisabled = false;
var recordingChecked = false;

//#region VARS
// NB: var gameWidth, gameHeight - defined in scenario_three_template; but value must be set by scenario to enable recording.
let rasterData;

let canvas = null, overlayCanvas = null, container = null;	// overlayContext - do not reuse, create on the fly
// Why it is not that bad: I am not using context (drawind) on each frame, but only as necessary.

let videoLoaded = false;    // scenario-specific. Here the video is loaded ASAP ### do I need it? check
let videoAspectRatio = 1;

let leaves = [];

let banner;         // plane to map raster on: max available space for text in the scene
let textPlane;      // plane to map raster on: actual/scaled space for text in the scene
let probe;			// test sphere to probe/visualize the locations

let startTime, prevTime;
let elapsedTime = 0;

// rcBanner, bannerStep, targetScale - global
let POS = new THREE.Vector3(14, 17, 16);	// trinkets initial gathering position
let POSL = new THREE.Vector3(-42, 7.5, -6);	// these positions found visually, using probe.
// POSL: at camera level, away on the left screen border: use to determine when trinket goes out of the screen.

let assets = 7;	// assets load counters: 1: raster, 2: video, 3: audio, 4-7: 4 leaves textures
let assetsCount = 0;
//#endregion VARS

//#region CONFIG
//let audioSrc = 'sounds/les-parapluies-de-cherbo.mp3';
// AudioTrimmer.com:  trimmed to start on sec 29
const audioSrc = 'sounds/les-parapluies-de-cherbo-29.mp3';

const frameTime = 30;	// default dt between frames (33 fps)

const ambLtIntensity = 8;

// BANNER (plane rectangle to place raster)
const BANNER_WIDTH = 15;	// oX
const BANNER_HEIGHT = 32;	// oY
const bannerRotx = -0.53;	// rads
const dX = 0.4;	// banner horiz shift

const TRINKET_D = 1;	// leaf
const trinketScaleMin = 0.16;	// test sphere: 0.08
const trinketScaleMax = 0.8;	// test sphere: 0.4
let trinketScale = 1;

// raster mapping area, initial setting; calculate size using trinket size, step and density
const DENSITY = 0.75;	// hom many trinkets cover 1 step. For test spheres: 1
let TEXT_WIDTH = BANNER_WIDTH;
let TEXT_HEIGHT = 4;			// to be calculated

// ### My animation objects: check if all are needed after refactoring
let allout = false; // all leaves are blown out
// let gameOver = false;    // ### defined in scenario_three_template
// let gameOver = -1;		// new version
let ndropped = 0;
let speedfactor = 0.5;
let speedvarfactor = 0.1;
let rotvar = 0.4;

let gamePassTime = 4000;    // basic leaf/wind speed: time to pass gameWidth.
let speedbase;              // to be calculated after gameWidth is defined.

// timing (seconds)
let allloosetime = 5000;   // when the last leave is set loose to fly
let alldowntick = 100000;  // moment when last leaf dropped down; init with large number
let allouttick = 0;
let falltime = 5000;	// 4000;        // leaf falling time
let downtime = 2500;   // 2000; // seconds while leaves stay down
let blowtime = 3500; // time for wind front to pass portW
let fadetime = 3000; // time for music fade
//#endregion CONFIG

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
	75,
	16 / 9,	//window.innerWidth / window.innerHeight,
	0.1,
	1000
);

var frustum = new THREE.Frustum();

// NB: DEBUG value is set in MoW_templates.window.onload()

//// RASTER
// ShowRaster.js:
// NB: uses global rasterParams object (ShowRaster.js). Set other properties if/as needed.
// rasterParams.fontFamily = 'LED';

getRaster(rasterReady);

// callback
// strange thing happening... rasterReady() called more than once, breaking checkAssets() logic.
// Using safety catch myAssetsCount
let myAssetsCount = -1;
function rasterReady(result) {
	console.log("rasterReady('", result.Text, "')");

	if (myAssetsCount > 0) {
		console.log("NB: extra call of rasterReady('", result.Text, "'); skipping.");
		return;
	}

	if (result.Success)
		isRasterReady = true;

	// raster = result;	// use global raster from ShowRaster
	rasterCount = getRasterCount(result);   // ShowRaster.js

	assetsCount++;
	checkAssets(assets, assetsCount, 'raster');

	myAssetsCount = assetsCount;
}
////

initAssets();

// Create a video element
const video = document.createElement('video');
if (iOS()) {
	// stupid iOS does not load autumn_16x9.mp4, no errors logged, no exceptios, it just does not work !?
	video.src = 'video/autumn_for_mow.mp4';
}
else
	video.src = 'video/autumn_16x9.mp4';

video.loop = true;
video.muted = true; // Mute the video to allow autoplay
//video.play();    // - later, when rendering starts

video.addEventListener('loadeddata', function () {
	console.log('video: readyState:', video.readyState, 'videoHeight:', video.videoHeight, 'videoWidth:', video.videoWidth);

	// video.readyState: 4	// ready to play through
	// video.videoHeight: 338
	// video.videoWidth: 600

	// Create a video texture
	const videoTexture = new THREE.VideoTexture(video);
	videoTexture.minFilter = THREE.LinearFilter;
	videoTexture.magFilter = THREE.LinearFilter;
	videoTexture.format = THREE.RGBFormat;

	scene.background = videoTexture;

	videoAspectRatio = video.videoWidth / video.videoHeight;

	//// NB: must be set for recording
	//// No centerCanvas() in this scenario, gameWidth and gameHeight will be set in setMobileRecorderCVustom()
	//gameWidth = video.videoWidth;
	//gameHeight = video.videoHeight;

	videoLoaded = true;
	checkAssets(assets, ++assetsCount, 'Video');
}, false);


// create an AudioListener and add it to the camera
const listener = new THREE.AudioListener();
camera.add(listener);

// create a global audio source
const sound = new THREE.Audio(listener);
// load a sound: InitAssets()

/////
// called from mow_template:window.onload()
// poor-man version of AssetLoader for three.js
function initAssets() {
	console.log("autumn: initAssets()");

	// load a sound and set it as the Audio object's buffer
	const audioLoader = new THREE.AudioLoader();
	audioLoader.load(audioSrc, function (buffer) {
		sound.setBuffer(buffer);
		sound.setLoop(true);
		sound.setVolume(1);	// 0.5
		//sound.play();	// - later, when rendering starts

		checkAssets(assets, ++assetsCount, 'Audio');
	});

	// Instantiate a loader. Load textures.
	const loader = new THREE.TextureLoader();

	// Create 4 org leaves and push to array.
	for (let i = 0; i < 4; i++) {
		let src = 'imgs/leaf' + i + '.png';

		// load a resource
		loader.load(
			src,

			// onLoad callback
			function (texture) {
				let leafMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
				let leafGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
				let leaf = new THREE.Mesh(leafGeometry, leafMaterial);

				leaves.push(leaf);

				checkAssets(assets, ++assetsCount, src);
			},

			// onProgress callback currently not supported
			undefined,

			// onError callback
			function (err) {
				console.log('Error loading', src, ':', err);
			}
		);
	}
}

// TESTed lights using keyboard event handler (letter 'l' ) - no effect at all !?
// ### remove???
let directionalLight;

function init() {
	console.log("autumn: init()");

	// Back to old good container DIV with canvases inside.
	// Advantage: easier and more logical to center single DIV than multiple canvases.

	// Create container DIV, create canvas and overlayCanvas inside container
	createCanvases();	// scenario_three_template

	// Position the camera
	camera.position.set(0, 7.5, 24.2);

	// Init renderer: use pre-created canvas
	renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });

	// Set size (whole window)
	renderer.setSize(gameWidth, gameHeight);

	// DEBUG - defined in MoW_templates: window.onload()
	// avoid recurrent calls
	if (!banner) {
		createBanner(DEBUG);	// create and show if DEBUG
		createTextRect(DEBUG);

		//createLeaves(DEBUG);	// if DEBUG leaves stay at target positions
		createLeaves(false);	// test falling behavior: leaves set in initial position

		// Workaround to find trinkets initial gathering position:
		// put sphere to the upper right corner. Not visible. just beyond the screen.
		createProbe();
	}

	// for object visibility:
	camera.updateMatrixWorld();
	frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
}

// called from scenario_three_template::initAll(); returns bool initialized
function initAllCustom() {
	console.log("autumn.initAllCustom()");

	let ready = true;

	if (undefined === canvas) {
		canvas = $('canvas')[0];
		ready = false;
	}

	//...

	return ready;
}

// called from scenario_three_template:startShow()
function startShowCustom() {
	console.log('autumn.startShowCustom()');

	video.play();
	sound.play();
}

// called from scenario_three_template:exitCheck()
function exitCheckCustom() {
	console.log(scenario + '.exitCheckCustom()');

	// stop audio; NB: annoying differences between THREE.PositionalAudio and DOM AUDIO element
	if (MOBILE) {
		// <AUDIO> element
		sound.pause();
	}
	else {
		// THREE.PositionalAudio
		sound.stop();
	}
}

// render() called from scenario_three_template::animate()
let stage;
function render(timestamp) {
	// #### Spend hideous time trying to figure why my RTC recording does not work!!!
	// You MUST call entryCheck() here (when using scenario_three_template)
	if (!entryCheck())
		return;

	//// poor man timer: count elapsed time excluding debug stops.
	if (undefined === startTime) {
		let dt = new Date();
		prevTime = dt;
		startTime = dt.getTime();
	}
	// assuming if dt > 500 - it was debug stop, exclude it, replace with frameTime
	let now = new Date();
	let dt = now - prevTime;
	prevTime = now;
	// console.log('dt:', dt);
	if (dt > 500) {
		dt = frameTime;
	}
	elapsedTime += dt;

	update(elapsedTime, dt);

	if (LeafStatus.BLOW == stage)
		countBlownOut();	// nIn, nOut

	renderer.render(scene, camera);
}
//#region SCENARIO SPECIFIC

// Javascript ENUM
const LeafStatus = {
	INIT: "initial",
	FALL: "falling",
	HOME: "dropped",
	BLOW: "blow",
	OUT: "out"
}

let messageShown = false;
function update(elapsed, delta) {
	if (elapsed < alldowntick) {
		// leaves falling
		stage = LeafStatus.FALL;
		updateleavesfalling(elapsed, delta);
	}
	// downtime - leaves stay down
	else if (elapsed > alldowntick + downtime) {
		if (!messageShown) {
			// scenario_three_template
			messageOnCanvas(overlayCanvas, rasterParams.message, { color: 'blue', strokeColor: 'yellow' });
			messageShown = true;
		}
		// leaves blown away
		stage = LeafStatus.BLOW;
		updateleavesblown(elapsed, delta);
	}

	if (LeafStatus.BLOW == stage && 0 == allouttick) {
		if (nOut > 0 && nIn < leaves.length / 8) {
			console.log(`update() stage: ${stage} leaves: ${leaves.length} nIn: ${nIn} nOut: ${nOut}`);
			allouttick = elapsed;
		}
	}

	// all blown away: allouttick was set: fading away
	if (allouttick > 0) {
		// fade sound
		let dt = elapsed - allouttick;
		//	    console.log('fadetime: ' + dt);
		let volume = (1 - dt / fadetime);
		if (volume < 0.0) volume = 0.0;
		if (volume > 1.0) volume = 1.0;
		sound.setVolume(volume);
		if (dt > fadetime) {
			gameOver = 0;	 // true; // exit at once	// defined in scenario_three_template
		}
	}
}

function updateleavesfalling(elapsed, delta) {
	let j = Math.floor(elapsed * leaves.length / allloosetime);
	if (elapsed > allloosetime)
		j = leaves.length;

	for (let i = 0; i < j; i++) {
		let leaf = leaves[i];

		// skip already fallen
		if (LeafStatus.HOME == leaf.userData.status)
			continue;

		// launch leaf at init state
		if (LeafStatus.INIT == leaf.userData.status)
			leaf.userData.status = LeafStatus.FALL;

		updateleaffalling(leaves[i], elapsed, delta); // count ndropped
	}

	// DEBUG
	// updateleaffalling(leaves[0], elapsed, delta);

	if (leaves.length == ndropped) {
		alldowntick = elapsed;
	}
}

function updateleaffalling(leaf, elapsed, delta) {
	// already dropped?
	if (leaf.userData.status != LeafStatus.FALL) {
		console.log('Not falling, status:' + leaf.userData.status);
		return;
	}

	let distance = leaf.position.distanceTo(leaf.userData.target);
	if (undefined === leaf.userData.downspeed) {
		leaf.userData.downspeed = distance / falltime;
	}

	// dropped now? assign dropped property
	if (distance < TRINKET_D * trinketScale) {
		ndropped++;

		// status get changed here and on the next frame the function will return on 'dropped' check
		leaf.userData.status = LeafStatus.HOME;

		// restore saved home position and rotation
		leaf.position.copy(leaf.userData.target);
		//leaf.quaternion.copy(leaf.userData.targetQuaternion);

		//// Lay flat: align leaf.OZ with banner.OZ
		const q = new THREE.Quaternion().setFromUnitVectors(
			new THREE.Vector3(0, 0, 1).applyQuaternion(leaf.quaternion).normalize(),
			new THREE.Vector3(0, 0, 1).applyQuaternion(banner.quaternion).normalize()
		);
		leaf.quaternion.premultiply(q);

		// flip over every odd one
		if(leaf.userData.idx % 2 > 0)
			leaf.rotateX(Math.PI);
		////

		return;
	}

	let direction = new THREE.Vector3();
	direction.subVectors(leaf.userData.target, leaf.position);
	direction.normalize();

	//// add windsway
	// mow::random(min, max)
	let vx = random(0.9, -0.9);		// largest sway
	let vy = random(0.1, -0.5);
	let vz = random(0.6, -0.6);
	let speedvariation = new THREE.Vector3(vx, vy, vz);

	// the sway decreeses with the distance
	speedvariation.multiplyScalar(speedvarfactor * distance);

	let leafVelocity = new THREE.Vector3();
	leafVelocity.addVectors(direction, speedvariation);

	leaf.position.addScaledVector(leafVelocity, delta * leaf.userData.downspeed);

	//// leaf rotation
	this.vr = {
		x: -rotvar + Math.random() * rotvar * 2,
		y: -rotvar + Math.random() * rotvar * 2
	}
	leaf.rotation.x += this.vr.x;
	leaf.rotation.y += this.vr.y;
}

// ground wind speed: speed of the wind front
let wspeed;
let outcount = 0;
function updateleavesblown(elapsed, delta) {
	// wind front wx:
	wspeed = BANNER_WIDTH / blowtime;

	let upstart = alldowntick + downtime;
	let wx = BANNER_WIDTH - (elapsed - upstart) * wspeed;
	//	console.log('elapsed: ' + elapsed.toString() + ' wx: ' + wx.toString());

	//// ### DEBUG: show wind front motion
	//probe.position.x = wx;

	// check if all were blown out
	allout = true;
	for (let i = 0; i < leaves.length; i++) {
		let leaf = leaves[i];

		if (LeafStatus.OUT == leaf.userData.status)
			continue;

		// wind front not there yet
		if (leaf.position.x < wx) {
			allout = false;
			continue;
		}

		// wind front is here, but we may delay the leaf start
		//p = 0.03;
		p = 0.02;

		if (leaf.userData.status == LeafStatus.HOME) {
			// leaf on the ground yet
			allout = false;
			if (Math.random() > p) {
				// delay blow-off
				continue;
			}
			else {
				// blow away
				leaf.userData.status = LeafStatus.BLOW;
			}
		}

		updateBlownLeaf(leaf, delta);
	}

	//    console.log('allout: ' + allout.toString());
	if (allout && 0 == allouttick) {
		allouttick = elapsed;
	}
}

// The "Free" Check via onBeforeRender (Zero Extra Cost)
/*
obj.onBeforeRender = () => { obj.insideFrustum = true; };

// In your render loop
obj.insideFrustum = false;
renderer.render(scene, camera);
// After render, obj.insideFrustum is true only if it was drawn
*/
let nIn = 0;
let nOut = 0;
function countBlownOut() {
	// after render check: i.e. after PREVIOUS render()
	nIn = nOut = 0;

	for (let i = 0; i < leaves.length; i++) {
		let leaf = leaves[i];

		if (leaf.insideFrustum)
			nIn++;
		else {
			nOut++;
			leaf.userData.status = LeafStatus.OUT;
		}
	}

	// After render, obj.insideFrustum is true only if it was drawn
	for (let i = 0; i < leaves.length; i++) {
		leaves[i].insideFrustum = false;
	}
}

function updateBlownLeaf(leaf, delta) {
	// attempts to randomize leaf motion do not work that simple: all leaves are moving as one swarm,
	// because behavior logic is the same.
	// Attempt to solve:
	// assign each leave its own basic speed vector
	// add some variation on each update
	// once in a while modify basic speed
	if (!leaf.userData.wind)
		leaf.userData.wind = getBaseSpeed(wspeed);

	leaf.position.addScaledVector(leaf.userData.wind, delta);

	// leaf rotation
	this.vr = {
		x: -rotvar + Math.random() * rotvar * 2,
		y: -rotvar + Math.random() * rotvar * 2
	}
	leaf.rotation.x += this.vr.x;
	leaf.rotation.y += this.vr.y;
}

// get random baseSpeed: Vector3 for leaf
function getBaseSpeed(wind) {
	// WTF !? if I set this:
	// let wx = -wind	* random(0.5, 3.0);	// faster than ground wind on average
	// - all leaves gather to one wave and go together? Why?

	let wx = -wind;	// stupid, simple, but works. More or less.

	let wz = random(-0.2, 1) * 0.25 * wind;
	let wy = random(0, 1) * 0.25 * wind;
	return new THREE.Vector3(wx, wy, wz);
}

//#endregion SCENARIO SPECIFIC

// Creates and shows (DEBUG) Banner plane: max area for text placement available in the scene
function createBanner(visible) {
	// avoid recurrent calls
	if (banner)
		return;

	const banner_geo = new THREE.PlaneGeometry(BANNER_WIDTH, BANNER_HEIGHT);
	const banner_mat = new THREE.MeshBasicMaterial({ color: 0xffff00, opacity: 0.25, transparent: true });
	banner = new THREE.Mesh(banner_geo, banner_mat);
	banner.name = 'banner';
	banner.position.set(dX, 0, 0);
	// to lay it flat, after background, Math.PI / 2 is not the best fit :(
	//banner.rotateX(-Math.PI / 2);
	banner.rotateX(Math.PI * bannerRotx);

	// Create an axes helper with a specified size (e.g., length of the lines)
	const axesHelper = new THREE.AxesHelper(5);

	// Important: Add it to the object you want to visualize, not the scene directly.
	banner.add(axesHelper)

	scene.add(banner);

	banner.visible = visible;
}

// Creates and shows (DEBUG) textPlane contained in Banner plane.
// Used for mapping the raster onto this plane. Calculates trinketScale.
function createTextRect(visible) {
	// avoid recurrent calls
	if (textPlane)
		return;

	// resize after raster size
	// NB: Autumn is a special case: almost no restriction on banner height - the park walk is long.
	// Therefore we start with width restriction only.
	let xCount = raster.Statistics.TextSize.Width / raster.Statistics.Step;	// number of trinkets in horiz row.
	let textNaturalWidth = TRINKET_D * DENSITY * xCount;

	// clamp
	trinketScale = TEXT_WIDTH / textNaturalWidth;
	if (trinketScale < trinketScaleMin)
		trinketScale = trinketScaleMin;
	if (trinketScale > trinketScaleMax)
		trinketScale = trinketScaleMax;

	//// recalc target text width
	//let newWidth = trinketScale * textNaturalWidth;

	//// TEXT_WIDTH can not grow beyond banner width
	//TEXT_WIDTH = newWidth > BANNER_WIDTH ? BANNER_WIDTH : newWidth;

	// TEXT_WIDTH can not grow beyond banner width
	// solution: skip trinkets beyond BANNER_WIDTH
	TEXT_WIDTH = trinketScale * textNaturalWidth;

	TEXT_HEIGHT = TEXT_WIDTH / raster.Statistics.TextSize.Width * raster.Statistics.TextSize.Height;
	let dZ = (BANNER_HEIGHT - TEXT_HEIGHT) / 2;

	const geo = new THREE.PlaneGeometry(TEXT_WIDTH, TEXT_HEIGHT);
	const mat = new THREE.MeshBasicMaterial({ color: 0x0000ff, opacity: 0.25, transparent: true });
	textPlane = new THREE.Mesh(geo, mat);
	textPlane.name = 'textPlane';

	// put at banner position just slightly above
	// textPlane.position.set(dX, 0.1, dZ);
	textPlane.position.x = banner.position.x;
	textPlane.position.y = banner.position.y + 0.01;
	textPlane.position.z = banner.position.z;

	// plane is not flat in XZ plane :( Rotation is less then 90
	textPlane.rotateX(Math.PI * bannerRotx);

	//// DeepSeek
	// Y-axis direction of the object in world coordinates.
	// Update the world matrix of the object (if it hasn't been updated already)
	textPlane.updateMatrixWorld();

	// Create a vector to store the Y-axis direction
	const yAxisDirection = new THREE.Vector3();

	// Extract the Y-axis direction from the object's world matrix
	yAxisDirection.setFromMatrixColumn(textPlane.matrixWorld, 1);

	// Normalize the vector to get a pure direction (optional, but often useful)
	yAxisDirection.normalize();

	// Now `yAxisDirection` contains the Y-axis direction of the object in world coordinates
	console.log(yAxisDirection);
	//// DeepSeek: move
	const displacement = yAxisDirection.clone().multiplyScalar(-dZ);
	textPlane.position.add(displacement);	// -Y after rotation is closest to camera.

	scene.add(textPlane);

	textPlane.visible = visible;
}


// function uses 4 leaves already pushed to leaves[] in initAssets() to create clones and fill leaves array.
// sets trinket scale, assigns target property. DEBUG: set show: true to place leaves at target positions.
function createLeaves(show) {
	// scale originals to trinketScale
	for (let i = 0; i < 4; i++) {
		// trinketScale: calculated in showTextRect()
		leaves[i].scale.setScalar(trinketScale);
	}

	// assign target property
	// Ensure the plane's transformation matrix is up-to-date
	textPlane.updateMatrixWorld();

	// fill array with clones => myCallback()
	let count = 0;

	////// to use in myCallback() (to lay leaves flat)
	////const baseZ = new THREE.Vector3(0, 0, 1).applyQuaternion(banner.quaternion).normalize();

	// in ShowRaster:
	forEachRasterPoint(raster, myCallback);

	// callback({ X: pnt.X, Y: pnt.Y, iChar: i, iPoint: j, iLine: pnt.LineIndex});
	function myCallback(param) {
		let x = param.X;
		let y = -param.Y;

		x *= TEXT_WIDTH / raster.Statistics.TextSize.Width;
		y *= TEXT_HEIGHT / raster.Statistics.TextSize.Height;

		// TEXT_WIDTH can not grow beyond banner width
		// solution: skip trinkets beyond BANNER_WIDTH
		if (x < -BANNER_WIDTH / 2 || x > BANNER_WIDTH / 2)
			return;

		// fill array with clones of first 4 objects.
		if (count > 3) {
			let j = count % 4;	// 0 - 3
			let leaf = leaves[j].clone();
			leaves.push(leaf);
		}

		const localPoint = new THREE.Vector3(x, y, 0);	// point on the plane

		// Transform the local point to world coordinates
		const worldPoint = localPoint.applyMatrix4(textPlane.matrixWorld);

		let object = leaves[count];

		//// lay flat on banner: align leaf.Z with banner.Z
		// NB: this is just for DEBUG show leaves at targets. In real gameplay they will be layed flat in updateleaffalling()
		// this method works if both objects have no parent transforms.
		const q = new THREE.Quaternion().setFromUnitVectors(
			new THREE.Vector3(0, 0, 1).applyQuaternion(object.quaternion).normalize(),
			new THREE.Vector3(0, 0, 1).applyQuaternion(banner.quaternion).normalize()
		);
		object.quaternion.premultiply(q);

		// randomly rotate around Z (now vertical)
		object.rotateZ(-Math.PI, Math.PI);
		////

		// Set the object's position to the transformed world coordinates
		object.position.copy(worldPoint);

		//// save trinket (target) position and rotation:
		// assign target property	// obj["key3"] = "value3";
		let target = new THREE.Vector3();
		target.copy(worldPoint);
		object.userData["target"] = target;

		////// rotation: Euler; quaternion is more reliable
		////// NB: to restore: object.quaternion.copy(savedQuaternion);
		////let targetQuaternion = object.quaternion.clone();
		////object.userData["targetQuaternion"] = targetQuaternion;

		// if DEBUG, leave trinket on the banner; otherwise put it above the camera at 'POS' position.
		if (show) {
			// leave them on the banner
			object.userData.status = LeafStatus.HOME;
		}
		else {
			let x = POS.x + 2 * Math.random();
			let y = POS.y + 2 * Math.random();
			let z = POS.z + 2 * Math.random();

			object.position.set(x, y, z);

			object.userData.status = LeafStatus.INIT;
		}

		scene.add(object);

		count++;

	}

	// randomize array
	leaves = shuffle(leaves);

	//////////

	// Set IDX to actual index in shuffled array. Set onBeforeRender() handler (to mark blown out leaves).
	for (let i = 0; i < leaves.length; i++) {
		leaves[i].userData.idx = i;
		leaves[i].onBeforeRender = () => { leaves[i].insideFrustum = true; };
	}

	if (DEBUG) {
		// Create an axes helper with a specified size (e.g., length of the lines)
		const axesHelper = new THREE.AxesHelper(5);

		// Important: Add it to the object you want to visualize, not the scene directly.
		leaves[0].add(axesHelper);
	}
}

//#region RTC
// called from scenario_three_template::startRecording()
function sceneReady() {
	console.log(scenario + '.sceneReady()');

	// canvas required for RTC
	if (undefined === canvas) {
		canvas = $('canvas')[0];
	}
	// try again:
	if (undefined === canvas) {
		console.log('canvas undefined, exiting');
		return false;
	}

	// sound based on THREE.Listener will be handled in scenario_three_template::setMobileRecorder()
	if (undefined === sound) {
		console.log('sound undefined, exiting');
		return false;
	}

	return true;
}

// called from scenario_three_template::setMobileRecorder()
function setMobileRecorderCustom(recorder) {
	console.log(scenario + '.setMobileRecorderCustom(recorder)');

	recorder.frontCanvas = overlayCanvas;	// front canvas;
	recorder.canvas = canvas;

	// a MUST for recording, defines preview size:
	gameWidth = canvas.width;
	gameHeight = canvas.height;
}

function sceneRemoveCustom() {
	$('div#container').remove();

	let canvases = $('canvas');
	for (let i = 0; i < canvases.length; i++) {
		console.log('Removing canvas', i, ':', canvases[i].id);
		canvases[i].remove();
	}
}
//#endregion RTC

//#region DEBUG
// TEST to find trinkets initial gathering position:
// Debug stufff: move probe, show/hide banner.
document.addEventListener("keydown", onDocumentKeyDown, false);

let dW = 0.1;
function onDocumentKeyDown(event) {
	switch (event.keyCode) {
		case 37:
			// event.key: ArrowLeft
			probe.position.x -= dW;
			break;
		case 39:
			// ArrowRight
			probe.position.x += dW;
			break;

		case 38:
			// ArrowUp
			probe.position.z -= dW;
			break;
		case 40:
			// ArrowDown
			probe.position.z += dW;
			break;

		case 33:
			// PageUp
			probe.position.y += dW;
			break;
		case 34:
			// PageDown
			probe.position.y -= dW;
			break;

		case 32:
			// Space
			if (banner) {
				banner.visible = !banner.visible;
				textPlane.visible = !textPlane.visible;
				probe.visible = banner.visible;
			}
			break;

		default:
		// code block
	}
};

function createProbe() {
	const geometry = new THREE.SphereGeometry(0.5, 32, 16);	// defaults: (1, 32, 16)

	const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
	probe = new THREE.Mesh(geometry, material);

	// set to POS: trinkets gathering point
	probe.position.copy(POS);

	scene.add(probe);
}
//#endregion DEBUG
