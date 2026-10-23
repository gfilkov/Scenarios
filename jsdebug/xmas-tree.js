var scenario = "xmas-tree";
var recordingDisabled = false;
var recordingChecked = false;

if (iOS()) {
	alert('iOS is not capable of playing this scenario.');
	stopShow();
}

let camera, scene, renderer, pointLight, controls, gltfLoader;
let directionalLight, ambientLight;
let dirLtIntensity = 2;
let ambLtIntensity = 1;

// models
let plane = null, xmastree = null, firtree = null, firtree1 = null, snowman = null;

// textures	const colorTexture = loadTexture(textureloader, '3D-models/snow/Snow_basecolor.png');
let normalTexture = null, metallicTexture = null, heightTexture = null, roughnessTexture = null, aoTexture = null;

// 1: raster, 2: nowyGround, 3: ChristmassTree.glb, 4: fir_tree.glb, 5: fir_tree_11.fbx.glb, 6: snowman_ - _low_poly.glb, 7: audio
let assets = 7;	// assets load counters
let assetsCount = 0;

const raycaster = new THREE.Raycaster();

// multi-slogan functionality
let iloop = 0;

// ShowRaster::rasterParams shoul be ready here.
const slogans = rasterParams.text.split('||');

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
	checkAssets(assets, assetsCount, 'raster');	// #1

	myAssetsCount = assetsCount;
}
////




let startTime = Date.now();
let timeout = 30000;	// 30 secs

let canvas = null, overlayCanvas = null, container = null;

let trinkets;

const FOREST_COUNT = 64;

//// PLANE
const PLANE_WIDTH = 32;
const PLANE_HEIGHT = 24;

const FOREST_WIDTH = 16;
const FOREST_HEIGHT = 12;

//// BANNER
const BANNER_WIDTH = 10;
const BANNER_HEIGHT = 3;
const bannerCenterZ = 2.5;

// NB: DEBUG value is set in MoW_templates.window.onload()

//// xmastree stuff
const lightMaterials = [];	// lights
const redMaterials = [];	// colored bulbs
const blueMaterials = [];
const cyanMaterials = [];
const yellowMaterials = [];

// objects in xmas tree GLTF: root of lights, light meshes
// NB: 'mesh_42' - fir
const lightNames = ['Lights38', 'mesh_34', 'mesh_35', 'mesh_36', 'mesh_37'];
const bulbsRed = ['mesh_3', 'mesh_7', 'mesh_10', 'mesh_11', 'mesh_17'];
const bulbsBlue = ["mesh_0", "mesh_5", "mesh_12", "mesh_14", "mesh_16", "mesh_20"];
const bulbsCyan = ["mesh_2", "mesh_4", "mesh_6", "mesh_9", "mesh_13", "mesh_15", "mesh_18", "mesh_19", "mesh_21"];
const bulbsYellow = ['mesh_1', 'mesh_8', 'mesh_22', 'mesh_23'];

const colorRed = new THREE.Color("rgb(255, 0, 0)");
const colorBlue = new THREE.Color("rgb(0, 0, 255)");
const colorCyan = new THREE.Color(0x00ffff);
const colorYellow = new THREE.Color(0xffd700);	// golden

let starmat;	// star material

const audioJingle = 'sounds/Jingle-Bells(chosic.com).mp3';
const listener = new THREE.AudioListener();
// Create a global audio object
const sound = new THREE.Audio(listener);

