window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleUpdate = {};

function clampValue(value, minimumValue, maximumValue) {
	return Math.max(minimumValue, Math.min(maximumValue, value));
}

function applyDecelerationTowardZero(speedMetersPerSecond, decelerationMetersPerSecondSquared, deltaSeconds) {
	if (speedMetersPerSecond === 0) {
		return 0;
	}

	const speedSign = speedMetersPerSecond > 0 ? 1 : -1;
	const speedMagnitude = Math.abs(speedMetersPerSecond);
	const reducedSpeedMagnitude = speedMagnitude - decelerationMetersPerSecondSquared * deltaSeconds;

	if (reducedSpeedMagnitude <= 0) {
		return 0;
	}

	return speedSign * reducedSpeedMagnitude;
}

function updateFrontWheelSteerAngle(vehicle, inputState, deltaSeconds) {
	const vehicleConstants = RoadsSimulation.vehicleConstants;
	let steerAngleRadians = vehicle.frontWheelSteerAngleRadians;
	const steerScale = typeof inputState.steerScale === 'number' ? inputState.steerScale : 1;

	if (inputState.steerLeft && !inputState.steerRight) {
		steerAngleRadians -= vehicleConstants.frontWheelSteerChangeRateRadiansPerSecond * deltaSeconds * steerScale;
	} else if (inputState.steerRight && !inputState.steerLeft) {
		steerAngleRadians += vehicleConstants.frontWheelSteerChangeRateRadiansPerSecond * deltaSeconds * steerScale;
	} else {
		const returnStepRadians = vehicleConstants.frontWheelSteerReturnRateRadiansPerSecond * deltaSeconds;

		if (Math.abs(steerAngleRadians) <= returnStepRadians) {
			steerAngleRadians = 0;
		} else if (steerAngleRadians > 0) {
			steerAngleRadians -= returnStepRadians;
		} else {
			steerAngleRadians += returnStepRadians;
		}
	}

	vehicle.frontWheelSteerAngleRadians = clampValue(
		steerAngleRadians,
		-vehicleConstants.maximumFrontWheelSteerAngleRadians,
		vehicleConstants.maximumFrontWheelSteerAngleRadians
	);
}

function updateVehicleSpeed(vehicle, inputState, deltaSeconds) {
	const vehicleDefinition = vehicle.vehicleDefinition;
	const vehicleConstants = RoadsSimulation.vehicleConstants;
	let speedMetersPerSecond = vehicle.speedMetersPerSecond;
	let reverseLightActive = false;
	const isAcceleratingForward = inputState.accelerateForward;
	const isAcceleratingReverse = inputState.accelerateReverse;
	const throttleScale = typeof inputState.throttleScale === 'number' ? inputState.throttleScale : 1;

	if (inputState.brakeActive) {
		speedMetersPerSecond = applyDecelerationTowardZero(
			speedMetersPerSecond,
			vehicleDefinition.activeBrakeDecelerationMetersPerSecondSquared * throttleScale,
			deltaSeconds
		);
	} else if (isAcceleratingForward) {
		if (speedMetersPerSecond < 0) {
			speedMetersPerSecond = applyDecelerationTowardZero(
				speedMetersPerSecond,
				vehicleDefinition.activeBrakeDecelerationMetersPerSecondSquared * throttleScale,
				deltaSeconds
			);
		} else {
			speedMetersPerSecond += vehicleDefinition.accelerationMetersPerSecondSquared * deltaSeconds * throttleScale;
		}
	} else if (isAcceleratingReverse) {
		if (speedMetersPerSecond > 0) {
			speedMetersPerSecond = applyDecelerationTowardZero(
				speedMetersPerSecond,
				vehicleDefinition.activeBrakeDecelerationMetersPerSecondSquared * throttleScale,
				deltaSeconds
			);
		} else {
			speedMetersPerSecond -= vehicleDefinition.accelerationMetersPerSecondSquared * deltaSeconds * throttleScale;
		}
		reverseLightActive = true;
	} else {
		speedMetersPerSecond = applyDecelerationTowardZero(
			speedMetersPerSecond,
			vehicleDefinition.coastDecelerationMetersPerSecondSquared,
			deltaSeconds
		);
	}

	if (!isAcceleratingForward && !isAcceleratingReverse) {
		if (Math.abs(speedMetersPerSecond) < vehicleConstants.minimumSpeedBeforeStopMetersPerSecond) {
			speedMetersPerSecond = 0;
		}
	}

	if (speedMetersPerSecond < -vehicleConstants.minimumSpeedBeforeStopMetersPerSecond) {
		reverseLightActive = true;
	}

	speedMetersPerSecond = clampValue(
		speedMetersPerSecond,
		-vehicleDefinition.maximumReverseSpeedMetersPerSecond,
		vehicleDefinition.maximumSpeedMetersPerSecond
	);

	vehicle.speedMetersPerSecond = speedMetersPerSecond;
	vehicle.brakeLightActive = inputState.brakeActive;
	vehicle.reverseLightActive = reverseLightActive;
}

