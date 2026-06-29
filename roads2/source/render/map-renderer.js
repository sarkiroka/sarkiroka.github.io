window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.mapRenderer = {};

function traceRoundedRectPath(context, viewTransform, centerXMeters, centerYMeters, halfWidthMeters, halfHeightMeters, cornerRadiusMeters) {
	const topLeftScreen = viewTransform.worldToScreen(
		centerXMeters - halfWidthMeters,
		centerYMeters - halfHeightMeters
	);
	const bottomRightScreen = viewTransform.worldToScreen(
		centerXMeters + halfWidthMeters,
		centerYMeters + halfHeightMeters
	);
	const radiusPixels = viewTransform.metersToPixels(cornerRadiusMeters);
	const rectangleX = topLeftScreen.x;
	const rectangleY = topLeftScreen.y;
	const rectangleWidth = bottomRightScreen.x - topLeftScreen.x;
	const rectangleHeight = bottomRightScreen.y - topLeftScreen.y;

	context.beginPath();
	context.moveTo(rectangleX + radiusPixels, rectangleY);
	context.lineTo(rectangleX + rectangleWidth - radiusPixels, rectangleY);
	context.quadraticCurveTo(
		rectangleX + rectangleWidth,
		rectangleY,
		rectangleX + rectangleWidth,
		rectangleY + radiusPixels
	);
	context.lineTo(rectangleX + rectangleWidth, rectangleY + rectangleHeight - radiusPixels);
	context.quadraticCurveTo(
		rectangleX + rectangleWidth,
		rectangleY + rectangleHeight,
		rectangleX + rectangleWidth - radiusPixels,
		rectangleY + rectangleHeight
	);
	context.lineTo(rectangleX + radiusPixels, rectangleY + rectangleHeight);
	context.quadraticCurveTo(
		rectangleX,
		rectangleY + rectangleHeight,
		rectangleX,
		rectangleY + rectangleHeight - radiusPixels
	);
	context.lineTo(rectangleX, rectangleY + radiusPixels);
	context.quadraticCurveTo(rectangleX, rectangleY, rectangleX + radiusPixels, rectangleY);
	context.closePath();
}

function fillConcentricRoundedRect(context, viewTransform, mapDefinition, buildingBlock, halfWidthMeters, halfHeightMeters, fillColor, strokeColor) {
	const cornerRadiusMeters = RoadsSimulation.mapGeometry.getCornerRadiusForHalfExtent(
		mapDefinition,
		buildingBlock,
		halfWidthMeters
	);

	traceRoundedRectPath(
		context,
		viewTransform,
		buildingBlock.centerXMeters,
		buildingBlock.centerYMeters,
		halfWidthMeters,
		halfHeightMeters,
		cornerRadiusMeters
	);
	context.fillStyle = fillColor;
	context.fill();

	if (strokeColor) {
		context.strokeStyle = strokeColor;
		context.lineWidth = 1;
		context.stroke();
	}
}

function drawFilledRect(context, viewTransform, centerXMeters, centerYMeters, halfWidthMeters, halfHeightMeters, fillColor, strokeColor) {
	const topLeft = viewTransform.worldToScreen(
		centerXMeters - halfWidthMeters,
		centerYMeters - halfHeightMeters
	);
	const bottomRight = viewTransform.worldToScreen(
		centerXMeters + halfWidthMeters,
		centerYMeters + halfHeightMeters
	);

	const screenWidth = bottomRight.x - topLeft.x;
	const screenHeight = bottomRight.y - topLeft.y;

	context.fillStyle = fillColor;
	context.fillRect(topLeft.x, topLeft.y, screenWidth, screenHeight);

	if (strokeColor) {
		context.strokeStyle = strokeColor;
		context.lineWidth = 1;
		context.strokeRect(topLeft.x, topLeft.y, screenWidth, screenHeight);
	}
}

function drawDashedCenterLine(context, viewTransform, mapDefinition, buildingBlock) {
	const centerlineHalfExtent = RoadsSimulation.mapGeometry.getCenterlineHalfExtent(mapDefinition, buildingBlock);
	const cornerRadiusMeters = RoadsSimulation.mapGeometry.getCornerRadiusForHalfExtent(
		mapDefinition,
		buildingBlock,
		centerlineHalfExtent
	);

	traceRoundedRectPath(
		context,
		viewTransform,
		buildingBlock.centerXMeters,
		buildingBlock.centerYMeters,
		centerlineHalfExtent,
		centerlineHalfExtent,
		cornerRadiusMeters
	);

	context.save();
	context.strokeStyle = '#ffffff';
	context.lineWidth = 2;
	context.setLineDash([12, 10]);
	context.stroke();
	context.restore();
}

