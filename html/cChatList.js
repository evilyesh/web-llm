/**
 * The main class that manages the chat logic.
 * Handles message handling, responses, file interactions, and settings.
 */
class ChatList {
	constructor() {
		this.messages = [];
		this.chatContent = getOneSelector('.chat_content');
		this.chatMessageInput = getOneSelector('.chat_message_input');
		this.chatPathInput = getOneSelector('.chat_path_input');
		this.settingsButton = getOneSelector('.settings_button');
		this.settingsPopup = getOneSelector('.settings_popup');
		this.closeButton = getOneSelector('.close_button');
		this.submitBtn = getOneSelector('.submit_btn');
		this.prefixText = getOneSelector('.prefix_text');
		this.clearContext = getOneSelector('.clear_context');
		this.autoAnswer = getOneSelector('.auto_answer');
		this.improvePrompt = getOneSelector('.edit_button');
		this.useDiff = getOneSelector('.use_diff');
		this.pWr = getOneSelector('.p_wr');
		this.sqlQueryInput = getOneSelector('.sql_query');
		this.sqlSubmitBtn = getOneSelector('.submit_sql_btn');
		this.sqlHostInput = getOneSelector('.sql_host');
		this.sqlPortInput = getOneSelector('.sql_port');
		this.sqlUsernameInput = getOneSelector('.sql_username');
		this.sqlPasswordInput = getOneSelector('.sql_password');
		this.sqlDatabaseInput = getOneSelector('.sql_database');
		this.recordButton = getOneSelector('.record_btn');
		this.indexFilesBtn = getOneSelector('.index_files_btn');
		this.mediaRecorder = null;
		this.audioChunks = [];
		this.requestInProgress = false;

		this.cRequest = new CRequest(this);
		this.filesList = new FilesList(this);
		this.settings = new CSettings(this);
		this.requestData = new RequestData(this);
		this.messageManager = new MessageManager(this);
		this.userInputHandler = new UserInputHandler(this);
		this.requestManager = new RequestManager(this);
		this.recordingManager = new RecordingManager(this);

		window.addEventListener('error', e => {
			this.handleError(lang.errMsg, e);
		});

		this.userInputHandler.setupEventListeners();
	}

	scrollToMessage(mesEl) {
		if (mesEl) {
			mesEl.scrollIntoView({behavior: 'smooth', block: 'start', inline: 'nearest'});
		}
	}

	closeSettings() {
		this.settingsPopup.style.display = 'none';
		this.chatMessageInput.focus();
	}

	handleError(message, error = null) {
		console.error(message + (error ? error.message : ''));
		oPb.showSmMsg(lang.errMsg + message + (error ? error.message : ''), 'error_msg', 5000);
		this.enableChatInput();
	}

	resetChatData() {
		this.messages = [];
		this.chatMessageInput.value = '';
		this.requestInProgress = false;
	}

	disableChatInput() {
		this.chatMessageInput.disabled = true;
		this.submitBtn.disabled = true;
	}

	enableChatInput() {
		this.chatMessageInput.disabled = false;
		this.submitBtn.disabled = false;
	}

	handleConfirmClick(btn, response) {
		btn.addClass('active');
		const codeWrap = btn.parentElement;
		const hash = btn.getData('id');
		const file = response.parsedData[hash].file;
		const codeBlock = codeWrap.getOneSelector('code');
		codeBlock.getManySelector('.removed').forEach(i => {
			i.remove();
		});
		this.cRequest.sendRequest('/saveFileContent', {
			path: this.filesList.projectPath,
			file_name: file.name,
			file_path: file.path,
			data: replaceTabWithFourSpaces(unescapeHtml(codeBlock.textContent))
		}, true)
			.then(response => {
				console.log(response);
				codeWrap.getOneSelector('.cancel').remove();
			})
			.catch(error => {
				this.handleError(lang.errFc, error);
			});
	}

	handleCancelClick(btn, response) {
		const codeWrap = btn.parentElement;
		const hash = codeWrap.id.substring(1);
		codeWrap.remove();
		delete response.parsedData[hash];
	}

	sendEditMessage() {
		if (this.chatMessageInput.value) {
			let filesText = '';
			Object.values(this.filesList.userFiles).forEach(file => {
				filesText += `\nFile: ${file.relative_path}`;
				filesText += `${lang.wrap}${file.content}${lang.wrap}\n`;
			});
			console.log(filesText);
			this.cRequest.sendRequest('/sendEditPrompt', {
				prompt: this.chatMessageInput.value + '\n' + this.prefixText.value + '\n' + filesText,
				clear_input: this.clearContext.checked,
				api: ''
			})
				.then(response => {
					console.log(response);
					const msg = new Message('mid' + Date.now(), {
						className: 'model_responce',
						data: new ResponseData(this, response),
						author: 'model',
						chat: this,
						type: 'prompt_improve'
					});
					msg.html.appendTo(this.chatContent);
					this.messages.push(msg);
					this.scrollToMessage(msg.html);
				})
				.catch(error => {
					this.handleError(lang.errFc, error);
				});
		} else {
			this.handleError(lang.noTextSelected);
		}
	}

	executeSQLQuery(query) {
		if (query) {
			this.cRequest.sendRequest('/runSQLQuery', {
				host: this.sqlHostInput.value,
				port: this.sqlPortInput.value,
				username: this.sqlUsernameInput.value,
				password: this.sqlPasswordInput.value,
				database: this.sqlDatabaseInput.value,
				query: query
			})
				.then(response => {
					console.log(response);
					const msg = new Message('mid' + Date.now(), {
						className: 'model_responce',
						data: new ResponseData(this, response),
						author: 'model',
						chat: this,
						type: 'sql_query'
					});
					msg.html.appendTo(this.chatContent);
					this.messages.push(msg);
					this.scrollToMessage(msg.html);
				})
				.catch(error => {
					this.handleError(lang.errFc, error);
				});
		} else {
			this.handleError(lang.noQueryProvided);
		}
	}

	indexProjectFiles() {
		const projectPath = this.chatPathInput.value;
		if (projectPath) {
			this.cRequest.sendRequest('/parseProjectFiles', {
				path: projectPath,
				exclude_dirs: []
			})
				.then(response => {
					console.log(response);
				})
				.catch(error => {
					this.handleError(lang.errFc, error);
				});
		} else {
			this.handleError(lang.noPathProvided);
		}
	}
}