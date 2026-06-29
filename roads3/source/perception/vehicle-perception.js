window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehiclePerception = {};

function clampValue(value, minimumValue, maximumValue) {
	return Math.max(minimumValue, Math.min(maximumValue, value));
}

function createEmptyNeuralInput() {
	return {
		A: -1,
		B: 0,
		C: -1,
		D1: -1,
		D2: -1,
		E1: 0,
		E2: 0,
		F: 0,
		G: 0,
	};
}

function computeSpeedInputScale(vehicle) {
	const vehicleDefinition = vehicle.vehicleDefinition;
	const speedMetersPerSecond = vehicle.speedMetersPerSecond;

	if (Math.abs(speedMetersPerSecond) < RoadsSimulation.vehicleConstants.minimumSpeedBeforeStopMetersPerSecond) {
		return 0;
	}

	if (speedMetersPerSecond > 0) {
		return clampValue(
			speedMetersPerSecond / vehicleDefinition.maximumSpeedMetersPerSecond,
			0,
			1
		);
	}

	return clampValue(
		speedMetersPerSecond / vehicleDefinition.maximumReverseSpeedMetersPerSecond,
		-1,
		0
	);
}

function computeSteeringInputScale(vehicle) {
	const maximumSteerAngleRadians = RoadsSimulation.vehicleConstants.maximumFrontWheelSteerAngleRadians;

	return clampValue(
		vehicle.frontWheelSteerAngleRadians / maximumSteerAngleRadians,
		-1,
		1
	);
}

function getConstructionObstaclePointGroups(mapDefinition) {
	const constructionZone = RoadsSimulation.constructionGeometry.getConstructionZone(mapDefinition);

	if (!constructionZone) {
		return [];
	}

	const southBarrier = RoadsSimulation.constructionGeometry.getSouthBarrierRectangle(constructionZone);
	const northBarrier = RoadsSimulation.constructionGeometry.getNorthBarrierRectangle(constructionZone);
	const potholeCorners = RoadsSimulation.constructionGeometry.getPotholeCornerPositions(constructionZone);

	return [
		{
			pointXMeters: southBarrier.minXMeters,
			pointYMeters: southBarrier.minYMeters,
		},
		{
			pointXMeters: southBarrier.maxXMeters,
			pointYMeters: southBarrier.minYMeters,
		},
		{
			pointXMeters: southBarrier.maxXMeters,
			pointYMeters: southBarrier.maxYMeters,
		},
		{
			pointXMeters: southBarrier.minXMeters,
			pointYMeters: southBarrier.maxYMeters,
		},
		{
			pointXMeters: northBarrier.minXMeters,
			pointYMeters: northBarrier.minYMeters,
		},
		{
			pointXMeters: northBarrier.maxXMeters,
			pointYMeters: northBarrier.minYMeters,
		},
		{
			pointXMeters: northBarrier.maxXMeters,
			pointYMeters: northBarrier.maxYMeters,
		},
		{
			pointXMeters: northBarrier.minXMeters,
			pointYMeters: northBarrier.maxYMeters,
		},
	].concat(potholeCorners.map(function mapPotholeCorner(potholeCorner) {
		return {
			pointXMeters: potholeCorner.cornerXMeters,
			pointYMeters: potholeCorner.cornerYMeters,
		};
	}));
}

function getVehicleObstaclePointGroups(observerVehicle, vehicleFleet) {
	const obstaclePointGroups = [];

	for (let vehicleIndex = 0; vehicleIndex < vehicleFleet.length; vehicleIndex += 1) {
		const otherVehicle = vehicleFleet[vehicleIndex];

		if (otherVehicle === observerVehicle) {
			continue;
		}

		const cornerPositions = RoadsSimulation.vehicleState.getVehicleCornerPositions(otherVehicle);

		if (otherVehicle.populationMember === true) {
			continue;
		}

		obstaclePointGroups.push(cornerPositions.map(function mapCorner(cornerPosition) {
			return {
				pointXMeters: cornerPosition.cornerXMeters,
				pointYMeters: cornerPosition.cornerYMeters,
			};
		}));
	}

	return obstaclePointGroups;
}

