window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleBrain = {};

function normalizeAngleRadians(angleRadians) {
	let normalized = angleRadians;

	while (normalized > Math.PI) {
		normalized -= Math.PI * 2;
	}

	while (normalized < -Math.PI) {
		normalized += Math.PI * 2;
	}

	return normalized;
}

function getHeadingGapRadians(vehicle, mapDefinition) {
	const steeringHeading = RoadsSimulation.cornerPlanning.getSteeringHeadingTarget(vehicle, mapDefinition);
	return Math.abs(normalizeAngleRadians(steeringHeading - vehicle.headingRadians));
}

function applyTurnSpeedLimit(vehicle, targetSpeedMeterPerSecond, cornerSpeedMeterPerSecond, mapDefinition) {
	if (RoadsSimulation.laneControl.isLaneChangeActive(vehicle)
		&& !RoadsSimulation.routePath.isDistanceInsideCornerZone(vehicle.ownLaneRoute, vehicle.distanceMeters)) {
		return targetSpeedMeterPerSecond;
	}

	const headingGap = getHeadingGapRadians(vehicle, mapDefinition);

	if (headingGap <= 0.2) {
		return targetSpeedMeterPerSecond;
	}

	const vehicleType = RoadsSimulation.vehicleTypes[vehicle.vehicleTypeIdentifier];
	const turnSpeedCap = vehicle.maxTurnRateRadiansPerSecond * vehicleType.lengthMeters / headingGap;
	const minimumSpeedMeterPerSecond = Math.max(
		cornerSpeedMeterPerSecond * 0.85,
		RoadsSimulation.simulationConstants.getMinimumCrawlSpeedMeterPerSecond()
	);

	return Math.min(targetSpeedMeterPerSecond, Math.max(turnSpeedCap, minimumSpeedMeterPerSecond));
}

function createBaseRequest(vehicle, mapDefinition) {
	const requestKinds = RoadsSimulation.vehicleRequestKinds;
	const speedLimitMeterPerSecond = RoadsSimulation.speedControl.getSpeedLimitMeterPerSecond(vehicle, mapDefinition);
	const roadSpeedLimitKilometerPerHour = RoadsSimulation.speedControl.getEffectiveSpeedLimit(vehicle, mapDefinition);
	let targetSpeedMeterPerSecond = speedLimitMeterPerSecond;

	const cornerSpeedKilometerPerHour = RoadsSimulation.cornerPlanning.getTargetSpeedBeforeCorner(
		vehicle,
		RoadsSimulation.turnGrip.meterPerSecondToKilometerPerHour(vehicle.speedMeterPerSecond),
		roadSpeedLimitKilometerPerHour,
		mapDefinition
	);
	const cornerSpeedMeterPerSecond = RoadsSimulation.turnGrip.kilometerPerHourToMeterPerSecond(cornerSpeedKilometerPerHour);

	if (cornerSpeedMeterPerSecond < targetSpeedMeterPerSecond - 0.3) {
		targetSpeedMeterPerSecond = cornerSpeedMeterPerSecond;
	}

	targetSpeedMeterPerSecond = applyTurnSpeedLimit(vehicle, targetSpeedMeterPerSecond, cornerSpeedMeterPerSecond, mapDefinition);

	const nearestCornerAheadMeters = RoadsSimulation.routePath.getNearestCornerDistanceAhead(
		vehicle.ownLaneRoute,
		vehicle.distanceMeters
	);
	const cornerBrakeDistanceMeters = RoadsSimulation.cornerPlanning.getCornerBrakeDistanceMeters(vehicle);
	const isBrakingForCorner = nearestCornerAheadMeters !== null
		&& nearestCornerAheadMeters <= cornerBrakeDistanceMeters
		&& cornerSpeedMeterPerSecond < speedLimitMeterPerSecond - 0.3;
	const headingGap = getHeadingGapRadians(vehicle, mapDefinition);
	const isTurning = headingGap > 0.18;

	let actionKind = requestKinds.accelerate;
	let label = RoadsSimulation.vehicleIntent.formatAccelerateLabel(roadSpeedLimitKilometerPerHour);

	if (isTurning) {
		actionKind = requestKinds.turn;
		label = RoadsSimulation.vehicleIntent.formatTurnLabel(
			RoadsSimulation.turnGrip.meterPerSecondToKilometerPerHour(targetSpeedMeterPerSecond)
		);
	} else if (isBrakingForCorner) {
		actionKind = requestKinds.brakeForCorner;
		label = RoadsSimulation.vehicleIntent.formatBrakeForCornerLabel(cornerSpeedKilometerPerHour);
	} else if (targetSpeedMeterPerSecond >= speedLimitMeterPerSecond - 0.2) {
		actionKind = requestKinds.maintainSpeed;
		label = RoadsSimulation.vehicleIntent.formatCruiseLabel(roadSpeedLimitKilometerPerHour);
	}

	const request = requestKinds.createRequest({
		actionKind: actionKind,
		targetSpeedMeterPerSecond: targetSpeedMeterPerSecond,
		targetLaneBlendRatio: 0,
		targetWideLineOutwardRatio: 0,
		label: label,
		allowFullStop: false,
	});

	request.speedLimitMeterPerSecond = speedLimitMeterPerSecond;
	request.cornerWideLineActive = false;
	RoadsSimulation.cornerPlanning.applyWideLineToRequest(vehicle, request, mapDefinition);
	return request;
}

