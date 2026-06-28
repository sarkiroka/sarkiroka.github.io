window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.overtakePlanning = {};

RoadsSimulation.overtakePlanning.canStartOvertake = function canStartOvertake(
	vehicle,
	aheadVehicle,
	allVehicles,
	mapDefinition
) {
	if (!vehicle.overtakeAllowed) {
		return false;
	}

	if (!RoadsSimulation.overtakeControl.hasMinimumSpeedDifference(vehicle, aheadVehicle, mapDefinition)) {
		return false;
	}

	const overtakeDistance = RoadsSimulation.overtakeControl.getOvertakeDistanceMeters(vehicle);
	const endDistance = vehicle.distanceMeters + overtakeDistance;

	if (RoadsSimulation.routePath.hasCornerBetween(vehicle.ownLaneRoute, vehicle.distanceMeters, endDistance)) {
		return false;
	}

	return RoadsSimulation.vehicleSight.isOppositeLaneClear(
		vehicle,
		allVehicles,
		mapDefinition,
		overtakeDistance
	);
};

RoadsSimulation.overtakePlanning.detectHeadOnRisk = function detectHeadOnRisk(firstVehicle, secondVehicle) {
	if (!RoadsSimulation.routePath.areOppositeDirections(firstVehicle.ownLaneRoute, secondVehicle.ownLaneRoute)) {
		return false;
	}

	const oneInWrongLane = RoadsSimulation.overtakeControl.isVehicleInWrongLane(firstVehicle)
		|| RoadsSimulation.overtakeControl.isVehicleInWrongLane(secondVehicle);

	if (!oneInWrongLane) {
		return false;
	}

	const deltaX = secondVehicle.worldXMeters - firstVehicle.worldXMeters;
	const deltaY = secondVehicle.worldYMeters - firstVehicle.worldYMeters;
	const distanceMeters = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

	if (distanceMeters > RoadsSimulation.simulationConstants.headOnResolveDistanceMeters) {
		return false;
	}

	const firstHeadingX = Math.cos(firstVehicle.headingRadians);
	const firstHeadingY = Math.sin(firstVehicle.headingRadians);
	const toOtherX = deltaX / distanceMeters;
	const toOtherY = deltaY / distanceMeters;
	const firstDot = firstHeadingX * toOtherX + firstHeadingY * toOtherY;

	return firstDot > 0.3;
};

RoadsSimulation.overtakePlanning.applyHeadOnToRequest = function applyHeadOnToRequest(vehicle, otherVehicle, request) {
	RoadsSimulation.overtakeControl.applyHeadOnStandoff(vehicle, otherVehicle, request);
};

