var scenario = "march";
var recordingDisabled = false;
var recordingChecked = false;

let camera, scene, renderer, light, fbxLoader, gltfloader, mixer;
let directionalLight;
let modelReady = false;
let animationAction;

let listener = new THREE.AudioListener();

let audioMarch = new THREE.PositionalAudio(listener);
let audioSquad = new THREE.PositionalAudio(listener);

const audioCommandSrc = 'sounds/march-command.mp3';
const audioSquadSrc = 'sounds/march.mp3';

///////
// For some mysterious reason no sound in bloody iOS!? Though the same code in bubbles - plays!?
// poor man iOS patch:
const audioMarchIOS = new Audio();
audioMarchIOS.autoplay = true;
const audioSquadIOS = new Audio();
audioSquadIOS.autoplay = true;
///////

let clips;

let players = [];
const animGroup = new THREE.AnimationObjectGroup();
let speed = 0;  // players' movement speed.n To be calculated.

let water, sun, capsule;
let sunGhost;   // point far away in the sun durection

const capsuleX = 10;
const capsuleZ = -10;
const cameraInitPos = new THREE.Vector3(3.5, 2, -13);

const groupRowPitch = 0.7;
const groupColPitch = 0.6;
const step = 1.65;     // optimal! No slips

// Attempt to make poor-man bridge model:
// Plane between two cylinders.
let groupPier = new THREE.Group();

const Pier_WIDTH = 80;
let Pier_LENGTH = 80;
const CYLINDER_RADIUS = 2;

const NSECT = 25;   // number of the sections of the Pier (length multiplier)
Pier_LENGTH *= NSECT;
const Pier_SCALE = 0.1;

const WIDTH = 1;
const LENGTH = 4 * NSECT;
const PLWIDTH = 4;

let sphere; // pointer object

// TEXTURES
let sideBaseColor;
let sideHeightMap;
let sideNormalMap;
let sideAmbientOcclusionMap;

// # 9 - 12
let PierBaseColor;
let PierHeightMap;
let PierNormalMap;
let PierAmbientOcclusionMap;

let isSquadReady = false;

// multi-slogan functionality
let iloop = 0;

// ShowRaster::rasterParams shoul be ready here.
const slogans = rasterParams.text.split('||');

let startTime = Date.now();
let timeout = 30000;	// 30 secs

let canvas = null, overlayCanvas = null, container = null;

if (iOS()) {
	//////
	//logToServer('Stupid iOS!', 'global', scenario);
	//////
}

// NB: uses global rasterParams object (ShowRaster.js). Set other properties if/as needed.
rasterParams.fontFamily = 'LED';

getRaster(rasterReady, slogans[iloop]);

// callback
// strange thing happening... rasterReady() called more than once, breaking checkAssets() logic.
// Using safety catch myAssetsCount

// ### handle multy-slogan: TBD

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


scene = new THREE.Scene();

if (!iOS())
	audioMarch.onEnded = onEnded;

function onEnded() {
	console.log("onEnded()");
	animationAction.paused = false;
	audioSquad.play();

	// ### iOS: TBD
}

const assets = 13;	// 12 + raster
let assetsCount = 0;

initAssets();