// init is called when all assets are loaded
function init() {
	console.log("xmas-tree: init()");

	createCanvases();	// scenario_three_template

	// Init scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xe0e0e0);
	scene.fog = new THREE.Fog(0xe0e0e0, 1, 20);

	// White directional light at half intensity shining from the top.
	directionalLight = new THREE.DirectionalLight(0xffffff);
	directionalLight.intensity = dirLtIntensity;
	directionalLight.position.set(10, 10, 10);
	directionalLight.castShadow = true;
	scene.add(directionalLight);

	// AmbientLight( color : Integer, intensity : Float )	// intensity default: 1
	ambientLight = new THREE.AmbientLight(0x404040); // soft white light
	ambientLight.intensity = ambLtIntensity;
	scene.add(ambientLight);

	// Init camera (PerspectiveCamera)
	camera = new THREE.PerspectiveCamera(
		75,
		16 / 9,	//window.innerWidth / window.innerHeight,
		0.1,
		1000
	);

	//camera.position.set(0.8, 1.4, 1.0);
	camera.position.set(2.0, 3.0, 2.0);
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
	renderer.setClearColor(0xffffff, 0);

	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.target.set(0, 1, 0);

	// add loaded assets
	scene.add(plane);

	scene.add(firtree);
	scene.add(firtree1);

	firtree1.scale.set(0.25, 0.25, 0.25);
	firtree1.position.set(5.5, 0, 1.5);

	trinketD = 1.1;	// (ShowRaster) trinket diameter in current scale.
	itemSizeMax = 2;
	itemSizeMin = 0.2;
	bannerResizedW = 0;	// set in createBanner() to help visualize in DEBUG mode re-scaled textQuad.
	bannerResizedH = 0;

	// ShowRaster::createBanner() => trinkets[]	// clones of firtree1
	trinkets = createBanner(-BANNER_WIDTH / 2, BANNER_WIDTH / 2, bannerCenterZ - BANNER_HEIGHT / 2, bannerCenterZ + BANNER_HEIGHT / 2, firtree1, 1.5);	// make text
	createForest(FOREST_COUNT);

	if (DEBUG) {
		scene.add(new THREE.AxesHelper(5));

		let pos = new THREE.Vector3(0, 0.02, bannerCenterZ);

		// ShowRaster.js quad visualization (for debug)
		// showQuad(W, H, pos, rotX, rotY, rotZ /* radians 'XYZ' */, color, name)
		const quadText = showQuad(rcText.w, rcText.h, pos, -Math.PI / 2, 0, 0, 0x0000ff, 'quadText');
		scene.add(quadText);

		const quadBanner = showQuad(BANNER_WIDTH, BANNER_HEIGHT, new THREE.Vector3(0, 0.01, bannerCenterZ), -Math.PI / 2, 0, 0, 0xffff00, 'quadBanner');
		scene.add(quadBanner);

		// if quadText was rescaled, show it
		if (bannerResizedW > 0) {
			const quadSized = showQuad(bannerResizedW, bannerResizedH, new THREE.Vector3(0, 0.03, bannerCenterZ), -Math.PI / 2, 0, 0, 0xff0000, 'quadSized');
			scene.add(quadSized);
		}
	}
}


function textureSetRepeat(texture, M, N) {
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.offset.set(0, 0);
	texture.repeat.set(M, N);
}

const texturesNum = 6;
let textureCount = 0;
function loadSnowyGround() {
	console.log("xmas-tree.loadSnowyGround()");

	// NB: reusing the same instance recommended. But be aware loadis async
	textureloader = new THREE.TextureLoader();

	colorTexture = loadTexture(textureloader, '3D-models/snow/Snow_basecolor.png');
	normalTexture = loadTexture(textureloader, '3D-models/snow/Snow_normal.png');
	metallicTexture = loadTexture(textureloader, '3D-models/snow/Snow_metallic.png');
	heightTexture = loadTexture(textureloader, '3D-models/snow/Snow_height.png');
	roughnessTexture = loadTexture(textureloader, '3D-models/snow/Snow_roughness.png');
	aoTexture = loadTexture(textureloader, '3D-models/snow/Snow_ambientOcclusion.png');
}

function loadTexture(loader, path) {
	console.log("xmas-tree.loadTexture(" + path + ")");

	let txt = loader.load(path, (texture) => {
		// Handle loaded texture
		textureSetRepeat(texture, 6, 4);
		texture.flipY = false;

		// color
		if (path.search('color') > 0)
			texture.encoding = THREE.sRGBEncoding;

		textureCount++;
		if (textureCount >= texturesNum)
			createSnowyGround();

	}, undefined, (error) => {
		textureError(error);
	});

	return txt;
}

