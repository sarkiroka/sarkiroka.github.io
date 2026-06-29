window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.evolutionSettings = {};

RoadsSimulation.evolutionSettings.storageKey = 'roads-evolution-settings-v1';

RoadsSimulation.evolutionSettings.storageVersion = 1;

RoadsSimulation.evolutionSettings.populationSizeMinimum = 10;

RoadsSimulation.evolutionSettings.populationSizeMaximum = 1000;

RoadsSimulation.evolutionSettings.roundDurationMinimumSeconds = 15;

RoadsSimulation.evolutionSettings.roundDurationMaximumSeconds = 3600;

RoadsSimulation.evolutionSettings.roundDurationInfiniteSliderValue = 3601;

RoadsSimulation.evolutionSettings.mutationProbabilityMinimumPercent = 0;

RoadsSimulation.evolutionSettings.mutationProbabilityMaximumPercent = 10;

RoadsSimulation.evolutionSettings.getDefaultSettings = function getDefaultSettings() {
	return {
		populationSize: 100,
		roundDurationSliderValue: 30,
		mutationProbabilityPercent: 3,
	};
};

RoadsSimulation.evolutionSettings.sliderValueToRoundDurationSeconds = function sliderValueToRoundDurationSeconds(
	roundDurationSliderValue
) {
	if (roundDurationSliderValue >= RoadsSimulation.evolutionSettings.roundDurationInfiniteSliderValue) {
		return null;
	}

	return roundDurationSliderValue;
};

RoadsSimulation.evolutionSettings.roundDurationSecondsToSliderValue = function roundDurationSecondsToSliderValue(
	roundDurationSeconds
) {
	if (roundDurationSeconds === null) {
		return RoadsSimulation.evolutionSettings.roundDurationInfiniteSliderValue;
	}

	return roundDurationSeconds;
};

RoadsSimulation.evolutionSettings.formatRoundDurationLabel = function formatRoundDurationLabel(
	roundDurationSliderValue
) {
	if (roundDurationSliderValue >= RoadsSimulation.evolutionSettings.roundDurationInfiniteSliderValue) {
		return 'Végtelen';
	}

	return roundDurationSliderValue + ' s';
};

RoadsSimulation.evolutionSettings.isRoundDurationInfinite = function isRoundDurationInfinite() {
	return RoadsSimulation.evolutionConstants.roundDurationSeconds === null;
};

RoadsSimulation.evolutionSettings.getRoundDurationLimitSeconds = function getRoundDurationLimitSeconds() {
	return RoadsSimulation.evolutionConstants.roundDurationSeconds;
};

RoadsSimulation.evolutionSettings.clampSettings = function clampSettings(settingsValues) {
	const defaultSettings = RoadsSimulation.evolutionSettings.getDefaultSettings();
	const clampedSettings = {
		populationSize: defaultSettings.populationSize,
		roundDurationSliderValue: defaultSettings.roundDurationSliderValue,
		mutationProbabilityPercent: defaultSettings.mutationProbabilityPercent,
	};

	if (typeof settingsValues.populationSize === 'number') {
		clampedSettings.populationSize = Math.min(
			Math.max(
				Math.round(settingsValues.populationSize),
				RoadsSimulation.evolutionSettings.populationSizeMinimum
			),
			RoadsSimulation.evolutionSettings.populationSizeMaximum
		);
	}

	if (typeof settingsValues.roundDurationSliderValue === 'number') {
		const roundedSliderValue = Math.round(settingsValues.roundDurationSliderValue);

		if (roundedSliderValue >= RoadsSimulation.evolutionSettings.roundDurationInfiniteSliderValue) {
			clampedSettings.roundDurationSliderValue = RoadsSimulation.evolutionSettings.roundDurationInfiniteSliderValue;
		} else {
			clampedSettings.roundDurationSliderValue = Math.min(
				Math.max(
					roundedSliderValue,
					RoadsSimulation.evolutionSettings.roundDurationMinimumSeconds
				),
				RoadsSimulation.evolutionSettings.roundDurationMaximumSeconds
			);
		}
	}

	if (typeof settingsValues.mutationProbabilityPercent === 'number') {
		clampedSettings.mutationProbabilityPercent = Math.min(
			Math.max(
				settingsValues.mutationProbabilityPercent,
				RoadsSimulation.evolutionSettings.mutationProbabilityMinimumPercent
			),
			RoadsSimulation.evolutionSettings.mutationProbabilityMaximumPercent
		);
	}

	return clampedSettings;
};

