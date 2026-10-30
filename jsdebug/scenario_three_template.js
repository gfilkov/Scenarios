/* generic template for THREE-based scenarios.
* Provides for:
* - loop
* - loop exit
* - recorder
* - recorded video preview.
*/

window.addEventListener("resize", onresize, false);	// useCapture = false

function onresize() {
    // expected for all my scripts:
    if (gameWidth !== 'undefined') {
        let size = setVideoSize(16, 9); // scenario_three_template

        gameWidth = size.W;
        gameHeight = size.H;

        if (container) {
            container.style.setProperty('width', gameWidth + 'px', 'important');
            container.style.setProperty('height', gameHeight + 'px', 'important');
        }

        //.error happens in Azure (depends on scripts loading order?)
        if (renderer) {
            renderer.setSize(gameWidth, gameHeight);
            console.log(`renderer: ${renderer}`);
        }
        return;
    }

    // otherwise:
    if (typeof camera !== 'undefined') {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

        // check if params exist in the scenario script
        if (typeof params !== "undefined") {
            params.windowW = window.innerWidth;
            params.windowH = window.innerHeight;
        }
    }
}

// common vars
var isCaptureResolved = false;
var initialized = false;
// var gameOver = false;
var gameWidth, gameHeight;

// CHANGE: gameOver < 0: continue; gameOver == 0: stop; gameOver > 0: stop after delay (sec)
var gameOver = -1;

// startButton => MoW_template.startScenario() => this.startShow()
function startShow() {
    console.log("scenario_three_template::startShow()");

    //if (reqRecord) {
    //    isCaptureResolved = false;
    //    startRecording();	// resolved in startCallback
    //}
    //else {
    //    isCaptureResolved = true;	// no capture required
    //}

    // startRecird: scenario_three_template::initAll()

//    isCaptureResolved = !reqRecord;
    isCaptureResolved = !reqCapture && !reqRTC;

    // scenario specific optional: start ambient media, start ticker for sprite-based scenarios
    if (typeof startShowCustom === "function") {
        // safe to use the function
        startShowCustom();
    }

    if (typeof ticker === 'undefined') {
        // THREE-based
        loopStart();
    }
    else {
        // SPRITE-based
        ticker.run();
    }
}


//#region ANIMATION LOOP
// NB: before I introduced this loop framework, the loop was running endlessly, endlessly calling exitCheck()
// now I have loopStart and loopStop commands
// NB: framework as is not always work as expected, (never stops after recording in debug mode).
// to enforce sure stop I will:
//    1: introduce loopRunning var;
//    2: rename loopStart() to loopContinue();
//    3: loopStart will be just setting loopRunning = true

var requestId;
var timer = new Timer();  // THREE.Timer
let loopRunning = false;    // added

function animate(timestamp) {
    //    console.log('animate()');

    requestId = undefined;

    // timestamp is optional
    timer.update(timestamp);

    if (!initialized) {
        initialized = initAll();
    }

    if (gameOver >= 0) {
        exitCheck();
    }

    if (initialized) {
        render(timestamp);
    }

    // it is actually: start-or-continue
    if (loopRunning) {
        loopContinue();
    }
    else {
        loopStop();
    }
}

function loopStart() {
    console.log('scenario_three_template::loopStart()');

    loopRunning = true;
    loopContinue();
}

function loopContinue() {
    //    console.log('loopContinue()');

    if (!requestId) {
        requestId = window.requestAnimationFrame(animate);
    }
}

function loopStop() {
    console.log('scenario_three_template::loopStop()');

    loopRunning = false;

    if (requestId) {
        window.cancelAnimationFrame(requestId);
        requestId = undefined;
    }
}