function textureError(error) {
	console.log('textureError:', error);
}

function createSnowyGround() {
	console.log("xmas-tree.createSnowyGround()");

	// Create the material
	const material = new THREE.MeshStandardMaterial({
		map: colorTexture,
		normalMap: normalTexture,
		metalnessMap: metallicTexture,
		bumpMap: heightTexture,
		roughnessMap: roughnessTexture,
		aoMap: aoTexture,
	})
	// material.bumpScale = 1; - no effect!?
	material.bumpScale = 0.01;	// 1;
	material.metalness = 0.5;	// 0;
	material.roughness = 0.01;	// 1;

	// Create the plane
	const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT);

	plane = new THREE.Mesh(geometry, material);
	plane.receiveShadow = true;
	plane.name = 'plane';

	// lay it flat
	plane.rotateX(-Math.PI / 2);

	checkAssets(assets, ++assetsCount, 'plane');	// #2
}

function createForest(number) {
	console.log("xmas-tree.createForest()");

	// keep away from rcBanner; create new rect around rcBanner with margins
	let rcBald = new Rectangle(rcBanner.left - 0.5, rcBanner.right + 1.5, rcBanner.top - 0.5, rcBanner.bottom + 0.5);

	let count = 0;
	while (count < number) {
		let org = random(-1, 1) > 0 ? firtree : firtree1;
		let clone = THREE.SkeletonUtils.clone(org);

		// position object
		let positioned = false;
		while (!positioned) {
			// position in the forest rect
			let x = random(-FOREST_WIDTH / 2, FOREST_WIDTH / 2);
			let z = random(-FOREST_HEIGHT / 2, FOREST_HEIGHT / 2);

			if (rcBald.isPointIn(new Point(x, z)))
				continue;

			// scale, rotate, position clone; clone.name.length == 0 : xmas bare tree
			// scale factors
			let fh = random(0.7, 1.4);
			let fd = 1;
			if (0 == clone.name.length) {
				// xmas bare
				fd = fh * random(0.8, 1.2);
			}
			else {
				// fir tree - wider
				fd = fh * random(0.6, 1);
			}
			clone.scale.x *= fd;
			clone.scale.z *= fd;
			clone.scale.y *= fh;

			clone.position.set(x, 0, z);
			clone.rotateY(random(-Math.PI, Math.PI));

			scene.add(clone);
			positioned = true;
			count++;
		}
	}
}


function loadGltfModel(path, callback) {
	let model = null;
	gltfLoader.load(
		path,
		(gltf) => {
			model = gltf.scene;
			//model.castShadow = true;

			// shadows
			gltf.scene.traverse(function (child) {
				if (child.isMesh) {
					child.castShadow = true;
					//child.receiveShadow = true;
				}
			});

			// xmas tree GLB moded looked fine in test app. Same code in MowTestWeb scenarios does not work properly:
			// # Loading takes very long.
			// # Materials are rendered with black background instead of transparent.
			// Meta AI suggestions:
			//gltf.scene.traverse((child) => {
			//	if (child.isMesh) {
			//		child.material.alphaTest = 0.5;
			//		//child.material.transparent = true;
			//		child.material.side = THREE.DoubleSide;
			//	}
			//});

			callback(model);
		},
		(xhr) => {
			// console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
			let msg = path + ': ' + (xhr.loaded / xhr.total) * 100 + '% loaded';
			console.log(msg);
			// logToServer(msg, 'gltfLoader.load', scenario);
		},
		(error) => {
			console.log(error);
			logToServer('ERROR', 'gltfLoader.load', scenario);
		}
	);
}

onError = function (e) {
	console.error(e);
};

// render() is called from scenario_three_template
//function animate() {
//	requestAnimationFrame(animate);
//	controls.update();
//	render();
//}

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

