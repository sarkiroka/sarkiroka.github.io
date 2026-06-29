window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.perceptionVisualHelper = {};

const perceptionMarkerDotRadiusPixels = 5;
const laneParallelLineLengthMeters = 4;

function clampValue(value, minimumValue, maximumValue) {
	return Math.max(minimumValue, Math.min(maximumValue, value));
}

function getFrontCornerPositions(vehicle) {
	const cornerPositions = RoadsSimulation.vehicleState.getVehicleCornerPositions(vehicle);

	return {
		leftFrontCornerXMeters: cornerPositions[0].cornerXMeters,
		leftFrontCornerYMeters: cornerPositions[0].cornerYMeters,
		rightFrontCornerXMeters: cornerPositions[1].cornerXMeters,
		rightFrontCornerYMeters: cornerPositions[1].cornerYMeters,
	};
}

function drawFilledMarkerCircle(context, screenPosition, fillColor, strokeColor) {
	context.beginPath();
	context.arc(screenPosition.x, screenPosition.y, perceptionMarkerDotRadiusPixels, 0, Math.PI * 2);
	context.fillStyle = fillColor;
	context.fill();
	context.strokeStyle = strokeColor;
	context.lineWidth = 1.5;
	context.stroke();
}

function drawDashedLine(context, startScreenPosition, endScreenPosition, strokeColor, lineOpacity) {
	context.save();
	context.setLineDash([8, 5]);
	context.strokeStyle = strokeColor;
	context.globalAlpha = lineOpacity;
	context.lineWidth = 2;
	context.beginPath();
	context.moveTo(startScreenPosition.x, startScreenPosition.y);
	context.lineTo(endScreenPosition.x, endScreenPosition.y);
	context.stroke();
	context.restore();
}

function drawSolidLine(context, startScreenPosition, endScreenPosition, strokeColor, lineWidth) {
	context.save();
	context.strokeStyle = strokeColor;
	context.lineWidth = lineWidth;
	context.beginPath();
	context.moveTo(startScreenPosition.x, startScreenPosition.y);
	context.lineTo(endScreenPosition.x, endScreenPosition.y);
	context.stroke();
	context.restore();
}

function drawRoadScaleMarker(
	context,
	viewTransform,
	mapDefinition,
	centerXMeters,
	centerYMeters,
	forwardHeadingRadians,
	forwardDistanceMeters,
	roadScale,
	fillColor,
	strokeColor
) {
	const worldPosition = RoadsSimulation.roadCrossSection.getWorldPositionFromPerceptionScale(
		mapDefinition,
		centerXMeters,
		centerYMeters,
		forwardHeadingRadians,
		forwardDistanceMeters,
		roadScale
	);
	const screenPosition = viewTransform.worldToScreen(worldPosition.worldXMeters, worldPosition.worldYMeters);

	drawFilledMarkerCircle(context, screenPosition, fillColor, strokeColor);
}

function resolveInnerOuterFrontCorners(mapDefinition, vehicle) {
	const frontCornerPositions = getFrontCornerPositions(vehicle);
	const leftFrontRoadScale = RoadsSimulation.roadCrossSection.getRoadPositionScale(
		mapDefinition,
		frontCornerPositions.leftFrontCornerXMeters,
		frontCornerPositions.leftFrontCornerYMeters,
		vehicle.headingRadians
	);
	const rightFrontRoadScale = RoadsSimulation.roadCrossSection.getRoadPositionScale(
		mapDefinition,
		frontCornerPositions.rightFrontCornerXMeters,
		frontCornerPositions.rightFrontCornerYMeters,
		vehicle.headingRadians
	);

	if (leftFrontRoadScale <= rightFrontRoadScale) {
		return {
			innerFrontCornerXMeters: frontCornerPositions.leftFrontCornerXMeters,
			innerFrontCornerYMeters: frontCornerPositions.leftFrontCornerYMeters,
			outerFrontCornerXMeters: frontCornerPositions.rightFrontCornerXMeters,
			outerFrontCornerYMeters: frontCornerPositions.rightFrontCornerYMeters,
		};
	}

	return {
		innerFrontCornerXMeters: frontCornerPositions.rightFrontCornerXMeters,
		innerFrontCornerYMeters: frontCornerPositions.rightFrontCornerYMeters,
		outerFrontCornerXMeters: frontCornerPositions.leftFrontCornerXMeters,
		outerFrontCornerYMeters: frontCornerPositions.leftFrontCornerYMeters,
	};
}