// poor-man version of AssetLoader for three.js
function initAssets() {
	console.log("march: initAssets()");

	// load audio
	/// THREE.Audio version:
	const audioLoader = new THREE.AudioLoader();
	// # 1
	audioLoader.load(audioCommandSrc, function (buffer) {
		// onLoad callback function
		audioMarch.setBuffer(buffer);

		console.log('audioLoader.load(' + audioCommandSrc + ')');	// DEBUG

		assetsCount++;
		checkAssets(assets, assetsCount, 'march-command.mp3');
	});

	// # 2
	audioLoader.load(audioSquadSrc, function (buffer) {
		audioSquad.setBuffer(buffer);
		//audioSquad.setLoop(true);
		//audioSquad.setVolume(0.5);
		//audioSquad.setRefDistance(100);

		assetsCount++;
		checkAssets(assets, assetsCount, 'march.mp3');
	});

	fbxLoader = new THREE.FBXLoader();

	// # 3
	// SWAT guy
	fbxLoader.load(
		'3D-models/swat-walking.fbx',
		(object) => {
			object.scale.set(0.01, 0.01, 0.01);
			//directionalLight.target = object;
			modelReady = true;

			clips = object.animations;

			//// turn to west
			object.rotation.y = Math.PI;

			object.name = 'player_0_0';
			object.translateY(1.1);
			players.push(object);

			animGroup.add(players[0]);
			scene.add(players[0]);

			mixer = new THREE.AnimationMixer(animGroup);
			const clip = THREE.AnimationClip.findByName(clips, 'mixamo.com');
			addMixerListeners();

			animationAction = mixer.clipAction(clip);
			animationAction.play();
			//animationAction.stop();  // player at T pose - not good
			animationAction.paused = true;  // OK

			// walk speed
			speed = step / clip.duration;

			assetsCount++;
			checkAssets(assets, assetsCount, 'swat-walking.fbx');
		},
		(xhr) => {
			//console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
		},
		(error) => {
			console.log('FBX load error:');
			console.log(error);
		}
	);

	// TEXTURE
	// # 4 Capsule
	////#// three@0.132.2 does not include Capsule geometry!? Later versions are modules and typescripts.
	// My workaround: exported capsule.glb from Unity.

	gltfloader = new THREE.GLTFLoader();

	gltfloader.load(
		'3D-models/Capsule.glb',
		(gltf) => {
			let model = gltf.scene;
			let scl = 1 / 64;
			model.scale.set(scl, scl, scl); // Adjust scale

			scene.add(model);
			capsule = model;

			assetsCount++;
			checkAssets(assets, assetsCount, 'Capsule.glb');
		},
		(xhr) => {
			//console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
		},
		(error) => {
			console.log(error);
		}
	);

	// pier
	// # 5
	const textureLoader = new THREE.TextureLoader();
	sideBaseColor = textureLoader.load("textures/Stone_Floor_006/Stone_Floor_006_basecolor.jpg", function (texture) {

		//texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		texture.offset.set(0, 0);
		//texture.repeat.set( 24, 24 );

		assetsCount++;
		checkAssets(assets, assetsCount, 'Stone_Floor_006_basecolor.jpg');
	},
		undefined,
		function (err) { console.error('Stone_Floor_006_basecolor texture:', err); }
	);

	// # 6 - 8
	sideHeightMap = textureLoader.load("textures/Stone_Floor_006/Stone_Floor_006_height.png", function (texture) { assetsCount++; checkAssets(assets, assetsCount, 'Stone_Floor_006_height.jpg'); },
		undefined, function (err) { console.error('Stone_Floor_006_height texture:', err); });
	sideNormalMap = textureLoader.load("textures/Stone_Floor_006/Stone_Floor_006_normal.jpg", function (texture) { assetsCount++; checkAssets(assets, assetsCount, 'Stone_Floor_006_normal.jpg'); },
		undefined, function (err) { console.error('Stone_Floor_006_normal:', err); });
	sideAmbientOcclusionMap = textureLoader.load("textures/Stone_Floor_006/Stone_Floor_006_ambientOcclusion.jpg", function (texture) { assetsCount++; checkAssets(assets, assetsCount, 'Stone_Floor_006_ambientOcclusion.jpg'); },
		undefined, function (err) { console.error('Stone_Floor_006_ambientOcclusion:', err); });

	// # 9 - 12
	PierBaseColor = textureLoader.load("textures/Wall_Stone_023/Wall_Stone_023_BaseColor.jpg", function (texture) { assetsCount++; checkAssets(assets, assetsCount, 'Wall_Stone_023_BaseColor.jpg'); },
		undefined, function (err) { console.error('Wall_Stone_023_BaseColor:', err); });
	PierHeightMap = textureLoader.load("textures/Wall_Stone_023/Wall_Stone_023_Height.png", function (texture) { assetsCount++; checkAssets(assets, assetsCount, 'Wall_Stone_023_Height.png'); },
		undefined, function (err) { console.error('Wall_Stone_023_Height:', err); });
	PierNormalMap = textureLoader.load("textures/Wall_Stone_023/Wall_Stone_023_Normal.jpg", function (texture) { assetsCount++; checkAssets(assets, assetsCount, 'Wall_Stone_023_Normal.jpg'); },
		undefined, function (err) { console.error('Wall_Stone_023_Normal:', err); });
	PierAmbientOcclusionMap = textureLoader.load("textures/Wall_Stone_023/Wall_Stone_023_AmbientOcclusion.jpg", function (texture) { assetsCount++; checkAssets(assets, assetsCount, 'Wall_Stone_023_AmbientOcclusion.jpg'); },
		undefined, function (err) { console.error('Wall_Stone_023_AmbientOcclusion:', err); });
}

