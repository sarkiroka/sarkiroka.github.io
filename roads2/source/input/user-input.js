window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.userInput = {};

RoadsSimulation.userInput.createUserInputListener = function createUserInputListener() {
	const pressedKeys = {};

	function isArrowKey(keyName) {
		return keyName === 'ArrowUp'
			|| keyName === 'ArrowDown'
			|| keyName === 'ArrowLeft'
			|| keyName === 'ArrowRight';
	}

	function handleKeyDown(keyboardEvent) {
		if (isArrowKey(keyboardEvent.key)) {
			keyboardEvent.preventDefault();
		}

		if (keyboardEvent.key === 'Shift' || keyboardEvent.key === 'ShiftLeft' || keyboardEvent.key === 'ShiftRight') {
			pressedKeys.shift = true;
		}

		pressedKeys[keyboardEvent.key] = true;
	}

	function handleKeyUp(keyboardEvent) {
		if (isArrowKey(keyboardEvent.key)) {
			keyboardEvent.preventDefault();
		}

		if (keyboardEvent.key === 'Shift' || keyboardEvent.key === 'ShiftLeft' || keyboardEvent.key === 'ShiftRight') {
			pressedKeys.shift = false;
		}

		pressedKeys[keyboardEvent.key] = false;
	}

	function handleWindowBlur() {
		Object.keys(pressedKeys).forEach(function clearPressedKey(keyName) {
			pressedKeys[keyName] = false;
		});
	}

	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('keyup', handleKeyUp);
	window.addEventListener('blur', handleWindowBlur);

	return {
		getInputState: function getInputState() {
			const shiftPressed = pressedKeys.shift === true;

			return {
				accelerateForward: pressedKeys.ArrowUp === true && !shiftPressed,
				accelerateReverse: pressedKeys.ArrowUp === true && shiftPressed,
				brakeActive: pressedKeys.ArrowDown === true,
				steerLeft: pressedKeys.ArrowLeft === true,
				steerRight: pressedKeys.ArrowRight === true,
			};
		},
		destroy: function destroy() {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('blur', handleWindowBlur);
		},
	};
};
