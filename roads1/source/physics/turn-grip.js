window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.turnGrip = {};

function kilometerPerHourToMeterPerSecond(speedKilometerPerHour) {
	return speedKilometerPerHour * 1000 / 3600;
}

function meterPerSecondToKilometerPerHour(speedMeterPerSecond) {
	return speedMeterPerSecond * 3600 / 1000;
}

RoadsSimulation.turnGrip.getMaximumCornerSpeedKilometerPerHour = function getMaximumCornerSpeedKilometerPerHour() {
	const gripAcceleration = RoadsSimulation.physicsConstants.gripLateralAccelerationMeterPerSecondSquared;
	const turnRadius = RoadsSimulation.physicsConstants.cornerTurnRadiusMeters;
	const maxSpeedMeterPerSecond = Math.sqrt(gripAcceleration * turnRadius);
	return meterPerSecondToKilometerPerHour(maxSpeedMeterPerSecond);
};

RoadsSimulation.turnGrip.getRequiredSpeedAtDistance = function getRequiredSpeedAtDistance(routeCenterline, distanceMeters) {
	if (RoadsSimulation.routePath.isDistanceInsideCornerZone(routeCenterline, distanceMeters)) {
		return RoadsSimulation.turnGrip.getMaximumCornerSpeedKilometerPerHour();
	}

	return null;
};

RoadsSimulation.turnGrip.getTargetSpeedBeforeCorner = function getTargetSpeedBeforeCorner(
	routeCenterline,
	distanceMeters,
	currentSpeedKilometerPerHour,
	roadSpeedLimitKilometerPerHour
) {
	const cornerSpeedLimit = RoadsSimulation.turnGrip.getMaximumCornerSpeedKilometerPerHour();
	const brakeDistanceMeters = RoadsSimulation.physicsConstants.cornerBrakeDistanceMeters;

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

RoadsSimulation.turnGrip.isSkidding = function isSkidding(routeCenterline, distanceMeters, speedKilometerPerHour) {
	if (!RoadsSimulation.routePath.isDistanceInsideCornerZone(routeCenterline, distanceMeters)) {
		return false;
	}

	const cornerSpeedLimit = RoadsSimulation.turnGrip.getMaximumCornerSpeedKilometerPerHour();
	return speedKilometerPerHour > cornerSpeedLimit * 1.05;
};

RoadsSimulation.turnGrip.kilometerPerHourToMeterPerSecond = kilometerPerHourToMeterPerSecond;
RoadsSimulation.turnGrip.meterPerSecondToKilometerPerHour = meterPerSecondToKilometerPerHour;
