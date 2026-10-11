//// MoW API version
const apiUrl = "https://mowapi-hvb7htbzgfeubfh0.canadacentral-01.azurewebsites.net/api/TextToCoords";
//const apiUrl = 'http://localhost:7031/api/TextToCoords';

// Get raster; calc banner, density, target scale

var raster;
var rasterSize;

// 2-dim array of char centers
var charCenters;

var stretch = false;

// rectangles: Rectangle(left, right, top, bottom)
// input rect in pixels
var rcScaled;
// banner rect in pixels (enclosed in rcScaled)
var rcBanner;

var scaleX = 1.0;
var scaleY = 1.0;

// MoW API parameters:
// text	"Mandatory"
// align	"Optional: 'left', 'center', 'right'; default: 'center'"
// type	"Optional: 'LED', 'TTF'; default: 'TTF'"
// fontFamily	"Default: Arial"
// fontSize	"Default: 48"
// canvasWidth	"Default: 800"
// canvasHeight	"Default: 200"
// step	"Probing step size. Dafault: 2"

// 'var' makes it globally visible:
var urlParams;
var rasterParams = getScenarioParams();
var rasterSize;

// parse URL params (GET params)
// NB: java script cannot access params in POST request sent to server.
function getScenarioParams() {
	console.log('getScenarioParams()');

	const queryString = window.location.search;
	console.log(queryString);
	
	// Raw urlParams will also be globally accessible.
	urlParams = new URLSearchParams(queryString);
	
	// local vars:
	let scene = urlParams.get('scene');
	let text = urlParams.get('text');
	if(null == text)
		text = scene;
	
	let align = urlParams.get('align');
	let type = urlParams.get('type');
	let fontFamily = urlParams.get('fontFamily');
	let fontSize = urlParams.get('fontSize');
	let canvasWidth = urlParams.get('canvasWidth');
	let canvasHeight = urlParams.get('canvasHeight');
	let step = urlParams.get('step');
	let message = urlParams.get('message');
	
	return {scene: scene, text: text, align: align, type: type, fontFamily: fontFamily, fontSize: fontSize,
		canvasWidth: canvasWidth, canvasHeight: canvasHeight, step: step, message: message};
}

// gets raster from API (new format, centered raster)
async function getRaster() {
	console.log("ShowRaster::getRaster()");
	
	fetchRasterFromApiAsyncNew({ api: apiUrl, param: rasterParams, callback: rasterReady }).then(result => {

		// DEBUG
		console.log("=== RAW RESULT ===");
		console.log("Type:", typeof result);
		console.log("Keys:", Object.keys(result || {}));
		console.log("Characters count:", result?.Characters?.length);
		console.log("First char coords:", result?.Characters?.[0]?.Coordinates?.length);
		console.log("Full result:", JSON.stringify(result).substring(0, 500));

		rasterSize = result.Statistics.TextSize;

		//callback(result);
	});
}

async function fetchRasterFromApiAsyncNew({ api: api, param: param, callback: callback }) {
		console.log(`fetchRasterFromApiAsyncNew(${api})`);
		
	if (!param.text)
		throw ('Parameter Text is required');
	
	//const apiUrl = 'http://localhost:7031/api/TextToCoords';
	let url = `${api}?text=${encodeURIComponent(param.text)}`;
	
	if(param.align)
		url += '&' + param.align;
		
	if(param.type)
		url += '&' + param.type;
		
	if(param.fontFamily)
		url += '&' + param.fontFamily;
		
	if(param.fontSize)
		url += '&' + param.fontSize;
	
	if(param.canvasWidth)
		url += '&' + param.canvasWidth;
		
	if(param.canvasHeightv)
		url += '&' + param.canvasHeight;
	
	if(param.step)
		url += '&' + param.step;

	let result;
	try {
		response = await fetch(url);
		result = await response.json();
		if(callback)
			callback(result);
	} catch (e) {
		return e.message;
	}
		
	//return await response.json();
	return result;
}

// ### REMOVE:




// DEBUG
var rad = 4;

//////////////////
// fetch from PlayHandler (poor man API) if missing in sessionStorage

// NB: no debugging coud help me to trace crazy async tricks :(
// "It works by miracle, don't touch it"
async function getRaster__() {
	console.log("ShowRaster::getRaster()");

	let pword = urlParams.get('text');
	let sword = sessionStorage.getItem("Word");
	let ret = sessionStorage.getItem("Raster");

	// there is raster for this Word in the storage, reuse it
	// # NB: typeof ret == "string"; ret == "undefined"
//	if (typeof ret !== "undefined" && null != ret && pword == sword) {
	if (ret !== "undefined" && null != ret && pword == sword) {
		raster = JSON.parse(ret);
		let rs = sessionStorage.getItem("RasterSize");
		rasterSize = JSON.parse(rs);

		rasterReady(pword);
	}
	else {
		// this alert shows the object; when it is too late, on return from scenario
		// testload().then(result => { raster = JSON.parse(result); done = true});

		// fetchRasterAsync().then(result => { raster = result.raster; rasterSize = result.size; rasterReady() });

		fetchRasterAsync().then(result => {
			raster = result.raster;
			rasterSize = result.size;

			sessionStorage.setItem("Raster", JSON.stringify(raster));
			sessionStorage.setItem("RasterSize", JSON.stringify(rasterSize));
			sessionStorage.setItem("Word", pword);

			// the call is async! Do not move rasterReady() out of IF clause.
			rasterReady(pword);

			// DEBUG
			console.log("Raster: " + JSON.stringify(raster));
			console.log("RasterSize: " + JSON.stringify(rasterSize));
		});
	}
}

async function fetchRasterAsync__() {
	console.log("ShowRaster::fetchRasterAsync()");

	let url = window.location.href.toLowerCase();
//	let pos = url.indexOf('/view');
	let pos = url.indexOf('/capture');	// test capture/ folder
	url = url.substring(0, pos);
	url += '/scenario.play';

	// let scenariodata = { text: word, scenario: scenario, ttf: ttf};
	let scenariodata = { text: word, scenario: scenario, type: type};

	/* How to pass SearchParams:
	var testurl = new URL(url),
		params = { lat: 35.696233, long: 139.570431 }
	Object.keys(params).forEach(key => testurl.searchParams.append(key, params[key]))
	*/

	try {
		// let response = await fetch(testurl, {
		let response = await fetch(url, {
			method: 'POST',
			body: JSON.stringify(scenariodata)
		});
		return await response.json();
	} catch (e) {
		return e.message;
	}
}

//////////////////
// Raster API (implemented on 20/06/2020)
// Params in URL:
// text, type (led1, led2, ttf),  slicing (None, Char, Line), alignment	(Center, Left, Right)
// spacing (for LED: int; default: 2)
// 1st option - default
async function getRasterFromApi__(text, type, slicing, alignment, fontsize, spacing) {
	if (null == text)
		throw ('Parameter Text is required');

	fetchRasterFromApiAsync(text, type, slicing, alignment, fontsize, spacing).then(result => {
		raster = result.raster;
		rasterSize = result.size;

		sessionStorage.setItem("Raster", JSON.stringify(raster));
		sessionStorage.setItem("RasterSize", JSON.stringify(rasterSize));

		rasterReady(text);
	});
}
// usage: getRasterFromApiNew({text: 'blah-blah', spacing: 3});
async function getRasterFromApiNew__({ text, type, slicing, alignment, fontsize, spacing }) {
	if (!text)
		throw ('Parameter Text is required');

	fetchRasterFromApiAsyncNew({ text, type, slicing, alignment, fontsize, spacing }).then(result => {
		raster = result.raster;
		rasterSize = result.size;

		sessionStorage.setItem("Raster", JSON.stringify(raster));
		sessionStorage.setItem("RasterSize", JSON.stringify(rasterSize));

		rasterReady(text, result);
	});
}

