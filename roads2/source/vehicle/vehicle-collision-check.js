window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleCollisionCheck = {};

RoadsSimulation.vehicleCollisionCheck.contactMarginMeters = 0.06;

function projectSamplePointsOntoAxis(samplePoints, axisUnitX, axisUnitY) {
	let minimumProjection = Infinity;
	let maximumProjection = -Infinity;

	for (let pointIndex = 0; pointIndex < samplePoints.length; pointIndex += 1) {
		const samplePoint = samplePoints[pointIndex];
		const projection = samplePoint.sampleXMeters * axisUnitX + samplePoint.sampleYMeters * axisUnitY;

		minimumProjection = Math.min(minimumProjection, projection);
		maximumProjection = Math.max(maximumProjection, projection);
	}

	return {
		minimumProjection: minimumProjection,
		maximumProjection: maximumProjection,
	};
}

function areProjectionsSeparated(firstProjection, secondProjection) {
	return firstProjection.maximumProjection < secondProjection.minimumProjection
		|| secondProjection.maximumProjection < firstProjection.minimumProjection;
}

function getVehicleAxes(vehicle) {
	const cosineHeading = Math.cos(vehicle.headingRadians);
	const sineHeading = Math.sin(vehicle.headingRadians);

	return [
		{ axisUnitX: cosineHeading, axisUnitY: sineHeading },
		{ axisUnitX: -sineHeading, axisUnitY: cosineHeading },
	];
}

function getExpandedSamplePoints(vehicle, expansionMeters) {
	const centerPosition = RoadsSimulation.vehicleState.getVehicleCenterPosition(vehicle);
	const vehicleDefinition = vehicle.vehicleDefinition;
	const halfLengthMeters = vehicleDefinition.lengthMeters / 2 + expansionMeters;
	const halfWidthMeters = vehicleDefinition.widthMeters / 2 + expansionMeters;
	const cosineHeading = Math.cos(vehicle.headingRadians);
	const sineHeading = Math.sin(vehicle.headingRadians);
	const forwardXMeters = cosineHeading * halfLengthMeters;
	const forwardYMeters = sineHeading * halfLengthMeters;
	const sidewaysXMeters = -sineHeading * halfWidthMeters;
	const sidewaysYMeters = cosineHeading * halfWidthMeters;
	const cornerOffsets = [
		{ offsetXMeters: forwardXMeters + sidewaysXMeters, offsetYMeters: forwardYMeters + sidewaysYMeters },
		{ offsetXMeters: forwardXMeters - sidewaysXMeters, offsetYMeters: forwardYMeters - sidewaysYMeters },
		{ offsetXMeters: -forwardXMeters - sidewaysXMeters, offsetYMeters: -forwardYMeters - sidewaysYMeters },
		{ offsetXMeters: -forwardXMeters + sidewaysXMeters, offsetYMeters: -forwardYMeters + sidewaysYMeters },
	];
	const samplePoints = [
		{
			sampleXMeters: centerPosition.centerXMeters,
			sampleYMeters: centerPosition.centerYMeters,
		},
	];

	for (let cornerIndex = 0; cornerIndex < cornerOffsets.length; cornerIndex += 1) {
		const cornerOffset = cornerOffsets[cornerIndex];
		const nextCornerOffset = cornerOffsets[(cornerIndex + 1) % cornerOffsets.length];

		samplePoints.push({
			sampleXMeters: centerPosition.centerXMeters + cornerOffset.offsetXMeters,
			sampleYMeters: centerPosition.centerYMeters + cornerOffset.offsetYMeters,
		});
		samplePoints.push({
			sampleXMeters: centerPosition.centerXMeters + (cornerOffset.offsetXMeters + nextCornerOffset.offsetXMeters) / 2,
			sampleYMeters: centerPosition.centerYMeters + (cornerOffset.offsetYMeters + nextCornerOffset.offsetYMeters) / 2,
		});
	}

	return samplePoints;
}

function areSamplePointSetsOverlapping(firstSamplePoints, secondSamplePoints, firstVehicle, secondVehicle) {
	const axisList = getVehicleAxes(firstVehicle).concat(getVehicleAxes(secondVehicle));

	for (let axisIndex = 0; axisIndex < axisList.length; axisIndex += 1) {
		const axis = axisList[axisIndex];
		const firstProjection = projectSamplePointsOntoAxis(
			firstSamplePoints,
			axis.axisUnitX,
			axis.axisUnitY
		);
		const secondProjection = projectSamplePointsOntoAxis(
			secondSamplePoints,
			axis.axisUnitX,
			axis.axisUnitY
		);

		if (areProjectionsSeparated(firstProjection, secondProjection)) {
			return false;
		}
	}

	return true;
}

RoadsSimulation.vehicleCollisionCheck.areVehiclesOverlapping = function areVehiclesOverlapping(firstVehicle, secondVehicle) {
	const firstSamplePoints = RoadsSimulation.vehicleState.getVehicleSamplePoints(firstVehicle);
	const secondSamplePoints = RoadsSimulation.vehicleState.getVehicleSamplePoints(secondVehicle);

	return areSamplePointSetsOverlapping(
		firstSamplePoints,
		secondSamplePoints,
		firstVehicle,
		secondVehicle
	);
};

RoadsSimulation.vehicleCollisionCheck.areVehiclesInContact = function areVehiclesInContact(firstVehicle, secondVehicle) {
	const expansionMeters = RoadsSimulation.vehicleCollisionCheck.contactMarginMeters;
	const firstSamplePoints = getExpandedSamplePoints(firstVehicle, expansionMeters);
	const secondSamplePoints = getExpandedSamplePoints(secondVehicle, expansionMeters);

	return areSamplePointSetsOverlapping(
		firstSamplePoints,
		secondSamplePoints,
		firstVehicle,
		secondVehicle
	);
};

RoadsSimulation.vehicleCollisionCheck.isVehicleOverlappingAnyOther = function isVehicleOverlappingAnyOther(vehicle, vehicleFleet) {
	for (let vehicleIndex = 0; vehicleIndex < vehicleFleet.length; vehicleIndex += 1) {
		const otherVehicle = vehicleFleet[vehicleIndex];

		if (otherVehicle === vehicle) {
			continue;
		}

		if (RoadsSimulation.vehicleCollisionCheck.areVehiclesOverlapping(vehicle, otherVehicle)) {
			return true;
		}
	}

	return false;
};

RoadsSimulation.vehicleCollisionCheck.isVehicleInContactWithAnyOther = function isVehicleInContactWithAnyOther(vehicle, vehicleFleet) {
	for (let vehicleIndex = 0; vehicleIndex < vehicleFleet.length; vehicleIndex += 1) {
		const otherVehicle = vehicleFleet[vehicleIndex];

		if (otherVehicle === vehicle) {
			continue;
		}

		if (RoadsSimulation.vehicleCollisionCheck.areVehiclesInContact(vehicle, otherVehicle)) {
			return true;
		}
	}

	return false;
};
