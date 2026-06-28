window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.cornerPlanning = {};

RoadsSimulation.cornerPlanning.getCornerBrakeDistanceMeters = function getCornerBrakeDistanceMeters(vehicle) {
	const vehicleType = RoadsSimulation.vehicleTypes[vehicle.vehicleTypeIdentifier];
	const multiplier = vehicleType.cornerBrakeDistanceMultiplier || 1;
	return RoadsSimulation.physicsConstants.cornerBrakeDistanceMeters * multiplier;
};

RoadsSimulation.cornerPlanning.getMaximumWideLineBlend = function getMaximumWideLineBlend(vehicle) {
	const vehicleType = RoadsSimulation.vehicleTypes[vehicle.vehicleTypeIdentifier];
	const laneWidthMeters = vehicle.ownLaneRoute.laneWidthMeters;
	const safeOffsetMeters = Math.max(0, laneWidthMeters * 0.5 - vehicleType.widthMeters * 0.45);

	return Math.min(0.18, safeOffsetMeters / laneWidthMeters);
};

RoadsSimulation.cornerPlanning.isWideLineOutwardSafe = function isWideLineOutwardSafe(vehicle, outwardRatio, mapDefinition) {
	const savedDistanceMeters = vehicle.distanceMeters;
	const savedOutwardRatio = vehicle.wideLineOutwardRatio;
	const savedHeadingRadians = vehicle.headingRadians;
	const sampleOffsetsMeters = [0, 0.05, 0.1, 0.15];
	let isSafe = true;

	for (let sampleIndex = 0; sampleIndex < sampleOffsetsMeters.length; sampleIndex += 1) {
		const sampleDistanceMeters = savedDistanceMeters + sampleOffsetsMeters[sampleIndex];
		vehicle.distanceMeters = sampleDistanceMeters;
		vehicle.wideLineOutwardRatio = outwardRatio;
		RoadsSimulation.roadConstraint.snapVehiclePosition(vehicle);
		vehicle.headingRadians = RoadsSimulation.routePath.getVehicleBlendedTangentHeading(vehicle);

		if (!RoadsSimulation.roadConstraint.isVehicleFullyOnRoad(vehicle, mapDefinition)) {
			isSafe = false;
			break;
		}
	}

	vehicle.distanceMeters = savedDistanceMeters;
	vehicle.wideLineOutwardRatio = savedOutwardRatio;
	vehicle.headingRadians = savedHeadingRadians;
	RoadsSimulation.roadConstraint.snapVehiclePosition(vehicle);
	return isSafe;
};

RoadsSimulation.cornerPlanning.clampSafeWideLineOutward = function clampSafeWideLineOutward(
	vehicle,
	desiredOutwardRatio,
	mapDefinition
) {
	const maximumOutwardRatio = RoadsSimulation.cornerPlanning.getMaximumWideLineBlend(vehicle);
	let safeOutwardRatio = Math.min(desiredOutwardRatio, maximumOutwardRatio);

	for (let attemptIndex = 0; attemptIndex < 6; attemptIndex += 1) {
		if (RoadsSimulation.cornerPlanning.isWideLineOutwardSafe(vehicle, safeOutwardRatio, mapDefinition)) {
			return safeOutwardRatio;
		}

		safeOutwardRatio *= 0.65;
	}

	return 0;
};

RoadsSimulation.cornerPlanning.clampSafeWideLineBlend = function clampSafeWideLineBlend(vehicle, desiredBlend, mapDefinition) {
	return RoadsSimulation.cornerPlanning.clampSafeWideLineOutward(vehicle, desiredBlend, mapDefinition);
};

RoadsSimulation.cornerPlanning.isWideLineBlendSafe = function isWideLineBlendSafe(vehicle, laneBlendRatio, mapDefinition) {
	return RoadsSimulation.cornerPlanning.isWideLineOutwardSafe(vehicle, laneBlendRatio, mapDefinition);
};

RoadsSimulation.cornerPlanning.getWideLineBlendTarget = function getWideLineBlendTarget(vehicle, mapDefinition) {
	if (vehicle.drivingMode === 'overtaking') {
		return null;
	}

	if (vehicle.laneBlendRatio > 0.85 || vehicle.targetLaneBlendRatio > 0.85) {
		return null;
	}

	const route = vehicle.ownLaneRoute;
	const nearestCornerAheadMeters = RoadsSimulation.routePath.getNearestCornerDistanceAhead(
		route,
		vehicle.distanceMeters
	);
	const inCornerZone = RoadsSimulation.routePath.isDistanceInsideCornerZone(route, vehicle.distanceMeters);
	const approachMeters = RoadsSimulation.physicsConstants.cornerWideLineApproachMeters;
	const maximumWideLineBlend = RoadsSimulation.cornerPlanning.getMaximumWideLineBlend(vehicle);

	if (inCornerZone) {
		return RoadsSimulation.cornerPlanning.clampSafeWideLineBlend(vehicle, maximumWideLineBlend, mapDefinition);
	}

	if (nearestCornerAheadMeters !== null && nearestCornerAheadMeters <= approachMeters) {
		const approachRatio = 1 - nearestCornerAheadMeters / approachMeters;
		const desiredBlend = maximumWideLineBlend * approachRatio;
		return RoadsSimulation.cornerPlanning.clampSafeWideLineBlend(vehicle, desiredBlend, mapDefinition);
	}

	return null;
};

