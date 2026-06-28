window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.vehicleIntent = {};

RoadsSimulation.vehicleIntent.formatSpeedLine = function formatSpeedLine(vehicle) {
	const speedKilometerPerHour = Math.round(vehicle.speedMeterPerSecond * 3.6);
	return speedKilometerPerHour + ' km/h';
};

RoadsSimulation.vehicleIntent.formatAccelerateLabel = function formatAccelerateLabel(speedKilometerPerHour) {
	return 'Gyorsítás ' + Math.round(speedKilometerPerHour) + ' km/h-ig';
};

RoadsSimulation.vehicleIntent.formatBrakeForCornerLabel = function formatBrakeForCornerLabel(speedKilometerPerHour) {
	return 'Fékezés kanyarra: ' + Math.round(speedKilometerPerHour) + ' km/h';
};

RoadsSimulation.vehicleIntent.formatTurnLabel = function formatTurnLabel(speedKilometerPerHour) {
	return 'Kanyarodás: ' + Math.round(speedKilometerPerHour) + ' km/h';
};

RoadsSimulation.vehicleIntent.formatWideCornerLabel = function formatWideCornerLabel() {
	return 'Tág ívű kanyar';
};

RoadsSimulation.vehicleIntent.formatCruiseLabel = function formatCruiseLabel(speedKilometerPerHour) {
	return 'Haladás ' + Math.round(speedKilometerPerHour) + ' km/h-on';
};

RoadsSimulation.vehicleIntent.formatFollowingLabel = function formatFollowingLabel() {
	return 'Követés';
};

RoadsSimulation.vehicleIntent.formatOvertakeLabel = function formatOvertakeLabel() {
	return 'Előzés';
};

RoadsSimulation.vehicleIntent.formatReturnToLaneLabel = function formatReturnToLaneLabel() {
	return 'Visszatérés saját sávba';
};

RoadsSimulation.vehicleIntent.formatYieldLabel = function formatYieldLabel() {
	return 'Fékezés, sávvisszatérés';
};

RoadsSimulation.vehicleIntent.formatLaneChangeLabel = function formatLaneChangeLabel() {
	return 'Sávváltás';
};

RoadsSimulation.vehicleIntent.formatHeadOnStopLabel = function formatHeadOnStopLabel() {
	return 'Megállás szembejövő miatt';
};

RoadsSimulation.vehicleIntent.formatLetVehicleMergeLabel = function formatLetVehicleMergeLabel() {
	return 'Beengetés, lassítás';
};
