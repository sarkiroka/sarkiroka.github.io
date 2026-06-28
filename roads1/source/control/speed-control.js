window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.speedControl = {};

RoadsSimulation.speedControl.applySpeedChange = function applySpeedChange(vehicle, desiredSpeedMeterPerSecond, deltaSeconds) {
	const speedDifference = desiredSpeedMeterPerSecond - vehicle.speedMeterPerSecond;

	if (speedDifference > 0) {
		const speedIncrease = Math.min(
			speedDifference,
			vehicle.accelerationMeterPerSecondSquared * deltaSeconds
		);
		vehicle.speedMeterPerSecond += speedIncrease;
	} else if (speedDifference < 0) {
		const speedDecrease = Math.max(
			speedDifference,
			-vehicle.brakingMeterPerSecondSquared * deltaSeconds
		);
		vehicle.speedMeterPerSecond += speedDecrease;
	}

	if (vehicle.speedMeterPerSecond < 0) {
		vehicle.speedMeterPerSecond = 0;
	}
};

RoadsSimulation.speedControl.clampToEffectiveLimit = function clampToEffectiveLimit(vehicle, mapDefinition) {
	const maximumAllowed = RoadsSimulation.speedControl.getSpeedLimitMeterPerSecond(vehicle, mapDefinition);

	if (vehicle.speedMeterPerSecond > maximumAllowed) {
		vehicle.speedMeterPerSecond = maximumAllowed;
	}
};

RoadsSimulation.speedControl.getCapabilityMaxSpeedKilometerPerHour = function getCapabilityMaxSpeedKilometerPerHour(vehicle) {
	const vehicleType = RoadsSimulation.vehicleTypes[vehicle.vehicleTypeIdentifier];
	return vehicleType.maxSpeedKilometerPerHour;
};

RoadsSimulation.speedControl.getRoadSpeedLimitKilometerPerHour = function getRoadSpeedLimitKilometerPerHour(vehicle, mapDefinition) {
	return RoadsSimulation.routePath.getSpeedLimitOnPath(
		mapDefinition,
		vehicle.ownLaneRoute,
		vehicle.distanceMeters
	);
};

RoadsSimulation.speedControl.getEffectiveSpeedLimit = function getEffectiveSpeedLimit(vehicle, mapDefinition) {
	const capabilityMax = RoadsSimulation.speedControl.getCapabilityMaxSpeedKilometerPerHour(vehicle);
	const roadLimit = RoadsSimulation.speedControl.getRoadSpeedLimitKilometerPerHour(vehicle, mapDefinition);
	return Math.min(capabilityMax, roadLimit);
};

RoadsSimulation.speedControl.getSpeedLimitMeterPerSecond = function getSpeedLimitMeterPerSecond(vehicle, mapDefinition) {
	const speedLimitKilometerPerHour = RoadsSimulation.speedControl.getEffectiveSpeedLimit(vehicle, mapDefinition);
	return RoadsSimulation.turnGrip.kilometerPerHourToMeterPerSecond(speedLimitKilometerPerHour);
};
