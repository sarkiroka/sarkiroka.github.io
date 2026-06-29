window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.generationCycle = {};

function sortIndividualsByFitness(populationIndividuals) {
	const rankedIndividuals = populationIndividuals.slice();

	rankedIndividuals.sort(function compareFitness(firstIndividual, secondIndividual) {
		const firstFitnessMeters = firstIndividual.isAlive
			? firstIndividual.vehicle.traveledDistanceMeters
			: firstIndividual.fitnessMeters;
		const secondFitnessMeters = secondIndividual.isAlive
			? secondIndividual.vehicle.traveledDistanceMeters
			: secondIndividual.fitnessMeters;

		return secondFitnessMeters - firstFitnessMeters;
	});

	return rankedIndividuals;
}

function getEliminationWeight(rankIndex) {
	if (rankIndex < RoadsSimulation.evolutionConstants.guaranteedSurvivorCount) {
		return 0;
	}

	const rankOffset = rankIndex - (RoadsSimulation.evolutionConstants.guaranteedSurvivorCount - 1);
	return rankOffset * rankOffset;
}

function selectEliminatedRankIndexes(rankedIndividuals) {
	const evolutionConstants = RoadsSimulation.evolutionConstants;
	const eliminationCount = Math.floor(rankedIndividuals.length * evolutionConstants.eliminationFraction);
	const candidateRankIndexes = [];
	const candidateWeights = [];
	let totalWeight = 0;

	for (
		let rankIndex = evolutionConstants.guaranteedSurvivorCount;
		rankIndex < rankedIndividuals.length;
		rankIndex += 1
	) {
		const eliminationWeight = getEliminationWeight(rankIndex);

		candidateRankIndexes.push(rankIndex);
		candidateWeights.push(eliminationWeight);
		totalWeight += eliminationWeight;
	}

	const eliminatedRankIndexes = [];
	const remainingCandidateIndexes = candidateRankIndexes.slice();
	const remainingCandidateWeights = candidateWeights.slice();
	let remainingTotalWeight = totalWeight;
	let remainingEliminationCount = Math.max(eliminationCount, 0);

	while (
		remainingEliminationCount > 0
		&& remainingCandidateIndexes.length > 0
		&& remainingTotalWeight > 0
	) {
		const randomTarget = Math.random() * remainingTotalWeight;
		let accumulatedWeight = 0;
		let selectedCandidateIndex = remainingCandidateIndexes.length - 1;

		for (let candidateIndex = 0; candidateIndex < remainingCandidateIndexes.length; candidateIndex += 1) {
			accumulatedWeight += remainingCandidateWeights[candidateIndex];

			if (randomTarget <= accumulatedWeight) {
				selectedCandidateIndex = candidateIndex;
				break;
			}
		}

		eliminatedRankIndexes.push(remainingCandidateIndexes[selectedCandidateIndex]);
		remainingTotalWeight -= remainingCandidateWeights[selectedCandidateIndex];
		remainingCandidateIndexes.splice(selectedCandidateIndex, 1);
		remainingCandidateWeights.splice(selectedCandidateIndex, 1);
		remainingEliminationCount -= 1;
	}

	return eliminatedRankIndexes;
}

function selectParentByFitness(survivorIndividuals) {
	const parentFitnessWeightExponent = RoadsSimulation.evolutionConstants.parentFitnessWeightExponent;
	let totalParentWeight = 0;
	const parentWeights = [];

	for (let survivorIndex = 0; survivorIndex < survivorIndividuals.length; survivorIndex += 1) {
		const fitnessMeters = Math.max(survivorIndividuals[survivorIndex].fitnessMeters, 0.001);
		const parentWeight = Math.pow(fitnessMeters, parentFitnessWeightExponent);

		parentWeights.push(parentWeight);
		totalParentWeight += parentWeight;
	}

	const randomTarget = Math.random() * totalParentWeight;
	let accumulatedParentWeight = 0;

	for (let survivorIndex = 0; survivorIndex < survivorIndividuals.length; survivorIndex += 1) {
		accumulatedParentWeight += parentWeights[survivorIndex];

		if (randomTarget <= accumulatedParentWeight) {
			return survivorIndividuals[survivorIndex];
		}
	}

	return survivorIndividuals[survivorIndividuals.length - 1];
}

