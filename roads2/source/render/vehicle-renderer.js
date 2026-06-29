window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleRenderer = {};

function drawRotatedRectangle(context, viewTransform, centerXMeters, centerYMeters, lengthMeters, widthMeters, headingRadians, fillColor, strokeColor) {
	const halfLengthMeters = lengthMeters / 2;
	const halfWidthMeters = widthMeters / 2;
	const cosineHeading = Math.cos(headingRadians);
	const sineHeading = Math.sin(headingRadians);
	const forwardXMeters = cosineHeading * halfLengthMeters;
	const forwardYMeters = sineHeading * halfLengthMeters;
	const sidewaysXMeters = -sineHeading * halfWidthMeters;
	const sidewaysYMeters = cosineHeading * halfWidthMeters;

	const cornerPoints = [
		viewTransform.worldToScreen(centerXMeters + forwardXMeters + sidewaysXMeters, centerYMeters + forwardYMeters + sidewaysYMeters),
		viewTransform.worldToScreen(centerXMeters + forwardXMeters - sidewaysXMeters, centerYMeters + forwardYMeters - sidewaysYMeters),
		viewTransform.worldToScreen(centerXMeters - forwardXMeters - sidewaysXMeters, centerYMeters - forwardYMeters - sidewaysYMeters),
		viewTransform.worldToScreen(centerXMeters - forwardXMeters + sidewaysXMeters, centerYMeters - forwardYMeters + sidewaysYMeters),
	];

	context.beginPath();
	context.moveTo(cornerPoints[0].x, cornerPoints[0].y);
	context.lineTo(cornerPoints[1].x, cornerPoints[1].y);
	context.lineTo(cornerPoints[2].x, cornerPoints[2].y);
	context.lineTo(cornerPoints[3].x, cornerPoints[3].y);
	context.closePath();
	context.fillStyle = fillColor;
	context.fill();

	if (strokeColor) {
		context.strokeStyle = strokeColor;
		context.lineWidth = 1;
		context.stroke();
	}
}

function drawSingleFrontBeam(context, viewTransform, lightXMeters, lightYMeters, headingRadians, beamLengthMeters, beamSpreadRadians) {
	const lightScreenPosition = viewTransform.worldToScreen(lightXMeters, lightYMeters);
	const lightRadiusPixels = Math.max(4, viewTransform.metersToPixels(0.24));
	const beamLeftAngle = headingRadians - beamSpreadRadians;
	const beamRightAngle = headingRadians + beamSpreadRadians;
	const beamLeftEnd = viewTransform.worldToScreen(
		lightXMeters + Math.cos(beamLeftAngle) * beamLengthMeters,
		lightYMeters + Math.sin(beamLeftAngle) * beamLengthMeters
	);
	const beamRightEnd = viewTransform.worldToScreen(
		lightXMeters + Math.cos(beamRightAngle) * beamLengthMeters,
		lightYMeters + Math.sin(beamRightAngle) * beamLengthMeters
	);
	const beamCenterEnd = viewTransform.worldToScreen(
		lightXMeters + Math.cos(headingRadians) * beamLengthMeters,
		lightYMeters + Math.sin(headingRadians) * beamLengthMeters
	);
	const beamGradient = context.createLinearGradient(
		lightScreenPosition.x,
		lightScreenPosition.y,
		beamCenterEnd.x,
		beamCenterEnd.y
	);

	beamGradient.addColorStop(0, 'rgba(255, 255, 255, 0.24)');
	beamGradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.10)');
	beamGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.03)');
	beamGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

	context.fillStyle = '#ffffff';
	context.beginPath();
	context.arc(lightScreenPosition.x, lightScreenPosition.y, lightRadiusPixels, 0, Math.PI * 2);
	context.fill();

	context.fillStyle = beamGradient;
	context.beginPath();
	context.moveTo(lightScreenPosition.x, lightScreenPosition.y);
	context.lineTo(beamLeftEnd.x, beamLeftEnd.y);
	context.lineTo(beamRightEnd.x, beamRightEnd.y);
	context.closePath();
	context.fill();
}

