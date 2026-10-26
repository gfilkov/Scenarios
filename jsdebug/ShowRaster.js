//// MoW API version
const apiUrl = "https://mowapi-hvb7htbzgfeubfh0.canadacentral-01.azurewebsites.net/api/TextToCoords";
//const apiUrl = 'http://localhost:7031/api/TextToCoords';

// Get raster; calc banner, density, target scale
// MOW raster stuff
var raster;
var rasterSize;
var rasterCount = 0;
var isRasterReady = false;

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
// NB: global object rasterParams (above) should be ready now. Scene and Text filled with URL params, others null.
// If scenario uses any other params, it should set rasterParams properties accordingly before calling getRaster()
// optional 'slogan' param - to override rasterParams.text for multi-slogan scenarios.
async function getRaster(callback, slogan) {
	console.log("ShowRaster::getRaster()");
	
	fetchRasterFromApiAsyncNew({ api: apiUrl, param: rasterParams, callback: callback, slogan }).then(result => {

		// DEBUG
		console.log("=== RAW RESULT ===");
		console.log("Type:", typeof result);
		console.log("Keys:", Object.keys(result || {}));
		console.log("Characters count:", result?.Characters?.length);
		console.log("First char coords:", result?.Characters?.[0]?.Coordinates?.length);
		console.log("Full result:", JSON.stringify(result).substring(0, 500));

		rasterSize = result.Statistics.TextSize;
		raster = result;

		callback(result);

		return result;
	});
}

