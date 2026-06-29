window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.constructionGeometry = {};

RoadsSimulation.constructionGeometry.contactMarginMeters = 0.12;

function getConstructionZone(mapDefinition) {
	return mapDefinition.constructionZones[0];
}

function getConstructionZoneHalfLength(constructionZone) {
	return constructionZone.lengthMeters / 2;
}

function getConstructionZoneHalfWidth(constructionZone) {
	return constructionZone.widthMeters / 2;
}

function expandRectangle(rectangle, marginMeters) {
	return {
		minXMeters: rectangle.minXMeters - marginMeters,
		maxXMeters: rectangle.maxXMeters + marginMeters,
		minYMeters: rectangle.minYMeters - marginMeters,
		maxYMeters: rectangle.maxYMeters + marginMeters,
	};
}

RoadsSimulation.constructionGeometry.getConstructionZone = getConstructionZone;

RoadsSimulation.constructionGeometry.getSouthBarrierRectangle = function getSouthBarrierRectangle(constructionZone) {
	const halfLength = getConstructionZoneHalfLength(constructionZone);
	const halfWidth = getConstructionZoneHalfWidth(constructionZone);
	const barrierLengthMeters = constructionZone.barrierLengthMeters;

	return {
		minXMeters: constructionZone.centerXMeters - halfWidth,
		maxXMeters: constructionZone.centerXMeters + halfWidth,
		minYMeters: constructionZone.centerYMeters - halfLength,
		maxYMeters: constructionZone.centerYMeters - halfLength + barrierLengthMeters,
	};
};

RoadsSimulation.constructionGeometry.getNorthBarrierRectangle = function getNorthBarrierRectangle(constructionZone) {
	const halfLength = getConstructionZoneHalfLength(constructionZone);
	const halfWidth = getConstructionZoneHalfWidth(constructionZone);
	const barrierLengthMeters = constructionZone.barrierLengthMeters;

	return {
		minXMeters: constructionZone.centerXMeters - halfWidth,
		maxXMeters: constructionZone.centerXMeters + halfWidth,
		minYMeters: constructionZone.centerYMeters + halfLength - barrierLengthMeters,
		maxYMeters: constructionZone.centerYMeters + halfLength,
	};
};

RoadsSimulation.constructionGeometry.getPotholeCornerOffsets = function getPotholeCornerOffsets(constructionZone) {
	const halfPotholeLength = constructionZone.potholeLengthMeters / 2;
	const halfPotholeWidth = constructionZone.potholeWidthMeters / 2;

	return [
		{ offsetXMeters: -halfPotholeWidth + 0.08, offsetYMeters: -halfPotholeLength + 0.05 },
		{ offsetXMeters: halfPotholeWidth - 0.12, offsetYMeters: -halfPotholeLength - 0.06 },
		{ offsetXMeters: halfPotholeWidth + 0.04, offsetYMeters: halfPotholeLength - 0.1 },
		{ offsetXMeters: -halfPotholeWidth - 0.05, offsetYMeters: halfPotholeLength + 0.08 },
		{ offsetXMeters: -halfPotholeWidth - 0.14, offsetYMeters: 0.12 },
	];
};

RoadsSimulation.constructionGeometry.getPotholeCornerPositions = function getPotholeCornerPositions(constructionZone) {
	const cornerOffsets = RoadsSimulation.constructionGeometry.getPotholeCornerOffsets(constructionZone);

	return cornerOffsets.map(function mapOffsetToCorner(cornerOffset) {
		return {
			cornerXMeters: constructionZone.centerXMeters + cornerOffset.offsetXMeters,
			cornerYMeters: constructionZone.centerYMeters + cornerOffset.offsetYMeters,
		};
	});
};

RoadsSimulation.constructionGeometry.getExpandedPotholeCornerPositions = function getExpandedPotholeCornerPositions(constructionZone, marginMeters) {
	const potholeCorners = RoadsSimulation.constructionGeometry.getPotholeCornerPositions(constructionZone);

	return potholeCorners.map(function expandCorner(corner) {
		const offsetXMeters = corner.cornerXMeters - constructionZone.centerXMeters;
		const offsetYMeters = corner.cornerYMeters - constructionZone.centerYMeters;
		const offsetLength = Math.sqrt(offsetXMeters * offsetXMeters + offsetYMeters * offsetYMeters) || 1;
		const scaleRatio = (offsetLength + marginMeters) / offsetLength;

		return {
			cornerXMeters: constructionZone.centerXMeters + offsetXMeters * scaleRatio,
			cornerYMeters: constructionZone.centerYMeters + offsetYMeters * scaleRatio,
		};
	});
};

function isPointInsideRectangle(pointXMeters, pointYMeters, rectangle) {
	return pointXMeters >= rectangle.minXMeters
		&& pointXMeters <= rectangle.maxXMeters
		&& pointYMeters >= rectangle.minYMeters
		&& pointYMeters <= rectangle.maxYMeters;
}

