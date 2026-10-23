// ### Note my stupid frameework (easy to loose the track):
// Scenario must call MoW_templates::checkAssets(assets, assetsCount, msg)
// which calls MoW_templates::showOverlay(message), which creates overlay and startButton
// Otherwise scenario must call showOverlay() directly.

var scenario = "honey-bees";
var recordingDisabled = false;
var recordingChecked = false;

//#region CONFIG
//// Table
const tblpath = 'models/table/';
const tabletopY = 2.444;

// sounds
const beeSoundSrc = 'sounds/buzzing-bee-1-107820.mp3';
const swarmSoundSrc = 'sounds/beehive-65477.mp3';

// Loaders
const pathpot = 'models/pot_scan_01.glb';
const pathtxt = 'textures/honey1.png';
const pathbee = 'models/bee.glb';

let beescale = 0.007;
let beescalefactor = 3;	// up/down animation scale is much smaller!?

// raycast
let X0 = 1;		// raycast origin
let Y0 = 0.35;
let H = 0.2;		// prod tangent
let dH = 0.05;

let sizeDecal = new THREE.Vector3(0.4, 0.2, 0.2);

//// BANNER
const BANNER_WIDTH = 3.2;
const BANNER_HEIGHT = 2;
const bannerCenterX = 0.35;

//#endregion CONFIG

let scene, camera, renderer;
// renderer.setSize() => init()

//// setting scene is badly asynchronous; check-and-set in the loop
//let isJarSet = false;
let jar = null;		// Group/Object3D
let table = null;

// Load textures
const textureLoader = new THREE.TextureLoader();
const lambert6SGAlbedo = textureLoader.load(tblpath + 'lambert6SG_albedo.jpg');
const lambert6SGNormal = textureLoader.load(tblpath + 'lambert6SG_normal.png');
const lambert6SGAO = textureLoader.load(tblpath + 'lambert6SG_AO.jpg');

const lambert7SGAlbedo = textureLoader.load(tblpath + 'lambert7SG_albedo.jpg');
const lambert7SGNormal = textureLoader.load(tblpath + 'lambert7SG_normal.png');

// Create materials
const mattable = new THREE.MeshLambertMaterial({
	map: lambert6SGAlbedo,
	normalMap: lambert6SGNormal,
});

const matcloth = new THREE.MeshLambertMaterial({
	map: lambert7SGAlbedo,
	normalMap: lambert7SGNormal,
	aoMap: lambert6SGAO,
});

// audio
// create an AudioListener and add it to the camera
let listener = new THREE.AudioListener();

const audioLoader = new THREE.AudioLoader();

let audioBee = new THREE.PositionalAudio(listener);
let audioSwarm = new THREE.Audio(listener);

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

const gltfloader = new THREE.GLTFLoader();

let decal = null;	// mesh
let decalTexture;
let decalMaterial;

let meshPot;

let bee = null;
let animations = null;
//let actionIdle, actionHover, actionUpDown;
let mixer = null;
let animationManager;

//#region scenario_three_template

let assets = 7;	// assets load counters
let assetsCount = 0;

initAssets();

// poor-man version of AssetLoader for three.js
function initAssets() {
	console.log(scenario, ': initAssets(', assets, ')');

	// 1: raster; 2: table; 3: jar; 4: decal texture; 5: bee 6, 7: sounds

	// decal
	textureLoader.load(
		pathtxt,
		// onLoad callback
		function (texture) {
			decalTexture = texture;
			decalMaterial = new THREE.MeshPhongMaterial({
				map: texture,
				transparent: true,
				depthTest: true,
				depthWrite: false,
				polygonOffset: true,
				polygonOffsetFactor: -4, // Adjust to prevent z-fighting
			});

			checkAssets(assets, ++assetsCount, 'decal texture');
		},

		// onProgress callback currently not supported
		undefined,

		// onError callback
		function (err) {
			console.error('Error loading texture: ' + pathtxt);
		}
	);

	// jar
	gltfloader.load(
	pathpot,
		(gltf) => {
			jar = gltf.scene;
			jar.scale.set(1, 0.75, 1); // Adjust scale

			// jar is Group (or Object3D). Extract mesh.
			jar.traverse(function (child) {
				if (child.isMesh) {
					meshPot = child;
				}
			});

			// scene.add(jar); => init()

			checkAssets(assets, ++assetsCount, 'jar');
		},
		(xhr) => {
			//console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
		},
		(error) => {
			console.log(error);
		}
	);

	// bee
	gltfloader.load(
		pathbee,
		(gltf) => {
			bee = gltf.scene;
			bee.scale.set(beescale, beescale, beescale); // Adjust scale
			bee.position.y = tabletopY;

			// Access the animations
			animations = gltf.animations;

			// Check available animations
			console.log('Available animations:', animations.map(anim => anim.name));

			// Create an AnimationMixer
			mixer = new THREE.AnimationMixer(bee);
			animationManager = new AnimationManager(mixer, gltf.animations);

			//scene.add(bee);

			checkAssets(assets, ++assetsCount, 'bee');
		},
		(xhr) => {
			//console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
		},
		(error) => {
			console.log(error);
		}
	);

	loadTable();

	//Load a sound and set it as the Audio object's buffer
	audioLoader.load(beeSoundSrc, function (buffer) {
		audioBee.setBuffer(buffer);
		audioBee.setLoop(true);

		assetsCount++;
		checkAssets(assets, assetsCount, 'audioBee');
	});

	audioLoader.load(swarmSoundSrc, function (buffer) {
		audioSwarm.setBuffer(buffer);
		audioSwarm.setLoop(true);
		audioSwarm.setVolume(0.5);

		assetsCount++;
		checkAssets(assets, assetsCount, 'audioSwarm');
	});
}

// Called from scenario_three_templates::initAll()
function initAllCustom() {
	console.log(scenario, ": initAllCustom(placeholder)");

	if (DEBUG) {
		const gfAxesHelper = new GfAxesHelper();
		gfAxesHelper.addToScene(scene);
	}

	return true;
}

