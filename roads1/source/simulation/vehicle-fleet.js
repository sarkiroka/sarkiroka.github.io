window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleFleet = {};

RoadsSimulation.vehicleFleet.createInitialFleet = function createInitialFleet(mapDefinition, routePairs) {
	const vehicles = [];

	for (let vehicleIndex = 0; vehicleIndex < routePairs.length; vehicleIndex += 1) {
		const routePair = routePairs[vehicleIndex];
		const vehicle = RoadsSimulation.vehicleState.createVehicle({
			uniqueIdentifier: routePair.uniqueIdentifier,
			vehicleTypeIdentifier: routePair.vehicleTypeIdentifier,
			ownLaneRoute: routePair.ownLaneRoute,
			oppositeLaneRoute: routePair.oppositeLaneRoute,
			startDistanceMeters: routePair.startDistanceMeters,
		});

		vehicle.overtakeAllowed = routePair.overtakeAllowed === true;
		RoadsSimulation.roadConstraint.snapVehiclePosition(vehicle);
		vehicle.headingRadians = RoadsSimulation.vehicleBrain.getPathHeadingTarget(vehicle);
		vehicles.push(vehicle);
	}

	return vehicles;
};

RoadsSimulation.vehicleFleet.updateFleet = function updateFleet(vehicles, mapDefinition, deltaSeconds, simulationSpeedMultiplier) {
	const scaledDelta = deltaSeconds * simulationSpeedMultiplier;

	RoadsSimulation.simulationTick.runTick(vehicles, mapDefinition, scaledDelta);
	RoadsSimulation.positionRecorder.updateAfterStep(vehicles, scaledDelta);
};
