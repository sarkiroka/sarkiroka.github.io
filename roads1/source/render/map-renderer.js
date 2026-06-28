window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.mapRenderer = {};

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
	const zoneHalf = RoadsSimulation.mapGeometry.getZoneHalfExtents(mapDefinition, buildingBlock);
	const laneWidth = mapDefinition.dimensions.laneWidthMeters;
	const centerlineHalfWidth = zoneHalf.greenHalfWidth + laneWidth;
	const centerlineHalfHeight = zoneHalf.greenHalfHeight + laneWidth;

	const topLeft = viewTransform.worldToScreen(
		buildingBlock.centerXMeters - centerlineHalfWidth,
		buildingBlock.centerYMeters - centerlineHalfHeight
	);
	const topRight = viewTransform.worldToScreen(
		buildingBlock.centerXMeters + centerlineHalfWidth,
		buildingBlock.centerYMeters - centerlineHalfHeight
	);
	const bottomRight = viewTransform.worldToScreen(
		buildingBlock.centerXMeters + centerlineHalfWidth,
		buildingBlock.centerYMeters + centerlineHalfHeight
	);
	const bottomLeft = viewTransform.worldToScreen(
		buildingBlock.centerXMeters - centerlineHalfWidth,
		buildingBlock.centerYMeters + centerlineHalfHeight
	);

	context.save();
	context.strokeStyle = '#ffffff';
	context.lineWidth = 2;
	context.setLineDash([12, 10]);
	context.beginPath();
	context.moveTo(topLeft.x, topLeft.y);
	context.lineTo(topRight.x, topRight.y);
	context.lineTo(bottomRight.x, bottomRight.y);
	context.lineTo(bottomLeft.x, bottomLeft.y);
	context.closePath();
	context.stroke();
	context.restore();
}

RoadsSimulation.mapRenderer.drawMap = function drawMap(context, viewTransform, mapDefinition) {
	const buildingBlock = mapDefinition.buildingBlocks[0];
	const zoneHalf = RoadsSimulation.mapGeometry.getZoneHalfExtents(mapDefinition, buildingBlock);
	const terrainKinds = RoadsSimulation.terrainKinds;

	drawFilledRect(
		context,
		viewTransform,
		buildingBlock.centerXMeters,
		buildingBlock.centerYMeters,
		zoneHalf.roadHalfWidth,
		zoneHalf.roadHalfHeight,
		terrainKinds.outside.fillColor,
		null
	);

	drawFilledRect(
		context,
		viewTransform,
		buildingBlock.centerXMeters,
		buildingBlock.centerYMeters,
		zoneHalf.roadHalfWidth,
		zoneHalf.roadHalfHeight,
		terrainKinds.road.fillColor,
		terrainKinds.road.strokeColor
	);

	drawFilledRect(
		context,
		viewTransform,
		buildingBlock.centerXMeters,
		buildingBlock.centerYMeters,
		zoneHalf.greenHalfWidth,
		zoneHalf.greenHalfHeight,
		terrainKinds.green.fillColor,
		terrainKinds.green.strokeColor
	);

	drawFilledRect(
		context,
		viewTransform,
		buildingBlock.centerXMeters,
		buildingBlock.centerYMeters,
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
};