// called from MoW_templates::checkAssets()
let trinkets;
let bannerPos = new THREE.Vector3(bannerCenterX, tabletopY, 0);
let canvas = null, overlayCanvas = null, container = null;
function init() {
	console.log(scenario, ": init()");

	createCanvases();	// scenario_three_template

	//let colorMG = 0xe0e0e0;	// milky-gray: 0xe0e0e0
	//let colorMB = 0x113755;	// Deep, muted blue
	//let colorPB = 0xb0d5f5; // Pale blue, transition from day

	let colorDB = 0x364092; // dark blue

	scene = new THREE.Scene();
	scene.background = new THREE.Color(colorDB);
	scene.fog = new THREE.Fog(colorDB, 1, 20);

	renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
	// Lighting
	const light = new THREE.DirectionalLight(0xffffff, 1);
	light.position.set(1, 1, 1).normalize();
	scene.add(light);

	const ambientLight = new THREE.AmbientLight(0xffffff);
	scene.add(ambientLight);

	scene.add(arraycast);

	// set renderer ratio to 16:9
	let size = setVideoSize(16, 9); // scenario_three_template

	// for scenario_three_template::startRecording() gameWidth/gameHeight must be defined,
	// otherwise it will be window inner size.
	gameWidth = size.W;
	gameHeight = size.H;

	camera = new THREE.PerspectiveCamera(60 /* 75 */, gameWidth / gameHeight, 0.1, 1000);

	//renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setSize(gameWidth, gameHeight);

	// document.body.appendChild(renderer.domElement);	// REMOVE wne using createCanvases()

	//// DEBUG
	scene.add(arprod);
	scene.add(arnormal);
	////

	camera.position.set(0.4, 4, 2.7);
	camera.add(listener);

	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;

	// Force matrix updates
	jar.updateMatrixWorld(true);
	findHitpoint(); // Your decal application function

	jar.rotation.y = -Math.PI / 4;
	jar.position.set(-1.5, tabletopY, -0.8);
	meshPot.material.color = new THREE.Color(0xcb6843);	// terracota

	controls.target.copy(bee.position);

	// spent stupid amount of time to figure out why everything went south!
	// bee.clone() fails if audio is attached. Attach it after creating trinkets (clones).
	//bee.add(audioBee);	// positionalAudio

	scene.add(jar);
	scene.add(bee);
	scene.add(table);

	///////////
	animMgrIdle1 = new AnimationManager(mixerIdle1, animations);
	animMgrIdle2 = new AnimationManager(mixerIdle2, animations);
	animMgrSwarm1 = new AnimationManager(mixerSwarm1, animations);
	animMgrSwarm2 = new AnimationManager(mixerSwarm2, animations);

	///////////
	// Huge disappointment! AnimatioObjectsGroup methods add() and remove() do not work as expected.
	// Moving trinkets animGroupHover => animGroupIdle: OK; moving back - add() does not work.
	// My workaround: add 3rd group to make sure there is only one transfer between groups.

	animMgrFly1 = new AnimationManager(mixerFly1, animations);
	animMgrFly2 = new AnimationManager(mixerFly2, animations);
	///////////

	let pos1 = new THREE.Vector3(bannerCenterX, tabletopY + 0.01, 0);	// text
	let pos2 = new THREE.Vector3(bannerCenterX, tabletopY + 0.02, 0);	// resized

	// create, init and position trinkets.
	initTrinkets(bannerPos);

	// DEBUG
	// messageOnCanvas(overlayCanvas, 'Testing one-two-three');

	//// STUPID! Chrome, Edge do not debug, here it does not stop on 'debugger'
	let mydebug = checkDebug();	// MoW_template.js
	if (mydebug) {
		// ShowRaster.js quad visualization (for debug)
		// showQuad(W, H, pos, rotX, rotY, rotZ /* radians 'XYZ' */, color, name)

		// quadBanner - the area assigned for banner (trinkets' targets).
		const quadBanner = showQuad(BANNER_WIDTH, BANNER_HEIGHT, bannerPos, -Math.PI / 2, 0, 0, 0xffff00, 'quadBanner');
		scene.add(quadBanner);

		// quadText - max quad with the same aspect ratio as raster, that may be enclosed in quadBanner
		const quadText = showQuad(rcText.w, rcText.h, pos1, -Math.PI / 2, 0, 0, 0x0000ff, 'quadText');
		scene.add(quadText);

		// if quadText was rescaled, show it
		if (bannerResizedW > 0) {
			const quadSized = showQuad(bannerResizedW, bannerResizedH, pos2, -Math.PI / 2, 0, 0, 0xff0000, 'quadSized');
			scene.add(quadSized);
		}
	}
	else {
		// hide bees under the table
		for (let i = 0; i < trinkets.length; i++)
			trinkets[i].position.y -= 0.3;
	}
}

// create, init and position trinkets. Set swarm params: a*sin(b*t)
const AxMin = 0.4;
const AxMax = 2;
const AyMin = 0.4;
const AyMax = 2;
const AzMin = 0.4;
const AzMax = 2;

const BxMin = 0.5;
const BxMax = 2;
const ByMin = 0.5;
const ByMax = 2;
const BzMin = 0.5;
const BzMax = 2;

const swarmPivot = new THREE.Vector3(0, 4, -1);

// create and init trinkets
function initTrinkets(pos) {
	console.log(scenario, ": initTrinkets()");

	// ShowRaster::createBanner(left, right, top, bottom, objToClone, density);
	// NB: also creates and returns trinkets positioned on Z == 0 plane (raster.x, 0, raster.y)
	// params:
	trinketD = 0.2;	// trinket diameter in current scale. Defined in ShowRaster
	itemSizeMax = 0.25;
	itemSizeMin = 0.09;	// 0.12;
	let density = 1.6;	//  1.5;
	trinkets = createBanner(-BANNER_WIDTH / 2, BANNER_WIDTH / 2, -BANNER_HEIGHT / 2, BANNER_HEIGHT / 2, bee, density);
	shuffle(trinkets);

	// update trinket.target to banner position in the scene (might need add rotation too).
	//// remove overflow trinkets (bees not fitting on the table)
	// x: 2.35
	for (let i = 0; i < trinkets.length; i++) {
		let trinket = trinkets[i];
		if (Math.abs(trinket.position.x + bannerCenterX) < 2.35) {
			trinket.position.add(pos);
			trinket.userData.target.copy(trinket.position);

			// rotation speed when idling
			trinket.userData.rotSpeed = random(-0.5, 0.5);

			// individual swarm parameters amp*sin(arg*t)
			trinket.userData.amp = new THREE.Vector3(random(AxMin, AxMax), random(AyMin, AyMax), random(AzMin, AzMax));
			trinket.userData.arg = new THREE.Vector3(random(BxMin, BxMax), random(ByMin, ByMax), random(BzMin, BzMax));
		}
		else {
			scene.remove(trinket);
			trinket.visible = false;
		}
	}
}