let q1, q2; // rotatinal params: rotate (camera) from q1 to q2
let p1, p2; // moving params: move (camera) from p1 to p2
let t1, t2;	// target move params: (camera look at) from t1 to t2

let isRotating = false;	// q1 - q2
let isMoving = false;	// p1 - p2
let isTurning = false; // t1 - t2
let isHeadTurning = false; // t1 - t2 (turn like 1st person would do: turn around Y, minimize vertical motion)

let camtarget = new THREE.Vector3(0, 0, 0);

var elapsedTime = 0;
let actionTime = 0;	// time to move, rotate...
let pauseTime = 3;	// pause before starting the motion

let stage = 0;

function update(delta) {
	if (isRotating || isMoving || isTurning)
		updateMotion(delta);
	else
		updateStage(delta);

	camera.lookAt(camtarget);
	elapsedTime += delta;
}

function updateMotion(delta) {
	// force all transitions to stop when action time is over
	if (elapsedTime > actionTime) {
		stage++;
		isRotating = isMoving = isTurning = false;
		return;
	}

	let f = elapsedTime / actionTime;

	if (isRotating) {
		camera.quaternion.slerpQuaternions(q1, q2, f); // 0 < time < 1
	}

	if (isMoving) {
		camera.position.lerpVectors(p1, p2, f);
	}

	if (isTurning) {
		if (isHeadTurning) {
			// (turn like 1st person would do: turn around Y, minimize vertical motion)
			// DeepSeek advice:
			camtarget = turnHead(f);
		}
		else
			camtarget.lerpVectors(t1, t2, f);
	}
}

//// cam rotation around xmas tree params
let camY0;	// cam Y at the start of rotation
const camY1 = 4;	// cam Y at the end of rotation
const angle1 = Math.PI;
let turnAngle = 0;	// cumulative turn angle (to compare with angle1)
const rotTime = 3;
let rotSpeed = angle1 / rotTime;
const upspeed = 0.1;	// last stage: zoomimg out

// Define the axis of rotation (a direction vector)
const axis = new THREE.Vector3(0, 1, 0).normalize(); // Normalize to ensure it's a unit vector

// Define a point on the axis (optional, if the axis doesn't pass through the origin)
let pointOnAxis;
const angle = 0.3; // Rotation speed

//// # turning cam with camtarget.lerpVectors(t1, t2, f) does not look good.
// It goes via shortest path, making rotation not smooth and often goes overhead.
// To make it look as if 1st personn turns their head, use function suggested by DeepSeek:
let TH_startDir, TH_endDir, TH_currentDir;	// turnHead static data
let TH_startSpherical, TH_endSpherical;
let TH_currentSpherical = null;	// need to call setTurnHead()

// set turnHead static vars
function setTurnHead(t1, t2) {
	TH_startDir = t1.clone().sub(camera.position).normalize();
	TH_endDir = t2.clone().sub(camera.position).normalize();

	// Convert to spherical coordinates
	TH_startSpherical = new THREE.Spherical().setFromVector3(TH_startDir);
	TH_endSpherical = new THREE.Spherical().setFromVector3(TH_endDir);
	TH_currentSpherical = new THREE.Spherical();

	// Choose the shortest angular distance for horizontal rotation
	if (Math.abs(TH_endSpherical.theta - TH_startSpherical.theta) > Math.PI) {
		if (TH_endSpherical.theta > TH_startSpherical.theta) {
			TH_startSpherical.theta += Math.PI * 2;
		} else {
			TH_endSpherical.theta += Math.PI * 2;
		}
	}
}

function turnHead(f) {
	// set motion params
	if (null == TH_currentSpherical) {
		setTurnHead(t1, t2);
		return t1;
	}

	// For even more natural movement smooth the motion
	let easedF = easeInOutCubic(f);  // Apply easing function

	// Interpolate
	TH_currentSpherical.theta = THREE.MathUtils.lerp(
		TH_startSpherical.theta,
		TH_endSpherical.theta,
		easedF
	);

	// Optional: slight vertical movement
	TH_currentSpherical.phi = THREE.MathUtils.lerp(
		TH_startSpherical.phi,
		TH_endSpherical.phi,
		easedF * 0.3  // Reduce vertical movement
	);
	TH_currentSpherical.radius = 1;  // Unit length

	// Convert back to cartesian
	TH_currentDir = new THREE.Vector3().setFromSpherical(TH_currentSpherical);
	return  TH_currentDir.add(camera.position);	// camTarget
}