//// helpers: checkAssets(), assetProgress(), MoW_templates.js

function addMixerListeners() {
	// properties of e: type, action and loopDelta
	mixer.addEventListener('loop', function (e) {
		// console.log('loop');

		// move player one step ahead
		animGroup._objects.forEach(function roll(item, index, arr) {
			arr[index].translateZ(step);
		});

		// if over floor edge, put back
		let zMin = 132;
		if (animGroup._objects[0].position.z < -zMin) {
			animGroup._objects.forEach(function rollback(item, index, arr) {
				arr[index].translateZ(-zMin);
			});
		}
	});

	// properties of e: type, action and direction
	// mixer.addEventListener( 'finished', function( e ) {
	//    console.log('finished');
	// } );
}

// init is called from MoW_templates() when all assets are loaded
function init() {
	console.log("march: init()");

	createCanvases();	// scenario_three_template

	// set renderer ratio to 16:9
	let size = setVideoSize(16, 9); // scenario_three_template

	// for scenario_three_template::startRecording() gameWidth/gameHeight must be defined,
	// otherwise it will be window inner size.
	gameWidth = size.W;
	gameHeight = size.H;

	camera = new THREE.PerspectiveCamera(55, gameWidth / gameHeight, 1, 20000);
	camera.position.set(cameraInitPos.x, cameraInitPos.y, cameraInitPos.z);

	// let listener = new THREE.AudioListener();
	camera.add(listener);
	camera.add(audioMarch);		// commander at the camera

	//// from Water.js
	renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(gameWidth, gameHeight);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;

	// document.body.appendChild(renderer.domElement);	// using pre-created canvas

	// INIT HEMISPHERE LIGHT: NB: players are just black withot it!
	scene.add(new THREE.AmbientLight(0xffffff)); //, 0.5));

	sun = new THREE.Vector3();

	// Water
	const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
	water = new THREE.Water(
		waterGeometry,
		{
			textureWidth: 512,
			textureHeight: 512,
			waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function (texture) {

				texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

			}),
			sunDirection: new THREE.Vector3(),
			sunColor: 0xffffff,
			waterColor: 0x001e0f,
			distortionScale: 3.7,
			fog: scene.fog !== undefined
		}
	);

	// lay flat
	water.rotation.x = - Math.PI / 2;

	scene.add(water);

	// Skybox

	const sky = new THREE.Sky();
	sky.scale.setScalar(10000);
	scene.add(sky);

	const skyUniforms = sky.material.uniforms;

	skyUniforms['turbidity'].value = 10;
	skyUniforms['rayleigh'].value = 2;
	skyUniforms['mieCoefficient'].value = 0.005;
	skyUniforms['mieDirectionalG'].value = 0.8;

	const parameters = {
		elevation: 2,
		azimuth: 180
	};

	const pmremGenerator = new THREE.PMREMGenerator(renderer);

	function updateSun() {

		const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
		const theta = THREE.MathUtils.degToRad(parameters.azimuth);

		sun.setFromSphericalCoords(1, phi, theta);

		sky.material.uniforms['sunPosition'].value.copy(sun);
		water.material.uniforms['sunDirection'].value.copy(sun).normalize();

		scene.environment = pmremGenerator.fromScene(sky).texture;

	}

	updateSun();

	sunGhost = new THREE.Vector3(sun.x * 1000, sun.y * 1000, sun.z * 1000);
	camera.lookAt(sunGhost);

	// make and add to scene poor-man version of a bridge - Pier made of plane and round borders.
	makePier();

	// float
	//const geoCapsule = new THREE.CapsuleGeometry(1, 2, 8, 16);
	//const materialCapsule = new THREE.MeshBasicMaterial({ map: textureCapsule });
	//capsule = new THREE.Mesh(geoCapsule, materialCapsule);

	capsule.position.x = capsuleX;
	capsule.position.z = capsuleZ;

	// scene.add(capsule);	// added in gltfloader

	//// pointer object - contingent camera lookAt target
	const geoSphere = new THREE.SphereGeometry(0.01, 32, 32); // (radius, widthSegments, heightSegments)
	const matSphere = new THREE.MeshBasicMaterial({ color: 0x0000ff });
	sphere = new THREE.Mesh(geoSphere, matSphere);
	//sphere.position.translateY = 2;
	//sphere.position.translateZ = -13;
	// ### no effect on sphere position!!??
	sphere.position.x = capsule.position.x;
	sphere.position.y = 2;  // works!
	sphere.position.z = capsule.position.z;

	scene.add(sphere);
}

