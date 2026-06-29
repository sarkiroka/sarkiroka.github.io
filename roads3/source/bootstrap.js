window.RoadsSimulation = window.RoadsSimulation || {};

(function initializeEvolutionSimulation() {
	RoadsSimulation.evolutionSettings.loadAndApplyStoredSettings();

	const canvasElement = document.getElementById('map-canvas');
	const speedSliderElement = document.getElementById('simulation-speed-slider');
	const speedLabelElement = document.getElementById('simulation-speed-label');
	const mapDefinition = RoadsSimulation.maps.buildingBlockLoop;
	const companionVehicle = RoadsSimulation.vehicleState.createCompanionVehicle(
		mapDefinition,
		RoadsSimulation.companionVehicleDefinition
	);
	const environmentVehicles = [companionVehicle];
	const savedPopulationState = RoadsSimulation.populationStorage.loadPopulationState();
	const roundController = RoadsSimulation.generationCycle.createRoundController(
		mapDefinition,
		savedPopulationState
	);
	const populationStorageListener = RoadsSimulation.populationStorage.createPopulationStorageListener(
		roundController,
		function getPopulationIndividuals() {
			return roundController.getPopulationIndividuals();
		}
	);

	roundController.saveIfNeeded = populationStorageListener.saveIfNeeded;

	const userInputListener = RoadsSimulation.userInput.createUserInputListener();
	const simulationSpeedControl = RoadsSimulation.simulationSpeedControl.createSimulationSpeedControl(
		speedSliderElement,
		speedLabelElement
	);
	const evolutionRenderLoop = RoadsSimulation.evolutionRenderLoop.createEvolutionRenderLoop(
		canvasElement,
		mapDefinition,
		environmentVehicles,
		roundController,
		userInputListener,
		simulationSpeedControl
	);

	RoadsSimulation.evolutionSettingsPanel.createEvolutionSettingsPanel(
		roundController,
		populationStorageListener
	);

	evolutionRenderLoop.start();
})();