// helpers
// function assetProgress(progress, total);		=> MoW_template.js
// function checkAssets(assets, assetsCount, msg);

const clock = new THREE.Clock();
// called from scenario_three_template::animate()
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
	elapsedTime += delta;
	elapsedGameTime += delta;	// read-only

	update(delta);

	renderer.render(scene, camera);
}

let q1, q2; // rotatinal params: rotate (camera) from q1 to q2
let p1, p2; // moving params: move (camera) from p1 to p2
let t1, t2;	// target move params: (camera look at) from t1 to t2

let isRotating = false;	// q1 - q2
let isMoving = false;	// p1 - p2
let isTurning = false; t1 - t2

let camtarget = new THREE.Vector3(0, 0, 0);

var elapsedTime = 0;		// read/write var, used for scenario stages
let elapsedGameTime = 0;	// game-wide read-only
let actionTime = 0;	// time to move, rotate...
let pauseTime = 3;	// pause before starting the motion

let stage = 0;
function update(delta) {
	// animation
	if (mixer) mixer.update(delta * 2);

	// de-synchronize mixers
	if (mixerIdle1) mixerIdle1.update(delta);
	if (mixerIdle2) mixerIdle2.update(delta * 1.321);
	if (mixerSwarm1) mixerSwarm1.update(delta * 1.71);
	if (mixerSwarm2) mixerSwarm2.update(delta * 2);

	if (mixerFly1) mixerFly1.update(delta * 1.71);
	if (mixerFly2) mixerFly2.update(delta * 2);

	controls.update();	// DEBUG

	updateStage(delta);
	updateTrinkets(delta);

	camera.lookAt(camtarget);
	elapsedTime += delta;
	elapsedGameTime += delta;
}

//#endregion scenario_three_template

// How to distinguish the phase for the trinket in groups:
// Swarm: startPos undefined
// Target: startPos defined
// Jar: startPos is null
function updateTrinkets(delta) {
	///// ANIMATE Idling:
	animGroupIdle1._objects.forEach((element) => element.rotateY(delta * element.userData.rotSpeed));
	animGroupIdle2._objects.forEach((element) => element.rotateY(delta * element.userData.rotSpeed));

	// ANIMATE Swarm
	animGroupSwarm1._objects.forEach((element) => updateSwarm(element));
	animGroupSwarm2._objects.forEach((element) => updateSwarm(element));

	// ANIMATE Fly
	animGroupFly1._objects.forEach((element) => updateFly(element, animGroupFly1));
	animGroupFly2._objects.forEach((element) => updateFly(element, animGroupFly2));
}

// Swarm: startPos undefined
// Target: startPos defined (in updateStage() )
function updateSwarm(trinket) {
	let f = (elapsedGameTime - trinket.userData.startTime) / actionTime;

	// swarm
	if (undefined == trinket.userData.startPos) {
		trinket.position.x = swarmPivot.x + trinket.userData.amp.x * Math.sin(elapsedTime * trinket.userData.arg.x);
		trinket.position.y = swarmPivot.y + trinket.userData.amp.y * Math.sin(elapsedTime * trinket.userData.arg.y);
		trinket.position.z = swarmPivot.z + trinket.userData.amp.z * Math.sin(elapsedTime * trinket.userData.arg.z);
	}
	else {
		// alert('fly to target');
		trinket.position.lerpVectors(trinket.userData.startPos, trinket.userData.target, f);
		if (f >= 1) {
			// at target, move to idle group
			trinket.position.copy(trinket.userData.target);	// make sure its home

			swarmToIdle(trinket);
		}
	}
}

function updateFly(trinket, animGroup) {
	let f = (elapsedGameTime - trinket.userData.startTime) / actionTime;

	trinket.position.lerpVectors(trinket.userData.target, jarTop, f);
	// add 'hump', make it different for each bee (by its IDX)
	let k = 1 + 3 * trinket.userData.idx / trinkets.length;	// k: 2 to 3
	trinket.position.y += k * f * (1 - f);

	////// add 'erratic' component
	let df = 0.4;
	let dx = df * f * (1 - f) * trinket.userData.amp.x * Math.sin(elapsedTime * trinket.userData.arg.x);
	let dy = df * f * (1 - f) * trinket.userData.amp.y * Math.sin(elapsedTime * trinket.userData.arg.y);
	let dz = df * f * (1 - f) * trinket.userData.amp.z * Math.sin(elapsedTime * trinket.userData.arg.z);

	trinket.position.x += dx;
	trinket.position.y += dy;
	trinket.position.z += dz;
	//////
	// restrict bee motion at the jar - keep close to jar vertical
	let d = 0.15;
	if (f > 0.9) {
		trinket.position.x = THREE.MathUtils.clamp(trinket.position.x, jarTop.x - d, jarTop.x + d);
		trinket.position.z = THREE.MathUtils.clamp(trinket.position.z, jarTop.z - d, jarTop.z + d);
	}
	//////

	// when bee is at the bottom of the jar or went through the jar:
	if (trinket.position.y < tabletopY || trinket.position.x < -1.7) {
		animGroup.remove(trinket);
		animGroup.uncache(trinket);
		scene.remove(trinket);
	}

	// move to updateStage
	//if (animGroupFly1._objects + animGroupFly2._objects.length == 0) {
	//	gameOver = true;
	//	//alert('gameOver!');
	//}
}