// returns bool initialized
// init here all common objects; for scenario-specific call initAllCustom()
// WTF!!! "Aw, snap!" idiotic message may be caused by the 'endless' loop. Add check:
let ntries = 64;
let msg = "";
function initAll() {
    console.log("scenario_three_template::initAll()");

    let ready = true;

    if (ntries-- < 0) {
        alert(`Exiting: ${msg}`);
        stopShow();
    }

    if (!isRasterReady) {
        isRasterReady = rasterCount > 0;
        ready = false;
        msg = 'No raster!';
    }

    // recording
    // NB: I can't rely on startCallback to set the flag: when the window is blurred none of my code works!
    // set flag here to avoid recording of blur screen.
    if (!isCaptureResolved && null === recorder) {
        // main canvas is the must for recorder.
        // If user does not need main canvas, it has to be set to null.

        msg = 'No recorder!';

        // another attempt to start recording:
        // startRecording() calls < scenario >:: sceneReady()
        startRecording();

        isCaptureResolved = recorder?.ready;
    }

    // scenario-specific: let it know if everything is ready here.
    if (!initAllCustom(ready)) {
        ready = false;

        msg = 'initAllCustom() is not ready!';
    }

    return ready;
}

// call at the beginning of render() to check if everything is ready
function entryCheck() {
    // console.log("scenario_three_template::entryCheck()");

    if (!initialized) {
        initialized = initAll();
        return false;
    }

    // if recording not started web capture (user did not click [Allow])
    // run idle loops; no recording - no animations

    if (!isCaptureResolved) {
        // recording requested
        if (null === recorder.recorder) {
            // recording not started (no Allow yet)
            return false;
        }
        else {
            // timer.reset();
            timer = new Timer();
            isCaptureResolved = true;
        }
    }

    if (gameOver >= 0) {
        exitCheck();
    }

    // to avoid recording of blur screen the recorder is set to pause initially.
    resumeRecord();

    return true;
}

// for unknown to me yet reason endless loop happens here when there is no preview.src
// endless loop without any error logging! Adding safety valve: tries
let tries = 128;
const delay = ms => new Promise(res => setTimeout(res, ms));
async function exitCheck() {
    console.log("scenario_three_template::exitCheck()");

    ////////// DEBUG
    //alert('Testing delay: 8000');
    //await delay(8000);
    //alert('Done');
    //////////

    // safety catch; exitCheck should be called only after gameOver flagged.
    if (gameOver < 0)
        return;

    // scenario-specific, optional
    if (typeof exitCheckCustom === "function") {
        // safe to use the function
        exitCheckCustom();
    }


    if (null === recorder) {
        loopStop();
        if (0 == gameOver)
            stopShow();	// mow.js
        else {
            await delay(gameOver * 1000);
            stopShow();
        }
        return;
    }

    // poor-man async record handling
    if (recorder.recorder.state === "recording") {
        console.log('exitCheck(): stop recorder');

        await delay(2);
        recorder.stopRecorder();
        return;
    }

    if (previewSrc !== null && previewSrc.length > 0) {
        console.log('exitCheck(): showPreview');
        // stopShow(); <- btnBack

        if (undefined === $('#divPreview')[0]) {
            loopStop();
            showPreview();
        }
    }
    else if (tries-- > 0) {
        console.log("exitCheck(): ERROR: previewSrc: '" + previewSrc + "'");
        await delay(250);   // 1/4 sec
    }
    else {
        alert("exitCheck(): ERROR: previewSrc: '" + previewSrc + "'");
        loopStop();
        stopShow();	// mow.js; error: stop at once
        return;
    }
}
//#endregion

//#region CAPTURE

// isCaptureResolved = true when:
// reqRecord not checked, or
// user has cancelled record request, or
// recording cancelled by exception, or
// recording is good to start

let recorder = null;	// GfWebRecorder class

// debug switch to pretend playing on mobile
let MOBILE = isMobile();

// important to skip blurred screen in recording.
window.addEventListener('blur', pauseRecord);
window.addEventListener('focus', resumeRecord);

function pauseRecord() {
    if (null === recorder) return;
    if (null === recorder.recorder) return;
    if (recorder.recorder.state == "recording") {
        console.log('paused');
        recorder.recorder.pause();
    }
}

function resumeRecord() {
    if (null === recorder) return;
    if (null === recorder.recorder) return;
    if (recorder.recorder.state == "paused") {
        recorder.recorder.resume();
    }
}

