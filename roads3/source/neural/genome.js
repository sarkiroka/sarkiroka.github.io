window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.genome = {};

RoadsSimulation.genome.createRandomGenome = function createRandomGenome() {
	const genomeLength = RoadsSimulation.drivingNetwork.genomeLength;
	const evolutionConstants = RoadsSimulation.evolutionConstants;
	const genomeValues = new Float32Array(genomeLength);

	for (let weightIndex = 0; weightIndex < genomeLength; weightIndex += 1) {
		const randomRatio = Math.random();
		genomeValues[weightIndex] = evolutionConstants.initialWeightMinimum
			+ randomRatio * (evolutionConstants.initialWeightMaximum - evolutionConstants.initialWeightMinimum);
	}

	return genomeValues;
};

RoadsSimulation.genome.cloneGenome = function cloneGenome(sourceGenome) {
	return new Float32Array(sourceGenome);
};

RoadsSimulation.genome.crossover = function crossover(
	firstParentGenome,
	secondParentGenome,
	favoredFirstParentGeneRatio
) {
	const genomeLength = RoadsSimulation.drivingNetwork.genomeLength;
	const childGenome = new Float32Array(genomeLength);
	const firstParentGeneRatio = typeof favoredFirstParentGeneRatio === 'number'
		? Math.min(Math.max(favoredFirstParentGeneRatio, 0), 1)
		: 0.5;

	for (let weightIndex = 0; weightIndex < genomeLength; weightIndex += 1) {
		if (Math.random() < firstParentGeneRatio) {
			childGenome[weightIndex] = firstParentGenome[weightIndex];
		} else {
			childGenome[weightIndex] = secondParentGenome[weightIndex];
		}
	}

	return childGenome;
};

RoadsSimulation.genome.mutate = function mutate(genomeValues) {
	const evolutionConstants = RoadsSimulation.evolutionConstants;
	const mutationProbability = evolutionConstants.mutationProbability;
	const mutationMaximumMagnitude = evolutionConstants.mutationMaximumMagnitude;

	for (let weightIndex = 0; weightIndex < genomeValues.length; weightIndex += 1) {
		if (Math.random() >= mutationProbability) {
			continue;
		}

		const mutationDelta = (Math.random() * 2 - 1) * mutationMaximumMagnitude;
		genomeValues[weightIndex] += mutationDelta;
	}

	return genomeValues;
};