function collectObstacleCandidates(observerVehicle, vehicleFleet, mapDefinition) {
	const obstacleCandidates = [];
	const vehicleObstacleGroups = getVehicleObstaclePointGroups(observerVehicle, vehicleFleet);
	const constructionPoints = getConstructionObstaclePointGroups(mapDefinition);

	for (let groupIndex = 0; groupIndex < vehicleObstacleGroups.length; groupIndex += 1) {
		obstacleCandidates.push(vehicleObstacleGroups[groupIndex]);
	}

	if (constructionPoints.length > 0) {
		obstacleCandidates.push(constructionPoints);
	}

	return obstacleCandidates;
}

function findNearestForwardObstacle(observerVehicle, obstacleCandidates) {
	const centerPosition = RoadsSimulation.vehicleState.getVehicleCenterPosition(observerVehicle);
	const forwardUnit = RoadsSimulation.roadCrossSection.getForwardUnit(observerVehicle.headingRadians);
	const lateralUnitX = -forwardUnit.forwardUnitY;
	const lateralUnitY = forwardUnit.forwardUnitX;
	const maximumRangeMeters = RoadsSimulation.perceptionConstants.maximumObstaclePerceptionRangeMeters;
	const maximumHalfAngleRadians = RoadsSimulation.perceptionConstants.maximumObstaclePerceptionHalfAngleRadians;
	const maximumLateralDistanceMeters = RoadsSimulation.perceptionConstants.maximumObstacleLateralDistanceMeters;
	let nearestObstaclePoints = null;
	let nearestForwardDistanceMeters = Infinity;

	for (let candidateIndex = 0; candidateIndex < obstacleCandidates.length; candidateIndex += 1) {
		const obstaclePoints = obstacleCandidates[candidateIndex];
		let nearestAheadForwardProjection = Infinity;
		let hasCornerInsidePerceptionCone = false;

		for (let pointIndex = 0; pointIndex < obstaclePoints.length; pointIndex += 1) {
			const obstaclePoint = obstaclePoints[pointIndex];
			const offsetXMeters = obstaclePoint.pointXMeters - centerPosition.centerXMeters;
			const offsetYMeters = obstaclePoint.pointYMeters - centerPosition.centerYMeters;
			const forwardProjection = offsetXMeters * forwardUnit.forwardUnitX
				+ offsetYMeters * forwardUnit.forwardUnitY;
			const lateralProjection = offsetXMeters * lateralUnitX + offsetYMeters * lateralUnitY;

			if (forwardProjection <= 0) {
				continue;
			}

			const halfAngleRadians = Math.atan2(Math.abs(lateralProjection), forwardProjection);

			if (halfAngleRadians > maximumHalfAngleRadians) {
				continue;
			}

			if (Math.abs(lateralProjection) > maximumLateralDistanceMeters) {
				continue;
			}

			hasCornerInsidePerceptionCone = true;

			if (forwardProjection < nearestAheadForwardProjection) {
				nearestAheadForwardProjection = forwardProjection;
			}
		}

		if (!hasCornerInsidePerceptionCone || !Number.isFinite(nearestAheadForwardProjection)) {
			continue;
		}

		if (nearestAheadForwardProjection > maximumRangeMeters) {
			continue;
		}

		if (nearestAheadForwardProjection < nearestForwardDistanceMeters) {
			nearestForwardDistanceMeters = nearestAheadForwardProjection;
			nearestObstaclePoints = obstaclePoints;
		}
	}

	return {
		nearestObstaclePoints: nearestObstaclePoints,
		nearestForwardDistanceMeters: nearestForwardDistanceMeters,
	};
}

function computeObstacleInputScales(observerVehicle, mapDefinition, nearestObstaclePoints, nearestForwardDistanceMeters) {
	if (!nearestObstaclePoints || !Number.isFinite(nearestForwardDistanceMeters)) {
		return {
			C: -1,
			D1: -1,
			D2: -1,
		};
	}

	const maximumRangeMeters = RoadsSimulation.perceptionConstants.maximumObstaclePerceptionRangeMeters;
	const distanceRatio = clampValue(nearestForwardDistanceMeters / maximumRangeMeters, 0, 1);
	const obstacleDistanceScale = clampValue(1 - 2 * distanceRatio, -1, 1);
	const roadScaleRange = RoadsSimulation.roadCrossSection.worldPointsToRoadScaleRange(
		mapDefinition,
		nearestObstaclePoints,
		observerVehicle.headingRadians
	);

	return {
		C: obstacleDistanceScale,
		D1: roadScaleRange.innerRoadScale,
		D2: roadScaleRange.outerRoadScale,
	};
}

