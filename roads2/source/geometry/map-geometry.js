window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.mapGeometry = {};

function getBuildingBlockHalfExtents(buildingBlock) {
	return {
		halfWidthMeters: buildingBlock.widthMeters / 2,
		halfHeightMeters: buildingBlock.heightMeters / 2,
	};
}

function getZoneHalfExtents(mapDefinition, buildingBlock) {
	const buildingHalf = getBuildingBlockHalfExtents(buildingBlock);
	const sidewalkHalfWidth = buildingHalf.halfWidthMeters + mapDefinition.dimensions.sidewalkWidthMeters;
	const sidewalkHalfHeight = buildingHalf.halfHeightMeters + mapDefinition.dimensions.sidewalkWidthMeters;
	const greenHalfWidth = sidewalkHalfWidth + mapDefinition.dimensions.greenWidthMeters;
	const greenHalfHeight = sidewalkHalfHeight + mapDefinition.dimensions.greenWidthMeters;
	const roadHalfWidth = greenHalfWidth + mapDefinition.dimensions.laneWidthMeters * mapDefinition.dimensions.laneCount;
	const roadHalfHeight = greenHalfHeight + mapDefinition.dimensions.laneWidthMeters * mapDefinition.dimensions.laneCount;

	return {
		buildingHalfWidth: buildingHalf.halfWidthMeters,
		buildingHalfHeight: buildingHalf.halfHeightMeters,
		sidewalkHalfWidth: sidewalkHalfWidth,
		sidewalkHalfHeight: sidewalkHalfHeight,
		greenHalfWidth: greenHalfWidth,
		greenHalfHeight: greenHalfHeight,
		roadHalfWidth: roadHalfWidth,
		roadHalfHeight: roadHalfHeight,
	};
}

function getRelativePosition(buildingBlock, worldXMeters, worldYMeters) {
	return {
		relativeX: worldXMeters - buildingBlock.centerXMeters,
		relativeY: worldYMeters - buildingBlock.centerYMeters,
	};
}

function getCornerStraightOffsetMeters(mapDefinition, buildingBlock) {
	const zoneHalf = getZoneHalfExtents(mapDefinition, buildingBlock);
	return zoneHalf.greenHalfWidth - mapDefinition.dimensions.cornerRadiusMeters;
}

function isInsideSharpRect(relativeX, relativeY, halfWidthMeters, halfHeightMeters) {
	return Math.abs(relativeX) <= halfWidthMeters && Math.abs(relativeY) <= halfHeightMeters;
}

function isInsideConcentricRoundedRect(relativeX, relativeY, halfWidthMeters, halfHeightMeters, cornerStraightOffsetMeters) {
	const cornerRadiusMeters = Math.max(0, halfWidthMeters - cornerStraightOffsetMeters);
	const absoluteX = Math.abs(relativeX);
	const absoluteY = Math.abs(relativeY);

	if (absoluteX > halfWidthMeters || absoluteY > halfHeightMeters) {
		return false;
	}

	if (cornerRadiusMeters <= 0) {
		return true;
	}

	const straightHalfWidthMeters = halfWidthMeters - cornerRadiusMeters;
	const straightHalfHeightMeters = halfHeightMeters - cornerRadiusMeters;

	if (absoluteX <= straightHalfWidthMeters || absoluteY <= straightHalfHeightMeters) {
		return true;
	}

	const cornerOffsetX = absoluteX - straightHalfWidthMeters;
	const cornerOffsetY = absoluteY - straightHalfHeightMeters;

	return cornerOffsetX * cornerOffsetX + cornerOffsetY * cornerOffsetY <= cornerRadiusMeters * cornerRadiusMeters;
}

RoadsSimulation.mapGeometry.getCornerStraightOffsetMeters = getCornerStraightOffsetMeters;

RoadsSimulation.mapGeometry.getCornerRadiusForHalfExtent = function getCornerRadiusForHalfExtent(mapDefinition, buildingBlock, halfExtentMeters) {
	const cornerStraightOffsetMeters = getCornerStraightOffsetMeters(mapDefinition, buildingBlock);
	return Math.max(0, halfExtentMeters - cornerStraightOffsetMeters);
};

RoadsSimulation.mapGeometry.getInnerLaneCenterOffsetMeters = function getInnerLaneCenterOffsetMeters(mapDefinition, buildingBlock) {
	const zoneHalf = getZoneHalfExtents(mapDefinition, buildingBlock);
	const laneWidthMeters = mapDefinition.dimensions.laneWidthMeters;

	return zoneHalf.greenHalfWidth + laneWidthMeters / 2;
};

RoadsSimulation.mapGeometry.getOuterLaneCenterOffsetMeters = function getOuterLaneCenterOffsetMeters(mapDefinition, buildingBlock) {
	const zoneHalf = getZoneHalfExtents(mapDefinition, buildingBlock);
	const laneWidthMeters = mapDefinition.dimensions.laneWidthMeters;

	return zoneHalf.greenHalfWidth + laneWidthMeters + laneWidthMeters / 2;
};

