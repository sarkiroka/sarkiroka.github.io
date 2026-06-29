window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.hudRenderer = {};

RoadsSimulation.hudRenderer.drawDistanceOverlay = function drawDistanceOverlay(context, vehicleFleet) {
	context.save();
	context.font = '16px sans-serif';
	context.fillStyle = 'rgba(255, 255, 255, 0.92)';
	context.textBaseline = 'top';

	let lineOffsetPixels = 12;

	for (let vehicleIndex = 0; vehicleIndex < vehicleFleet.length; vehicleIndex += 1) {
		const vehicle = vehicleFleet[vehicleIndex];
		const roundedDistanceMeters = Math.round(vehicle.traveledDistanceMeters);
		const distanceLabel = vehicle.vehicleDefinition.displayLabel + ': ' + roundedDistanceMeters + ' m';

		context.fillText(distanceLabel, 12, lineOffsetPixels);
		lineOffsetPixels += 22;
	}

	context.restore();
};