function createChildFromSurvivors(mapDefinition, survivorIndividuals) {
	const evolutionConstants = RoadsSimulation.evolutionConstants;
	const topLeaderIndividual = survivorIndividuals[0];
	let firstParent = null;
	let secondParent = null;
	let favoredFirstParentGeneRatio = 0.5;

	if (Math.random() < evolutionConstants.topLeaderForcedParentProbability) {
		firstParent = topLeaderIndividual;
		secondParent = selectParentByFitness(survivorIndividuals);
		favoredFirstParentGeneRatio = evolutionConstants.topLeaderCrossoverGeneRatio;
	} else {
		firstParent = selectParentByFitness(survivorIndividuals);
		secondParent = selectParentByFitness(survivorIndividuals);

		const firstParentFitnessMeters = Math.max(firstParent.fitnessMeters, 0.001);
		const secondParentFitnessMeters = Math.max(secondParent.fitnessMeters, 0.001);

		favoredFirstParentGeneRatio = firstParentFitnessMeters / (firstParentFitnessMeters + secondParentFitnessMeters);
	}

	const childGenome = RoadsSimulation.genome.crossover(
		firstParent.genome,
		secondParent.genome,
		favoredFirstParentGeneRatio
	);
	RoadsSimulation.genome.mutate(childGenome);

	return RoadsSimulation.populationIndividual.createIndividualFromGenome(mapDefinition, childGenome);
}

