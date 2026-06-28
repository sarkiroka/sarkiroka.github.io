window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.roadConstraint = {};

RoadsSimulation.roadConstraint.snapVehiclePosition = function snapVehiclePosition(vehicle) {
	const roadPosition = RoadsSimulation.routePath.getVehicleBlendedPosition(vehicle);

	vehicle.worldXMeters = roadPosition.worldXMeters;
	vehicle.worldYMeters = roadPosition.worldYMeters;
};

RoadsSimulation.roadConstraint.snapVehicleToRoad = function snapVehicleToRoad(vehicle) {
	RoadsSimulation.roadConstraint.snapVehiclePosition(vehicle);
	vehicle.headingRadians = RoadsSimulation.vehicleBrain.getPathHeadingTarget(vehicle);
};

RoadsSimulation.roadConstraint.isVehicleOnRoad = function isVehicleOnRoad(vehicle, mapDefinition) {
	const terrainKind = RoadsSimulation.mapGeometry.classifyPoint(
		mapDefinition,
		vehicle.worldXMeters,
		vehicle.worldYMeters
	);
	return terrainKind === 'road';
};

RoadsSimulation.roadConstraint.isVehicleFullyOnRoad = function isVehicleFullyOnRoad(vehicle, mapDefinition) {
	const vehicleType = RoadsSimulation.vehicleTypes[vehicle.vehicleTypeIdentifier];
	const vehicleCorners = RoadsSimulation.collisionCheck.getVehicleCorners(vehicle, vehicleType);

	for (let cornerIndex = 0; cornerIndex < vehicleCorners.length; cornerIndex += 1) {
		const corner = vehicleCorners[cornerIndex];
		const terrainKind = RoadsSimulation.mapGeometry.classifyPoint(
			mapDefinition,
			corner.x,
			corner.y
		);

		if (terrainKind !== 'road') {
			return false;
		}
	}

	return true;
};

RoadsSimulation.roadConstraint.isVehicleCollidingWithAny = function isVehicleCollidingWithAny(vehicle, allVehicles) {
	for (let vehicleIndex = 0; vehicleIndex < allVehicles.length; vehicleIndex += 1) {
		const otherVehicle = allVehicles[vehicleIndex];

		if (otherVehicle.uniqueIdentifier === vehicle.uniqueIdentifier) {
			continue;
		}

		if (RoadsSimulation.collisionCheck.areVehiclesColliding(vehicle, otherVehicle)) {
			return true;
		}
	}

	return false;
};

RoadsSimulation.roadConstraint.getMinimumCenterGapMeters = function getMinimumCenterGapMeters(firstVehicle, secondVehicle) {
	const firstType = RoadsSimulation.vehicleTypes[firstVehicle.vehicleTypeIdentifier];
	const secondType = RoadsSimulation.vehicleTypes[secondVehicle.vehicleTypeIdentifier];
	const minimumBumperGapMeters = RoadsSimulation.simulationConstants.minimumBumperGapMeters;

	return minimumBumperGapMeters + firstType.lengthMeters / 2 + secondType.lengthMeters / 2;
};

RoadsSimulation.roadConstraint.areVehiclesInSameDrivingLane = function areVehiclesInSameDrivingLane(
	firstVehicle,
	secondVehicle
) {
	return Math.abs(firstVehicle.laneBlendRatio - secondVehicle.laneBlendRatio) < 0.35;
};

RoadsSimulation.roadConstraint.findVehicleAheadOnSameRoute = function findVehicleAheadOnSameRoute(vehicle, allVehicles) {
	let nearestAhead = null;
	let nearestDistance = null;
	const totalLengthMeters = vehicle.ownLaneRoute.totalLengthMeters;
	const returningToOwnLane = vehicle.targetLaneBlendRatio < 0.35 && vehicle.laneBlendRatio > 0.05;

	for (let vehicleIndex = 0; vehicleIndex < allVehicles.length; vehicleIndex += 1) {
		const candidateVehicle = allVehicles[vehicleIndex];

		if (candidateVehicle.uniqueIdentifier === vehicle.uniqueIdentifier) {
			continue;
		}

		if (candidateVehicle.ownLaneRoute.direction !== vehicle.ownLaneRoute.direction) {
			continue;
		}

		if (!returningToOwnLane
			&& !RoadsSimulation.roadConstraint.areVehiclesInSameDrivingLane(vehicle, candidateVehicle)) {
			continue;
		}

		const aheadMeters = RoadsSimulation.routePath.getSignedDistanceAhead(
			vehicle.distanceMeters,
			candidateVehicle.distanceMeters,
			totalLengthMeters
		);

		if (aheadMeters > 0 && (nearestDistance === null || aheadMeters < nearestDistance)) {
			nearestDistance = aheadMeters;
			nearestAhead = candidateVehicle;
		}
	}

	return nearestAhead ? { vehicle: nearestAhead, distanceMeters: nearestDistance } : null;
};

