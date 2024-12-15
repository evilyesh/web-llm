/**
 * Manages chat settings.
 * Loads and saves settings, and interacts with the server.
 */
class CSettings {
    constructor() {
		this.settingsSelect = document.querySelector('.settings_popup .settings_select');
		this.selectedSettings = null;
		this.configList = [];
		this.promptSettings = null;

		this.request = new CRequest();

		this.loadPromptSettings();
		this.loadSettingsList();
		this.addEventListeners();
	}

	addEventListeners() {
		this.settingsSelect.addEventListener('change', (event) => this.handleSettingsChange(event));
	}

	loadSettingsList() {
		fetch('/getSettingsList')
			.then(response => response.json())
			.then(data => {
				this.configList = data;
				data.forEach(config => {
					const option = document.createElement('option');
					option.value = config.file_name;
					option.textContent = config.file_name;
					this.settingsSelect.appendChild(option);
				});
				// Automatically select the first configuration
				if (data.length > 0) {
					this.settingsSelect.value = data[0].file_name;
					this.settingsSelect.selectedIndex = 0;
					this.handleSettingsChange({ target: this.settingsSelect });
				}
			})
			.catch(error => console.error('Error loading settings list:', error));
	}

	handleSettingsChange(event) {
		const selectedFile = event.target.value;
		this.selectedSettings = this.configList[event.target.selectedIndex];
		// Add logic to handle the change in the select element
		this.sendSelectedSettings(selectedFile);
		console.log('Selected settings file:', selectedFile);
		console.log('Selected settings:', this.selectedSettings);
	}

	sendSelectedSettings(selectedSettings) {
		this.request.sendRequest('/setSelectedSettings', { selectedSettings: selectedSettings })
			.then(response => {
				console.log('Selected settings saved on server:', response);
			})
			.catch(error => {
				console.error('Error sending selected settings:', error);
			});
	}

	loadPromptSettings() {
		this.request.sendRequest('/getSettings')
			.then(data => {
				this.promptSettings = data;
			})
			.catch(error => {
				console.error('Error load prompt settings:', error);
			});
	}
}
