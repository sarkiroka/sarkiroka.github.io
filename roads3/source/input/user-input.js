window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.userInput = {};

RoadsSimulation.userInput.createUserInputListener = function createUserInputListener() {
	let perceptionHelperVisible = false;

	function handleKeyDown(keyboardEvent) {
		if (keyboardEvent.key === 'v' || keyboardEvent.key === 'V') {
			perceptionHelperVisible = !perceptionHelperVisible;
		}
	}

	window.addEventListener('keydown', handleKeyDown);

	return {
		isPerceptionHelperVisible: function isPerceptionHelperVisible() {
			return perceptionHelperVisible;
		},
		destroy: function destroy() {
			window.removeEventListener('keydown', handleKeyDown);
		},
	};
};