// Get viewport size enclosed in window using ratio params, int; default: (16, 9)
// (necessary for video publishing, it should have standard ratio)
function setVideoSize(w, h) {
    // use mow_templates::tryFullScreen()
    tryFullScreen();

    if (undefined === w) {
        // set to default 16:9
        w = 16;
        h = 9;
    }

    let rw = window.innerWidth / w;
    let rh = window.innerHeight / h;

    // rh > rw: tall narrow screen, align by W
    // rh < rw: wide low screen, align by H
    let r = Math.min(rw, rh);

    return { W: Math.floor(r * w), H: Math.floor(r * h) };
}

// set RTC params for GfWebRecorder
function setMobileRecorder(recorder) {
    console.log("scenario_three_template::setMobileRecorder()");

    // scenario script:
    setMobileRecorderCustom(recorder);

    if(typeof listener === "undefined") {
        console.log('WARNING: listener undefined! No sound will be recorded.');
        return;
    }

    // get audiostream from the LIstener (whatever the Listener is listening to) and add it to Recorder.
    const context = listener.context;
    context.resume();
    let gainNode = listener.getInput();	// GainNode
    const destination = context.createMediaStreamDestination();	// MediaStreamAudioDestinationNode
    gainNode.connect(destination);

    // mediaRecorder = new MediaRecorder(destination.stream);
    recorder.audioStream = destination.stream;
}

//// DeepSeek: Ensure Even Dimensions
// Encoders often require even dimensions.Adjust the canvas width / height to be even numbers in both orientations:
function adjustToEven(num) {
    return num % 2 === 0 ? num : num - 1;
}

function startRecording() {
    console.log("scenario_three_template::startRecording()");

    if (!sceneReady()) {
        console.log("scenario::sceneReady(): false; exiting");
        return;
    }

    let W, H;

    if (gameWidth === undefined) {
        W = window.innerWidth;
        H = window.innerHeight;
    }
    else {
        W = gameWidth;
        H = gameHeight;
    }

    if (H > W) {
        // portrait
        //canvas.width = adjustToEven(screen.width);
        //canvas.height = adjustToEven(canvas.width * 9 / 16);
        W = adjustToEven(W);
        H = Math.round(W * 9 / 16);
        H = adjustToEven(H);
    }
    else {
        // landscape
        H = adjustToEven(H);
        W = Math.round(H * 16 / 9);
        W = adjustToEven(W);
    }

    recorder = new GfWebRecorder(W, H); // W, H - not used on desktop

    recorder.startCallback = startCallback;
    recorder.recordedCallback = recordedCallback;
    recorder.errorCallback = errorCallback;
    recorder.logCallback = logCallback;	// provides for logging from the recorder instance

    // if (MOBILE) {
    if (reqRTC) {
        // mobile device of debug parameter in url
        setMobileRecorder(recorder);

        recorder.startRTC();
        showRecIndicator();
        console.log("scenario_three_template::startRecording(): recorder.startRTC()");
    }
    else {
        recorder.start();
        console.log("scenario_three_template::startRecording(): recorder.start()");
    }
}

function startCallback(event) {
    console.log("scenario_three_template::startCallback()");
    console.log(event);
    isCaptureResolved = true;	// not waiting for recording anymore
    //timer.reset();    // surprize!? There is no real reset. Just re-create it.
    timer = new Timer();
}
function recordedCallback(recUrl) {
    console.log("scenario_three_template::recordedCallback()");
    console.log(recUrl);

    hideRecIndicator();

    previewSrc = recUrl;
}
function errorCallback(error) {
    console.log("scenario_three_template::errorCallback()");
    console.log(error);
    isCaptureResolved = true;	// not waiting for recording anymore
    recorder = null;	// flag no record
}

// provides for logging from the recorder instance
function logCallback(message) {
    console.log(message);
}


function showPreview() {
    console.log("scenario_three_template::showPreview()");

    // NB: extra VIDEO elements created by video-stream-merger.
    // On the preview stage we need just one: video#preview.
    // I have modified video-stream-merger to assign IDs to VCIDEOs: 'mrgr_0', 'mrgr_1'...
    // Remove them here:
    let videos = $('video');
    for (let i = 0; i < videos.length; i++) {
        //if (videos[i].id.startsWith('mrgr_'))
        if (videos[i].id != 'videoPreview')
            videos[i].remove();
    }

    sceneRemoveCustom();

    // ### this cost me a lot of nerves!
    if (undefined === gameWidth)
        alert("scenario_three_template::showPreview() ERROR: 'gameWidth' undefined!");
    if (undefined === gameHeight)
        alert("scenario_three_template::showPreview() ERROR: 'gameHeight' undefined!");


    ////////////
    if (!previewOn)
        createPreview(gameWidth, gameHeight, previewSrc);
    ////////////
}

