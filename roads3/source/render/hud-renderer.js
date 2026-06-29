window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.hudRenderer = {};

function formatPerceptionValue(value) {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return '0.0000';
	}

	return value.toFixed(4);
}

RoadsSimulation.hudRenderer.formatPerceptionValue = formatPerceptionValue;

RoadsSimulation.hudRenderer.drawTopLeaderOverlay = function drawTopLeaderOverlay(context, topIndividual) {
	const leaderFitnessMeters = topIndividual.isAlive
		? topIndividual.vehicle.traveledDistanceMeters
		: topIndividual.fitnessMeters;
	const roundedDistanceMeters = Math.round(leaderFitnessMeters);

	context.save();
	context.font = '16px sans-serif';
	context.fillStyle = 'rgba(255, 255, 255, 0.92)';
	context.textBaseline = 'top';
	context.textAlign = 'left';
	context.fillText('Top1: ' + roundedDistanceMeters + ' m', 12, 12);
	context.restore();
};

RoadsSimulation.hudRenderer.drawPopulationStatusOverlay = function drawPopulationStatusOverlay(
	context,
	displayWidth,
	generationNumber,
	aliveCount,
	roundElapsedSeconds
) {
	const roundDurationLimitSeconds = RoadsSimulation.evolutionSettings.getRoundDurationLimitSeconds();
	const formattedElapsedSeconds = Math.max(roundElapsedSeconds, 0).toFixed(1);
	const roundDurationLabel = roundDurationLimitSeconds === null
		? formattedElapsedSeconds + ' s / végtelen'
		: formattedElapsedSeconds + ' / ' + roundDurationLimitSeconds + ' s';

	context.save();
	context.font = '16px sans-serif';
	context.fillStyle = 'rgba(255, 255, 255, 0.92)';
	context.textBaseline = 'top';
	context.textAlign = 'right';
	context.fillText('Populáció: ' + generationNumber, displayWidth - 12, 12);
	context.fillText('Élő: ' + aliveCount, displayWidth - 12, 34);
	context.fillText('Idő: ' + roundDurationLabel, displayWidth - 12, 56);
	context.restore();
};

RoadsSimulation.hudRenderer.drawNeuralInputOverlay = function drawNeuralInputOverlay(context, displayHeight, neuralInput) {
	const perceptionInput = neuralInput || RoadsSimulation.vehiclePerception.createEmptyNeuralInput();
	const lineHeightPixels = 18;
	const bottomMarginPixels = 12;
	const leftMarginPixels = 12;
	const neuralInputLabels = ['A', 'B', 'C', 'D1', 'D2', 'E1', 'E2', 'F', 'G'];
	let lineOffsetPixels = displayHeight - bottomMarginPixels - lineHeightPixels * neuralInputLabels.length;

	context.save();
	context.font = '14px monospace';
	context.fillStyle = 'rgba(255, 255, 255, 0.92)';
	context.textBaseline = 'top';

	for (let labelIndex = 0; labelIndex < neuralInputLabels.length; labelIndex += 1) {
		const label = neuralInputLabels[labelIndex];
		const perceptionValue = perceptionInput[label];
		const formattedLine = label + ': ' + formatPerceptionValue(perceptionValue);

		context.fillText(formattedLine, leftMarginPixels, lineOffsetPixels);
		lineOffsetPixels += lineHeightPixels;
	}

	context.restore();
};

RoadsSimulation.hudRenderer.drawControlOutputOverlay = function drawControlOutputOverlay(context, displayWidth, displayHeight, controlOutput) {
	const outputValues = controlOutput || { X: 0, Y: 0 };
	const lineHeightPixels = 18;
	const bottomMarginPixels = 12;
	const rightMarginPixels = 12;
	const controlOutputLabels = ['X', 'Y'];
	let lineOffsetPixels = displayHeight - bottomMarginPixels - lineHeightPixels * controlOutputLabels.length;

	context.save();
	context.font = '14px monospace';
	context.fillStyle = 'rgba(255, 255, 255, 0.92)';
	context.textBaseline = 'top';
	context.textAlign = 'right';

	for (let labelIndex = 0; labelIndex < controlOutputLabels.length; labelIndex += 1) {
		const label = controlOutputLabels[labelIndex];
		const outputValue = outputValues[label];
		const formattedLine = label + ': ' + formatPerceptionValue(outputValue);

		context.fillText(formattedLine, displayWidth - rightMarginPixels, lineOffsetPixels);
		lineOffsetPixels += lineHeightPixels;
	}

	context.restore();
};

RoadsSimulation.hudRenderer.drawPerceptionHelperHint = function drawPerceptionHelperHint(context, displayWidth) {
	context.save();
	context.font = '14px sans-serif';
	context.fillStyle = 'rgba(255, 255, 255, 0.85)';
	context.textBaseline = 'top';
	context.textAlign = 'center';
	context.fillText('Érzékelés segédlet be (V)', displayWidth / 2, 72);
	context.restore();
};