function easeInOutCubic(x) {
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
/////////

function updateStage(delta) {
	// console.log('updateStage(' + stage + ')');	// DEBUG

	// set params for the next movement
	switch (stage) {
		case 0:
			if (elapsedTime < pauseTime)
				return;

			// set camera to initial position 
			p1 = new THREE.Vector3(rcText.left - 0.5, 0.5, rcBanner.top);
			p2 = new THREE.Vector3(rcText.left - 0.5, 0.5, rcText.bottom);
			isMoving = true;

			// set camera look at targets
			t1 = new THREE.Vector3(PLANE_WIDTH / 2, 0.5, -PLANE_HEIGHT / 2);	// top right plane corner
			t2 = new THREE.Vector3(-PLANE_WIDTH / 2, 0.5, -PLANE_HEIGHT / 2);	// top left plane corner
			isTurning = true;

			actionTime = 4;
			elapsedTime = 0;

			break;

		case 1:
			// camera goes up; target goes to text lower left
			p1 = p2;
			p2 = new THREE.Vector3(rcText.left, rcBanner.w * 0.6, rcText.bottom);
			isMoving = true;

			t1 = t2;
			t2 = new THREE.Vector3(rcText.left, 0, rcText.bottom);
			isTurning = true;

			actionTime = 4;
			elapsedTime = 0;

			break;

		case 2:
			// camera and target go to the right lower corner of the text
			p1 = p2;
			p2 = new THREE.Vector3(rcText.right, rcBanner.w * 0.6, rcText.bottom);
			isMoving = true;

			t1 = t2;
			t2 = new THREE.Vector3(rcText.right, 0, rcText.bottom);
			isTurning = true;

			actionTime = 6;
			elapsedTime = 0;

			break;

		case 3:
			// camera goes down to banner right; y: 0.5
			p1 = p2;
			p2 = new THREE.Vector3(rcBanner.right - 0.8, 0.2, rcBanner.center.y);
			isMoving = true;

			// target moves to center
			t1 = t2;
			t2 = new THREE.Vector3(0, 0.5, 0);
			isTurning = true;

			actionTime = 4;
			elapsedTime = 0;

			break;

		case 4:
			// camera stays at banner right
			// remove trees from lower right corner of the scene, show xmas tree and snowman

			showXmas();

			isRotating = isMoving = isTurning = false;	// have to increment stage here!
			stage++;

			break;

		case 5:
			// target moves to snowman
			t1 = t2;
			t2 = new THREE.Vector3(snowman.position.x, 0.5, snowman.position.z);
			TH_currentSpherical = null;
			isHeadTurning = true;
			isTurning = true;

			actionTime = 2;
			pauseTime = 1;
			elapsedTime = 0;

			break;

		case 6:
			// stare at snowman, then turn to xmas tree
			if (elapsedTime < pauseTime)
				return;

			// target moves to xmas tree
			t1 = t2;
			t2 = new THREE.Vector3(xmastree.position.x, 1, xmastree.position.z);
			TH_currentSpherical = null;
			isTurning = true;

			pauseTime = 6;
			elapsedTime = 0;

			break;

		case 7:
			// stare at xmas tree
			if (elapsedTime < pauseTime) {
				// lights down
				let t = elapsedTime / pauseTime;

				let inta = THREE.MathUtils.lerp(ambLtIntensity, 0.4, t);
				ambientLight.intensity = inta;

				let intd = THREE.MathUtils.lerp(dirLtIntensity, 0, t);
				directionalLight.intensity = intd;

				// console.log('pauseTime:', pauseTime, 'elapsedTime:', elapsedTime, 'ambientLight.intensity:', ambientLight.intensity, 'directionalLight.intensity:', directionalLight.intensity);

				//// BKG light down
				scene.background.r -= 0.001;
				scene.background.g -= 0.001;
				scene.background.b -= 0.001;
				// console.log(scene.background);
				scene.fog.color = scene.background;
				////

				return;
			}

			// xmas lights on
			toggleLights();

			// get ready for next stage: rotation
			controls.target = xmastree.position;

			actionTime = rotTime;
			pauseTime = 2;
			elapsedTime = 0;
			isHeadTurning = false;

			camY0 = camera.position.y;

			pointOnAxis = xmastree.position;
			stage++;

			break;

		case 8:
			if (elapsedTime < pauseTime) {
				// watch for 2 secs
				break;
			}
			// rotate cam
			let dAngle = angle * delta;
			const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, dAngle);
			camera.position.sub(pointOnAxis);
			camera.position.applyQuaternion(quaternion);
			camera.position.add(pointOnAxis);
			camera.quaternion.multiplyQuaternions(quaternion, camera.quaternion);

			// cam.y: my func ShowRaster::interpolate(x0, x1, f0, f1, x)
			camera.position.y = interpolate(0, angle1, camY0, camY1, turnAngle);

			turnAngle += dAngle;
			if (turnAngle > angle1) {
				messageOnCanvas(overlayCanvas, rasterParams.message, { color: 'yellow', strokeColor: 'yellow' });

				// camera goes up; target goes to center
				p1 = camera.position.clone();

				//p2 = p1 + new THREE.Vector3(0,8,0);	// ### NOGO
				let dy = new THREE.Vector3(0, 12, 0);
				p2 = new THREE.Vector3().addVectors(p1, dy);
				isMoving = true;

				t1 = xmastree.position;
				t2 = new THREE.Vector3(0, 0, 0);
				TH_currentSpherical = null;
				isTurning = true;

				elapsedTime = 0;
				actionTime = 4;
			}

			break;

		case 9:
			//alert('stage 9');
			// should be moving up here
			if (elapsedTime > actionTime / 2) {
				gameOver = 0;	// !? takes a few seconds
			}
			isMoving = true;

			// volume down
			let t = elapsedTime / actionTime;
			let vol = THREE.MathUtils.lerp(0.5, 0, t);
			sound.setVolume(vol);

			break;
		case 10:
			gameOver = 0;
			stage = -1;
			break;
	}
}

