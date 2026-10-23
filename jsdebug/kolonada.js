var scenario = "marienbad";
var recordingDisabled = false;
var recordingChecked = false;
var rotateRequest = true;   // optional; scenario requests horiz screen

let canvas = null, overlayCanvas = null, container = null;

var camera, scene, renderer, controls;
var particleLight;


// defined in ShowRaster
///var raster;
///var rastersize;

const assets = 4;	// assets load counters: 1: raster, 2: sound, 3: texture, 4: font
let assetsCount = 0;

let nTurns = 0; // increments every time azimuthAngle changes sign from plus to minus
const maxTurns = 1;
let prevangle = -1.0;
const MAXTIME = 45000;  // safety catch - exit if time is over
let starttime;

let myMessage = 'Remember Marienbad garnets?';  // default user message
const myOverlayMessage = '<h3>Move scene around with your mouse.</h3><h3>Roll in / out garnets collection with your mouse wheel.</h3>';

const listener = new THREE.AudioListener();
const audioSrc = 'sounds/JEALOUSY_TANGO_clip.mp3';
const audio = new THREE.Audio(listener);

var textureReady = false;   // set by init(): THREE.CubeTextureLoader()
const cubeTexturePath = 'textures/cube/Kolonada/';
let reflectionCube

const fontLoader = new THREE.FontLoader();
let messageFont;

if (!Detector.webgl) Detector.addGetWebGLMessage();

//// DeepSeek: Function to center the canvas horizontally (using my setVideoSize())
//function centerCanvas() {
//    // scenario_trhree_template.js: returns max contained size of given aspect
//    let size = setVideoSize(16, 9);

//    // Calculate the left margin to center the canvas
//    const marginLeft = (window.innerWidth - size.W) / 2;

//    // Apply the margin to the canvas
//    canvas.style.marginLeft = `${marginLeft}px`;

//    // apply the same to 'preview' video
//    const preview = document.getElementById("divPreview");
//    if (null != preview)
//        preview.style.marginLeft = `${marginLeft}px`;

//}
//// Re-center the canvas on window resize
//window.addEventListener('resize', centerCanvas);

//#region COMMON

initAssets();

// poor-man version of AssetLoader for three.js
function initAssets() {
    console.log(scenario, ': initAssets(', assets, ')');

    // Calls MoW_template::checkAssets() => scenario.init()

    // 1: raster, 2: audio, 3: texture, 4: font
    getRaster(rasterReady);

    // 2: audio
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(audioSrc, function (buffer) {
        // onLoad callback function
        audio.setBuffer(buffer);
        audio.setLoop(false);
        audio.setVolume(0.5);
        checkAssets(assets, ++assetsCount, 'audio');
    });

    // 3: texture
    reflectionCube = new THREE.CubeTextureLoader()
        .setPath(cubeTexturePath)
        .load(['face-r.png', 'face-l.png', 'face-t.png', 'face-d.png', 'face-f.png', 'face-b.png'], function () {
            textureReady = true;
            checkAssets(assets, ++assetsCount, 'cube');
        });
    reflectionCube.format = THREE.RGBFormat;

    // 4: font
    fontLoader.load('fonts/Roboto_Regular.json', function (font) {
        messageFont = font;
        checkAssets(assets, ++assetsCount, 'font', myOverlayMessage);
    });
}

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

