class RequestData {
    constructor(chatInstance) {
        this.chat = chatInstance;
    }

    async getFilesContent() {
        try {
            this.chat.files_data = await this.chat.sendRequest('/getFilesContent', { files: this.chat.user_files, path: this.chat.path });
            console.log(this.chat.files_data);
        } catch (error) {
            this.chat.handleError('Error occurred while getting files content: ', error);
        }
    }

    async buildPrompt() {
        let prompt = '';
        console.log(this.chat.user_files);
        console.log(this.chat.files_data);
        if (this.chat.user_files.length) {
            await this.getFilesContent();
            prompt += this.chat.settings.prefix;
            for (let fileName in this.chat.files_data) {
                prompt += '\n' + fileName + ':\n\`\`\`\n' + this.chat.files_data[fileName] + '\n\`\`\`\n';
            }
            prompt += this.chat.settings.postfix;
        }
        prompt += this.chat.messageInput.value;
        console.log(prompt);

        return replaceFourSpacesWithTab(prompt);
    }
}