async function fetchRasterFromApiAsync__(text, type, slicing, alignment, fontsize, spacing) {
	console.log("ShowRaster::fetchRasterFromApiAsync()");

	// assuming that virtual direcctory might be either 'mowtestweb' or ''
	// http://localhost/MoWtestWeb/View/_test.html
	// http://mowtestweb.azurewebsites.net/View/_test.html

	let url = window.location.origin;	// normal
	// let url = "http://localhost";		// DEBUG
	// let url = "http://mowtestweb.azurewebsites.net";	// DEBUG

	if (window.location.pathname.toLowerCase().startsWith("/mowtestweb"))
		url += "/mowtestweb";

	url += '/api/raster?text=' + text;

	if (type) {
		url += '&type=' + type;
    }
	if (slicing) {
		url += '&slicing=' + slicing;
	}
	if (alignment) {
		url += '&alignment=' + alignment;
	}
	if (fontsize) {
		url += '&fontsize=' + fontsize;
	}
	if (spacing) {
		url += '&spacing=' + spacing;
	}

	try {
		let response = await fetch(url);
		return await response.json();
	} catch (e) {
		return e.message;
	}
}

async function fetchRasterFromApiAsyncNew__({ text, type, slicing, alignment, fontsize, spacing }) {
	console.log("ShowRaster::fetchRasterFromApiAsyncNew()");

	// assuming that virtual direcctory might be either 'mowtestweb' or ''
	// http://localhost/MoWtestWeb/View/_test.html
	// http://mowtestweb.azurewebsites.net/View/_test.html

	let url = window.location.origin;	// normal
	// let url = "http://localhost";		// DEBUG
	// let url = "http://mowtestweb.azurewebsites.net";	// DEBUG

	if (window.location.pathname.toLowerCase().startsWith("/mowtestweb"))
		url += "/mowtestweb";

	url += '/api/raster?text=' + text;

	if (type) {
		url += '&type=' + type;
	}
	if (slicing) {
		url += '&slicing=' + slicing;
	}
	if (alignment) {
		url += '&alignment=' + alignment;
	}
	if (fontsize) {
		url += '&fontsize=' + fontsize;
	}
	if (spacing) {
		url += '&spacing=' + spacing;
	}

	try {
		let response = await fetch(url);
		return await response.json();
	} catch (e) {
		return e.message;
	}
}

//////////////////


// get from storage
function getRasterSz() {
	console.log("ShowRaster::getRasterSz()");

	// var sz = document.getElementById('hdnRasterSize');
	var sz = sessionStorage.getItem("RasterSize");
	let rastersize = JSON.parse(sz);
	return rastersize;
}

// Init raster on (Canvas 2D) context
// getRaster() may be called before, as necessary. Check if it is already defined.
// rectangles: Rectangle(left, right, top, bottom)
// input setting - % of canvas size.
function InitRaster(ctx, rcInput, show = false) {
	console.log("ShowRaster::InitRaster()");

	// raster = JSON.parse(data).raster;
	// rasterSize = getRasterSize(raster);
	if (typeof raster === "undefined") {
		raster = getRaster();
    }

	if (null == raster) {
		stopShow();
		return;
	}

	if (null == rasterSize) {
		rasterSize = getRasterSz(raster);
	}

	/*
	canvas = document.getElementById('canvas');
	// Set canvas dimensions.
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	// Set the context, 2d in this case.
	var ctx = canvas.getContext('2d');
	*/

	// calc physical rect on canvas
	rcScaled = new Rectangle(rcInput.left * ctx.canvas.width / 100, rcInput.right * ctx.canvas.width / 100, rcInput.top * ctx.canvas.height / 100, rcInput.bottom * ctx.canvas.height / 100);

	// calc scales
	scaleX = rcScaled.w / rasterSize.Width;
	scaleY = rcScaled.h / rasterSize.Height;
	if (!stretch) {
		scaleX = scaleY = Math.min(scaleX, scaleY);
    }

	// calc banner rect: physical text boundaries
	rcBanner = getBanner(rcScaled, rasterSize);

	// rescale raster - map to banner
	mapRaster();

	charCenters = getCharCenters(raster);

	//// DEBUG
	if (show) {
		// show rectangle
		ctx.beginPath();
		ctx.strokeStyle = "blue";
		ctx.rect(rcBanner.left, rcBanner.top, rcBanner.w, rcBanner.h);
		ctx.stroke();

		drawRaster(ctx, raster, rad, "white");

		drawCharCenters(ctx, charCenters, rad, "red");
	}
}

