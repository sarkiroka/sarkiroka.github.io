window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.roadCrossSection = {};

function clampValue(value, minimumValue, maximumValue) {
	return Math.max(minimumValue, Math.min(maximumValue, value));
}

function normalizeAngleRadians(angleRadians) {
	let normalizedAngle = angleRadians;

	while (normalizedAngle > Math.PI) {
		normalizedAngle -= Math.PI * 2;
	}

	while (normalizedAngle < -Math.PI) {
		normalizedAngle += Math.PI * 2;
	}

	return normalizedAngle;
}

function getZoneHalfExtents(mapDefinition, buildingBlock) {
	return RoadsSimulation.mapGeometry.getZoneHalfExtents(mapDefinition, buildingBlock);
}

function classifyRoadSegment(relativeXMeters, relativeYMeters, cornerStraightOffsetMeters) {
	const absoluteX = Math.abs(relativeXMeters);
	const absoluteY = Math.abs(relativeYMeters);

	if (absoluteX > cornerStraightOffsetMeters && absoluteY > cornerStraightOffsetMeters) {
		return 'corner';
	}

	if (absoluteY >= absoluteX) {
		if (relativeYMeters >= 0) {
			return 'southStraight';
		}

		return 'northStraight';
	}

	if (relativeXMeters >= 0) {
		return 'eastStraight';
	}

	return 'westStraight';
}

function getHalfExtentBoundaryDistanceAlongRay(
	halfWidthMeters,
	halfHeightMeters,
	cornerStraightOffsetMeters,
	rayDirectionX,
	rayDirectionY
) {
	const absoluteDirectionX = Math.abs(rayDirectionX);
	const absoluteDirectionY = Math.abs(rayDirectionY);
	const cornerRadiusMeters = Math.max(0, halfWidthMeters - cornerStraightOffsetMeters);
	let boundaryDistanceMeters = Infinity;

	if (absoluteDirectionX > 0.000001) {
		boundaryDistanceMeters = Math.min(boundaryDistanceMeters, halfWidthMeters / absoluteDirectionX);
	}

	if (absoluteDirectionY > 0.000001) {
		boundaryDistanceMeters = Math.min(boundaryDistanceMeters, halfHeightMeters / absoluteDirectionY);
	}

	const hitAbsoluteX = boundaryDistanceMeters * absoluteDirectionX;
	const hitAbsoluteY = boundaryDistanceMeters * absoluteDirectionY;

	if (
		cornerRadiusMeters > 0
		&& hitAbsoluteX > cornerStraightOffsetMeters
		&& hitAbsoluteY > cornerStraightOffsetMeters
	) {
		const localDirectionX = hitAbsoluteX - cornerStraightOffsetMeters;
		const localDirectionY = hitAbsoluteY - cornerStraightOffsetMeters;
		const localDirectionLength = Math.sqrt(
			localDirectionX * localDirectionX + localDirectionY * localDirectionY
		);
		const localUnitX = localDirectionX / localDirectionLength;
		const localUnitY = localDirectionY / localDirectionLength;
		const projectionOntoCornerCenter = cornerStraightOffsetMeters * (absoluteDirectionX + absoluteDirectionY);
		const cornerArcDistanceMeters = (
			cornerStraightOffsetMeters
			+ cornerRadiusMeters * localDirectionLength
		) / Math.max(absoluteDirectionX + absoluteDirectionY, 0.000001);

		boundaryDistanceMeters = Math.min(boundaryDistanceMeters, cornerArcDistanceMeters);
	}

	return boundaryDistanceMeters;
}

function measureRoadBoundaryDistanceAlongDirection(
	mapDefinition,
	startXMeters,
	startYMeters,
	directionUnitX,
	directionUnitY
) {
	const stepMeters = 0.1;
	let distanceMeters = stepMeters;
	const maximumStepCount = 80;

	for (let stepIndex = 0; stepIndex < maximumStepCount; stepIndex += 1) {
		const sampleXMeters = startXMeters + directionUnitX * distanceMeters;
		const sampleYMeters = startYMeters + directionUnitY * distanceMeters;
		const terrainKind = RoadsSimulation.mapGeometry.classifyPoint(
			mapDefinition,
			sampleXMeters,
			sampleYMeters
		);

		if (terrainKind !== 'road') {
			return distanceMeters;
		}

		distanceMeters += stepMeters;
	}

	return distanceMeters;
}

