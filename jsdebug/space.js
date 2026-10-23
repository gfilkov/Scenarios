/*
Updated to standard MoW HTML.
Init, startButton listener: on window load;
Animation: on startButton click.
*/

var scenario = "space";
var recordingDisabled = false;
var recordingChecked = false;

const DQ = 0.03;           // Density Quotient
const distFactor = 10;	 // Z0 = window.innerWidth * distFactor;
const showTime = 20.0;	// seconds
const bestZfactor = 2.5;

var scene, camera, renderer;

const root = '';    // '../';
const bkgImageSrc = root + 'textures/magellanic-clouds.png';
let textureBkg;

const crackImageSrc = root + 'textures/broken-glass-t.png';
let imageCrack; // Image! not texture. THREE.texture is a warapper around image.

const hitSoundSrc = root + 'sounds/Balloon Popping-SoundBible.com-1247261379.mp3';
const ambientSoundSrc = root + 'sounds/alien-spaceship_daniel_simion.mp3';

// attempt to set multiple Audioinstances for the same sound:

let listener = new THREE.AudioListener();

var hitSounds = [];
var bgAudio;
var nHits = 0;

var material, rocks;
var angle = 0;
var rockSize;

// defined in ShowRaster: raster, rasterSize;

//// Scene measures
var scale;
var patternW, patternH;

// best viewing distance - shift initial rock x and y according to z	
var bestZ = window.innerWidth * bestZfactor;

/////// blast ///////
var movementSpeed = 80;
var totalObjects = 1000;
var objectSize = 10;
var sizeRandomness = 4000;
var colors = [0xFF0FFF, 0xCCFF00, 0xFF000F, 0x996600, 0xFFFFFF];
var dirs = [];
var parts = [];
//

// glitch
var renderPass;
var effectGlitch;
var composer;
//

let hitsound;
let washit = false;
let wascracked = false;     // crack on the glass

var params = {
    rasterDim: 0,
    rasterCount: 0,
    rasterW: 0,
    rasterH: 0,
    windowW: window.innerWidth,
    windowH: window.innerHeight,
    camera_far: 0,
    camera_Z0: 0,
    time: 0.0,
    camera_Z: 0.0
};

var canvas; // created with Scene; id='scene', bkg texture
var canvasText; // id='text' (on top)
let rasterData;

//#region RASTER
//// no slogans in this scenario: single page
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
}//#endregion RASTER






// DeepSeek: Function to center the canvas horizontally (using my setVideoSize())
// it stays custom because we need to center all additional canvases as well
function centerCanvas() {
    // scenario_trhree_template.js: returns max contained size of given aspect
    let size = setVideoSize(16, 9);

    // Calculate the left margin to center the canvas
    const marginLeft = (window.innerWidth - size.W) / 2;

    // Apply the margin to the canvas
    canvas.style.marginLeft = `${marginLeft}px`;
    canvasText.style.marginLeft = `${marginLeft}px`;

    // apply the same to 'preview' video
    const preview = document.getElementById("divPreview");

    if (null != preview) {
        preview.style.position = "absolute";
        preview.style.marginLeft = `${marginLeft}px`;
    }
}
// Re-center the canvas on window resize
window.addEventListener('resize', centerCanvas);