// maps global raster to global rcBanner
function mapRaster() {
	console.log("ShowRaster::mapRaster()");

	for (var i = 0; i < raster.length; i++) {
		for (var j = 0; j < raster[i].length; j++) {
			raster[i][j].X *= scaleX;
			raster[i][j].X += rcBanner.left;

			raster[i][j].Y *= scaleY;
			raster[i][j].Y += rcBanner.top;
		}
	}
}

// returns 2-dim array of char centers
function getCharCenters(raster) {
	console.log("ShowRaster::getCharCenters()");

	var centers = new Array(raster.length);
	
	for (var i = 0; i < raster.length; i++)
	{
		var x = 0;
		var y = 0;
		var len = raster[i].length;
		for(var j = 0; j < len; j++)
		{
			x += raster[i][j].X;
			y += raster[i][j].Y;
		}
		x /= len;
		y /= len;
		
		centers[i] = new Array(2);
		centers[i][0] = x;
		centers[i][1] = y;
	}
	
	return centers;
}

// draw mapped raster
function drawRaster(ctx, raster, r, color) {
	console.log("ShowRaster::drawRaster()");

	for (var i = 0; i < raster.length; i++)
	{
		for(var j = 0; j < raster[i].length; j++)
		{
			//putMark(ctx, raster[i][j].X, raster[i][j].Y, r, color);
			putCross(ctx, raster[i][j].X, raster[i][j].Y, r, color);
			//putCross(ctx, raster[i][j].X, raster[i][j].Y, r, color, i, j);
		}
	}
}

function drawCharCenters(ctx, charCenters, r, color) {
	for(var i = 0; i < charCenters.length; i++)
	{
		//putMark(ctx, charCenters[i][0], charCenters[i][1], r, color);
		putCross(ctx, charCenters[i][0], charCenters[i][1], r, color);
	}
}

//// helpers
function getRasterSize(raster) {
	console.log("ShowRaster::getRasterSize()");

	var xmax = 0;
	var ymax = 0;
	for (var i = 0; i < raster.length; i++) {
		for (var j = 0; j < raster[i].length; j++) {
			if (raster[i][j].X > xmax)
				xmax = raster[i][j].X;
			if (raster[i][j].Y > ymax)
				ymax = raster[i][j].Y;
		}
	}
	return {
		w: xmax,
		h: ymax
	};
}

function getBanner(rcScaled, rastersize) {
	console.log("ShowRaster::getBanner()");

	let sclX = rcScaled.w / rastersize.Width;
	let sclY = rcScaled.h / rastersize.Height;

	let dx = 0.0;
	let dy = 0.0;

	if (sclX > sclY) {
		// recalc X
		dx = (rcScaled.w - rcScaled.h * rastersize.Width / rastersize.Height) / 2;;
	}
	else {
		// recalc Y
		dy = (rcScaled.h - rcScaled.w * rastersize.Height / rastersize.Width) / 2;
	}

	return new Rectangle(rcScaled.left + dx, rcScaled.right - dx, rcScaled.top + dy, rcScaled.bottom - dy);
}

function getRasterCount(raster) {
	console.log("ShowRaster::getRasterCount()");

	return raster.Statistics.TotalPoints;
}

// Test function to show raster on the canvas.
// Inputs:
// Raster: json file.
// CanvasID
// Rectangle coords on canvas: rectLeft, rectRight, rectTop, rectBottom - in percents of canvas size.
// Bool stretch, defaults to false - stretch raster to cover the whole rectangle or keep size ratio.
// ShowRaster(raster, canvas, rectLeft, rectRight, rectTop, rectBottom, stretch) {
//}