RoadsSimulation.mapGeometry.getRightLaneCenterPosition = function getRightLaneCenterPosition(mapDefinition, buildingBlock, headingRadians) {
	const outerLaneCenterOffsetMeters = RoadsSimulation.mapGeometry.getOuterLaneCenterOffsetMeters(
		mapDefinition,
		buildingBlock
	);
	const normalizedHeading = ((headingRadians % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
	const eastHeading = Math.abs(normalizedHeading) < 0.01 || Math.abs(normalizedHeading - Math.PI * 2) < 0.01;
	const westHeading = Math.abs(normalizedHeading - Math.PI) < 0.01;
	const southHeading = Math.abs(normalizedHeading - Math.PI / 2) < 0.01;
	const northHeading = Math.abs(normalizedHeading - Math.PI * 1.5) < 0.01;

	if (eastHeading) {
		return {
			centerXMeters: buildingBlock.centerXMeters,
			centerYMeters: buildingBlock.centerYMeters + outerLaneCenterOffsetMeters,
		};
	}

	if (westHeading) {
		return {
			centerXMeters: buildingBlock.centerXMeters,
			centerYMeters: buildingBlock.centerYMeters - outerLaneCenterOffsetMeters,
		};
	}

	if (southHeading) {
		return {
			centerXMeters: buildingBlock.centerXMeters + outerLaneCenterOffsetMeters,
			centerYMeters: buildingBlock.centerYMeters,
		};
	}

	if (northHeading) {
		return {
			centerXMeters: buildingBlock.centerXMeters - outerLaneCenterOffsetMeters,
			centerYMeters: buildingBlock.centerYMeters,
		};
	}

	return {
		centerXMeters: buildingBlock.centerXMeters,
		centerYMeters: buildingBlock.centerYMeters + outerLaneCenterOffsetMeters,
	};
};

RoadsSimulation.mapGeometry.getRightLaneRearAxlePosition = function getRightLaneRearAxlePosition(
	mapDefinition,
	buildingBlock,
	headingRadians,
	vehicleDefinition,
	alongRoadOffsetMeters
) {
	const laneCenterPosition = RoadsSimulation.mapGeometry.getRightLaneCenterPosition(
		mapDefinition,
		buildingBlock,
		headingRadians
	);
	const centerOffsetFromRearAxleMeters = vehicleDefinition.wheelbaseMeters / 2
		+ (vehicleDefinition.frontOverhangMeters - vehicleDefinition.rearOverhangMeters) / 2;
	const cosineHeading = Math.cos(headingRadians);
	const sineHeading = Math.sin(headingRadians);

	return {
		rearAxleXMeters: laneCenterPosition.centerXMeters
			- cosineHeading * centerOffsetFromRearAxleMeters
			+ cosineHeading * alongRoadOffsetMeters,
		rearAxleYMeters: laneCenterPosition.centerYMeters
			- sineHeading * centerOffsetFromRearAxleMeters
			+ sineHeading * alongRoadOffsetMeters,
	};
};

RoadsSimulation.mapGeometry.classifyPoint = function classifyPoint(mapDefinition, worldXMeters, worldYMeters) {
	const buildingBlock = mapDefinition.buildingBlocks[0];
	const zoneHalf = getZoneHalfExtents(mapDefinition, buildingBlock);
	const relativePosition = getRelativePosition(buildingBlock, worldXMeters, worldYMeters);
	const cornerStraightOffsetMeters = getCornerStraightOffsetMeters(mapDefinition, buildingBlock);
	const constructionKind = RoadsSimulation.constructionGeometry.classifyConstructionPoint(
		mapDefinition,
		worldXMeters,
		worldYMeters
	);

	if (constructionKind) {
		return constructionKind;
	}

	if (isInsideSharpRect(
		relativePosition.relativeX,
		relativePosition.relativeY,
		zoneHalf.buildingHalfWidth,
		zoneHalf.buildingHalfHeight
	)) {
		return 'building';
	}

	if (isInsideConcentricRoundedRect(
		relativePosition.relativeX,
		relativePosition.relativeY,
		zoneHalf.sidewalkHalfWidth,
		zoneHalf.sidewalkHalfHeight,
		cornerStraightOffsetMeters
	)) {
		return 'sidewalk';
	}

	if (isInsideConcentricRoundedRect(
		relativePosition.relativeX,
		relativePosition.relativeY,
		zoneHalf.greenHalfWidth,
		zoneHalf.greenHalfHeight,
		cornerStraightOffsetMeters
	)) {
		return 'green';
	}

	if (isInsideConcentricRoundedRect(
		relativePosition.relativeX,
		relativePosition.relativeY,
		zoneHalf.roadHalfWidth,
		zoneHalf.roadHalfHeight,
		cornerStraightOffsetMeters
	)) {
		return 'road';
	}

	return 'outside';
};

RoadsSimulation.mapGeometry.getMapBounds = function getMapBounds(mapDefinition) {
	const buildingBlock = mapDefinition.buildingBlocks[0];
	const zoneHalf = getZoneHalfExtents(mapDefinition, buildingBlock);
	const paddingMeters = 4;

	return {
		minXMeters: buildingBlock.centerXMeters - zoneHalf.roadHalfWidth - paddingMeters,
		maxXMeters: buildingBlock.centerXMeters + zoneHalf.roadHalfWidth + paddingMeters,
		minYMeters: buildingBlock.centerYMeters - zoneHalf.roadHalfHeight - paddingMeters,
		maxYMeters: buildingBlock.centerYMeters + zoneHalf.roadHalfHeight + paddingMeters,
	};
};

RoadsSimulation.mapGeometry.getBuildingBlock = function getBuildingBlock(mapDefinition) {
	return mapDefinition.buildingBlocks[0];
};

RoadsSimulation.mapGeometry.getZoneHalfExtents = getZoneHalfExtents;

RoadsSimulation.mapGeometry.getCenterlineHalfExtent = function getCenterlineHalfExtent(mapDefinition, buildingBlock) {
	const zoneHalf = getZoneHalfExtents(mapDefinition, buildingBlock);
	const laneWidthMeters = mapDefinition.dimensions.laneWidthMeters;

	return zoneHalf.greenHalfWidth + laneWidthMeters;
};
