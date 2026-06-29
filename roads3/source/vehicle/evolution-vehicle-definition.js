window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.evolutionVehicleDefinition = {
	identifier: 'evolution-car',
	displayLabel: 'Evolúció',
	lengthMeters: 3.5,
	widthMeters: 1.5,
	wheelbaseMeters: 2.1,
	rearOverhangMeters: 0.7,
	frontOverhangMeters: 0.7,
	bodyColorOnRoad: '#47a3ff',
	bodyColorOffRoad: '#cc3333',
	bodyStrokeColorOnRoad: '#2d7fd6',
	bodyStrokeColorOffRoad: '#881111',
	accelerationMetersPerSecondSquared: 3.5,
	coastDecelerationMetersPerSecondSquared: (50 / 3.6) * (50 / 3.6) / (2 * 250),
	activeBrakeDecelerationMetersPerSecondSquared: 7.0,
	maximumSpeedKilometerPerHour: 50,
	maximumReverseSpeedKilometerPerHour: 10,
};

RoadsSimulation.evolutionVehicleDefinition.maximumSpeedMetersPerSecond =
	RoadsSimulation.evolutionVehicleDefinition.maximumSpeedKilometerPerHour / 3.6;

RoadsSimulation.evolutionVehicleDefinition.maximumReverseSpeedMetersPerSecond =
	RoadsSimulation.evolutionVehicleDefinition.maximumReverseSpeedKilometerPerHour / 3.6;