// bee motion params
pauseTime = 30;	// time to look at the bee
let beeRotSpeed = 0.35;
let bpos0 = new THREE.Vector3();	// initial
let bpos1 = new THREE.Vector3(-1.3, 3, -0.8);	// jar
let campos0 = new THREE.Vector3();	// initial
let campos1 = new THREE.Vector3();	// lower observation pos
let campos2 = new THREE.Vector3(bannerCenterX, 4.5, 0.5);	// upper observation pos (observe text)
let campos3 = new THREE.Vector3(0.25, 3.8, 1.7);	// observe bees flying to jar
let stage1factor = 0.5;	// 0.6;	// part of distance for camera to travel in stage 1
let jarTop = new THREE.Vector3(-1.5, 3, -0.8);	// jar top center

// rotate around jar
// Define the axis of rotation (a direction vector)
const axis = new THREE.Vector3(0, 1, 0).normalize(); // Normalize to ensure it's a unit vector

// Define a point on the axis (optional, if the axis doesn't pass through the origin)
let pointOnAxis;
function updateStage(delta) {
	// console.log('updateStage(' + stage + ')');

	let f = 1;	// lerp factor used in stages

	// set params for the next movement
	switch (stage) {
		// bee animation on
		case 0:
			console.log(scenario, 'updateStage(' + stage + ')');
			camtarget = bee.position;
			bpos0.copy(bee.position);
			switchAnimation(animationManager, '_bee_idle', 0);

			campos0.copy(camera.position);	// start
			campos1.lerpVectors(campos0, bpos0, stage1factor);
			campos1.y += 0.2;	// up a little

			elapsedTime = 0;
			stage++;
			break;

		// look at bee slowly turning; meanwhile camera moves closer to bee.
		case 1:
			bee.rotateY(-delta * beeRotSpeed);

			// move camera to target campos1 (bee.rotation.y: 0 to -1.5)
			f = bee.rotation.y / (-1.5);
			camera.position.lerpVectors(campos0, campos1, f);

			if (bee.rotation.y < -1.5) {
				console.log(scenario, 'updateStage(' + stage + ')');
				switchAnimation(animationManager, '_bee_hover', 0);
				audioBee.play();

				///// DEBUG
				//let clone = THREE.SkeletonUtils.clone(bee);
				//clone.position.copy(bee.position);
				//clone.position.x += 0.5;
				/////

				elapsedTime = 0;
				actionTime = 3;	// next action (flight) duration
				stage++;
			}

			break;

		// bee flies to jar
		case 2:
			if (elapsedTime < actionTime) {
				let f = elapsedTime / actionTime;
				bee.position.lerpVectors(bpos0, bpos1, f);
				// add 'hump'
				bee.position.y += 2 * f * (1 - f);
			}
			else {
				console.log(scenario, 'updateStage(' + stage + ')');
				bee.position.copy(bpos1);
				bee.rotation.y = -0.05;
				switchAnimation(animationManager, '_bee_idle', 0);
				audioBee.pause();
				camtarget = bpos1;

				// calc rotation pivot
				pointOnAxis = new THREE.Vector3();
				pointOnAxis.copy(jar.position);
				pointOnAxis.y = bpos1.y;

				elapsedTime = 0;
				actionTime = 3;
				stage++;
			}

			break;

		// rotate bee around jar axis (to emulate it creeping on the rim)
		case 3:
			if (bee.position.x <= jar.position.x) {
				console.log(scenario, 'updateStage(' + stage + ')');
				bee.lookAt(camera.position);

				//// Get ready for next stage: fly. Calc next position - close to camera
				bpos0.copy(bee.position);
				bpos1.lerpVectors(bpos0, camera.position, 0.9);

				// rotate hover position ~30 to the left of camera.
				// axis - the same; pointOnAxis - camera.position
				pointOnAxis.copy(camera.position);
				let angle = Math.PI / 5;

				bpos1 = rotatePointAroundVectorQuaternion(bpos1, camera.position, axis, angle);
				////

				switchAnimation(animationManager, '_bee_hover', 0);	// fly!
				audioBee.play();

				elapsedTime = 0;
				actionTime = 3;
				stage++;
			}

			let dAngle = -beeRotSpeed * delta;
			const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, dAngle);
			bee.position.sub(pointOnAxis);
			bee.position.applyQuaternion(quaternion);
			bee.position.add(pointOnAxis);
			bee.quaternion.multiplyQuaternions(quaternion, bee.quaternion);

			break;

		// flies to camera
		case 4:
			if (elapsedTime > actionTime) {
				console.log(scenario, 'updateStage(' + stage + ')');
				bee.lookAt(camera.position);

				// set up next stage
				bpos0.copy(bpos1);
				let angle = -Math.PI*0.4;

				bpos1 = rotatePointAroundVectorQuaternion(bpos1, camera.position, axis, angle);

				elapsedTime = 0;
				actionTime = 3;
				pauseTime = 3;
				stage++;
				return;
			}

			// fly to camera
			f = elapsedTime / actionTime;
			bee.position.lerpVectors(bpos0, bpos1, f);
			// add 'hump'
			bee.position.y += 2 * f * (1 - f);

			break;

		// flies to right of the camera
		case 5:
			if (elapsedTime < pauseTime)
				return;

			if (elapsedTime > pauseTime + actionTime) {
				console.log(scenario, 'updateStage(' + stage + ')');
				bee.position.copy(bpos1);	// final pos at this stage

				// set up next stage
				bpos0 = bpos1;
				bpos1 = new THREE.Vector3(0, 6, -3);

				elapsedTime = 0;
				stage++;
				return;
			}

			// fly to right of the camera
			f = (elapsedTime - pauseTime) / actionTime;
			bee.position.lerpVectors(bpos0, bpos1, f);

			// add 'hump': away and up
			let bump = f * (1 - f);
			let dir = new THREE.Vector3();
			dir.subVectors(bee.position, camera.position);	// direction to bee

			dir.normalize();
			dir.addScaledVector(dir, bump/2);

			bee.position.add(dir);		// away
			bee.position.y += 2 * bump;	// up

			bee.lookAt(camera.position);

			break;

		// bee flies up
		case 6:
			if (elapsedTime < pauseTime)
				return;

			if (elapsedTime > pauseTime + actionTime) {
				console.log(scenario, 'updateStage(' + stage + ')');

				audioSwarm.play();

				elapsedTime = 0;
				actionTime = 4;
				stage++;
				return;
			}

			// fly up
			f = (elapsedTime - pauseTime) / actionTime;
			bee.position.lerpVectors(bpos0, bpos1, f);
			camtarget = bpos1;	//  bee.position;
			break;

		// bee swarm
		case 7:
			if (elapsedTime > actionTime) {
				console.log(scenario, 'updateStage(' + stage + ')');

				elapsedTime = 0;
				actionTime = 3;
				stage++;
			}

			if (animGroupSwarm1._objects.length == 0) {
				// INIT: populate swarm groups, turn on animations
				for (let i = 0; i < trinkets.length; i++) {
					let trinket = trinkets[i];
					if (!trinket.visible)
						continue;

					// assign to animation groups
					if (trinket.userData.idx % 2 == 0)
						animGroupSwarm2.add(trinket);	// even
					else
						animGroupSwarm1.add(trinket);	// odd
				}

				switchAnimation(animMgrIdle1, '_bee_idle', 0);
				switchAnimation(animMgrIdle2, '_bee_idle', 0);
				switchAnimation(animMgrSwarm1, '_bee_hover', 0);
				switchAnimation(animMgrSwarm2, '_bee_hover', 0);

				switchAnimation(animMgrFly1, '_bee_hover', 0);
				switchAnimation(animMgrFly2, '_bee_hover', 0);

				bee.visible = false;
			}
			break;

		// (bees start flying to targets) cam turns down
		case 8:
			// while there are swarming bees (in swarm groups)
			f = elapsedTime / actionTime;
			camtarget.lerpVectors(bpos1, bannerPos, f);

			{ // block to make vars local
				let count = Math.floor(lerp(trinkets.length, 0, f));

				// set part of bees to head to targets. count: where in the array targeted bees start
				let cnt = Math.floor(count / 2);	// 1/2 for each of 2 groups
				if (cnt < 0) cnt = 0;
				for (i = cnt; i < animGroupSwarm1._objects.length; i++) {
					// returns true if set, false if it already was set before:
					if (!setTrinketTargetPhase(animGroupSwarm1._objects[i]))
						break;
				}
				for (i = cnt; i < animGroupSwarm2._objects.length; i++) {
					if (!setTrinketTargetPhase(animGroupSwarm2._objects[i]))
						break;
				}

				if (count < 0) {
					console.log(scenario, 'updateStage(' + stage + ') count:', count);

					elapsedTime = 0;
					actionTime = 3;
					stage++;

					break;	// don't go further with count < 0
				}
			}

			// those in swarm groups still swarm, others fly to targets: updateTrinkets()
			break;

		// all bees fly to targets
		case 9:
			// while there are flying bees (in hover groups)
			if (animGroupSwarm1._objects.length + animGroupSwarm2._objects.length == 0) {
				console.log(scenario, 'updateStage(' + stage + ')');

				audioSwarm.pause();

				elapsedTime = 0;
				actionTime = 3;
				stage++;
			}

			// for some unknown to me reason sometimes there are couple of lost trinkets swarming endlessly.
			// safety catch:
			if (elapsedTime > actionTime * 2) {
				alert('stage 9 safety catch!');
			}
			break;

		// camera up to observation point (watch text)
		case 10:
			if (elapsedTime < actionTime) {
				let f = elapsedTime / actionTime;
				camera.position.lerpVectors(campos1, campos2, f);
			}
			else {
				elapsedTime = 0;
				actionTime = 3;
				pauseTime = 2;
				stage++;
			}
			break;

		// camera waits at observation point and goes down
		case 11:
			if (elapsedTime < pauseTime)
				break;

			if (elapsedTime - pauseTime < actionTime) {
				let f = (elapsedTime - pauseTime) / actionTime;
				camera.position.lerpVectors(campos2, campos1, f);
			}
			else {
				elapsedTime = 0;
				stage++;
			}

			break;

		// first 2 fly to the jar
		// NB: switch items starting from the end of the group
		case 12:
			// block to avoid 'idx re-declaration' error
			{
				let idx = trinkets.length - 1;
				let trinket = trinkets[idx];
				//console.log('case 12: idx:', idx, 'trinket:', trinket.name);
				idleToFly(trinket);
			}

			pauseTime = 2;
			elapsedTime = 0;
			stage++;
			break;

		// 2nd one flies to jar
		case 13:
			// move camera to bee fly to jar observation pos
			if (elapsedTime < pauseTime) {
				let f = elapsedTime / pauseTime;
				camera.position.lerpVectors(campos1, campos3, f);
				break;
			}

			{
				let idx = trinkets.length - 2;
				idleToFly(trinkets[idx]);
			}

			audioSwarm.play();

			actionTime = 6;
			elapsedTime = 0;
			stage++;

			// scenario_three_template:
			messageOnCanvas(overlayCanvas, rasterParams.message, { color: 'yellow', strokeColor: 'yellow' });

			break;

		// all bees start flying to jar
		case 14:
			// while there are idling bees
			f = elapsedTime / actionTime;

			{ // block to make vars local
				let count = Math.floor(lerp(trinkets.length, 0, f));

				// set part of bees to head to jar. count: where in the array targeted bees start
				let cnt = Math.floor(count / 2);	// 1/2 for each of 2 groups
				if (cnt < 0) cnt = 0;

				for (i = cnt; i < animGroupIdle1._objects.length; i++) {
					// returns true if found and set, false if it already was set before:
					if (!idleToFly(animGroupIdle1._objects[i]))
						break;
				}
				for (i = cnt; i < animGroupIdle2._objects.length; i++) {
					if (!idleToFly(animGroupIdle2._objects[i]))
						break;
				}

				if (count < 0) {
					console.log(scenario, 'updateStage(' + stage + ') count:', count);

					elapsedTime = 0;
					actionTime = 3;
					stage++;

					break;	// don't go further with count < 0
				}
			}

			break;

		// wait for all bees in a jar
		case 15:
			if (animGroupFly1._objects + animGroupFly2._objects.length == 0) {
				audioSwarm.stop();
				audioSwarm.playbackRate = 0.5;
				audioSwarm.play();

				pauseTime = 4;
				elapsedTime = 0;
				stage++;
			}
			break;
		// bees hum in a jar
		case 16:
			if (elapsedTime > pauseTime)
				gameOver = 0;	// right away

			break;
	}
}

