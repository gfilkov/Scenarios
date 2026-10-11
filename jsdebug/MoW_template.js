// showOverlay() dynamically creates startButton
// onclick: startScenario() -> removes overlay; calls client's startShow()

//// global
var assetLoader;
// var reqRecord = false;

var xbCapture, xbRTC;
var reqCapture, reqRTC;

var DEBUG = false;

window.onerror = function (message, source, lineno, colno, error) {
	// Build your own message with source info
	const detailedMessage = `${message}\nFile: ${source}\nLine: ${lineno}:${colno}`;

	// Replace the default alert with something better
	console.error(detailedMessage);
	// Or use a custom UI, or still call alert with the richer text
	alert(detailedMessage);

	// Return true to suppress the default browser error handling
	return true;
};

//// DeepSeek:
//window.onerror = function (message, source, lineno, colno, error) {
//	const errorLog = {
//		message: message,
//		source: source,
//		line: lineno,
//		column: colno,
//		stack: error ? error.stack : null
//	};
//	console.error("Captured Error:", errorLog);

//	// Save the error to localStorage or send it to a server
//	localStorage.setItem('lastError', JSON.stringify(errorLog));

//	// Optionally, send the error to a server for logging
//	fetch('/log-error', {
//		method: 'POST',
//		headers: { 'Content-Type': 'application/json' },
//		body: JSON.stringify(errorLog)
//	});

//	// Return true to prevent the default error handling
//	return true;
//};
////


window.onload = function () {
	console.log('MoW_templates: window.onload()');

	// detect debug mode:
	//let dt0 = new Date();
	//debugger;
	//let dt1 = new Date();

	//if (dt1 - dt0 > 100) {
	//	// delay > 0.1 sec
	//	console.log('DEBUG mode detected');
	//	DEBUG = true;
	//}

	DEBUG = checkDebug();
	
	let divProgress = document.createElement('div');
	divProgress.id = "progress";
	document.body.appendChild(divProgress);
	
	let divPercent = document.createElement('div');
	divPercent.id = "percent";
	divPercent.innerHTML = "Downloading: <span id='progress-rate'></span>";
	divProgress.appendChild(divPercent);
	
	let progress = document.createElement('progress');
	progress.id = "progress-bar";
	progress.value = 0;
	divProgress.appendChild(progress);

	// ### race condition here! initAssets() is defined in scenario. Scenario script may be not loaded yet.
	// Fix (?): call initAssets() in scenario.
	// initAssets();
}

// returns boolean DEBUG
function checkDebug() {
	let dbg = false;

	let dt0 = new Date();
	debugger;
	let dt1 = new Date();

	if (dt1 - dt0 > 100) {
		// delay > 0.1 sec
		console.log('DEBUG mode detected');
		dbg = true;
	}

	return dbg;
}

// this function should go to calling script; it must call back this showOverlay()
// NB: WAV files do not play on iOS; even worse: they block AssetLoader() forever!
/*
function initAssets() {
	var imgs = {
		'birdL': 'imgs/birdL.png',
		'birdR': 'imgs/birdR.png',
		'bkg':	'imgs/Rain_Clouds.jpg'
	};

	var sounds = {
		'crows': 'sounds/Flock-of-crows-cawing.mp3'
	};

	assetLoader = new AssetLoader(imgs, sounds, 'progress-bar', 'progress-rate');
	assetLoader.load(showOverlay);
}
*/

function assetProgress(progress, total) {
	var pBar = document.getElementById('progress-bar');
	if (null === pBar)
		return;
	pBar.value = progress / total;
	document.getElementById('progress-rate').innerHTML = Math.round(pBar.value * 100) + "%";
}
function checkAssets(assets, assetsCount, msg) {
	console.log('MoW_templates: checkAssets(): Loaded: ' + msg + '; ' + assetsCount + ' of ' + assets);

	// display progress
	assetProgress(assetsCount, assets);

	if (assets == assetsCount) {
		// function in mow_template: shows overlay button; btn click calls this.startScenario
		showOverlay(/* overlayMessage */);
		// init();
		requestAnimationFrame(init);	// schedule for the next frame
	}
}

