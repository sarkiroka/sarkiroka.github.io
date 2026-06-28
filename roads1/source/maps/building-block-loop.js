window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.maps = RoadsSimulation.maps || {};

RoadsSimulation.maps.buildingBlockLoop = {
	identifier: 'building-block-loop',
	label: 'Háztömb körüli körforgalom',

	worldSpeedLimitKilometerPerHour: 50,

	dimensions: {
		sidewalkWidthMeters: 1.5,
		greenWidthMeters: 0.5,
		laneWidthMeters: 3,
		laneCount: 2,
	},

	buildingBlocks: [
		{
			identifier: 'main-building',
			centerXMeters: 0,
			centerYMeters: 0,
			widthMeters: 45,
			heightMeters: 45,
		},
	],

	routes: [
		{
			identifier: 'clockwise-right-lane',
			label: 'Óramutató járása, jobb oldali sáv',
			direction: 'clockwise',
			laneSide: 'right',
			vehicleAllowed: true,
		},
		{
			identifier: 'counterclockwise-right-lane',
			label: 'Óramutató járása ellen, jobb oldali sáv',
			direction: 'counterclockwise',
			laneSide: 'left',
			vehicleAllowed: true,
		},
	],

	pedestrianPaths: [],
};