//#endregion

//#region PREVIEW
// Why this change: preview (buttons in particular)  looks different in different scenarios.
// Make it uniform: create it here for any scenario.

let previewSrc = null; // to be assigned in recordedCallback()
let previewOn = false;
let btnSave;    // will be reference outside of createPreview()
function createPreview(width, height, src) {
    // Create DIV - preview container
    const divPreview = document.createElement('div');
    divPreview.id = 'divPreview';
    document.body.appendChild(divPreview);

    // Create a video element
    const videoPreview = document.createElement('video');
    videoPreview.id = 'videoPreview';
    videoPreview.src = previewSrc;
    videoPreview.autoplay = false;
    videoPreview.controls = true;
    videoPreview.muted = false;
    videoPreview.style.zIndex = 1;
    divPreview.appendChild(videoPreview);

    // No need to wait for video load to find video size. We know it must be gameWidth, gameHeight.
    divPreview.style.width = `${width}px`;
    divPreview.style.height = `${height}px`;

    videoPreview.style.width = `${width}px`;
    videoPreview.style.height = `${height}px`;

    // Calculate the left margin to center the div
    const marginLeft = (window.innerWidth - width) / 2;

    // Apply the margin
    divPreview.style.marginLeft = `${marginLeft}px`;

    // calc buttons sizes
    let side = Math.min(gameWidth, gameHeight);
    let btnW = side / 6;    // 3 btns take half of the smaller side

    // create image buttons
    let btnSpace = btnW / 8;
    let btnLeft = marginLeft + btnSpace;
    const btnBack = createImageButton('imgs/arrows/video-back.png', btnSpace, btnLeft, btnW, btnW / 2);
    btnBack.style.zIndex = 2;
    divPreview.appendChild(btnBack);
    btnBack.addEventListener('click', () => {
        stopShow();
    });

    btnLeft += btnW + btnSpace;

    const btnPlay = createImageButton('imgs/arrows/video-play.png', btnSpace, btnLeft, btnW, btnW / 2);
    btnPlay.style.zIndex = 2;
    divPreview.appendChild(btnPlay);
    btnPlay.addEventListener('click', () => {
        if (videoPreview.paused)
            videoPreview.play();
        else
            videoPreview.pause();
    });

    btnLeft += btnW + btnSpace;

    btnSave = createImageButton('imgs/arrows/video-save.png', btnSpace, btnLeft, btnW, btnW / 2);
    btnSave.style.zIndex = 2;
    divPreview.appendChild(btnSave);
    btnSave.addEventListener('click', () => {
        download();
    });

    previewOn = true;
}

// Function to create a button with an image and semi-transparency. Params - in pixels
function createImageButton(imageUrl, top = '10px', left = '10px', width = '100px', height = '40px') {
    // Create the button
    const button = document.createElement('button');

    // Set the button's size
    button.style.width = `${width}px`;
    button.style.height = `${height}px`;

    // Set the image as the background
    button.style.backgroundImage = `url('${imageUrl}')`;
    button.style.backgroundSize = 'cover'; // Ensure the image covers the button
    button.style.backgroundPosition = 'center'; // Center the image

    // Make the image semi-transparent
    button.style.opacity = '0.7'; // 70% opacity

    // Add hover effect to make the button less transparent
    button.addEventListener('mouseenter', () => {
        button.style.opacity = '0.9'; // 90% opacity on hover
    });
    button.addEventListener('mouseleave', () => {
        button.style.opacity = '0.7'; // Restore 70% opacity
    });

    // Position the button
    button.style.position = 'absolute';
    button.style.top = `${top}px`;
    button.style.left = `${left}px`;

    // Add border and other styles (optional)
    button.style.border = '2px solid white';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';

    return button;
}