function isPointInsidePolygon(pointXMeters, pointYMeters, polygonCorners) {
	let isInside = false;

	for (
		let cornerIndex = 0, previousCornerIndex = polygonCorners.length - 1;
		cornerIndex < polygonCorners.length;
		previousCornerIndex = cornerIndex, cornerIndex += 1
	) {
		const corner = polygonCorners[cornerIndex];
		const previousCorner = polygonCorners[previousCornerIndex];
		const cornerCrossesLatitude = (
			corner.cornerYMeters > pointYMeters
		) !== (
			previousCorner.cornerYMeters > pointYMeters
		);
		const intersectionXMeters = (
			(previousCorner.cornerXMeters - corner.cornerXMeters)
			* (pointYMeters - corner.cornerYMeters)
			/ (previousCorner.cornerYMeters - corner.cornerYMeters)
			+ corner.cornerXMeters
		);

		if (cornerCrossesLatitude && pointXMeters < intersectionXMeters) {
			isInside = !isInside;
		}
	}

	return isInside;
}

function isPointInsideConstructionArea(mapDefinition, worldXMeters, worldYMeters, marginMeters) {
	const constructionZone = getConstructionZone(mapDefinition);

	if (!constructionZone) {
		return false;
	}

	const southBarrier = expandRectangle(
		RoadsSimulation.constructionGeometry.getSouthBarrierRectangle(constructionZone),
		marginMeters
	);
	const northBarrier = expandRectangle(
		RoadsSimulation.constructionGeometry.getNorthBarrierRectangle(constructionZone),
		marginMeters
	);
	const potholeCorners = marginMeters > 0
		? RoadsSimulation.constructionGeometry.getExpandedPotholeCornerPositions(constructionZone, marginMeters)
		: RoadsSimulation.constructionGeometry.getPotholeCornerPositions(constructionZone);

	if (isPointInsideRectangle(worldXMeters, worldYMeters, southBarrier)) {
		return true;
	}

	if (isPointInsideRectangle(worldXMeters, worldYMeters, northBarrier)) {
		return true;
	}

	if (isPointInsidePolygon(worldXMeters, worldYMeters, potholeCorners)) {
		return true;
	}

	return false;
}

RoadsSimulation.constructionGeometry.classifyConstructionPoint = function classifyConstructionPoint(mapDefinition, worldXMeters, worldYMeters) {
	const constructionZone = getConstructionZone(mapDefinition);

	if (!constructionZone) {
		return null;
	}

	const southBarrier = RoadsSimulation.constructionGeometry.getSouthBarrierRectangle(constructionZone);
	const northBarrier = RoadsSimulation.constructionGeometry.getNorthBarrierRectangle(constructionZone);
	const potholeCorners = RoadsSimulation.constructionGeometry.getPotholeCornerPositions(constructionZone);

	if (isPointInsideRectangle(worldXMeters, worldYMeters, southBarrier)) {
		return 'constructionBarrier';
	}

	if (isPointInsideRectangle(worldXMeters, worldYMeters, northBarrier)) {
		return 'constructionBarrier';
	}

	if (isPointInsidePolygon(worldXMeters, worldYMeters, potholeCorners)) {
		return 'pothole';
	}

	return null;
};

RoadsSimulation.constructionGeometry.isPointInsideConstructionHazard = function isPointInsideConstructionHazard(mapDefinition, worldXMeters, worldYMeters) {
	const constructionKind = RoadsSimulation.constructionGeometry.classifyConstructionPoint(
		mapDefinition,
		worldXMeters,
		worldYMeters
	);

	return constructionKind === 'constructionBarrier' || constructionKind === 'pothole';
};

function isVehicleIntersectingConstruction(vehicle, mapDefinition, marginMeters) {
	const cornerPositions = RoadsSimulation.vehicleState.getVehicleCornerPositions(vehicle);

	for (let cornerIndex = 0; cornerIndex < cornerPositions.length; cornerIndex += 1) {
		const cornerPosition = cornerPositions[cornerIndex];

		if (isPointInsideConstructionArea(
			mapDefinition,
			cornerPosition.cornerXMeters,
			cornerPosition.cornerYMeters,
			marginMeters
		)) {
			return true;
		}
	}

	const samplePoints = RoadsSimulation.vehicleState.getVehicleSamplePoints(vehicle);

	for (let pointIndex = 0; pointIndex < samplePoints.length; pointIndex += 1) {
		const samplePoint = samplePoints[pointIndex];

		if (isPointInsideConstructionArea(
			mapDefinition,
			samplePoint.sampleXMeters,
			samplePoint.sampleYMeters,
			marginMeters
		)) {
			return true;
		}
	}

	return false;
}

RoadsSimulation.constructionGeometry.isVehicleTouchingConstructionHazard = function isVehicleTouchingConstructionHazard(vehicle, mapDefinition) {
	return isVehicleIntersectingConstruction(vehicle, mapDefinition, 0);
};

RoadsSimulation.constructionGeometry.isVehicleNearConstructionHazard = function isVehicleNearConstructionHazard(vehicle, mapDefinition) {
	return isVehicleIntersectingConstruction(
		vehicle,
		mapDefinition,
		RoadsSimulation.constructionGeometry.contactMarginMeters
	);
};

RoadsSimulation.constructionGeometry.isVehicleConstructionContactActive = function isVehicleConstructionContactActive(vehicle, mapDefinition) {
	return RoadsSimulation.constructionGeometry.isVehicleTouchingConstructionHazard(vehicle, mapDefinition)
		|| RoadsSimulation.constructionGeometry.isVehicleNearConstructionHazard(vehicle, mapDefinition);
};

RoadsSimulation.constructionGeometry.wouldVehicleTouchConstructionHazard = function wouldVehicleTouchConstructionHazard(vehicle, mapDefinition) {
	return RoadsSimulation.constructionGeometry.isVehicleTouchingConstructionHazard(vehicle, mapDefinition);
};