// poor-man version of AssetLoader for three.js
var assets = 6;
var assetsCount = 0;
initAssets();
function initAssets() {
    console.log('initAssets()');

    // fullscreen: does not work here. Why?
    if (!DEBUG && screenfull.enabled) {
        screenfull.request();
    }


    // LOADING; asset #0: raster, checkAsset called from rasterReady()

    // load audio
    /// THREE.Audio version:
    const audioLoader = new THREE.AudioLoader();


    // #1
    bgAudio = new THREE.Audio(listener);

    //Load a sound and set it as the Audio object's buffer
    audioLoader.load(ambientSoundSrc, function (buffer) {
        bgAudio.setBuffer(buffer);
        bgAudio.setLoop(true);
        bgAudio.setVolume(0.1);

        assetsCount++;
        checkAssets(assets, assetsCount, 'ambientSound');
    });

    // #2: hit sounds
    audioLoader.load(hitSoundSrc, function (buffer) {
        for (let i = 0; i < 4; i++) {
            //let audio = new THREE.PositionalAudio(listener);

            let audio = new THREE.Audio(listener);

            audio.setBuffer(buffer);
            audio.userData = { index: i };

            audio.onEnded = () => {
                console.log('audio.onEnded:', audio.userData.index);
                audio.isPlaying = false;
                startTime = 0.0;
            }

            hitSounds.push(audio);
        }

        assetsCount++;
        checkAssets(assets, assetsCount, 'hitSound');
    });

    // #3: background image
    textureBkg = new THREE.TextureLoader().load(bkgImageSrc, function () {
        assetsCount++;
        checkAssets(assets, assetsCount, 'textureBkg');
    });

    // #4: crack image
    let textureCrack = new THREE.TextureLoader().load(crackImageSrc, function (texture) {
        imageCrack = texture.image;
        assetsCount++;
        checkAssets(assets, assetsCount, 'textureCrack');
    });

    // #5: rock texture
    var textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = true;
    textureLoader.load(root + 'textures/rock-texture.jpg', function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        material = new THREE.MeshLambertMaterial({ map: texture });
        // createRocks(); => init(); - called after all assets loaded.

        assetsCount++;
        checkAssets(assets, assetsCount, 'rock-texture');
    });
}


// called from scenario_three_template:startShow()
function startShowCustom() {
    bgAudio.play();     // turn on audio stream
}

// called from MoW_templates::checkAssets()
function init() {
    console.log('init()');

    initScene();
//#//    setgui();
    initLights();
    createRocks();

    parts.push(new ExplodeAnimation(0, 0, 0));
}

// set gui controls and values
function setgui() {
    var gui = new dat.GUI();
    var fRaster = gui.addFolder('Raster');
    var fScene = gui.addFolder('Scene');
    fRaster.add(params, 'rasterDim', params.rasterDim);
    fRaster.add(params, 'rasterCount', params.rasterCount);
    fRaster.add(params, 'rasterW', params.rasterW);
    fRaster.add(params, 'rasterH', params.rasterH);
    fScene.add(params, 'time', params.time).listen();
    fScene.add(params, 'windowW', params.windowW).listen();
    fScene.add(params, 'windowH', params.windowH).listen();
    fScene.add(params, 'camera_far', params.camera_far);
    fScene.add(params, 'camera_Z0', params.camera_Z0);
    fScene.add(params, 'camera_Z', params.camera_Z).listen();

    gui.closed = true;
}

function initScene() {
    console.log('initScene()');

    // set renderer ratio to 16:9
    let size = setVideoSize(16, 9); // scenario_three_template

    // for scenario_three_template::startRecording() gameWidth/gameHeight must be defined,
    // otherwise it will be window inner size.
    gameWidth = size.W;
    gameHeight = size.H;

    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(gameWidth, gameHeight);
    document.body.appendChild(renderer.domElement);

    scene.background = textureBkg;

    // on smaller displays rocks are crowding one another. Rock radius ~ 10 - 20
    // Calc inter-rock distance and adjust scale if < 50 (2.5 * Rmax)
    params.rasterDim = raster.Characters.length;
    params.rasterCount = raster.Statistics.TotalPoints;
    params.rasterH = rasterSize.Height;
    params.rasterW = rasterSize.Width;

    scale = gameWidth / rasterSize.Width;
    patternW = rasterSize.Width * scale;
    patternH = rasterSize.Height * scale;

    // R^2 * N  == (patternW * patternH) * DQ
    rockSize = Math.sqrt(patternW * patternH * DQ / params.rasterCount);

    params.camera_far = gameWidth * distFactor;
    params.camera_Z0 = params.camera_Z = params.camera_far;

    camera = new THREE.PerspectiveCamera(80, gameWidth / gameHeight, 0.1, params.camera_far);
    camera.position.z = params.camera_Z0;
    camera.add(listener);

    // glitch //
    renderPass = new THREE.RenderPass(scene, camera);

    effectGlitch = new THREE.GlitchPass(64);
    effectGlitch.renderToScreen = true;

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(effectGlitch);

    //// Canvases: created by THREE.js and custom bkg
    canvas = $('canvas')[0];
    canvas.id = 'scene';
    canvas.style.position = 'fixed';
    canvas.style.zIndex = -2;

    canvasText = document.createElement('canvas');
    canvasText.id = 'text';
    canvasText.width = canvas.width;
    canvasText.height = canvas.height;

    canvasText.style.position = 'relative'; // 'absolute'; disables zIndex !?
    canvasText.style.top = '0px';
    canvasText.style.left = '0px';
    canvasText.style.zIndex = -1;

    let context = canvasText.getContext('2d');
    context.fillStyle = '#b200ff';
    context.font = "3vh Arial";     // 3% of height
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    document.body.appendChild(canvasText);

    // Center the canvas initially
    centerCanvas();
}

