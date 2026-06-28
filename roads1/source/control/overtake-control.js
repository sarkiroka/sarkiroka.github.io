window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.overtakeControl = {};

RoadsSimulation.overtakeControl.getVehicleHalfLength = function getVehicleHalfLength(vehicle) {
	const vehicleType = RoadsSimulation.vehicleTypes[vehicle.vehicleTypeIdentifier];
	return vehicleType.lengthMeters / 2;
};

RoadsSimulation.overtakeControl.getBumperGapMeters = function getBumperGapMeters(firstVehicle, secondVehicle) {
	const firstHalfLength = RoadsSimulation.overtakeControl.getVehicleHalfLength(firstVehicle);
	const secondHalfLength = RoadsSimulation.overtakeControl.getVehicleHalfLength(secondVehicle);
	const deltaX = secondVehicle.worldXMeters - firstVehicle.worldXMeters;
	const deltaY = secondVehicle.worldYMeters - firstVehicle.worldYMeters;
	const centerDistanceMeters = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

	return centerDistanceMeters - firstHalfLength - secondHalfLength;
};

RoadsSimulation.overtakeControl.hasMinimumSpeedDifference = function hasMinimumSpeedDifference(
	fasterVehicle,
	slowerVehicle,
	mapDefinition
) {
	const fasterLimit = RoadsSimulation.speedControl.getEffectiveSpeedLimit(fasterVehicle, mapDefinition);
	const slowerLimit = RoadsSimulation.speedControl.getEffectiveSpeedLimit(slowerVehicle, mapDefinition);
	const minimumRatio = 1 + RoadsSimulation.simulationConstants.overtakeMinimumSpeedDifferenceRatio;

	return fasterLimit >= slowerLimit * minimumRatio;
};

RoadsSimulation.overtakeControl.isWithinStartDistance = function isWithinStartDistance(distanceMeters) {
	const minimumDistance = RoadsSimulation.simulationConstants.overtakeStartMinimumDistanceMeters;
	const maximumDistance = RoadsSimulation.simulationConstants.overtakeStartMaximumDistanceMeters;

	return distanceMeters >= minimumDistance && distanceMeters <= maximumDistance;
};

RoadsSimulation.overtakeControl.hasRearPassedFront = function hasRearPassedFront(overtakerVehicle, targetVehicle) {
	const overtakerHalfLength = RoadsSimulation.overtakeControl.getVehicleHalfLength(overtakerVehicle);
	const targetHalfLength = RoadsSimulation.overtakeControl.getVehicleHalfLength(targetVehicle);
	const overtakerRearDistance = overtakerVehicle.distanceMeters - overtakerHalfLength;
	const targetFrontDistance = targetVehicle.distanceMeters + targetHalfLength;
	const totalLength = overtakerVehicle.ownLaneRoute.totalLengthMeters;
	const rearAheadOfFrontMeters = RoadsSimulation.routePath.getSignedDistanceAhead(
		targetFrontDistance,
		overtakerRearDistance,
		totalLength
	);

	return rearAheadOfFrontMeters > 0;
};

RoadsSimulation.overtakeControl.isVehicleInWrongLane = function isVehicleInWrongLane(vehicle) {
	return vehicle.laneBlendRatio > 0.5 || vehicle.targetLaneBlendRatio > 0.5;
};

RoadsSimulation.overtakeControl.getOvertakeDistanceMeters = function getOvertakeDistanceMeters(vehicle) {
	const vehicleType = RoadsSimulation.vehicleTypes[vehicle.vehicleTypeIdentifier];
	return vehicleType.lengthMeters * 4 + RoadsSimulation.simulationConstants.overtakeMinimumGapMeters;
};

RoadsSimulation.overtakeControl.getCatchUpSpeedMeterPerSecond = function getCatchUpSpeedMeterPerSecond(
	aheadVehicle,
	requestedSpeedMeterPerSecond
) {
	const catchUpSpeedMeterPerSecond = aheadVehicle.speedMeterPerSecond + 2.5;
	const minimumCatchUpSpeedMeterPerSecond = aheadVehicle.speedMeterPerSecond + 0.8;

	return Math.max(
		minimumCatchUpSpeedMeterPerSecond,
		Math.min(requestedSpeedMeterPerSecond, catchUpSpeedMeterPerSecond)
	);
};