// remove trees from lower left corner; plant xmas tree and snowman
function showXmas() {
	// check if trinkets (of the rightmost char) block the camera
	// text might be multi-line, probing all trinkets through.

	let xMarg = camera.position.x - 0.2;

	trinkets.forEach((tree) => {
		// console.log(tree);
		if (tree.position.x > xMarg)
			scene.remove(tree);
	});

	scene.add(xmastree);	// => showXmas()
	scene.add(snowman);
}

// Add an event listener for mouse double click
document.addEventListener('dblclick', (event) => {
	// Get the mouse position
	const mouse = {
		x: (event.clientX / window.innerWidth) * 2 - 1,
		y: -(event.clientY / window.innerHeight) * 2 + 1,
	};

	// Update the raycaster
	raycaster.setFromCamera(mouse, camera);

	// Check for intersections, skip AxesHelper
	const intersects = raycaster.intersectObjects(scene.children, true);

	for (let i = 0; i < intersects.length; i++) {
		let item = intersects[i];
		// "LineSegments" or "AxesHelper"!? Depends on THREE version
		if ("LineSegments" != item.object.type && "AxesHelper" != item.object.type) {
			console.log(item.object);
			console.log(item.point);
			controls.target = item.point;
			break;
		}
	}
});

document.addEventListener(
	"keyup",
	(event) => {
		const keyName = event.key;

		// As the user releases the Ctrl key, the key is no longer active,
		// so event.ctrlKey is false.
		if (keyName === " ") {
			//alert("Space key was released");
			toggleLights();

			//// DEBUG
			// gameOver = true;	// takes a few seconds!?
		}
	},
	false,
);

