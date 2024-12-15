/**
 * The main class that manages the chat logic.
 * Handles message handling, responses, file interactions, and settings.
 */
class ChatList {
    constructor() {
		this.messages = {};
		this.cRequest = new CRequest();
		this.filesList = new FilesList();
		this.settings = new CSettings();
		this.chatContent = document.querySelector('.chat_content');
		this.chatMessageInput = document.querySelector('.chat_message_input');
		this.chatPathInput = document.querySelector('.chat_path_input');
		this.settingsButton = document.querySelector('.settings_button');
		this.settingsPopup = document.querySelector('.settings_popup');
		this.closeButton = document.querySelector('.close_button');
		this.submitBtn = document.querySelector('.submit_btn');
		this.clearContext = getOneSelector('.clear_context');
		this.autoAnswer = getOneSelector('.auto_answer');
		this.improvePrompt = getOneSelector('.edit_button');
		this.useDiff = getOneSelector('.use_diff');
		this.pWr = document.querySelector('.p_wr');
		this.requestData = new RequestData(this); // Initialize RequestData with the ChatList instance
		this.sqlQueryInput = getOneSelector('.sql_query'); // Corrected class name corresponding to index.html
		this.sqlSubmitBtn = getOneSelector('.submit_sql_btn'); // Corrected class name corresponding to index.html
		this.sqlHostInput = getOneSelector('.sql_host');
		this.sqlPortInput = getOneSelector('.sql_port');
		this.sqlUsernameInput = getOneSelector('.sql_username');
		this.sqlPasswordInput = getOneSelector('.sql_password');

		window.addEventListener('error', e => {
			this.handleError(lang.errMsg, e)
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
			if(e.key === 'Enter' && e.ctrlKey){
				this.requestData.sendPrompt(this.chatMessageInput.value, this.clearContext.checked, this.useDiff.checked, this.autoAnswer.checked); // Send prompt
				this.storeMessage(this.chatMessageInput.value, 'user_message'); // Store message in the chat
			}
		});

		this.submitBtn.addEventListener('click', e => {
			e.preventDefault();
			e.stopPropagation();
			this.requestData.sendPrompt(this.chatMessageInput.value, this.clearContext.checked, this.useDiff.checked, this.autoAnswer.checked); // Send prompt
			this.storeMessage(this.chatMessageInput.value, 'user_message'); // Store message in the chat
			return false;
		});

		this.settingsButton.addEventListener('click', () => {
			this.settingsPopup.style.display = 'block';
		});

		this.closeButton.addEventListener('click', () => {
			this.closeSettings();
		});

		this.pWr.addEventListener('click', e => {
			if(this.settingsPopup.style.display !== 'none'){
				this.closeSettings();
			}
		});

		this.improvePrompt.addEventListener('click', e => {
			this.sendEditMessage();
		});

		this.sqlSubmitBtn.addEventListener('click', e => {
			e.preventDefault();
			e.stopPropagation();
			this.executeSQLQuery(this.sqlQueryInput.value); // Execute SQL query
			this.storeMessage(this.sqlQueryInput.value, 'user_message'); // Store message in the chat
			return false;
		});
	}

	scrollToMessage(messageId) {
		const mesEl = getById(messageId);
		if (mesEl) {
			mesEl.scrollIntoView({ behavior: 'smooth' });
		}
	}

	closeSettings(){
		this.settingsPopup.style.display = 'none';
		this.chatMessageInput.focus();
	}

	storeMessage(messageText, className) {
		const msg = new Message('mid' + Date.now(), {
			className: className,
			data: new ResponseData(this, {data: messageText}), // data is the message text
			author: 'user',
			chat: this, // parent chat class - Chat
		});
		msg.html.appendTo(this.chatContent);
		this.scrollToMessage(msg.id);
	}

	storeResponse(response, clearContext, useDiff, autoAnswer, author) {
		// Store the response data in the chat
		console.log('Response from server:', response);

		const msg = new Message('mid' + Date.now(), {
			className: 'model_responce',
			data: new ResponseData(this, response),
			author: author,
			chat: this, // parent chat class - Chat
			clearContext: clearContext, // clear context
			useDiff: useDiff, // use diff
			autoAnswer: autoAnswer, //if model not following format we can auto answer 	
		}); 
		msg.html.appendTo(this.chatContent);

		if(msg.notFollowFormat){
			this.storeMessage(lang.modelFormatFollow, 'user_message');
			if(msg.autoAnswer) {
				// create and send answer to model
				 this.requestData.sendPrompt(lang.modelFormatFollow, msg.clearContext, msg.useDiff, msg.autoAnswer);
			}
		}
		this.scrollToMessage(msg.id);
		this.chatMessageInput.value = '';
	}

	handleConfirmClick(btn, response) {
		console.log(response);
		btn.addClass('active');
		const codeWrap = btn.parentElement;
		const hash = btn.getData('id');
		const file = response.parsedData[hash].file;
		const codeBlock = codeWrap.getOneSelector('code');
		codeBlock.getManySelector('.removed').forEach(i => {
			i.remove();
		});
		const data = unescapeHtml(codeBlock.textContent);

		this.cRequest.sendRequest('/saveFileContent', { path: this.filesList.projectPath, file_name: file.name, file_path: file.path, data: data })  // TODO move somewhere
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
	}

	sendEditMessage() {
		if (this.chatMessageInput.value) {

			this.cRequest.sendRequest('/sendEditPrompt', { prompt: this.chatMessageInput.value, clear_input: this.clearContext.checked })  // TODO move somewhere
				.then(response => {
					console.log(response);
					const msg = new Message('mid' + Date.now(), {
						className: 'model_responce',
						data: new ResponseData(this, response),
						author: 'model',
						chat: this
					});
					msg.html.appendTo(this.chatContent);
					this.scrollToMessage(msg.id);
					this.attachCopyMessageToInput(msg.html);
				})
				.catch(error => {
					this.handleError(lang.errFc, error);
				});

		} else {
			this.handleError(lang.noTextSelected);
		}
	}

	attachCopyMessageToInput(messageElement) {
		const copyButton = createEl('button').addClass('copy_button').innerHTML('📋');
		copyButton.addEventListener('click', () => {
			this.chatMessageInput.value = messageElement.textContent;
		});
		messageElement.appendChild(copyButton);
	}

	executeSQLQuery(query) { // Attention! Need to edit corresponding index.html
		if (query) {
			this.cRequest.sendRequest('/runSQLQuery', { 
				host: this.sqlHostInput.value,
				port: this.sqlPortInput.value,
				username: this.sqlUsernameInput.value,
				password: this.sqlPasswordInput.value,
				query: query 
			})
				.then(response => {
					console.log(response);
					const msg = new Message('mid' + Date.now(), {
						className: 'model_responce',
						data: new ResponseData(this, response),
						author: 'model',
						chat: this
					});
					msg.html.appendTo(this.chatContent);
					this.scrollToMessage(msg.id);
				})
				.catch(error => {
					this.handleError(lang.errFc, error);
				});
		} else {
			this.handleError(lang.noQueryProvided);
		}
	}
}
