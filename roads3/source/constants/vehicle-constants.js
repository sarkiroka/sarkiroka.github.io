window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleConstants = {
	maximumFrontWheelSteerAngleRadians: 32 * Math.PI / 180,
	frontWheelSteerChangeRateRadiansPerSecond: 1.8,
	frontWheelSteerReturnRateRadiansPerSecond: 2.2,
	minimumSpeedBeforeStopMetersPerSecond: 0.02,
	minimumSpeedBeforeMovementMetersPerSecond: 0.005,
};
