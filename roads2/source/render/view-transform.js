window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.viewTransform = {};

RoadsSimulation.viewTransform.createViewTransform = function createViewTransform(canvasWidth, canvasHeight, mapBounds) {
	const worldWidth = mapBounds.maxXMeters - mapBounds.minXMeters;
	const worldHeight = mapBounds.maxYMeters - mapBounds.minYMeters;
	const scaleX = canvasWidth / worldWidth;
	const scaleY = canvasHeight / worldHeight;
	const pixelsPerMeter = Math.min(scaleX, scaleY) * 0.95;
	const worldCenterX = (mapBounds.minXMeters + mapBounds.maxXMeters) / 2;
	const worldCenterY = (mapBounds.minYMeters + mapBounds.maxYMeters) / 2;

	return {
		pixelsPerMeter: pixelsPerMeter,
		canvasWidth: canvasWidth,
		canvasHeight: canvasHeight,
		worldToScreen: function worldToScreen(worldXMeters, worldYMeters) {
			const screenX = canvasWidth / 2 + (worldXMeters - worldCenterX) * pixelsPerMeter;
			const screenY = canvasHeight / 2 + (worldYMeters - worldCenterY) * pixelsPerMeter;
			return { x: screenX, y: screenY };
		},
		metersToPixels: function metersToPixels(meters) {
			return meters * pixelsPerMeter;
		},
	};
};