RoadsSimulation.roadConstraint.limitTravelDistance = function limitTravelDistance(vehicle, allVehicles, travelMeters) {
	let allowedTravelMeters = travelMeters;
	const vehicleAhead = RoadsSimulation.roadConstraint.findVehicleAheadOnSameRoute(vehicle, allVehicles);

	if (vehicleAhead) {
		const minimumGapMeters = RoadsSimulation.roadConstraint.getMinimumCenterGapMeters(
			vehicle,
			vehicleAhead.vehicle
		);
		const maximumDistanceMeters = vehicleAhead.vehicle.distanceMeters - minimumGapMeters;
		const remainingGapMeters = maximumDistanceMeters - vehicle.distanceMeters;

		if (remainingGapMeters < allowedTravelMeters) {
			allowedTravelMeters = Math.max(0, remainingGapMeters);
		}
	}

	return allowedTravelMeters;
};

RoadsSimulation.roadConstraint.canPlaceVehicleAtState = function canPlaceVehicleAtState(
	vehicle,
	mapDefinition,
	allVehicles
) {
	return RoadsSimulation.roadConstraint.isVehicleFullyOnRoad(vehicle, mapDefinition)
		&& !RoadsSimulation.roadConstraint.isVehicleCollidingWithAny(vehicle, allVehicles);
};

RoadsSimulation.roadConstraint.canPlaceVehicleAlongPath = function canPlaceVehicleAlongPath(
	vehicle,
	mapDefinition,
	allVehicles
) {
	if (RoadsSimulation.roadConstraint.isVehicleCollidingWithAny(vehicle, allVehicles)) {
		return false;
	}

	if (!RoadsSimulation.roadConstraint.isVehicleOnRoad(vehicle, mapDefinition)) {
		return false;
	}

	const inCornerZone = RoadsSimulation.routePath.isDistanceInsideCornerZone(
		vehicle.ownLaneRoute,
		vehicle.distanceMeters
	);
	const laneChangeActive = RoadsSimulation.laneControl.isLaneChangeActive(vehicle);
	const wideLineShiftActive = RoadsSimulation.laneControl.isWideLineShiftActive(vehicle);

	if (inCornerZone || laneChangeActive || wideLineShiftActive) {
		return true;
	}

	const savedHeadingRadians = vehicle.headingRadians;
	vehicle.headingRadians = RoadsSimulation.routePath.getVehicleBlendedTangentHeading(vehicle);
	const canPlace = RoadsSimulation.roadConstraint.isVehicleFullyOnRoad(vehicle, mapDefinition);
	vehicle.headingRadians = savedHeadingRadians;
	return canPlace;
};

RoadsSimulation.roadConstraint.advanceAlongRoad = function advanceAlongRoad(
	vehicle,
	forwardMeters,
	mapDefinition,
	allVehicles
) {
	const stepMeters = 0.1;
	let remainingMeters = forwardMeters;

	while (remainingMeters > 0.0001) {
		const currentStepMeters = Math.min(stepMeters, remainingMeters);
		const previousDistanceMeters = vehicle.distanceMeters;

		vehicle.distanceMeters += currentStepMeters;
		RoadsSimulation.roadConstraint.snapVehiclePosition(vehicle);

		if (!RoadsSimulation.roadConstraint.canPlaceVehicleAlongPath(vehicle, mapDefinition, allVehicles)) {
			vehicle.distanceMeters = previousDistanceMeters;
			RoadsSimulation.roadConstraint.snapVehiclePosition(vehicle);
			break;
		}

		remainingMeters -= currentStepMeters;
	}
};

RoadsSimulation.roadConstraint.resolveTouchingVehicles = function resolveTouchingVehicles(vehicle, allVehicles) {
	for (let vehicleIndex = 0; vehicleIndex < allVehicles.length; vehicleIndex += 1) {
		const otherVehicle = allVehicles[vehicleIndex];

		if (otherVehicle.uniqueIdentifier === vehicle.uniqueIdentifier) {
			continue;
		}

		if (!RoadsSimulation.collisionCheck.areVehiclesColliding(vehicle, otherVehicle)) {
			continue;
		}

		if (vehicle.ownLaneRoute.direction !== otherVehicle.ownLaneRoute.direction) {
			continue;
		}

		const totalLengthMeters = vehicle.ownLaneRoute.totalLengthMeters;
		const routeGapMeters = RoadsSimulation.routePath.getSignedDistanceAhead(
			vehicle.distanceMeters,
			otherVehicle.distanceMeters,
			totalLengthMeters
		);

		if (routeGapMeters <= 0) {
			continue;
		}

		const crawlSpeedMeterPerSecond = RoadsSimulation.simulationConstants.getMinimumCrawlSpeedMeterPerSecond();
		const matchedSpeed = Math.max(otherVehicle.speedMeterPerSecond, crawlSpeedMeterPerSecond);

		vehicle.speedMeterPerSecond = Math.min(vehicle.speedMeterPerSecond, matchedSpeed);
		vehicle.desiredSpeedMeterPerSecond = Math.min(vehicle.desiredSpeedMeterPerSecond, matchedSpeed);
		vehicle.targetLaneBlendRatio = 0;

		const minimumGapMeters = RoadsSimulation.roadConstraint.getMinimumCenterGapMeters(vehicle, otherVehicle);

		if (routeGapMeters < minimumGapMeters) {
			vehicle.distanceMeters = otherVehicle.distanceMeters - minimumGapMeters;
			RoadsSimulation.roadConstraint.snapVehiclePosition(vehicle);
		}

		vehicle.intentLabel = RoadsSimulation.vehicleIntent.formatYieldLabel();
	}
};
