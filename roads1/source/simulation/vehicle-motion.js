window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleMotion = {};

function saveVehicleMotionState(vehicle) {
	return {
		worldXMeters: vehicle.worldXMeters,
		worldYMeters: vehicle.worldYMeters,
		distanceMeters: vehicle.distanceMeters,
		laneBlendRatio: vehicle.laneBlendRatio,
		headingRadians: vehicle.headingRadians,
	};
}

function restoreVehicleMotionState(vehicle, savedState) {
	vehicle.worldXMeters = savedState.worldXMeters;
	vehicle.worldYMeters = savedState.worldYMeters;
	vehicle.distanceMeters = savedState.distanceMeters;
	vehicle.laneBlendRatio = savedState.laneBlendRatio;
	vehicle.headingRadians = savedState.headingRadians;
}

RoadsSimulation.vehicleMotion.doesSegmentStayOnRoad = function doesSegmentStayOnRoad(
	mapDefinition,
	startWorldXMeters,
	startWorldYMeters,
	endWorldXMeters,
	endWorldYMeters
) {
	const deltaX = endWorldXMeters - startWorldXMeters;
	const deltaY = endWorldYMeters - startWorldYMeters;
	const segmentLengthMeters = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

	if (segmentLengthMeters < 0.0001) {
		return RoadsSimulation.mapGeometry.classifyPoint(mapDefinition, endWorldXMeters, endWorldYMeters) === 'road';
	}

	const sampleCount = Math.max(2, Math.ceil(segmentLengthMeters / 0.2));

	for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
		const ratio = sampleIndex / sampleCount;
		const sampleX = startWorldXMeters + deltaX * ratio;
		const sampleY = startWorldYMeters + deltaY * ratio;
		const terrainKind = RoadsSimulation.mapGeometry.classifyPoint(mapDefinition, sampleX, sampleY);

		if (terrainKind !== 'road') {
			return false;
		}
	}

	return true;
};

RoadsSimulation.vehicleMotion.findClosestDistanceOnRoute = function findClosestDistanceOnRoute(
	routeCenterline,
	worldXMeters,
	worldYMeters
) {
	const totalLengthMeters = routeCenterline.totalLengthMeters;
	const sampleStepMeters = 0.25;
	let closestDistanceMeters = 0;
	let closestGapSquared = Infinity;

	for (let sampleIndex = 0; sampleIndex * sampleStepMeters < totalLengthMeters; sampleIndex += 1) {
		const sampleDistanceMeters = sampleIndex * sampleStepMeters;
		const routePosition = RoadsSimulation.routePath.getPositionOnPath(routeCenterline, sampleDistanceMeters);
		const deltaX = routePosition.worldXMeters - worldXMeters;
		const deltaY = routePosition.worldYMeters - worldYMeters;
		const gapSquared = deltaX * deltaX + deltaY * deltaY;

		if (gapSquared < closestGapSquared) {
			closestGapSquared = gapSquared;
			closestDistanceMeters = sampleDistanceMeters;
		}
	}

	return closestDistanceMeters;
};

RoadsSimulation.vehicleMotion.syncDistanceFromWorld = function syncDistanceFromWorld(vehicle) {
	vehicle.distanceMeters = RoadsSimulation.vehicleMotion.findClosestDistanceOnRoute(
		vehicle.ownLaneRoute,
		vehicle.worldXMeters,
		vehicle.worldYMeters
	);
};

RoadsSimulation.vehicleMotion.syncRouteStateFromWorld = function syncRouteStateFromWorld(vehicle) {
	RoadsSimulation.vehicleMotion.syncDistanceFromWorld(vehicle);

	const ownPosition = RoadsSimulation.routePath.getPositionOnPath(vehicle.ownLaneRoute, vehicle.distanceMeters);
	const oppositePosition = RoadsSimulation.routePath.getPositionOnPath(
		vehicle.oppositeLaneRoute,
		vehicle.distanceMeters
	);
	const lateralDeltaX = oppositePosition.worldXMeters - ownPosition.worldXMeters;
	const lateralDeltaY = oppositePosition.worldYMeters - ownPosition.worldYMeters;
	const lateralSpanSquared = lateralDeltaX * lateralDeltaX + lateralDeltaY * lateralDeltaY;

	if (lateralSpanSquared < 0.0001) {
		vehicle.laneBlendRatio = 0;
		return;
	}

	const offsetX = vehicle.worldXMeters - ownPosition.worldXMeters;
	const offsetY = vehicle.worldYMeters - ownPosition.worldYMeters;
	const projectedBlend = (offsetX * lateralDeltaX + offsetY * lateralDeltaY) / lateralSpanSquared;

	vehicle.laneBlendRatio = Math.max(0, Math.min(1, projectedBlend));
};