function makePier() {
	//Makes a new cylinder with
	// - a circle of radius 5 on top (1st parameter)
	// - a circle of radius 5 on the bottom (2nd parameter)
	// - a height of 20 (3rd parameter)
	// - 32 segments around its circumference (4th parameter)

	var geoCylinder = new THREE.CylinderGeometry(CYLINDER_RADIUS, CYLINDER_RADIUS, Pier_LENGTH, 32);

	const matCylinder = new THREE.MeshPhongMaterial();

	matCylinder.map = sideBaseColor;
	matCylinder.displacementMap = sideHeightMap;
	matCylinder.normalMap = sideNormalMap;
	matCylinder.aoMap = sideAmbientOcclusionMap;

	var cylinder = new THREE.Mesh(geoCylinder, matCylinder);
	cylinder.receiveShadow = true;

	cylinder.material.map.wrapS = cylinder.material.map.wrapT =
		cylinder.material.displacementMap.wrapS = cylinder.material.displacementMap.wrapT =
		cylinder.material.normalMap.wrapS = cylinder.material.normalMap.wrapT =
		cylinder.material.aoMap.wrapS = cylinder.material.aoMap.wrapT =
		//plane.material.specularMap.wrapS = plane.material.specularMap.wrapT = 
		THREE.RepeatWrapping;

	cylinder.material.map.repeat.x =
		cylinder.material.displacementMap.repeat.x =
		cylinder.material.normalMap.repeat.x =
		cylinder.material.aoMap.repeat.x = WIDTH;

	cylinder.material.map.repeat.y =
		cylinder.material.displacementMap.repeat.y =
		cylinder.material.normalMap.repeat.y =
		cylinder.material.aoMap.repeat.y = LENGTH;

	cylinder.emissive = new THREE.Color(0xff0000);

	var cylinderClone = THREE.SkeletonUtils.clone(cylinder);

	let dx = Pier_WIDTH / 2 + CYLINDER_RADIUS;
	cylinder.translateX(dx);
	cylinderClone.translateX(-dx);

	groupPier.add(cylinder);
	groupPier.add(cylinderClone);

	// Plane
	const plane = new THREE.Mesh(new THREE.PlaneGeometry(Pier_WIDTH, Pier_LENGTH, 1), new THREE.MeshPhongMaterial({
		map: PierBaseColor,
		displacementMap: PierHeightMap,
		normalMap: PierNormalMap,
		aoMap: PierAmbientOcclusionMap
		//    ,roughnessMap: PierRoughnessMap
		//    ,specularMap : PierSpecularMap
	}));

	plane.receiveShadow = true;
	plane.material.side = THREE.DoubleSide;

	plane.material.map.wrapS = plane.material.map.wrapT =
		plane.material.displacementMap.wrapS = plane.material.displacementMap.wrapT =
		plane.material.normalMap.wrapS = plane.material.normalMap.wrapT =
		plane.material.aoMap.wrapS = plane.material.aoMap.wrapT =
		//plane.material.specularMap.wrapS = plane.material.specularMap.wrapT = 
		THREE.RepeatWrapping;

	plane.material.map.repeat.x =
		plane.material.displacementMap.repeat.x =
		plane.material.normalMap.repeat.x =
		plane.material.aoMap.repeat.x = PLWIDTH;

	plane.material.map.repeat.y =
		plane.material.displacementMap.repeat.y =
		plane.material.normalMap.repeat.y =
		plane.material.aoMap.repeat.y = LENGTH;

	groupPier.add(plane);
	groupPier.scale.set(Pier_SCALE, Pier_SCALE, Pier_SCALE);
	let PierLen = Pier_LENGTH * Pier_SCALE;
	let dz = PierLen * 0.4;
	groupPier.translateY(1);
	groupPier.translateZ(-dz);

	scene.add(groupPier);

	groupPier.rotation.x = - Math.PI / 2;
}