function drawStripedBarrierRectangle(context, viewTransform, barrierRectangle) {
	const topLeftScreen = viewTransform.worldToScreen(barrierRectangle.minXMeters, barrierRectangle.minYMeters);
	const bottomRightScreen = viewTransform.worldToScreen(barrierRectangle.maxXMeters, barrierRectangle.maxYMeters);
	const rectangleX = topLeftScreen.x;
	const rectangleY = topLeftScreen.y;
	const rectangleWidth = bottomRightScreen.x - topLeftScreen.x;
	const rectangleHeight = bottomRightScreen.y - topLeftScreen.y;

	context.save();
	context.beginPath();
	context.rect(rectangleX, rectangleY, rectangleWidth, rectangleHeight);
	context.clip();

	context.fillStyle = '#ffcc00';
	context.fillRect(rectangleX, rectangleY, rectangleWidth, rectangleHeight);

	const stripeSpacingPixels = Math.max(6, viewTransform.metersToPixels(0.18));
	const stripeWidthPixels = stripeSpacingPixels / 2;
	const diagonalLengthPixels = Math.sqrt(rectangleWidth * rectangleWidth + rectangleHeight * rectangleHeight);

	context.strokeStyle = '#111111';
	context.lineWidth = stripeWidthPixels;

	for (
		let stripeOffsetPixels = -diagonalLengthPixels;
		stripeOffsetPixels < diagonalLengthPixels * 2;
		stripeOffsetPixels += stripeSpacingPixels
	) {
		context.beginPath();
		context.moveTo(rectangleX + stripeOffsetPixels, rectangleY);
		context.lineTo(rectangleX + stripeOffsetPixels + rectangleHeight, rectangleY + rectangleHeight);
		context.stroke();
	}

	context.restore();
	context.strokeStyle = '#111111';
	context.lineWidth = 1;
	context.strokeRect(rectangleX, rectangleY, rectangleWidth, rectangleHeight);
}

function drawPothole(context, viewTransform, constructionZone) {
	const potholeCorners = RoadsSimulation.constructionGeometry.getPotholeCornerPositions(constructionZone);
	const terrainKinds = RoadsSimulation.terrainKinds;

	context.beginPath();
	const firstScreenCorner = viewTransform.worldToScreen(
		potholeCorners[0].cornerXMeters,
		potholeCorners[0].cornerYMeters
	);
	context.moveTo(firstScreenCorner.x, firstScreenCorner.y);

	for (let cornerIndex = 1; cornerIndex < potholeCorners.length; cornerIndex += 1) {
		const screenCorner = viewTransform.worldToScreen(
			potholeCorners[cornerIndex].cornerXMeters,
			potholeCorners[cornerIndex].cornerYMeters
		);
		context.lineTo(screenCorner.x, screenCorner.y);
	}

	context.closePath();
	context.fillStyle = terrainKinds.pothole.fillColor;
	context.fill();
	context.strokeStyle = terrainKinds.pothole.strokeColor;
	context.lineWidth = 1;
	context.stroke();
}

function drawConstructionZone(context, viewTransform, mapDefinition) {
	const constructionZone = RoadsSimulation.constructionGeometry.getConstructionZone(mapDefinition);

	if (!constructionZone) {
		return;
	}

	const southBarrier = RoadsSimulation.constructionGeometry.getSouthBarrierRectangle(constructionZone);
	const northBarrier = RoadsSimulation.constructionGeometry.getNorthBarrierRectangle(constructionZone);

	drawStripedBarrierRectangle(context, viewTransform, southBarrier);
	drawStripedBarrierRectangle(context, viewTransform, northBarrier);
	drawPothole(context, viewTransform, constructionZone);
}

RoadsSimulation.mapRenderer.drawMap = function drawMap(context, viewTransform, mapDefinition) {
	const buildingBlock = mapDefinition.buildingBlocks[0];
	const zoneHalf = RoadsSimulation.mapGeometry.getZoneHalfExtents(mapDefinition, buildingBlock);
	const terrainKinds = RoadsSimulation.terrainKinds;

	fillConcentricRoundedRect(
		context,
		viewTransform,
		mapDefinition,
		buildingBlock,
		zoneHalf.roadHalfWidth,
		zoneHalf.roadHalfHeight,
		terrainKinds.outside.fillColor,
		null
	);

	fillConcentricRoundedRect(
		context,
		viewTransform,
		mapDefinition,
		buildingBlock,
		zoneHalf.roadHalfWidth,
		zoneHalf.roadHalfHeight,
		terrainKinds.road.fillColor,
		terrainKinds.road.strokeColor
	);

	fillConcentricRoundedRect(
		context,
		viewTransform,
		mapDefinition,
		buildingBlock,
		zoneHalf.greenHalfWidth,
		zoneHalf.greenHalfHeight,
		terrainKinds.green.fillColor,
		terrainKinds.green.strokeColor
	);

	fillConcentricRoundedRect(
		context,
		viewTransform,
		mapDefinition,
		buildingBlock,
		zoneHalf.sidewalkHalfWidth,
		zoneHalf.sidewalkHalfHeight,
		terrainKinds.sidewalk.fillColor,
		terrainKinds.sidewalk.strokeColor
	);

	drawFilledRect(
		context,
		viewTransform,
		buildingBlock.centerXMeters,
		buildingBlock.centerYMeters,
		zoneHalf.buildingHalfWidth,
		zoneHalf.buildingHalfHeight,
		terrainKinds.building.fillColor,
		terrainKinds.building.strokeColor
	);

	drawDashedCenterLine(context, viewTransform, mapDefinition, buildingBlock);
	drawConstructionZone(context, viewTransform, mapDefinition);
};
