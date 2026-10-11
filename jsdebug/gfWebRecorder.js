class GfWebRecorder {

    // 2025-03-28: Failure to record on Android (in landscape mode specifically) cost me a lot of frustration!
    // NB: Set W and H to even numbers in the caller.
    // Make sure all canvas(es), video, etc are set to proper sizes.
    // Do not chanhe W, H in this class.

    // NB: change of 2025-02-25
    // In case of Xmas, for example, nice picture is recorded when device is horizontal.
    // Resulting video is squished horizontally to 16:9, but still no bad. Vertical device - picture is bad.
    // Change: Vertical: warning message, let them have bad video if thy neglect the warning.
    //   Horizontal: show full screen, record 16:9 centered, cropped from left and right sides - not a big deal.

    // Private field
    #timeStart = Date.now();	// start/stop recording (for duration)

    constructor(W, H, aspect = null) {
        this.W = W;     // used for webRTC (mobiles); no use on desktops
        this.H = H;
        this.aspect = aspect;

        this.merger = null;

        this.stream = null;
        this.recorder = null;
        this.cancelled = false; // btn Cancel on the dialog (desktop)

        this.data = [];
        this.recordedBlob = null;

        // aspectRatio: 16/9
        this.options = {
            video: {
                displaySurface: "browser",
                //width: this.W,
                //height: this.H,
                //aspectRatio: { ideal: 1.7777777778 }
            },
            audio: true,
            preferCurrentTab: true,
            selfBrowserSurface: "include",
            systemAudio: "include",
            surfaceSwitching: "exclude",
            monitorTypeSurfaces: "exclude",
        }

        this.audios = [];
    }

    // properties (required where WebCapture does not work; currntly - mobiles)
    //#region PROPERTIES

    // <VIDEO> element
    set bgVideo(value) {
        this._bgVideo = value;
    }
    get bgVideo() {
        return this._bgVideo;
    }

    // <CANVAS>
    set bgCanvas(value) {
        this._bgCanvas = value;
    }
    get bgCanvas() {
        return this._bgCanvas;
    }

    // main canvas
    set canvas(value) {
        this._canvas = value;
    }
    get canvas() {
        return this._canvas;
    }

    // front canvas
    set frontCanvas(value) {
        this._frontCanvas = value;
    }
    get frontCanvas() {
        return this._frontCanvas;
    }

    // <AUDIO>
    // single audio - backward compatibility; multiple: use addAudio(oAudio)
    set audio(value) {
        //this._audio = value;
        this.audios.push(value);
    }
    get audio() {
        //return this._audio;
        return this.audios[0];
    }

    set audioStream(value) {
        this._audioStream = value;
    }
    get audioStream() {
        return this._audioStream;
    }

    get recordSrc() {
        return this._recordSrc;
    }

    // CALLBACK
    // startCallback is necessary for client to flag start scene play
    set startCallback(value) {
        this._startCallback = value;
    }

    set logCallback(value) {
        this._logCallback = value;
    }

    set errorCallback(value) {
        this._errorCallback = value;
    }

    set recordedCallback(value) {
        this._recordedCallback = value;
    }

    // ready state //
    // Assuming RTC requires at least main canvas,
    // if canvas === null - RTC not needed, otherwise canvas should be set
    get ready() {
        if (null === this.recorder)
            return false;

        if (null === this._canvas) {
            // set by user: RTC not needed
            return true;
        }
        else if (undefined === this._canvas)
            return false;
    }
    get started() {
        if (!this.ready)
            return false;

        // this.recorder will be paused in constructor.
        return this.recorder.state === "paused" || this.recorder.state === "recording";
    }
    //#endregion

    //#region METHODS
    // basic (entry) method: get stream and continue to stream recording.
    start() {
        try {
            // for desktops
            this.captureStream();   // => streamResolve(stream)
        }
        catch (error) {
            // mediaDevices not defined: mobile
            if ('TypeError' == error.name) {
                this.startRTC();
            }
            // all other errors
            else {
                this._errorCallback(error);
                return;
            }
        }
    }

    captureStream() {
        let promise = navigator.mediaDevices.getDisplayMedia(this.options);
        promise.then(
            (value) => { this.streamResolve(value); },
            (error) => { this.streamReject(error); }
        )
    }

    stopRecorder() {
        if (this.recorder.state == "recording") {
            this.recorder.stop();
            console.log('gfWebRecorder::stopRecorder()');
        }
    }
    //#endregion

    //#region FUNCTIONS
    addAudio(oAudio) {
        this.audios.push(oAudio);
    }

    // [object MediaStream]
    streamResolve(value) {
        this.stream = value;
        this.stream.oninactive = (e) => { this.onStreamInactive(e) };
        this.startRecording(value);
    }

    streamReject(error) {
        // When user cancelled: {code: 0, name: NotAllowedError: message: Permission denied}
        if (error.name == 'NotAllowedError') {
            this.cancelled = true;
        }
        this._errorCallback(error);
    }

    // start and pause recorder immediately to avoid recording blurred window.
    startRecording(stream) {
        console.log('gfWebRecorder::startRecording()');

        // Check Supported Configurations
        //this.recorder = new MediaRecorder(stream, { mimeType: "video/webm" });

        const mimeType9 = 'video/webm; codecs=vp9';
        const mimeType8 = 'video/webm; codecs=vp8';
        if (MediaRecorder.isTypeSupported(mimeType9)) {
            this.recorder = new MediaRecorder(stream, { mimeType9 });
            console.log('Encoder:' + mimeType9);
        } else if (MediaRecorder.isTypeSupported(mimeType8)) {
            this.recorder = new MediaRecorder(stream, { mimeType8 });
            console.log('Encoder:' + mimeType8);
        } else {
            // Fallback to vp8 or handle error
        }

        this.recorder.onstart = (e) => { this._startCallback(e) };
        this.recorder.onstop = (e) => { this.onRecorderStop(e) };

        this.recorder.onerror = (event) => {
            console.error(`error recording stream: ${event.error.name}: ${event.error.message}`);
        };

        //ondataavailable - fires periodically each time timeslice milliseconds of media have been recorded or
        //when the entire media is recorded if no timeslice is specified

        this.recorder.ondataavailable = (event) => this.data.push(event.data);
        this.recorder.start(); //start the recording

        this.#timeStart = Date.now();

        // to avoid recording of blur screen set to pause initially.
        // NB: not easy resolution: none of my code works when window is blurred.
        this.recorder.pause();
        console.log('DEBUG: gfWebRecorder::startRecording(): recorder.pause()');    // DEBUG
    }
    //#endregion

    //#region EVENT HANDLERS
    __onRecorderStop(e) {
        // getTracks = returns a sequence that represents all the MediaStreamTrack objects
        // It should close Sharing button as well

        console.log('gfWebRecorder::onRecorderStop()');

        if (undefined === this.stream) {
            console.log('this.stream: undefined; return');
            return;
        }

        this.stream.getTracks().forEach((track) => track.stop());

        console.log(`gfWebRecorder::onRecorderStop: data[0].size (blob): ${this.data[0].size}`);

        this.recordedBlob = new Blob(this.data, { type: "video/webm" });
        this._recordSrc = URL.createObjectURL(this.recordedBlob);

        console.log(`gfWebRecorder::onRecorderStop(${this._recordSrc})`);

        this._recordedCallback(this._recordSrc);
    }

    async onRecorderStop(e) {
        // getTracks = returns a sequence that represents all the MediaStreamTrack objects
        // It should close Sharing button as well

        console.log('gfWebRecorder::onRecorderStop()');

        if (undefined === this.stream) {
            console.log('this.stream: undefined; return');
            return;
        }

        this.stream.getTracks().forEach((track) => track.stop());

        console.log(`gfWebRecorder::onRecorderStop: data[0].size (blob): ${this.data[0].size}`);

        // Calculate actual duration
        const durationMs = Date.now() - this.#timeStart;

        const originalBlob = new Blob(this.data, { type: "video/webm" });

        this.recordedBlob = await webmFixDuration(originalBlob, durationMs);
        this._recordSrc = URL.createObjectURL(this.recordedBlob);

        console.log(`gfWebRecorder::onRecorderStop(${this._recordSrc})`);

        this._recordedCallback(this._recordSrc);
    }

    // user clicked [Stop Sharing]
    onStreamInactive(e) {
        if (this.recorder.state == "recording") {
            this.recorder.stop();
            console.log('gfWebRecorder::onStreamInactive(): this.recorder.stop()');
        }
    }
    //#endregion

    //#region RTC
    // direct call for mobiles/debug
    // sources: bgVideo, bgCanvas, canvas, audio
    // make sure at least 1 of 1st three is provided.
    startRTC() {
        let rtcStream;
        try {
            rtcStream = this.getMergedStream();
        }
        catch (error) {
            this._errorCallback(error);
            return;
        }

        this.streamResolve(rtcStream);
    }

    // attempt to record video on mobiles
    getMergedStream() {
        console.log('getMergedStream() this.W:', this.W, 'this.H:', this.H);

        this.merger = new VideoStreamMerger({
            width: this.W,
            height: this.H
        });

        // Add Bkg stream. Position it to fill the whole stream (the default)
        if (undefined != this._bgVideo && null != this._bgVideo) {
            let bgStream = this._bgVideo.captureStream();	// <video>
            this.merger.addStream(bgStream, {
                x: 0,   // leftmargin, // position of the topleft corner: simplify! Record from 0, 0 of canvas
                y: 0,
                width: this.merger.width,
                height: this.merger.height,
                mute: false
            });
        }

        if (undefined != this._bgCanvas && null != this._bgCanvas) {
            let bgStream = this._bgCanvas.captureStream();	// <canvas>
            this.merger.addStream(bgStream, {
                x: 0,
                y: 0,
                width: this.merger.width,
                height: this.merger.height,
                mute: true
            });
        }

        // add main canvas stream
        if (undefined != this._canvas && null != this._canvas) {
            let mystream = this._canvas.captureStream();	// <canvas>
            this.merger.addStream(mystream, {
                x: 0,
                y: 0,
                width: this.merger.width,
                height: this.merger.height,
                mute: true
            });
        }
        
        // add front canvas stream
        if (undefined != this._frontCanvas && null != this._frontCanvas) {
            let frontstream = this._frontCanvas.captureStream();	// <canvas>
            this.merger.addStream(frontstream, {
                x: 0,
                y: 0,
                width: this.merger.width,
                height: this.merger.height,
                mute: true
            });
        }


        // <AUDIO>
        //if (undefined != this._audio && null != this._audio) {
        //    this.merger.addMediaElement("bgAudio", this._audio);
        //}

        // this.audios.forEach((element, index) => this.merger.addMediaElement("audio" + index, element));
        for (let i = 0; i < this.audios.length; i++) {
            this.merger.addMediaElement("audio" + i, this.audios[i]);
        }

        if (undefined != this._audioStream && null != this._audioStream) {
            this.merger.addStream(this._audioStream);
        }


        this.merger.start();
        return this.merger.result;
    }

    //#endregion
}