function drawFrontLights(context, viewTransform, centerXMeters, centerYMeters, headingRadians, lengthMeters, widthMeters) {
	const frontOffsetMeters = lengthMeters / 2 - 0.16;
	const sidewaysOffsetMeters = widthMeters / 2 - 0.24;
	const cosineHeading = Math.cos(headingRadians);
	const sineHeading = Math.sin(headingRadians);
	const frontCenterXMeters = centerXMeters + cosineHeading * frontOffsetMeters;
	const frontCenterYMeters = centerYMeters + sineHeading * frontOffsetMeters;
	const sidewaysXMeters = -sineHeading * sidewaysOffsetMeters;
	const sidewaysYMeters = cosineHeading * sidewaysOffsetMeters;
	const beamLengthMeters = 8.0;
	const beamSpreadRadians = 0.22;

	context.save();
	drawSingleFrontBeam(
		context,
		viewTransform,
		frontCenterXMeters + sidewaysXMeters,
		frontCenterYMeters + sidewaysYMeters,
		headingRadians,
		beamLengthMeters,
		beamSpreadRadians
	);
	drawSingleFrontBeam(
		context,
		viewTransform,
		frontCenterXMeters - sidewaysXMeters,
		frontCenterYMeters - sidewaysYMeters,
		headingRadians,
		beamLengthMeters,
		beamSpreadRadians
	);
	context.restore();
}

function drawRearLight(context, viewTransform, centerXMeters, centerYMeters, headingRadians, lengthMeters, widthMeters, brakeLightActive, reverseLightActive) {
	const rearOffsetMeters = lengthMeters / 2 - 0.18;
	const sidewaysOffsetMeters = widthMeters / 2 - 0.22;
	const cosineHeading = Math.cos(headingRadians);
	const sineHeading = Math.sin(headingRadians);
	const rearCenterXMeters = centerXMeters - cosineHeading * rearOffsetMeters;
	const rearCenterYMeters = centerYMeters - sineHeading * rearOffsetMeters;
	const sidewaysXMeters = -sineHeading * sidewaysOffsetMeters;
	const sidewaysYMeters = cosineHeading * sidewaysOffsetMeters;
	const lightRadiusPixels = Math.max(3, viewTransform.metersToPixels(0.18));

	let lightAlpha = 0.45;
	let lightColor = '#aa3333';

	if (reverseLightActive && !brakeLightActive) {
		lightAlpha = 0.9;
		lightColor = '#f5f5f0';
	} else if (brakeLightActive) {
		lightAlpha = 0.95;
		lightColor = '#ff2222';
	}

	context.save();
	context.globalAlpha = lightAlpha;
	context.fillStyle = lightColor;

	const leftLightScreen = viewTransform.worldToScreen(
		rearCenterXMeters + sidewaysXMeters,
		rearCenterYMeters + sidewaysYMeters
	);
	const rightLightScreen = viewTransform.worldToScreen(
		rearCenterXMeters - sidewaysXMeters,
		rearCenterYMeters - sidewaysYMeters
	);

	context.beginPath();
	context.arc(leftLightScreen.x, leftLightScreen.y, lightRadiusPixels, 0, Math.PI * 2);
	context.arc(rightLightScreen.x, rightLightScreen.y, lightRadiusPixels, 0, Math.PI * 2);
	context.fill();
	context.restore();
}

RoadsSimulation.vehicleRenderer.drawVehicle = function drawVehicle(context, viewTransform, vehicle) {
	const vehicleDefinition = vehicle.vehicleDefinition;
	const centerPosition = RoadsSimulation.vehicleState.getVehicleCenterPosition(vehicle);
	const bodyFillColor = vehicle.isOnRoad
		? vehicleDefinition.bodyColorOnRoad
		: vehicleDefinition.bodyColorOffRoad;
	const bodyStrokeColor = vehicle.isOnRoad
		? vehicleDefinition.bodyStrokeColorOnRoad
		: vehicleDefinition.bodyStrokeColorOffRoad;

	drawFrontLights(
		context,
		viewTransform,
		centerPosition.centerXMeters,
		centerPosition.centerYMeters,
		vehicle.headingRadians,
		vehicleDefinition.lengthMeters,
		vehicleDefinition.widthMeters
	);

	drawRotatedRectangle(
		context,
		viewTransform,
		centerPosition.centerXMeters,
		centerPosition.centerYMeters,
		vehicleDefinition.lengthMeters,
		vehicleDefinition.widthMeters,
		vehicle.headingRadians,
		bodyFillColor,
		bodyStrokeColor
	);

	drawRearLight(
		context,
		viewTransform,
		centerPosition.centerXMeters,
		centerPosition.centerYMeters,
		vehicle.headingRadians,
		vehicleDefinition.lengthMeters,
		vehicleDefinition.widthMeters,
		vehicle.brakeLightActive,
		vehicle.reverseLightActive
	);
};
