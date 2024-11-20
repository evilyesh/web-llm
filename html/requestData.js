class RequestData {
    constructor(chatInstance) {
        this.chat = chatInstance;
    }

    async getFilesContent() {
        try {
            const data = await this.chat.sendRequest('/getFilesContent', { files: this.chat.user_files, path: this.chat.path });
            return data;
        } catch (error) {
            this.chat.handleError('Error occurred while getting files content: ', error);
        }
    }

    async buildPrompt() {
        let prompt = '';
        if (Object.keys(this.chat.user_files).length) {
            const files_data = await this.getFilesContent();
            console.log(this.chat.user_files);
            console.log(files_data);

            prompt += this.chat.settings.prefix;
            Object.keys(files_data).forEach(fileName => {
                this.chat.user_files[fileName].content = files_data[fileName];
                prompt += '\n' + this.chat.user_files[fileName].relative_path + ':\n\`\`\`\n' + this.chat.user_files[fileName].content + '\n\`\`\`\n';
            });
            prompt += this.chat.settings.postfix;
        }
        prompt += this.chat.prefixInput.value + '\n';
        prompt += this.chat.messageInput.value;
        console.log(prompt);

        return replaceFourSpacesWithTab(prompt);
    }
}