RoadsSimulation.generationCycle.createRoundController = function createRoundController(mapDefinition, savedPopulationState) {
	let generationNumber = 1;
	let populationIndividuals = RoadsSimulation.populationIndividual.createInitialPopulation(mapDefinition);
	let roundElapsedSeconds = 0;
	let onPopulationSaved = null;

	if (savedPopulationState) {
		generationNumber = savedPopulationState.generationNumber;
		roundElapsedSeconds = savedPopulationState.roundElapsedSeconds;
		populationIndividuals = RoadsSimulation.populationIndividual.createPopulationFromSavedState(
			mapDefinition,
			savedPopulationState
		);
	}

	function persistPopulationState() {
		RoadsSimulation.populationStorage.savePopulationState(
			generationNumber,
			roundElapsedSeconds,
			populationIndividuals
		);

		if (typeof onPopulationSaved === 'function') {
			onPopulationSaved();
		}
	}

	function finalizeRoundFitness() {
		for (let individualIndex = 0; individualIndex < populationIndividuals.length; individualIndex += 1) {
			const individual = populationIndividuals[individualIndex];

			if (individual.isAlive) {
				RoadsSimulation.populationIndividual.syncFitnessFromVehicle(individual);
			}
		}
	}

	function startNextRound() {
		for (let individualIndex = 0; individualIndex < populationIndividuals.length; individualIndex += 1) {
			RoadsSimulation.populationIndividual.resetIndividualForRound(
				populationIndividuals[individualIndex],
				mapDefinition
			);
		}

		roundElapsedSeconds = 0;
	}

	function advanceGeneration() {
		finalizeRoundFitness();

		const rankedIndividuals = sortIndividualsByFitness(populationIndividuals);
		const eliminatedRankIndexes = selectEliminatedRankIndexes(rankedIndividuals);
		const eliminatedRankIndexLookup = {};

		for (let eliminatedIndex = 0; eliminatedIndex < eliminatedRankIndexes.length; eliminatedIndex += 1) {
			eliminatedRankIndexLookup[eliminatedRankIndexes[eliminatedIndex]] = true;
		}

		const survivorIndividuals = [];

		for (let rankIndex = 0; rankIndex < rankedIndividuals.length; rankIndex += 1) {
			if (!eliminatedRankIndexLookup[rankIndex]) {
				survivorIndividuals.push(rankedIndividuals[rankIndex]);
			}
		}

		const nextPopulationIndividuals = [];

		for (let survivorIndex = 0; survivorIndex < survivorIndividuals.length; survivorIndex += 1) {
			nextPopulationIndividuals.push(
				RoadsSimulation.populationIndividual.createIndividualFromGenome(
					mapDefinition,
					survivorIndividuals[survivorIndex].genome
				)
			);
		}

		while (nextPopulationIndividuals.length < RoadsSimulation.evolutionConstants.populationSize) {
			nextPopulationIndividuals.push(createChildFromSurvivors(mapDefinition, survivorIndividuals));
		}

		populationIndividuals = nextPopulationIndividuals;
		generationNumber += 1;
		startNextRound();
		persistPopulationState();
	}

	function resetToFreshPopulation() {
		generationNumber = 1;
		populationIndividuals = RoadsSimulation.populationIndividual.createInitialPopulation(mapDefinition);
		roundElapsedSeconds = 0;
		RoadsSimulation.populationStorage.clearPopulationState();
	}

	return {
		setOnPopulationSaved: function setOnPopulationSaved(saveCallback) {
			onPopulationSaved = saveCallback;
		},
		resetToFreshPopulation: resetToFreshPopulation,
		persistPopulationState: persistPopulationState,
		getGenerationNumber: function getGenerationNumber() {
			return generationNumber;
		},
		getPopulationIndividuals: function getPopulationIndividuals() {
			return populationIndividuals;
		},
		getRoundElapsedSeconds: function getRoundElapsedSeconds() {
			return roundElapsedSeconds;
		},
		tick: function tick(deltaSeconds, environmentVehicles, mapBounds) {
			if (deltaSeconds <= 0) {
				return;
			}

			roundElapsedSeconds += deltaSeconds;

			const aliveCountBeforeTick = RoadsSimulation.populationIndividual.countAliveIndividuals(populationIndividuals);

			if (aliveCountBeforeTick === 0) {
				advanceGeneration();
				return;
			}

			const vehicleFleet = RoadsSimulation.populationIndividual.getVehicleFleetFromPopulation(
				populationIndividuals,
				environmentVehicles
			);

			for (let individualIndex = 0; individualIndex < populationIndividuals.length; individualIndex += 1) {
				const individual = populationIndividuals[individualIndex];

				if (!individual.isAlive) {
					continue;
				}

				individual.neuralInput = RoadsSimulation.vehiclePerception.computeNeuralInput(
					individual.vehicle,
					vehicleFleet,
					mapDefinition
				);
				individual.controlOutput = RoadsSimulation.drivingNetwork.forward(
					individual.genome,
					individual.neuralInput
				);

				const inputState = RoadsSimulation.controlOutputAdapter.toInputState(individual.controlOutput);
				const eliminationResult = RoadsSimulation.vehicleUpdate.queryNeuralVehicleTick(
					individual.vehicle,
					inputState,
					mapDefinition,
					mapBounds,
					deltaSeconds,
					vehicleFleet
				);

				if (eliminationResult.isEliminated) {
					individual.isAlive = false;
					RoadsSimulation.populationIndividual.syncFitnessFromVehicle(individual);
					individual.vehicle.speedMetersPerSecond = 0;
				}
			}

			const aliveCountAfterTick = RoadsSimulation.populationIndividual.countAliveIndividuals(populationIndividuals);
			const roundDurationLimitSeconds = RoadsSimulation.evolutionSettings.getRoundDurationLimitSeconds();
			const isRoundOverByTime = roundDurationLimitSeconds !== null
				&& roundElapsedSeconds >= roundDurationLimitSeconds;

			if (isRoundOverByTime || aliveCountAfterTick === 0) {
				advanceGeneration();
			}
		},
	};
};