// players[0] should be already set in init(); clone the rest.
function makeSquad() {
	console.log('makeSquad()');

	// in ShowRaster:
	forEachRasterPoint(raster, myCallback);

	// callback({ X: pnt.X, Y: pnt.Y, iChar: i, iPoint: j, iLine: pnt.LineIndex});
	function myCallback(param) {
		let x = param.X;
		let y = -param.Y;

		if (0 == param.iChar && 0 == param.iPoint) {
			// original object
		}
		else {
			// clone
			let object = THREE.SkeletonUtils.clone(players[0]);
			object.name = String.format('player_{0}_{1}', param.iChar, param.iPoint);
			players.push(object);
			animGroup.add(object);
			scene.add(object);
		}

		// latest player in players[], define property dynamically
		players[players.length - 1].userData["X"] = x;
		players[players.length - 1].userData["Y"] = y;
	}

	console.log('players.length:', players.length);

	setColPitch();
	setRowPitch();

	// add positional audiosource
	players[0].add(audioSquad);	// THREE.Audio stuff.
}

// set players.position.x = raster y
function setRowPitch() {
	console.log('setRowPitch()');
	players.forEach((element, index, array) => {
		element.position.x = element.userData.Y * groupRowPitch;
	})
}

// set players.position.z = raster x
function setColPitch() {
	console.log('setColPitch()');
	players.forEach((element, index, array) => {
		element.position.z = element.userData.X * groupColPitch;
	})
}

// returns bool initialized
function initAllCustom() {
	console.log("initAllCustom()");

	let ready = true;

	if (undefined === canvas) {
		canvas = $('canvas')[0];
		ready = false;
	}

	if (!isSquadReady) {
		if (modelReady && players.length < 2) {
			makeSquad();

			if (!MOBILE) {
				players[0].add(audioSquad);
			}
		}

		isSquadReady = players.length === rasterCount && rasterCount > 0;
		ready = false;
	}

	// Mobile device or debug mode
	//if (MOBILE) {
	//	// 4: canplaythrough
	//	let readyState1 = audioMarch.readyState;
	//	let readyState2 = audioSquad.readyState;
	//	if (readyState1 + readyState2 < 8) {
	//		ready = false;
	//	}
	//}

	return ready;
}

function render() {
	// You MUST call entryCheck() here (when using scenario_three_template)
	if (!entryCheck())
		return;

	const delta = timer.getDelta();
	if (modelReady) // mixer.update(clock.getDelta());
	{
		mixer.update(delta);
		//for ( const mix of mixers ) mix.update( delta );
	}

	// this scenario play is done by positioning and rotation of camera.
	update(delta)

	//#region AMBIENCE
	const time = performance.now() * 0.001;

	//
	// capsule.position.y = Math.sin(time) * capsule.geometry.parameters.height / 2;
	capsule.position.y = Math.sin(time) * capsule.scale.y / 2;
	capsule.rotation.x = Math.sin(time) / 2;
	capsule.rotation.z = Math.cos(time * 1.05) / 2;
	capsule.rotation.y = Math.sin(time * 1.1);
	//

	water.material.uniforms['time'].value += 1.0 / 60.0;
	//#endregion

	renderer.render(scene, camera);
}

