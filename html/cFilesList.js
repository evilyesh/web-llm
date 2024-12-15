/**
 * Manages the file list, its display, and interaction with files.
 * Handles file selection, directory navigation, and file list display.
 */
class FilesList {
    // Constructor to initialize the list of files
	constructor() {
		this.projectPath = null;
		this._currentPath = null;
		this.list = {};
		this.userFiles = {};
		this.cRequest = new CRequest();
		this.fileListPopup = document.querySelector('.file_list_popup');
		this.fileListPopup._showed = false;
		this.selectedFileIndex = -1;
		this.chatPathInput = document.querySelector('.chat_path_input');
		this.currentPathLabel = getOneSelector('.current_path_text');
		this.chatMessageInput = document.querySelector('.chat_message_input');
		this.pWr = document.querySelector('.p_wr');

		this.pWr.addEventListener('keydown', e => {
			this.handleFileListPopupKeydown(e);
		});

		Object.defineProperty(this, 'currentPath', {
			get: function() {
				return this._currentPath;
			},
			set: function(value) {
				console.log(value);
				this._currentPath = value;
				this.showCurrentPath();
			}
		});
	}

	// Method to set the project path
	setPath(path) {
		console.log(path);
		this.projectPath = path;
		this.currentPath = path; // Initialize current path to project path
	}

	// Updates the current path label with the current path value.
	showCurrentPath() {
		this.currentPathLabel.setTEXT(this.currentPath);
	}

	// Method to add a file to the list
	addFile(file) {
		// Calculate the relative path
		const relativePath = file.path.replace(this.projectPath, '');
		// Add the file to the list with the relative path as the key
		this.list[relativePath] = {
			name: file.name,
			path: file.path,
			data: file.data,
			parsed_data: file.parsed_data || null,
			relative_path: file.relative_path
		};
		// Add the file to userFiles for tracking
		this.userFiles[file.path] = file;
		// Create file label in the DOM
		this.createFileLabel(file);
	}

	goToParentDirectory() {
		console.log(this);
		if (this.currentPath !== this.projectPath) {
			const parts = this.currentPath.split('/');
			parts.pop();
			const parentPath = parts.join('/');
			if (parentPath.startsWith(this.projectPath)) {
				this.currentPath = parentPath;
			} else {
				this.currentPath = this.projectPath;
			}
		}
	}

	// Method to create a file label in the DOM
	createFileLabel(file) {
		let dir_section = getOneSelector('.files_list .files_dir[data-dir_path="' + file.relative_path.replace(file.name, '') + '"]');
		if (!dir_section) {
			dir_section = createEl('div');
			dir_section.className = 'files_dir';
			dir_section.dataset.dir_path = file.relative_path.replace(file.name, '');
			const dir_section_label = createEl('div');
			dir_section_label.className = 'dir_section_label';
			dir_section_label.textContent = createShortString(file.relative_path.replace(file.name, ''));
			dir_section.appendChild(dir_section_label);
			document.querySelector('.files_list').appendChild(dir_section);
		}
		const fileLabel = document.createElement('span');
		fileLabel.textContent = file.name;
		fileLabel.className = 'file_label';
		fileLabel.dataset.id = file.path;
		fileLabel.onclick = () => this.removeFileFromUserFiles(file);
		dir_section.appendChild(fileLabel);
	}

	// Method to remove a file label from the DOM
	removeFileFromUserFiles(file) {
		const file_element = document.querySelector('.files_list .file_label[data-id="' + file.path + '"]');
		const files_dir_wrapper = document.querySelector('.files_list .files_dir[data-dir_path="' + file.relative_path.replace(file.name, '') + '"]');
		file_element.remove();
		if (files_dir_wrapper.children.length === 1) {
			files_dir_wrapper.remove();
		}
		delete this.userFiles[file.path];
	}

	// Method to get files list from the server
	getFilesList() {
		this.cRequest.sendRequest('/getFilesList', {
			current_path: this.currentPath,
			project_path: this.projectPath
		})
		.then(files => {
			this.list = files;
			this.displayFilesList();
		});
	}

	// Method to display files list in the popup
	displayFilesList() {
		this.fileListPopup.innerHTML = '';
		this.selectedFileIndex = -1;
		this.list.forEach(file => {
			const div = createEl('div')
				.addClass(file.type == 'dir' ? 'directory' : 'file')
				.onClick(() => this.handleFileSelection(file))
				.addData('path',file.path)
				.addData('type',file.type)
				.setTEXT(file.name)
				.appendTo(this.fileListPopup);
		});
		this.showFileListPopup();
	}

	handleFileListPopupKeydown(event) {
		if(!this.fileListPopup._showed) return;

		let keys = Object.keys(this.list);
		event.stopPropagation();
		event.preventDefault();
		const fileListItems = this.fileListPopup.getManySelector('div');
		if (event.key === 'ArrowUp' && this.selectedFileIndex > 0) {
			fileListItems[this.selectedFileIndex].removeClass('selected');
			this.selectedFileIndex--;
			fileListItems[this.selectedFileIndex].addClass('selected');
		} else if (event.key === 'ArrowDown' && this.selectedFileIndex < fileListItems.length - 1) {
			if (typeof fileListItems[this.selectedFileIndex] !== 'undefined') {
				fileListItems[this.selectedFileIndex].removeClass('selected');
			}
			this.selectedFileIndex++;
			fileListItems[this.selectedFileIndex].addClass('selected');
		} else if (event.key === 'Enter') {
			console.log(this.list);
			console.log(keys);
			console.log(this.selectedFileIndex);
			console.log(keys[this.selectedFileIndex]);
			console.log(this.list[keys[this.selectedFileIndex]]);
			this.handleFileSelection(this.list[keys[this.selectedFileIndex]]);
		} else if (event.key === 'Escape') {
			this.closeFileListPopup();
		}
	}

	// Method to handle file selection
	handleFileSelection(file) {
		console.log(file);
		if (file.type === 'dir') {
			this.currentPath = file.path;
			this.getFilesList();
			this.chatMessageInput.value = this.chatMessageInput.value.replace('../', '');
		} else {
			this.addFile(file);
			this.closeFileListPopup();
			this.chatMessageInput.value = this.chatMessageInput.value.replace('./', file.name);
			this.chatMessageInput.focus();
		}
	}

	// Method to close file list popup
	closeFileListPopup() {
		this.fileListPopup.style.display = 'none';
		this.fileListPopup._showed = false;
	}

	// Method to show file list popup
	showFileListPopup() {
		console.log('showFileListPopup');
		this.fileListPopup.style.display = 'block';
		this.fileListPopup._showed = true;
	}
}

