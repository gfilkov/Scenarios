// MoW helper functions to handle sprite.js sprites.
// sprite.js sprites are positioned by the top-left corner of origional non-scaled and not-rotated sprite.
// Combining of positioning, scaling and rotation provides very clumsy and un-obvious behavior.

// NB: sprite.js dirty trick: scaling does not work id opacity is 1. To make it work: sprite.opacity = 0.99;

// NB: javascript trick to mimic named params:
/*
function example({ arg1 = 1, arg2 = 2, arg3 = 3 } = {}) {
  return { arg1, arg2, arg3 };
}

example({ arg2: 4, arg1: 2 }); // { arg1: 2, arg2: 4, arg3: 3 }

example(); // { arg1: 1, arg2: 2, arg3: 3 }
}*/

// rotate around anchor
function gfRotate(sp, angle, anchor = null) {
	// 0. SP positioned by anchor; rotated to initial angle alpha.
	// 1. Find initial physical anchor pos A0
	// 2. Rotate SP on beta angle.
	// 3. Find new physical anchor pos A1
	// 4. move SP A1 -> A0(anchor is anchor == const)

	// find phys center, mark
	let center = new Point(sp.x + sp.w / 2, sp.y + sp.h / 2);
	_cx = center.x;	// DEBUG
	_cy = center.y;

	sp.rotate(angle);

	// no anchor == rotate around center
	if (null == anchor ) {
		return;
	}

	// find anchor, mark
	// top-left corner
	let wscaled = sp.w * sp.xscale;
	let hscaled = sp.h * sp.yscale;
	let tlp = new Point(center.x - wscaled / 2, center.y - hscaled / 2);

	// rotate scaled anchor around center on SP initial angle alpha:
	let ancScaled = new Point(tlp.x + anchor.x * sp.xscale, tlp.y + anchor.y * sp.yscale);

	// this is initial physical anchor position!
	let ancInit = rotatePoint(center, ancScaled, -sp.angle);
	_posx = ancInit.x;	// DEBUG
	_posy = ancInit.y;	// BLUE

	_x = ancScaled.x;	// DEBUG
	_y = ancScaled.y;

	let ancNew = rotatePoint(center, ancScaled, -sp.angle + angle);

	// move SP: A1 -> A0(anchor is anchor == const)
	sp.move(ancNew.x - ancInit.x, ancNew.y - ancInit.y);
}


// position the anchor point, set the angle to param, if provided, to sp.angle otherwise.
// no anchor provided - means anchor is center.
// NB: assumption: sp.xscale == sp.yscale.
// vars like_x: debug vars
// ## don't know how to pass objects params, only primitive vars work:
// function gfPosition({ sp = null, pos = null, anchor = null, angle = null } = {}) {
function gfPosition({ sp = null, x = null, y = null, ax = null, ay = null, angle = null } = {}) {
	if (null == sp) {
		alert('Params error: Sprite missing');
		return;
	}
	if (null == x || null == y) {
		alert('Params error: Position is missing');
		return;
	}

	var pos = new Point(x, y);

	// anchor
	let ancx = ax;
	let ancy = ay;
	if (null == ax || null == ay) {
		ancx = sp.w / 2;
		ancy = sp.h / 2;
	}
	let ancOrg = new Point(ancx, ancy);

	// position
	sp.position(pos.x, pos.y);	// WHITE

	// top-left corner. If no scaling, top-left corner is (x, y)
	let topleft = new Point(pos.x, pos.y);

	// after scaling
	if (sp.xscale != 1 || sp.yscale != 1) {
		topleft.x = pos.x - sp.w * (sp.xscale - 1) / 2;
		topleft.y = pos.y - sp.h * (sp.yscale - 1) / 2;
	}

	// scaled anchor position
	pancx = topleft.x + ancOrg.x * sp.xscale;
	pancy = topleft.y + ancOrg.y * sp.yscale;
	let anchor = new Point(pancx, pancy);

	let center = new Point(topleft.x + sp.w / 2 * sp.xscale, topleft.y + sp.h / 2 * sp.yscale);

	// move (scaled) anchor point to (x, y)
	let dx = pos.x - anchor.x;
	let dy = pos.y - anchor.y;
	sp.move(dx, dy);

	if (null == angle && 0 == sp.angle)
		return;

	// move anchor and center markers too:
	center.x += dx;
	center.y += dy;

	anchor = new Point(anchor.x + dx, anchor.y + dy);

	// rotate (around center); if angle was set, ignore.
	if (null != angle)
		sp.setAngle(angle);

	// if no anchor (centered) - just set angle
	if (null == ax || null == ay)
		return;

	// find position rotated around center (now sp.angle is set anyways)
	let newpos = rotatePoint(center, pos, -sp.angle);
	sp.move(pos.x - newpos.x, pos.y - newpos.y);
}