function createRocks() {
    console.log('createRocks()');

    rocks = [];

    // in ShowRaster:
    forEachRasterPoint(raster, myCallback);

    // callback({ X: pnt.X, Y: pnt.Y, iChar: i, iPoint: j, iLine: pnt.LineIndex});
    function myCallback(param) {
        let x = param.X * scale;
        let y = -param.Y * scale;

        let r = new Rock();
        r.userData = { hit: 0 };
        // position rocks per raster
        r.mesh.position.z = patternH + Math.random() * patternH;

        // correct position x,y to comply with best viewing distance
        var z = r.mesh.position.z;
        r.mesh.position.x = x * (1 - z / bestZ);
        r.mesh.position.y = y * (1 - z / bestZ);

        rocks.push(r);
    }
}

function initLights() {
    console.log('initLights()');

    var light = new THREE.PointLight(0xFFFFFF);
    //  light.position.set( 300, 300, 0 );
    light.position.set(patternH, 0, patternW);
    scene.add(light);

    // Add White directional light at full intensity shining from right-top-behind.
    var directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1);    // right-top-behind
    scene.add(directionalLight);

    // DEBUG
    /*
    var dirlLightRed = new THREE.DirectionalLight(0xff0000, 1.0);
    dirlLightRed.position.set(1, 1, 1);    // right-top-behind
    var dirlLightBlue = new THREE.DirectionalLight(0x0000ff, 1.0);
    dirlLightBlue.position.set(1, -1, 1);    // right-bottom-behind
    scene.add(dirlLightRed);
    scene.add(dirlLightBlue);
    */
}

function Rock() {
    // init
    // var size = 10 + Math.random() * 10;
    // Calc size from DQ - Density Quotient
    // bannerArea*DQ = assetH*assetW^2*N => rasterSize.Width * rasterSize.Height * scale^2 * DQ = size^2 * N
    // N: params.rasterCount

    var size = rockSize + Math.random() * rockSize;

    var geometry = new THREE.IcosahedronGeometry(size, 0);
    var icosahedron = new THREE.Mesh(geometry, material);

    for (var i = 0, l = geometry.vertices.length; i < l; i++) {
        geometry.vertices[i].x += size * -0.25 + Math.random() * size * 0.5;
        geometry.vertices[i].y += size * -0.25 + Math.random() * size * 0.5;
    }

    // rotate cube
    var variance = 0.04; // 0.01;
    this.vr = {
        x: -variance + Math.random() * variance * 2,
        y: -variance + Math.random() * variance * 2
    }
    scene.add(icosahedron);
    this.mesh = icosahedron;
}

Rock.prototype.rotate = function () {
    this.mesh.rotation.x += this.vr.x;
    this.mesh.rotation.y += this.vr.y;
}

//#region ANIMATION LOOP
// initAll() scenario-specific part
function initAllCustom() {
    console.log("initAllCustom()");

    let ready = true;
    if (undefined === canvas) {
        canvas = $('canvas')[0];
        ready = false;
    }

    // Mobile device or debug mode
    if (MOBILE) {
        // 4: canplaythrough
        if (bgAudio.readyState < 4) {
            ready = false;
        }
    }

    // Center the canvas initially
    centerCanvas();

    return ready;
}

