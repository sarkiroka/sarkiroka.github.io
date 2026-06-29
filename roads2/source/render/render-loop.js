window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.renderLoop = {};

RoadsSimulation.renderLoop.createRenderLoop = function createRenderLoop(canvasElement, mapDefinition, vehicleFleet, playerVehicle, userInputListener) {
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

		const inputState = userInputListener.getInputState();

		RoadsSimulation.vehicleUpdate.queryVehicleTick(
			playerVehicle,
			inputState,
			mapDefinition,
			mapBounds,
			deltaSeconds,
			vehicleFleet
		);

		for (let vehicleIndex = 0; vehicleIndex < vehicleFleet.length; vehicleIndex += 1) {
			const vehicle = vehicleFleet[vehicleIndex];

			if (vehicle === playerVehicle) {
				continue;
			}

			RoadsSimulation.vehicleUpdate.queryStaticVehicleTick(vehicle, mapDefinition, vehicleFleet);
		}

		const viewTransform = RoadsSimulation.viewTransform.createViewTransform(
			displayWidth,
			displayHeight,
			mapBounds
		);

		canvasContext.clearRect(0, 0, displayWidth, displayHeight);
		RoadsSimulation.mapRenderer.drawMap(canvasContext, viewTransform, mapDefinition);

		for (let vehicleIndex = 0; vehicleIndex < vehicleFleet.length; vehicleIndex += 1) {
			RoadsSimulation.vehicleRenderer.drawVehicle(canvasContext, viewTransform, vehicleFleet[vehicleIndex]);
		}

		RoadsSimulation.hudRenderer.drawDistanceOverlay(canvasContext, vehicleFleet);
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
