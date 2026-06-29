window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.evolutionRenderLoop = {};

RoadsSimulation.evolutionRenderLoop.createEvolutionRenderLoop = function createEvolutionRenderLoop(
	canvasElement,
	mapDefinition,
	environmentVehicles,
	roundController,
	userInputListener,
	simulationSpeedControl
) {
	const canvasContext = canvasElement.getContext('2d');
	const mapBounds = RoadsSimulation.mapGeometry.getMapBounds(mapDefinition);
	let previousTimestampMilliseconds = null;

	function resizeCanvas() {
		const devicePixelRatio = window.devicePixelRatio || 1;
		const displayWidth = window.innerWidth;
		const displayHeight = window.innerHeight;

		canvasElement.width = Math.floor(displayWidth * devicePixelRatio);
		canvasElement.height = Math.floor(displayHeight * devicePixelRatio);
		canvasElement.style.width = displayWidth + 'px';
		canvasElement.style.height = displayHeight + 'px';
		canvasContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
	}

	function renderFrame(timestampMilliseconds) {
		const displayWidth = window.innerWidth;
		const displayHeight = window.innerHeight;

		if (previousTimestampMilliseconds === null) {
			previousTimestampMilliseconds = timestampMilliseconds;
		}

		const deltaSeconds = Math.min((timestampMilliseconds - previousTimestampMilliseconds) / 1000, 0.05);
		previousTimestampMilliseconds = timestampMilliseconds;
		const speedMultiplier = simulationSpeedControl.getSpeedMultiplier();
		const simulationDeltaSeconds = deltaSeconds * speedMultiplier;

		for (let environmentIndex = 0; environmentIndex < environmentVehicles.length; environmentIndex += 1) {
			RoadsSimulation.vehicleUpdate.queryStaticVehicleTick(
				environmentVehicles[environmentIndex],
				mapDefinition,
				environmentVehicles
			);
		}

		roundController.tick(simulationDeltaSeconds, environmentVehicles, mapBounds);

		if (typeof roundController.saveIfNeeded === 'function') {
			roundController.saveIfNeeded();
		}

		const populationIndividuals = roundController.getPopulationIndividuals();
		const rankedAliveIndividuals = RoadsSimulation.populationIndividual.getAliveIndividualsByDistanceRank(
			populationIndividuals
		);
		const topIndividual = rankedAliveIndividuals.length > 0 ? rankedAliveIndividuals[0] : null;
		const aliveCount = rankedAliveIndividuals.length;
		const viewTransform = RoadsSimulation.viewTransform.createViewTransform(
			displayWidth,
			displayHeight,
			mapBounds
		);

		canvasContext.clearRect(0, 0, displayWidth, displayHeight);
		RoadsSimulation.mapRenderer.drawMap(canvasContext, viewTransform, mapDefinition);

		for (let environmentIndex = 0; environmentIndex < environmentVehicles.length; environmentIndex += 1) {
			RoadsSimulation.vehicleRenderer.drawVehicle(
				canvasContext,
				viewTransform,
				environmentVehicles[environmentIndex],
				{ opacity: 1, drawLights: true }
			);
		}

		for (let rankIndex = rankedAliveIndividuals.length - 1; rankIndex >= 0; rankIndex -= 1) {
			const individual = rankedAliveIndividuals[rankIndex];
			const vehicleOpacity = RoadsSimulation.populationIndividual.getVehicleOpacityForDistanceRank(rankIndex);
			const drawLights = rankIndex === 0;

			RoadsSimulation.vehicleRenderer.drawVehicle(
				canvasContext,
				viewTransform,
				individual.vehicle,
				{ opacity: vehicleOpacity, drawLights: drawLights }
			);
		}

		if (topIndividual && userInputListener.isPerceptionHelperVisible()) {
			RoadsSimulation.perceptionVisualHelper.draw(
				canvasContext,
				viewTransform,
				mapDefinition,
				topIndividual.vehicle,
				topIndividual.neuralInput
			);
		}

		if (topIndividual) {
			RoadsSimulation.hudRenderer.drawTopLeaderOverlay(canvasContext, topIndividual);
			RoadsSimulation.hudRenderer.drawNeuralInputOverlay(
				canvasContext,
				displayHeight,
				topIndividual.neuralInput
			);
			RoadsSimulation.hudRenderer.drawControlOutputOverlay(
				canvasContext,
				displayWidth,
				displayHeight,
				topIndividual.controlOutput
			);
		}

		RoadsSimulation.hudRenderer.drawPopulationStatusOverlay(
			canvasContext,
			displayWidth,
			roundController.getGenerationNumber(),
			aliveCount,
			roundController.getRoundElapsedSeconds()
		);

		if (userInputListener.isPerceptionHelperVisible()) {
			RoadsSimulation.hudRenderer.drawPerceptionHelperHint(canvasContext, displayWidth);
		}
	}

	function animationLoop(timestampMilliseconds) {
		renderFrame(timestampMilliseconds);
		requestAnimationFrame(animationLoop);
	}

	return {
		start: function start() {
			resizeCanvas();
			window.addEventListener('resize', resizeCanvas);
			requestAnimationFrame(animationLoop);
		},
	};
};