// crack params
let dx, dy;
let tx, ty;
let swidth, sheight;
let width, height; // scale down

let pauseTime = 6;

function render(timestamp) {
    //    console.log('render()');    // DEBUG

    if (!entryCheck())
        return;

    let delta = timer.getDelta();
    params.time = elapsed = timer.getElapsed();   // secs

    // exit condition: was hit or all rocks passed for sure:
    // if user message: display and wait; then exit
    // if (camera.position.z < -500 || washit) {
    if (camera.position.z < -500) {
        console.log('gameOver: camera.position.z:', camera.position.z);

        // => at the end of render(), after textCanvas is cleared
        // messageOnCanvas(canvasText, myMessage, { clear: false, strokeColor: 'white' });

        // let pt = null == rasterParams.message ? 0 : pauseTime;

        // give user additional time to read the message, if no recording
        let pt = !recorder && rasterParams.message ? pauseTime: 0;

        gameOver = pt;   // wait pt secs and exit
        return;
    }

    /////// blast ///////
    let pCount = parts.length;
    while (pCount--) {
        parts[pCount].update();
    }
    //

    // display DISTANCE message
    let context = canvasText.getContext('2d');

    if (camera.position.z > params.camera_far) {
        composer.render(delta);   // glitch
    }
    else if (rockHit(4.0)) {
        washit = true;
        context.fillStyle = 'red';
        composer.render(delta);   // glitch
    }
    else {
        renderer.render(scene, camera);
    }

    rotateRocks();

    // updateCamPosition(delta);
    updateCamPosition(elapsed);

    // "DISTANCE" message
    let message = washit ? 'Meteorite hit!' : 'Meteorite hazard! DISTANCE: ' + Math.round(camera.position.z);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillText(message, (canvas.width / 2), (canvas.height / 32));

    if (camera.position.z < 0)
        messageOnCanvas(canvasText, rasterParams.message, { clear: false, strokeColor: 'white' });

    // crack on glass
    if (washit) {
        // context.drawImage(img, sx, sy, swidth, sheight, x, y, width, height)
        /*
        Param	Description
        img	    Specifies the image, canvas, or video element to use	 
        sx	    Optional.The x coordinate where to start clipping	
        sy	    Optional.The y coordinate where to start clipping	
        swidth	Optional.The width of the clipped image	
        sheight	Optional.The height of the clipped image	
        x	    The x coordinate where to place the image on the canvas	
        y	    The y coordinate where to place the image on the canvas	
        width	Optional.The width of the image to use(stretch or reduce the image)	
        height	Optional.The height of the image to use(stretch or reduce the image)
        */

       // calc params once
        if (!wascracked) {
            // mow::random(min, max)
            dx = canvasText.width / 8;
            dy = canvasText.height / 8;
            tx = random(dx, canvasText.width - dx);
            ty = random(dy * 2, canvasText.height - dy);
            swidth = imageCrack.width;
            sheight = imageCrack.height;
            twidth = swidth / 2; // scale down
            theight = sheight / 2;

            tx -= twidth / 2;   // start corner of target img
            ty -= theight / 2,

            wascracked = true;
        }

        context.drawImage(imageCrack, 0, 0, swidth, sheight, tx, ty, twidth, theight);

        // ### DEBUG
        // console.log(`imageCrack: swidth: ${swidth} sheight: ${sheight} tx: ${tx} ty: ${ty} twidth: ${twidth} theight: ${theight}`);

        // attempt to rotate did not work
    }
}

// scenario-specific
function exitCheckCustom() {
    console.log('exitCheckCustom()');

    // stop audio; NB: annoying differences between THREE.PositionalAudio and DOM AUDIO element
    // DOM <AUDIO> element
    if (!bgAudio.paused) {
        console.log('stop audio');
        bgAudio.pause();
    }
}
//#endregion

function rotateRocks() {
    rocks.forEach((element) => { element.rotate(); });
}