RoadsSimulation.cornerPlanning.getSteeringLookAheadMeters = function getSteeringLookAheadMeters(vehicle) {
	const speedBasedMeters = Math.max(
		2.5,
		Math.min(12, vehicle.speedMeterPerSecond * 0.75)
	);
	const nearestCornerAheadMeters = RoadsSimulation.routePath.getNearestCornerDistanceAhead(
		vehicle.ownLaneRoute,
		vehicle.distanceMeters
	);

	if (nearestCornerAheadMeters === null) {
		return speedBasedMeters;
	}

	if (nearestCornerAheadMeters <= RoadsSimulation.physicsConstants.cornerSteeringAnticipationMeters) {
		const anticipationBonus = (
			RoadsSimulation.physicsConstants.cornerSteeringAnticipationMeters - nearestCornerAheadMeters
		) * 0.35;
		return Math.max(speedBasedMeters, 4 + anticipationBonus);
	}

	return speedBasedMeters;
};

RoadsSimulation.cornerPlanning.getHeadingAtDistance = function getHeadingAtDistance(vehicle, distanceMeters, laneBlendRatio) {
	const roadPosition = RoadsSimulation.routePath.getBlendedPosition(
		vehicle.ownLaneRoute,
		vehicle.oppositeLaneRoute,
		distanceMeters,
		laneBlendRatio,
		vehicle.wideLineOutwardRatio,
		vehicle.vehicleTypeIdentifier
	);

	return roadPosition.headingRadians;
};

RoadsSimulation.cornerPlanning.getSteeringHeadingTarget = function getSteeringHeadingTarget(vehicle, mapDefinition) {
	const lookAheadMeters = RoadsSimulation.cornerPlanning.getSteeringLookAheadMeters(vehicle);
	const wideLineOutward = mapDefinition
		? RoadsSimulation.cornerPlanning.getWideLineBlendTarget(vehicle, mapDefinition)
		: null;
	const wideLineOutwardRatio = wideLineOutward !== null
		? Math.max(vehicle.wideLineOutwardRatio, wideLineOutward)
		: vehicle.wideLineOutwardRatio;

	return RoadsSimulation.routePath.getBlendedTangentHeading(
		vehicle.ownLaneRoute,
		vehicle.oppositeLaneRoute,
		vehicle.distanceMeters + lookAheadMeters,
		vehicle.laneBlendRatio,
		wideLineOutwardRatio,
		vehicle.vehicleTypeIdentifier
	);
};

RoadsSimulation.cornerPlanning.getEffectiveCornerRadiusMeters = function getEffectiveCornerRadiusMeters(vehicle, mapDefinition) {
	const baseRadiusMeters = RoadsSimulation.physicsConstants.cornerTurnRadiusMeters;
	const wideLineOutward = mapDefinition
		? RoadsSimulation.cornerPlanning.getWideLineBlendTarget(vehicle, mapDefinition)
		: null;
	const laneWidthMeters = vehicle.ownLaneRoute.laneWidthMeters;

	if (wideLineOutward === null || wideLineOutward <= 0.05) {
		return baseRadiusMeters;
	}

	return baseRadiusMeters + laneWidthMeters * wideLineOutward;
};

RoadsSimulation.cornerPlanning.getMaximumCornerSpeedKilometerPerHour = function getMaximumCornerSpeedKilometerPerHour(
	vehicle,
	mapDefinition
) {
	const gripAcceleration = RoadsSimulation.physicsConstants.gripLateralAccelerationMeterPerSecondSquared;
	const turnRadiusMeters = RoadsSimulation.cornerPlanning.getEffectiveCornerRadiusMeters(vehicle, mapDefinition);
	const maxSpeedMeterPerSecond = Math.sqrt(gripAcceleration * turnRadiusMeters);

	return RoadsSimulation.turnGrip.meterPerSecondToKilometerPerHour(maxSpeedMeterPerSecond);
};

RoadsSimulation.cornerPlanning.getTargetSpeedBeforeCorner = function getTargetSpeedBeforeCorner(
	vehicle,
	currentSpeedKilometerPerHour,
	roadSpeedLimitKilometerPerHour,
	mapDefinition
) {
	const routeCenterline = vehicle.ownLaneRoute;
	const distanceMeters = vehicle.distanceMeters;
	const cornerSpeedLimit = RoadsSimulation.cornerPlanning.getMaximumCornerSpeedKilometerPerHour(
		vehicle,
		mapDefinition
	);
	const brakeDistanceMeters = RoadsSimulation.cornerPlanning.getCornerBrakeDistanceMeters(vehicle);

	if (RoadsSimulation.routePath.isDistanceInsideCornerZone(routeCenterline, distanceMeters)) {
		return cornerSpeedLimit;
	}

	const nearestCornerAheadMeters = RoadsSimulation.routePath.getNearestCornerDistanceAhead(
		routeCenterline,
		distanceMeters
	);

	if (nearestCornerAheadMeters === null || nearestCornerAheadMeters > brakeDistanceMeters) {
		return roadSpeedLimitKilometerPerHour;
	}

	const brakeRatio = nearestCornerAheadMeters / brakeDistanceMeters;
	return cornerSpeedLimit + (roadSpeedLimitKilometerPerHour - cornerSpeedLimit) * brakeRatio;
};

RoadsSimulation.cornerPlanning.applyWideLineToRequest = function applyWideLineToRequest(vehicle, request, mapDefinition) {
	const wideLineOutwardRatio = RoadsSimulation.cornerPlanning.getWideLineBlendTarget(vehicle, mapDefinition);

	if (wideLineOutwardRatio === null || wideLineOutwardRatio <= 0.01) {
		request.cornerWideLineActive = false;
		request.targetWideLineOutwardRatio = 0;
		return;
	}

	request.cornerWideLineActive = true;
	request.targetWideLineOutwardRatio = wideLineOutwardRatio;

	if (wideLineOutwardRatio >= 0.08) {
		request.actionKind = RoadsSimulation.vehicleRequestKinds.turn;
		request.label = RoadsSimulation.vehicleIntent.formatWideCornerLabel();
	}
};
