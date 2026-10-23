/*
In htis scenario I will not be scaling raster to fit to banner.
Rather scale banner to accomodate raster. I will use relative cam positioning to fit the scene into screen.
*/

scenario = "flowers";
var recordingDisabled = false;
var recordingChecked = false;

//#region RASTER
//// no slogans in this scenario: single page
// ShowRaster.js:
// NB: uses global rasterParams object (ShowRaster.js). Set other properties if/as needed.
rasterParams.fontFamily = 'LED';

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
}//#endregion RASTER

//#region CONFIG
// Enable THREE.js built-in caching to prevent duplicate texture loads:
THREE.Cache.enabled = true;

const FLOWER_BUD_SCALE_INIT = 0.2;
const FLOWER_BUD_SCALE = 0.4;
const FLOWER_BUD_Y_INIT = 3.75;
const FLOWER_BUD_Y = 4.43;

const TIME_GROW = 2;
const TIME_OPEN = 12; 
const ANGLE_MID = Math.PI / 9 * 2;	//  40; // start of rind inversion
const ANGLE_MAX = Math.PI / 6 * 5;	//  150; // max rotation (opening)
const BUD_SCALE_DOWN = 0.7;   // bud leaves "wilting"
const FLOWER_SCALE_FINAL = new THREE.Vector3(6, 6, 6);	// final local scale
const FLOWER_OPENING_SPEED = -Math.PI / TIME_OPEN;

const dither = true;
const DITHER_MAX = Math.PI / 9;   // 20, max abs euler
const DITHER_FACTOR = 4;

const BANNER_STEP = 2.2;

// grass pad half-width (minus margin): grass-block-6x8
const GRASS_W = 88;
const GRASS_H = 60;
const GRASS_SCALE = 0.2;

const STONE_SCALE = 24;
const TUFT_SCALE = 64;
const SHRUB_SCALE = 8;
const BUTTERFLY_SCALE = 10;

const BUTTERFLY_SPEED = 6;	// base speed of motion

const audioSrc = 'sounds/bird-chirping-in-the-garden-sound-effect.mp3';

//#endregion CONFIG

let lawnW = 0, lawnH = 0;	// calculated in setGrass();

let flowerScale0 = new THREE.Vector3();	// initial local scale (to be found)

let sepalScale0 = new THREE.Vector3();	// initial local scale (to be found)
let sepalScale1 = new THREE.Vector3();	// final scale (to be calculated)

let stemY = null, stem_initY = null;

let camera, scene, renderer, pointLight, controls, gltfLoader;
let directionalLight, ambientLight;
let dirLtIntensity = 2;
let ambLtIntensity = 4;

let camtarget = new THREE.Vector3(0, 0, 0);

// assets load counters
let assets = 8;		// raster, plant, grass, stone, tuft, shrub, butterfly, sound
let assetsCount = 0;

// models
let plant = null, grass = null;
let tuft = null, stone = null, shrub = null;
let butterfly = null;

// annoying name collision: flowering plant has child flower object;
//'plant' is not good either, there might be other plant objects in the scene.
// rename flowers to trinkets
let trinkets = [];

// immutable enum
const FlowerState = Object.freeze({
	CLOSED: 0,		// initial, bud is closed
	GROWING: 1,		// bud is growing
	OPENING: 2,		// bud is opening
	OPENED: 3
});


//// DeepSeel butterflys animation
let animClipIdle = null;
let animClipHover = null;

// Set up bounds for butterfly movement
const bounds = {
	min: new THREE.Vector3(-10, 1, -10),
	max: new THREE.Vector3(10, 5, 10)
};

// Create multiple butterflies
const butterflies = [];
const butterflyCount = 5;

// create an AudioListener and add it to the camera
const listener = new THREE.AudioListener();

// create a global audio source
const sound = new THREE.Audio(listener);

//### DEBUG
let gfAxesHelper = null;

//////// MESSAGE text control
//let text2 = document.createElement('div');
//text2.id = 'message';
//text2.style.position = 'absolute';
////text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
//text2.style.width = 100;
//text2.style.height = 100;
//text2.style.backgroundColor = "0xe0e0e0";	// "blue";
//text2.style.color = 'white';
//text2.innerHTML = "&#1051;&#1077;&#1085;&#1072; &#1080; &#1054;&#1083;&#1077;&#1075;";	// "hi there!";
//text2.style.top = 0 + 'px';
//text2.style.left = 8 + 'px';
//document.body.appendChild(text2);
////////
// DEBUG: add sphere probe
const geometry = new THREE.SphereGeometry(1, 32, 16);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const sphere = new THREE.Mesh(geometry, material);
//scene.add(sphere); => init()

//////////

////////// DeepSeek //////////////

////// Procedural SkyBox
// Create a large sphere geometry
const skyGeometry = new THREE.SphereGeometry(500, 32, 32);