class Rectangle {
	constructor(left, right, top, bottom) {
		this.left = left;
		this.right = right;
		this.top = top;
		this.bottom = bottom;
		
		// 2025-01-28 addition
		this.center = new Point((left + right)/2, (top + bottom)/2);
	}
	// Getter
	get w() {
		return this.right - this.left;
	}
	get h() {
		return this.bottom - this.top;
	}
	
	// 2025-01-28 addition
	// Method
	scaleCenter(scale) {
		let newwidth = this.w*scale;
		let newheight = this.h*scale;
		
		this.left = this.center.x - newwidth/2;
		this.right = this.center.x + newwidth/2;
		this.top = this.center.y - newheight/2;
		this.bottom = this.center.y + newheight/2;
	}

	isPointIn(pnt) {
		if (pnt.x < this.left)
			return false;
		if (pnt.x > this.right)
			return false;
		if (pnt.y < this.top)
			return false;
		if (pnt.y > this.bottom)
			return false;

		return true;
	}
}

// round mark on 2D context
function putMark(ctx, x, y, r, color) {
	ctx.beginPath();
	// ellipse(x, y, rx, ry, rot, start, end)
	ctx.ellipse(x, y, r, r, 0, 0, 2 * Math.PI);
	ctx.fillStyle = color;
	ctx.fill();
}

// cross mark. r = leg of the cross
//function putCross(ctx, x, y, r, color, i, j) {
function putCross(ctx, x, y, r, color) {
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x - r, y);
	ctx.lineTo(x + r, y);
	ctx.stroke();
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x, y - r);
	ctx.lineTo(x, y + r);
	ctx.stroke();

	// debug
	// ctx.font = '10px serif';
	// ctx.fillText(i + ',' + j, x, y);
}

// GF/mow helpers
function Point(x, y) {
	this.x = x;
	this.y = y;
}
// Linear Interpolation/extrapolation
// f0 = f(x0); f1 = f(x1); returns f = f(x)
function interpolate(x0, x1, f0, f1, x) {
	// linear function f(x): f = a*x + b;
	// f0 = f(x0); f1 = f(x1);
	// f = (f1 - f0)/x1 + f0; - for x0 == 0;
	// general case: a = (f1 - f0)/(x1 - x0); b = f0 - a*x0;
	let a = (f1 - f0) / (x1 - x0);
	let b = f0 - a * x0;
	return a * x + b;
}

//// Add method to Sprite:
//Scene.Sprite.prototype.positionCenter = function (x, y) {} - no go :()
function positionCenter(sp, x, y) {
	sp.position(x - sp.w / 2, y - sp.h / 2);
};

// rectBanner - banner (text) size in pixels
// imgW, imgH - (effective) image size
// trinkets count
// density - banner density factor
function getTargetScale(rectBanner, imgW, imgH, count, density) {
	return Math.sqrt(rectBanner.w * rectBanner.h * density / imgW / imgH / count);
}

// map raster to be contained in the banner rect
function mapRasterContain(bannerX, bannerY, bannerWidth, bannerHeight, raster, rasterSize) {
	let rasterRatio = rasterSize.Height / rasterSize.Width;
	let bannerRatio = bannerHeight / bannerWidth;
	var bannerscale = 1;
	var containedMargX = 0;		// margin after 'contain' scaling.
	var containedMargY = 0;

	if (rasterRatio < bannerRatio) {
		bannerscale = bannerWidth / rasterSize.Width;
		containedMargY = (bannerHeight - rasterSize.Height * bannerscale) / 2;
	}
	else {
		bannerscale = bannerHeight / rasterSize.Height;
		containedMargX = (bannerWidth - rasterSize.Width * bannerscale) / 2;
	}

	var mapped = [];

	for (i = 0; i < raster.length; i++) {
		var subarray = [];
		for (j = 0; j < raster[i].length; j++) {
			let pnt = new Object();
			pnt.X = raster[i][j].X * bannerscale + bannerX + containedMargX;
			pnt.Y = raster[i][j].Y * bannerscale + bannerY + containedMargY;
			subarray.push(pnt);
		}
		mapped.push(subarray);
	}

	return mapped;
}


