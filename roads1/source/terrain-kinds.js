window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.terrainKinds = {
	building: {
		identifier: 'building',
		vehicleAllowed: false,
		pedestrianAllowed: false,
		fillColor: '#7a6a5a',
		strokeColor: '#5a4a3a',
	},
	sidewalk: {
		identifier: 'sidewalk',
		vehicleAllowed: false,
		pedestrianAllowed: true,
		fillColor: '#c8c0b0',
		strokeColor: '#a8a090',
	},
	green: {
		identifier: 'green',
		vehicleAllowed: false,
		pedestrianAllowed: false,
		fillColor: '#4a8c4a',
		strokeColor: '#3a7c3a',
	},
	road: {
		identifier: 'road',
		vehicleAllowed: true,
		pedestrianAllowed: false,
		fillColor: '#505050',
		strokeColor: '#404040',
	},
	outside: {
		identifier: 'outside',
		vehicleAllowed: false,
		pedestrianAllowed: false,
		fillColor: '#2a2a3e',
		strokeColor: '#2a2a3e',
	},
};
