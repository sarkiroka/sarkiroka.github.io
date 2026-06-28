window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.simulationTick = {};

function applyHeadingTurn(vehicle, deltaSeconds, mapDefinition) {
	const targetHeading = RoadsSimulation.cornerPlanning.getSteeringHeadingTarget(vehicle, mapDefinition);
	const maxTurnRadians = vehicle.maxTurnRateRadiansPerSecond * deltaSeconds;
	let headingDifference = RoadsSimulation.vehicleBrain.normalizeAngleRadians(
		targetHeading - vehicle.headingRadians
	);

	if (Math.abs(headingDifference) <= maxTurnRadians) {
		vehicle.headingRadians = targetHeading;
		return;
	}

	vehicle.headingRadians += Math.sign(headingDifference) * maxTurnRadians;
	vehicle.headingRadians = RoadsSimulation.vehicleBrain.normalizeAngleRadians(vehicle.headingRadians);
}

function shouldUseCornerSteering(vehicle, mapDefinition) {
	const route = vehicle.ownLaneRoute;
	const inCornerZone = RoadsSimulation.routePath.isDistanceInsideCornerZone(route, vehicle.distanceMeters);
	const nearestCornerAheadMeters = RoadsSimulation.routePath.getNearestCornerDistanceAhead(
		route,
		vehicle.distanceMeters
	);
	const approachingCorner = nearestCornerAheadMeters !== null
		&& nearestCornerAheadMeters <= RoadsSimulation.physicsConstants.cornerSteeringAnticipationMeters;
	const wideLineOutward = mapDefinition
		? RoadsSimulation.cornerPlanning.getWideLineBlendTarget(vehicle, mapDefinition)
		: null;
	const wideLineActive = wideLineOutward !== null && wideLineOutward > 0.01;
	const laneChangeActive = RoadsSimulation.laneControl.isLaneChangeActive(vehicle);
	const wideLineShiftActive = RoadsSimulation.laneControl.isWideLineShiftActive(vehicle);

	return inCornerZone || approachingCorner || wideLineActive || laneChangeActive || wideLineShiftActive;
}

function applyVehicleHeading(vehicle, deltaSeconds, mapDefinition) {
	const targetHeading = RoadsSimulation.routePath.getVehicleBlendedTangentHeading(vehicle);

	if (shouldUseCornerSteering(vehicle, mapDefinition)) {
		applyHeadingTurn(vehicle, deltaSeconds, mapDefinition);
		return;
	}

	const maxTurnRadians = vehicle.maxTurnRateRadiansPerSecond * deltaSeconds;
	let headingDifference = RoadsSimulation.vehicleBrain.normalizeAngleRadians(
		targetHeading - vehicle.headingRadians
	);

	if (Math.abs(headingDifference) <= maxTurnRadians) {
		vehicle.headingRadians = targetHeading;
		return;
	}

	vehicle.headingRadians += Math.sign(headingDifference) * maxTurnRadians;
	vehicle.headingRadians = RoadsSimulation.vehicleBrain.normalizeAngleRadians(vehicle.headingRadians);
}

function applyVehicleRequest(vehicle, request) {
	vehicle.currentRequest = request;
	vehicle.desiredSpeedMeterPerSecond = request.targetSpeedMeterPerSecond;
	vehicle.intentLabel = request.label;
	vehicle.targetLaneBlendRatio = request.targetLaneBlendRatio;
	vehicle.targetWideLineOutwardRatio = request.targetWideLineOutwardRatio || 0;
}

