window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.controlOutputAdapter = {};

function clampValue(value, minimumValue, maximumValue) {
	return Math.max(minimumValue, Math.min(maximumValue, value));
}

RoadsSimulation.controlOutputAdapter.toInputState = function toInputState(controlOutput) {
	const deadZone = RoadsSimulation.evolutionConstants.neuralControlDeadZone;
	const outputX = typeof controlOutput.X === 'number' ? controlOutput.X : 0;
	const outputY = typeof controlOutput.Y === 'number' ? controlOutput.Y : 0;
	const clampedX = clampValue(outputX, -1, 1);
	const clampedY = clampValue(outputY, -1, 1);
	let accelerateForward = false;
	let accelerateReverse = false;
	let brakeActive = false;
	let steerLeft = false;
	let steerRight = false;
	let throttleScale = 0;
	let steerScale = 0;

	if (clampedX > deadZone) {
		accelerateForward = true;
		throttleScale = (clampedX - deadZone) / (1 - deadZone);
	} else if (clampedX < -deadZone) {
		if (clampedX < -0.5) {
			accelerateReverse = true;
			throttleScale = (-clampedX - deadZone) / (1 - deadZone);
		} else {
			brakeActive = true;
			throttleScale = (-clampedX - deadZone) / (1 - deadZone);
		}
	}

	if (Math.abs(clampedY) > deadZone) {
		steerScale = (Math.abs(clampedY) - deadZone) / (1 - deadZone);

		if (clampedY < 0) {
			steerLeft = true;
		} else {
			steerRight = true;
		}
	}

	return {
		accelerateForward: accelerateForward,
		accelerateReverse: accelerateReverse,
		brakeActive: brakeActive,
		steerLeft: steerLeft,
		steerRight: steerRight,
		throttleScale: clampValue(throttleScale, 0, 1),
		steerScale: clampValue(steerScale, 0, 1),
	};
};
