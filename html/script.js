oPb.docReady(() => {
	initEvents();
});

async function initEvents() {
	let chat = new Chat();
	await chat.getSettings();

	chat.pathInput.addEventListener('change', chat.sendPath.bind(chat));
	chat.messageInput.addEventListener('keyup', handleMessageKeyup.bind(chat));

	document.addEventListener('keydown', handleDocumentKeydown.bind(chat));

	getOneSelector('.chat_form').addEventListener('submit', handleSubmit.bind(chat));
	getOneSelector('.chat_form button').addEventListener('click', handleSubmit.bind(chat));

	window.addEventListener('error', (event) => {
		chat.handleError(lang.errMsg, event)
	});
}

async function handleMessageKeyup(event) {
	if (event.key === '/' && event.target.value.includes('../')) {
		if(this.path != this.current_path){
			this.current_path = this.getParentDirectory(this.current_path);
			await this.sendPath();
			this.showCurrentPath();
			event.target.value = event.target.value.replace('../', '');
			event.target.focus();
		} //else exception
	} else if (event.key === '/' && event.target.value.includes('./')) {
		this.showFileListPopup();
	} else if (event.key === 'Enter' && event.ctrlKey) {
        await handleSubmit.call(this, event);
	}
}

function handleDocumentKeydown(event) {
	if (this.fileListPopup.style.display === 'block') {
		this.handleFileListPopupKeydown(event);
	}
}

async function handleSubmit(event) {
	event.preventDefault();
	event.stopPropagation();
	this.saveUserMessage(this.messageInput.value);
	await this.sendPrompt();
	return false;
}