// swarm motion params
let ax = 0;
let ay = 0;
let az = 0;

let bx = 0;
let by = 0;
let bz = 0;
function beeSwarm(t) {
	//for (let i = 0; i < trinkets.length; i++) {
	//	let bee = trinkets[i];

	//	if (!bee.visible)
	//		continue;
	//}

	// a*sin(b*t)
	// ax == 0: means renew params
	if (0 == ax) {
		ax = random(0.5, 4);
		ay = random(0.5, 4);
		az = random(0.1, 1);

		bx = random(0.5, 2);
		by = random(0.5, 2);
		bz = random(0.5, 2);
	}

	let x = ax * Math.sin(bx * t);
	let y = ay * Math.sin(by * t);
	let z = az * Math.sin(bz * t);

	//bee.position.set(bpos1.x + x, bpos1.y + y, bpos1.z + z);
	bee.position.set(0 + x, 4 + y, 1 + z);
}

function setTrinketTargetPhase(trinket) {
	if (undefined != trinket.userData.startPos)
		return false;

	trinket.userData.startPos = new THREE.Vector3();
	trinket.userData.startPos.copy(trinket.position);
	trinket.userData.startTime = elapsedGameTime;

	return true;
}

// NB: switch items starting from the end of the group
function idleToSwarm(trinket) {
	// DEBUG
	console.log('idleToSwarm()', trinket.name, trinket.userData.idx);

	console.log('animGroupIdle1:', animGroupIdle1._objects.length, animGroupIdle1.nCachedObjects_);
	console.log('animGroupIdle2:', animGroupIdle2._objects.length, animGroupIdle2.nCachedObjects_);
	console.log('animGroupSwarm1:', animGroupSwarm1._objects.length, animGroupSwarm1.nCachedObjects_);
	console.log('animGroupSwarm2:', animGroupSwarm2._objects.length, animGroupSwarm2.nCachedObjects_);

	// find it in idle groups. (find returns item or undefined)
	if (animGroupIdle1._objects.find(({ name }) => name === trinket.name)) {
		console.log('found in animGroupIdle1');
		animGroupIdle1.remove(trinket);
		animGroupIdle1.uncache(trinket);
		//animGroupSwarm1.uncache(trinket);
		animGroupSwarm1.add(trinket);
	}
	else if (animGroupIdle2._objects.find(({ name }) => name === trinket.name)) {
		console.log('found in animGroupIdle2');
		animGroupIdle2.remove(trinket);
		animGroupIdle2.uncache(trinket);
		//animGroupSwarm2.uncache(trinket);
		animGroupSwarm2.add(trinket);
	}
	else
		console.log('Item not found in Idle animation groups');

	console.log('animGroupIdle1:', animGroupIdle1._objects.length, animGroupIdle1.nCachedObjects_);
	console.log('animGroupIdle2:', animGroupIdle2._objects.length, animGroupIdle2.nCachedObjects_);
	console.log('animGroupSwarm1:', animGroupSwarm1._objects.length, animGroupSwarm1.nCachedObjects_);
	console.log('animGroupSwarm2:', animGroupSwarm2._objects.length, animGroupSwarm2.nCachedObjects_);
}