// scenario-specific
function exitCheckCustom() {
	console.log('exitCheck(): stop audio');

	// stop audio; NB: annoying differences between THREE.PositionalAudio and DOM AUDIO element
	// AUDIO element: pause()
	// THREE.Audio: stop(), pause()

	audioSquad.pause();
	audioMarch.pause();

	audioSquadIOS.pause();
	audioMarchIOS.pause();

	return;

	try {
		//logToServer('Positional audios pause()', arguments.callee.name, scenario);
		audioSquad.pause();
		audioMarch.pause();
	}
	catch (ex) {
		logToServer('Positional audios pause() error', arguments.callee.name, scenario);
		logToServer(ex.message, arguments.callee.name, scenario);
	}

	try {
		//logToServer('Positional audios stop()', arguments.callee.name, scenario);
		audioSquad.stop();
		audioMarch.stop();
	}
	catch (ex) {
		logToServer('Positional audios stop() error', arguments.callee.name, scenario);
		logToServer(ex.message, arguments.callee.name, scenario);
	}

	try {
		//logToServer('AUDIO elements pause()', arguments.callee.name, scenario);
		audioSquadIOS.pause();
		audioMarchIOS.pause();
	}
	catch (ex) {
		logToServer('AUDIO elements pause() error', arguments.callee.name, scenario);
		logToServer(ex.message, arguments.callee.name, scenario);
	}
}


/////
// scenario play
var angle, angle1 = 0;
var stage = 0;
var actionTime = 4;
var elapsedTime = 0;    // how much of action time has elapsed
var dir = new THREE.Vector3(); // create once an reuse it
var camHoverY = 28;  // good for any word len
var lookAtVector;
var isRotating = false;
var isMoving = false;
var isSliding = false;  // combined rotation and moving
var pointerFrom;
var pointerTo;
var isPointerMoving = false;

// pointer helper object (used in camera_turn_to())
var lookingat = new THREE.Vector3();
var pointer;
var geometry1 = new THREE.SphereGeometry(5, 32, 32);
var material1 = new THREE.MeshBasicMaterial({ color: 0xffff00 });
pointer = new THREE.Mesh(geometry1, material1);
pointer.position.x = 0.0;
pointer.position.y = 0.0;
pointer.position.z = 0.0;
// set scalle to~40 to make pointer visible (for debug)
pointer.scale.x = pointer.scale.y = pointer.scale.z = 40;
var q1, q2; // rotatinal params: rotate from q1 to q2
var v1, v2; // moving params: move from v1 to v2

var isPointerFollowing = false; // following squad
var isAligned = false;  // align camera with pointer on stage4 (hover)

var commandTime;

function update(delta) {
	// despite my attempts to synchronize workflow, tons of errors: "Cannot read properties of undefined"; check all
	if (undefined === camera)
		return;
	if (undefined === sphere)
		return;

	if (players.length < 1) {
		camera.lookAt(sunGhost);
		return;
	}

	if (isRotating || isMoving || isSliding || isPointerMoving) {
		// turn camera slowly from q1 to q2; increase stage when done
		if (elapsedTime > actionTime) {
			stage++;
			isRotating = isMoving = isSliding = isPointerMoving = false;
			return;
		}

		let f = elapsedTime / actionTime;
		if (isRotating || isSliding) {
			camera.quaternion.slerpQuaternions(q1, q2, f); // 0 < time < 1
		}
		if (isMoving || isSliding) {
			camera.position.lerpVectors(v1, v2, f);
			camera.lookAt(sphere.position);
		}

		if (isPointerMoving) {
			if (elapsedTime > actionTime) {
				stage++;
				isPointerMoving = false;
				return;
			}
			sphere.position.lerpVectors(pointerFrom, pointerTo, elapsedTime / actionTime);
			camera.lookAt(sphere.position);
		}

		elapsedTime += delta;
	}
	else if (0 === stage) {
		//// set turn paqrams to capsule
		// can't set turn to 1st guy, because it rotates through south then.

		//setRotationParams(sunGhost, capsule.position);
		setRotationParams(sphere.position);

		actionTime = 3;
		elapsedTime = 0;
		isRotating = true;
	}
	else if (1 === stage) {
		// camera looks at pointer; pointer moves to the back of the pier (4, 2, 60)
		pointerFrom = sphere.position.clone();
		pointerTo = new THREE.Vector3(4, 2, 20);
		isPointerMoving = true;
		actionTime = 3;
		elapsedTime = 0;
	}
	else if (2 === stage) {
		// start march

		if (iOS()) {
			audioMarchIOS.play();
		} else {
			audioMarch.play();
		}

		commandTime = Date.now();
		stage = 3;
	}
	else if (3 === stage) {
		//// Safety catch: march start is triggered by march-command sound finished event.
		// Natural and elegant, but not reliable. If sound fails, scenario is blocked.

		// audioMarch length: 2 secs, plus start delay...
		if (animationAction.paused && Date.now() - commandTime > 3000) {
			animationAction.paused = false;

			// if sound onEnded() failed / IOS
			if (!audioSquad.isPlaying) {
				if (iOS()) {
					audioSquadIOS.play();
				} else {
					audioSquad.play();
				}
			}
		}

		if (players[0].position.z < camera.position.z) {
			// move camera up
			v1 = camera.position.clone();
			v2 = new THREE.Vector3(-v1.x, v1.y + camHoverY, v1.z);
			isMoving = true;

			// move pointer
			pointerFrom = sphere.position.clone();
			pointerTo = new THREE.Vector3(0, v1.y, v1.z); // back to cam on pier position
			isPointerMoving = true;
			actionTime = 3;
			elapsedTime = 0;
		}
	}
	else if (4 === stage) {
		if (!isAligned) {
			sphere.position.z = camera.position.z;
			isAligned = true;
		}

		// when last guy passes, move cam down; pointer moves with squad
		let last = players[players.length - 1].position;
		if (last.z < camera.position.z) {
			if (isPointerFollowing) {
				sphere.position.z -= speed * delta;
			}
			else {
				// works once
				sphere.position.x = 0;
				sphere.position.y = last.y;
				sphere.position.z = last.z;

				// move camera
				v1 = camera.position.clone();
				v2 = new THREE.Vector3(0, 2, v1.z);
				isMoving = true;

				// move pointer    
				pointerFrom = sphere.position.clone();
				pointerTo = last; // back to cam on pier position
				isPointerMoving = true;
				actionTime = 2;
				elapsedTime = 0;

				isPointerFollowing = true;

				// scenario_three_template:
				messageOnCanvas(overlayCanvas, rasterParams.message, { strokeColor: 'white' });
				// messageOnCanvas(overlayCanvas, myMessage, { color: 'blue', strokeColor: 'blue' });
			}
		}
	}
	else if (5 === stage) {
		sphere.position.z -= speed * delta;
		camera.lookAt(sphere.position);

		if (players[players.length - 1].position.z < camera.position.z - 8 * step) {
			gameOver = 0;	// right away
		}
	}
}