//////////////////
// make text
var rcText, bannerStep, targetScale;	// rcBanner - global
var trinketD = 1;	// trinket diameter in current scale.
var itemSizeMax = 2;
var itemSizeMin = 0.5;
var bannerResizedW = 0;	// set in createBanner() to help visualize in DEBUG mode re-scaled textQuad.
var bannerResizedH = 0;

// NB: also creates and returns trinkets positioned on Z == 0 plane (raster.x, 0, raster.y)
function createBanner(left, right, top, bottom, trinket /* trinket to clone */, density = 1) {
	console.log("ShowRaster.createBanner()");

	let trinkets = [];

	// Rectangle(l, r, t, b);
	//rcBanner = new Rectangle(-BANNER_WIDTH / 2, BANNER_WIDTH / 2, bannerCenterZ - BANNER_HEIGHT / 2, bannerCenterZ + BANNER_HEIGHT / 2);
	rcBanner = new Rectangle(left, right, top, bottom);

	// targets array; NB: mapRasterSizewise() modifies targetScale
	let targets = mapRasterSizewise(rcBanner, itemSizeMax, itemSizeMin, density);

	for (let i = 0; i < targets.length; i++) {
		for (let j = 0; j < targets[i].length; j++) {
			let clone = THREE.SkeletonUtils.clone(trinket);	// ### versions(?) problems
			// let clone = trinket.clone();

			clone.name = 'clone_' + i + '_' + j;

			// target scale
			clone.scale.multiplyScalar(targetScale * random(0.9, 1.1));
			clone.rotateY(random(-Math.PI, Math.PI));

			clone.position.set(targets[i][j].X, 0, targets[i][j].Y);
			scene.add(clone);

			// save in trinkets array
			let target = new THREE.Vector3();
			target.copy(clone.position);
			clone.userData.target = target;
			clone.userData.idx = trinkets.length;
			trinkets.push(clone);
		}
	}

	return trinkets;
}