function swarmToIdle(trinket) {
	// DEBUG
	//console.log('SwarmToIdle()', trinket.name, trinket.userData.idx);

	// find it in Swarm groups. (find returns item or undefined)
	if (animGroupSwarm1._objects.find(({ name }) => name === trinket.name)) {
		animGroupSwarm1.remove(trinket);
		animGroupSwarm1.uncache(trinket);
		animGroupIdle1.add(trinket);
	}
	else if (animGroupSwarm2._objects.find(({ name }) => name === trinket.name)) {
		animGroupSwarm2.remove(trinket);
		animGroupSwarm2.uncache(trinket);
		animGroupIdle2.add(trinket);
	}
	else
		console.log('Item not found in Swarm animation groups');
}

function idleToFly(trinket) {
	// DEBUG
	console.log('idleToFly()', trinket.name, trinket.userData.idx);

	let found = false;

	// find it in Swarm groups. (find returns item or undefined)
	if (animGroupIdle1._objects.find(({ name }) => name === trinket.name)) {
		animGroupIdle1.remove(trinket);
		animGroupIdle1.uncache(trinket);
		animGroupFly1.add(trinket);
		found = true;
	}
	else if (animGroupIdle2._objects.find(({ name }) => name === trinket.name)) {
		animGroupIdle2.remove(trinket);
		animGroupIdle2.uncache(trinket);
		animGroupFly2.add(trinket);
		found = true;
	}
	else
		console.log('Item not found in Idle animation groups');

	if (found) {
		trinket.userData.startTime = elapsedGameTime;
		trinket.lookAt(jarTop);
	}

	return found;
}

let hitpoint = null; // intersect point (where raycaster hits the pot)
// let arprod = new THREE.ArrowHelper();	// 0.132.2

////
let vorg = new THREE.Vector3(0, 0, 0);
let vdir = new THREE.Vector3(0, 1, 0);
let arprod = new THREE.ArrowHelper(vdir, vorg);	// local
////


arprod.visible = false;
//scene.add(arprod); => init()
//let arnormal = new THREE.ArrowHelper();
let arnormal = new THREE.ArrowHelper(vdir, vorg);	// local
arnormal.setColor(0x0000ff);
arnormal.visible = false;
//scene.add(arnormal);

let prod = null;	// Vector3: hitpoint to marker position (X0, Y0 + H, 0)

let raycaster = new THREE.Raycaster();
raycaster.set(new THREE.Vector3(X0, Y0, 0), new THREE.Vector3(-1, 0, 0));

raycaster.params.Line.threshold = raycaster.params.Points.threshold = 0.25;