function getCornerCrossSectionFrame(
	mapDefinition,
	worldXMeters,
	worldYMeters,
	relativeXMeters,
	relativeYMeters,
	buildingBlock
) {
	const radialDistanceMeters = Math.sqrt(relativeXMeters * relativeXMeters + relativeYMeters * relativeYMeters);
	const radialUnitX = relativeXMeters / radialDistanceMeters;
	const radialUnitY = relativeYMeters / radialDistanceMeters;
	const laneTangentRadians = Math.atan2(relativeYMeters, relativeXMeters) + Math.PI / 2;
	let innerToOuterUnitX = Math.sin(laneTangentRadians);
	let innerToOuterUnitY = -Math.cos(laneTangentRadians);

	if (innerToOuterUnitX * radialUnitX + innerToOuterUnitY * radialUnitY < 0) {
		innerToOuterUnitX = -innerToOuterUnitX;
		innerToOuterUnitY = -innerToOuterUnitY;
	}

	const innerDistanceMeters = measureRoadBoundaryDistanceAlongDirection(
		mapDefinition,
		worldXMeters,
		worldYMeters,
		-innerToOuterUnitX,
		-innerToOuterUnitY
	);
	const outerDistanceMeters = measureRoadBoundaryDistanceAlongDirection(
		mapDefinition,
		worldXMeters,
		worldYMeters,
		innerToOuterUnitX,
		innerToOuterUnitY
	);

	return {
		laneTangentRadians: laneTangentRadians,
		innerEdgeXMeters: worldXMeters - innerToOuterUnitX * innerDistanceMeters,
		innerEdgeYMeters: worldYMeters - innerToOuterUnitY * innerDistanceMeters,
		outerEdgeXMeters: worldXMeters + innerToOuterUnitX * outerDistanceMeters,
		outerEdgeYMeters: worldYMeters + innerToOuterUnitY * outerDistanceMeters,
	};
}

function getCrossSectionFrame(mapDefinition, worldXMeters, worldYMeters) {
	const buildingBlock = mapDefinition.buildingBlocks[0];
	const zoneHalf = getZoneHalfExtents(mapDefinition, buildingBlock);
	const relativeXMeters = worldXMeters - buildingBlock.centerXMeters;
	const relativeYMeters = worldYMeters - buildingBlock.centerYMeters;
	const cornerStraightOffsetMeters = RoadsSimulation.mapGeometry.getCornerStraightOffsetMeters(
		mapDefinition,
		buildingBlock
	);
	const roadSegment = classifyRoadSegment(relativeXMeters, relativeYMeters, cornerStraightOffsetMeters);

	if (roadSegment === 'southStraight') {
		return {
			laneTangentRadians: 0,
			innerEdgeXMeters: worldXMeters,
			innerEdgeYMeters: buildingBlock.centerYMeters + zoneHalf.greenHalfHeight,
			outerEdgeXMeters: worldXMeters,
			outerEdgeYMeters: buildingBlock.centerYMeters + zoneHalf.roadHalfHeight,
		};
	}

	if (roadSegment === 'northStraight') {
		return {
			laneTangentRadians: Math.PI,
			innerEdgeXMeters: worldXMeters,
			innerEdgeYMeters: buildingBlock.centerYMeters - zoneHalf.greenHalfHeight,
			outerEdgeXMeters: worldXMeters,
			outerEdgeYMeters: buildingBlock.centerYMeters - zoneHalf.roadHalfHeight,
		};
	}

	if (roadSegment === 'eastStraight') {
		return {
			laneTangentRadians: -Math.PI / 2,
			innerEdgeXMeters: buildingBlock.centerXMeters + zoneHalf.greenHalfWidth,
			innerEdgeYMeters: worldYMeters,
			outerEdgeXMeters: buildingBlock.centerXMeters + zoneHalf.roadHalfWidth,
			outerEdgeYMeters: worldYMeters,
		};
	}

	if (roadSegment === 'westStraight') {
		return {
			laneTangentRadians: Math.PI / 2,
			innerEdgeXMeters: buildingBlock.centerXMeters - zoneHalf.greenHalfWidth,
			innerEdgeYMeters: worldYMeters,
			outerEdgeXMeters: buildingBlock.centerXMeters - zoneHalf.roadHalfWidth,
			outerEdgeYMeters: worldYMeters,
		};
	}

	return getCornerCrossSectionFrame(
		mapDefinition,
		worldXMeters,
		worldYMeters,
		relativeXMeters,
		relativeYMeters,
		buildingBlock
	);
}

