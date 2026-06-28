window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.routePath = {};

function buildSegment(startPoint, endPoint) {
	const deltaX = endPoint.x - startPoint.x;
	const deltaY = endPoint.y - startPoint.y;
	const lengthMeters = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

	return {
		startPoint: startPoint,
		endPoint: endPoint,
		lengthMeters: lengthMeters,
		directionRadians: Math.atan2(deltaY, deltaX),
	};
}

function buildRectangularPath(halfWidthMeters, halfHeightMeters, direction) {
	const topLeft = { x: -halfWidthMeters, y: -halfHeightMeters };
	const topRight = { x: halfWidthMeters, y: -halfHeightMeters };
	const bottomRight = { x: halfWidthMeters, y: halfHeightMeters };
	const bottomLeft = { x: -halfWidthMeters, y: halfHeightMeters };

	const cornerPoints = direction === 'clockwise'
		? [topLeft, topRight, bottomRight, bottomLeft]
		: [topLeft, bottomLeft, bottomRight, topRight];

	const segments = [];
	let totalLengthMeters = 0;

	for (let cornerIndex = 0; cornerIndex < cornerPoints.length; cornerIndex += 1) {
		const startPoint = cornerPoints[cornerIndex];
		const endPoint = cornerPoints[(cornerIndex + 1) % cornerPoints.length];
		const segment = buildSegment(startPoint, endPoint);
		segments.push(segment);
		totalLengthMeters += segment.lengthMeters;
	}

	return {
		segments: segments,
		totalLengthMeters: totalLengthMeters,
	};
}

function buildCornerZones(segments, totalLengthMeters, cornerZoneRadiusMeters) {
	const cornerZones = [];
	let accumulatedDistance = 0;

	for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
		const segment = segments[segmentIndex];
		const cornerDistance = accumulatedDistance + segment.lengthMeters;
		cornerZones.push({
			distanceMeters: cornerDistance % totalLengthMeters,
			turnAngleRadians: Math.PI / 2,
		});
		accumulatedDistance += segment.lengthMeters;
	}

	return cornerZones.map(function mapCornerZone(cornerZone) {
		return {
			distanceMeters: cornerZone.distanceMeters,
			turnAngleRadians: cornerZone.turnAngleRadians,
			zoneStartMeters: (cornerZone.distanceMeters - cornerZoneRadiusMeters + totalLengthMeters) % totalLengthMeters,
			zoneEndMeters: (cornerZone.distanceMeters + cornerZoneRadiusMeters) % totalLengthMeters,
		};
	});
}

RoadsSimulation.routePath.wrapDistance = function wrapDistance(distanceMeters, totalLengthMeters) {
	return ((distanceMeters % totalLengthMeters) + totalLengthMeters) % totalLengthMeters;
};

RoadsSimulation.routePath.getSignedDistanceAhead = function getSignedDistanceAhead(
	fromDistanceMeters,
	toDistanceMeters,
	totalLengthMeters
) {
	const wrappedFrom = RoadsSimulation.routePath.wrapDistance(fromDistanceMeters, totalLengthMeters);
	const wrappedTo = RoadsSimulation.routePath.wrapDistance(toDistanceMeters, totalLengthMeters);
	let aheadMeters = wrappedTo - wrappedFrom;

	if (aheadMeters < 0) {
		aheadMeters += totalLengthMeters;
	}

	if (aheadMeters > totalLengthMeters / 2) {
		aheadMeters -= totalLengthMeters;
	}

	return aheadMeters;
};

