(function() {
	// ----- DOM elements -----
	const canvas = document.getElementById('outputCanvas');
	const ctx = canvas.getContext('2d');
	const wordInput = document.getElementById('wordInput');
	const submitBtn = document.getElementById('submitBtn');
	const statusDiv = document.getElementById('statusMessage');

	const noteDiv = document.getElementById('note');
	const apiSelect = document.getElementById('apiSelect');
	const alignSelect = document.getElementById('alignSelect');

	// ----- configuration -----
	// base URL for the raster service (hardcoded for this basic sample)
	// In a real scenario, you might adjust this or use a local endpoint.
	// const baseUrl = 'https://quickchart.io/';   // quickchart.io/raster?text=... returns PNG
	
	//const baseUrl = 'http://localhost:7031/api/';
	const baseUrl = 'https://mowapi-hvb7htbzgfeubfh0.canadacentral-01.azurewebsites.net/api/';
	
	const API_ENDPOINTS = {
		raster:       `${baseUrl}raster?text=`,
		textToCoords: `${baseUrl}textToCoords?text=`   // adjust path/param to match your backend
	};

	// ----- helper: set status message -----
	function setStatus(message, isError = false) {
		statusDiv.textContent = message;
		statusDiv.classList.toggle('error', isError);
	}

	function setNote(note) {
		noteDiv.textContent = `⚙️ fetch → ${apiSelect.value}: ${note}`;
	}

	// ----- clear canvas with a neutral background -----
	function clearCanvas() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// subtle light background, similar to css background
		ctx.fillStyle = '#f2f5fa';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	// ----- draw error message on canvas (visual feedback) -----
	function drawCanvasError(message) {
		clearCanvas();
		ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
		ctx.fillStyle = '#b91c1c';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('⚠️ ' + message, canvas.width / 2, canvas.height / 2);
	}

	// ----- paint a successful image response on canvas -----
	function paintImageToCanvas(blob) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const url = URL.createObjectURL(blob);

			img.onload = () => {
				// clear canvas then draw the image
				clearCanvas();
				// adjust canvas size to image, but keep within reasonable limits
				// (we keep original canvas dimensions but scale image to fit)
				const canvasAspect = canvas.width / canvas.height;
				const imgAspect = img.width / img.height;

				let drawWidth = canvas.width;
				let drawHeight = canvas.height;
				let offsetX = 0;
				let offsetY = 0;

				if (imgAspect > canvasAspect) {
					// image is wider -> fit to width, height might be smaller than canvas
					drawHeight = canvas.width / imgAspect;
					offsetY = (canvas.height - drawHeight) / 2;
				} else {
					// image is taller -> fit to height
					drawWidth = canvas.height * imgAspect;
					offsetX = (canvas.width - drawWidth) / 2;
				}

				ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

				// clean up
				URL.revokeObjectURL(url);
				resolve();
			};

			img.onerror = (e) => {
				URL.revokeObjectURL(url);
				reject(new Error('failed to decode image data'));
			};

			img.src = url;
		});
	}

	// ----- main fetch routine -----
	async function fetchAndPaint() {
		// 1. get the word from input, trim whitespace
		const word = wordInput.value.trim();

		// (no empty word — optional, but friendly)
		if (word === '') {
			setStatus('⚠️ please enter some text', true);
			drawCanvasError('no text provided');
			return;
		}

		// 2. compose the URL exactly as requested: `${baseUrl}raster?text=${word}`
		// const url = `${baseUrl}raster?text=${encodeURIComponent(word)}`;   // encodeURIComponent keeps URL valid

		// 3. update status, clear canvas, show loading hint
		setStatus(`⏳ fetching “${word}” …`);
		clearCanvas();
		ctx.font = 'italic 18px "Segoe UI", system-ui, sans-serif';
		ctx.fillStyle = '#5f7d9c';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('loading raster…', canvas.width / 2, canvas.height / 2);

		try {
			// 4. fetch response object
			// const response = await fetch(url);

			// if (!response.ok) {
				// throw new Error(`HTTP ${response.status} – ${response.statusText}`);
			// }

			// // 5. get response as blob (binary data)
			// const blob = await response.blob();

			// // 6. paint blob on canvas
			// await paintImageToCanvas(blob);

			let param = "";

			// API: TextToCoords - full TTF raster data in new format.
			const api = apiSelect.value;

			if (2 == apiSelect.selectedIndex)
				param = 'fontFamily=LED';	// LED (new): LED font in TextToCoords API

			// 'center' is default alignment
			if (!alignSelect.value.startsWith("c")) {
				if (param.length > 0)
					param += '&';
				param += `align=${alignSelect.value}`;
			}

			if (param.length > 0)
				getRasterFromApiNew({ text: word, api: api, callback: rasterReady, param: param })
			else
				getRasterFromApiNew({ text: word, api: api, callback: rasterReady });

			// getRasterFromApiNew({ text: word, api: api, callback: rasterReady });
			// getRasterFromApiNew({ text: word, api: api, callback: rasterReady, param: 'align=right' });
			// getRasterFromApiNew({ text: word, api: api, callback: rasterReady, param: 'fontFamily=LED' });

			// success status
			// setStatus(`✅ painted “${word}” from ${baseUrl}raster`);
			setStatus(`✅ painted “${word}” via ${api}`);
		} catch (err) {
			console.error('fetch/paint error:', err);
			// user-friendly message
			let displayError = err.message;
			if (err.name === 'TypeError' && err.message.includes('fetch')) {
				displayError = 'network error or CORS restriction (check baseUrl)';
			}
			setStatus(`❌ ${displayError}`, true);
			drawCanvasError(displayError);
		}
	}

	// ----- attach event listeners -----
	submitBtn.addEventListener('click', fetchAndPaint);

	//// also trigger on Enter key in the input field [NOT for multi-line input]
	//wordInput.addEventListener('keydown', (e) => {
	//	if (e.key === 'Enter') {
	//		e.preventDefault();   // avoid any form submission / page reload
	//		fetchAndPaint();	// not for multi-line input
	//	}
	//});

	// ----- initialize canvas with a neutral state / empty message -----
	// clearCanvas();
	// ctx.font = '16px "Segoe UI", system-ui, sans-serif';
	// ctx.fillStyle = '#8b9eb8';
	// ctx.textAlign = 'center';
	// ctx.textBaseline = 'middle';
	// ctx.fillText('canvas ready — submit a word', canvas.width / 2, canvas.height / 2);
	
	// Draw coords
	function drawCoords() {
		const x0 = canvas.width / 2;
		const y0 = canvas.height / 2;

		ctx.lineWidth = 1;

		ctx.beginPath();
		ctx.moveTo(0, y0);
		ctx.strokeStyle = "red";
		ctx.lineTo(canvas.width, y0);
		ctx.stroke();	// Stroke it (Do the Drawing)

		ctx.beginPath();
		ctx.moveTo(x0, 0);
		ctx.strokeStyle = "green";
		ctx.lineTo(x0, canvas.height);
		ctx.stroke();
	}

	// set initial status (already in HTML, but just in case)
	setStatus('⚡ ready — type a word and press submit');
	
	/////
	// API: TextToCoords/Raster; param the whple params string, like 'type=TTF&param2=val2'
	async function getRasterFromApiNew({ text: text, api: api, param: param, callback: callback }) {
		if (!text)
			throw ('Parameter Text is required');

		fetchRasterFromApiAsyncNew({ text: text, api: api, param: param }).then(result => {

			console.log("=== RAW RESULT ===");
			console.log("Type:", typeof result);
			console.log("Keys:", Object.keys(result || {}));
			console.log("Characters count:", result?.Characters?.length);
			console.log("First char coords:", result?.Characters?.[0]?.Coordinates?.length);
			console.log("Full result:", JSON.stringify(result).substring(0, 500));


			callback(result);
		});
	}

	async function fetchRasterFromApiAsyncNew({text: text, api: api, param: param}) {
		console.log(`fetchRasterFromApiAsyncNew(${api})`);
		
		if (!text)
			throw ('Parameter Text is required');
		
		//let url = baseUrl + api + '?text=' + text;
		const endpointPrefix = API_ENDPOINTS[api];
		let url = `${endpointPrefix}${encodeURIComponent(text)}`;
		
		if(param)
			url += '&' + param;

		try {
			let response = await fetch(url);
			return await response.json();
		} catch (e) {
			return e.message;
		}
	}
	
	// API: TextToCoords
	function rasterReady(result) {
		console.log("rasterReady()");
		
		clearCanvas();
		drawCoords();
		drawTextRect(result);
		
		if (result.Statistics) {
			setNote("New format: Raster(0,0): Center");
			drawRaster(result);	// new format
		}
		else {
			setNote("Old format: Raster(0,0): Top-Left");
			drawRasterOld(result);	// old format
		}
	}
	
	function drawRaster(result) {
		//const canvas = document.getElementById("myCanvas");
		const ctx = canvas.getContext("2d");

		X0 = canvas.width / 2;
		Y0 = canvas.height / 2;
		//X0 = 0;
		//Y0 = 100;

		for (let i = 0; i < result.Characters.length; i++) {
			console.log(`char: ${result.Characters[i].Character}`);

			const coords = result.Characters[i].Coordinates;
			for (let i = 0; i < coords.length; i++) {
				ctx.fillRect(coords[i].X + X0, coords[i].Y + Y0, 1, 1);
			}
		}
	}
	
	function drawRasterOld(result) {
		const ctx = canvas.getContext("2d");
		const X0 = canvas.width / 2;
		const Y0 = canvas.height / 2;
		
		var raster = result.raster;

		for (let i = 0; i < raster.length; i++) {
			const coords = raster[i];
			for (let i = 0; i < coords.length; i++) {
				ctx.fillRect(coords[i].X + X0, coords[i].Y + Y0, 1, 1);
			}
		}
	}

	function drawTextRect(result) {
		//const canvas = document.getElementById("myCanvas");
		const ctx = canvas.getContext("2d");

		// const TW = result.Statistics.TextSize.Width;
		// const TH = result.Statistics.TextSize.Height;
		
		let TW = 0;
		let TH = 0;
		let left = 0;
		let top = 0;
		if(result.Statistics) {
			// TextToCoords: new format (centered)
			TW = result.Statistics.TextSize.Width;
			TH = result.Statistics.TextSize.Height;
			left = (canvas.width - TW) / 2;
			top = (canvas.height - TH) / 2;
		}
		else {
			// Raster: old format (left, top)
			TW = result.size.Width;
			TH = result.size.Height;
			left = canvas.width/ 2;
			top = canvas.height / 2;
		}

		ctx.fillStyle = "rgba(255, 255, 0, 0.75)";	// "yellow"; half-transparent
		ctx.fillRect(left, top, TW, TH);
		ctx.fillStyle = "black";
	}

})();
