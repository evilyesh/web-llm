/**
 * Processes server responses and prepares data for chat messages:
 * - Handles file content updates
 * - Parses structured data from responses
 * - Manages unknown data chunks
 */
class ResponseData {
	constructor(chat, response) {
		this.chat = chat;
		this.response = response;
		this.userFiles = chat.filesList.userFiles;
		this.parsedData = {};
		this.unknownData = {};
		this.parsedResponse = '';
		this.type = 'prompt';

		(async () => {
			await this.parseResponse();
		})();
	}

	static async create(chat, response) {
		const instance = new ResponseData(
			chat,
			response
		);
		await instance.parseResponse();
		return instance;
	}

	updateUserFilesContent(files_data) {
		for (const fileName in files_data) {
			this.userFiles[fileName].content = files_data[fileName];
		}
	}

	async parseResponse() {
		let data = this.response.data;
		const filesData = {};
		if (typeof data === 'undefined' || !data) {
			throw new Error('Data is empty!');
		}

		if(Array.isArray(data)){
			this.parsedResponse = JSON.stringify(data, null, 2);
			this.type = 'array';
			return;
		}

		if(typeof data === 'string'){
			data = replaceFourSpacesWithTab(data);
			for (const file of Object.values(this.userFiles)) {
				let regex = new RegExp('#\\s*' + escapeRegExp(file.relative_path) + pattern, 'g');
				let match = regex.exec(data);

				if(match){
					const uuid = '---' + simpleHash(match[2]) + '---';
					this.parsedData[uuid] = { file: file, data: match[2] };
					file.data = match[2];
					data = data.replace(match[0], uuid);
				}
			}

			let unknownMatch;
			let regex = new RegExp(unknown_pattern, 'g');
			while ((unknownMatch = regex.exec(data)) !== null) {
				const fileType = unknownMatch[1] || 'plaintext';
				const uuid = '---' + simpleHash(unknownMatch[2]) + '---';
				this.unknownData[uuid] = {file_type: fileType, data: unknownMatch[2]};
				data = data.replace(unknownMatch[0], uuid);
			}

			if (Object.keys(this.userFiles).length) {
				const filesData = await this.getFilesContent();
				this.updateUserFilesContent(filesData);
			}

			this.parsedResponse = data;
		}
	}

	async getFilesContent() {
		return await this.chat.cRequest.sendRequest('/getFilesContent', {
			files: this.chat.filesList.userFiles,
			path: this.chat.filesList.projectPath
		}, true);
	}
}