window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleSight = {};

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

function isPointInsideBuilding(mapDefinition, worldXMeters, worldYMeters) {
	return RoadsSimulation.mapGeometry.classifyPoint(mapDefinition, worldXMeters, worldYMeters) === 'building';
}

function lineIntersectsBuilding(mapDefinition, startX, startY, endX, endY) {
	const sampleCount = 12;

	for (let sampleIndex = 1; sampleIndex < sampleCount; sampleIndex += 1) {
		const ratio = sampleIndex / sampleCount;
		const sampleX = startX + (endX - startX) * ratio;
		const sampleY = startY + (endY - startY) * ratio;

		if (isPointInsideBuilding(mapDefinition, sampleX, sampleY)) {
			return true;
		}
	}

	return false;
}

RoadsSimulation.vehicleSight.canSeeVehicle = function canSeeVehicle(observerVehicle, targetVehicle, mapDefinition) {
	const sightRangeMeters = RoadsSimulation.simulationConstants.sightRangeMeters;
	const sightHalfAngle = RoadsSimulation.simulationConstants.sightHalfAngleRadians;
	const deltaX = targetVehicle.worldXMeters - observerVehicle.worldXMeters;
	const deltaY = targetVehicle.worldYMeters - observerVehicle.worldYMeters;
	const distanceMeters = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

	if (distanceMeters > sightRangeMeters) {
		return false;
	}

	if (distanceMeters < 0.5) {
		return true;
	}

	const angleToTarget = Math.atan2(deltaY, deltaX);
	const angleDifference = normalizeAngleRadians(angleToTarget - observerVehicle.headingRadians);

	if (Math.abs(angleDifference) > sightHalfAngle) {
		return false;
	}

	if (lineIntersectsBuilding(
		mapDefinition,
		observerVehicle.worldXMeters,
		observerVehicle.worldYMeters,
		targetVehicle.worldXMeters,
		targetVehicle.worldYMeters
	)) {
		return false;
	}

	return true;
};

RoadsSimulation.vehicleSight.getVisibleVehicles = function getVisibleVehicles(observerVehicle, allVehicles, mapDefinition) {
	const visibleVehicles = [];

	for (let vehicleIndex = 0; vehicleIndex < allVehicles.length; vehicleIndex += 1) {
		const candidateVehicle = allVehicles[vehicleIndex];

		if (candidateVehicle.uniqueIdentifier === observerVehicle.uniqueIdentifier) {
			continue;
		}

		if (RoadsSimulation.vehicleSight.canSeeVehicle(observerVehicle, candidateVehicle, mapDefinition)) {
			visibleVehicles.push(candidateVehicle);
		}
	}

	return visibleVehicles;
};

RoadsSimulation.vehicleSight.getVehicleAheadOnSameRoute = function getVehicleAheadOnSameRoute(observerVehicle, visibleVehicles) {
	const totalLength = observerVehicle.ownLaneRoute.totalLengthMeters;
	let nearestAhead = null;
	let nearestDistance = null;

	for (let vehicleIndex = 0; vehicleIndex < visibleVehicles.length; vehicleIndex += 1) {
		const candidateVehicle = visibleVehicles[vehicleIndex];

		if (candidateVehicle.ownLaneRoute.direction !== observerVehicle.ownLaneRoute.direction) {
			continue;
		}

		const aheadMeters = RoadsSimulation.routePath.getSignedDistanceAhead(
			observerVehicle.distanceMeters,
			candidateVehicle.distanceMeters,
			totalLength
		);

		if (aheadMeters > 0 && (nearestDistance === null || aheadMeters < nearestDistance)) {
			nearestDistance = aheadMeters;
			nearestAhead = candidateVehicle;
		}
	}

	return nearestAhead ? { vehicle: nearestAhead, distanceMeters: nearestDistance } : null;
};

RoadsSimulation.vehicleSight.getLeadingVehicleOnRoute = function getLeadingVehicleOnRoute(observerVehicle, visibleVehicles) {
	const totalLength = observerVehicle.ownLaneRoute.totalLengthMeters;
	let nearestAhead = null;
	let nearestDistance = null;

	for (let vehicleIndex = 0; vehicleIndex < visibleVehicles.length; vehicleIndex += 1) {
		const candidateVehicle = visibleVehicles[vehicleIndex];

		if (candidateVehicle.ownLaneRoute.direction !== observerVehicle.ownLaneRoute.direction) {
			continue;
		}

		const aheadMeters = RoadsSimulation.routePath.getSignedDistanceAhead(
			observerVehicle.distanceMeters,
			candidateVehicle.distanceMeters,
			totalLength
		);

		if (aheadMeters > 0 && (nearestDistance === null || aheadMeters < nearestDistance)) {
			nearestDistance = aheadMeters;
			nearestAhead = candidateVehicle;
		}
	}

	return nearestAhead ? { vehicle: nearestAhead, distanceMeters: nearestDistance } : null;
};

RoadsSimulation.vehicleSight.getOncomingVehicles = function getOncomingVehicles(observerVehicle, visibleVehicles) {
	const oncomingVehicles = [];

	for (let vehicleIndex = 0; vehicleIndex < visibleVehicles.length; vehicleIndex += 1) {
		const candidateVehicle = visibleVehicles[vehicleIndex];

		if (RoadsSimulation.routePath.areOppositeDirections(observerVehicle.ownLaneRoute, candidateVehicle.ownLaneRoute)) {
			oncomingVehicles.push(candidateVehicle);
		}
	}

	return oncomingVehicles;
};

RoadsSimulation.vehicleSight.isOppositeLaneClear = function isOppositeLaneClear(
	observerVehicle,
	allVehicles,
	mapDefinition,
	checkDistanceMeters
) {
	const endDistance = observerVehicle.distanceMeters + checkDistanceMeters;

	if (RoadsSimulation.routePath.hasCornerBetween(observerVehicle.ownLaneRoute, observerVehicle.distanceMeters, endDistance)) {
		return false;
	}

	const visibleVehicles = RoadsSimulation.vehicleSight.getVisibleVehicles(observerVehicle, allVehicles, mapDefinition);
	const oncomingVehicles = RoadsSimulation.vehicleSight.getOncomingVehicles(observerVehicle, visibleVehicles);
	const sightHalfAngle = RoadsSimulation.simulationConstants.sightHalfAngleRadians;

	for (let vehicleIndex = 0; vehicleIndex < oncomingVehicles.length; vehicleIndex += 1) {
		const oncomingVehicle = oncomingVehicles[vehicleIndex];

		if (!RoadsSimulation.collisionCheck.isVehicleOnInnerLane(oncomingVehicle)) {
			continue;
		}

		const deltaX = oncomingVehicle.worldXMeters - observerVehicle.worldXMeters;
		const deltaY = oncomingVehicle.worldYMeters - observerVehicle.worldYMeters;
		const distanceMeters = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		if (distanceMeters > checkDistanceMeters) {
			continue;
		}

		const angleToOncoming = Math.atan2(deltaY, deltaX);
		const angleDifference = normalizeAngleRadians(angleToOncoming - observerVehicle.headingRadians);

		if (Math.abs(angleDifference) > sightHalfAngle) {
			continue;
		}

		const headingX = Math.cos(observerVehicle.headingRadians);
		const headingY = Math.sin(observerVehicle.headingRadians);
		const directionX = deltaX / distanceMeters;
		const directionY = deltaY / distanceMeters;
		const forwardDot = headingX * directionX + headingY * directionY;

		if (forwardDot > 0.2) {
			return false;
		}
	}

	return true;
};
