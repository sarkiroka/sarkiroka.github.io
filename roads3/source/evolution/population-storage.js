window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.populationStorage = {};

RoadsSimulation.populationStorage.storageKey = 'roads-evolution-population-v1';

RoadsSimulation.populationStorage.storageVersion = 1;

function serializeIndividual(individual) {
	const vehicle = individual.vehicle;

	return {
		identifier: individual.identifier,
		genomeValues: Array.from(individual.genome),
		isAlive: individual.isAlive,
		fitnessMeters: individual.fitnessMeters,
		vehicle: {
			rearAxleXMeters: vehicle.rearAxleXMeters,
			rearAxleYMeters: vehicle.rearAxleYMeters,
			headingRadians: vehicle.headingRadians,
			speedMetersPerSecond: vehicle.speedMetersPerSecond,
			frontWheelSteerAngleRadians: vehicle.frontWheelSteerAngleRadians,
			traveledDistanceMeters: vehicle.traveledDistanceMeters,
			brakeLightActive: vehicle.brakeLightActive === true,
			reverseLightActive: vehicle.reverseLightActive === true,
			isOnRoad: vehicle.isOnRoad !== false,
			constructionContactActive: vehicle.constructionContactActive === true,
		},
	};
}

function isValidSavedIndividual(savedIndividual, expectedGenomeLength) {
	if (!savedIndividual || !Array.isArray(savedIndividual.genomeValues)) {
		return false;
	}

	if (savedIndividual.genomeValues.length !== expectedGenomeLength) {
		return false;
	}

	if (!savedIndividual.vehicle) {
		return false;
	}

	for (let weightIndex = 0; weightIndex < savedIndividual.genomeValues.length; weightIndex += 1) {
		if (typeof savedIndividual.genomeValues[weightIndex] !== 'number') {
			return false;
		}
	}

	return true;
}

RoadsSimulation.populationStorage.savePopulationState = function savePopulationState(
	generationNumber,
	roundElapsedSeconds,
	populationIndividuals
) {
	if (typeof localStorage === 'undefined') {
		return false;
	}

	try {
		const savedIndividuals = [];

		for (let individualIndex = 0; individualIndex < populationIndividuals.length; individualIndex += 1) {
			savedIndividuals.push(serializeIndividual(populationIndividuals[individualIndex]));
		}

		const savedPopulationState = {
			storageVersion: RoadsSimulation.populationStorage.storageVersion,
			generationNumber: generationNumber,
			roundElapsedSeconds: roundElapsedSeconds,
			savedIndividuals: savedIndividuals,
		};

		localStorage.setItem(
			RoadsSimulation.populationStorage.storageKey,
			JSON.stringify(savedPopulationState)
		);

		return true;
	} catch (saveError) {
		console.error('Populáció mentése sikertelen', {
			message: 'population storage save failed',
			error: saveError,
		});

		return false;
	}
};

RoadsSimulation.populationStorage.loadPopulationState = function loadPopulationState() {
	if (typeof localStorage === 'undefined') {
		return null;
	}

	try {
		const savedPopulationText = localStorage.getItem(RoadsSimulation.populationStorage.storageKey);

		if (!savedPopulationText) {
			return null;
		}

		const savedPopulationState = JSON.parse(savedPopulationText);
		const expectedPopulationSize = RoadsSimulation.evolutionConstants.populationSize;
		const expectedGenomeLength = RoadsSimulation.drivingNetwork.genomeLength;

		if (!savedPopulationState || savedPopulationState.storageVersion !== RoadsSimulation.populationStorage.storageVersion) {
			return null;
		}

		if (!Array.isArray(savedPopulationState.savedIndividuals)) {
			return null;
		}

		if (savedPopulationState.savedIndividuals.length !== expectedPopulationSize) {
			return null;
		}

		for (let individualIndex = 0; individualIndex < savedPopulationState.savedIndividuals.length; individualIndex += 1) {
			if (!isValidSavedIndividual(savedPopulationState.savedIndividuals[individualIndex], expectedGenomeLength)) {
				return null;
			}
		}

		if (typeof savedPopulationState.generationNumber !== 'number') {
			return null;
		}

		if (typeof savedPopulationState.roundElapsedSeconds !== 'number') {
			return null;
		}

		return savedPopulationState;
	} catch (loadError) {
		console.error('Populáció betöltése sikertelen', {
			message: 'population storage load failed',
			error: loadError,
		});

		return null;
	}
};

RoadsSimulation.populationStorage.clearPopulationState = function clearPopulationState() {
	if (typeof localStorage === 'undefined') {
		return false;
	}

	try {
		localStorage.removeItem(RoadsSimulation.populationStorage.storageKey);
		return true;
	} catch (clearError) {
		console.error('Populáció törlése sikertelen', {
			message: 'population storage clear failed',
			error: clearError,
		});

		return false;
	}
};

RoadsSimulation.populationStorage.createPopulationStorageListener = function createPopulationStorageListener(
	roundController,
	getPopulationIndividuals
) {
	let lastSaveTimestampMilliseconds = 0;
	const saveIntervalMilliseconds = 2000;

	function saveCurrentPopulationState() {
		RoadsSimulation.populationStorage.savePopulationState(
			roundController.getGenerationNumber(),
			roundController.getRoundElapsedSeconds(),
			getPopulationIndividuals()
		);
		lastSaveTimestampMilliseconds = Date.now();
	}

	function handleBeforeUnload() {
		saveCurrentPopulationState();
	}

	function handleVisibilityChange() {
		if (document.visibilityState === 'hidden') {
			saveCurrentPopulationState();
		}
	}

	window.addEventListener('beforeunload', handleBeforeUnload);
	document.addEventListener('visibilitychange', handleVisibilityChange);

	return {
		saveIfNeeded: function saveIfNeeded() {
			const currentTimestampMilliseconds = Date.now();

			if (currentTimestampMilliseconds - lastSaveTimestampMilliseconds >= saveIntervalMilliseconds) {
				saveCurrentPopulationState();
			}
		},
		saveNow: saveCurrentPopulationState,
		destroy: function destroy() {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		},
	};
};
