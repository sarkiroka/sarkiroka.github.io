window.RoadsSimulation = window.RoadsSimulation || {};

(function initializeMapView() {
	const canvasElement = document.getElementById('map-canvas');
	const mapDefinition = RoadsSimulation.maps.buildingBlockLoop;
	const playerVehicle = RoadsSimulation.vehicleState.createPlayerVehicle(
		mapDefinition,
		RoadsSimulation.playerVehicleDefinition
	);
	const companionVehicle = RoadsSimulation.vehicleState.createCompanionVehicle(
		mapDefinition,
		RoadsSimulation.companionVehicleDefinition
	);
	const vehicleFleet = [playerVehicle, companionVehicle];
	const userInputListener = RoadsSimulation.userInput.createUserInputListener();
	const renderLoop = RoadsSimulation.renderLoop.createRenderLoop(
		canvasElement,
		mapDefinition,
		vehicleFleet,
		playerVehicle,
		userInputListener
	);

	renderLoop.start();
})();
