window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleRequestKinds = {
	accelerate: 'accelerate',
	maintainSpeed: 'maintainSpeed',
	decelerate: 'decelerate',
	brakeForCorner: 'brakeForCorner',
	turn: 'turn',
	followVehicle: 'followVehicle',
	overtake: 'overtake',
	returnToLane: 'returnToLane',
	laneChange: 'laneChange',
	yieldToTraffic: 'yieldToTraffic',
	stop: 'stop',
};

RoadsSimulation.vehicleRequestKinds.createRequest = function createRequest(config) {
	return {
		actionKind: config.actionKind,
		targetSpeedMeterPerSecond: config.targetSpeedMeterPerSecond,
		targetLaneBlendRatio: config.targetLaneBlendRatio,
		targetWideLineOutwardRatio: config.targetWideLineOutwardRatio || 0,
		label: config.label,
		allowFullStop: config.allowFullStop === true,
	};
};