function setRotationParams(vectorTo) {
	// where camera is looking now
	lookAtVector = new THREE.Vector3(0, 0, -1);
	lookAtVector.applyQuaternion(camera.quaternion);

	q1 = new THREE.Quaternion().copy(camera.quaternion);

	camera.lookAt(vectorTo);
	q2 = new THREE.Quaternion().copy(camera.quaternion);

	// look back
	camera.lookAt(lookAtVector);
}

function setSlidingParams(posTo, lookTo) {
	// memorize camera positions
	v1 = camera.position.clone();
	v2 = posTo;

	// memorize rotation
	// where camera is looking now
	lookAtVector = new THREE.Vector3(0, 0, -1);
	lookAtVector.applyQuaternion(camera.quaternion);

	camera.position = posTo;
	camera.lookAt(lookTo);
	q2 = new THREE.Quaternion().copy(camera.quaternion);

	// move back
	camera.position = v1;

	// look back
	camera.lookAt(lookAtVector);
}


////
// Check if format is implemented
// String.format('{0} is dead, but {1} is alive! {0} {2}', 'ASP', 'ASP.NET');
if (!String.format) {
	String.format = function (format) {
		var args = Array.prototype.slice.call(arguments, 1);
		return format.replace(/{(\d+)}/g, function (match, number) {
			return typeof args[number] != 'undefined'
				? args[number]
				: match
				;
		});
	};
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

	// canvas required for RTC
	if (undefined === canvas) {
		console.log('canvas undefined, exiting');
		return false;
	}

	// sound based on THREE.Listener will be handled in scenario_three_template::setMobileRecorder()
	if (undefined === audioMarch) {
		console.log('sound undefined, exiting');
		return false;
	}

	return true;
}
// called from scenario_three_template:startShow()
function startShowCustom() {
	console.log('startShowCustom(): void');

	if (iOS()) {
		audioMarchIOS.src = audioCommandSrc;
		audioMarchIOS.pause();
		audioSquadIOS.src = audioSquadSrc;
		audioSquadIOS.pause();
	}
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