//////
function xmastreeOnLoad(model) {
	xmastree = model;
	xmastree.scale.set(0.01, 0.01, 0.01);
	xmastree.position.set(5.5, 0, 2.5);
	// name: "ChristmassTree1"

	collectLightMaterials();	// xmas tree materials

	checkAssets(assets, ++assetsCount, 'ChristmassTree');	// #3
}

function firtreeOnLoad(model) {
	firtree = model;
	firtree.scale.set(0.5, 0.5, 0.5);
	firtree.position.set(5.5, 0, 0.5);
	// name: 'tree'

	checkAssets(assets, ++assetsCount, 'fir_tree');	// #4
}

function firtree1OnLoad(model) {

	firtree1 = model;
	//firtree1.scale.set(0.25, 0.25, 0.25);	// filthy iOS breaks here (?) moved to init()
	//firtree1.position.set(5.5, 0, 1.5);

	// name: "fir_tree_bare2"

	// DeepSeak AI: size of mesh: (issue here: object is group with deep hierarchy; meshes hidden below)
	//// Create a Box3 object to compute the bounding box
	//const boundingBox = new THREE.Box3().setFromObject(mesh);

	//// Get the size of the bounding box
	//const size = new THREE.Vector3();
	//boundingBox.getSize(size);

	//// Now, size.x, size.y, and size.z contain the width, height, and depth of the mesh
	//console.log(`Width: ${size.x}, Height: ${size.y}, Depth: ${size.z}`);

	checkAssets(assets, ++assetsCount, 'fir_tree_11');	// #5
}

function snowmanOnLoad(model) {
	snowman = model;
	snowman.scale.set(0.5, 0.5, 0.5);
	snowman.position.set(5.5, -0.03, 3.5);
	// name: "Sketchfab_model"

	snowman.rotateY(Math.PI);

	checkAssets(assets, ++assetsCount, 'snowman');	// #6
}


/////
initAssets();

// poor-man version of AssetLoader for three.js
function initAssets() {
	console.log("xmas-tree: initAssets()");

	//1: raster, 2: nowyGround, 3: ChristmassTree.glb, 4: fir_tree.glb, 5: fir_tree_11.fbx.glb, 6: snowman_-_low_poly.glb, 7: audio

	gltfLoader = new THREE.GLTFLoader();

	// #2: create plain, create and set snow material
	loadSnowyGround();

	// load models
	// #3
	//oadGltfModel('3D-models/ChristmassTree.fbx.glb', xmastreeOnLoad);
	loadGltfModel('3D-models/ChristmassTree.glb', xmastreeOnLoad);

	// async!!! Goes to onLoad() funcs

	// #4
	loadGltfModel('3D-models/fir_tree.glb', firtreeOnLoad);

	// #5
	loadGltfModel('3D-models/fir_tree_11.fbx.glb', firtree1OnLoad);

	// #6
	loadGltfModel('3D-models/snowman_-_low_poly.glb', snowmanOnLoad);

	// load audio
	/// THREE.Audio version:
	const audioLoader = new THREE.AudioLoader();
	// # 7
	audioLoader.load(audioJingle, function (buffer) {
		// onLoad callback function
		sound.setBuffer(buffer);
		sound.setVolume(0.5);

		checkAssets(assets, ++assetsCount, 'Jingle-Bells(chosic.com).mp3');	// #7
	});
}

// called from scenario_three_template::initAll(); returns bool initialized
function initAllCustom() {
	console.log("xmas-tree.initAllCustom()");

	let ready = true;

	if (undefined === canvas) {
		canvas = $('canvas')[0];
		ready = false;
	}

	//...

	// set camera to initial position 
	camera.position.set(rcText.left - 0.5, 0.5, rcBanner.top);

	// set camera look at target
	let tgt = new THREE.Vector3(PLANE_WIDTH / 2, 0.5, -PLANE_HEIGHT / 2);	// top right plane corner
	camera.lookAt(tgt);

	return ready;
}

