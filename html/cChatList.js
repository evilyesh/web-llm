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
		this.requestInProgress = false; // Flag to track if a request is in progress

		this.cRequest = new CRequest(this);
		this.filesList = new FilesList(this);
		this.settings = new CSettings(this);
		this.requestData = new RequestData(this); // Initialize RequestData with the ChatList instance

		window.addEventListener('error', e => {
			this.handleError(lang.errMsg, e);
		});

		this.chatPathInput.addEventListener('change', e => {
			this.filesList.setPath(e.target.value);
		});

		this.chatPathInput.addEventListener('keyup', e => {
			if (e.key === 'Enter') {
				this.filesList.setPath(e.target.value);
				this.closeSettings();
			}
		});

		this.chatMessageInput.addEventListener('keyup', e => {
			if (e.key === 'Escape') {
				this.filesList.closeFileListPopup();
			}
			if (e.key === '/') {
				const inputValue = e.target.value;
				if (inputValue.includes('./')) {
					this.filesList.getFilesList();
				}
				if (inputValue.includes('../')) {
					this.filesList.goToParentDirectory();
					this.filesList.getFilesList();
				}
			}
			if (e.key === 'Enter' && e.ctrlKey) {
				this.sendRequestIfNotInProgress(() => this.requestData.sendPrompt(this.chatMessageInput.value, this.clearContext.checked, this.useDiff.checked, this.autoAnswer.checked, 'prompt_w_files'), this.chatMessageInput.value, 'user_message');
			}
		});

		this.submitBtn.addEventListener('click', e => {
			e.preventDefault();
			e.stopPropagation();
			this.sendRequestIfNotInProgress(() => this.requestData.sendPrompt(this.chatMessageInput.value, this.clearContext.checked, this.useDiff.checked, this.autoAnswer.checked, 'prompt_w_files'), this.chatMessageInput.value, 'user_message');
		});

		this.settingsButton.addEventListener('click', () => {
			this.settingsPopup.style.display = 'block';
		});

		this.closeButton.addEventListener('click', () => {
			this.closeSettings();
		});

		this.pWr.addEventListener('click', e => {
			if (this.settingsPopup.style.display !== 'none') {
				this.closeSettings();
			}
		});

		this.improvePrompt.addEventListener('click', e => {
			this.sendRequestIfNotInProgress(() => this.sendEditMessage());
		});

		this.sqlSubmitBtn.addEventListener('click', e => {
			e.preventDefault();
			e.stopPropagation();
			this.sendRequestIfNotInProgress(() => this.executeSQLQuery(this.sqlQueryInput.value), this.sqlQueryInput.value, 'user_message');
		});
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

	storeMessage(messageText, className, type) {
		const msg = new Message('mid' + Date.now(), {
			className: className,
			data: new ResponseData(this, {data: messageText}), // data is the message text
			author: 'user',
			chat: this, // parent chat class - Chat
			type: type
		});
		msg.html.appendTo(this.chatContent);
		this.messages.push(msg);
		this.scrollToMessage(msg.html);
	}

	storeResponse(response, clearContext, useDiff, autoAnswer, author, type) {
		// Store the response data in the chat
		console.log('Response from server:', response);

		const msg = new Message('mid' + Date.now(), {
			className: 'model_responce',
			data: new ResponseData(this, response),
			author: author,
			chat: this, // parent chat class - Chat
			clearContext: clearContext, // clear context
			useDiff: useDiff, // use diff
			autoAnswer: autoAnswer, // if model not following format we can auto answer
			type: type
		});
		msg.html.appendTo(this.chatContent);
		this.messages.push(msg);

		if (msg.notFollowFormat) {
			this.storeMessage(lang.modelFormatFollow, 'model_format_err', 'model_format_err');
			if (msg.autoAnswer) {
				// create and send answer to model
				this.requestData.sendPrompt(lang.modelFormatFollow, msg.clearContext, msg.useDiff, msg.autoAnswer, type)
					.then(response => {
						// do nothing, think about TODO
					});
			}
		}
		this.scrollToMessage(msg.html);
		this.chatMessageInput.value = '';
		this.requestInProgress = false; // Reset the flag after response is received
		this.enableChatInputAndSubmitBtn();
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
		}, true)  // TODO move somewhere
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

	handleError(message, error = null) {
		console.error(message + (error ? error.message : ''));
		oPb.showSmMsg(lang.errMsg + message + (error ? error.message : ''), 'error_msg', 5000);
		this.enableChatInputAndSubmitBtn();
	}

	sendEditMessage() {
		if (this.chatMessageInput.value) {
			this.cRequest.sendRequest('/sendEditPrompt', {
				prompt: this.chatMessageInput.value,
				clear_input: this.clearContext.checked
			})  // TODO move somewhere
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
				database: this.sqlDatabaseInput.value, // Added database input
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

	sendRequestIfNotInProgress(requestFunction, messageText = null, className = null) {
		if (this.requestInProgress) {
			this.handleError(lang.requestInProgress);
			return;
		}
		this.requestInProgress = true;
		this.disableChatInputAndSubmitBtn();
		if (messageText && className) {
			this.storeMessage(messageText, className);
		}
		requestFunction();
	}

	resetChatData() {
		this.messages = [];
		this.chatMessageInput.value = ''; // Clear the input field
		this.requestInProgress = false; // Reset the request in progress flag
	}

	disableChatInputAndSubmitBtn() {
		this.chatMessageInput.disabled = true;
		this.submitBtn.disabled = true;
	}

	enableChatInputAndSubmitBtn() {
		this.chatMessageInput.disabled = false;
		this.submitBtn.disabled = false;
	}
}