RoadsSimulation.routePath.buildRouteCenterline = function buildRouteCenterline(mapDefinition, routeDefinition) {
	const buildingBlock = mapDefinition.buildingBlocks[0];
	const zoneHalf = RoadsSimulation.mapGeometry.getZoneHalfExtents(mapDefinition, buildingBlock);
	const laneWidth = mapDefinition.dimensions.laneWidthMeters;
	const laneOffsetMeters = routeDefinition.laneSide === 'right'
		? laneWidth / 2
		: laneWidth + laneWidth / 2;

	const centerlineHalfWidth = zoneHalf.greenHalfWidth + laneOffsetMeters;
	const centerlineHalfHeight = zoneHalf.greenHalfHeight + laneOffsetMeters;

	const localPath = buildRectangularPath(centerlineHalfWidth, centerlineHalfHeight, routeDefinition.direction);
	const cornerZoneRadiusMeters = RoadsSimulation.physicsConstants.cornerZoneRadiusMeters;
	const cornerZones = buildCornerZones(localPath.segments, localPath.totalLengthMeters, cornerZoneRadiusMeters);

	return {
		routeIdentifier: routeDefinition.identifier,
		direction: routeDefinition.direction,
		laneSide: routeDefinition.laneSide,
		laneWidthMeters: laneWidth,
		buildingCenterXMeters: buildingBlock.centerXMeters,
		buildingCenterYMeters: buildingBlock.centerYMeters,
		segments: localPath.segments,
		totalLengthMeters: localPath.totalLengthMeters,
		cornerZones: cornerZones,
	};
};

RoadsSimulation.routePath.getOppositeLaneRoute = function getOppositeLaneRoute(ownLaneRoute, mapDefinition) {
	const oppositeLaneSide = ownLaneRoute.laneSide === 'right' ? 'left' : 'right';

	return RoadsSimulation.routePath.buildRouteCenterline(mapDefinition, {
		identifier: ownLaneRoute.routeIdentifier + '-opposite',
		direction: ownLaneRoute.direction,
		laneSide: oppositeLaneSide,
		vehicleAllowed: true,
	});
};

RoadsSimulation.routePath.getPositionOnPath = function getPositionOnPath(routeCenterline, distanceMeters) {
	const wrappedDistance = RoadsSimulation.routePath.wrapDistance(distanceMeters, routeCenterline.totalLengthMeters);
	let remainingDistance = wrappedDistance;

	for (let segmentIndex = 0; segmentIndex < routeCenterline.segments.length; segmentIndex += 1) {
		const segment = routeCenterline.segments[segmentIndex];

		if (remainingDistance <= segment.lengthMeters) {
			const ratio = segment.lengthMeters > 0 ? remainingDistance / segment.lengthMeters : 0;
			const localX = segment.startPoint.x + (segment.endPoint.x - segment.startPoint.x) * ratio;
			const localY = segment.startPoint.y + (segment.endPoint.y - segment.startPoint.y) * ratio;

			return {
				worldXMeters: routeCenterline.buildingCenterXMeters + localX,
				worldYMeters: routeCenterline.buildingCenterYMeters + localY,
				headingRadians: segment.directionRadians,
			};
		}

		remainingDistance -= segment.lengthMeters;
	}

	const lastSegment = routeCenterline.segments[routeCenterline.segments.length - 1];

	return {
		worldXMeters: routeCenterline.buildingCenterXMeters + lastSegment.endPoint.x,
		worldYMeters: routeCenterline.buildingCenterYMeters + lastSegment.endPoint.y,
		headingRadians: lastSegment.directionRadians,
	};
};

RoadsSimulation.routePath.getLateralOffsetSign = function getLateralOffsetSign(ownLaneRoute) {
	return ownLaneRoute.laneSide === 'right' ? 1 : -1;
};

RoadsSimulation.routePath.getSmoothPathHeading = function getSmoothPathHeading(routeCenterline, distanceMeters, sampleMeters) {
	const lookSampleMeters = sampleMeters || 0.2;
	const backHeadingRadians = RoadsSimulation.routePath.getTangentHeadingOnPath(
		routeCenterline,
		distanceMeters - lookSampleMeters,
		lookSampleMeters
	);
	const forwardHeadingRadians = RoadsSimulation.routePath.getTangentHeadingOnPath(
		routeCenterline,
		distanceMeters + lookSampleMeters,
		lookSampleMeters
	);
	const headingX = Math.cos(backHeadingRadians) + Math.cos(forwardHeadingRadians);
	const headingY = Math.sin(backHeadingRadians) + Math.sin(forwardHeadingRadians);

	return Math.atan2(headingY, headingX);
};