// camera is hit if cam.z < rock.r and dist is < rock.r*factor
// plays hit sound and returns true if hit
let dbgHits = 0;
function rockHit(factor) {
    let ret = false;
    if (typeof rocks === 'undefined') {
        return false;
    }

    rocks.forEach((rock, idx, arr) => {
        // if not hit yet
        if (1 !== rock.userData.hit) {
            const bs = rock.mesh.geometry.boundingSphere;

            if (bs) {
                let rad = bs.radius;

                if (Math.abs(camera.position.z - rock.mesh.position.z) < rad) {
                    var dist = camera.position.distanceTo(rock.mesh.position);
                    if (dist < factor * rad) {
                        ret = true;
                        // mark the object that had impact
                        rock.userData = { hit: 1 };
                        // hit sound
                        // sharing the same audio buffer is not good.
                        // works, but sound is more scratching than bang

                        console.log("Hit. nHits:", nHits);
                        if (nHits < 4) {
                            let sound = hitSounds[nHits];

                            console.log('isPlaying:', sound.isPlaying);
                            console.log('startTime:', sound.startTime);
                            console.log('offset:', sound.offset);
                            console.log('context.state:', sound.context.state);

                            sound.isPlaying = false;
                            sound.offset = 0.0;
                            sound.startTime = 0.0;
                            sound.setVolume(1);

                            sound.play();

                            nHits++;
                            dbgHits++;
                            console.log('hits:', dbgHits);
                        }
                        else {
                            nHits = 0;
                        }
                    }
                }
            }
        }
    });

    return ret;
}

function updateCamPosition(elapsed) {
    var z = params.camera_Z0 - params.camera_Z0 / showTime * elapsed;

    // DEBUG: to review lighting
    // if (z < 1500) return;

    camera.position.z = z;
    params.camera_Z = camera.position.z;
}

/////// blast ///////
function ExplodeAnimation(x, y, z) {
    var geometry = new THREE.Geometry();

    for (i = 0; i < totalObjects; i++) {
        var vertex = new THREE.Vector3();
        vertex.x = x;
        vertex.y = y;
        //        vertex.z = 0;
        vertex.z = z;

        geometry.vertices.push(vertex);
        // this forms the blast cloud of perfect square shape
        // dirs.push({ x: (Math.random() * movementSpeed) - (movementSpeed / 2), y: (Math.random() * movementSpeed) - (movementSpeed / 2), z: (Math.random() * movementSpeed) - (movementSpeed / 2) });

        // try to make it round:
        let r = Math.random() * 2.0;
        let f = Math.random() * 2 * Math.PI;
        let x0 = r * Math.cos(f);
        let y0 = r * Math.sin(f);
        dirs.push({ x: (x0 - 0.5), y: (y0 - 0.5), z: (Math.random() * movementSpeed) - (movementSpeed / 2) });
    }
    var material = new THREE.ParticleBasicMaterial({ size: objectSize, color: colors[Math.round(Math.random() * colors.length)] });
    var particles = new THREE.ParticleSystem(geometry, material);

    this.object = particles;
    this.status = true;

    var r = (Math.random() * movementSpeed) - (movementSpeed / 2);
    var f = Math.random() * 2 * Math.PI;
    this.xDir = r * Math.cos(f);
    this.yDir = r * Math.sin(f);
    // move towards camera
    this.zDir = -Math.abs((Math.random() * movementSpeed) - (movementSpeed / 2));

    scene.add(this.object);

    this.update = function () {
        if (this.status === true) {
            var pCount = totalObjects;
            while (pCount--) {
                var particle = this.object.geometry.vertices[pCount];
                particle.y += dirs[pCount].y;
                particle.x += dirs[pCount].x;
                particle.z += dirs[pCount].z;
            }
            this.object.geometry.verticesNeedUpdate = true;
        }
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
    if (undefined === bgAudio) {
        console.log('sound undefined, exiting');
        return false;
    }

    return true;
}
// called from scenario_three_template:startShow()
function setMobileRecorderCustom(recorder) {
    recorder.bgCanvas = canvas;
    recorder.canvas = canvasText;
}

function sceneRemoveCustom() {
    canvasText.remove();
    canvas.remove();
}
//#endregion