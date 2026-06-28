window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.physicsConstants = {
	gripLateralAccelerationMeterPerSecondSquared: 5.5,
	cornerTurnRadiusMeters: 4,
	cornerZoneRadiusMeters: 4,
	cornerBrakeDistanceMeters: 24,
	cornerWideLineApproachMeters: 18,
	cornerSteeringAnticipationMeters: 14,
	cornerLookAheadMeters: 30,
	maxAccelerationMeterPerSecondSquared: 2.8,
	maxBrakingMeterPerSecondSquared: 7,
	skidRecoverySpeedFactor: 0.85,
	skidLateralDriftMeterPerSecond: 1.2,
	laneChangeDurationSeconds: 1.8,
};