function ensureForwardMotivation(request) {
	if (request.allowFullStop || request.respectFollowingBrake) {
		return;
	}

	const crawlSpeedMeterPerSecond = RoadsSimulation.simulationConstants.getMinimumCrawlSpeedMeterPerSecond();
	request.targetSpeedMeterPerSecond = Math.max(request.targetSpeedMeterPerSecond, crawlSpeedMeterPerSecond);
}

function resolveTargetLaneBlend(vehicle, request) {
	if (request.cornerWideLineActive) {
		return request.targetLaneBlendRatio;
	}

	if (request.targetLaneBlendRatio > 0.05
		&& !RoadsSimulation.laneControl.canChangeLaneAtDistance(vehicle, vehicle.distanceMeters)
		&& !RoadsSimulation.laneControl.isLaneChangeActive(vehicle)) {
		return vehicle.laneBlendRatio >= 0.5 ? 1 : 0;
	}

	return request.targetLaneBlendRatio;
}

RoadsSimulation.vehicleBrain.planRequest = function planRequest(vehicle, tickContext) {
	const allVehicles = tickContext.allVehicles;
	const mapDefinition = tickContext.mapDefinition;
	const visibleVehicles = tickContext.visibleVehicles;
	const requestKinds = RoadsSimulation.vehicleRequestKinds;

	if (vehicle.drivingMode === 'overtaking') {
		const baseRequest = createBaseRequest(vehicle, mapDefinition);
		const request = RoadsSimulation.overtakePlanning.planActiveOvertake(
			vehicle,
			allVehicles,
			mapDefinition,
			visibleVehicles,
			baseRequest
		);

		if (!request.respectFollowingBrake) {
			ensureForwardMotivation(request);
		}

		request.targetLaneBlendRatio = resolveTargetLaneBlend(vehicle, request);
		return request;
	}

	const request = createBaseRequest(vehicle, mapDefinition);
	const leadingVehicle = RoadsSimulation.vehicleSight.getLeadingVehicleOnRoute(vehicle, visibleVehicles);

	if (leadingVehicle) {
		RoadsSimulation.overtakeControl.applyYieldToLeadingVehicle(
			vehicle,
			leadingVehicle,
			request,
			mapDefinition
		);
	}

	const vehicleAhead = RoadsSimulation.vehicleSight.getVehicleAheadOnSameRoute(vehicle, visibleVehicles);

	if (vehicleAhead) {
		const startedOvertake = RoadsSimulation.overtakePlanning.tryStartOvertake(
			vehicle,
			vehicleAhead.vehicle,
			vehicleAhead.distanceMeters,
			allVehicles,
			mapDefinition,
			request
		);

		if (startedOvertake) {
			ensureForwardMotivation(startedOvertake);
			startedOvertake.targetLaneBlendRatio = resolveTargetLaneBlend(vehicle, startedOvertake);
			return startedOvertake;
		}

		RoadsSimulation.overtakePlanning.applyFollowingForOvertake(
			vehicle,
			vehicleAhead.vehicle,
			vehicleAhead.distanceMeters,
			allVehicles,
			mapDefinition,
			request
		);
	}

	for (let oncomingIndex = 0; oncomingIndex < visibleVehicles.length; oncomingIndex += 1) {
		const oncomingVehicle = visibleVehicles[oncomingIndex];

		if (!RoadsSimulation.routePath.areOppositeDirections(vehicle.ownLaneRoute, oncomingVehicle.ownLaneRoute)) {
			continue;
		}

		if (RoadsSimulation.overtakePlanning.detectHeadOnRisk(vehicle, oncomingVehicle)) {
			RoadsSimulation.overtakePlanning.applyHeadOnToRequest(vehicle, oncomingVehicle, request);
			ensureForwardMotivation(request);
			request.targetLaneBlendRatio = resolveTargetLaneBlend(vehicle, request);
			return request;
		}
	}

	for (let otherIndex = 0; otherIndex < allVehicles.length; otherIndex += 1) {
		const otherVehicle = allVehicles[otherIndex];

		if (otherVehicle.uniqueIdentifier === vehicle.uniqueIdentifier) {
			continue;
		}

		if (RoadsSimulation.collisionCheck.areVehiclesColliding(vehicle, otherVehicle)) {
			request.targetLaneBlendRatio = 0;
			request.cornerWideLineActive = false;
			request.targetSpeedMeterPerSecond = Math.min(
				request.targetSpeedMeterPerSecond,
				Math.max(
					otherVehicle.speedMeterPerSecond,
					RoadsSimulation.simulationConstants.getMinimumCrawlSpeedMeterPerSecond()
				)
			);
			request.actionKind = requestKinds.yieldToTraffic;
			request.label = RoadsSimulation.vehicleIntent.formatYieldLabel();
			break;
		}
	}

	if (!request.cornerWideLineActive && request.targetLaneBlendRatio < 0.05 && vehicle.laneBlendRatio > 0.05) {
		request.actionKind = requestKinds.returnToLane;
		request.label = RoadsSimulation.vehicleIntent.formatReturnToLaneLabel();

		if (vehicleAhead) {
			const returnGapMeters = vehicleAhead.distanceMeters;
			const maximumFollowDistanceMeters = RoadsSimulation.simulationConstants.overtakeStartMaximumDistanceMeters;

			if (returnGapMeters > maximumFollowDistanceMeters) {
				request.targetSpeedMeterPerSecond = RoadsSimulation.overtakeControl.getCatchUpSpeedMeterPerSecond(
					vehicleAhead.vehicle,
					request.targetSpeedMeterPerSecond
				);
				request.respectFollowingBrake = true;
			} else {
				RoadsSimulation.overtakeControl.applyBrakeForVehicleAhead(
					vehicle,
					vehicleAhead.vehicle,
					returnGapMeters,
					request
				);
			}
		}
	}

	if (request.targetLaneBlendRatio === 1 && vehicle.laneBlendRatio < 0.95) {
		request.actionKind = requestKinds.laneChange;
		request.label = RoadsSimulation.vehicleIntent.formatLaneChangeLabel();
	}

	if (!request.respectFollowingBrake) {
		ensureForwardMotivation(request);
	}

	request.targetLaneBlendRatio = resolveTargetLaneBlend(vehicle, request);
	return request;
};

RoadsSimulation.vehicleBrain.getPathHeadingTarget = function getPathHeadingTarget(vehicle) {
	return RoadsSimulation.routePath.getVehicleBlendedTangentHeading(vehicle);
};

RoadsSimulation.vehicleBrain.getSteeringHeadingTarget = function getSteeringHeadingTarget(vehicle, mapDefinition) {
	return RoadsSimulation.cornerPlanning.getSteeringHeadingTarget(vehicle, mapDefinition);
};

RoadsSimulation.vehicleBrain.normalizeAngleRadians = normalizeAngleRadians;