RoadsSimulation.overtakeControl.applyBrakeForVehicleAhead = function applyBrakeForVehicleAhead(
	followerVehicle,
	aheadVehicle,
	distanceGapMeters,
	request
) {
	const minimumCenterGapMeters = RoadsSimulation.roadConstraint.getMinimumCenterGapMeters(
		followerVehicle,
		aheadVehicle
	);
	const aheadSpeedMeterPerSecond = Math.max(
		aheadVehicle.speedMeterPerSecond,
		RoadsSimulation.simulationConstants.getMinimumCrawlSpeedMeterPerSecond()
	);

	request.actionKind = RoadsSimulation.vehicleRequestKinds.followVehicle;
	request.label = RoadsSimulation.vehicleIntent.formatFollowingLabel();
	request.respectFollowingBrake = true;

	if (distanceGapMeters >= minimumCenterGapMeters) {
		request.targetSpeedMeterPerSecond = Math.min(request.targetSpeedMeterPerSecond, aheadSpeedMeterPerSecond);
		return;
	}

	const gapRatio = Math.max(0, distanceGapMeters / minimumCenterGapMeters);
	request.targetSpeedMeterPerSecond = Math.min(
		request.targetSpeedMeterPerSecond,
		aheadSpeedMeterPerSecond * gapRatio
	);

	if (distanceGapMeters < minimumCenterGapMeters * 0.95) {
		request.targetSpeedMeterPerSecond = 0;
		request.allowFullStop = true;
	}
};

RoadsSimulation.overtakeControl.applyHeadOnStandoff = function applyHeadOnStandoff(vehicle, otherVehicle, request) {
	const bumperGapMeters = RoadsSimulation.overtakeControl.getBumperGapMeters(vehicle, otherVehicle);
	const minimumGapMeters = RoadsSimulation.simulationConstants.headOnMinimumGapMeters;

	if (RoadsSimulation.overtakeControl.isVehicleInWrongLane(vehicle)) {
		request.targetLaneBlendRatio = 0;

		if (vehicle.drivingMode === 'overtaking') {
			vehicle.drivingMode = 'normal';
			vehicle.overtakeTargetIdentifier = null;
		}

		request.label = RoadsSimulation.vehicleIntent.formatYieldLabel();
	}

	if (bumperGapMeters <= minimumGapMeters) {
		request.targetSpeedMeterPerSecond = 0;
		request.allowFullStop = true;
		request.label = RoadsSimulation.vehicleIntent.formatHeadOnStopLabel();
		return;
	}

	if (request.respectFollowingBrake) {
		return;
	}

	const crawlSpeedMeterPerSecond = RoadsSimulation.simulationConstants.getMinimumCrawlSpeedMeterPerSecond();
	request.targetSpeedMeterPerSecond = Math.min(request.targetSpeedMeterPerSecond, crawlSpeedMeterPerSecond);
	request.label = RoadsSimulation.vehicleIntent.formatHeadOnStopLabel();
};

RoadsSimulation.overtakeControl.applyYieldToLeadingVehicle = function applyYieldToLeadingVehicle(
	vehicle,
	leadingVehicleInfo,
	request,
	mapDefinition
) {
	const aheadVehicle = leadingVehicleInfo.vehicle;
	const distanceMeters = leadingVehicleInfo.distanceMeters;
	const yieldDistanceMeters = RoadsSimulation.simulationConstants.overtakeYieldDistanceMeters;

	if (distanceMeters > yieldDistanceMeters) {
		return;
	}

	if (vehicle.overtakeAllowed
		&& RoadsSimulation.overtakeControl.hasMinimumSpeedDifference(vehicle, aheadVehicle, mapDefinition)) {
		return;
	}

	const crawlSpeedMeterPerSecond = RoadsSimulation.simulationConstants.getMinimumCrawlSpeedMeterPerSecond();
	const aheadSpeedMeterPerSecond = Math.max(aheadVehicle.speedMeterPerSecond, crawlSpeedMeterPerSecond);

	request.targetSpeedMeterPerSecond = Math.min(request.targetSpeedMeterPerSecond, aheadSpeedMeterPerSecond);

	const isMergingIntoLane = aheadVehicle.laneBlendRatio > 0.1
		&& aheadVehicle.targetLaneBlendRatio < aheadVehicle.laneBlendRatio - 0.05;

	if (isMergingIntoLane) {
		request.intentLabel = RoadsSimulation.vehicleIntent.formatLetVehicleMergeLabel();
	} else {
		request.intentLabel = RoadsSimulation.vehicleIntent.formatFollowingLabel();
	}
};