function init() {
    console.log('init()');

    createCanvases();	// scenario_three_template

    // set renderer ratio to 16:9
    let size = setVideoSize(16, 9); // scenario_three_template

    // for scenario_three_template::startRecording() gameWidth/gameHeight must be defined,
    // otherwise it will be window inner size.
    gameWidth = size.W;
    gameHeight = size.H;

    camera = new THREE.PerspectiveCamera(40, gameWidth / gameHeight, 1, 8000);
    camera.position.set(1400, -300, 1700);
    camera.add(listener);


    scene = new THREE.Scene();
    scene.background = reflectionCube;

    var geometry = new THREE.IcosahedronBufferGeometry(0.1, 1);
    var colors = [];
    var instancePositions = [];
    var instanceQuaternions = [];
    var instanceScales = [];

    //setGemsCube(geometry, colors, instancePositions, instanceQuaternions, instanceScales);
    setGemsWord(geometry, colors, instancePositions, instanceQuaternions, instanceScales);

    var instancedGeometry = new THREE.InstancedBufferGeometry();
    instancedGeometry.attributes.position = geometry.attributes.position;
    instancedGeometry.attributes.color = geometry.attributes.color;

    instancedGeometry.addAttribute('instancePosition', new THREE.InstancedBufferAttribute(new Float32Array(instancePositions), 3));
    instancedGeometry.addAttribute('instanceQuaternion', new THREE.InstancedBufferAttribute(new Float32Array(instanceQuaternions), 4));
    instancedGeometry.addAttribute('instanceScale', new THREE.InstancedBufferAttribute(new Float32Array(instanceScales), 3));

    //
    var shader = GemShader;
    var shaderMaterial = new THREE.ShaderMaterial({

        uniforms: shader.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        vertexColors: true

    });

    // attempt to add colors - did not work :(
    shaderMaterial.uniforms.diffuse = { type: "c", value: { r: 1, g: 0, b: 0 } };

    // counterparts are drawn all at once with a single draw call (via instanced rendering)
    var instancedMesh = new THREE.Mesh(instancedGeometry, shaderMaterial);
    instancedMesh.position.x = 0.1;
    scene.add(instancedMesh);
    //

    function addLabel(name, location) {
        var textGeo = new THREE.TextBufferGeometry(name, {
            font: messageFont,
            size: 64,
            height: 1,
            curveSegments: 1
        });

        var textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        var textMesh = new THREE.Mesh(textGeo, textMaterial);

        // center label
        let boundingBox = new THREE.Box3().setFromObject(textMesh);
        //let size = boundingBox.getSize(); // Returns Vector3    // fails?!
        let boxsize = new THREE.Vector3();
        boundingBox.getSize(boxsize);

        textMesh.position.copy(location);
        textMesh.position.x -= boxsize.x / 2;
        scene.add(textMesh);

        // DEBUG: show box
        // const box = new THREE.BoxHelper(textMesh, 0xffff00);
        // scene.add(box);
    }

    if (rasterParams.message)
        myMessage = rasterParams.message;

    // addLabel("Remember Marienbad garnets?", new THREE.Vector3(0, 360, 0));
    addLabel(myMessage, new THREE.Vector3(0, 360, 0));

    particleLight = new THREE.Mesh(new THREE.SphereBufferGeometry(4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    scene.add(particleLight);

    // Lights
    scene.add(new THREE.AmbientLight(0x222222));

    var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    var pointLight = new THREE.PointLight(0xffffff, 2, 800);
    particleLight.add(pointLight);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(gameWidth, gameHeight);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    if (renderer.extensions.get('ANGLE_instanced_arrays') === null) {

        alert('Sorry, your graphics card + browser does not support hardware instancing');
    }

    //controls = new THREE.OrbitControls(camera);    // versions collisions
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // rotation in X
    // controls.setPolarAngle(phi);
    controls.PolarAngle = -0.1;
    controls.autoRotate = true;

    // DEBUG
    // messageOnCanvas(overlayCanvas, 'Testing one-two-three');
}
//#endregion

//#region SCENARIO-SPECIFIC
function setGemsCube(geometry, colors, instancePositions, instanceQuaternions, instanceScales) {
    var cubeWidth = 400;
    var numberOfGemsPerSide = 5;
    var scalefactor = (cubeWidth / numberOfGemsPerSide) * 3.0;
    var stepSize = 1.0 / numberOfGemsPerSide;

    for (var i = 0, l = geometry.attributes.position.count; i < l; i++) {
        colors.push(Math.random(), Math.random(), Math.random());
    }

    geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    //geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000, vertexColors: THREE.VertexColors });

    // create for each mesh a counterpart in our instanced geometry data
    for (var alpha = 0, alphaIndex = 0; alpha <= 1.0; alpha += stepSize, alphaIndex++) {
        for (var beta = 0; beta <= 1.0; beta += stepSize) {
            for (var gamma = 0; gamma <= 1.0; gamma += stepSize) {
                var mesh = new THREE.Mesh(geometry, material);

                //var position = mesh.position;
                var quaternion = mesh.quaternion;
                var scale = mesh.scale;

                //quaternion.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
                quaternion.set(0, 0, 1, 1);
                quaternion.normalize();
                scale.set(scalefactor, scalefactor, scalefactor / 2);

                mesh.position.x = alpha * 400 - 200;
                mesh.position.y = beta * 400 - 200;
                mesh.position.z = gamma * 400 - 200;

                scene.add(mesh);

                // instanced attribute data
                instancePositions.push(mesh.position.x, mesh.position.y, mesh.position.z);
                instanceQuaternions.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
                instanceScales.push(scale.x, scale.y, scale.z);
            }
        }
    }
}

function setGemsWord(geometry, colors, instancePositions, instanceQuaternions, instanceScales) {
    const patternH = 320;
    const patternW = patternH * rasterSize.Width / rasterSize.Height;

    const h = Math.sqrt(rasterSize.Height * rasterSize.Width / raster.Statistics.TotalPoints);

    const nGemsD = 3; // gem depth - n of layers
    const nGemsH = rasterSize.Height / h; // Z step

    const scalefactor = (patternH / nGemsH) * 3.0;

    for (let i = 0, l = geometry.attributes.position.count; i < l; i++) {
        colors.push(Math.random(), Math.random(), Math.random());
    }

    geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, vertexColors: THREE.VertexColors });

    // in ShowRaster:
    forEachRasterPoint(raster, myCallback);

    // callback({ X: pnt.X, Y: pnt.Y, iChar: i, iPoint: j, iLine: pnt.LineIndex});
    function myCallback(param) {
        for (let k = 0; k < nGemsD; k++) {
            const mesh = new THREE.Mesh(geometry, material);

            const quaternion = mesh.quaternion;
            const scale = mesh.scale;

            quaternion.set(0, 0, 1, 1);
            quaternion.normalize();
            scale.set(scalefactor, scalefactor, scalefactor / 2);

            mesh.position.x = param.X * patternW / rasterSize.Width;
            mesh.position.y = -param.Y * patternH / rasterSize.Height;
            mesh.position.z = k * 3 * nGemsH;

            scene.add(mesh);

            // instanced attribute data
            instancePositions.push(mesh.position.x, mesh.position.y, mesh.position.z);
            instanceQuaternions.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
            instanceScales.push(scale.x, scale.y, scale.z);
        }
    }
}

