window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.evolutionConstants = {
	populationSize: 100,
	roundDurationSeconds: 30,
	mutationProbability: 0.03,
	mutationMaximumMagnitude: 0.3,
	guaranteedSurvivorCount: 3,
	eliminationFraction: 0.5,
	parentFitnessWeightExponent: 2,
	topLeaderForcedParentProbability: 0.7,
	topLeaderCrossoverGeneRatio: 0.75,
	initialWeightMinimum: -1,
	initialWeightMaximum: 1,
	distanceRankOpacityHalvingRatio: 0.5,
	minimumVehicleOpacity: 0.06,
	neuralControlDeadZone: 0.15,
};