//#endregion PREVIEW

//#region SHARE
function download() {
    // download/share
    let shareManager = new ShareManager();

    // Create instance for more control
    const msg = `Share recording (using browser native Share API) and/or
Save recording to view/convert/share later`;
    const modal = new ModalDialog({
        title: 'SHARE / SAVE',
        message: msg,
        buttons: [
            { text: 'Share', type: 'primary', action: () => { onShare(); } },
            { text: 'Save', type: 'secondary', action: () => { onSave(); } },
            { text: 'Done', type: 'default', action: () => { onDefault(); } }
        ]
    });

    // Init shareManager
    shareManager.recordedBlob = recorder.recordedBlob;
    shareManager.filename = scenario;
    shareManager.type = 'webm';	// default

    function onShare() {
        shareManager.share();
    };
    function onSave() {
        shareManager.download();
    };
    function onDefault() {
        console.log('ShareManager::onDefault()');
    }
}
//#endregion SHARE

////////////////// OVERLAY
// Create container DIV, create canvas and overlayCanvas inside container, set attributes to container to center properly on the screen.
function createCanvases() {
    console.log("scenario_three_template::createCanvases()");

    // set renderer ratio to 16:9
    let size = setVideoSize(16, 9); // scenario_three_template

    // for scenario_three_template::startRecording() gameWidth/gameHeight must be defined,
    // otherwise it will be window inner size.
    gameWidth = size.W;	//1087
    gameHeight = size.H;	// 611

    // Back to good old container..?... ### create container DIV
    container = document.createElement('div');
    container.id = 'container';
    container.style.backgroundColor = 'green';

    ////////////////// IMPORTANT
    document.body.style.setProperty('overflow', 'hidden', 'important');

    document.body.appendChild(container);

    //////////////////////// center viewport
    container.style.setProperty('position', 'relative', 'important');
    container.style.setProperty('width', gameWidth + 'px', 'important');
    container.style.setProperty('height', gameHeight + 'px', 'important');

    container.style.setProperty('object-fit', 'contain', 'important');
    container.style.setProperty('object-position', '50% 50%', 'important');

    container.style.setProperty('margin-left', 'auto', 'important');
    container.style.setProperty('margin-right', 'auto', 'important');
    ////////////////////////

    // pre-create canvases
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.id = 'overlay';
    overlayCanvas.style.pointerEvents = 'none';
    overlayCanvas.style.setProperty('position', 'absolute', 'important');

    overlayCanvas.style.zIndex = "10";

    // IMPORTANT!!! spend quite a time in frustration to find out why my screen is black!
    overlayCanvas.style.backgroundColor = '#00000000';	// rgba(0, 0, 0, 0);

    overlayCanvas.width = gameWidth;
    overlayCanvas.height = gameHeight;

    container.appendChild(overlayCanvas);

    // pre-create canvases
    canvas = document.createElement('canvas');
    canvas.id = 'scene';
    canvas.style.pointerEvents = 'none';
    canvas.style.setProperty('position', 'absolute', 'important');

    canvas.width = gameWidth;
    canvas.height = gameHeight;

    container.appendChild(canvas);
}

// creates and overlay canvas for messages. Needs to be created first to stay on top
// default size: 300x150; needs further config after main canvas (later, when main canvas is created)
function createOverlayCanvas() {
    // Create overlay canvas
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.id = 'overlay';
    overlayCanvas.style.pointerEvents = 'none';
    document.body.appendChild(overlayCanvas);
    return overlayCanvas;
}

// returns overlay context configured after main (scene) canvas.
function setOverlay___(canvas, overlayCanvas) {
    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;

    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.left = `${canvas.offsetLeft}px`;
    overlayCanvas.style.top = `${canvas.offsetTop}px`;
    overlayCanvas.style.pointerEvents = 'none';
    overlayCanvas.style.backgroundColor = 'transparent';	// ### CRITICAL! got black screen whe lost it.

    // Style your context
    overlayContext = overlayCanvas.getContext('2d');

    // overlayContext.font = '12px Arial';
    // overlayContext.font = "5vh Arial";     // % of Viewport, not canvas height! Use canvas height instead:

    // Better font size calculation - ensures minimum readable size
    const baseSize = Math.max(24, canvas.height * 0.05); // At least 24px
    overlayContext.font = `${baseSize}px Arial`;

    overlayContext.fillStyle = 'white';
    overlayContext.strokeStyle = 'black';

    overlayContext.textAlign = 'center';
    overlayContext.textBaseline = 'top';    // position text rect by its top

    return overlayContext;
}