// This function is called from initAssets() in scenario script.
// It displays default overlay message unless caller (like assetLoader) has property 'message' set.
function showOverlay(message) {
	console.log("MoW_template::showOverlay()");

	// remove progress div
	let progress = document.getElementById( 'progress' );

	// some scenarios use progressbar (assetLoader), some not.
	if (null != progress) {
		progress.remove();
    }
	
	// add overlay
	let divOverlay = document.createElement('div');
	divOverlay.id = "overlay";
	divOverlay.style.color = "white";
	divOverlay.style.backgroundColor = "black";
	divOverlay.style.display = "flex";
	document.body.appendChild(divOverlay);
		
	//// divOverlay.innerHTML = '<div id="warning"><button id="startButton">Click to Play</button><p>Automatic audio playback requires a user interaction.</p></div>';
	//// NB: annoying and disgusting: none of these ever worked for me! Just the waste of time. Use placeElement()
	//	divOverlay.style.alignItems = "center";
	//		divOverlay.style.alignContent = "space-around";	//"center";

	// default message; may be overwritten by param or caller object property (when called as callback)
	let overlayMessage = '';	// 'Playback requires a user interaction.';
	if (null != this.message) {
		overlayMessage = this.message;
	}
	else if (null != message) {
		overlayMessage = message;
    }

	let divWarning = document.createElement('div');
	divWarning.id = "warning";

	// text (<p> - paragraph)
	divWarning.insertAdjacentHTML("afterbegin", overlayMessage + "<br>");

	// Checkboxes
	const textContent = document.createTextNode("Record video:");

	const lblCapture = document.createElement("label");
	lblCapture.innerHTML = "Capture";

	xbCapture = document.createElement("input");
	xbCapture.type = "checkbox";
	xbCapture.id = "reqCapture";
	xbCapture.name = "reqCapture";

	const lblRTC = document.createElement("label");
	lblRTC.innerHTML = "RTC";	// "CRT"; - my typo; WebRTC stands for Web Real-time Communications

	xbRTC = document.createElement("input");
	xbRTC.type = "checkbox";
	xbRTC.id = "reqRTC";
	xbRTC.name = "reqRTC";

	lblCapture.appendChild(xbCapture);
	lblRTC.appendChild(xbRTC);

	let br = document.createElement("br");
	let br1 = document.createElement("br");
	let br2 = document.createElement("br");

	divWarning.appendChild(textContent);
	divWarning.appendChild(br);

	divWarning.appendChild(lblCapture);
	divWarning.appendChild(lblRTC);

	divWarning.appendChild(br1);
	divWarning.appendChild(br2);



	// button
	const btn = document.createElement("button");
	btn.textContent = "Click to Play";
	btn.id = "startButton";
	divWarning.appendChild(btn);

	//divWarning.style.width = "400px";
	//divWarning.style.height = "200px";

	// vmin:	Relative to 1% of viewport's* smaller dimension
	divWarning.style.width = "80vmin";	// "60vmin";
	divWarning.style.height = "80vmin";	// "20vmin";

	divWarning.style.textAlign = "center";
	divOverlay.appendChild(divWarning);

	// set overlay size: NO! don't change gameSize here! Each script sets it to its need.
	//gameHeight = window.innerHeight;
	//gameWidth = window.innerWidth;
	divOverlay.style.width = window.innerWidth + 'px';
	divOverlay.style.height = window.innerHeight + 'px';
	divOverlay.zIndex = 10;	// bring on top
	divOverlay.style.zIndex = '20';	// at least one should work

	btn.addEventListener("click", startScenario);

	// why I need this: I used checkboxes instead of radiobuttons. Do not allow both checked.
	xbCapture.addEventListener('click', xbClick);
	xbRTC.addEventListener('click', xbClick);

	// recordingDisabled, recordingChecked - defined in each scenario. Causes exception if not defined.
	// defaults were set above (before possible exception).
	try {
		//	checkbox.disabled = recordingDisabled;
		//	checkbox.checked = recordingChecked;

		xbCapture.disabled = xbRTC.disabled = recordingDisabled;
		if (isMobile())
			xbCapture.disabled = true;
	}
	catch (e) {
		console.log(e);
	}
}

