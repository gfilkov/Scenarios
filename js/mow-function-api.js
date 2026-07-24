// Testing new low cost/free API: Azure Function HTTP trigger.

const myCanvas = document.getElementById("myCanvas");
myCanvas.style.width = '800px';	// Works correctly (sized and scaled) after I added this.
myCanvas.style.height = '200px';

const oldCanvas = document.getElementById("oldCanvas");
oldCanvas.style.width = '800px';
oldCanvas.style.height = '200px';

const ledCanvas = document.getElementById("ledCanvas");
ledCanvas.style.width = '800px';
ledCanvas.style.height = '200px';

const newCanvas = document.getElementById("newCanvas");
newCanvas.style.width = '800px';
newCanvas.style.height = '200px';

// Draw coords
const x0 = myCanvas.width / 2;
const y0 = myCanvas.height / 2;

const ctx = myCanvas.getContext("2d");

ctx.lineWidth = 1;

ctx.beginPath();
ctx.moveTo(0, y0);
ctx.strokeStyle = "red";
ctx.lineTo(myCanvas.width, y0);
ctx.stroke();	// Stroke it (Do the Drawing)

ctx.beginPath();
ctx.moveTo(x0, 0);
ctx.strokeStyle = "green";
ctx.lineTo(x0, myCanvas.height);
ctx.stroke();

// Get raster data

///////
const baseUrl = 'https://mowapi-hvb7htbzgfeubfh0.canadacentral-01.azurewebsites.net/api/';

//const baseUrl = 'http://localhost:7031/api/';

const word = 'PROBA PERA';

// API: TextToCoords - full TTF raster data in new format.
getRasterFromApiNew({ text: word, api: 'TextToCoords', callback: rasterReady });

// API: Raster (TTF) - parameter
let url1 = `${baseUrl}raster?text=${word}&type=TTF`;

// API: Raster (LED) - default - legacy LED raster format
getRasterFromApiNew({ text: word, api: 'Raster', callback: rasterReadyLegacy });

getRasterFromApiNewTTF(url1).then(result => {
	rasterReadyLegacyTTF(result);
});

async function getRasterFromApiNewTTF(url) {
	try {
		let response = await fetch(url);
		return await response.json();
	} catch (e) {
		return e.message;
	}
}

async function getRasterFromApiNew({ text: text, api: api, callback: callback }) {
	if (!text)
		throw ('Parameter Text is required');

	fetchRasterFromApiAsyncNew({ text: text, api: api }).then(result => {
		callback(result);
	});
}

//async function fetchRasterFromApiAsyncNew({ text, type, slicing, alignment, fontsize, spacing }) {
async function fetchRasterFromApiAsyncNew({text: text, api: api}) {
	console.log(`fetchRasterFromApiAsyncNew(${api})`);
	
	if (!text)
		throw ('Parameter Text is required');
	
	let url = baseUrl + api + '?text=' + text;

	try {
		let response = await fetch(url);
		return await response.json();
	} catch (e) {
		return e.message;
	}
}

// TextToCoords
function rasterReady(result) {
	console.log("rasterReady()");

	drawTextRect(result);
	drawRaster(result);
}

// API: Raster
function rasterReadyLegacyTTF(result) {
	console.log("rasterReadyLegacyTTF()");

	drawTextRectLegacy(result, "oldCanvas");
	drawRasterLegacy(result, "oldCanvas");
}
function rasterReadyLegacy(result) {
	console.log("rasterReadyLegacy(default/LED)");

	drawTextRectLegacy(result, "ledCanvas");
	drawRasterLegacy(result, "ledCanvas")
}


function drawRaster(result) {
	const canvas = document.getElementById("myCanvas");
	const ctx = canvas.getContext("2d");

	for (let i = 0; i < result.Characters.length; i++) {
		console.log(`char: ${result.Characters[i].Character}`);

		const coords = result.Characters[i].Coordinates;
		for (let i = 0; i < coords.length; i++) {
			ctx.fillRect(coords[i].X, coords[i].Y, 1, 1);
		}
	}
}

function drawTextRect(result) {
	const canvas = document.getElementById("myCanvas");
	const ctx = canvas.getContext("2d");

	const TW = result.Statistics.TextSize.Width;
	const TH = result.Statistics.TextSize.Height;

	var left = (canvas.width - TW)/2; 
	var top = (canvas.height - TH) / 2;;

	//ctx.strokeStyle = "blue";
	//ctx.beginPath();
	//ctx.rect(left, top, TW, TH);	// rect(x, y, w, h)
	//ctx.stroke();

	ctx.fillStyle = "rgba(255, 255, 0, 0.5)";	// "yellow"; half-transparent
	ctx.fillRect(left, top, TW, TH);
	ctx.fillStyle = "black";
}

function drawTextRectLegacy(result, canvasId) {
	const canvas = document.getElementById(canvasId);
	const ctx = canvas.getContext("2d");

	const TW = result.size.Width;
	const TH = result.size.Height;

	var left = 0;
	var top = 0;

	ctx.fillStyle = "rgba(255, 255, 0, 0.9)";	// "yellow"; half-transparent
	ctx.fillRect(left, top, TW, TH);
	ctx.fillStyle = "black";

	//ctx.strokeStyle = "blue";
	//ctx.beginPath();
	//ctx.rect(left, top, TW, TH);	// rect(x, y, w, h)
	//ctx.stroke();
}

function drawRasterLegacy(result, canvasId) {
	const canvas = document.getElementById(canvasId);
	const ctx = canvas.getContext("2d");

	for (let i = 0; i < result.raster.length; i++) {
		for (let j = 0; j < result.raster[i].length; j++) {
			let x = result.raster[i][j].X;
			let y = result.raster[i][j].Y;
			ctx.fillRect(x, y, 1, 1);
		}
	}
}