// rotate point (x,y) around center (cx,cy), radians. Positive rotation - counter clock.
function rotate(cx, cy, x, y, angle) {
	var cos = Math.cos(angle),
		sin = Math.sin(angle),
		nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
		ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
	return [nx, ny];
}

function rotatePoint(center, point, angle) {
	var cos = Math.cos(angle),
		sin = Math.sin(angle),
		nx = (cos * (point.x - center.x)) + (sin * (point.y - center.y)) + center.x,
		ny = (cos * (point.y - center.y)) - (sin * (point.x - center.x)) + center.y;
	return new Point(nx, ny);
}

// Debug helper: show sprite's center, position, size, anchor, etc.
// putCross(), putMark() - ShowRaster.js; anchor: Point(x,y)
function gfShowSprite(ctx, sp, anchor = null) {
	let corners = [];
	let cornersScaled = [];
	let scaled = 1 != sp.xscale || 1 != sp.yscale;

	// mark org corners
	corners.push(new Point(sp.x, sp.y));
	corners.push(new Point(sp.x + sp.w, sp.y));
	corners.push(new Point(sp.x + sp.w, sp.y + sp.h));
	corners.push(new Point(sp.x, sp.y + sp.h));

	markCorners(ctx, corners, 'red');

	// mark center
	let cx = sp.x + sp.w / 2;
	let cy = sp.y + sp.h / 2;
	putMark(ctx, cx, cy, 4, 'green');

	// mark scaled corners
	let wscaled = sp.w * sp.xscale;
	let hscaled = sp.h * sp.yscale;
	let tlp = new Point(cx - wscaled / 2, cy - hscaled / 2);
	if (scaled) {
		cornersScaled.push(tlp);
		cornersScaled.push(new Point(cx + wscaled / 2, cy - hscaled / 2));
		cornersScaled.push(new Point(cx + wscaled / 2, cy + hscaled / 2));
		cornersScaled.push(new Point(cx - wscaled / 2, cy + hscaled / 2));

		markCorners(ctx, cornersScaled, 'white');
	}

	// mark scaled anchor
	let anchorx = null;
	let anchory = null;
	if (null != anchor) {
		anchorx = tlp.x + anchor.x * sp.xscale;
		anchory = tlp.y + anchor.y * sp.yscale;
		putMark(ctx, anchorx, anchory, 2, 'red');
    }
}

// starting from TL clock-wise; corners = Points[4]
function markCorners(ctx, corners, color) {
	let d = 12;	// stroke length

	ctx.strokeStyle = color;
	ctx.lineWidth = 2;

	// TL
	let x = corners[0].x;
	let y = corners[0].y;

	ctx.beginPath();
	ctx.moveTo(x, y + d);
	ctx.lineTo(x, y);
	ctx.lineTo(x + d, y);
	ctx.stroke();

	// TR
	x = corners[1].x;
	y = corners[1].y;

	ctx.beginPath();
	ctx.moveTo(x, y + d);
	ctx.lineTo(x, y);
	ctx.lineTo(x - d, y);
	ctx.stroke();

	// BR
	x = corners[2].x;
	y = corners[2].y;

	ctx.beginPath();
	ctx.moveTo(x, y - d);
	ctx.lineTo(x, y);
	ctx.lineTo(x - d, y);
	ctx.stroke();

	// BL
	x = corners[3].x;
	y = corners[3].y;

	ctx.beginPath();
	ctx.moveTo(x, y - d);
	ctx.lineTo(x, y);
	ctx.lineTo(x + d, y);
	ctx.stroke();
}