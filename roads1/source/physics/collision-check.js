window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.collisionCheck = {};

function getVehicleCorners(vehicleState, vehicleType) {
	const halfLength = vehicleType.lengthMeters / 2;
	const halfWidth = vehicleType.widthMeters / 2;
	const cosine = Math.cos(vehicleState.headingRadians);
	const sine = Math.sin(vehicleState.headingRadians);
	const centerX = vehicleState.worldXMeters;
	const centerY = vehicleState.worldYMeters;

	const localCorners = [
		{ localX: halfLength, localY: halfWidth },
		{ localX: halfLength, localY: -halfWidth },
		{ localX: -halfLength, localY: -halfWidth },
		{ localX: -halfLength, localY: halfWidth },
	];

	return localCorners.map(function mapCorner(corner) {
		return {
			x: centerX + corner.localX * cosine - corner.localY * sine,
			y: centerY + corner.localX * sine + corner.localY * cosine,
		};
	});
}

function getOverlapAmount(firstCorners, secondCorners) {
	let minFirstX = firstCorners[0].x;
	let maxFirstX = firstCorners[0].x;
	let minFirstY = firstCorners[0].y;
	let maxFirstY = firstCorners[0].y;
	let minSecondX = secondCorners[0].x;
	let maxSecondX = secondCorners[0].x;
	let minSecondY = secondCorners[0].y;
	let maxSecondY = secondCorners[0].y;

	for (let cornerIndex = 1; cornerIndex < 4; cornerIndex += 1) {
		minFirstX = Math.min(minFirstX, firstCorners[cornerIndex].x);
		maxFirstX = Math.max(maxFirstX, firstCorners[cornerIndex].x);
		minFirstY = Math.min(minFirstY, firstCorners[cornerIndex].y);
		maxFirstY = Math.max(maxFirstY, firstCorners[cornerIndex].y);
		minSecondX = Math.min(minSecondX, secondCorners[cornerIndex].x);
		maxSecondX = Math.max(maxSecondX, secondCorners[cornerIndex].x);
		minSecondY = Math.min(minSecondY, secondCorners[cornerIndex].y);
		maxSecondY = Math.max(maxSecondY, secondCorners[cornerIndex].y);
	}

	const overlapX = Math.min(maxFirstX, maxSecondX) - Math.max(minFirstX, minSecondX);
	const overlapY = Math.min(maxFirstY, maxSecondY) - Math.max(minFirstY, minSecondY);

	if (overlapX <= 0 || overlapY <= 0) {
		return 0;
	}

	return overlapX * overlapY;
}

RoadsSimulation.collisionCheck.areVehiclesColliding = function areVehiclesColliding(firstVehicle, secondVehicle) {
	if (firstVehicle.uniqueIdentifier === secondVehicle.uniqueIdentifier) {
		return false;
	}

	const firstType = RoadsSimulation.vehicleTypes[firstVehicle.vehicleTypeIdentifier];
	const secondType = RoadsSimulation.vehicleTypes[secondVehicle.vehicleTypeIdentifier];
	const firstCorners = getVehicleCorners(firstVehicle, firstType);
	const secondCorners = getVehicleCorners(secondVehicle, secondType);
	const overlapArea = getOverlapAmount(firstCorners, secondCorners);

	if (overlapArea <= 0.01) {
		return false;
	}

	if (firstVehicle.ownLaneRoute.direction === secondVehicle.ownLaneRoute.direction) {
		return true;
	}

	return isVehicleOnInnerLane(firstVehicle) && isVehicleOnInnerLane(secondVehicle);
};

function isVehicleOnInnerLane(vehicle) {
	if (vehicle.ownLaneRoute.direction === 'clockwise') {
		return vehicle.laneBlendRatio < 0.5;
	}

	return vehicle.laneBlendRatio > 0.5;
}

RoadsSimulation.collisionCheck.isVehicleOnInnerLane = isVehicleOnInnerLane;

RoadsSimulation.collisionCheck.areVehiclesOnConflictingPaths = function areVehiclesOnConflictingPaths(firstVehicle, secondVehicle) {
	if (firstVehicle.ownLaneRoute.direction === secondVehicle.ownLaneRoute.direction) {
		const laneDifference = Math.abs(firstVehicle.laneBlendRatio - secondVehicle.laneBlendRatio);
		return laneDifference < 0.35;
	}

	return isVehicleOnInnerLane(firstVehicle) && isVehicleOnInnerLane(secondVehicle);
};

RoadsSimulation.collisionCheck.willVehiclesCollide = function willVehiclesCollide(
	firstVehicle,
	secondVehicle,
	deltaSeconds
) {
	if (firstVehicle.ownLaneRoute.direction !== secondVehicle.ownLaneRoute.direction) {
		if (!isVehicleOnInnerLane(firstVehicle) || !isVehicleOnInnerLane(secondVehicle)) {
			return false;
		}
	} else {
		const laneDifference = Math.abs(firstVehicle.laneBlendRatio - secondVehicle.laneBlendRatio);

		if (laneDifference >= 0.35) {
			return false;
		}
	}

	const firstCopy = {
		uniqueIdentifier: firstVehicle.uniqueIdentifier,
		vehicleTypeIdentifier: firstVehicle.vehicleTypeIdentifier,
		worldXMeters: firstVehicle.worldXMeters,
		worldYMeters: firstVehicle.worldYMeters,
		headingRadians: firstVehicle.headingRadians,
		speedMeterPerSecond: firstVehicle.speedMeterPerSecond,
		ownLaneRoute: firstVehicle.ownLaneRoute,
		laneBlendRatio: firstVehicle.laneBlendRatio,
	};

	const secondCopy = {
		uniqueIdentifier: secondVehicle.uniqueIdentifier,
		vehicleTypeIdentifier: secondVehicle.vehicleTypeIdentifier,
		worldXMeters: secondVehicle.worldXMeters,
		worldYMeters: secondVehicle.worldYMeters,
		headingRadians: secondVehicle.headingRadians,
		speedMeterPerSecond: secondVehicle.speedMeterPerSecond,
		ownLaneRoute: secondVehicle.ownLaneRoute,
		laneBlendRatio: secondVehicle.laneBlendRatio,
	};

	const firstHeadingX = Math.cos(firstCopy.headingRadians);
	const firstHeadingY = Math.sin(firstCopy.headingRadians);
	const secondHeadingX = Math.cos(secondCopy.headingRadians);
	const secondHeadingY = Math.sin(secondCopy.headingRadians);

	firstCopy.worldXMeters += firstHeadingX * firstCopy.speedMeterPerSecond * deltaSeconds;
	firstCopy.worldYMeters += firstHeadingY * firstCopy.speedMeterPerSecond * deltaSeconds;
	secondCopy.worldXMeters += secondHeadingX * secondCopy.speedMeterPerSecond * deltaSeconds;
	secondCopy.worldYMeters += secondHeadingY * secondCopy.speedMeterPerSecond * deltaSeconds;

	return RoadsSimulation.collisionCheck.areVehiclesColliding(firstCopy, secondCopy);
};

RoadsSimulation.collisionCheck.getVehicleCorners = getVehicleCorners;