// get raster using param object; optional slogan overrides param.slogan
async function fetchRasterFromApiAsyncNew({ api: api, param: param, callback: callback, slogan }) {
		console.log(`fetchRasterFromApiAsyncNew(${api})`);

	// optional 'slogan' param - to override rasterParams.text for mulri-slogan scenarios.
	let text = param.text;
	if (slogan)
		text = slogan;

	if (!text)
		throw ('Parameter Text is required');
	
	//const apiUrl = 'http://localhost:7031/api/TextToCoords';
	let url = `${api}?text=${encodeURIComponent(text)}`;
	
	if(param.align)
		url += '&align=' + param.align;
		
	if(param.type)
		url += '&type=' + param.type;
		
	if(param.fontFamily)
		url += '&fontFamily=' + param.fontFamily;
		
	if(param.fontSize)
		url += '&fontSize=' + param.fontSize;
	
	if(param.canvasWidth)
		url += '&canvasWidth=' + param.canvasWidth;
		
	if(param.canvasHeightv)
		url += '&canvasHeight=' + param.canvasHeight;
	
	if(param.step)
		url += '&step=' + param.step;

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


// DEBUG
const rad = 4;

// Init raster on (Canvas 2D) context
// getRaster() must be called before. Check if it is already defined.
// rectangles: Rectangle(left, right, top, bottom)
// input setting - % of canvas size.
function InitRaster(ctx, rcInput, show = false) {
	console.log("ShowRaster::InitRaster()");

	if (!raster) {
		stopShow();
		return;
	}

	if (null == rasterSize) {
		rasterSize = result.Statistics.TextSize;
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

// re-maps global raster to global rcBanner
function mapRaster() {
	console.log("ShowRaster::mapRaster()");

	//callback({ X: pnt.X, Y: pnt.Y, iChar: i, iPoint: j, iLine: pnt.LineIndex });
	forEachRasterPoint(raster, (pnt) => {
		let i = pnt.iChar;
		let j = pnt.iPoint;

		raster.Characters[i].Coordinates[j].X *= scaleX;
		raster.Characters[i].Coordinates[j].X += rcBanner.center.x;

		raster.Characters[i].Coordinates[j].Y *= scaleY;
		raster.Characters[i].Coordinates[j].Y += rcBanner.center.y;
	});
}

// returns array of char centers objects.
function getCharCenters(raster) {
	console.log("ShowRaster::getCharCenters()");

	const nChars = raster.Characters.length;
	const centers = new Array();
	
	for (let i = 0; i < nChars; i++)
	{
		let x = 0;
		let y = 0;
		const nPoints = raster.Characters[i].Coordinates.length;
		for (let j = 0; j < nPoints; j++)
		{
			x += raster.Characters[i].Coordinates[j].X;
			y += raster.Characters[i].Coordinates[j].Y;
		}
		x /= nPoints;
		y /= nPoints;
		
		let pnt = new Object();
		pnt.X = x;
		pnt.Y = y;
		centers.push(pnt);
	}
	
	return centers;
}

// DEBUG
const dbgStep = 8;

// draw mapped raster (scenario musst call InitRaster() -> MapRaster(): raster is mapped to rcScaled)
function drawRaster(ctx, raster, r, color) {
	console.log("ShowRaster::drawRaster()");

	forEachRasterPoint(raster, (pnt) => {
		//const X0 = ctx.canvas.width / 2;
		//const Y0 = ctx.canvas.height / 2;
		//putCross(ctx, X0 + pnt.X * dbgStep, Y0 + pnt.Y * dbgStep, r, color);
		putCross(ctx, pnt.X, pnt.Y, r, color);
	});
}

function drawCharCenters(ctx, charCenters, r, color) {
	//const X0 = ctx.canvas.width / 2;
	//const Y0 = ctx.canvas.height / 2;

	for(var i = 0; i < charCenters.length; i++)
	{
		putMark(ctx, charCenters[i].X, charCenters[i].Y, r, color);
		// putCross(ctx, X0 + charCenters[i].X * dbgStep, Y0 + charCenters[i].Y * dbgStep, r, color);
	}
}

//// helpers
function getRasterSize(raster) {
	console.log("ShowRaster::getRasterSize()");

	return raster.Statistics.TextSize;
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

	for (i = 0; i < rasterSize; i++) {
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
	// bannerStep = rcText.w / rasterSize.Width;	// raster step not accounted for, too sparce
	bannerStep = rcText.w / rasterSize.Width / raster.Statistics.Step;

	// - calc target item diameter = density*step
	let targetD = density * bannerStep;

	//let left = textL;	// to be used for target points calculation. May be rescaled/recalculated.
	//let top = textT;

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
		//bannerResizedW = rasterSize.Width * bannerStep;		// global vars for client script to check
		//bannerResizedH = rasterSize.Height * bannerStep;

		bannerResizedW = rasterSize.Width * bannerStep / raster.Statistics.Step;		// global vars for client script to check
		bannerResizedH = rasterSize.Height * bannerStep / raster.Statistics.Step;

		//// DEBUG
		console.log("Rescaled! bannerStep:", bannerStep, "targetD:", targetD, "targetScale:", targetScale, "quad:", bannerResizedW, "x", bannerResizedH);
		////
	}

	var mapped = [];

	// rpoint: raster.Characters[i].Coordinates[j]

	for (i = 0; i < raster.Characters.length; i++) {
		var subarray = [];
		for (j = 0; j < raster.Characters[i].Coordinates.length; j++) {
			let rp = raster.Characters[i].Coordinates[j];
			let pnt = new Object();
			pnt.X = rp.X * bannerStep / raster.Statistics.Step;
			pnt.Y = rp.Y * bannerStep / raster.Statistics.Step;

			// position in Banner
			pnt.X += rcBanner.center.x;
			pnt.Y += rcBanner.center.y;
			subarray.push(pnt);
		}
		mapped.push(subarray);
	}

	return mapped;
}

///////////// ### TEST
// Callback param: rpoint: raster.Characters[i].Coordinates[j]
function forEachRasterPoint(raster, callback) {
	for (let i = 0; i < raster.Characters.length; i++) {
		const coords = raster.Characters[i].Coordinates;
		for (let j = 0; j < coords.length; j++) {
			const pnt = coords[j];
			callback({ X: pnt.X, Y: pnt.Y, iChar: i, iPoint: j, iLine: pnt.LineIndex});
		}
	}
}

function myTestFunc(raster) {
	let chars = [];
	function myCallback(rchar) {
		chars.push(rchar.Character);
	}
	forEachRasterPoint(raster, myCallback);
	return chars;
}

/*let test = myTestFunc(raster);*/

/////////////

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