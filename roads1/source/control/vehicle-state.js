window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleState = {};

RoadsSimulation.vehicleState.createVehicle = function createVehicle(config) {
	const vehicleType = RoadsSimulation.vehicleTypes[config.vehicleTypeIdentifier];

	if (!vehicleType) {
		throw new Error('Ismeretlen járműtípus: ' + config.vehicleTypeIdentifier);
	}

	const vehicle = {
		uniqueIdentifier: config.uniqueIdentifier,
		vehicleTypeIdentifier: config.vehicleTypeIdentifier,
		ownLaneRoute: config.ownLaneRoute,
		oppositeLaneRoute: config.oppositeLaneRoute,
		distanceMeters: config.startDistanceMeters,
		speedMeterPerSecond: 0,
		desiredSpeedMeterPerSecond: 0,
		accelerationMeterPerSecondSquared: vehicleType.accelerationMeterPerSecondSquared,
		brakingMeterPerSecondSquared: vehicleType.brakingMeterPerSecondSquared,
		maxTurnRateRadiansPerSecond: vehicleType.maxTurnRateRadiansPerSecond,
		laneBlendRatio: 0,
		targetLaneBlendRatio: 0,
		wideLineOutwardRatio: 0,
		targetWideLineOutwardRatio: 0,
		drivingMode: 'normal',
		overtakeTargetIdentifier: null,
		currentRequest: null,
		intentLabel: 'Indulás',
		worldXMeters: 0,
		worldYMeters: 0,
		headingRadians: 0,
	};

	RoadsSimulation.roadConstraint.snapVehiclePosition(vehicle);
	vehicle.headingRadians = RoadsSimulation.vehicleBrain.getPathHeadingTarget(vehicle);
	return vehicle;
};
