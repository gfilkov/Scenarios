/*
Updated to standard MoW HTML.
Init, startButton listener: on window load;
Animation: on startButton click.
*/

//////////// RECORDING
// 1: client: recorder.stopRecorder();
// 2: gfWebRecorder.onRecorderStop(e) {
//		...
//		this._recordedCallback(this._recordSrc);
//    }
// 3: client: recordedCallback(recUrl) {...; preview.src = recUrl;}
// 4: client: showPreview()
//
/////// poor-man async
// loop {
//	<exit check>:   exit check: gameOver = true;
//  <next> if(recorder.recorder.state === "recording") recorder.stopRecorder();
//  <next> if(preview.src = recUrl <not "">) exit loop; showPreview()
//}

var scenario = "bubbles";
var recordingDisabled = false;
var recordingChecked = false;

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

let canvas = null, overlayCanvas = null, container = null;
var camera, scene, renderer;
var mesh, zmesh, lightMesh, geometry;
var spheres = [];

const startX = 0;	// bubbles initial position
const startY = -3000;
const startZ = 900;
const upspeed = 1800;	// 3600; speed doubles when all home (otherwise long text is never fully composed)

var directionalLight, pointLight;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var aX = .5;    // angle to tilt pattern around X axis (~30 deg)
var aY = 1.4;	// .8;    // angle to rotate pattern around Y axis (~45 deg)

var controls;
var lookingat = new THREE.Vector3();
var pointer;
var mousedown = false;

document.addEventListener( 'mousedown', onDocumentMouseDown, false );
document.addEventListener('mouseup', onDocumentMouseUp, false);

var bubblesnum = 0; // number of active (visible bubbles)
var bubblespeed = 200;
var activebubbles = 0;
var Ymax = 60000;   // bubbles start popping
let allhome = false;

let releaseTime = 15000;	// seconds to release all
var vicinity = 60;		// closer than that to target: home = true

let startTime = Date.now();

let textureopen;

let listener = new THREE.AudioListener();

const audioPopSrc = 'sounds/Soda-can-opening-sound-effect.mp3';
const audioBubblesSrc = 'sounds/bubbles.mp3';

let audioPop = new THREE.Audio(listener);
let audioBubbles = new THREE.Audio(listener);

//#region COMMON

// Strange layout I used for this old scenario: just raster in assets!?
let assets = 1;	// assets load counters
let assetsCount = 0;
//function initAssets() {
//}


//// RASTER
// ShowRaster.js:
// NB: uses global rasterParams object (ShowRaster.js). Set other properties if/as needed.
// rasterParams.fontFamily = 'LED';

getRaster(rasterReady);

// callback
// strange thing happening... rasterReady() called more than once, breaking checkAssets() logic.
// Using safety catch myAssetsCount
let myAssetsCount = 0;	// -1; start fro 0 here because of just single asset counted: raster
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

	let message = '<h4>Move scene around with your mouse.</h4><h4>Roll in / roll out bubbles cloud with your mouse wheel.</h4>';

	assetsCount++;
	checkAssets(assets, assetsCount, 'raster', message);

	// init();
	requestAnimationFrame(init);

	myAssetsCount = assetsCount;
}
////




