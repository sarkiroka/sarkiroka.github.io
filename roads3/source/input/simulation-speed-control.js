window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.simulationSpeedControl = {};

RoadsSimulation.simulationSpeedControl.createSimulationSpeedControl = function createSimulationSpeedControl(speedSliderElement, speedLabelElement) {
	let speedMultiplier = 1;

	function updateSpeedLabel() {
		speedLabelElement.textContent = 'Sebesség: ' + speedMultiplier + 'x';
	}

	speedSliderElement.min = '0';
	speedSliderElement.max = '100';
	speedSliderElement.step = '1';
	speedSliderElement.value = '1';
	updateSpeedLabel();

	speedSliderElement.addEventListener('input', function handleSpeedInput() {
		speedMultiplier = Number(speedSliderElement.value);
		updateSpeedLabel();
	});

	return {
		getSpeedMultiplier: function getSpeedMultiplier() {
			return speedMultiplier;
		},
	};
};
