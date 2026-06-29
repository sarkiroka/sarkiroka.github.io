window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.maps = RoadsSimulation.maps || {};

RoadsSimulation.maps.buildingBlockLoop = {
	identifier: 'building-block-loop',
	label: 'Háztömb körüli körforgalom',

	dimensions: {
		sidewalkWidthMeters: 1.5,
		greenWidthMeters: 0.5,
		laneWidthMeters: 3,
		laneCount: 2,
		cornerRadiusMeters: 4,
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

	constructionZones: [
		{
			identifier: 'left-outer-pothole',
			centerXMeters: -29,
			centerYMeters: -8,
			lengthMeters: 2,
			widthMeters: 2,
			barrierLengthMeters: 0.3,
			barrierGapFromPotholeMeters: 0.2,
			potholeLengthMeters: 0.8,
			potholeWidthMeters: 0.85,
		},
	],
};