let arraycast = new THREE.ArrowHelper(raycaster.ray.direction, raycaster.ray.origin, 4, 0xff0000);

function findHitpoint() {
	// find hitpoint
	let intersects = raycaster.intersectObject(meshPot);
	if (intersects.length == 0)
		return;

	// 1st hit: decal, if exists
	let intersect = intersects[0];
	if (intersect.object.name == 'decal')
		intersect = intersects[1];

	// if ray hits the pot
	hitpoint = intersect.point;
	let normal = intersect.face.normal.clone();
	normal.transformDirection(meshPot.matrixWorld);

	// show normal
	//arnormal = new THREE.ArrowHelper(normal, hitpoint, 2, 0x0000ff);
	arnormal.position.copy(hitpoint);
	arnormal.setDirection(normal);
	arnormal.visible = true;

	showProd();
	stampDecal();
}

function showProd() {
	// show prod (if H is 0, prod coinsides with ray; don't show)
	// prod: from hitpoint to prod pointer: org + H == Y0 + H
	prod = new THREE.Vector3(X0 - hitpoint.x, Y0 + H - hitpoint.y, 0);
	arprod.position.copy(hitpoint);
	arprod.setLength(prod.length());
	arprod.setDirection(prod.normalize());
	arprod.visible = (H != 0);
}

function stampDecal() {
	// helper to copy orientation value from
	helper = new THREE.Object3D();
	helper.position.copy(hitpoint);
	helper.lookAt(new THREE.Vector3(X0, Y0 + H, 0));

	let decalGeometry = new THREE.DecalGeometry(meshPot, hitpoint, helper.rotation, sizeDecal);

	if (null != decal)
		meshPot.remove(decal);

	decal = new THREE.Mesh(decalGeometry, decalMaterial);
	decal.name = 'decal';

	//// ensure Z-order: decal on top, not inside the jar
	decal.position.x += 0.002;
	////

	meshPot.attach(decal);
}

// Load Table.obj model
function loadTable() {
	// Load OBJ file
	const objLoader = new THREE.OBJLoader();
	objLoader.load('models/table/table.obj', (object) => {
		 // 2 child meshes: 'table' and 'tablecloth'
		object.traverse((child) => {
			if (child.isMesh) {
				if (child.name.includes('cloth')) {
					child.material = matcloth;
				} else {
					child.material = mattable;
				}
			}
		});

		table = object;
		table.rotation.y = Math.PI / 2;

		//scene.add(table);

		checkAssets(assets, ++assetsCount, 'table');
	});

}

// thanks DeepSeek
function rotatePointAroundVectorQuaternion(point, linePoint, lineDirection, angle) {
	// Normalize the direction vector
	lineDirection.normalize();

	// Create a quaternion representing the rotation
	const quaternion = new THREE.Quaternion();
	quaternion.setFromAxisAngle(lineDirection, angle);

	// Translate point to origin relative to linePoint
	const translatedPoint = point.clone().sub(linePoint);

	// Apply rotation
	translatedPoint.applyQuaternion(quaternion);

	// Translate back
	const rotatedPoint = translatedPoint.add(linePoint);

	return rotatedPoint;
}

//#region TEST
document.addEventListener("keydown", onDocumentKeyDown, false);

let step = 0.05;	// DEBUG - movement delta
function onDocumentKeyDown(event) {
	let name = '';

	// up/down animation has smaller scale!
	let scl = beescale;

	switch (event.keyCode) {
		case 32:	// space
			//testShowBanner();

			let i = animGroupIdle1._objects.length - 1;
			let item = animGroupIdle1._objects[i];
			let iname = item.name;

			let trinket = trinkets.find(({ name }) => name === iname);
			idleToFly(trinket);

			return;



			break;

		case 49:	// 1
			//actionIdle.play();
			name = '_bee_idle';
			break;

		case 50:	// 2
			//actionHover.play();
			name = '_bee_hover';
			break;

		case 51:	// 3
			//actionUpDown.play();
			name = '_bee_take_off_and_land';
			scl = beescale * beescalefactor;
			break;

		// DEBUG movements
		case 38:	// up
			bee.position.z -= step;
			break;
		case 40:	// dn
			bee.position.z += step;
			break;
		case 37:	// left
			bee.position.x -= step;
			break;
		case 39:	// right
			bee.position.x += step;
			break;
		case 33:	// pgup
			bee.position.y += step;
			break;
		case 34:	// pgdn
			bee.position.y -= step;
			break;

		// ROTATE
		case 107:	// +
			bee.rotation.y += step;
			break;
		case 109:	// -
			bee.rotation.y -= step;
			break;
	}

	// no fade duration: switch immediately (because of scale difference)
	bee.scale.set(scl, scl, scl);
	switchAnimation(name, 0);
}