// called from this.rasterReady(); ### somehow gwt called twice: check for it!
let tgt1, tgt2, camtarget;
let inited = false;
function init() {
	if (inited)
		return;

	// scenario_three_template:
	// Back to old good container DIV with canvases inside.
	// Advantage: easier and more logical to center single DIV than multiple canvases.

	// Create container DIV, create canvas and overlayCanvas inside container
	createCanvases();	// scenario_three_template

	// change div#warning height to accomodate long message
	let divwarning = $('div#warning')[0];
	divwarning.style.height = '60vmin';

	// set renderer ratio to 16:9
	let size = setVideoSize(16, 9); // scenario_three_template

	// for scenario_three_template::startRecording() gameWidth/gameHeight must be defined,
	// otherwise it will be window inner size.
	gameWidth = size.W;
	gameHeight = size.H;

	scene = new THREE.Scene();

	if (DEBUG) {
		scene.add(new THREE.AxesHelper(5000));
	}

	camera = new THREE.PerspectiveCamera(60, gameWidth / gameHeight, 1, 100000);
	scene.add(camera);

	camera.position.z = 3200;
	camera.position.y = 6000;

    // rotate camera around Y to look at lighter spot (where pattern will be rotated to as well)
	camera.position = camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -aY);
	//

	// camera look at targets
	tgt1 = new THREE.Vector3(startX, startY + 10000, startZ);	// initial
	tgt2 = new THREE.Vector3(startX, startY, startZ);			// bubbles

	camtarget = tgt1;

	// Lighting
	const light = new THREE.DirectionalLight(0xffffff, 1);
	light.position.set(1, 10, 10).normalize();
	scene.add(light);

	const ambientLight = new THREE.AmbientLight(0x333333);
	scene.add(ambientLight);

	// audio
	camera.add(listener);

	const audioLoader = new THREE.AudioLoader();

	audioLoader.load(audioPopSrc, function (buffer) {
		// onLoad callback function
		audioPop.setBuffer(buffer);

		// ### spent some time in frustration: why no sound!? (attached to the can).
		// The distances are stupidly huge.Can was "too far" to hear anything.
	});

	audioLoader.load(audioBubblesSrc, function (buffer) {
		audioBubbles.setBuffer(buffer);
	});

	// background
	const path = "textures/cube/Park2/";
	var format = '.jpg';
	var urls = [
			path + 'posx' + format, path + 'negx' + format,
			path + 'posy' + format, path + 'negy' + format,
			path + 'posz' + format, path + 'negz' + format
		];

	var textureCube = new THREE.CubeTextureLoader().load( urls );
	textureCube.format = THREE.RGBFormat;
	scene.background = textureCube;

	var geometry = new THREE.SphereBufferGeometry( 100, 32, 16 );

	var shader = THREE.FresnelShader;
    var uniforms = THREE.UniformsUtils.clone( shader.uniforms );
	uniforms[ "tCube" ].value = textureCube;

	var material = new THREE.ShaderMaterial( {
		uniforms: uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader
	});

    // pointer helper object (used in camera_turn_to())
	var geometry1 = new THREE.SphereGeometry(5, 32, 32);
	var material1 = new THREE.MeshBasicMaterial({ color: 0xffff00 });
	pointer = new THREE.Mesh(geometry1, material1);
	pointer.position.x = 0.0;
	pointer.position.y = 0.0;
	pointer.position.z = 0.0;
    // set scalle to~40 to make pointer visible (for debug)
	pointer.scale.x = pointer.scale.y = pointer.scale.z = 40;


	//// DEBUG
	//let w = raster.Statistics.TextSize.Width;
	// Frustrating!! Debugger shows raster is not loaded here, but I can use it here, actually.

    // var scale = 200;
	scale = 27200 / (raster.Statistics.TextSize.Width + raster.Statistics.TextSize.Height);
	var Y0 = -12000;

	// in ShowRaster:
	forEachRasterPoint(raster, myCallback);

	// callback({ X: pnt.X, Y: pnt.Y, iChar: i, iPoint: j, iLine: pnt.LineIndex});
	function myCallback(param) {
		var mesh = new THREE.Mesh(geometry, material);
		mesh.position.z = -10000;	// -30000;
		// Store target point in userData
		var x = param.X * scale;
		var y = -param.Y * scale;
		var z = mesh.position.z;
		var pos = new THREE.Vector3(x, y, z);

		// tilt forward (rotation order is important!
		pos = pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), aX);
		// rotate pattern around Y to look at lighter spot
		pos = pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -aY);

		// Move pattern down
		pos.y += Y0;

		mesh.position.x = startX;	// 0;
		mesh.position.y = startY;	// -3000;
		mesh.position.z = startZ;	// 900;
		//mesh.userData = pos;
		mesh.userData = { target: pos, home: false };

		mesh.visible = false;

		// mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 2 + 1;	// 1 - 3
		mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() + 2;			// 2 - 3

		scene.add(mesh);
		spheres.push(mesh);
	}

	// randomize array
	spheres = shuffle(spheres);

	activebubbles = spheres.length;

	scene.matrixAutoUpdate = false;

	// Init renderer: use pre-created canvas
	renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(gameWidth, gameHeight);;

	controls = new THREE.OrbitControls(camera, renderer.domElement);

	////////////////////// add cola can. No wait for loading. See how it works.
	loadColaCan();
	textureopen = textureLoader.load(textureopenpath);
	// loads and shows OK, but scaling and positioning here does not work - not loaded yet
	// scale and position in the loader callback.
	//////////////////////

	// DEBUG 			// scenario_three_template
	// messageOnCanvas(overlayCanvas, 'Testing one-two-three');

	inited = true;
}

