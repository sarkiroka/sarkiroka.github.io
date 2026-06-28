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

RoadsSimulation.mapGeometry.classifyPoint = function classifyPoint(mapDefinition, worldXMeters, worldYMeters) {
	const buildingBlock = mapDefinition.buildingBlocks[0];
	const zoneHalf = getZoneHalfExtents(mapDefinition, buildingBlock);
	const relativePosition = getRelativePosition(buildingBlock, worldXMeters, worldYMeters);
	const absRelativeX = Math.abs(relativePosition.relativeX);
	const absRelativeY = Math.abs(relativePosition.relativeY);

	if (absRelativeX <= zoneHalf.buildingHalfWidth && absRelativeY <= zoneHalf.buildingHalfHeight) {
		return 'building';
	}

	if (absRelativeX <= zoneHalf.sidewalkHalfWidth && absRelativeY <= zoneHalf.sidewalkHalfHeight) {
		return 'sidewalk';
	}

	if (absRelativeX <= zoneHalf.greenHalfWidth && absRelativeY <= zoneHalf.greenHalfHeight) {
		return 'green';
	}

	if (absRelativeX <= zoneHalf.roadHalfWidth && absRelativeY <= zoneHalf.roadHalfHeight) {
		return 'road';
	}

	return 'outside';
};

RoadsSimulation.mapGeometry.getLaneIndex = function getLaneIndex(mapDefinition, worldXMeters, worldYMeters) {
	const terrainKind = RoadsSimulation.mapGeometry.classifyPoint(mapDefinition, worldXMeters, worldYMeters);

	if (terrainKind !== 'road') {
		return null;
	}

	const buildingBlock = mapDefinition.buildingBlocks[0];
	const zoneHalf = getZoneHalfExtents(mapDefinition, buildingBlock);
	const relativePosition = getRelativePosition(buildingBlock, worldXMeters, worldYMeters);
	const absRelativeX = Math.abs(relativePosition.relativeX);
	const absRelativeY = Math.abs(relativePosition.relativeY);
	const distanceFromInnerEdge = Math.min(
		absRelativeX - zoneHalf.greenHalfWidth,
		absRelativeY - zoneHalf.greenHalfHeight
	);
	const laneWidth = mapDefinition.dimensions.laneWidthMeters;

	if (distanceFromInnerEdge < laneWidth) {
		return 0;
	}

	return 1;
};

RoadsSimulation.mapGeometry.isVehicleAllowed = function isVehicleAllowed(mapDefinition, worldXMeters, worldYMeters) {
	const terrainKind = RoadsSimulation.mapGeometry.classifyPoint(mapDefinition, worldXMeters, worldYMeters);
	const terrainDefinition = RoadsSimulation.terrainKinds[terrainKind];
	return terrainDefinition.vehicleAllowed;
};

RoadsSimulation.mapGeometry.isPedestrianAllowed = function isPedestrianAllowed(mapDefinition, worldXMeters, worldYMeters) {
	const terrainKind = RoadsSimulation.mapGeometry.classifyPoint(mapDefinition, worldXMeters, worldYMeters);
	const terrainDefinition = RoadsSimulation.terrainKinds[terrainKind];
	return terrainDefinition.pedestrianAllowed;
};

RoadsSimulation.mapGeometry.getSpeedLimitKilometerPerHour = function getSpeedLimitKilometerPerHour(mapDefinition, worldXMeters, worldYMeters) {
	if (!RoadsSimulation.mapGeometry.isVehicleAllowed(mapDefinition, worldXMeters, worldYMeters)) {
		return 0;
	}

	return mapDefinition.worldSpeedLimitKilometerPerHour;
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