RoadsSimulation.evolutionSettings.applySettingsToConstants = function applySettingsToConstants(settingsValues) {
	const clampedSettings = RoadsSimulation.evolutionSettings.clampSettings(settingsValues);
	const evolutionConstants = RoadsSimulation.evolutionConstants;

	evolutionConstants.populationSize = clampedSettings.populationSize;
	evolutionConstants.roundDurationSeconds = RoadsSimulation.evolutionSettings.sliderValueToRoundDurationSeconds(
		clampedSettings.roundDurationSliderValue
	);
	evolutionConstants.mutationProbability = clampedSettings.mutationProbabilityPercent / 100;

	return clampedSettings;
};

RoadsSimulation.evolutionSettings.getCurrentSettings = function getCurrentSettings() {
	const evolutionConstants = RoadsSimulation.evolutionConstants;

	return {
		populationSize: evolutionConstants.populationSize,
		roundDurationSliderValue: RoadsSimulation.evolutionSettings.roundDurationSecondsToSliderValue(
			evolutionConstants.roundDurationSeconds
		),
		mutationProbabilityPercent: Math.round(evolutionConstants.mutationProbability * 1000) / 10,
	};
};

RoadsSimulation.evolutionSettings.saveStoredSettings = function saveStoredSettings(settingsValues) {
	if (typeof localStorage === 'undefined') {
		return false;
	}

	try {
		const clampedSettings = RoadsSimulation.evolutionSettings.clampSettings(settingsValues);
		const storedSettings = {
			storageVersion: RoadsSimulation.evolutionSettings.storageVersion,
			populationSize: clampedSettings.populationSize,
			roundDurationSliderValue: clampedSettings.roundDurationSliderValue,
			mutationProbabilityPercent: clampedSettings.mutationProbabilityPercent,
		};

		localStorage.setItem(
			RoadsSimulation.evolutionSettings.storageKey,
			JSON.stringify(storedSettings)
		);

		return true;
	} catch (saveError) {
		console.error('Evolúció beállítások mentése sikertelen', {
			message: 'evolution settings save failed',
			error: saveError,
		});

		return false;
	}
};

RoadsSimulation.evolutionSettings.loadStoredSettings = function loadStoredSettings() {
	if (typeof localStorage === 'undefined') {
		return null;
	}

	try {
		const storedSettingsText = localStorage.getItem(RoadsSimulation.evolutionSettings.storageKey);

		if (!storedSettingsText) {
			return null;
		}

		const storedSettings = JSON.parse(storedSettingsText);

		if (!storedSettings || storedSettings.storageVersion !== RoadsSimulation.evolutionSettings.storageVersion) {
			return null;
		}

		return RoadsSimulation.evolutionSettings.clampSettings(storedSettings);
	} catch (loadError) {
		console.error('Evolúció beállítások betöltése sikertelen', {
			message: 'evolution settings load failed',
			error: loadError,
		});

		return null;
	}
};

RoadsSimulation.evolutionSettings.loadAndApplyStoredSettings = function loadAndApplyStoredSettings() {
	const storedSettings = RoadsSimulation.evolutionSettings.loadStoredSettings();

	if (!storedSettings) {
		RoadsSimulation.evolutionSettings.applySettingsToConstants(
			RoadsSimulation.evolutionSettings.getDefaultSettings()
		);
		return RoadsSimulation.evolutionSettings.getCurrentSettings();
	}

	RoadsSimulation.evolutionSettings.applySettingsToConstants(storedSettings);
	return RoadsSimulation.evolutionSettings.getCurrentSettings();
};