// scenario-specific
function exitCheckCustom() {
	console.log('exitCheck(): stop audio');

	// stop audio; NB: annoying differences between THREE.PositionalAudio and DOM AUDIO element
	if (MOBILE) {
		// <AUDIO> element
		sound.pause();
	}
	else {
		// THREE.Audio
		sound.stop();
	}
}

//// scenario specific
// toggle decorative ligts
// there are 4 materials used in lights. Make a collection of materials and use it here.
function toggleLights() {
	// emissiveIntensity toggles 0 <--> 1
	let newval = 1 - lightMaterials[0].emissiveIntensity;
	for (let i = 0; i < lightMaterials.length; i++) {
		lightMaterials[i].emissiveIntensity = newval;
	}

	for (let i = 0; i < redMaterials.length; i++) {
		redMaterials[i].emissiveIntensity = newval;
	}

	for (let i = 0; i < blueMaterials.length; i++) {
		blueMaterials[i].emissiveIntensity = newval;
	}

	for (let i = 0; i < yellowMaterials.length; i++) {
		yellowMaterials[i].emissiveIntensity = newval;
	}

	for (let i = 0; i < cyanMaterials.length; i++) {
		cyanMaterials[i].emissiveIntensity = newval;
	}

	starmat.emissiveIntensity = newval;
}

// objects in xmas tree GLTF: root of lights, light meshes
// const lightNames = ['Lights38', 'mesh_34', 'mesh_35', 'mesh_36', 'mesh_37'];
// const lightMaterials = [];
function collectLightMaterials() {
	let lights = findByName(xmastree, lightNames[0]);

	// lights
	for (let i = 1; i < lightNames.length; i++) {
		let mat = findByName(lights, lightNames[i]).material;

		// set emissive color
		mat.emissiveIntensity = 0;	// off
		mat.emissive.r = mat.emissive.g = mat.emissive.b = 0;

		switch (i) {
			case 1:
				mat.emissive.b = 1;
				break;
			case 2:
				mat.emissive.g = 1;
				break;
			case 3:
				mat.emissive.r = 1;
				break;
			case 4:
				mat.emissive.b = mat.emissive.r = 1;
				break;
		}

		lightMaterials.push(mat);
	}

	// decor bulbs
	for (let i = 0; i < bulbsRed.length; i++) {
		let mat = findByName(xmastree, bulbsRed[i]).material;
		mat.emissive = colorRed;
		mat.emissiveIntensity = 0;
		redMaterials.push(mat);
	}

	for (let i = 0; i < bulbsBlue.length; i++) {
		let mat = findByName(xmastree, bulbsBlue[i]).material;
		mat.emissive = colorBlue;
		mat.emissiveIntensity = 0;
		blueMaterials.push(mat);
	}

	for (let i = 0; i < bulbsYellow.length; i++) {
		let mat = findByName(xmastree, bulbsYellow[i]).material;
		mat.emissive = colorYellow;
		mat.emissiveIntensity = 0;
		yellowMaterials.push(mat);
	}

	for (let i = 0; i < bulbsCyan.length; i++) {
		let mat = findByName(xmastree, bulbsCyan[i]).material;
		mat.emissive = colorCyan;
		mat.emissiveIntensity = 0;
		cyanMaterials.push(mat);
	}

	// star
	let star = findByName(xmastree, "mesh_41");
	starmat = star.material;

	//starmat.emissive.r = 1;	// golden color ffd700 / 255, 215, 0 / 1, 0.84, 0
	//starmat.emissive.g = 0.84;
	//starmat.emissive.b = 0;

	starmat.emissive = colorYellow;

	starmat.emissiveIntensity = 0;	// off
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
	if (undefined === sound) {
		console.log('sound undefined, exiting');
		return false;
	}

	return true;
}
// called from scenario_three_template:startShow()
function startShowCustom() {
	console.log('startShowCustom(): sound');
	sound.play();
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