window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.controlSignal = {};

RoadsSimulation.controlSignal.fromKeyboard = function fromKeyboard(inputState) {
	let outputX = 0;
	let outputY = 0;

	if (inputState.brakeActive) {
		outputX = -1;
	} else if (inputState.accelerateForward) {
		outputX = 1;
	} else if (inputState.accelerateReverse) {
		outputX = -1;
	}

	if (inputState.steerLeft && !inputState.steerRight) {
		outputY = -1;
	} else if (inputState.steerRight && !inputState.steerLeft) {
		outputY = 1;
	}

	return {
		X: outputX,
		Y: outputY,
	};
};
