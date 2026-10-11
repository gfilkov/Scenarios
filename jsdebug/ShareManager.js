class ShareManager {
    constructor() {
        this.recordedChunks = [];
        this.recordedBlob = null;
		this.filename = 'recording';
		this.type = 'webm';
    }
	
	#wasSaved = false;	// private field. Avoid multiple savings of the same record.
	
	//// type = 'webm';
	// Reality Check from DeepSeek: native browsers' API:
	// WEBM - supported, excellent, small
	// MP4  - problematic/rare, larger
	// AVI  - not supported, playback: limited, file: very large
	// Use just WEBM, suggest to user to save and convert, if needed.
	

    // Method to start a new recording
    startNewRecording() {
        // 1. Clear previous data
        this.cleanUp();
        
        // 2. Reset for new recording
        this.recordedChunks = [];
        this.recordedBlob = null;
    }

    // Method to add chunks during recording
    addChunk(chunk) {
        this.recordedChunks.push(chunk);
    }

    // Method to finalize recording
    finalizeRecording() {
        if (this.recordedChunks.length === 0) {
            console.warn('No recorded data available');
            return null;
        }
        
		let vtype = 'video/' + this.type;
        this.recordedBlob = new Blob(this.recordedChunks, { 
            type: vtype
        });
        
        return this.recordedBlob;
    }

    // Clean up method
    cleanUp() {
        // Important: Revoke old blob URL to prevent memory leaks
        if (this.downloadUrl) {
            URL.revokeObjectURL(this.downloadUrl);
            this.downloadUrl = null;
        }
        
        // Clear arrays and blobs
        this.recordedChunks = [];
        this.recordedBlob = null;
        
        // If you have any MediaRecorder or stream references, clean those too
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
		
		this.#wasSaved = false;
    }

    // Method to get download URL
    getDownloadUrl() {
        if (!this.recordedBlob) {
            console.warn('No blob available. Call finalizeRecording() first.');
            return null;
        }
        
        // Create new URL for the blob
        this.downloadUrl = URL.createObjectURL(this.recordedBlob);
        return this.downloadUrl;
    }

    // Method to share the recording
    async share() {
        if (!this.recordedBlob) {
            throw new Error('No recording available to share');
        }
        
		let vtype = 'video/' + this.type;
		this.filename = this.checkFileName(this.filename);
		//const file = new File([this.recordedBlob], 'recording.webm', {
        const file = new File([this.recordedBlob], this.filename, {
			type: vtype
        });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'MoW Unity Recording',
                    text: 'Check out this MoW Unity recording: ' + this.filename
                });
            } catch (error) {
                const msg = `Sharing cancelled or failed: ${error}`
                console.log(msg);
                alert(msg);
                // Fallback to download
				if(!this.#wasSaved)
					this.download();
            }
        } else {
            // multi-line message:
            const msg = `Your browser does not support Web Share API
NB: This feature is available only in secure contexts (HTTPS)`;
            alert(msg);

            // Fallback to download
			if(!this.#wasSaved)
				this.download();
        }
    }

    // Method to trigger download
	//download(filename = 'recording.webm') {
    download() {
        if (!this.recordedBlob) {
            console.warn('No recording available to download');
            return;
        }
        
        const url = this.getDownloadUrl();
        const a = document.createElement('a');
		let vname = this.checkFileName(this.filename);
        a.href = url;
        a.download = vname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Note: URL will be revoked when cleanUp() is called
		
		if(this.isMobile()) {
			let msg = 'Recording was saved at Downloads  as ' + vname;
			alert(msg);
		}
		
		this.#wasSaved = true;
    }
	
	// using this.filename and this.type returns filename with extension
	checkFileName(name) {
		let ext = '.' + this.type;
		if(name.endsWith(ext))
			return name;
		else
			return name + ext;
	}
	
	isMobile() {
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
}