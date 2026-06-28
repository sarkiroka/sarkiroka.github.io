window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.renderLoop = {};

RoadsSimulation.renderLoop.createRenderLoop = function createRenderLoop(canvasElement, mapDefinition, vehicles) {
	const canvasContext = canvasElement.getContext('2d');
	const mapBounds = RoadsSimulation.mapGeometry.getMapBounds(mapDefinition);
	let simulationSpeedMultiplier = 1;
	let lastFrameTimestamp = null;

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

	function renderFrame() {
		const displayWidth = window.innerWidth;
		const displayHeight = window.innerHeight;
		const viewTransform = RoadsSimulation.viewTransform.createViewTransform(
			displayWidth,
			displayHeight,
			mapBounds
		);

		canvasContext.clearRect(0, 0, displayWidth, displayHeight);
		RoadsSimulation.mapRenderer.drawMap(canvasContext, viewTransform, mapDefinition);
		RoadsSimulation.vehicleRenderer.drawAllVehicles(canvasContext, viewTransform, vehicles);
	}

	function animationLoop(frameTimestamp) {
		if (lastFrameTimestamp === null) {
			lastFrameTimestamp = frameTimestamp;
		}

		const deltaSeconds = Math.min((frameTimestamp - lastFrameTimestamp) / 1000, 0.05);
		lastFrameTimestamp = frameTimestamp;

		try {
			RoadsSimulation.vehicleFleet.updateFleet(
				vehicles,
				mapDefinition,
				deltaSeconds,
				simulationSpeedMultiplier
			);
		} catch (updateError) {
			console.error('Szimuláció frissítési hiba', updateError);
		}

		renderFrame();
		requestAnimationFrame(animationLoop);
	}

	return {
		start: function start() {
			resizeCanvas();
			window.addEventListener('resize', resizeCanvas);
			requestAnimationFrame(animationLoop);
		},
		setSimulationSpeedMultiplier: function setSimulationSpeedMultiplier(multiplier) {
			simulationSpeedMultiplier = multiplier;
		},
	};
};