let colacan;	// object
let canMaterial;

// Loaders
const gltfloader = new THREE.GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const canpath = 'Models/cola-can/cola-can.glb';
const texturemetalpath = 'Models/cola-can/Textures/cola_can_metallic.png';
const textureopenpath = 'Models/cola-can/Textures/cola_can_open.png';
function loadColaCan() {
	gltfloader.load(
		canpath,
		(gltf) => {
			let model = gltf.scene;
			model.scale.set(200, 200, 200); // Adjust scale
			model.position.set(startX + 200, startY - 2500, startZ);

			// Model has GLTFMeshStandardSGMaterial, which does not support metallic maps.
			// DeepSeek suggestion (one of): replace material
			model.traverse((node) => {
				if (node.isMesh && node.material.isGLTFSpecularGlossinessMaterial) {	// isGLTFMeshStandardSGMaterial) { - wrong
					const sgMaterial = node.material;
					const standardMaterial = new THREE.MeshStandardMaterial({
						map: sgMaterial.map, // Albedo/diffuse map
						metalnessMap: textureLoader.load(texturemetalpath),
						roughnessMap: sgMaterial.glossinessMap, // Convert glossiness to roughness
						normalMap: sgMaterial.normalMap,
					});

					node.material = standardMaterial;
					canmaterial = node.material;	// there is only one node in the can, one material.
					node.material.needsUpdate = true;
				}
			});

			scene.add(model);
			colacan = model;
			// colacan.add(audioPop);
		},
		(xhr) => {
			//console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
		},
		(error) => {
			console.log(error);
		}
	);
}

// DeepSeek: Function to center the canvas horizontally (using my setVideoSize())
function centerCanvas() {
	// scenario_trhree_template.js: returns max contained size of given aspect
	let size = setVideoSize(16, 9);

	// Calculate the left margin to center the canvas
	const marginLeft = (window.innerWidth - size.W) / 2;

	// Apply the margin to the canvas
	if(canvas)
		canvas.style.marginLeft = `${marginLeft}px`;

	// apply the same to 'preview' video
	const preview = document.getElementById("divPreview");
	if (null != preview)
		preview.style.marginLeft = `${marginLeft}px`;

}
// Re-center the canvas on window resize
window.addEventListener('resize', centerCanvas);

// called from scenario_three_template::startShow()
function startShowCustom() {
	console.log("startShowCustom(): void");
}
//#endregion

//#region ANIMATION LOOP
// initAll() scenario-specific part
function initAllCustom() {
	console.log("initAllCustom()");

	let ready = true;
	if (undefined === canvas) {
		canvas = $('canvas')[0];
		ready = false;
	}

	//if (undefined === divScene) {
	//	divScene = $('div#ThreeJS')[0];
	//	ready = false;
	//}

	return ready;
}

// Going with THREE.Clock, not using timestamp scenario_three_template
// Create a clock instance
const clock = new THREE.Clock();

