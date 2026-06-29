window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.populationIndividual = {};

function createIndividualIdentifier() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	let randomSuffix = '';

	for (let characterIndex = 0; characterIndex < 32; characterIndex += 1) {
		randomSuffix += Math.floor(Math.random() * 16).toString(16);
	}

	return randomSuffix;
}

function createPopulationVehicle(mapDefinition) {
	const vehicle = RoadsSimulation.vehicleState.createPlayerVehicle(
		mapDefinition,
		RoadsSimulation.evolutionVehicleDefinition
	);

	vehicle.populationMember = true;

	return vehicle;
}

RoadsSimulation.populationIndividual.createRandomIndividual = function createRandomIndividual(mapDefinition) {
	return {
		identifier: createIndividualIdentifier(),
		genome: RoadsSimulation.genome.createRandomGenome(),
		vehicle: createPopulationVehicle(mapDefinition),
		isAlive: true,
		fitnessMeters: 0,
		neuralInput: RoadsSimulation.vehiclePerception.createEmptyNeuralInput(),
		controlOutput: { X: 0, Y: 0 },
	};
};

RoadsSimulation.populationIndividual.createIndividualFromGenome = function createIndividualFromGenome(mapDefinition, genomeValues) {
	return {
		identifier: createIndividualIdentifier(),
		genome: RoadsSimulation.genome.cloneGenome(genomeValues),
		vehicle: createPopulationVehicle(mapDefinition),
		isAlive: true,
		fitnessMeters: 0,
		neuralInput: RoadsSimulation.vehiclePerception.createEmptyNeuralInput(),
		controlOutput: { X: 0, Y: 0 },
	};
};

RoadsSimulation.populationIndividual.createIndividualFromSavedRecord = function createIndividualFromSavedRecord(
	mapDefinition,
	savedIndividual
) {
	const genomeValues = new Float32Array(savedIndividual.genomeValues);
	const vehicle = createPopulationVehicle(mapDefinition);
	const savedVehicle = savedIndividual.vehicle;

	vehicle.rearAxleXMeters = savedVehicle.rearAxleXMeters;
	vehicle.rearAxleYMeters = savedVehicle.rearAxleYMeters;
	vehicle.headingRadians = savedVehicle.headingRadians;
	vehicle.speedMetersPerSecond = savedVehicle.speedMetersPerSecond;
	vehicle.frontWheelSteerAngleRadians = savedVehicle.frontWheelSteerAngleRadians;
	vehicle.traveledDistanceMeters = savedVehicle.traveledDistanceMeters;
	vehicle.brakeLightActive = savedVehicle.brakeLightActive === true;
	vehicle.reverseLightActive = savedVehicle.reverseLightActive === true;
	vehicle.isOnRoad = savedVehicle.isOnRoad !== false;
	vehicle.constructionContactActive = savedVehicle.constructionContactActive === true;

	return {
		identifier: savedIndividual.identifier || createIndividualIdentifier(),
		genome: genomeValues,
		vehicle: vehicle,
		isAlive: savedIndividual.isAlive === true,
		fitnessMeters: savedIndividual.fitnessMeters,
		neuralInput: RoadsSimulation.vehiclePerception.createEmptyNeuralInput(),
		controlOutput: { X: 0, Y: 0 },
	};
};

RoadsSimulation.populationIndividual.createPopulationFromSavedState = function createPopulationFromSavedState(
	mapDefinition,
	savedPopulationState
) {
	const populationIndividuals = [];

	for (let individualIndex = 0; individualIndex < savedPopulationState.savedIndividuals.length; individualIndex += 1) {
		populationIndividuals.push(
			RoadsSimulation.populationIndividual.createIndividualFromSavedRecord(
				mapDefinition,
				savedPopulationState.savedIndividuals[individualIndex]
			)
		);
	}

	return populationIndividuals;
};

RoadsSimulation.populationIndividual.resetIndividualForRound = function resetIndividualForRound(individual, mapDefinition) {
	individual.vehicle = createPopulationVehicle(mapDefinition);
	individual.isAlive = true;
	individual.fitnessMeters = 0;
	individual.neuralInput = RoadsSimulation.vehiclePerception.createEmptyNeuralInput();
	individual.controlOutput = { X: 0, Y: 0 };
};

RoadsSimulation.populationIndividual.createInitialPopulation = function createInitialPopulation(mapDefinition) {
	const populationSize = RoadsSimulation.evolutionConstants.populationSize;
	const populationIndividuals = [];

	for (let individualIndex = 0; individualIndex < populationSize; individualIndex += 1) {
		populationIndividuals.push(RoadsSimulation.populationIndividual.createRandomIndividual(mapDefinition));
	}

	return populationIndividuals;
};

RoadsSimulation.populationIndividual.getVehicleFleetFromPopulation = function getVehicleFleetFromPopulation(
	populationIndividuals,
	environmentVehicles
) {
	const vehicleFleet = [];

	for (let environmentIndex = 0; environmentIndex < environmentVehicles.length; environmentIndex += 1) {
		vehicleFleet.push(environmentVehicles[environmentIndex]);
	}

	for (let individualIndex = 0; individualIndex < populationIndividuals.length; individualIndex += 1) {
		const individual = populationIndividuals[individualIndex];

		if (individual.isAlive) {
			vehicleFleet.push(individual.vehicle);
		}
	}

	return vehicleFleet;
};

RoadsSimulation.populationIndividual.findTopIndividual = function findTopIndividual(populationIndividuals) {
	const rankedAliveIndividuals = RoadsSimulation.populationIndividual.getAliveIndividualsByDistanceRank(
		populationIndividuals
	);

	if (rankedAliveIndividuals.length === 0) {
		return null;
	}

	return rankedAliveIndividuals[0];
};

RoadsSimulation.populationIndividual.getAliveIndividualsByDistanceRank = function getAliveIndividualsByDistanceRank(
	populationIndividuals
) {
	const aliveIndividuals = [];

	for (let individualIndex = 0; individualIndex < populationIndividuals.length; individualIndex += 1) {
		const individual = populationIndividuals[individualIndex];

		if (individual.isAlive) {
			aliveIndividuals.push(individual);
		}
	}

	aliveIndividuals.sort(function compareTraveledDistance(firstIndividual, secondIndividual) {
		return secondIndividual.vehicle.traveledDistanceMeters - firstIndividual.vehicle.traveledDistanceMeters;
	});

	return aliveIndividuals;
};

RoadsSimulation.populationIndividual.getVehicleOpacityForDistanceRank = function getVehicleOpacityForDistanceRank(
	distanceRankIndex
) {
	if (distanceRankIndex <= 0) {
		return 1;
	}

	const rankedVehicleOpacity = Math.pow(
		RoadsSimulation.evolutionConstants.distanceRankOpacityHalvingRatio,
		distanceRankIndex
	);

	return Math.max(rankedVehicleOpacity, RoadsSimulation.evolutionConstants.minimumVehicleOpacity);
};

RoadsSimulation.populationIndividual.countAliveIndividuals = function countAliveIndividuals(populationIndividuals) {
	let aliveCount = 0;

	for (let individualIndex = 0; individualIndex < populationIndividuals.length; individualIndex += 1) {
		if (populationIndividuals[individualIndex].isAlive) {
			aliveCount += 1;
		}
	}

	return aliveCount;
};

RoadsSimulation.populationIndividual.syncFitnessFromVehicle = function syncFitnessFromVehicle(individual) {
	individual.fitnessMeters = individual.vehicle.traveledDistanceMeters;
};
