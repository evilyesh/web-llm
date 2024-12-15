/**
 * Parses server responses.
 * Handles file processing and generates HTML code for chat messages.
 */
class ResponseData {
    constructor(chat, response) {
        this.chat = chat;
        this.response = response;
        this.userFiles = chat.filesList.userFiles;
        this.requestData = chat.requestData;
        this.parsedData = {};
        this.unknownData = {};
        this.parsedResponse = '';

        this.parseResponse();
    }


    async updateUserFilesContent(files_data) {

        for (const fileName in files_data) {
            this.userFiles[fileName].content = files_data[fileName];
        }
    }

    parseResponse() {
        let data = this.response.data;
        if (typeof data !== 'undefined' && data) {
            data = replaceFourSpacesWithTab(data);

            console.log(JSON.stringify(data, null, 2));

            for (const file of Object.values(this.userFiles)) {
                let regex = new RegExp(escapeRegExp(file.relative_path) + ':' + pattern, 'g');
                console.log(regex);
                let match = regex.exec(data);
                console.log(match);
                if (match) {
                    const uuid = '###' + simpleHash(match[2]) + '###';
                    this.parsedData[uuid] = { file: file, data: match[2] };
                    file.data = match[2];
                    data = data.replace(match[0], uuid);
                }

                regex = new RegExp('#\\s*' + escapeRegExp(file.relative_path) + pattern, 'g');
                console.log(regex);
                match = regex.exec(data);
                console.log(match);
                if (match) {
                    const uuid = '###' + simpleHash(match[2]) + '###';
                    this.parsedData[uuid] = { file: file, data: match[2] };
                    file.data = match[2];
                    data = data.replace(match[0], uuid);
                }
            }

            let unknownMatch;
            while ((unknownMatch = /`{3}.*?\n([\s\S]*?)`{3}/g.exec(data)) !== null) {
                console.log(unknownMatch);
                const uuid = '###' + simpleHash(unknownMatch[1]) + '###';
                this.unknownData[uuid] = unknownMatch[1];
                data = data.replace(unknownMatch[0], uuid);
            }
            this.parsedResponse = data;
            console.log(this.chat);

            if (Object.keys(this.userFiles).length) {
                this.requestData.getFilesContent()
                    .then(filesData => {
                        this.updateUserFilesContent(filesData);
                    });
            }

        } else {
            throw new Error('Data is empty!');
        }
    }

}