let elapsedTime = 0;
let canopened = false;
let stage = 0;
// stages: 0: look at park; 1: turn down to can; 2: look at the can; 3: open can; 4: wait 1 sec. 5: run bubbles
function render(timestamp) {
	if (!entryCheck())
		return;

	// exit condition
	if (activebubbles <= 0) {
		console.log("render(): gameOver");
		gameOver = 0;	// exit at once regardless the message: there is enought time for message review.
	}

	// let delta = timer.getDelta();
	let delta = clock.getDelta();

	// debug hack
	// on debug stop delta grows huge, time runs out, game over on resume. Assuming frame rate 1/30:
	if (delta > 0.5) {
		delta = 0.03;
	}

	// to avoid recording of blur screen the recorder is set to pause initially.
	resumeRecord();

	switch (stage) {
		case 0:
			// look at park
			camera.lookAt(camtarget);
			if (elapsedTime > 1) {
				elapsedTime = 0;
				stage++;
			}
			break;
		case 1:
			// turn to can for 2 secs
			let f = (elapsedTime) / 2;
			camtarget.lerpVectors(tgt1, tgt2, f)
			camera.lookAt(camtarget);
			if (elapsedTime > 2) {
				elapsedTime = 0;
				stage++;
			}
			break;
		case 2:
			// look at can for 1 sec
			camera.lookAt(camtarget);
			if (elapsedTime > 0.5) {
				elapsedTime = 0;
				stage++;
			}
			break;
		case 3:
			// open can
			opencan();
			elapsedTime = 0;
			stage++;
			break;
		case 4:
			// wait for 1.5 sec (while pop sound plays)
			if (elapsedTime > 1.5) {
				elapsedTime = 0;
				stage++;
			}
			break;
		case 5:
			// play bubbles sound
			audioBubbles.loop = false;
			audioBubbles.setVolume(0.5);
			audioBubbles.setPlaybackRate(2);
			audioBubbles.play();
			elapsedTime = 0;
			stage++;
			break;
		case 6:
			// run bubbles
			update(delta);
			break;
	}

	renderer.render(scene, camera);
	elapsedTime += delta;
}

function opencan() {
	// reskin can, pop sound, bubbles sound
	// replace texture
	textureopen.flipY = false; // DeepSeek Saved my day!
	canmaterial.map = textureopen;
	canmaterial.needsUpdate = true;

	audioPop.loop = false;
	audioPop.play();
}

let messageShown = false;
function update(delta) {
	// middle of the flock
	let middle = averagePos();
	// Make camera to follow the pattern when user does not use mouse
	if (!mousedown) {
		camera.lookAt(middle);
	}

	if (middle.y > Ymax) {
		if (!messageShown) {
			// scenario_three_template
			messageOnCanvas(overlayCanvas, rasterParams.message, {color: 'yellow', strokeColor: 'yellow'});
			messageShown = true;
		}

		// bubbles start popping: make 1 random bubble invisible
		popbubble();
		activebubbles--;
	}
	else {
		// release/activate more bubbles
		if (bubblesnum < spheres.length) {
			let released = releaseBubbles();
		}
		else
			audioBubbles.stop();
	}

	var timer = 0.0001 * Date.now();

	// movement
	let uspeed = allhome ? upspeed * 2 : upspeed;
	allhome = true;	// check in the loop below
	for (let i = 0; i < spheres.length; i++) {
		let sphere = spheres[i];

		// floats up
		//sphere.userData.y += 45;
		sphere.userData.target.y += uspeed * delta;

		if (!sphere.visible) {
			// no visual movement but target position (userdata) goes up
			continue;
		}

		// distance to target
		let speed = new THREE.Vector3(sphere.userData.target.x - sphere.position.x, sphere.userData.target.y - sphere.position.y, sphere.userData.target.z - sphere.position.z);
		let dist = speed.length();
		speed.normalize();	// direction only

		if (!sphere.userData.home && dist < vicinity) {
			sphere.userData.home = true;
		}

		if (sphere.userData.home) {
			// meander around target
			// make movements relative to bubble size; limit lateral movements
			sphere.position.x = sphere.userData.target.x + 15 * sphere.scale.x * Math.cos(timer * 20 + i);
			sphere.position.y = sphere.userData.target.y + 60 * sphere.scale.y * Math.sin(timer * 20 + i * 1.1);
			sphere.position.z = sphere.userData.target.z + 60 * sphere.scale.z * Math.sin(timer * 20 + i * 1.2);
		}
		else {
			allhome = false;

			// float to target
			sphere.position.add(speed.multiplyScalar(bubblespeed));

			var drift = Math.min(bubblespeed, dist) / 2;
			sphere.position.x += drift * Math.cos(timer + i) / 2;
			sphere.position.y += drift * Math.sin(timer + i * 1.1) / 2;
			sphere.position.z += drift * Math.sin(timer + i * 1.2) / 2;
		}
	}
}