RoadsSimulation.vehicleMotion.moveVehicleByHeading = function moveVehicleByHeading(
	vehicle,
	forwardMeters,
	mapDefinition,
	relevantVehicles
) {
	const stepMeters = 0.05;
	let remainingMeters = forwardMeters;
	const headingX = Math.cos(vehicle.headingRadians);
	const headingY = Math.sin(vehicle.headingRadians);

	while (remainingMeters > 0.0001) {
		const currentStepMeters = Math.min(stepMeters, remainingMeters);
		const savedState = saveVehicleMotionState(vehicle);
		const nextWorldXMeters = vehicle.worldXMeters + headingX * currentStepMeters;
		const nextWorldYMeters = vehicle.worldYMeters + headingY * currentStepMeters;

		if (!RoadsSimulation.vehicleMotion.doesSegmentStayOnRoad(
			mapDefinition,
			vehicle.worldXMeters,
			vehicle.worldYMeters,
			nextWorldXMeters,
			nextWorldYMeters
		)) {
			restoreVehicleMotionState(vehicle, savedState);
			break;
		}

		vehicle.worldXMeters = nextWorldXMeters;
		vehicle.worldYMeters = nextWorldYMeters;
		RoadsSimulation.vehicleMotion.syncDistanceFromWorld(vehicle);

		if (!RoadsSimulation.roadConstraint.canPlaceVehicleAlongPath(vehicle, mapDefinition, relevantVehicles)) {
			restoreVehicleMotionState(vehicle, savedState);
			break;
		}

		remainingMeters -= currentStepMeters;
	}

	return forwardMeters - remainingMeters;
};

RoadsSimulation.vehicleMotion.conformVehicleToLanePath = function conformVehicleToLanePath(
	vehicle,
	deltaSeconds,
	mapDefinition,
	relevantVehicles
) {
	const pathPosition = RoadsSimulation.routePath.getBlendedPosition(
		vehicle.ownLaneRoute,
		vehicle.oppositeLaneRoute,
		vehicle.distanceMeters,
		vehicle.laneBlendRatio
	);
	const deltaX = pathPosition.worldXMeters - vehicle.worldXMeters;
	const deltaY = pathPosition.worldYMeters - vehicle.worldYMeters;
	const lateralGapMeters = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

	if (lateralGapMeters < 0.03) {
		vehicle.worldXMeters = pathPosition.worldXMeters;
		vehicle.worldYMeters = pathPosition.worldYMeters;
		return;
	}

	const laneWidthMeters = vehicle.ownLaneRoute.laneWidthMeters;
	const laneChangeDuration = RoadsSimulation.physicsConstants.laneChangeDurationSeconds;
	const maxLateralMeters = laneWidthMeters * deltaSeconds / laneChangeDuration;
	const lateralStepMeters = Math.min(lateralGapMeters, Math.max(maxLateralMeters, 0.02));
	const stepRatio = lateralStepMeters / lateralGapMeters;
	const savedState = saveVehicleMotionState(vehicle);
	const nextWorldXMeters = vehicle.worldXMeters + deltaX * stepRatio;
	const nextWorldYMeters = vehicle.worldYMeters + deltaY * stepRatio;

	if (!RoadsSimulation.vehicleMotion.doesSegmentStayOnRoad(
		mapDefinition,
		vehicle.worldXMeters,
		vehicle.worldYMeters,
		nextWorldXMeters,
		nextWorldYMeters
	)) {
		return;
	}

	vehicle.worldXMeters = nextWorldXMeters;
	vehicle.worldYMeters = nextWorldYMeters;

	if (!RoadsSimulation.roadConstraint.canPlaceVehicleAlongPath(vehicle, mapDefinition, relevantVehicles)) {
		restoreVehicleMotionState(vehicle, savedState);
	}
};