// test animation groups
function testShowBanner() {
	console.log(scenario, ": testShowBanner()");

	// if both groups empty, populate idle and turn on animations.
	// else move trinkets over from one group to another (switch animations)
	if (animGroupIdle1._objects.length + animGroupSwarm1._objects.length == 0) {
		console.log(scenario, ": testShowBanner(): INIT");

		// INIT: populare idle groups, turn on animations
		for (let i = 0; i < trinkets.length; i++) {
			let trinket = trinkets[i];
			if (!trinket.visible)
				continue;

			// set home
			trinket.position.copy(trinket.userData.target);

			// assign to animation groups
			if (trinket.userData.idx % 2 == 0)
				animGroupIdle1.add(trinket);
			else
				animGroupIdle2.add(trinket);
		}

		switchAnimation(animMgrIdle1, '_bee_idle', 0);
		switchAnimation(animMgrIdle2, '_bee_idle', 0);
		switchAnimation(animMgrSwarm1, '_bee_hover', 0);
		switchAnimation(animMgrSwarm2, '_bee_hover', 0);
	}
	else if (animGroupIdle1._objects.length == 0) {
		console.log(scenario, ": testShowBanner(): swarm -> idle");

		// move trinkets over to idle groups
		for (let i = animGroupSwarm1._objects.length - 1; i >= 0; i--) {
			let item = animGroupSwarm1._objects[i];
			animGroupSwarm1.remove(item);
			animGroupIdle1.add(item);
			//animGroupSwarm1.uncache(item);
		}
		for (let i = animGroupSwarm2._objects.length - 1; i >= 0; i--) {
			let item = animGroupSwarm2._objects[i];
			animGroupSwarm2.remove(item);
			animGroupIdle2.add(item);
			//animGroupSwarm2.uncache(item);
		}
	}
	else {
		console.log(scenario, ": testShowBanner(): idle -> swarm");

		// move trinkets over to swarm groups
		for (let i = animGroupIdle1._objects.length - 1; i >= 0; i--) {
			let item = animGroupIdle1._objects[i];
			animGroupIdle1.remove(item);
			animGroupSwarm1.add(item);
			animGroupIdle1.uncache(item);
		}
		for (let i = animGroupIdle2._objects.length - 1; i >= 0; i--) {
			let item = animGroupIdle2._objects[i];
			animGroupIdle2.remove(item);
			animGroupSwarm2.add(item);
			animGroupIdle2.uncache(item);
		}
	}
	//////////////


	// check if animation groupd initialized
	if (animGroupIdle1._objects.length == 0) {
		// set up the test
		for (let i = 0; i < trinkets.length; i++) {
			let trinket = trinkets[i];
			if (!trinket.visible)
				continue;

			// set home
			trinket.position.copy(trinket.userData.target);

			// assign to animation groups
			if (trinket.userData.idx % 2 == 0)
				animGroupIdle1.add(trinket);
			else
				animGroupIdle2.add(trinket);
		}
	}

	// switch to idle animation
	switchAnimation(animMgrIdle1, '_bee_idle', 0);
	switchAnimation(animMgrIdle2, '_bee_idle', 0);
}

//#endregion TEST

//#regoin ANIMATION
// To desynchronize bees (I don't wand all bees perform synchronous wings flopping),
// I will create 2 animation groups for both animarions (idle and hover).
const animGroupIdle1 = new THREE.AnimationObjectGroup();
const animGroupIdle2 = new THREE.AnimationObjectGroup();
const animGroupSwarm1 = new THREE.AnimationObjectGroup();
const animGroupSwarm2 = new THREE.AnimationObjectGroup();

const animGroupFly1 = new THREE.AnimationObjectGroup();
const animGroupFly2 = new THREE.AnimationObjectGroup();

const mixerIdle1 = new THREE.AnimationMixer(animGroupIdle1);
const mixerIdle2 = new THREE.AnimationMixer(animGroupIdle2);
const mixerSwarm1 = new THREE.AnimationMixer(animGroupSwarm1);
const mixerSwarm2 = new THREE.AnimationMixer(animGroupSwarm2);

const mixerFly1 = new THREE.AnimationMixer(animGroupFly1);
const mixerFly2 = new THREE.AnimationMixer(animGroupFly2);

let animMgrIdle1 = null;
let animMgrIdle2 = null;
let animMgrSwarm1 = null;
let animMgrSwarm2 = null;

let animMgrFly1 = null;
let animMgrFly2 = null;

//function switchAnimation(animationManager, name, fadeDuration) {
//	if (animationManager) {
//		animationManager.play(name, fadeDuration);
//	}
//}
//class AnimationManager {
//	constructor(mixer, animations) {
//		this.mixer = mixer;
//		this.actions = {};
//		this.activeAction = null;

//		animations.forEach((clip) => {
//			this.actions[clip.name] = mixer.clipAction(clip);
//			this.actions[clip.name].clampWhenFinished = true;
//		});
//	}

//	play(name, fadeDuration = 0.5) {
//		if (this.activeAction && this.activeAction._clip.name == name)
//			return;

//		const newAction = this.actions[name];

//		if (undefined == newAction) {
//			console.log('AnimationManager.play(', name, '): animation undefined.');
//			return;
//		}

//		//if (this.activeAction === newAction) return;
//		if (null != this.activeAction)
//			this.activeAction.stop();

//		newAction.reset();
//		newAction.play();

//		if (this.activeAction && fadeDuration > 0) {
//			this.activeAction.crossFadeTo(newAction, fadeDuration, true);
//		}

//		this.activeAction = newAction;
//	}

//	stop() {
//		if (this.activeAction) {
//			this.activeAction.stop();
//			this.activeAction = null;
//		}
//	}

//	setTimeScale(speed = 1) {
//		if (this.activeAction) {
//			this.activeAction.timeScale = speed;
//		}
//	}
//}
//#endregoin ANIMATION

//#region CAPTURE
//// RTC issue: not always scene (canvas) is ready at the Play button

//// solution
//scenario_three_template:: recorder !== null
//    - started
//initAll(): if RTC: if null === recorder: startRecording()
//startRecording() -> <scenario>::sceneReady()	// check all components for RTC

function sceneReady() {
	console.log(scenario, ': sceneReady()');

	// canvas required for RTC
	if (undefined === canvas) {
		console.log('canvas undefined, exiting');
		return false;
	}

	// sound based on THREE.Listener will be handled in scenario_three_template::setMobileRecorder()
	//if (undefined === sound) {
	//	console.log('sound undefined, exiting');
	//	return false;
	//}

	return true;
}

// called from scenario_three_template:startShow()
function startShowCustom() {
	console.log(scenario, ": startShowCustom(sound)");

	bee.add(audioBee);	// positionalAudio

	// mow_template:: showOverlay() was called before div#progress was shown; progress was not deleted.
	let divprogress = $("div#progress");
	divprogress.remove();

	// iOS crap: user action required. (Good to implement for all other browsers/os as well).
	// user action: startButton.click() => startScenario() => startShow() => startShowCustom();
	audioBee.play(); 
	audioBee.pause();
	audioSwarm.play();
	audioSwarm.pause();
}

function exitCheckCustom() {
	console.log(scenario, ': exitCheck(): stop audio');

	audioBee.stop();
	audioSwarm.stop();


	// stop audio; NB: annoying differences between THREE.PositionalAudio and DOM AUDIO element
	//if (MOBILE) {
	//	// <AUDIO> element
	//	sound.pause();
	//}
	//else {
	//	// THREE.Audio
	//	sound.stop();
	//}
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