function advanceVehiclePosition(vehicle, deltaSeconds) {
	const wheelbaseMeters = vehicle.vehicleDefinition.wheelbaseMeters;
	const speedMetersPerSecond = vehicle.speedMetersPerSecond;
	const steerAngleRadians = vehicle.frontWheelSteerAngleRadians;

	if (Math.abs(speedMetersPerSecond) < RoadsSimulation.vehicleConstants.minimumSpeedBeforeMovementMetersPerSecond) {
		return;
	}

	const yawRateRadiansPerSecond = speedMetersPerSecond * Math.tan(steerAngleRadians) / wheelbaseMeters;
	const previousRearAxleXMeters = vehicle.rearAxleXMeters;
	const previousRearAxleYMeters = vehicle.rearAxleYMeters;

	vehicle.headingRadians += yawRateRadiansPerSecond * deltaSeconds;
	vehicle.rearAxleXMeters += Math.cos(vehicle.headingRadians) * speedMetersPerSecond * deltaSeconds;
	vehicle.rearAxleYMeters += Math.sin(vehicle.headingRadians) * speedMetersPerSecond * deltaSeconds;

	vehicle.traveledDistanceMeters += Math.sqrt(
		(vehicle.rearAxleXMeters - previousRearAxleXMeters) * (vehicle.rearAxleXMeters - previousRearAxleXMeters)
		+ (vehicle.rearAxleYMeters - previousRearAxleYMeters) * (vehicle.rearAxleYMeters - previousRearAxleYMeters)
	);
}

function isPointInsideMapBounds(pointXMeters, pointYMeters, mapBounds) {
	return pointXMeters >= mapBounds.minXMeters
		&& pointXMeters <= mapBounds.maxXMeters
		&& pointYMeters >= mapBounds.minYMeters
		&& pointYMeters <= mapBounds.maxYMeters;
}

function areAllCornersInsideMapBounds(vehicle, mapBounds) {
	const cornerPositions = RoadsSimulation.vehicleState.getVehicleCornerPositions(vehicle);

	for (let cornerIndex = 0; cornerIndex < cornerPositions.length; cornerIndex += 1) {
		const cornerPosition = cornerPositions[cornerIndex];

		if (!isPointInsideMapBounds(cornerPosition.cornerXMeters, cornerPosition.cornerYMeters, mapBounds)) {
			return false;
		}
	}

	return true;
}

function isVehicleOverlappingNonPopulationMember(vehicle, vehicleFleet) {
	for (let vehicleIndex = 0; vehicleIndex < vehicleFleet.length; vehicleIndex += 1) {
		const otherVehicle = vehicleFleet[vehicleIndex];

		if (otherVehicle === vehicle) {
			continue;
		}

		if (otherVehicle.populationMember === true) {
			continue;
		}

		if (RoadsSimulation.vehicleCollisionCheck.areVehiclesOverlapping(vehicle, otherVehicle)) {
			return true;
		}
	}

	return false;
}

function isVehicleOffRoadOrHazard(vehicle, mapDefinition, mapBounds, vehicleFleet) {
	const leftMapBounds = !areAllCornersInsideMapBounds(vehicle, mapBounds);
	const offRoad = !RoadsSimulation.vehicleState.isVehicleFullyOnRoad(vehicle, mapDefinition);
	const touchingConstructionHazard = RoadsSimulation.constructionGeometry.isVehicleTouchingConstructionHazard(
		vehicle,
		mapDefinition
	);
	const overlappingNonPopulationVehicle = isVehicleOverlappingNonPopulationMember(vehicle, vehicleFleet);

	return leftMapBounds || offRoad || touchingConstructionHazard || overlappingNonPopulationVehicle;
}

