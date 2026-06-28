window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.laneControl = {};

RoadsSimulation.laneControl.updateLaneBlend = function updateLaneBlend(vehicle, deltaSeconds, mapDefinition) {
	const inCornerZone = RoadsSimulation.routePath.isDistanceInsideCornerZone(
		vehicle.ownLaneRoute,
		vehicle.distanceMeters
	);

	if (inCornerZone && vehicle.drivingMode === 'overtaking') {
		vehicle.targetLaneBlendRatio = 0;
	}

	if (inCornerZone && vehicle.targetLaneBlendRatio > 0.5 && vehicle.laneBlendRatio < 0.2) {
		return;
	}

	const returningToOwnLane = vehicle.targetLaneBlendRatio < 0.05 && vehicle.laneBlendRatio > 0.05;
	const laneChangeDuration = returningToOwnLane
		? RoadsSimulation.physicsConstants.laneChangeDurationSeconds * 0.45
		: RoadsSimulation.physicsConstants.laneChangeDurationSeconds;
	const blendDifference = vehicle.targetLaneBlendRatio - vehicle.laneBlendRatio;
	const maxChange = deltaSeconds / laneChangeDuration;

	if (Math.abs(blendDifference) <= maxChange) {
		vehicle.laneBlendRatio = vehicle.targetLaneBlendRatio;
	} else if (blendDifference > 0) {
		vehicle.laneBlendRatio += maxChange;
	} else {
		vehicle.laneBlendRatio -= maxChange;
	}
};

RoadsSimulation.laneControl.updateWideLineOutward = function updateWideLineOutward(vehicle, deltaSeconds, mapDefinition) {
	const inCornerZone = RoadsSimulation.routePath.isDistanceInsideCornerZone(
		vehicle.ownLaneRoute,
		vehicle.distanceMeters
	);

	if (inCornerZone && vehicle.drivingMode === 'overtaking') {
		vehicle.targetWideLineOutwardRatio = 0;
	}

	if (vehicle.laneBlendRatio > 0.2) {
		vehicle.targetWideLineOutwardRatio = 0;
	}

	const transitionDuration = RoadsSimulation.physicsConstants.laneChangeDurationSeconds;
	const outwardDifference = vehicle.targetWideLineOutwardRatio - vehicle.wideLineOutwardRatio;
	const maxChange = deltaSeconds / transitionDuration;

	if (Math.abs(outwardDifference) <= maxChange) {
		vehicle.wideLineOutwardRatio = vehicle.targetWideLineOutwardRatio;
	} else if (outwardDifference > 0) {
		vehicle.wideLineOutwardRatio += maxChange;
	} else {
		vehicle.wideLineOutwardRatio -= maxChange;
	}

	if (vehicle.wideLineOutwardRatio > 0.001 && mapDefinition) {
		const safeOutwardRatio = RoadsSimulation.cornerPlanning.clampSafeWideLineOutward(
			vehicle,
			vehicle.wideLineOutwardRatio,
			mapDefinition
		);
		vehicle.wideLineOutwardRatio = Math.min(vehicle.wideLineOutwardRatio, safeOutwardRatio);
	}
};

RoadsSimulation.laneControl.requestOwnLane = function requestOwnLane(vehicle) {
	vehicle.targetLaneBlendRatio = 0;
};

RoadsSimulation.laneControl.requestOppositeLane = function requestOppositeLane(vehicle) {
	vehicle.targetLaneBlendRatio = 1;
};

RoadsSimulation.laneControl.isInOwnLane = function isInOwnLane(vehicle) {
	return vehicle.laneBlendRatio < 0.05 && vehicle.targetLaneBlendRatio < 0.05;
};

RoadsSimulation.laneControl.isInOppositeLane = function isInOppositeLane(vehicle) {
	return vehicle.laneBlendRatio > 0.95;
};

RoadsSimulation.laneControl.canChangeLaneAtDistance = function canChangeLaneAtDistance(vehicle, distanceMeters) {
	return !RoadsSimulation.routePath.isDistanceInsideCornerZone(vehicle.ownLaneRoute, distanceMeters);
};

RoadsSimulation.laneControl.isLaneChangeActive = function isLaneChangeActive(vehicle) {
	return Math.abs(vehicle.targetLaneBlendRatio - vehicle.laneBlendRatio) > 0.05;
};

RoadsSimulation.laneControl.isWideLineShiftActive = function isWideLineShiftActive(vehicle) {
	return Math.abs(vehicle.targetWideLineOutwardRatio - vehicle.wideLineOutwardRatio) > 0.01;
};