//Alternative: Scale the Entire Context
//Another approach is to scale your drawing operations to match the CSS display size:
function setOverlay(canvas, overlayCanvas) {
    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;

    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.left = `${canvas.offsetLeft}px`;
    overlayCanvas.style.top = `${canvas.offsetTop}px`;
    overlayCanvas.style.pointerEvents = 'none';
    overlayCanvas.style.backgroundColor = 'transparent';	// ### CRITICAL! got black screen whe lost it.

    overlayContext = overlayCanvas.getContext('2d');

    // Calculate scale factors
    const displaySize = getCanvasDisplaySize(canvas);
    const scaleX = displaySize.width / canvas.width;
    const scaleY = displaySize.height / canvas.height;

    // Scale the entire context
    overlayContext.scale(scaleX, scaleY);

    // Now you can use the original logical coordinates!
    const fontSize = canvas.height * 0.05;  // This will now scale correctly
    overlayContext.font = `${fontSize}px Arial`;

    // ... rest of setup ...

    return overlayContext;
}

// Get the CSS Display Size of the Canvas
function getCanvasDisplaySize(canvas) {
    // Get the actual displayed size in CSS pixels
    const rect = canvas.getBoundingClientRect();
    return {
        width: rect.width,
        height: rect.height
    };
}

// Do not reuse context:
// 1. Canvas may be resized - text will be botched.
// 2. I call this function only as necessary, not on every frame.
// function messageOnCanvas(canvasText, message, color = 'white', left = 0, top = 5) {
// Params: canvasText, message - mandatory
// 3rd param: optional object containing optional named parameters:
// left: % of canvas.width
// top: % of canvas.height
// fontFactor: font size: % of canvas.height
// color, strokeColor: string
//
// samples: all defaults:
// messageOnCanvas(overlayCanvas, settings.messageText);
// top and left params provided:
// messageOnCanvas(overlayCanvas, settings.messageText, { top: settings.messageTop, left: settings.messageLeft });
function messageOnCanvas(canvasText, message, { left, top, fontFactor, color, strokeColor, clear } = {}) {
    if (null == message) return;
    if ('' == message) return;

    // set defaults
    let _left = 50; // percent
    let _top = 10;
    let _fontFactor = 5;
    let _color = 'white';
    let _strokeColor = 'black';
    let _clear = true;
    //
    // overwrite defaults with optional named parameters' values
    let params = arguments[2];
    if (undefined != params) {
        if (undefined != params.left) _left = params.left;
        if (undefined != params.top) _top = params.top;
        if (undefined != params.fontFactor) _fontFactor = params.fontFactor;
        if (undefined != params.color) _color = params.color;
        if (undefined != params.strokeColor) _strokeColor = params.strokeColor;
        if (undefined != params.clear) _clear = params.clear;
    }

    let x = canvasText.width * _left / 100;
    let y = canvasText.height * _top / 100;

    let context = canvasText.getContext('2d');

    // memorize settings
    let ctx_font = context.font;
    let ctx_fillStyle = context.fillStyle;
    let ctx_strokeStyle = context.strokeStyle;

    // Now you can use the original logical coordinates!
    const fontSize = canvasText.height * _fontFactor / 100;  // This will now scale correctly
    context.font = `${fontSize}px Arial`;

    context.fillStyle = _color;
    context.strokeStyle = _strokeColor;

    context.textAlign = 'center';
    context.textBaseline = 'middle';

    if (_clear)
        context.clearRect(0, 0, canvasText.width, canvasText.height);

    context.fillText(message, x, y);
    context.strokeText(message, x, y);

    // restore settings
    context.font = ctx_font;
    context.fillStyle = ctx_fillStyle;
    context.strokeStyle = ctx_strokeStyle;
}
