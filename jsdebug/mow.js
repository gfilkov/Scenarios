function iOS() {
    // DeepSeek suggestion
    // This should cover all iOS devices including newer iPads running iPadOS.
    const platform = navigator.platform;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        /*
    var iDevices = [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ];

    if (!!navigator.platform) {
        while (iDevices.length) {
            if (navigator.platform === iDevices.pop()) { return true; }
        }
    }

    return false;
    */
}

function isMobile() {
    const regex = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return regex.test(navigator.userAgent);
}

// stupid ios requires user input
function iosplay(audio) {
    var btn = document.createElement("BUTTON");        // Create a <button> element
    var t = document.createTextNode("Play");       // Create a text node
    btn.appendChild(t);                                // Append the text to <button>
    document.body.appendChild(btn);                    // Append <button> to <body>
    btn.style.visibility = "visible";
    var onClick = function () {
        audio.play(); // audio will load and then play
        btn.style.visibility = "hidden";
    };
    btn.addEventListener('click', onClick, false);
}

//////// log to server api (using my new LogController)
function logToServer(message, func = '', file = '') {
    console.log("MoW::logToServer()");  // DEBUG, comment out when tested

    // window.location.origin: http://localhost
    // pathname: "/MoWtestWeb/play.html"

    let url = window.location.origin;
    if (window.location.pathname.toLowerCase().startsWith("/mowtestweb"))
        url += "/mowtestweb";

    url += '/api/log';

    fetch(url, {
        method: "POST",
        body: JSON.stringify({
            file: file,
            func: func,
            message: message
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => console.log(response.status, ':', response.statusText));
}

//response.status: 200

////////

function findPos(obj) {
    var curleft = 0;
    var curtop = 0;

    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
        return { X: curleft, Y: curtop };
    }
}

// NB: The user obviously needs to accept the fullscreen request first, and there is not possible to trigger this automatically on pageload,
// it needs to be triggered by a user (eg. a button)
function requestFullScreen(element) {
    // Supports most browsers and their versions.
    var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullScreen;

    if (requestMethod) { // Native full screen.
        requestMethod.call(element);
    } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
        var wscript = new ActiveXObject("WScript.Shell");
        if (wscript !== null) {
            wscript.SendKeys("{F11}");
        }
    }
}

// Usage: var mytext = getUrlVars()["text"];
function getUrlVars() {
    console.log("MoW::getUrlVars()");

    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}

// Usage: <div onclick="showScreenCoords(event)"><p id="info"></p></div>
function showScreenCoords(e) {
    var msg = '(' + e.screenX + ', ' + e.screenY + ')'
    document.getElementById("info").innerHTML = msg;
}
function showClientCoords(e) {
    var msg = '(' + e.clientX + ', ' + e.clientY + ')'
    document.getElementById("info").innerHTML = msg;
}

// Navigate back to source page, if 'srcpage' param was provided in URL, otherwise navigate back (-1)
// ### looks like navigate back (-1) often causes dsgusting behavior - endless reloading of the same page.
// Leave just scenario option
////// ### repeated calls: security breach error!
let showStopped = false;

function stopShow() {
    console.log("MoW::stopShow()");

    if (showStopped) {
        console.log("- already stopped; exiting");
        return;
    }
    showStopped = true;

    var srcpage = getUrlVars()["srcpage"];

    /////// source of 'security breach' errors: too many calls. Simplify:
    if ((srcpage === undefined) || srcpage == "")
        srcpage = 'scenarios';

    // http://localhost/MoWtestWeb/play.html?srcpage=scenarios&scene=birds&text=birds&type=TTF|LED2
    let pos = window.location.href.indexOf('/play') + 1;
    let scenarios = window.location.href.substring(0, pos) + 'scenarios';
    window.location.assign(scenarios);
}

// generate text pixels array: TBD; copied from F:\MyProjects\Azure\WebSites\WebSite1\js\text_anim_birds.js
// DRAFT, TBD
function createText(t) {
    var fontSize = 860 / (t.length);
    if (fontSize > 160) fontSize = 160;
    text.text = t;
    text.font = "900 " + fontSize + "px 'Source Sans Pro'";
    text.textAlign = 'center';
    text.x = 300;
    text.y = (172 - fontSize) / 2;
    textStage.addChild(text);
    textStage.update();

    var ctx = document.getElementById('canvastext').getContext('2d');
    var pix = ctx.getImageData(0, 0, 600, 200).data;
    textPixels = [];
    for (var i = pix.length; i >= 0; i -= 4) {
        if (pix[i] !== 0) {
            var x = (i / 4) % 600;
            var y = Math.floor(Math.floor(i / 600) / 4);

            if ((x && x % 8 === 0) && (y && y % 8 === 0)) textPixels.push({ x: x, y: y });
        }
    }
}

// Get a random number within the specified range.
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// randomize array
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerp2(x1, x2, y1, y2, x) {
    let y = (x - x1) * (y2 - y1) / (x2 - x1) + y1;
    return y;
}

// 2D distance for sprites. THREE lib has its own lib for Vectors
function distance(x1, y1, x2, y2) {
    let y = x2 - x1;
    let x = y2 - y1;

    return Math.sqrt(x * x + y * y);
}

function getAxisWorldDirection(object, idx) {
    // idx: 0 - 2: X - Z
    if (undefined == idx)
        idx = 1;

    if (idx > 2)
        idx = 1;

    object.updateMatrixWorld();
    const dir = new THREE.Vector3().setFromMatrixColumn(object.matrixWorld, idx);	// idx: 1: Y

    // Fallback to global Y if direction is invalid
    if (dir.length() < 1e-6 || dir.manhattanLength() === 0) {
        console.warn("Falling back to global axis");
        let x = idx = 0 ? 1 : 0;
        let y = idx = 1 ? 1 : 0;
        let z = idx = 2 ? 1 : 0;
        return new THREE.Vector3(x, y, z);
    }
    return dir.normalize();
}

function getAngleBetweenAxes(node1, node2, idx1, idx2) {
    const axis1 = getAxisWorldDirection(node1, idx1);    // defaults to Y (if idx == undefined)
    const axis2 = getAxisWorldDirection(node2, idx2);

    const angleRadians = axis1.angleTo(axis2);
    // const angleDegrees = THREE.MathUtils.radToDeg(angleRadians);

    return angleRadians;
}

//////////////


// NB: there are native THREE.JS methods: 
// var object = scene.getObjectByName( "objectName", true );	// 2nd param: recursive
// var object = scene.getObjectById( 4, true );
//
// Meta AI:
// In Three.js, the traverse method of an Object3D allows you to iterate through all the objects in the scene graph.
// However, there is no built-in way to break out of the traversal early.
// finds the 1st Object3D whose name starts with 'token'
function findByName(root, token) {
    let result = null;
    try {
        root.traverse((node) => {
            if (node.isObject3D && node.name.startsWith(token)) {	//"Lights38") {
                result = node;
                throw { break: true }; // throw an exception to break out
            }
            // process the node
        });
    } catch (e) {
        if (e.break) return result; // ignore the exception and break out
        // re-throw the exception if it's not the break exception
        throw e;
    }
}


// AssetLoader.js has newer version of the class, which
// Requires MooTools and MooTools More (Assets, Reqest.JSONP)
// I will keep older version here for compatibility.
class AssetLoader {
    //var assetsLoaded = 0;	// how many assets have been loaded
    //var numImgs      = 0;	// total number of image assets
    //var numSounds    = 0;	// total number of sound assets
    //this.checkAudio;	    // setInterval variable (function pointer) for checking audio loading

    constructor(imgs, sounds, progressbarid, progressrateid) {
        this._imgs = imgs;
        this._sounds = sounds;
        this.numImgs = Object.keys(this._imgs).length;
        this.numSounds = Object.keys(this._sounds).length;
        this._totalAssets = this.numImgs + this.numSounds;              // total number of assets
        this.progressbarid = progressbarid;
        this.progressrateid = progressrateid;
        this.assetsLoaded = 0;
        this.checkAudio;
        var that = this;
    }

    // method
    load(callback) {
        console.log("MoW::AssetLoader::load()");

        // load() must be called only once!
        // second call to assetLoader.load() creates very annoying and cumbersome problem with audio:
        // audio.src initially is a file address string; after Audio is created, src is object -> endless loop.

        if (undefined !== this.callback) {
            alert("MoW::AssetLoader::load() - repeated call!\nMust be called only once.");
            return;
        }

        this.callback = callback;
        var self = this;
        var src = '';
        for (var img in this._imgs) {
            if (this._imgs.hasOwnProperty(img)) {
                src = this._imgs[img];
                this._imgs[img] = new Image();
                this._imgs[img].status = 'loading';
                this._imgs[img].onload = this.assetLoaded(self, 'imgs', img);
                this._imgs[img].src = src;
            }
        }
        for (var sound in this._sounds) {
            if (this._sounds.hasOwnProperty(sound)) {
                src = this._sounds[sound];
                this._sounds[sound] = new Audio();
                this._sounds[sound].status = 'loading';
                this._sounds[sound].volume = 1.0;
                this._sounds[sound].src = src;
            }
        }
        if (this.numSounds) {
            if (iOS()) {
                // does not work for iOS :(
                this.assetLoaded(this, 'sounds', sound);
            }
            else {
                var that = this;
                this.checkAudio = setInterval(function () { that.checkAudioStatus.call(that); }, 1000);
            }
        }
    }

    // helpers
    assetProgress(progress, total) {
        var pBar = document.getElementById(this.progressbarid);
        pBar.value = progress / total;
        document.getElementById(this.progressrateid).innerHTML = Math.round(pBar.value * 100) + "%";
    }

    assetLoaded(self, dic, name) {
        this.assetsLoaded++;
        // console.log('assetLoaded:' + this.assetsLoaded);
        console.log('assetLoaded:', this.assetsLoaded, 'name:', name);
        self[dic][name].status = 'loaded';
        this.assetProgress(this.assetsLoaded, self._totalAssets);
        if (this.assetsLoaded === self._totalAssets) {
            clearInterval(self.checkAudio);
            this.callback();
        }
    }

    checkAudioStatus() {
        console.log('MoW::AssetLoader::checkAudioStatus()');
        try {
            for (var sound in this._sounds) {
                console.log(this._sounds.hasOwnProperty(sound));
                console.log(this._sounds[sound].status);
                console.log(this._sounds[sound].readyState);
                if (this._sounds.hasOwnProperty(sound) && this._sounds[sound].status === 'loading' && this._sounds[sound].readyState === 4) {
                    this.assetLoaded(this, 'sounds', sound);
                    //alert('loaded: ' + sound);
                }
            }
        }
        catch (err) {
            console.log(err.message);
            // train scenario gives error popup here. Because the last callback to assetLoaded() comes when progress bar is already removed.
            // alert(err.message);
        }
    }

    // properties
    set imgs(value) {
        this._imgs = value;
    }
    get imgs() {
        return this._imgs;
    }
    set sounds(value) {
        this._sounds = value;
    }
    get sounds() {
        return this._sounds;
    }
    get totalAssets() {
        return this._totalAssets;
    }
}

// my attempt to add videos as well
class AssetLoader2 {
    //var assetsLoaded = 0;	// how many assets have been loaded
    //var numImgs      = 0;	// total number of image assets
    //var numSounds    = 0;	// total number of sound assets
    //this.checkAudio;	    // setInterval variable (function pointer) for checking audio loading

    constructor(imgs, sounds, videos, progressbarid, progressrateid) {
        this._imgs = imgs;
        this._sounds = sounds;
        this._videos = videos;
        this.numImgs = Object.keys(this._imgs).length;
        this.numSounds = Object.keys(this._sounds).length;
        this.numVideos = Object.keys(this._videos).length;

        this._totalAssets = this.numImgs + this.numSounds + this.numVideos;    // total number of assets
        this.progressbarid = progressbarid;
        this.progressrateid = progressrateid;
        this.assetsLoaded = 0;
        this.checkAudio;
        this.checkVideo;
        this.checkImage;    //// GIF
        var that = this;
    }

    // method
    load(callback) {
        console.log("MoW::AssetLoader::load()");

        // load() must be called only once!
        // second call to assetLoader.load() creates very annoying and cumbersome problem with audio:
        // audio.src initially is a file address string; after Audio is created, src is object -> endless loop.

        if (undefined !== this.callback) {
            alert("MoW::AssetLoader::load() - repeated call!\nMust be called only once.");
            return;
        }

        this.callback = callback;
        var self = this;
        var src = '';
        for (var img in this._imgs) {
            if (this._imgs.hasOwnProperty(img)) {
                src = this._imgs[img];
                this._imgs[img] = new Image();
                this._imgs[img].status = 'loading';
                ////                this._imgs[img].onload = this.assetLoaded(self, 'imgs', img);
                //this._imgs[img].onload = function () {
                //    if(this.width > 0)
                //        self.assetLoaded(self, 'imgs', img);
                //}

                this._imgs[img].src = src;
            }
        }
        for (var sound in this._sounds) {
            if (this._sounds.hasOwnProperty(sound)) {
                src = this._sounds[sound];
                this._sounds[sound] = new Audio();
                this._sounds[sound].status = 'loading';
                this._sounds[sound].volume = 1.0;
                this._sounds[sound].src = src;

                // DEBUG
                console.log(typeof this._sounds[sound]);
            }
        }

        for (var video in this._videos) {
            if (this._videos.hasOwnProperty(video)) {
                src = this._videos[video];
                this._videos[video] = new Video(src, false);    // do not append
                this._videos[video].onloadeddata = this.assetLoaded(self, 'videos', video);
            }
        }

        //#region GIF ADDITION
        // adding check for IMG which is GIF. Shows status loaded, but img.width is 0
        if (this.numImgs) {
            var that = this;
            this.checkImage = setInterval(function () { that.checkImageStatus.call(that); }, 1000);
        }

        //#endregion

        if (this.numSounds) {
            if (iOS()) {
                // does not work for iOS :(
                this.assetLoaded(this, 'sounds', sound);
            }
            else {
                var that = this;
                this.checkAudio = setInterval(function () { that.checkAudioStatus.call(that); }, 1000);
            }
        }

        if (this.numVideos) {
            var that = this;
            this.checkVideo = setInterval(function () { that.checkVideoStatus.call(that); }, 1000);
        }
    }

    // helpers
    assetProgress(progress, total) {
        var pBar = document.getElementById(this.progressbarid);

        // safety catch: if somebody has already removed the progress control:
        if (null == pBar) {
            console.log('assetProgress(', progress, ',', total, ') ERROR: progress bar not found.');
            return;
        }

        pBar.value = progress / total;
        document.getElementById(this.progressrateid).innerHTML = Math.round(pBar.value * 100) + "%";
    }

    assetLoaded(self, dic, name) {
        // looks like this 'name' is just an index.
        let item = self[dic][name];
        let itemtag = item.tagName;
        let src = item.src;
        let parts = src.split('/');
        let itemname = parts[parts.length - 1];

        this.assetsLoaded++;
        // console.log('assetLoaded:' + this.assetsLoaded);
        console.log('assetLoaded:', this.assetsLoaded, itemtag, itemname);

        self[dic][name].status = 'loaded';
        this.assetProgress(this.assetsLoaded, self._totalAssets);
        if (this.assetsLoaded === self._totalAssets) {
            clearInterval(self.checkImage);
            clearInterval(self.checkAudio);
            clearInterval(self.checkVideo);
            this.callback();
        }
    }

    checkAudioStatus() {
        console.log('checkAudioStatus');
        try {
            for (var sound in this._sounds) {
                console.log(this._sounds.hasOwnProperty(sound));
                console.log(this._sounds[sound].status);
                console.log(this._sounds[sound].readyState);

                if (this._sounds.hasOwnProperty(sound)) {
                    let myaudio = this._sounds[sound];
                    if (myaudio.readyState === 4) {
                        this.assetLoaded(this, 'sounds', sound);
                        //alert('loaded: ' + sound);
                    }
                }

                //if (this._sounds.hasOwnProperty(sound) && this._sounds[sound].status === 'loading' && this._sounds[sound].readyState === 4) {
                //    this.assetLoaded(this, 'sounds', sound);
                //    //alert('loaded: ' + sound);
                //}
            }
        }
        catch (err) {
            console.log(err.message);
            // train scenario gives error popup here. Because the last callback to assetLoaded() comes when progress bar is already removed.
            // alert(err.message);
        }
    }

    checkVideoStatus() {
        console.log('checkVideoStatus');
        // # his._videos[video].status - undefined !?

        try {
            for (var video in this._videos) {
                console.log(this._videos.hasOwnProperty(video));
                console.log(this._videos[video].status);
                console.log(this._videos[video].readyState);

                // readyState does not work (video still not playable); using ondataloaded event handler instead.
                //if (this._videos.hasOwnProperty(video) && this._videos[video].readyState === 4) {
                //    this.assetLoaded(this, 'videos', video);
                //    //alert('loaded: ' + video);
                //}
            }
        }
        catch (err) {
            console.log(err.message);
        }
    }

    //// added to handle GIF loading as IMG
    checkImageStatus() {
        console.log('checkImageStatus');
        // added for GIF cases

        try {
            for (var img in this._imgs) {
                if (this._imgs.hasOwnProperty(img) && this._imgs[img].status === 'loading' && this._imgs[img].width > 0) {
                    this.assetLoaded(this, 'imgs', img);
                    // alert('loaded: ' + img);
                }
            }
        }
        catch (err) {
            console.log(err.message);
        }
    }
    ////

    // properties
    set imgs(value) {
        this._imgs = value;
    }
    get imgs() {
        return this._imgs;
    }
    set sounds(value) {
        this._sounds = value;
    }
    get sounds() {
        return this._sounds;
    }

    set videos(value) {
        this._videos = value;
    }
    get videos() {
        return this._videos;
    }

    get totalAssets() {
        return this._totalAssets;
    }
}

// for AssetLoader2 class: poor man new Audio() equivalent:
function Video(src, append) {
    var v = document.createElement("video");
    if (src != "") {
        v.src = src;
    }
    if (append == true) {
        document.body.appendChild(v);
    }
    return v;
}

class SimpleImage {
    constructor(src, parent) {
        this.img = new Image();
        this.img.style.position = 'absolute';
        // generating the image dynamically, set the onload property before the src
        //
        // does not work either - overriding assetLoader.onload; set size externally, from setFlakes()
        this.h = 0;
        this.w = 0;
        //
        this.img.src = src;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        parent.appendChild(this.img);
    }
    position(x, y) {
        this.x = x;
        this.y = y;
        this.img.style.top = y + 'px';
        this.img.style.left = x + 'px';
    }
    // move by the distance
    moveby(dx, dy) {
        this.position(this.x + dx, this.y + dy);
    }
    // slide with set velocity
    slide(dt) {
        this.moveby(this.vx * dt, this.vy * dt);
    }
    //
    // could not make onload() work :( Call this function from setFlakes to set initial size
    initSize() {
        this.h = this.img.height;
        this.w = this.img.width;
    }
    //
    scale(rate) {
        /*
        if (this.h > 0 && this.w > 0) {
            this.img.height = this.h * rate;
            this.img.width = this.w * rate;
        }*/
        this.img.height = this.img.naturalHeight * rate;
        this.img.width = this.img.naturalWidth * rate;
    }
    setvisible(b) {
        this.img.style.visibility = b ? "visible" : "hidden";
    }
}

// Prerequisites: Image already exists, loaded.
class SimpleCanvasImage {
    // Image object, canvas 2D context.
    constructor(image, context) {
        this.img = image;
        this.ctx = context;

        this.h = image.height;
        this.w = image.width;

        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;

        this.visible = true;
    }

    position(x, y) {
        this.x = x;
        this.y = y;
    }

    positionCenter(x, y) {
        this.x = x - this.w / 2;
        this.y = y - this.h / 2;
    }

    // move by the distance
    moveby(dx, dy) {
        this.position(this.x + dx, this.y + dy);
    }
    // slide with set velocity
    slide(dt) {
        this.moveby(this.vx * dt, this.vy * dt);
    }

    scale(rate) {
        // don't change this.img size!
        // img may be the object used by multiple instances of this class.
        this.w = this.img.width * rate;
        this.h = this.img.height * rate;
    }

    paint() {
        if (this.visible) {
            this.ctx.drawImage(this.img, 0, 0, this.img.width, this.img.height,
                this.x, this.y, this.w, this.h);
        }

        //// DEBUG: put small rect
        //this.ctx.fillStyle = "white";
        //this.ctx.beginPath();
        //this.ctx.rect(this.x, this.y, 2, 2);
        //this.ctx.stroke();
    }

    update(dt) {
        if (this.vx !== 0 || this.vy !== 0) {
            // slide with set velocity
            this.slide(dt);
        }
        this.paint();
    }
}