//// move to ShowRaster(?)
// Globals: raster, rasterSize, trinketscale (out; in: 1)
// params: rcBanner, itemSizeMax, itemSizeMin, density (1: step == item diameter. 1.5: diameter == 1.5*step)
// workflow:
// - calc rcText: max rect contained in rcBanner
// - calc step (between target points)
// - calc target item diameter = density*step
// - if targetItemDiam > itemSizeMax: scale down all: itemScale, step, rcText
// - if targetItemDiam < itemSizeMin: scale all up, cut overflow (do not place items beyond rcBanner)
// - set external trinketScale
// - return target map array
let trinketscale = 1;	// trinket scale factor
function mapRasterSizewise(rcBanner, itemSizeMax, itemSizeMin, density = 1) {
	console.log("ShowRaster.mapRasterSizewise()");

	//// DEBUG
	console.log("rcBanner:", rcBanner, "itemSizeMax:", itemSizeMax, "itemSizeMin:", itemSizeMin, "density:", density);
	////

	// - calc rcText: max rect contained in rcBanner
	let rasterRatio = rasterSize.Height / rasterSize.Width;
	let bannerRatio = rcBanner.h / rcBanner.w;

	let textL, textR, textT, textB;	// rcText sides
	if (rasterRatio < bannerRatio) {
		// wide text: touching left and right banner sides; textW == banner.w
		textL = rcBanner.left;
		textR = rcBanner.right;

		// textH/textW == rasterSize.Height / rasterSize.Width
		let textH = rasterSize.Height / rasterSize.Width * rcBanner.w;
		textT = rcBanner.center.y - textH / 2;
		textB = rcBanner.center.y + textH / 2;
	}
	else {
		// high text: touching banner top and bottom
		textT = rcBanner.top;
		textB = rcBanner.bottom;

		// textW/textH == rasterSize.Width / rasterSize.Height
		let textW = rasterSize.Width / rasterSize.Height * rcBanner.h;
		textL = rcBanner.center.x - textW / 2;
		textR = rcBanner.center.x + textW / 2;
	}

	rcText = new Rectangle(textL, textR, textT, textB);

	// - calc step (between target points)
	bannerStep = rcText.w / rasterSize.Width;

	// - calc target item diameter = density*step
	let targetD = density * bannerStep;

	let left = textL;	// to be used for target points calculation. May be rescaled/recalculated.
	let top = textT;

	//// DEBUG
	console.log("rcText:", rcText, "bannerStep:", bannerStep, "targetD:", targetD);
	////

	////// item size restrictions.
	// To make it clean, do not resize rcText.
	// Threfore calc positions not from top - left of rcText but rather from its center.
	let rescaled = false;
	if (targetD > itemSizeMax) {
		rescaled = true;
		targetD = itemSizeMax;
		// correct step
	} else if (targetD < itemSizeMin) {
		rescaled = true;
		targetD = itemSizeMin;
	}
	//////

	targetScale = targetD / trinketD;	// scale to be used for trinkets creation

	if (rescaled) {
		bannerStep = targetD / density;

		// recon from center. Actual scaled text size:
		bannerResizedW = rasterSize.Width * bannerStep;		// global vars for client script to check
		bannerResizedH = rasterSize.Height * bannerStep;
		left = rcBanner.center.x - bannerResizedW / 2;
		top = rcBanner.center.y - bannerResizedH / 2;

		//// DEBUG
		console.log("Rescaled! bannerStep:", bannerStep, "targetD:", targetD, "targetScale:", targetScale, "quad:", bannerResizedW, "x", bannerResizedH);
		////
	}

	var mapped = [];
	for (i = 0; i < raster.length; i++) {
		var subarray = [];
		for (j = 0; j < raster[i].length; j++) {
			let pnt = new Object();
			pnt.X = raster[i][j].X * bannerStep + left;
			pnt.Y = raster[i][j].Y * bannerStep + top;

			subarray.push(pnt);
		}
		mapped.push(subarray);
	}

	return mapped;
}

// DEBUG
//function showTextRect(rect, pos) {
//	const rect_geo = new THREE.PlaneGeometry(rect.w, rect.h);
//	const rect_mat = new THREE.MeshBasicMaterial({ color: 0x0000ff, opacity: 0.25, transparent: true });

//	const planeText = new THREE.Mesh(rect_geo, rect_mat);
//	planeText.name = 'planeText';

//	planeText.position.set(pos.x, pos.y, pos.z);

//	// lay it flat, after base plane
//	planeText.rotateX(-Math.PI / 2);

//	scene.add(planeText);
//}

//// DEBUG helper; creates banner plane and adds to the scene.
//function showBanner(bannerW, bannerH, pos) {
//	const banner_geo = new THREE.PlaneGeometry(bannerW, bannerH);
//	const banner_mat = new THREE.MeshBasicMaterial({ color: 0xffff00, opacity: 0.25, transparent: true });
//	const banner = new THREE.Mesh(banner_geo, banner_mat);
//	banner.name = 'banner';
//	banner.position.copy(pos);

//	// lay it flat, after base plane
//	banner.rotateX(-Math.PI / 2);

//	scene.add(banner);
//}

// make 'showThis', 'showThat' uniform. One function for displaying/visualizing quad (plane) for debug.
function showQuad(W, H, pos, rotX, rotY, rotZ /* radians 'XYZ' */, color, name) {
	const geo = new THREE.PlaneGeometry(W, H);
	const mat = new THREE.MeshBasicMaterial({ color: color, opacity: 0.25, transparent: true });
	const quad = new THREE.Mesh(geo, mat);
	quad.name = name;
	quad.position.copy(pos);
	quad.rotation.set(rotX, rotY, rotZ, 'XYZ');

	return quad;
}
/////////////////////