RoadsSimulation.simulationTick.applyVehiclePhysics = function applyVehiclePhysics(
	vehicle,
	allVehicles,
	mapDefinition,
	deltaSeconds,
	request
) {
	const previousDistanceMeters = vehicle.distanceMeters;
	const previousLaneBlendRatio = vehicle.laneBlendRatio;
	const previousWideLineOutwardRatio = vehicle.wideLineOutwardRatio;
	const previousSpeedMeterPerSecond = vehicle.speedMeterPerSecond;

	applyVehicleRequest(vehicle, request);
	RoadsSimulation.laneControl.updateLaneBlend(vehicle, deltaSeconds, mapDefinition);
	RoadsSimulation.laneControl.updateWideLineOutward(vehicle, deltaSeconds, mapDefinition);

	if (!request.allowFullStop || request.targetSpeedMeterPerSecond > 0) {
		RoadsSimulation.speedControl.applySpeedChange(vehicle, request.targetSpeedMeterPerSecond, deltaSeconds);
	} else {
		RoadsSimulation.speedControl.applySpeedChange(vehicle, 0, deltaSeconds);
	}

	RoadsSimulation.speedControl.clampToEffectiveLimit(vehicle, mapDefinition);

	let forwardMeters = vehicle.speedMeterPerSecond * deltaSeconds;
	forwardMeters = RoadsSimulation.roadConstraint.limitTravelDistance(vehicle, allVehicles, forwardMeters);

	for (let otherIndex = 0; otherIndex < allVehicles.length; otherIndex += 1) {
		const otherVehicle = allVehicles[otherIndex];

		if (otherVehicle.uniqueIdentifier === vehicle.uniqueIdentifier) {
			continue;
		}

		if (RoadsSimulation.collisionCheck.willVehiclesCollide(vehicle, otherVehicle, deltaSeconds)) {
			forwardMeters = 0;
			const matchedSpeed = Math.max(
				otherVehicle.speedMeterPerSecond,
				RoadsSimulation.simulationConstants.getMinimumCrawlSpeedMeterPerSecond()
			);
			vehicle.desiredSpeedMeterPerSecond = Math.min(vehicle.desiredSpeedMeterPerSecond, matchedSpeed);
			RoadsSimulation.speedControl.applySpeedChange(vehicle, matchedSpeed, deltaSeconds);
			break;
		}
	}

	if (forwardMeters > 0) {
		RoadsSimulation.roadConstraint.advanceAlongRoad(vehicle, forwardMeters, mapDefinition, allVehicles);
	} else {
		RoadsSimulation.roadConstraint.snapVehiclePosition(vehicle);
	}

	const positionValid = RoadsSimulation.roadConstraint.canPlaceVehicleAlongPath(vehicle, mapDefinition, allVehicles);

	if (!positionValid) {
		vehicle.distanceMeters = previousDistanceMeters;
		vehicle.laneBlendRatio = previousLaneBlendRatio;
		vehicle.wideLineOutwardRatio = previousWideLineOutwardRatio;
		RoadsSimulation.roadConstraint.snapVehiclePosition(vehicle);

		if (!RoadsSimulation.laneControl.isLaneChangeActive(vehicle)
			&& !RoadsSimulation.laneControl.isWideLineShiftActive(vehicle)) {
			vehicle.speedMeterPerSecond = Math.max(
				previousSpeedMeterPerSecond * 0.85,
				RoadsSimulation.simulationConstants.getMinimumCrawlSpeedMeterPerSecond()
			);
		}
	} else {
		applyVehicleHeading(vehicle, deltaSeconds, mapDefinition);
	}

	RoadsSimulation.roadConstraint.resolveTouchingVehicles(vehicle, allVehicles);
	RoadsSimulation.roadConstraint.snapVehiclePosition(vehicle);
};

RoadsSimulation.simulationTick.runTick = function runTick(vehicles, mapDefinition, deltaSeconds) {
	const plannedRequests = [];

	for (let planningPass = 0; planningPass < 2; planningPass += 1) {
		plannedRequests.length = 0;

		for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex += 1) {
			const vehicle = vehicles[vehicleIndex];
			const visibleVehicles = RoadsSimulation.vehicleSight.getVisibleVehicles(
				vehicle,
				vehicles,
				mapDefinition
			);
			const request = RoadsSimulation.vehicleBrain.planRequest(vehicle, {
				allVehicles: vehicles,
				mapDefinition: mapDefinition,
				visibleVehicles: visibleVehicles,
			});

			plannedRequests.push({ vehicle: vehicle, request: request });
		}
	}

	for (let vehicleIndex = 0; vehicleIndex < plannedRequests.length; vehicleIndex += 1) {
		const planned = plannedRequests[vehicleIndex];
		RoadsSimulation.simulationTick.applyVehiclePhysics(
			planned.vehicle,
			vehicles,
			mapDefinition,
			deltaSeconds,
			planned.request
		);
	}
};