function simulatePreviewCenterPosition(vehicle, targetDistanceMeters) {
	const wheelbaseMeters = vehicle.vehicleDefinition.wheelbaseMeters;
	const stepMeters = RoadsSimulation.perceptionConstants.previewSimulationStepMeters;
	let remainingDistanceMeters = targetDistanceMeters;
	let previewRearAxleXMeters = vehicle.rearAxleXMeters;
	let previewRearAxleYMeters = vehicle.rearAxleYMeters;
	let previewHeadingRadians = vehicle.headingRadians;
	let previewSpeedMetersPerSecond = vehicle.speedMetersPerSecond;
	let previewSteerAngleRadians = vehicle.frontWheelSteerAngleRadians;
	const centerOffsetFromRearAxleMeters = vehicle.vehicleDefinition.wheelbaseMeters / 2
		+ (vehicle.vehicleDefinition.frontOverhangMeters - vehicle.vehicleDefinition.rearOverhangMeters) / 2;
	let loopGuard = 0;
	const maximumLoopCount = Math.ceil(targetDistanceMeters / stepMeters) * 4 + 20;

	while (remainingDistanceMeters > 0 && loopGuard < maximumLoopCount) {
		loopGuard += 1;
		const deltaSeconds = stepMeters / Math.max(Math.abs(previewSpeedMetersPerSecond), 0.5);
		const yawRateRadiansPerSecond = previewSpeedMetersPerSecond * Math.tan(previewSteerAngleRadians) / wheelbaseMeters;

		previewHeadingRadians += yawRateRadiansPerSecond * deltaSeconds;
		previewRearAxleXMeters += Math.cos(previewHeadingRadians) * previewSpeedMetersPerSecond * deltaSeconds;
		previewRearAxleYMeters += Math.sin(previewHeadingRadians) * previewSpeedMetersPerSecond * deltaSeconds;
		remainingDistanceMeters -= stepMeters;
	}

	return {
		centerXMeters: previewRearAxleXMeters + Math.cos(previewHeadingRadians) * centerOffsetFromRearAxleMeters,
		centerYMeters: previewRearAxleYMeters + Math.sin(previewHeadingRadians) * centerOffsetFromRearAxleMeters,
		headingRadians: previewHeadingRadians,
	};
}

function computeForwardPreviewScale(vehicle, mapDefinition, previewDistanceMeters) {
	const previewCenterPosition = simulatePreviewCenterPosition(vehicle, previewDistanceMeters);

	return RoadsSimulation.roadCrossSection.getRoadPositionScale(
		mapDefinition,
		previewCenterPosition.centerXMeters,
		previewCenterPosition.centerYMeters,
		previewCenterPosition.headingRadians
	);
}

RoadsSimulation.vehiclePerception.computeNeuralInput = function computeNeuralInput(
	observerVehicle,
	vehicleFleet,
	mapDefinition
) {
	const centerPosition = RoadsSimulation.vehicleState.getVehicleCenterPosition(observerVehicle);
	const obstacleCandidates = collectObstacleCandidates(observerVehicle, vehicleFleet, mapDefinition);
	const nearestObstacle = findNearestForwardObstacle(observerVehicle, obstacleCandidates);
	const obstacleInputScales = computeObstacleInputScales(
		observerVehicle,
		mapDefinition,
		nearestObstacle.nearestObstaclePoints,
		nearestObstacle.nearestForwardDistanceMeters
	);

	return {
		A: computeSpeedInputScale(observerVehicle),
		B: RoadsSimulation.roadCrossSection.getRoadPositionScale(
			mapDefinition,
			centerPosition.centerXMeters,
			centerPosition.centerYMeters,
			observerVehicle.headingRadians
		),
		C: obstacleInputScales.C,
		D1: obstacleInputScales.D1,
		D2: obstacleInputScales.D2,
		E1: computeForwardPreviewScale(
			observerVehicle,
			mapDefinition,
			RoadsSimulation.perceptionConstants.forwardPreviewDistanceShortMeters
		),
		E2: computeForwardPreviewScale(
			observerVehicle,
			mapDefinition,
			RoadsSimulation.perceptionConstants.forwardPreviewDistanceLongMeters
		),
		F: computeSteeringInputScale(observerVehicle),
		G: RoadsSimulation.roadCrossSection.getLaneParallelismScale(
			mapDefinition,
			centerPosition.centerXMeters,
			centerPosition.centerYMeters,
			observerVehicle.headingRadians
		),
	};
};

RoadsSimulation.vehiclePerception.createEmptyNeuralInput = createEmptyNeuralInput;
