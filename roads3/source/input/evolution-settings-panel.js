window.RoadsSimulation = window.RoadsSimulation || {};

RoadsSimulation.evolutionSettingsPanel = {};

RoadsSimulation.evolutionSettingsPanel.createEvolutionSettingsPanel = function createEvolutionSettingsPanel(
	roundController,
	populationStorageListener
) {
	const settingsButtonElement = document.getElementById('evolution-settings-button');
	const settingsOverlayElement = document.getElementById('evolution-settings-overlay');
	const populationSizeSliderElement = document.getElementById('population-size-slider');
	const populationSizeValueElement = document.getElementById('population-size-value');
	const roundDurationSliderElement = document.getElementById('round-duration-slider');
	const roundDurationValueElement = document.getElementById('round-duration-value');
	const mutationProbabilitySliderElement = document.getElementById('mutation-probability-slider');
	const mutationProbabilityValueElement = document.getElementById('mutation-probability-value');
	const settingsCancelButtonElement = document.getElementById('evolution-settings-cancel-button');
	const settingsApplyButtonElement = document.getElementById('evolution-settings-apply-button');
	const populationClearButtonElement = document.getElementById('population-clear-button');
	const populationClearConfirmOverlayElement = document.getElementById('population-clear-confirm-overlay');
	const populationClearCancelButtonElement = document.getElementById('population-clear-cancel-button');
	const populationClearConfirmButtonElement = document.getElementById('population-clear-confirm-button');
	let draftSettings = RoadsSimulation.evolutionSettings.getCurrentSettings();

	function updateDraftLabels() {
		populationSizeValueElement.textContent = String(draftSettings.populationSize);
		roundDurationValueElement.textContent = RoadsSimulation.evolutionSettings.formatRoundDurationLabel(
			draftSettings.roundDurationSliderValue
		);
		mutationProbabilityValueElement.textContent = draftSettings.mutationProbabilityPercent.toFixed(1) + ' %';
	}

	function syncDraftFromSliders() {
		draftSettings = {
			populationSize: Number(populationSizeSliderElement.value),
			roundDurationSliderValue: Number(roundDurationSliderElement.value),
			mutationProbabilityPercent: Number(mutationProbabilitySliderElement.value) / 10,
		};
		updateDraftLabels();
	}

	function syncSlidersFromSettings(settingsValues) {
		draftSettings = RoadsSimulation.evolutionSettings.clampSettings(settingsValues);
		populationSizeSliderElement.value = String(draftSettings.populationSize);
		roundDurationSliderElement.value = String(draftSettings.roundDurationSliderValue);
		mutationProbabilitySliderElement.value = String(Math.round(draftSettings.mutationProbabilityPercent * 10));
		updateDraftLabels();
	}

	function isPopulationClearConfirmVisible() {
		return !populationClearConfirmOverlayElement.hidden;
	}

	function showSettingsOverlay() {
		syncSlidersFromSettings(RoadsSimulation.evolutionSettings.getCurrentSettings());
		settingsOverlayElement.hidden = false;
		populationSizeSliderElement.focus();
	}

	function hideSettingsOverlay() {
		hidePopulationClearConfirmOverlay();
		settingsOverlayElement.hidden = true;
	}

	function showPopulationClearConfirmOverlay() {
		populationClearConfirmOverlayElement.hidden = false;
		populationClearCancelButtonElement.focus();
	}

	function hidePopulationClearConfirmOverlay() {
		populationClearConfirmOverlayElement.hidden = true;
	}

	function applyDraftSettings() {
		syncDraftFromSliders();

		const previousSettings = RoadsSimulation.evolutionSettings.getCurrentSettings();
		const appliedSettings = RoadsSimulation.evolutionSettings.applySettingsToConstants(draftSettings);

		RoadsSimulation.evolutionSettings.saveStoredSettings(appliedSettings);

		const populationSizeChanged = previousSettings.populationSize !== appliedSettings.populationSize;

		if (populationSizeChanged) {
			roundController.resetToFreshPopulation();
		}

		populationStorageListener.saveNow();
		hideSettingsOverlay();
	}

	function handlePopulationClearConfirmed() {
		hidePopulationClearConfirmOverlay();
		roundController.resetToFreshPopulation();
		populationStorageListener.saveNow();
		syncSlidersFromSettings(RoadsSimulation.evolutionSettings.getCurrentSettings());
		hideSettingsOverlay();
	}

	settingsButtonElement.addEventListener('click', function handleSettingsButtonClick() {
		showSettingsOverlay();
	});

	populationSizeSliderElement.addEventListener('input', syncDraftFromSliders);
	roundDurationSliderElement.addEventListener('input', syncDraftFromSliders);
	mutationProbabilitySliderElement.addEventListener('input', syncDraftFromSliders);

	settingsCancelButtonElement.addEventListener('click', function handleSettingsCancelClick() {
		hideSettingsOverlay();
	});

	settingsApplyButtonElement.addEventListener('click', function handleSettingsApplyClick() {
		applyDraftSettings();
	});

	populationClearButtonElement.addEventListener('click', function handlePopulationClearButtonClick() {
		showPopulationClearConfirmOverlay();
	});

	populationClearCancelButtonElement.addEventListener('click', function handlePopulationClearCancelClick() {
		hidePopulationClearConfirmOverlay();
	});

	populationClearConfirmButtonElement.addEventListener('click', function handlePopulationClearConfirmClick() {
		handlePopulationClearConfirmed();
	});

	populationClearConfirmOverlayElement.addEventListener('click', function handlePopulationClearOverlayClick(clickEvent) {
		if (clickEvent.target === populationClearConfirmOverlayElement) {
			hidePopulationClearConfirmOverlay();
		}
	});

	settingsOverlayElement.addEventListener('click', function handleSettingsOverlayClick(clickEvent) {
		if (clickEvent.target !== settingsOverlayElement || isPopulationClearConfirmVisible()) {
			return;
		}

		hideSettingsOverlay();
	});

	document.addEventListener('keydown', function handleSettingsKeydown(keydownEvent) {
		if (isPopulationClearConfirmVisible()) {
			if (keydownEvent.key === 'Escape') {
				hidePopulationClearConfirmOverlay();
			}

			if (keydownEvent.key === 'Enter') {
				handlePopulationClearConfirmed();
			}

			return;
		}

		if (settingsOverlayElement.hidden) {
			return;
		}

		if (keydownEvent.key === 'Escape') {
			hideSettingsOverlay();
		}

		if (keydownEvent.key === 'Enter') {
			applyDraftSettings();
		}
	});

	return {
		showSettingsOverlay: showSettingsOverlay,
		hideSettingsOverlay: hideSettingsOverlay,
	};
};
