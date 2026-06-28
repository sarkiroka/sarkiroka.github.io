window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.positionRecorder = {
	enabled: false,
	intervalSeconds: 0.1,
	elapsedSinceLastSaveSeconds: 0,
	totalSimulationSeconds: 0,
	snapshots: [],

	reset: function reset() {
		RoadsSimulation.positionRecorder.elapsedSinceLastSaveSeconds = 0;
		RoadsSimulation.positionRecorder.totalSimulationSeconds = 0;
		RoadsSimulation.positionRecorder.snapshots = [];
	},

	start: function start() {
		RoadsSimulation.positionRecorder.enabled = true;
		RoadsSimulation.positionRecorder.reset();
	},

	stop: function stop() {
		RoadsSimulation.positionRecorder.enabled = false;
	},

	roundMeters: function roundMeters(value) {
		return Math.round(value * 1000) / 1000;
	},

	captureVehicleState: function captureVehicleState(vehicle) {
		return {
			identifier: vehicle.uniqueIdentifier,
			worldXMeters: RoadsSimulation.positionRecorder.roundMeters(vehicle.worldXMeters),
			worldYMeters: RoadsSimulation.positionRecorder.roundMeters(vehicle.worldYMeters),
			distanceMeters: RoadsSimulation.positionRecorder.roundMeters(vehicle.distanceMeters),
			laneBlendRatio: RoadsSimulation.positionRecorder.roundMeters(vehicle.laneBlendRatio),
			targetLaneBlendRatio: RoadsSimulation.positionRecorder.roundMeters(vehicle.targetLaneBlendRatio),
			speedKilometerPerHour: Math.round(vehicle.speedMeterPerSecond * 3.6),
			drivingMode: vehicle.drivingMode,
			intentLabel: vehicle.intentLabel,
			inCornerZone: RoadsSimulation.routePath.isDistanceInsideCornerZone(
				vehicle.ownLaneRoute,
				vehicle.distanceMeters
			),
		};
	},

	saveSnapshot: function saveSnapshot(vehicles) {
		const snapshot = {
			timeSeconds: RoadsSimulation.positionRecorder.roundMeters(
				RoadsSimulation.positionRecorder.totalSimulationSeconds
			),
			vehicles: vehicles.map(RoadsSimulation.positionRecorder.captureVehicleState),
		};

		RoadsSimulation.positionRecorder.snapshots.push(snapshot);
	},

	updateAfterStep: function updateAfterStep(vehicles, deltaSeconds) {
		if (!RoadsSimulation.positionRecorder.enabled) {
			return;
		}

		RoadsSimulation.positionRecorder.totalSimulationSeconds += deltaSeconds;
		RoadsSimulation.positionRecorder.elapsedSinceLastSaveSeconds += deltaSeconds;

		while (RoadsSimulation.positionRecorder.elapsedSinceLastSaveSeconds
			>= RoadsSimulation.positionRecorder.intervalSeconds) {
			RoadsSimulation.positionRecorder.elapsedSinceLastSaveSeconds
				-= RoadsSimulation.positionRecorder.intervalSeconds;
			RoadsSimulation.positionRecorder.saveSnapshot(vehicles);
		}
	},

	getTraceJson: function getTraceJson() {
		return JSON.stringify({
			intervalSeconds: RoadsSimulation.positionRecorder.intervalSeconds,
			snapshotCount: RoadsSimulation.positionRecorder.snapshots.length,
			snapshots: RoadsSimulation.positionRecorder.snapshots,
		}, null, '\t');
	},

	saveTraceToServer: function saveTraceToServer() {
		return fetch('/save-position-trace', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
			body: RoadsSimulation.positionRecorder.getTraceJson(),
		});
	},
};