// scenario-specific
function exitCheckCustom() {
	console.log('exitCheckCustom(): void');
}
//#endregion

//#region SCENARIO-SPECIFIC

function releaseBubbles() {
	if (bubblesnum >= spheres.length)
		return 0;

	let timeNow = Date.now();
	let targetNum = lerp2(startTime, startTime + releaseTime, 0, spheres.length, timeNow);
	let released = 0;

	if (targetNum > bubblesnum) {
		// relesing sphere[bubblesnum]; make sure it was invisible.
		if (spheres[bubblesnum].visible) {
			console.log('WARNING: releaseBubbles()', bubblesnum, 'already visible!');
		}
		else {
			spheres[bubblesnum].visible = true;
			released = 1;
			bubblesnum++;
		}
	}
	return released;
}

// find average position for all bubbles
function averagePos() {
	let tempX = 0.0;
	let tempY = 0.0;
	let tempZ = 0.0;
	let N = spheres.length;
	for (let i = 0; i < N; i++) {
		tempX += spheres[i].position.x;
		tempY += spheres[i].position.y;
		tempZ += spheres[i].position.z;
	}
	return new THREE.Vector3(tempX / N, tempY / N, tempZ / N);
}

// makes one more bubble invisible
function popbubble() {
    var count = 0;  // safety break
    var pop = Math.floor(Math.random() * spheres.length);
    // loop in search of still visible bubble
    while(!spheres[pop].visible) {
        count++;
        pop++;
        if(pop > spheres.length -1) {pop = 0;}
        if(count > spheres.length) {break;}
    }
    spheres[pop].visible = false;
}
//#endregion

//#region CAPTURE
function sceneReady() {
	console.log('sceneReady()');

	if (undefined === canvas) {
		console.log('canvas undefined, exiting');
		return false;
	}

	// sound based on THREE.Listener will be handled in scenario_three_template::setMobileRecorder()
	if (undefined === audioPop) {
		console.log('sound undefined, exiting');
		return false;
	}

	return true;
}
// called from scenario_three_template:startShow()
function startAmbientSounds() {
	// bgAudio.play();     // turn on audio stream
	console.log('startAmbientSounds(): void');
}

function setMobileRecorderCustom(recorder) {
	recorder.frontCanvas = overlayCanvas;	// front canvas;
	recorder.canvas = canvas;
}

function sceneRemoveCustom() {
	let canvases = $('canvas');
	for (let i = 0; i < canvases.length; i++) {
		console.log('Removing canvas', i, ':', canvases[i].id);
		canvases[i].remove();
	}

	container?.remove();
}
//#endregion

//#region HELPERS
// camera move site axis from current direction to the target
// f - fraction of linear distance to move in one step
function camera_turn_to(target, f) {
	camera.getWorldDirection(lookingat);

	var d = camera.position.distanceTo(target);
	pointer.position.set(lookingat.x * d + camera.position.x, lookingat.y * d + camera.position.y, lookingat.z * d + camera.position.z);

	// move a fraction along the line from 'pointer' to target
	var x = pointer.position.x + f * (target.x - pointer.position.x);
	var y = pointer.position.y + f * (target.y - pointer.position.y);
	var z = pointer.position.z + f * (target.z - pointer.position.z);
	newpos = new THREE.Vector3(x, y, z);
	camera.lookAt(newpos);
}
function onDocumentMouseDown(event) {
	mousedown = true;
}
function onDocumentMouseUp(event) {
	mousedown = false;
	drift = .0;
}
//#endregion