RoadsSimulation.routePath.getOutwardNormalUnit = function getOutwardNormalUnit(routeCenterline, distanceMeters) {
	const ownPosition = RoadsSimulation.routePath.getPositionOnPath(routeCenterline, distanceMeters);
	const headingRadians = RoadsSimulation.routePath.getTangentHeadingOnPath(routeCenterline, distanceMeters);
	const radialOutX = ownPosition.worldXMeters - routeCenterline.buildingCenterXMeters;
	const radialOutY = ownPosition.worldYMeters - routeCenterline.buildingCenterYMeters;
	const headingX = Math.cos(headingRadians);
	const headingY = Math.sin(headingRadians);
	const leftNormalX = -headingY;
	const leftNormalY = headingX;
	const rightNormalX = headingY;
	const rightNormalY = -headingX;
	const leftOutwardDot = leftNormalX * radialOutX + leftNormalY * radialOutY;

	if (leftOutwardDot >= 0) {
		return { x: leftNormalX, y: leftNormalY };
	}

	return { x: rightNormalX, y: rightNormalY };
};

RoadsSimulation.routePath.getMaximumOutwardOffsetMeters = function getMaximumOutwardOffsetMeters(
	routeCenterline,
	vehicleTypeIdentifier
) {
	const vehicleType = RoadsSimulation.vehicleTypes[vehicleTypeIdentifier];
	const laneWidthMeters = routeCenterline.laneWidthMeters;

	return Math.max(0, laneWidthMeters * 0.5 - vehicleType.widthMeters * 0.45);
};

RoadsSimulation.routePath.getBlendedPosition = function getBlendedPosition(
	ownLaneRoute,
	oppositeLaneRoute,
	distanceMeters,
	laneBlendRatio,
	wideLineOutwardRatio,
	vehicleTypeIdentifier
) {
	const blend = Math.max(0, Math.min(1, laneBlendRatio));
	const outwardRatio = Math.max(0, Math.min(1, wideLineOutwardRatio || 0));
	const ownPosition = RoadsSimulation.routePath.getPositionOnPath(ownLaneRoute, distanceMeters);
	let worldXMeters = ownPosition.worldXMeters;
	let worldYMeters = ownPosition.worldYMeters;

	if (outwardRatio > 0.001 && vehicleTypeIdentifier) {
		const outwardNormal = RoadsSimulation.routePath.getOutwardNormalUnit(ownLaneRoute, distanceMeters);
		const maximumOutwardMeters = RoadsSimulation.routePath.getMaximumOutwardOffsetMeters(
			ownLaneRoute,
			vehicleTypeIdentifier
		);
		const outwardOffsetMeters = maximumOutwardMeters * outwardRatio;

		worldXMeters += outwardNormal.x * outwardOffsetMeters;
		worldYMeters += outwardNormal.y * outwardOffsetMeters;
	}

	if (blend <= 0.001) {
		const lookSampleMeters = 0.35;
		const aheadOwnPosition = RoadsSimulation.routePath.getPositionOnPath(
			ownLaneRoute,
			distanceMeters + lookSampleMeters
		);
		let aheadWorldXMeters = aheadOwnPosition.worldXMeters;
		let aheadWorldYMeters = aheadOwnPosition.worldYMeters;

		if (outwardRatio > 0.001 && vehicleTypeIdentifier) {
			const aheadOutwardNormal = RoadsSimulation.routePath.getOutwardNormalUnit(
				ownLaneRoute,
				distanceMeters + lookSampleMeters
			);
			const maximumOutwardMeters = RoadsSimulation.routePath.getMaximumOutwardOffsetMeters(
				ownLaneRoute,
				vehicleTypeIdentifier
			);
			const outwardOffsetMeters = maximumOutwardMeters * outwardRatio;

			aheadWorldXMeters += aheadOutwardNormal.x * outwardOffsetMeters;
			aheadWorldYMeters += aheadOutwardNormal.y * outwardOffsetMeters;
		}

		return {
			worldXMeters: worldXMeters,
			worldYMeters: worldYMeters,
			headingRadians: Math.atan2(
				aheadWorldYMeters - worldYMeters,
				aheadWorldXMeters - worldXMeters
			),
		};
	}

	const oppositePosition = RoadsSimulation.routePath.getPositionOnPath(oppositeLaneRoute, distanceMeters);
	const lookSampleMeters = 0.35;
	const ownAheadPosition = RoadsSimulation.routePath.getPositionOnPath(ownLaneRoute, distanceMeters + lookSampleMeters);
	const oppositeAheadPosition = RoadsSimulation.routePath.getPositionOnPath(
		oppositeLaneRoute,
		distanceMeters + lookSampleMeters
	);
	worldXMeters = ownPosition.worldXMeters
		+ (oppositePosition.worldXMeters - ownPosition.worldXMeters) * blend;
	worldYMeters = ownPosition.worldYMeters
		+ (oppositePosition.worldYMeters - ownPosition.worldYMeters) * blend;
	const aheadWorldXMeters = ownAheadPosition.worldXMeters
		+ (oppositeAheadPosition.worldXMeters - ownAheadPosition.worldXMeters) * blend;
	const aheadWorldYMeters = ownAheadPosition.worldYMeters
		+ (oppositeAheadPosition.worldYMeters - ownAheadPosition.worldYMeters) * blend;

	return {
		worldXMeters: worldXMeters,
		worldYMeters: worldYMeters,
		headingRadians: Math.atan2(
			aheadWorldYMeters - worldYMeters,
			aheadWorldXMeters - worldXMeters
		),
	};
};