RoadsSimulation.overtakePlanning.planActiveOvertake = function planActiveOvertake(
	vehicle,
	allVehicles,
	mapDefinition,
	visibleVehicles,
	baseRequest
) {
	const requestKinds = RoadsSimulation.vehicleRequestKinds;
	const overtakeTarget = allVehicles.find(function findTarget(candidate) {
		return candidate.uniqueIdentifier === vehicle.overtakeTargetIdentifier;
	});

	const request = requestKinds.createRequest({
		actionKind: requestKinds.overtake,
		targetSpeedMeterPerSecond: Math.min(
			baseRequest.targetSpeedMeterPerSecond,
			baseRequest.speedLimitMeterPerSecond
		),
		targetLaneBlendRatio: 1,
		label: RoadsSimulation.vehicleIntent.formatOvertakeLabel(),
		allowFullStop: false,
	});

	if (RoadsSimulation.routePath.isDistanceInsideCornerZone(vehicle.ownLaneRoute, vehicle.distanceMeters)) {
		vehicle.drivingMode = 'normal';
		vehicle.overtakeTargetIdentifier = null;
		request.actionKind = requestKinds.returnToLane;
		request.targetLaneBlendRatio = 0;
		request.label = RoadsSimulation.vehicleIntent.formatReturnToLaneLabel();
		return request;
	}

	if (!overtakeTarget) {
		vehicle.drivingMode = 'normal';
		vehicle.overtakeTargetIdentifier = null;
		request.actionKind = requestKinds.returnToLane;
		request.targetLaneBlendRatio = 0;
		request.label = RoadsSimulation.vehicleIntent.formatReturnToLaneLabel();
		return request;
	}

	const totalLength = vehicle.ownLaneRoute.totalLengthMeters;
	const distanceGapMeters = RoadsSimulation.routePath.getSignedDistanceAhead(
		vehicle.distanceMeters,
		overtakeTarget.distanceMeters,
		totalLength
	);
	const maximumFollowDistanceMeters = RoadsSimulation.simulationConstants.overtakeStartMaximumDistanceMeters;

	if (RoadsSimulation.overtakeControl.hasRearPassedFront(vehicle, overtakeTarget)) {
		vehicle.drivingMode = 'normal';
		vehicle.overtakeTargetIdentifier = null;
		request.actionKind = requestKinds.returnToLane;
		request.targetLaneBlendRatio = 0;
		request.label = RoadsSimulation.vehicleIntent.formatReturnToLaneLabel();
		return request;
	}

	if (distanceGapMeters > maximumFollowDistanceMeters + 2) {
		vehicle.drivingMode = 'normal';
		request.actionKind = requestKinds.returnToLane;
		request.targetLaneBlendRatio = 0;
		request.label = RoadsSimulation.vehicleIntent.formatReturnToLaneLabel();
		request.targetSpeedMeterPerSecond = RoadsSimulation.overtakeControl.getCatchUpSpeedMeterPerSecond(
			overtakeTarget,
			request.targetSpeedMeterPerSecond
		);
		request.respectFollowingBrake = true;
		return request;
	}

	if (distanceGapMeters > 0 && vehicle.laneBlendRatio < 0.35) {
		RoadsSimulation.overtakeControl.applyBrakeForVehicleAhead(
			vehicle,
			overtakeTarget,
			distanceGapMeters,
			request
		);
	}

	const overtakeDistanceMeters = RoadsSimulation.overtakeControl.getOvertakeDistanceMeters(vehicle);
	const oppositeLaneStillClear = RoadsSimulation.vehicleSight.isOppositeLaneClear(
		vehicle,
		allVehicles,
		mapDefinition,
		overtakeDistanceMeters
	);

	if (!oppositeLaneStillClear) {
		vehicle.drivingMode = 'normal';
		request.actionKind = requestKinds.returnToLane;
		request.targetLaneBlendRatio = 0;
		request.label = RoadsSimulation.vehicleIntent.formatReturnToLaneLabel();
		request.targetSpeedMeterPerSecond = RoadsSimulation.overtakeControl.getCatchUpSpeedMeterPerSecond(
			overtakeTarget,
			request.targetSpeedMeterPerSecond
		);
		request.respectFollowingBrake = true;
		return request;
	}

	const oncomingVehicles = RoadsSimulation.vehicleSight.getOncomingVehicles(vehicle, visibleVehicles);

	for (let oncomingIndex = 0; oncomingIndex < oncomingVehicles.length; oncomingIndex += 1) {
		const oncomingVehicle = oncomingVehicles[oncomingIndex];

		if (RoadsSimulation.overtakePlanning.detectHeadOnRisk(vehicle, oncomingVehicle)) {
			RoadsSimulation.overtakePlanning.applyHeadOnToRequest(vehicle, oncomingVehicle, request);
			return request;
		}
	}

	if (vehicle.laneBlendRatio >= 0.35) {
		request.respectFollowingBrake = false;
		request.targetSpeedMeterPerSecond = Math.min(
			baseRequest.targetSpeedMeterPerSecond,
			baseRequest.speedLimitMeterPerSecond
		);
	}

	return request;
};