// Create custom shader material
const skyMaterial = new THREE.ShaderMaterial({
	vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
	fragmentShader: `
    uniform vec3 skyColor;
    uniform vec3 groundColor;
    uniform float horizonHeight;
    uniform float transitionSharpness;
    
    varying vec3 vWorldPosition;
    
    void main() {
      // Normalize the position to get direction from center
      vec3 dir = normalize(vWorldPosition);
      
      // Calculate blend factor based on vertical direction
      float blend = smoothstep(
        -transitionSharpness, 
        transitionSharpness, 
        dir.y - horizonHeight
      );
      
      // Mix between ground and sky color
      vec3 color = mix(groundColor, skyColor, blend);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
	uniforms: {
		skyColor: { value: new THREE.Color(0x87CEEB) }, // Sky blue
		groundColor: { value: new THREE.Color(0x004700) }, // 0x7CFC00 - Lawn green
		horizonHeight: { value: 0.0 }, // Ground level (Y=0)
		transitionSharpness: { value: 0.1 } // Controls transition smoothness
	},
	side: THREE.BackSide // Render inside of sphere
});

const skySphere = new THREE.Mesh(skyGeometry, skyMaterial);
// scene.add(skySphere); => init()

/////////////////////


//#region FRAMEWORK
initAssets();

function initAssets() {
	console.log(scenario + ': initAssets()');

	// load a sound and set it as the Audio object's buffer
	const audioLoader = new THREE.AudioLoader();
	audioLoader.load(audioSrc, function (buffer) {
		sound.setBuffer(buffer);
		sound.setLoop(true);
		sound.setVolume(1);	// 0.5
		//sound.play();	// - later, when rendering starts

		checkAssets(assets, ++assetsCount, 'Audio');
	});

	gltfLoader = new THREE.GLTFLoader();

	loadGltfModel('models/PlantGfBloom.glb', plantOnLoad);
	loadGltfModel('models/grass-block-6x8.glb', grassOnLoad);
	// loadGltfModel('models/Grass lawn.glb', grassOnLoad);		// detailed, but large and slow

	loadGltfModel('models/Shrub.glb', shrubOnLoad);
	loadGltfModel('models/Stone.glb', stoneOnLoad);
	loadGltfModel('models/Tuft of grass.glb', tuftOnLoad);

	loadGltfModel('models/Fluttering_butterfly.glb', butterlyOnLoad);
}

let canvas = null, overlayCanvas = null, container = null;	// overlayContext - do not reuse, create on the fly
// Why it is not that bad: I am not using context (drawind) on each frame, but only as necessary.

// called from mow_template:checkAssets() when all assets are loaded
function init() {
	console.log(scenario + ': init()');

	// Back to old good container DIV with canvases inside.
	// Advantage: easier and more logical to center single DIV than multiple canvases.

	// Create container DIV, create canvas and overlayCanvas inside container
	createCanvases();

	// Init scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xe0e0e0);
	//scene.fog = new THREE.Fog(0xe0e0e0, 1, 20);

	// White directional light at half intensity shining from the top.
	directionalLight = new THREE.DirectionalLight(0xffffff);
	directionalLight.intensity = dirLtIntensity;
	directionalLight.position.set(-10, 20, 10);
	directionalLight.castShadow = true;
	scene.add(directionalLight);

	////////////// DeepSeek
	// Adjust shadow camera properties.
	// (Otherwise the scene will have smaller limited shadowed rect and nio shadows outside the rect)
	directionalLight.shadow.camera.left = -60;  // Adjust as needed
	directionalLight.shadow.camera.right = 60;
	directionalLight.shadow.camera.top = 60;
	directionalLight.shadow.camera.bottom = -60;
	directionalLight.shadow.camera.near = 0.1;
	directionalLight.shadow.camera.far = 100;  // Adjust based on your scene size

	// Optional: Increase shadow map resolution for better quality
	directionalLight.shadow.mapSize.width = 2048;
	directionalLight.shadow.mapSize.height = 2048;

	/////
	//const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
	//scene.add(shadowHelper);
	//////////////

	// AmbientLight( color : Integer, intensity : Float )	// intensity default: 1
	ambientLight = new THREE.AmbientLight(0x404040); // soft white light
	ambientLight.intensity = ambLtIntensity;
	scene.add(ambientLight);

	scene.add(skySphere);

	// Init camera (PerspectiveCamera)
	camera = new THREE.PerspectiveCamera(
		75,
		16 / 9,	//window.innerWidth / window.innerHeight,
		0.1,
		1000
	);

	//camera.position.set(0.8, 1.4, 1.0);
	camera.position.set(4.0, 4.0, 4.0);
	camera.add(listener);

	// Init renderer: use pre-created canvas
	renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
	renderer.outputEncoding = THREE.sRGBEncoding;

	// SHADOWS!
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

	// Set size (whole window)
	renderer.setSize(gameWidth, gameHeight);

	// black -> transparent
	// renderer.setClearColor(0xffffff, 0);

	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.target.set(0, 1, 0);

	// create, init and add to scene
	initTrinkets();
	trinkets = shuffle(trinkets);

	setGrass();
	setStones();
	setTufts();
	setShrubs();
	setButterflies();

	////// Brilliant DeepSeek suggestion:
	// whenReady(() => stone, setStones); etc
	// did not work, alas, when I on purpose set wrong assets counter. Leave it as it is for now.

	//// init camera params
	camera.userData.elapsedTime = 0;
	camera.userData.actionTime = 2;
	camera.userData.stage = 0;
	camera.userData.pos0 = new THREE.Vector3();
	camera.userData.pos1 = new THREE.Vector3();
	camera.userData.tgt0 = new THREE.Vector3();
	camera.userData.tgt1 = new THREE.Vector3();
	////

	//// ### overlayCanvas.style.zIndex = "10";

	if (DEBUG) {
		scene.add(new THREE.AxesHelper(5));

		gfAxesHelper = new GfAxesHelper();
		gfAxesHelper.addToScene(scene);

		const size = 10;
		const divisions = 10;

		const gridHelper = new THREE.GridHelper(size, divisions);
		scene.add(gridHelper);

		scene.add(sphere);	// probe
	}
}

// called from scenario_three_template::initAll(); returns bool initialized
function initAllCustom() {
	console.log(scenario + ': initAllCustom()');

	let ready = true;

	if (undefined === canvas) {
		canvas = $('canvas')[0];
		ready = false;
	}

	//...

	// set camera to initial position 
	// camera.position.set(rcText.left - 0.5, 0.5, rcBanner.top);

	// set camera look at target
	//let tgt = new THREE.Vector3(PLANE_WIDTH / 2, 0.5, -PLANE_HEIGHT / 2);	// top right plane corner
	//camera.lookAt(tgt);

	return ready;
}

// Going with THREE.Clock, not using timestamp scenario_three_template
// Create a clock instance
const clock = new THREE.Clock();
function render(timestamp) {
	// You MUST call entryCheck() here (when using scenario_three_template)
	if (!entryCheck())
		return;

	// let delta = timer.getDelta();
	let delta = clock.getDelta();

	// debug hack
	// on debug stop delta grows huge, time runs out, game over on resume. Assuming frame rate 1/30:
	if (delta > 0.5) {
		delta = 0.03;
	}

	update(delta);

	renderer.render(scene, camera);
}

// called from scenario_three_template:startShow()
function startShowCustom() {
	console.log(scenario + '.startShowCustom(): sound');

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

//#endregion FRAMEWORK

let bannerW, bannerH, grassW, grassH;
function setGrass() {
	console.log(scenario + ': setGrass()');

	grass.scale.set(GRASS_SCALE, GRASS_SCALE, GRASS_SCALE);

	bannerW = rasterSize.Width * BANNER_STEP;
	bannerH = rasterSize.Height * BANNER_STEP;

	// grass-block-6x8
	grassW = GRASS_W * GRASS_SCALE;
	grassH = GRASS_H * GRASS_SCALE;

	// grass pads w/h counts
	const wCount = Math.floor(bannerW / grassW) + 2;
	const hCount = Math.floor(bannerH / grassH) + 2;

	const x0 = grassW * (wCount - 1) / 2;
	const z0 = grassH * (hCount - 1) / 2;

	for (let i = 0; i < wCount; i++) {
		for (let j = 0; j < hCount; j++) {
			let tatami = i + j == 0 ? grass : grass.clone();
			tatami.position.x = -x0 + grassW * i;
			tatami.position.z = -z0 + grassH * j;

			scene.add(tatami);
		}
	}

	// calculate lawn size
	lawnW = grassW * wCount;
	lawnH = grassH * hCount;

	// DEBUG
	// grass.position.y = -2;

	// set probe to lower-left corner of lawn
	sphere.position.x = -lawnW / 2;
	sphere.position.z = lawnH / 2;
}

let cornerPlantIdx = -1;	// for external refs
function setStones() {
	console.log(scenario + ': setStones()');

	stone.scale.set(STONE_SCALE, STONE_SCALE, STONE_SCALE);

	// set 1st stone to lower-left banner corner
	stone.position.x = -bannerW / 2;
	stone.position.z = bannerH/ 2;

	scene.add(stone);

	// find the plant closest to lower-left banner corner: z == C + x => C == z - x: find largest C
	let maxC = 0;
	let idx = -1;
	for (let i = 0; i < trinkets.length; i++) {
		let c = trinkets[i].position.z - trinkets[i].position.x;
		if (c > maxC) {
			idx = i;
			maxC = c;
		}
	}

	cornerPlantIdx = idx;

	// put stone to south-west from corner plant.
	stone.position.x = trinkets[idx].position.x - 2;
	stone.position.z = trinkets[idx].position.z + 2;

	// camtarget.copy(stone.position);	// DEBUG

	// drop some stones
	// dropItems(model, dist, nmin, nmax, include = false)
	let stones = dropItems(stone, 2, 4, 8);

	// scale, rotate
	for (let i = 0; i < stones.length; i++) {
		// stones[i].quaternion.random(); - apparently not included in version 0.132.2
		// using Non-uniform distribution of rotations
		stones[i].rotation.set(
			Math.random() * Math.PI * 2,
			Math.random() * Math.PI * 2,
			Math.random() * Math.PI * 2
		);

		stones[i].scale.set(
			stone.scale.x * random(0.7, 1.4),
			stone.scale.y * random(0.7, 1.4),
			stone.scale.z * random(0.7, 1.4)
		);

		scene.add(stones[i]);

	}
}

function setTufts() {
	console.log(scenario + ': setTufts()');

	tuft.scale.set(TUFT_SCALE, TUFT_SCALE, TUFT_SCALE);

	// drop some tufts
	// dropItems(model, dist, nmin, nmax, include = false)
	let tufts = dropItems(tuft, 1, 16, 24, true);

	// scale, rotate
	for (let i = 0; i < tufts.length; i++) {
		tufts[i].scale.set(
			tuft.scale.x * random(1, 1.4),
			tuft.scale.y * random(1, 2),
			tuft.scale.z = tuft.scale.x
		);

		scene.add(tufts[i]);
	}
}

function setShrubs() {
	console.log(scenario + ': setShrubs()');

	shrub.scale.set(SHRUB_SCALE, SHRUB_SCALE, SHRUB_SCALE);

	// drop some shrubs
	// dropItems(model, dist, nmin, nmax, include = false)
	let shrubs = dropItems(shrub, 4, 4, 8, true);

	// scale, rotate
	for (let i = 0; i < shrubs.length; i++) {
		shrubs[i].rotateY(random(-Math.PI, Math.PI));
		shrubs[i].scale.set(
			shrub.scale.x * random(0.9, 1.1),
			shrub.scale.y * random(1, 1.5),
			shrub.scale.z = shrub.scale.x
		);

		scene.add(shrubs[i]);
	}
}

function setButterflies() {
	console.log(scenario + ': setButterflies()');

	// set boundaries (we have lawn size now)
	bounds.min.x = -lawnW / 2;
	bounds.min.y = 6;
	bounds.min.z = -lawnH / 2;
	bounds.max.x = lawnW / 2;
	bounds.max.y = 20;
	bounds.max.z = lawnH / 2;


	butterfly.scale.set(BUTTERFLY_SCALE, BUTTERFLY_SCALE, BUTTERFLY_SCALE);
	butterfly.rotateY(Math.PI / 6);

	// butterfly.position.set(stone.position.x, stone.position.y + 1.36, stone.position.z - 0.07);

	// Set up animations if needed
	butterfly.mixer = new THREE.AnimationMixer(butterfly);
	butterfly.mixer.clipAction(animClipIdle).play();

	scene.add(butterfly);

	// Create butterfly controller
	butterflies.push(new Butterfly(butterfly, bounds, 0));	// idling, speed: 0

	// important! Byttefly constructor sets random position. Overwrite it here.
	butterfly.position.set(stone.position.x, stone.position.y + 1.36, stone.position.z - 0.07);

	for (let i = 1; i < butterflyCount; i++) {
		// let clone = butterfly.clone();	// clones exist, but they are invisible!?
		let clone = THREE.SkeletonUtils.clone(butterfly);

		clone.name += '_' + i;
		clone.position.set(random(-lawnW / 2 + 1, lawnW / 2 - 1), 6 + i, random(-lawnH / 2 + 1, lawnH / 2 - 1));

		// Set up animations
		clone.mixer = new THREE.AnimationMixer(clone);
		clone.mixer.clipAction(animClipHover).play();

		scene.add(clone);

		let speed = BUTTERFLY_SPEED * (0.3 + Math.random() * 0.4);

		butterflies.push(new Butterfly(clone, bounds, speed));
	}
}

// create, init and add to scene
function initTrinkets() {
	console.log(scenario + ': initTrinkets()');

	// create trinkets based on raster

	// in ShowRaster:
	forEachRasterPoint(raster, myCallback);

	// callback({ X: pnt.X, Y: pnt.Y, iChar: i, iPoint: j, iLine: pnt.LineIndex});
	function myCallback(param) {
		let trinket;
		if (0 == trinkets.length) {
			trinket = plant;	// original object
		}
		else {
			trinket = plant.clone();
			trinket.name = 'clone_' + param.iLine + '_' + param.iChar;

			// set clone to use cached materials
			trinket.traverse(function (child) {
				if (child.isMesh) {
					child.material = dictMats[child.material.name]
				}
			});
		}

		//// initBloom(trinket);	// stem, blossom => later, when all (async!) clone() are complete.

		// trinket position: SHowRaster::var rasterSize; assuming step == 1
		let x = param.X;
		let z = param.Y;
		trinket.position.x = x * BANNER_STEP;
		trinket.position.y = 0;
		trinket.position.z = z * BANNER_STEP;

		trinket.scale.set(
			trinket.scale.x * random(0.9, 1.1),
			trinket.scale.y * random(0.9, 1.2),
			trinket.scale.x,	// scale.x == scale.z
		);

		trinket.rotateY(random(-Math.PI, Math.PI));

		trinkets.push(trinket);

		//// DEBUG
		// console.log('added', trinket.name, 'trinkets[', trinkets.length, ']');

		scene.add(trinket);
	}
}

// DEBUG
let actionTime = 10;
let stage = 0;
let ytest = 40;
let testR = lawnH / 4;
function testUpdate(delta) {
	switch (stage) {
		case 0:
			// set probe to center
			testR = lawnH / 4;
			sphere.position.set(0, 2, 0);
			camera.position.set(0, ytest, 0);
			stage++;
			break;
		case 1:
			// make observation circle
			f = elapsedTime / actionTime;
			let angle = lerp(0, Math.PI * 2, f) - Math.PI/2;
			sphere.position.set(Math.cos(angle) * testR, 2, Math.sin(angle) * testR + testR);
			if (f > 1) {
				elapsedTime = 0;
				stage++;
			}
			break;
		case 2:
			// wait
			if (elapsedTime > actionTime) {
				elapsedTime = 0;
				stage = 0;
			}
			break;
	}

	elapsedTime += delta;
}
// #####

var elapsedTime = 0;		// read/write var, used for scenario stages
let elapsedGameTime = 0;	// game-wide read-only
function update(delta) {
	controls.update();	// DEBUG

	//testUpdate(delta);
	//return;

	updateTeazer(delta);
	updateCamera(delta);

	for (const butterfly of butterflies) {
		butterfly.update(delta);
	}

	for (let i = 0; i < trinkets.length; i++) {
		updateFlower(trinkets[i], delta);
	}

	camera.lookAt(camtarget);
	elapsedTime += delta;
}

let cornerPlant;
let flower1 = null;	// corner plant's flower

let nbloom0 = 0, nbloom1 = 0;	// portion of plants to start blooming

// update 1st butterfly until it is included in class update
let rotSpeed = Math.PI / 10;
function updateTeazer(delta) {
	switch (butterfly.userData.stage) {
		case 0:
			// sits and rotates. stage is updated in updateCamra()
			butterfly.rotateY(delta * rotSpeed);
			break;
		case 1:
			// start flying
			console.log(scenario, 'updateTeazer(' + butterfly.userData.stage + ')');

			butterfly.lookAt(butterfly.userData.pos1);
			butterfly.mixer.clipAction(animClipHover).play();

			butterfly.userData.stage++;
			break;
		case 2:
			// fly to target
			let f = butterfly.userData.elapsedTime / butterfly.userData.actionTime;
			if (f > 1) {
				console.log(scenario, 'updateTeazer(' + butterfly.userData.stage + ')');

				butterfly.userData.stage++;
			}
			butterfly.position.lerpVectors(butterfly.userData.pos0, butterfly.userData.pos1, f);
			butterfly.userData.elapsedTime += delta;
			break;
		case 3:
			// pass butterfly control over to class update
			console.log(scenario, 'updateTeazer(' + butterfly.userData.stage + ')');

			let speed = BUTTERFLY_SPEED * (0.3 + Math.random() * 0.4);
			butterflies[0].speed = speed;
			butterflies[0].flapSpeed = 6;

			butterfly.userData.stage++;
			break;
		default:
			// set initial teaser params
			if (undefined == butterfly.userData.stage) {
				console.log(scenario, 'updateTeazer(' + butterfly.userData.stage + ')');

				butterfly.userData.stage = 0;
				butterfly.userData.actionTime = 4;
				butterfly.userData.elapsedTime = 0;

				// assuming teazer butterly already positioned: sits on the stone
				butterfly.userData.pos0 = butterfly.position.clone();

				// set target pos behind the plant and up
				butterfly.userData.pos1 = butterfly.userData.pos0.clone();
				butterfly.userData.pos1.add(new THREE.Vector3(6, 12, -6));
			}
			break;
	}
}

let ymin;	// min pos of camera on Y axis to see all ground rect
let viewR;	// radius of the observation circle at the top
function updateCamera(delta) {
	switch (camera.userData.stage) {
		// set initial camera position
		case 0:
			console.log(scenario, 'updateCamera(' + camera.userData.stage + ')');

			// observation circle radius
			viewR = lawnH / 4;

			camtarget.copy(butterfly.position);
			controls.target.copy(camtarget);	// DEBUG

			camera.position.set(-lawnW / 2 + 1, 2, lawnH / 2 - 1);
			camera.userData.pos0.copy(camera.position);
			camera.userData.pos1.set(butterfly.position.x - 1, butterfly.position.y, butterfly.position.z + 1);

			camera.userData.elapsedTime = 0;
			camera.userData.actionTime = 2;
			camera.userData.stage++;
			break;

		// camera moves closer to butterfly.
		case 1:
			if (camera.userData.elapsedTime > camera.userData.actionTime) {
				console.log(scenario, 'updateCamera(' + camera.userData.stage + ')');

				camera.userData.elapsedTime = 0;
				camera.userData.actionTime = 2;
				camera.userData.stage++;
				break;
			}
			f = camera.userData.elapsedTime / camera.userData.actionTime;
			camera.position.lerpVectors(camera.userData.pos0, camera.userData.pos1, f);
			break;

		// wait staring at teaser; find corner flower; set butterfly to fly
		case 2:
			if (camera.userData.elapsedTime > camera.userData.actionTime) {
				console.log(scenario, 'updateCamera(' + camera.userData.stage + ')');

				// find flower
				cornerPlant = trinkets[cornerPlantIdx];
				flower1 = findByName(cornerPlant, 'Flower');

				butterfly.userData.stage = 1;	// fly

				camera.userData.elapsedTime = 0;
				camera.userData.stage++;

				// DEBUG
				// messageOnCanvas(overlayCanvas, "Testing 1-2-3 qqqqqqqqqqqqqqqq");	// middle of the screen, not canvas!?
			}
			break;

		case 3:
			// wait for teazer butterfly to get to flower1
			if (butterfly.position.y > flower1.position.y) {
				if (FlowerState.CLOSED == cornerPlant.userData.state)
					initBloom(cornerPlant);

				flower1.getWorldPosition(camtarget);
				controls.target.copy(camtarget);	// DEBUG

				// next stage params
				camera.userData.pos0.copy(camera.position);
				camera.userData.pos1.copy(camera.position);
				camera.userData.pos1.y = camtarget.y;	// up at flower1 height

				camera.userData.elapsedTime = 0;
				camera.userData.stage++;
			}
			else
				camtarget.copy(butterfly.position);

			break;

		case 4:
			// cam goes up to flower1, staring at flower1
			f = camera.userData.elapsedTime / camera.userData.actionTime;
			camera.position.lerpVectors(camera.userData.pos0, camera.userData.pos1, f);
			if (f > 1) {
				camera.userData.elapsedTime = 0;
				camera.userData.stage++;
			}
			break;
		case 5:
			// wait for flower to open, set params for camera raise up
			if (FlowerState.OPENED == cornerPlant.userData.state) {
				// params for next stage: move to banner lower left; move camtarget to upper left
				camera.userData.pos0.copy(camera.position);
				camera.userData.pos1.set(-bannerW / 2, bannerW / 2, camera.userData.pos0.z);
				camera.userData.tgt0.copy(camtarget);
				camera.userData.tgt1.set(-bannerW / 2, 0, -bannerH / 2)

				camera.userData.actionTime = 4;
				camera.userData.elapsedTime = 0;
				camera.userData.stage++;
			}
			break;
		case 6:
			f = camera.userData.elapsedTime / camera.userData.actionTime;
			camera.position.lerpVectors(camera.userData.pos0, camera.userData.pos1, f);
			camtarget.lerpVectors(camera.userData.tgt0, camera.userData.tgt1, f);

			if (f > 1) {
				// params for next stage: move to banner lower center; move camtarget to upper center
				camera.userData.pos0.copy(camera.position);

				// problems with banner visibility with different banner aspects. Position camera at Y axis instead.
				// camera.userData.pos1.set(0, bannerW / 2, camera.userData.pos0.z);
				ymin = getMinCameraHeight(lawnW, lawnH) * 1.2;
				camera.userData.pos1.set(0, ymin, 0);

				camera.userData.tgt0.copy(camtarget);
				camera.userData.tgt1.set(0, 2, -viewR);

				camera.userData.actionTime = 4;
				camera.userData.elapsedTime = 0;
				camera.userData.stage++;
			}

			// start growing flowers
			nbloom1 = Math.floor(trinkets.length * f);
			if (nbloom1 > trinkets.length) nbloom1 = trinkets.length;
			for (let i = nbloom0; i < nbloom1; i++) {
				// DEBUG
				// console.log('i:', i, 'nbloom0:', nbloom0, 'nbloom1:', nbloom1, 'trinket:', trinkets[i].name);
				if (undefined == trinkets[i].userData.state || FlowerState.CLOSED == trinkets[i].userData.state)
					initBloom(trinkets[i]);
			}

			nbloom0 = nbloom1;
			break;

		case 7:
			f = camera.userData.elapsedTime / camera.userData.actionTime;
			if (f <= 1) {
				camera.position.lerpVectors(camera.userData.pos0, camera.userData.pos1, f);
				camtarget.lerpVectors(camera.userData.tgt0, camera.userData.tgt1, f);
			}
			else {
				// get params for the next stage: observation circle
				camera.userData.actionTime = 8;
				camera.userData.elapsedTime = 0;
				camera.userData.stage++;

				// scenario_three_template
				messageOnCanvas(overlayCanvas, rasterParams.message, { color: 'blue', strokeColor: 'white'});
			}
			break;

		case 8:
			// make observation circle
			// NB: for smooth transition campos.0 should be (0, ymin, 0), camtarget.0: (0, 2, -viewR)
			f = camera.userData.elapsedTime / camera.userData.actionTime;
			let angle = lerp(0, Math.PI * 2, f) - Math.PI / 2;
			camera.position.set(Math.cos(angle) * viewR, ymin, Math.sin(angle) * viewR + viewR);
			camtarget.set(camera.position.x, 0, camera.position.z - viewR);

			if (f > 1) {
				// next step: wait for all flowers to open
				camera.userData.actionTime = 4;
				camera.userData.elapsedTime = 0;
				camera.userData.stage++;
			}
			break;

		case 9:
			// wait for all flowers to open
			if (allOpened() || camera.userData.elapsedTime > camera.userData.actionTime) {
				// displayMessage(myMessage);

				// scenario_three_template
				// messageOnCanvas(canvasText, message, { left, top, fontFactor, color, strokeColor } = {})

				// wait for all flowers to open; set params for next stage: go down
				camera.userData.pos0.copy(camera.position);
				camera.userData.pos1.set(bannerW / 2 + 1, 8, bannerH / 2 + 1);

				camera.userData.actionTime = 4;
				camera.userData.elapsedTime = 0;
				camera.userData.stage++;
			}
			break;

		case 10:
			f = camera.userData.elapsedTime / camera.userData.actionTime;
			camera.position.lerpVectors(camera.userData.pos0, camera.userData.pos1, f);

			if (f > 1) {
				//camera.userData.stage++;
				//gameOver = 0;	// exit right away

				camera.userData.actionTime = 2;
				camera.userData.elapsedTime = 0;
				camera.userData.stage++;
			}
			break;
		case 11:
			// linger for couple of secs
			if (camera.userData.elapsedTime > camera.userData.actionTime)
				gameOver = 0;	// exit right away

			break;
	}


	camera.userData.elapsedTime += delta;
}

// DeepSeek
function getMinCameraHeight(groundW, groundH) {
	const fovRad = (camera.fov * Math.PI) / 180;
	const minHeightForWidth = (groundW / camera.aspect) / (2 * Math.tan(fovRad / 2));
	const minHeightForDepth = groundH / (2 * Math.tan(fovRad / 2));
	return Math.max(minHeightForWidth, minHeightForDepth);
}
function allOpened() {
	let result = true;

	for (let i = 0; i < trinkets.length; i++) {
		if (FlowerState.OPENED != trinkets[i].userData.state) {
			result = false;
			break;
		}
	}

	return result;
}

// DEBUG
let dbg = '';
function updateFlower(trinket, delta) {
	switch (trinket.userData.state) {
		case FlowerState.GROWING:
			if (trinket.userData.elapsedTime > TIME_GROW) {
				trinket.userData.state = FlowerState.OPENING;
				trinket.userData.elapsedTime = 0;
				break;
			}
			updateGrowing(trinket);
			trinket.userData.elapsedTime += delta;
			break;
		case FlowerState.OPENING:
			// mow.js: getAngleBetweenAxes(node1, node2, idx1, idx2)
			// getAngleBetweenAxes(node1, node2) - defaults to Ys
			let angle = getAngleBetweenAxes(trinket.userData.stem, trinket.userData.sepals[0]);

			//if (!trinket.name.startsWith('clone'))
			//	console.log('angle:', angle);

			if (angle > ANGLE_MAX) {
				trinket.userData.state = FlowerState.OPENED;
				trinket.userData.elapsedTime = 0;
				break;
			}
			updateOpening(trinket, angle, delta);
			trinket.userData.elapsedTime += delta;
			break;
	}
}

function updateGrowing(trinket) {
	if (trinket.userData.state != FlowerState.GROWING)
		return;
	if (trinket.userData.elapsedTime > TIME_GROW)
		return;

	// bud scale
	let sc = lerp2(0, TIME_GROW, FLOWER_BUD_SCALE_INIT, FLOWER_BUD_SCALE, trinket.userData.elapsedTime);	// mow.js
	// bud Y
	let by = lerp2(0, TIME_GROW, FLOWER_BUD_Y_INIT, FLOWER_BUD_Y, trinket.userData.elapsedTime);
	// stem Y
	let sy = lerp2(0, TIME_GROW, stem_initY, stemY, trinket.userData.elapsedTime);

	// when cloning in process there might be object with missing parts and properties.
	if (undefined != trinket.userData.bloom.scale) {
		trinket.userData.bloom.scale.set(sc, sc, sc);
		trinket.userData.bloom.position.y = by;
	}
	if (undefined != trinket.userData.stem.position)
		trinket.userData.stem.position.y = sy;
}

const worldUp = new THREE.Vector3(0, 1, 0);
function updateOpening(trinket, angle, delta) {
	if (trinket.userData.state != FlowerState.OPENING)
		return;
	if (angle > ANGLE_MAX)
		return;

	// rotate sepals
	let deltaAngle = trinket.userData.rotationSpeed * delta;

	let f = 1;	// sepals scale factor
	if (angle > ANGLE_MID) {
		deltaAngle *= 2;
		f = (angle - ANGLE_MID) / (ANGLE_MAX - ANGLE_MID);
	}

	for (let i = 0; i < trinket.userData.sepals.length; i++) {
		trinket.userData.sepals[i].rotateX(deltaAngle);

		// scale/invert
		if (angle > ANGLE_MID) {
			trinket.userData.sepals[i].scale.lerpVectors(sepalScale0, sepalScale1, f);
		}
	}

	// open flower
	trinket.userData.flower.scale.lerpVectors(flowerScale0, FLOWER_SCALE_FINAL, angle / ANGLE_MAX);

	// dither
	if (dither) {
		let blossom = trinket.userData.flower;	// elicit blossom 'flower' from plant object

		let d = DITHER_FACTOR * trinket.userData.rotationSpeed * delta;
		let ax = d * random(-1, 1);	// mow.js
		let ay = d * random(-1, 1);
		let az = d * random(-1, 1);

		blossom.rotateX(ax);
		blossom.rotateY(ay);
		blossom.rotateZ(az);

		////////
		// over-rotated?
		if (undefined == trinket.userData.stem.quaternion)
			return;

		let qstem = trinket.userData.stem.quaternion.clone();
		let qflower = blossom.quaternion.clone();
		let angle = qflower.angleTo(qstem);

		if (angle > DITHER_MAX) {
			// Q.rotateTowards ( q : Quaternion, step : Float ) : this

			blossom.quaternion.rotateTowards(qstem, angle/2 /* ax * polarAngleParams.polarFactor */);
		}
	}
}
//////

const materials = [];
function loadGltfModel(path, callback) {
	let model = null;
	gltfLoader.load(
		path,
		(gltf) => {
			model = gltf.scene;

			// animations (only butterfly has animations)
			if (gltf.animations.length > 0) {
				animations = gltf.animations;

				// Check available animations
				console.log('Available animations:', animations.map(anim => anim.name));

				animClipIdle = gltf.animations[1];
				animClipHover = gltf.animations[0];

				//// Create an AnimationMixer
				//mixer = new THREE.AnimationMixer(model);
				//animationManager = new AnimationManager(mixer, animations);
			}

			// add shadows? modify materials?
			gltf.scene.traverse(function (child) {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});
			
			// Extract materials (to reuse in clones)
			// model.traverse((node) => {
				// if (node.isMesh) {
					// materials.push(node.material);
					// // Prevent disposal of the original material
					// node.material.dispose = () => { };
				// }
			// });

			callback(model);
		},
		(xhr) => {
			// console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
			let percent = Math.round((xhr.loaded / xhr.total) * 100);
			let msg = path + ': ' + percent + '% loaded';
			console.log(msg);
			// logToServer(msg, 'gltfLoader.load', scenario);
		},
		(error) => {
			console.log(error);
			logToServer('ERROR', 'gltfLoader.load', scenario);
		}
	);
}

// Clone with Shared Materials
const dictMats = { key1: 'value1' };	// dictionary
function plantOnLoad(model) {
	console.log(scenario + ': plantOnLoad()');

	plant = model;

	plant.traverse(function (child) {
		if (child.isMesh) {
			// shadows (in my models these settings are 'false')
			child.castShadow = true;
			child.receiveShadow = true;

			// cache materials; check if material already cached
			if (undefined == dictMats[child.material.name]) {
				dictMats[child.material.name] = child.material;
				// Prevent disposal of master material
				child.material.dispose = () => { };

				/////// DEBUG: checked in clones: cached materials were used
				dictMats[child.material.name].userData.gfMark = true;
				///////
			}




		}
	});

	////////////////////////// change initial scale and position of bud and stem nodes.
	// mow.js: function findByName(root, token)
	let bloom = findByName(plant, 'GfBloom');
	let stem = findByName(plant, 'stem');
	// trinket has child named 'Flower' - actual flower petals.
	let flower = findByName(plant, 'Flower');

	let sepal = findByName(plant, 'Sepal_0');

	// memorize initial scales
	flowerScale0.copy(flower.scale);

	// calc init and final local scale of sepals
	sepalScale0.copy(sepal.scale);

	sepalScale1.x = sepalScale0.x * BUD_SCALE_DOWN;
	sepalScale1.y = sepalScale0.y * BUD_SCALE_DOWN;
	sepalScale1.z = -sepalScale0.z * BUD_SCALE_DOWN;

	// INIT blossom size/position
	bloom.scale.set(FLOWER_BUD_SCALE_INIT, FLOWER_BUD_SCALE_INIT, FLOWER_BUD_SCALE_INIT);
	bloom.position.y = FLOWER_BUD_Y_INIT;

	// move stem down with the bloom
	stemY = stem.position.y;	// initial position of the 1st trinket
	stem_initY = stem.position.y;

	stem.position.y -= FLOWER_BUD_Y - FLOWER_BUD_Y_INIT;
	//////////////////////////

	plant.userData.state = FlowerState.CLOSED;

	checkAssets(assets, ++assetsCount, 'PlantGfBloom');
}

function grassOnLoad(model) {
	console.log(scenario + ': grassOnLoad()');
	grass = model;
	grass.rotation.y = Math.PI/2;	// for grass-block-6x8 => 8x6

	checkAssets(assets, ++assetsCount, 'grass');
}

function shrubOnLoad(model) {
	console.log(scenario + ': shrubOnLoad()');

	shrub = model;
	shrub.name = 'shrub';

	checkAssets(assets, ++assetsCount, 'shrub');
}

function stoneOnLoad(model) {
	console.log(scenario + ': stoneOnLoad()');

	stone = model;
	stone.name = 'stone';

	checkAssets(assets, ++assetsCount, 'stone');
}

function tuftOnLoad(model) {
	console.log(scenario + ': tuftOnLoad()');

	tuft = model;
	tuft.name = 'tuft';

	checkAssets(assets, ++assetsCount, 'tuft');
}

function butterlyOnLoad(model) {
	console.log(scenario + ': butterflyOnLoad()');

	butterfly = model;
	butterfly.name = 'butterfly';

	checkAssets(assets, ++assetsCount, 'butterfly');
}



// find and init 'bloom' children: sepals, stem
// NB: run ONLY after clone() completes! (how to find when???)
function initBloom(trinket) {
	console.log(scenario + ': initBloom(' + trinket.name + ')');

	//// mow.js: function findByName(root, token)
	bloom = findByName(trinket, 'GfBloom');
	let stem = findByName(trinket, 'stem');

	// trinket has child named 'Flower' - actual flower petals.
	trinket.userData.flower = findByName(trinket, 'Flower');

	trinket.userData.bloom = bloom;
	trinket.userData.stem = stem;
	trinket.userData.sepals = new Array(4);

	// set sepals; mow.js: function findByName(root, token)
	for (let k = 0; k < trinket.userData.sepals.length; k++) {
		trinket.userData.sepals[k] = findByName(trinket, 'Sepal_' + k);
	}

	trinket.userData.rotationSpeed = dither ? FLOWER_OPENING_SPEED * random(0.8, 1.2) : FLOWER_OPENING_SPEED;

	trinket.userData.state = FlowerState.GROWING;	// FlowerState.CLOSED;
	trinket.userData.elapsedTime = 0;
}

////////////////////////
if (DEBUG) {
	document.addEventListener("keydown", onDocumentKeyDown, false);
}
function onDocumentKeyDown(event) {
	switch (event.keyCode) {
		case 32:
			// space
			setTrinketRefs();
			break;
	}
}

// set child references in trinkets AFTER all cloning (async!) is complete.
function setTrinketRefs() {
	for (let i = 0; i < trinkets.length; i++) {
		initBloom(trinkets[i]);
	}
}



// Clone model, create array of items, drop them on the banner respecting min distance from the trinkets.
// model to clone
// dist from trinkets
// number = random(nmin, nmax), if nmin == nmax - no random used.
// include the model in resulting array and drop it (position) as well.
function dropItems(model, dist, nmin, nmax, include = false) {
	let maxAttempts = 32;

	if (undefined == nmax)
		nmax = nmin;

	let num = nmin == nmax ? nmin : Math.floor(random(nmin, nmax));	// mow.js

	const items = [];
	let item;

	for (let i = 0; i < num; i++) {
		if (i == 0 && include)
			item = model;
		else {
			item = model.clone();
			item.name = model.name + '_' + i;
		}

		// position item
		let positioned = false;
		let attempts = 0;
		while (!positioned && attempts < maxAttempts) {
			let x = random(-lawnW / 2, lawnW / 2);	// mow.js
			let z = random(-lawnH / 2, lawnH / 2);
			let pos = new THREE.Vector3(x, 0, z);
			attempts++;

			let dropped = true;	// now let's check it it is good position
			for (j = 0; j < trinkets.length; j++) {
				if (pos.distanceTo(trinkets[j].position) < dist) {
					dropped = false;
					break;
				}
			}

			///////////////// Special case: avoid original stone
			if (pos.distanceTo(stone.position) < dist * 2)
				dropped = false;
			/////////////////

			// if passed the check
			if (dropped) {
				item.position.copy(pos);
				positioned = true;
				items.push(item);
			}
		}

		if (!positioned)	// quit further attempts
			break;
	}

	return items;
}

////// Brilliant DeepSeek suggestion:
function whenReady(getModel, cb, frames = 60) {
	const m = getModel();
	if (m) return cb(m);
	if (frames <= 0) return console.error('Timed out waiting for model');
	requestAnimationFrame(() => whenReady(getModel, cb, frames - 1));
}

// usage
// whenReady(() => myModel, useModel);

//#region CAPTURE
//// RTC issue: not always scene (canvas) is ready at the Play button

//// solution
//scenario_three_template:: recorder !== null
//    - started
//initAll(): if RTC: if null === recorder: startRecording()
//startRecording() -> <scenario>::sceneReady()	// check all components for RTC

function sceneReady() {
	console.log('sceneReady()');

	// canvas required for RTC
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

function sceneRemoveCustom() {
	$('div#container').remove();

	let canvases = $('canvas');
	for (let i = 0; i < canvases.length; i++) {
		console.log('Removing canvas', i, ':', canvases[i].id);
		canvases[i].remove();
	}
}

function setMobileRecorderCustom(recorder) {
	recorder.frontCanvas = overlayCanvas;	// front canvas;
	recorder.canvas = canvas;
}
//#endregion


