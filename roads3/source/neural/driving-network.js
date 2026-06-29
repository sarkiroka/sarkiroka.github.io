window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.drivingNetwork = {};

RoadsSimulation.drivingNetwork.layerSizes = [9, 18, 18, 6, 2];

RoadsSimulation.drivingNetwork.neuralInputLabels = ['A', 'B', 'C', 'D1', 'D2', 'E1', 'E2', 'F', 'G'];

function clampValue(value, minimumValue, maximumValue) {
	return Math.max(minimumValue, Math.min(maximumValue, value));
}

function applyRelu(value) {
	return value > 0 ? value : 0;
}

function applyTanh(value) {
	return Math.tanh(value);
}

function countGenomeLength(layerSizes) {
	let genomeLength = 0;

	for (let layerIndex = 0; layerIndex < layerSizes.length - 1; layerIndex += 1) {
		const inputCount = layerSizes[layerIndex];
		const outputCount = layerSizes[layerIndex + 1];
		genomeLength += inputCount * outputCount + outputCount;
	}

	return genomeLength;
}

RoadsSimulation.drivingNetwork.genomeLength = countGenomeLength(RoadsSimulation.drivingNetwork.layerSizes);

function denseLayerForward(inputValues, outputCount, genomeValues, genomeOffset) {
	const inputCount = inputValues.length;
	const outputValues = new Array(outputCount);
	let weightIndex = genomeOffset;

	for (let outputIndex = 0; outputIndex < outputCount; outputIndex += 1) {
		let activationSum = 0;

		for (let inputIndex = 0; inputIndex < inputCount; inputIndex += 1) {
			activationSum += inputValues[inputIndex] * genomeValues[weightIndex];
			weightIndex += 1;
		}

		activationSum += genomeValues[weightIndex];
		weightIndex += 1;
		outputValues[outputIndex] = activationSum;
	}

	return {
		outputValues: outputValues,
		nextGenomeOffset: weightIndex,
	};
}

RoadsSimulation.drivingNetwork.neuralInputToVector = function neuralInputToVector(neuralInput) {
	const inputLabels = RoadsSimulation.drivingNetwork.neuralInputLabels;
	const inputVector = new Array(inputLabels.length);

	for (let labelIndex = 0; labelIndex < inputLabels.length; labelIndex += 1) {
		const label = inputLabels[labelIndex];
		const inputValue = neuralInput[label];

		inputVector[labelIndex] = typeof inputValue === 'number' && Number.isFinite(inputValue) ? inputValue : 0;
	}

	return inputVector;
};

RoadsSimulation.drivingNetwork.forward = function forward(genomeValues, neuralInput) {
	const layerSizes = RoadsSimulation.drivingNetwork.layerSizes;
	let layerValues = RoadsSimulation.drivingNetwork.neuralInputToVector(neuralInput);
	let genomeOffset = 0;

	for (let layerIndex = 0; layerIndex < layerSizes.length - 1; layerIndex += 1) {
		const outputCount = layerSizes[layerIndex + 1];
		const layerResult = denseLayerForward(layerValues, outputCount, genomeValues, genomeOffset);
		genomeOffset = layerResult.nextGenomeOffset;
		layerValues = layerResult.outputValues;

		if (layerIndex < layerSizes.length - 2) {
			for (let valueIndex = 0; valueIndex < layerValues.length; valueIndex += 1) {
				layerValues[valueIndex] = applyRelu(layerValues[valueIndex]);
			}
		} else {
			for (let valueIndex = 0; valueIndex < layerValues.length; valueIndex += 1) {
				layerValues[valueIndex] = applyTanh(layerValues[valueIndex]);
			}
		}
	}

	return {
		X: clampValue(layerValues[0], -1, 1),
		Y: clampValue(layerValues[1], -1, 1),
	};
};