RoadsSimulation.overtakePlanning.tryStartOvertake = function tryStartOvertake(
	vehicle,
	aheadVehicle,
	distanceGap,
	allVehicles,
	mapDefinition,
	baseRequest
) {
	const requestKinds = RoadsSimulation.vehicleRequestKinds;
	const canOvertake = RoadsSimulation.overtakePlanning.canStartOvertake(
		vehicle,
		aheadVehicle,
		allVehicles,
		mapDefinition
	);
	const hasSpeedDifference = RoadsSimulation.overtakeControl.hasMinimumSpeedDifference(
		vehicle,
		aheadVehicle,
		mapDefinition
	);
	const inStartDistance = RoadsSimulation.overtakeControl.isWithinStartDistance(distanceGap);

	if (!hasSpeedDifference || !vehicle.overtakeAllowed || !canOvertake || !inStartDistance
		|| !RoadsSimulation.laneControl.canChangeLaneAtDistance(vehicle, vehicle.distanceMeters)) {
		return null;
	}

	vehicle.drivingMode = 'overtaking';
	vehicle.overtakeTargetIdentifier = aheadVehicle.uniqueIdentifier;

	return requestKinds.createRequest({
		actionKind: requestKinds.overtake,
		targetSpeedMeterPerSecond: Math.min(
			baseRequest.targetSpeedMeterPerSecond,
			baseRequest.speedLimitMeterPerSecond
		),
		targetLaneBlendRatio: 1,
		label: RoadsSimulation.vehicleIntent.formatOvertakeLabel(),
		allowFullStop: false,
	});
};

RoadsSimulation.overtakePlanning.applyFollowingForOvertake = function applyFollowingForOvertake(
	vehicle,
	aheadVehicle,
	distanceGap,
	allVehicles,
	mapDefinition,
	request
) {
	const hasSpeedDifference = RoadsSimulation.overtakeControl.hasMinimumSpeedDifference(
		vehicle,
		aheadVehicle,
		mapDefinition
	);
	const inStartDistance = RoadsSimulation.overtakeControl.isWithinStartDistance(distanceGap);
	const canOvertake = RoadsSimulation.overtakePlanning.canStartOvertake(
		vehicle,
		aheadVehicle,
		allVehicles,
		mapDefinition
	);

	if (hasSpeedDifference && vehicle.overtakeAllowed && !canOvertake) {
		const maximumFollowDistanceMeters = RoadsSimulation.simulationConstants.overtakeStartMaximumDistanceMeters;

		if (distanceGap > maximumFollowDistanceMeters) {
			request.targetSpeedMeterPerSecond = RoadsSimulation.overtakeControl.getCatchUpSpeedMeterPerSecond(
				aheadVehicle,
				request.targetSpeedMeterPerSecond
			);
			request.actionKind = RoadsSimulation.vehicleRequestKinds.followVehicle;
			request.label = RoadsSimulation.vehicleIntent.formatFollowingLabel();
			request.respectFollowingBrake = true;
		} else {
			RoadsSimulation.overtakeControl.applyBrakeForVehicleAhead(
				vehicle,
				aheadVehicle,
				distanceGap,
				request
			);
		}

		return;
	}

	if (hasSpeedDifference && vehicle.overtakeAllowed && !inStartDistance
		&& distanceGap > RoadsSimulation.simulationConstants.overtakeStartMaximumDistanceMeters
		&& distanceGap < 50) {
		request.targetSpeedMeterPerSecond = RoadsSimulation.overtakeControl.getCatchUpSpeedMeterPerSecond(
			aheadVehicle,
			request.targetSpeedMeterPerSecond
		);
		request.actionKind = RoadsSimulation.vehicleRequestKinds.followVehicle;
		request.label = RoadsSimulation.vehicleIntent.formatFollowingLabel();
		request.respectFollowingBrake = true;
		return;
	}

	if (!hasSpeedDifference || !vehicle.overtakeAllowed || !inStartDistance) {
		const aheadSpeedMeterPerSecond = Math.max(
			aheadVehicle.speedMeterPerSecond,
			aheadVehicle.desiredSpeedMeterPerSecond * 0.9,
			RoadsSimulation.simulationConstants.getMinimumCrawlSpeedMeterPerSecond()
		);

		if (distanceGap < RoadsSimulation.simulationConstants.followingDistanceMeters * 3) {
			request.targetSpeedMeterPerSecond = Math.min(request.targetSpeedMeterPerSecond, aheadSpeedMeterPerSecond);
			request.actionKind = RoadsSimulation.vehicleRequestKinds.followVehicle;
			request.label = RoadsSimulation.vehicleIntent.formatFollowingLabel();
		}
	}
};