function drawObstaclePerceptionMarkers(
	context,
	viewTransform,
	mapDefinition,
	vehicle,
	neuralInput
) {
	if (neuralInput.C <= -1 || (neuralInput.D1 <= -1 && neuralInput.D2 <= -1)) {
		return;
	}

	const centerPosition = RoadsSimulation.vehicleState.getVehicleCenterPosition(vehicle);
	const frontCornerSides = resolveInnerOuterFrontCorners(mapDefinition, vehicle);
	const forwardDistanceMeters = RoadsSimulation.roadCrossSection.getForwardDistanceFromObstacleScale(neuralInput.C);

	if (forwardDistanceMeters === null) {
		return;
	}

	const lineOpacity = clampValue((neuralInput.C + 1) / 2, 0.08, 1);
	const innerEdgeWorldPosition = RoadsSimulation.roadCrossSection.getWorldPositionFromPerceptionScale(
		mapDefinition,
		centerPosition.centerXMeters,
		centerPosition.centerYMeters,
		vehicle.headingRadians,
		forwardDistanceMeters,
		neuralInput.D1
	);
	const outerEdgeWorldPosition = RoadsSimulation.roadCrossSection.getWorldPositionFromPerceptionScale(
		mapDefinition,
		centerPosition.centerXMeters,
		centerPosition.centerYMeters,
		vehicle.headingRadians,
		forwardDistanceMeters,
		neuralInput.D2
	);
	const innerFrontScreenPosition = viewTransform.worldToScreen(
		frontCornerSides.innerFrontCornerXMeters,
		frontCornerSides.innerFrontCornerYMeters
	);
	const outerFrontScreenPosition = viewTransform.worldToScreen(
		frontCornerSides.outerFrontCornerXMeters,
		frontCornerSides.outerFrontCornerYMeters
	);
	const innerEdgeScreenPosition = viewTransform.worldToScreen(
		innerEdgeWorldPosition.worldXMeters,
		innerEdgeWorldPosition.worldYMeters
	);
	const outerEdgeScreenPosition = viewTransform.worldToScreen(
		outerEdgeWorldPosition.worldXMeters,
		outerEdgeWorldPosition.worldYMeters
	);

	drawDashedLine(
		context,
		innerFrontScreenPosition,
		innerEdgeScreenPosition,
		'rgba(220, 40, 40, 1)',
		lineOpacity
	);
	drawDashedLine(
		context,
		outerFrontScreenPosition,
		outerEdgeScreenPosition,
		'rgba(220, 40, 40, 1)',
		lineOpacity
	);
	drawFilledMarkerCircle(context, innerEdgeScreenPosition, 'rgba(220, 40, 40, 0.95)', 'rgba(120, 0, 0, 1)');
	drawFilledMarkerCircle(context, outerEdgeScreenPosition, 'rgba(220, 40, 40, 0.95)', 'rgba(120, 0, 0, 1)');
}

function drawLaneParallelLine(context, viewTransform, mapDefinition, vehicle, neuralInput) {
	const centerPosition = RoadsSimulation.vehicleState.getVehicleCenterPosition(vehicle);
	const headingFromParallelismScale = RoadsSimulation.roadCrossSection.getHeadingFromParallelismScale(
		mapDefinition,
		centerPosition.centerXMeters,
		centerPosition.centerYMeters,
		neuralInput.G
	);
	const centerScreenPosition = viewTransform.worldToScreen(
		centerPosition.centerXMeters,
		centerPosition.centerYMeters
	);
	const lineEndXMeters = centerPosition.centerXMeters
		+ Math.cos(headingFromParallelismScale) * laneParallelLineLengthMeters;
	const lineEndYMeters = centerPosition.centerYMeters
		+ Math.sin(headingFromParallelismScale) * laneParallelLineLengthMeters;
	const lineEndScreenPosition = viewTransform.worldToScreen(lineEndXMeters, lineEndYMeters);

	drawSolidLine(context, centerScreenPosition, lineEndScreenPosition, 'rgba(40, 180, 60, 0.95)', 3);
}

RoadsSimulation.perceptionVisualHelper.draw = function draw(
	context,
	viewTransform,
	mapDefinition,
	vehicle,
	neuralInput
) {
	const centerPosition = RoadsSimulation.vehicleState.getVehicleCenterPosition(vehicle);
	const perceptionInput = neuralInput || RoadsSimulation.vehiclePerception.createEmptyNeuralInput();
	const laneForwardHeadingRadians = RoadsSimulation.roadCrossSection.getLaneTangentRadians(
		mapDefinition,
		centerPosition.centerXMeters,
		centerPosition.centerYMeters
	);

	context.save();

	drawRoadScaleMarker(
		context,
		viewTransform,
		mapDefinition,
		centerPosition.centerXMeters,
		centerPosition.centerYMeters,
		laneForwardHeadingRadians,
		0,
		perceptionInput.B,
		'rgba(255, 244, 79, 0.95)',
		'rgba(160, 140, 0, 1)'
	);
	drawRoadScaleMarker(
		context,
		viewTransform,
		mapDefinition,
		centerPosition.centerXMeters,
		centerPosition.centerYMeters,
		vehicle.headingRadians,
		RoadsSimulation.perceptionConstants.forwardPreviewDistanceShortMeters,
		perceptionInput.E1,
		'rgba(204, 119, 34, 0.95)',
		'rgba(120, 70, 10, 1)'
	);
	drawRoadScaleMarker(
		context,
		viewTransform,
		mapDefinition,
		centerPosition.centerXMeters,
		centerPosition.centerYMeters,
		vehicle.headingRadians,
		RoadsSimulation.perceptionConstants.forwardPreviewDistanceLongMeters,
		perceptionInput.E2,
		'rgba(255, 140, 0, 0.95)',
		'rgba(160, 80, 0, 1)'
	);
	drawObstaclePerceptionMarkers(context, viewTransform, mapDefinition, vehicle, perceptionInput);
	drawLaneParallelLine(context, viewTransform, mapDefinition, vehicle, perceptionInput);

	context.restore();
};
