window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleState = {};

function createBottomRoadSpawnPlacement(mapDefinition, vehicleDefinition) {
	const buildingBlock = mapDefinition.buildingBlocks[0];
	const headingRadians = 0;
	const rearAxlePosition = RoadsSimulation.mapGeometry.getRightLaneRearAxlePosition(
		mapDefinition,
		buildingBlock,
		headingRadians,
		vehicleDefinition,
		-10
	);

	return {
		rearAxleXMeters: rearAxlePosition.rearAxleXMeters,
		rearAxleYMeters: rearAxlePosition.rearAxleYMeters,
		headingRadians: headingRadians,
	};
}

function createTopRoadSpawnPlacement(mapDefinition, vehicleDefinition) {
	const buildingBlock = mapDefinition.buildingBlocks[0];
	const headingRadians = Math.PI;
	const rearAxlePosition = RoadsSimulation.mapGeometry.getRightLaneRearAxlePosition(
		mapDefinition,
		buildingBlock,
		headingRadians,
		vehicleDefinition,
		-10
	);

	return {
		rearAxleXMeters: rearAxlePosition.rearAxleXMeters,
		rearAxleYMeters: rearAxlePosition.rearAxleYMeters,
		headingRadians: headingRadians,
	};
}

RoadsSimulation.vehicleState.createInitialVehicle = function createInitialVehicle(mapDefinition, vehicleDefinition, spawnPlacement) {
	return {
		vehicleDefinition: vehicleDefinition,
		rearAxleXMeters: spawnPlacement.rearAxleXMeters,
		rearAxleYMeters: spawnPlacement.rearAxleYMeters,
		headingRadians: spawnPlacement.headingRadians,
		speedMetersPerSecond: 0,
		frontWheelSteerAngleRadians: 0,
		brakeLightActive: false,
		reverseLightActive: false,
		isOnRoad: true,
		traveledDistanceMeters: 0,
	};
};

RoadsSimulation.vehicleState.createPlayerVehicle = function createPlayerVehicle(mapDefinition, vehicleDefinition) {
	const spawnPlacement = createBottomRoadSpawnPlacement(mapDefinition, vehicleDefinition);
	return RoadsSimulation.vehicleState.createInitialVehicle(mapDefinition, vehicleDefinition, spawnPlacement);
};

RoadsSimulation.vehicleState.createCompanionVehicle = function createCompanionVehicle(mapDefinition, vehicleDefinition) {
	const spawnPlacement = createTopRoadSpawnPlacement(mapDefinition, vehicleDefinition);
	return RoadsSimulation.vehicleState.createInitialVehicle(mapDefinition, vehicleDefinition, spawnPlacement);
};

RoadsSimulation.vehicleState.getVehicleCenterPosition = function getVehicleCenterPosition(vehicle) {
	const vehicleDefinition = vehicle.vehicleDefinition;
	const centerOffsetFromRearAxleMeters = vehicleDefinition.wheelbaseMeters / 2
		+ (vehicleDefinition.frontOverhangMeters - vehicleDefinition.rearOverhangMeters) / 2;

	return {
		centerXMeters: vehicle.rearAxleXMeters + Math.cos(vehicle.headingRadians) * centerOffsetFromRearAxleMeters,
		centerYMeters: vehicle.rearAxleYMeters + Math.sin(vehicle.headingRadians) * centerOffsetFromRearAxleMeters,
	};
};

RoadsSimulation.vehicleState.getFrontAxlePosition = function getFrontAxlePosition(vehicle) {
	const wheelbaseMeters = vehicle.vehicleDefinition.wheelbaseMeters;

	return {
		frontAxleXMeters: vehicle.rearAxleXMeters + Math.cos(vehicle.headingRadians) * wheelbaseMeters,
		frontAxleYMeters: vehicle.rearAxleYMeters + Math.sin(vehicle.headingRadians) * wheelbaseMeters,
	};
};

RoadsSimulation.vehicleState.getVehicleCornerPositions = function getVehicleCornerPositions(vehicle) {
	const vehicleDefinition = vehicle.vehicleDefinition;
	const centerPosition = RoadsSimulation.vehicleState.getVehicleCenterPosition(vehicle);
	const halfLengthMeters = vehicleDefinition.lengthMeters / 2;
	const halfWidthMeters = vehicleDefinition.widthMeters / 2;
	const cosineHeading = Math.cos(vehicle.headingRadians);
	const sineHeading = Math.sin(vehicle.headingRadians);
	const forwardXMeters = cosineHeading * halfLengthMeters;
	const forwardYMeters = sineHeading * halfLengthMeters;
	const sidewaysXMeters = -sineHeading * halfWidthMeters;
	const sidewaysYMeters = cosineHeading * halfWidthMeters;

	return [
		{
			cornerXMeters: centerPosition.centerXMeters + forwardXMeters + sidewaysXMeters,
			cornerYMeters: centerPosition.centerYMeters + forwardYMeters + sidewaysYMeters,
		},
		{
			cornerXMeters: centerPosition.centerXMeters + forwardXMeters - sidewaysXMeters,
			cornerYMeters: centerPosition.centerYMeters + forwardYMeters - sidewaysYMeters,
		},
		{
			cornerXMeters: centerPosition.centerXMeters - forwardXMeters - sidewaysXMeters,
			cornerYMeters: centerPosition.centerYMeters - forwardYMeters - sidewaysYMeters,
		},
		{
			cornerXMeters: centerPosition.centerXMeters - forwardXMeters + sidewaysXMeters,
			cornerYMeters: centerPosition.centerYMeters - forwardYMeters + sidewaysYMeters,
		},
	];
};

RoadsSimulation.vehicleState.getVehicleSamplePoints = function getVehicleSamplePoints(vehicle) {
	const cornerPositions = RoadsSimulation.vehicleState.getVehicleCornerPositions(vehicle);
	const centerPosition = RoadsSimulation.vehicleState.getVehicleCenterPosition(vehicle);
	const samplePoints = [
		{
			sampleXMeters: centerPosition.centerXMeters,
			sampleYMeters: centerPosition.centerYMeters,
		},
	];

	for (let cornerIndex = 0; cornerIndex < cornerPositions.length; cornerIndex += 1) {
		const cornerPosition = cornerPositions[cornerIndex];
		const nextCornerPosition = cornerPositions[(cornerIndex + 1) % cornerPositions.length];

		samplePoints.push({
			sampleXMeters: cornerPosition.cornerXMeters,
			sampleYMeters: cornerPosition.cornerYMeters,
		});
		samplePoints.push({
			sampleXMeters: (cornerPosition.cornerXMeters + nextCornerPosition.cornerXMeters) / 2,
			sampleYMeters: (cornerPosition.cornerYMeters + nextCornerPosition.cornerYMeters) / 2,
		});
	}

	return samplePoints;
};

RoadsSimulation.vehicleState.isVehicleFullyOnRoad = function isVehicleFullyOnRoad(vehicle, mapDefinition) {
	const samplePoints = RoadsSimulation.vehicleState.getVehicleSamplePoints(vehicle);

	for (let pointIndex = 0; pointIndex < samplePoints.length; pointIndex += 1) {
		const samplePoint = samplePoints[pointIndex];
		const terrainKind = RoadsSimulation.mapGeometry.classifyPoint(
			mapDefinition,
			samplePoint.sampleXMeters,
			samplePoint.sampleYMeters
		);

		if (terrainKind !== 'road') {
			return false;
		}
	}

	return true;
};