RoadsSimulation.routePath.getTangentHeadingOnPath = function getTangentHeadingOnPath(
	routeCenterline,
	distanceMeters,
	sampleMeters
) {
	const lookSampleMeters = sampleMeters || 0.35;
	const startPosition = RoadsSimulation.routePath.getPositionOnPath(routeCenterline, distanceMeters);
	const aheadPosition = RoadsSimulation.routePath.getPositionOnPath(
		routeCenterline,
		distanceMeters + lookSampleMeters
	);

	return Math.atan2(
		aheadPosition.worldYMeters - startPosition.worldYMeters,
		aheadPosition.worldXMeters - startPosition.worldXMeters
	);
};

RoadsSimulation.routePath.getBlendedTangentHeading = function getBlendedTangentHeading(
	ownLaneRoute,
	oppositeLaneRoute,
	distanceMeters,
	laneBlendRatio,
	wideLineOutwardRatio,
	vehicleTypeIdentifier,
	sampleMeters
) {
	const lookSampleMeters = sampleMeters || 0.35;
	const startPosition = RoadsSimulation.routePath.getBlendedPosition(
		ownLaneRoute,
		oppositeLaneRoute,
		distanceMeters,
		laneBlendRatio,
		wideLineOutwardRatio,
		vehicleTypeIdentifier
	);
	const aheadPosition = RoadsSimulation.routePath.getBlendedPosition(
		ownLaneRoute,
		oppositeLaneRoute,
		distanceMeters + lookSampleMeters,
		laneBlendRatio,
		wideLineOutwardRatio,
		vehicleTypeIdentifier
	);

	return Math.atan2(
		aheadPosition.worldYMeters - startPosition.worldYMeters,
		aheadPosition.worldXMeters - startPosition.worldXMeters
	);
};

RoadsSimulation.routePath.getVehicleBlendedPosition = function getVehicleBlendedPosition(vehicle) {
	return RoadsSimulation.routePath.getBlendedPosition(
		vehicle.ownLaneRoute,
		vehicle.oppositeLaneRoute,
		vehicle.distanceMeters,
		vehicle.laneBlendRatio,
		vehicle.wideLineOutwardRatio,
		vehicle.vehicleTypeIdentifier
	);
};

