window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.simulationConstants = {
	sightRangeMeters: 45,
	sightHalfAngleRadians: Math.PI / 3,
	overtakeMinimumGapMeters: 8,
	overtakeStartMinimumDistanceMeters: 10,
	overtakeStartMaximumDistanceMeters: 15,
	overtakeMinimumSpeedDifferenceRatio: 0.1,
	overtakeYieldDistanceMeters: 25,
	followingDistanceMeters: 1,
	minimumBumperGapMeters: 1,
	headOnResolveDistanceMeters: 15,
	headOnMinimumGapMeters: 1,
	minimumCrawlSpeedKilometerPerHour: 5,
};

RoadsSimulation.simulationConstants.getMinimumCrawlSpeedMeterPerSecond = function getMinimumCrawlSpeedMeterPerSecond() {
	return RoadsSimulation.simulationConstants.minimumCrawlSpeedKilometerPerHour * 1000 / 3600;
};
