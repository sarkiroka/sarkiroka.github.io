window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.playerVehicleDefinition = {
	identifier: 'player-car',
	displayLabel: 'Te',
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

RoadsSimulation.companionVehicleDefinition = {
	identifier: 'companion-car',
	displayLabel: 'Másik',
	lengthMeters: 3.5,
	widthMeters: 1.5,
	wheelbaseMeters: 2.1,
	rearOverhangMeters: 0.7,
	frontOverhangMeters: 0.7,
	bodyColorOnRoad: '#00c8c8',
	bodyColorOffRoad: '#cc3333',
	bodyStrokeColorOnRoad: '#009e9e',
	bodyStrokeColorOffRoad: '#881111',
	accelerationMetersPerSecondSquared: 3.5,
	coastDecelerationMetersPerSecondSquared: (50 / 3.6) * (50 / 3.6) / (2 * 250),
	activeBrakeDecelerationMetersPerSecondSquared: 7.0,
	maximumSpeedKilometerPerHour: 50,
	maximumReverseSpeedKilometerPerHour: 10,
};

RoadsSimulation.playerVehicleDefinition.maximumSpeedMetersPerSecond =
	RoadsSimulation.playerVehicleDefinition.maximumSpeedKilometerPerHour / 3.6;

RoadsSimulation.playerVehicleDefinition.maximumReverseSpeedMetersPerSecond =
	RoadsSimulation.playerVehicleDefinition.maximumReverseSpeedKilometerPerHour / 3.6;

RoadsSimulation.companionVehicleDefinition.maximumSpeedMetersPerSecond =
	RoadsSimulation.companionVehicleDefinition.maximumSpeedKilometerPerHour / 3.6;

RoadsSimulation.companionVehicleDefinition.maximumReverseSpeedMetersPerSecond =
	RoadsSimulation.companionVehicleDefinition.maximumReverseSpeedKilometerPerHour / 3.6;