RoadsSimulation.routePath.getVehicleBlendedTangentHeading = function getVehicleBlendedTangentHeading(
	vehicle,
	distanceMeters
) {
	return RoadsSimulation.routePath.getBlendedTangentHeading(
		vehicle.ownLaneRoute,
		vehicle.oppositeLaneRoute,
		distanceMeters !== undefined ? distanceMeters : vehicle.distanceMeters,
		vehicle.laneBlendRatio,
		vehicle.wideLineOutwardRatio,
		vehicle.vehicleTypeIdentifier
	);
};

RoadsSimulation.routePath.getSpeedLimitOnPath = function getSpeedLimitOnPath(mapDefinition, routeCenterline, distanceMeters) {
	const position = RoadsSimulation.routePath.getPositionOnPath(routeCenterline, distanceMeters);
	return RoadsSimulation.mapGeometry.getSpeedLimitKilometerPerHour(
		mapDefinition,
		position.worldXMeters,
		position.worldYMeters
	);
};

RoadsSimulation.routePath.getDistanceToCorner = function getDistanceToCorner(routeCenterline, distanceMeters, cornerDistanceMeters) {
	const totalLength = routeCenterline.totalLengthMeters;
	const wrappedDistance = RoadsSimulation.routePath.wrapDistance(distanceMeters, totalLength);
	const wrappedCorner = RoadsSimulation.routePath.wrapDistance(cornerDistanceMeters, totalLength);
	let difference = Math.abs(wrappedDistance - wrappedCorner);

	if (difference > totalLength / 2) {
		difference = totalLength - difference;
	}

	return difference;
};

RoadsSimulation.routePath.isDistanceInsideCornerZone = function isDistanceInsideCornerZone(routeCenterline, distanceMeters) {
	const cornerZoneRadiusMeters = RoadsSimulation.physicsConstants.cornerZoneRadiusMeters;

	for (let zoneIndex = 0; zoneIndex < routeCenterline.cornerZones.length; zoneIndex += 1) {
		const cornerZone = routeCenterline.cornerZones[zoneIndex];
		const distanceToCorner = RoadsSimulation.routePath.getDistanceToCorner(
			routeCenterline,
			distanceMeters,
			cornerZone.distanceMeters
		);

		if (distanceToCorner <= cornerZoneRadiusMeters) {
			return true;
		}
	}

	return false;
};

RoadsSimulation.routePath.hasCornerBetween = function hasCornerBetween(routeCenterline, startDistanceMeters, endDistanceMeters) {
	const totalLength = routeCenterline.totalLengthMeters;
	const forwardDistance = endDistanceMeters >= startDistanceMeters
		? endDistanceMeters - startDistanceMeters
		: endDistanceMeters + totalLength - startDistanceMeters;

	for (let zoneIndex = 0; zoneIndex < routeCenterline.cornerZones.length; zoneIndex += 1) {
		const cornerDistance = routeCenterline.cornerZones[zoneIndex].distanceMeters;
		const aheadMeters = RoadsSimulation.routePath.getSignedDistanceAhead(
			startDistanceMeters,
			cornerDistance,
			totalLength
		);

		if (aheadMeters > 0 && aheadMeters <= forwardDistance) {
			return true;
		}
	}

	return false;
};

RoadsSimulation.routePath.getNearestCornerDistanceAhead = function getNearestCornerDistanceAhead(routeCenterline, distanceMeters) {
	const totalLength = routeCenterline.totalLengthMeters;
	let nearestAhead = null;

	for (let zoneIndex = 0; zoneIndex < routeCenterline.cornerZones.length; zoneIndex += 1) {
		const cornerDistance = routeCenterline.cornerZones[zoneIndex].distanceMeters;
		const aheadMeters = RoadsSimulation.routePath.getSignedDistanceAhead(distanceMeters, cornerDistance, totalLength);

		if (aheadMeters > 0 && (nearestAhead === null || aheadMeters < nearestAhead)) {
			nearestAhead = aheadMeters;
		}
	}

	return nearestAhead;
};

RoadsSimulation.routePath.areOppositeDirections = function areOppositeDirections(firstRoute, secondRoute) {
	return firstRoute.direction !== secondRoute.direction;
};
