window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleRenderer = {};

RoadsSimulation.vehicleRenderer.drawVehicle = function drawVehicle(context, viewTransform, vehicleState, vehicleType) {
	const screenPosition = viewTransform.worldToScreen(vehicleState.worldXMeters, vehicleState.worldYMeters);
	const lengthPixels = viewTransform.metersToPixels(vehicleType.lengthMeters);
	const widthPixels = viewTransform.metersToPixels(vehicleType.widthMeters);

	context.save();
	context.translate(screenPosition.x, screenPosition.y);
	context.rotate(vehicleState.headingRadians);

	const halfLength = lengthPixels / 2;
	const halfWidth = widthPixels / 2;

	context.fillStyle = vehicleType.bodyColor;
	context.strokeStyle = '#333333';
	context.lineWidth = 1;
	context.beginPath();
	context.roundRect(-halfLength, -halfWidth, lengthPixels, widthPixels, 2);
	context.fill();
	context.stroke();

	const headlightRadius = Math.max(2, widthPixels * 0.12);
	const taillightRadius = Math.max(1.5, widthPixels * 0.1);
	const headlightOffset = halfLength - headlightRadius * 1.5;
	const taillightOffset = -halfLength + taillightRadius * 1.5;
	const lightSpread = halfWidth * 0.55;

	context.shadowBlur = 8;
	context.shadowColor = vehicleType.headlightGlowColor;

	context.fillStyle = vehicleType.headlightGlowColor;
	context.beginPath();
	context.arc(headlightOffset, -lightSpread, headlightRadius * 1.8, 0, Math.PI * 2);
	context.arc(headlightOffset, lightSpread, headlightRadius * 1.8, 0, Math.PI * 2);
	context.fill();

	context.fillStyle = vehicleType.headlightColor;
	context.beginPath();
	context.arc(headlightOffset, -lightSpread, headlightRadius, 0, Math.PI * 2);
	context.arc(headlightOffset, lightSpread, headlightRadius, 0, Math.PI * 2);
	context.fill();

	context.shadowBlur = 5;
	context.shadowColor = vehicleType.taillightGlowColor;
	context.fillStyle = vehicleType.taillightGlowColor;
	context.beginPath();
	context.arc(taillightOffset, -lightSpread, taillightRadius * 1.5, 0, Math.PI * 2);
	context.arc(taillightOffset, lightSpread, taillightRadius * 1.5, 0, Math.PI * 2);
	context.fill();

	context.fillStyle = vehicleType.taillightColor;
	context.beginPath();
	context.arc(taillightOffset, -lightSpread, taillightRadius, 0, Math.PI * 2);
	context.arc(taillightOffset, lightSpread, taillightRadius, 0, Math.PI * 2);
	context.fill();

	context.restore();

	RoadsSimulation.vehicleRenderer.drawVehicleTooltip(context, viewTransform, vehicleState);
};

RoadsSimulation.vehicleRenderer.drawVehicleTooltip = function drawVehicleTooltip(context, viewTransform, vehicleState) {
	const screenPosition = viewTransform.worldToScreen(vehicleState.worldXMeters, vehicleState.worldYMeters);
	const speedLine = RoadsSimulation.vehicleIntent.formatSpeedLine(vehicleState);
	const intentLine = vehicleState.intentLabel || 'Haladás';
	const paddingPixels = 6;
	const lineHeightPixels = 14;
	const fontSizePixels = 11;

	context.save();
	context.font = fontSizePixels + 'px sans-serif';
	const speedWidth = context.measureText(speedLine).width;
	const intentWidth = context.measureText(intentLine).width;
	const boxWidth = Math.max(speedWidth, intentWidth) + paddingPixels * 2;
	const boxHeight = lineHeightPixels * 2 + paddingPixels * 2;
	const boxLeft = screenPosition.x - boxWidth / 2;
	const boxTop = screenPosition.y - viewTransform.metersToPixels(4) - boxHeight;

	context.fillStyle = 'rgba(255, 255, 255, 0.94)';
	context.strokeStyle = '#666666';
	context.lineWidth = 1;
	context.beginPath();
	context.roundRect(boxLeft, boxTop, boxWidth, boxHeight, 4);
	context.fill();
	context.stroke();

	context.fillStyle = '#222222';
	context.textAlign = 'center';
	context.textBaseline = 'top';
	context.fillText(speedLine, screenPosition.x, boxTop + paddingPixels);
	context.fillText(intentLine, screenPosition.x, boxTop + paddingPixels + lineHeightPixels);
	context.restore();
};

RoadsSimulation.vehicleRenderer.drawAllVehicles = function drawAllVehicles(context, viewTransform, vehicles) {
	for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex += 1) {
		const vehicle = vehicles[vehicleIndex];
		const vehicleType = RoadsSimulation.vehicleTypes[vehicle.vehicleTypeIdentifier];
		RoadsSimulation.vehicleRenderer.drawVehicle(context, viewTransform, vehicle, vehicleType);
	}
};
