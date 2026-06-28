window.RoadsSimulation = window.RoadsSimulation || {};

(function initializeSimulation() {
	const canvasElement = document.getElementById('simulation-canvas');
	const simulationSpeedSlider = document.getElementById('simulation-speed-slider');
	const simulationSpeedValue = document.getElementById('simulation-speed-value');
	const mapDefinition = RoadsSimulation.maps.buildingBlockLoop;

	const clockwiseRoute = RoadsSimulation.routePath.buildRouteCenterline(mapDefinition, mapDefinition.routes[0]);
	const counterclockwiseRoute = RoadsSimulation.routePath.buildRouteCenterline(mapDefinition, mapDefinition.routes[1]);
	const clockwiseOpposite = RoadsSimulation.routePath.getOppositeLaneRoute(clockwiseRoute, mapDefinition);
	const counterclockwiseOpposite = RoadsSimulation.routePath.getOppositeLaneRoute(counterclockwiseRoute, mapDefinition);

	const vehicles = RoadsSimulation.vehicleFleet.createInitialFleet(mapDefinition, [
		{
			uniqueIdentifier: 'vehicle-red',
			vehicleTypeIdentifier: 'sedan',
			ownLaneRoute: clockwiseRoute,
			oppositeLaneRoute: clockwiseOpposite,
			startDistanceMeters: 25,
			overtakeAllowed: false,
		},
		{
			uniqueIdentifier: 'vehicle-blue',
			vehicleTypeIdentifier: 'sedanBlue',
			ownLaneRoute: counterclockwiseRoute,
			oppositeLaneRoute: counterclockwiseOpposite,
			startDistanceMeters: 82,
			overtakeAllowed: false,
		},
		{
			uniqueIdentifier: 'vehicle-yellow',
			vehicleTypeIdentifier: 'sedanYellow',
			ownLaneRoute: counterclockwiseRoute,
			oppositeLaneRoute: counterclockwiseOpposite,
			startDistanceMeters: 70,
			overtakeAllowed: true,
		},
	]);

	const renderLoop = RoadsSimulation.renderLoop.createRenderLoop(canvasElement, mapDefinition, vehicles);

	RoadsSimulation.positionRecorder.start();

	setInterval(function savePositionTracePeriodically() {
		RoadsSimulation.positionRecorder.saveTraceToServer().catch(function onSaveError(saveError) {
			console.error('Pozíció mentési hiba', saveError);
		});
	}, 3000);

	simulationSpeedSlider.addEventListener('input', function onSpeedChange() {
		const multiplier = parseFloat(simulationSpeedSlider.value);
		renderLoop.setSimulationSpeedMultiplier(multiplier);
		simulationSpeedValue.textContent = multiplier.toFixed(1);
	});

	renderLoop.start();
})();