// Do not allow both checked.
function xbClick() {
	// only one may be checked
	if (this.name === 'reqCapture' && this.checked)
		xbRTC.checked = false;
	if (this.name === 'reqRTC' && this.checked)
		xbCapture.checked = false;

	// main thing: WebCapture off on mobiles
	if (isMobile())
		xbCapture.checked = false;
}

// This function is triggered by startButton; calls startShow() in scenario script
function startScenario() {
	console.log("MoW_template::startScenario()");

	// if rotateRequest = true in scenario
	if (typeof rotateRequest !== 'undefined') {
		if (rotateRequest) {
			if (window.innerHeight > window.innerWidth) {
				alert('Rotate device horizontally please.');
				location.reload();
			}
		}
	}

	//// ### my poor-man sync has glitches. In some cases I get 'no raster' exception. Check (global) raster first!
	if (!raster) {
		alert('No raster yet. Please try again.');
		return;
	}

	// if recording was checked
	//var chk = document.querySelector('input#reqRecord');
	//chk = document.getElementById("reqRecord");
	//reqRecord = chk.checked;

	reqCapture = document.querySelector('input#reqCapture').checked;
	reqRTC = document.querySelector('input#reqRTC').checked;

	//// iOS crap
	if (iOS()) {
		if (reqCapture || reqRTC)
			alert('Recording does not work on iOS');

		reqCapture = reqRTC = false;
	}
	////

	// remove overlay div
	// let overlay = document.getElementById('overlay');	// BAD!!! there are many overlays around
	let overlay = $("div#overlay");
	overlay.remove();
	
	console.log("overlay.remove");

	/////////////////
	// Hide mouse cursor to after 2" idling
	(function () {
		var mouseTimer = null, cursorVisible = true;

		mouseTimer = window.setTimeout(hideCursor, 2000);

		function hideCursor() {
			mouseTimer = null;
			document.body.style.cursor = "none";
			// document.getElementById('wrapper').style.cursor = "none";
			cursorVisible = false;
		}

		document.onmousemove = function () {
			if (mouseTimer) {
				window.clearTimeout(mouseTimer);
			}
			if (!cursorVisible) {
				document.body.style.cursor = "default";
				// document.getElementById('wrapper').style.cursor = "default";
				cursorVisible = true;
			}
			mouseTimer = window.setTimeout(hideCursor, 2000);
		};
	})();

	/////////////////

	// create canvas/sjs, set background, if needed, here: call func in scenario master script:
	startShow();	// scenario_three_template.js
	//scene = sjs.Scene({ w: window.innerWidth, h: window.innerHeight });
	//layer = scene.Layer("layer", { useCanvas: true });
	// scene.loadImages(imgarray, startFire);

	// ### attempt to generalize framework:
	// call startRecording() here just for scenarios that have recording functionality.

	if (typeof reqRTC !== 'undefined') {
		let reqRecord = reqCapture || reqRTC;
		if (reqRecord) {
			isCaptureResolved = false;

			// avoid creating second recorder
			if (null === recorder) {
				startRecording();	// mow_three_template; resolved in startCallback
			}
		}
		else {
			isCaptureResolved = true;	// no capture required
		}
	}
}

// Try to use whole screen
function tryFullScreen() {
	// bad on iOS; safari responsive when the script is over
	let isIos = iOS();
	if (!isIos && !DEBUG && screenfull.enabled) {
		screenfull.request();
	}

	// try to use full screen
	let h;
	let w;
	//if (isIos) {
	//	h = window.screen.height;	// gives wrong values!?
	//	w = window.screen.width;
	//}

	h = window.innerHeight;
	w = window.innerWidth;

	return { h: h, w: w };
}

// sets global gameWidth, gameHeight to the size of background object
// scaled to be enclosed by the viewport
function setGameSize(bkgW, bkgH) {
	let value = tryFullScreen();

	let scaleX = value.w / bkgW;
	let scaleY = value.h / bkgH;
	let scale = Math.min(scaleX, scaleY);

	let w = Math.floor(bkgW * scale);
	let h = Math.floor(bkgH * scale);

	return { W: w, H: h };
}

// places element inside container
function placeElement(id, x_pos, y_pos) {
  var d = document.getElementById(id);
  d.style.position = "absolute";
  d.style.left = x_pos+'px';
  d.style.top = y_pos+'px';
}
