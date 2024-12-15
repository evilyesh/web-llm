/**
 * Manages data sent in requests.
 * Builds prompts for the model and processes server responses.
 */
class RequestData {
	constructor(chat) {
		this.chat = chat;
		this.cRequest = chat.cRequest;
		this.type = null;
		this.clearContext = null;
	}

	async getFilesContent() {
		const response = await this.cRequest.sendRequest('/getFilesContent', {
			files: this.chat.filesList.userFiles,
			path: this.chat.filesList.projectPath
		});
		return response;
	}

	async buildPrompt(pmt) {
		let prompt = '';
		if (Object.keys(this.chat.filesList.userFiles).length) {
			prompt += this.chat.settings.promptSettings.prefix;
			const files_data = await this.getFilesContent();
			Object.keys(files_data).forEach(fileName => {
				this.chat.filesList.userFiles[fileName].content = files_data[fileName];
				prompt += '\n' + this.chat.filesList.userFiles[fileName].relative_path + ':' + lang.wrap + this.chat.filesList.userFiles[fileName].content + lang.wrap;
			});
			prompt += this.chat.settings.promptSettings.prompt_prefix;
		}
		prompt += pmt;
		if (Object.keys(this.chat.filesList.userFiles).length) {
			prompt += this.chat.settings.promptSettings.postfix;
		}
		return replaceFourSpacesWithTab(prompt);
	}

	async sendPrompt(pmt, clearContext = false, useDiff = false, autoAnswer = false) {
		const prompt = await this.buildPrompt(pmt);
		console.log(prompt);
		const response = await this.cRequest.sendRequest('/sendPrompt', {
			prompt: prompt,
			clear_input: clearContext,
			use_diff: false
		});
		this.chat.storeResponse(response, clearContext, useDiff, autoAnswer, 'model');
	}
}