RoadsSimulation.vehicleUpdate.updateVehicleVisualState = function updateVehicleVisualState(vehicle, mapDefinition, vehicleFleet) {
	const fullyOnRoad = RoadsSimulation.vehicleState.isVehicleFullyOnRoad(vehicle, mapDefinition);
	const constructionContactActive = RoadsSimulation.constructionGeometry.isVehicleConstructionContactActive(
		vehicle,
		mapDefinition
	);
	const touchingOtherVehicle = RoadsSimulation.vehicleCollisionCheck.isVehicleInContactWithAnyNonPopulationMember(
		vehicle,
		vehicleFleet
	);

	vehicle.isOnRoad = fullyOnRoad && !touchingOtherVehicle && !constructionContactActive;
};

RoadsSimulation.vehicleUpdate.queryVehicleTick = function queryVehicleTick(vehicle, inputState, mapDefinition, mapBounds, deltaSeconds, vehicleFleet) {
	const savedRearAxleXMeters = vehicle.rearAxleXMeters;
	const savedRearAxleYMeters = vehicle.rearAxleYMeters;
	const savedHeadingRadians = vehicle.headingRadians;
	const savedTraveledDistanceMeters = vehicle.traveledDistanceMeters;

	updateFrontWheelSteerAngle(vehicle, inputState, deltaSeconds);
	updateVehicleSpeed(vehicle, inputState, deltaSeconds);
	advanceVehiclePosition(vehicle, deltaSeconds);

	const leftMapBounds = !areAllCornersInsideMapBounds(vehicle, mapBounds);
	const overlappingOtherVehicle = RoadsSimulation.vehicleCollisionCheck.isVehicleOverlappingAnyOther(
		vehicle,
		vehicleFleet
	);
	const touchingConstructionHazard = RoadsSimulation.constructionGeometry.isVehicleTouchingConstructionHazard(
		vehicle,
		mapDefinition
	);
	const constructionContactBeforeRevert = RoadsSimulation.constructionGeometry.isVehicleConstructionContactActive(
		vehicle,
		mapDefinition
	);

	if (leftMapBounds || overlappingOtherVehicle || touchingConstructionHazard) {
		vehicle.rearAxleXMeters = savedRearAxleXMeters;
		vehicle.rearAxleYMeters = savedRearAxleYMeters;
		vehicle.headingRadians = savedHeadingRadians;
		vehicle.traveledDistanceMeters = savedTraveledDistanceMeters;
		vehicle.speedMetersPerSecond = 0;
	}

	vehicle.constructionContactActive = constructionContactBeforeRevert
		|| RoadsSimulation.constructionGeometry.isVehicleConstructionContactActive(vehicle, mapDefinition);

	RoadsSimulation.vehicleUpdate.updateVehicleVisualState(vehicle, mapDefinition, vehicleFleet);

	if (vehicle.constructionContactActive) {
		vehicle.isOnRoad = false;
	}

	return vehicle;
};

RoadsSimulation.vehicleUpdate.queryNeuralVehicleTick = function queryNeuralVehicleTick(
	vehicle,
	inputState,
	mapDefinition,
	mapBounds,
	deltaSeconds,
	vehicleFleet
) {
	updateFrontWheelSteerAngle(vehicle, inputState, deltaSeconds);
	updateVehicleSpeed(vehicle, inputState, deltaSeconds);
	advanceVehiclePosition(vehicle, deltaSeconds);

	const constructionContactActive = RoadsSimulation.constructionGeometry.isVehicleConstructionContactActive(
		vehicle,
		mapDefinition
	);

	vehicle.constructionContactActive = constructionContactActive;
	RoadsSimulation.vehicleUpdate.updateVehicleVisualState(vehicle, mapDefinition, vehicleFleet);

	if (vehicle.constructionContactActive) {
		vehicle.isOnRoad = false;
	}

	const isEliminated = isVehicleOffRoadOrHazard(vehicle, mapDefinition, mapBounds, vehicleFleet);

	if (isEliminated) {
		vehicle.speedMetersPerSecond = 0;
	}

	return {
		isEliminated: isEliminated,
	};
};

RoadsSimulation.vehicleUpdate.queryStaticVehicleTick = function queryStaticVehicleTick(vehicle, mapDefinition, vehicleFleet) {
	vehicle.constructionContactActive = RoadsSimulation.constructionGeometry.isVehicleConstructionContactActive(
		vehicle,
		mapDefinition
	);
	RoadsSimulation.vehicleUpdate.updateVehicleVisualState(vehicle, mapDefinition, vehicleFleet);

	if (vehicle.constructionContactActive) {
		vehicle.isOnRoad = false;
	}

	return vehicle;
};