function getRoadWidthMeters(crossSectionFrame) {
	const innerToOuterXMeters = crossSectionFrame.outerEdgeXMeters - crossSectionFrame.innerEdgeXMeters;
	const innerToOuterYMeters = crossSectionFrame.outerEdgeYMeters - crossSectionFrame.innerEdgeYMeters;

	return Math.sqrt(innerToOuterXMeters * innerToOuterXMeters + innerToOuterYMeters * innerToOuterYMeters);
}

RoadsSimulation.roadCrossSection.getLaneTangentRadians = function getLaneTangentRadians(
	mapDefinition,
	worldXMeters,
	worldYMeters
) {
	return getCrossSectionFrame(mapDefinition, worldXMeters, worldYMeters).laneTangentRadians;
};

RoadsSimulation.roadCrossSection.getRoadPositionScale = function getRoadPositionScale(
	mapDefinition,
	worldXMeters,
	worldYMeters,
	headingRadians
) {
	const crossSectionFrame = getCrossSectionFrame(mapDefinition, worldXMeters, worldYMeters);
	const innerToOuterXMeters = crossSectionFrame.outerEdgeXMeters - crossSectionFrame.innerEdgeXMeters;
	const innerToOuterYMeters = crossSectionFrame.outerEdgeYMeters - crossSectionFrame.innerEdgeYMeters;
	const roadWidthMeters = getRoadWidthMeters(crossSectionFrame);

	if (roadWidthMeters <= 0) {
		return 0;
	}

	const pointOffsetXMeters = worldXMeters - crossSectionFrame.innerEdgeXMeters;
	const pointOffsetYMeters = worldYMeters - crossSectionFrame.innerEdgeYMeters;
	const lateralDistanceMeters = (
		pointOffsetXMeters * innerToOuterXMeters
		+ pointOffsetYMeters * innerToOuterYMeters
	) / roadWidthMeters;
	const roadPositionScale = lateralDistanceMeters / roadWidthMeters * 2 - 1;

	return clampValue(roadPositionScale, -1, 1);
};

RoadsSimulation.roadCrossSection.getLaneParallelismScale = function getLaneParallelismScale(
	mapDefinition,
	worldXMeters,
	worldYMeters,
	headingRadians
) {
	const laneTangentRadians = RoadsSimulation.roadCrossSection.getLaneTangentRadians(
		mapDefinition,
		worldXMeters,
		worldYMeters
	);
	const headingErrorRadians = normalizeAngleRadians(headingRadians - laneTangentRadians);
	const maximumLaneAngleErrorRadians = RoadsSimulation.perceptionConstants.maximumLaneAngleErrorRadians;

	return clampValue(headingErrorRadians / maximumLaneAngleErrorRadians, -1, 1);
};

RoadsSimulation.roadCrossSection.getForwardUnit = function getForwardUnit(headingRadians) {
	return {
		forwardUnitX: Math.cos(headingRadians),
		forwardUnitY: Math.sin(headingRadians),
	};
};

RoadsSimulation.roadCrossSection.projectForwardDistance = function projectForwardDistance(
	originXMeters,
	originYMeters,
	pointXMeters,
	pointYMeters,
	forwardUnitX,
	forwardUnitY
) {
	return (pointXMeters - originXMeters) * forwardUnitX + (pointYMeters - originYMeters) * forwardUnitY;
};