function setSpheresWord(imgTexture, bumpScale, reflectionCube) {
    var patternH = 320;
    var patternW = patternH * rasterSize.Width / rasterSize.Height;

    // Calc approx inter-point distance - (1 - 4) - very tight!.
    var k = 0;
    for (var i = 0; i < raster.length; i++) {
        k += raster[i].length;
    }
    h = Math.sqrt(rasterSize.Height * rasterSize.Width / k);

    var nSpheresD = 3;
    var nSpheresH = rasterSize.Height / h;

    var sphereRadius = (patternH / nSpheresH) * 0.3;
    var stepD = 1.0 / nSpheresD;

    var geometry = new THREE.SphereBufferGeometry(sphereRadius, 32, 16);

    for (i = 0; i < raster.length; i++) {
        for (var j = 0, alphaIndex = 0; j < raster[i].length; j++, alphaIndex++) {
            if (raster.length > 1) {
                // Charwise
                alpha = i / raster.length;
            }
            else {
                alpha = raster[i][j].X / rasterSize.Width;
            }

            beta = raster[i][j].Y / rasterSize.Height;
            var specularColor = new THREE.Color(alpha * 0.2, alpha * 0.2, alpha * 0.2);
            var specularShininess = Math.pow(2, beta * 10);

            for (var gamma = 0; gamma <= 1.0; gamma += stepD) {
                // basic monochromatic energy preservation
                var diffuseColor = new THREE.Color().setHSL(alpha, 0.5, gamma * 0.5 + 0.1).multiplyScalar(1 - beta * 0.2);

                var material = new THREE.MeshPhongMaterial({
                    map: imgTexture,
                    bumpMap: imgTexture,
                    bumpScale: bumpScale,
                    color: diffuseColor,
                    specular: specularColor,
                    reflectivity: beta,
                    shininess: specularShininess,
                    envMap: alphaIndex % 2 === 0 ? null : reflectionCube
                });

                var mesh = new THREE.Mesh(geometry, material);

                mesh.position.x = alpha * patternW - patternW / 2;
                mesh.position.y = patternH / 2 - beta * patternH;
                mesh.position.z = gamma * sphereRadius * 3 * nSpheresD - nSpheresD * h / 2;

                scene.add(mesh);
            }
        }
    }
}
//#endregion

//#region ANIMATION LOOP
// initAll() scenario-specific part
let divScene;
function initAllCustom() {
    console.log("initAllCustom(void)");

    let ready = true;
    return ready;
}
function render(timestamp) {
    var timer = Date.now() * 0.00025;

    if (!entryCheck())
        return;

    // check exit condition - maxTurns (passing ove 0)
    var angle = controls.getAzimuthalAngle();

    if (prevangle >= 0 && angle <= 0) { nTurns++; }
    if (nTurns > maxTurns)
    {
        console.log("render(): gameOver");
        gameOver = true;
    }

    // DEBUG
    // let msg = 'angle: ' + angle + "<br>prevangle: " + prevangle + '<br>nTurns: ' + nTurns + '<br>maxTurns: ' + maxTurns
    // document.getElementById("info").innerHTML = msg;

    prevangle = angle;

    // to avoid recording of blur screen the recorder is set to pause initially.
    resumeRecord();

    //camera.position.x = Math.cos( timer ) * 800;
    //camera.position.z = Math.sin( timer ) * 800;
    controls.update();

    camera.lookAt(scene.position);
    particleLight.position.x = Math.sin(timer * 7) * 300;
    particleLight.position.y = Math.cos(timer * 5) * 400;
    particleLight.position.z = Math.cos(timer * 3) * 300;

    renderer.render(scene, camera);
}

// scenario-specific
function exitCheckCustom() {
    console.log('exitCheckCustom()');
    audio.stop();
}
//#endregion

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

    // no sound

    return true;
}

// called from scenario_three_template:startShow()
function startShowCustom() {
    audio.play();     // turn on audio stream
    console.log('startShowCustom(): void');
}

function setMobileRecorderCustom(recorder) {
    recorder.canvas = canvas;
}

function sceneRemoveCustom() {
    $('div#container').remove();

    let canvases = $('canvas');
    for (let i = 0; i < canvases.length; i++) {
        console.log('Removing canvas', i, ':', canvases[i].id);
        canvases[i].remove();
    }
}
//#endregion