RoadsSimulation.roadCrossSection.worldPointsToRoadScaleRange = function worldPointsToRoadScaleRange(
	mapDefinition,
	worldPoints,
	headingRadians
) {
	let minimumScale = Infinity;
	let maximumScale = -Infinity;

	for (let pointIndex = 0; pointIndex < worldPoints.length; pointIndex += 1) {
		const worldPoint = worldPoints[pointIndex];
		const roadScale = RoadsSimulation.roadCrossSection.getRoadPositionScale(
			mapDefinition,
			worldPoint.pointXMeters,
			worldPoint.pointYMeters,
			headingRadians
		);

		minimumScale = Math.min(minimumScale, roadScale);
		maximumScale = Math.max(maximumScale, roadScale);
	}

	if (!Number.isFinite(minimumScale)) {
		return {
			innerRoadScale: -1,
			outerRoadScale: -1,
		};
	}

	return {
		innerRoadScale: minimumScale,
		outerRoadScale: maximumScale,
	};
};

RoadsSimulation.roadCrossSection.getWorldPositionFromRoadScale = function getWorldPositionFromRoadScale(
	mapDefinition,
	anchorXMeters,
	anchorYMeters,
	roadScale
) {
	const crossSectionFrame = getCrossSectionFrame(mapDefinition, anchorXMeters, anchorYMeters);
	const clampedRoadScale = clampValue(roadScale, -1, 1);
	const innerToOuterRatio = (clampedRoadScale + 1) / 2;

	return {
		worldXMeters: crossSectionFrame.innerEdgeXMeters
			+ (crossSectionFrame.outerEdgeXMeters - crossSectionFrame.innerEdgeXMeters) * innerToOuterRatio,
		worldYMeters: crossSectionFrame.innerEdgeYMeters
			+ (crossSectionFrame.outerEdgeYMeters - crossSectionFrame.innerEdgeYMeters) * innerToOuterRatio,
	};
};

RoadsSimulation.roadCrossSection.getAnchorFromForwardDistance = function getAnchorFromForwardDistance(
	originXMeters,
	originYMeters,
	forwardHeadingRadians,
	forwardDistanceMeters
) {
	const forwardUnit = RoadsSimulation.roadCrossSection.getForwardUnit(forwardHeadingRadians);

	return {
		anchorXMeters: originXMeters + forwardUnit.forwardUnitX * forwardDistanceMeters,
		anchorYMeters: originYMeters + forwardUnit.forwardUnitY * forwardDistanceMeters,
	};
};

RoadsSimulation.roadCrossSection.getWorldPositionFromPerceptionScale = function getWorldPositionFromPerceptionScale(
	mapDefinition,
	originXMeters,
	originYMeters,
	forwardHeadingRadians,
	forwardDistanceMeters,
	roadScale
) {
	const anchorPosition = RoadsSimulation.roadCrossSection.getAnchorFromForwardDistance(
		originXMeters,
		originYMeters,
		forwardHeadingRadians,
		forwardDistanceMeters
	);

	return RoadsSimulation.roadCrossSection.getWorldPositionFromRoadScale(
		mapDefinition,
		anchorPosition.anchorXMeters,
		anchorPosition.anchorYMeters,
		roadScale
	);
};

RoadsSimulation.roadCrossSection.getForwardDistanceFromObstacleScale = function getForwardDistanceFromObstacleScale(
	obstacleDistanceScale
) {
	if (obstacleDistanceScale <= -1) {
		return null;
	}

	const maximumRangeMeters = RoadsSimulation.perceptionConstants.maximumObstaclePerceptionRangeMeters;

	return (1 - obstacleDistanceScale) / 2 * maximumRangeMeters;
};

RoadsSimulation.roadCrossSection.getHeadingFromParallelismScale = function getHeadingFromParallelismScale(
	mapDefinition,
	worldXMeters,
	worldYMeters,
	parallelismScale
) {
	const laneTangentRadians = RoadsSimulation.roadCrossSection.getLaneTangentRadians(
		mapDefinition,
		worldXMeters,
		worldYMeters
	);
	const maximumLaneAngleErrorRadians = RoadsSimulation.perceptionConstants.maximumLaneAngleErrorRadians;

	return laneTangentRadians + clampValue(parallelismScale, -1, 1) * maximumLaneAngleErrorRadians;
};
