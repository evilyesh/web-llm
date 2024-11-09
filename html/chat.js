class Chat {
    constructor() {
        this.path = '';
        this.files_names = [];
        this.files_data = {};
        this.user_files = [];
        this.settings = {};
        this.response_data = '';
        this.parsed_response = '';
        this.parsed_data = {};
        this.unknown_response = {};
        this.chatContent = getOneSelector('.chat_content');
        this.messageInput = getOneSelector('.chat_message_input');
        this.prefixInput = getOneSelector('.prefix_text');
        this.pathInput = getOneSelector('.chat_path_input');
        this.clearInput = getOneSelector('.clear_context');
        this.fileListPopup = getOneSelector('.file_list_popup');
        this.fileListWrapper = getOneSelector('.files_list');
        this.loadingAnimation = getOneSelector('#loading-animation');
        this.selectedFileIndex = -1;

        this.requestData = new RequestData(this);
        this.responseData = new ResponseData(this);
    }

    async getSettings() {
        try {
            this.settings = await this.sendRequest('/getSettings');
        } catch (error) {
            this.handleError(lang.errGet, error);
        }
    }

    async sendPrompt() {
        try {
            console.log(this.clearInput.checked);
            this.response_data = await this.sendRequest('/sendPrompt', { prompt: await this.requestData.buildPrompt(), clear_input: this.clearInput.checked});
            console.log(this.response_data);
            this.parsed_data = {};
            this.responseData.parseResponse(this.response_data);
            this.responseData.displayMessage();
            this.messageInput.value = '';
        } catch (error) {
            this.handleError(lang.errPrm, error);
        }
    }

    async sendRequest(url, data = {}) {
        this.setLoading(true);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(lang.httpErr + response.status);
            }

            return await response.json();
        } catch (error) {
            throw new Error(lang.errReq + error.message);
        } finally {
            this.setLoading(false);
        }
    }

    sendPath() {
        try {
            this.path = this.pathInput.value.trim();
            if (this.path !== '') {
                this.sendRequest('/getFilesList', { path: this.path })
                    .then(result =>{
                    this.files_names = result;
                });
            } else {
                this.handleError(lang.pthEmp);
            }
        } catch (error) {
            this.handleError(lang.errSend, error);
        }
    }

    showFileListPopup() {
        this.fileListPopup.style.display = 'block';
        this.populateFileListPopup();
    }

    hideFileListPopup() {
        this.fileListPopup.style.display = 'none';
    }

    handleFileListPopupKeydown(event) {
        event.stopPropagation();
        event.preventDefault();
        const fileListItems = this.fileListPopup.getManySelector('li');
        if (event.key === 'ArrowUp' && this.selectedFileIndex > 0) {
            fileListItems[this.selectedFileIndex].classList.remove('selected');
            this.selectedFileIndex--;
            fileListItems[this.selectedFileIndex].classList.add('selected');
        } else if (event.key === 'ArrowDown' && this.selectedFileIndex < fileListItems.length - 1) {
            if (typeof fileListItems[this.selectedFileIndex] !== 'undefined') {
                fileListItems[this.selectedFileIndex].classList.remove('selected');
            }
            this.selectedFileIndex++;
            fileListItems[this.selectedFileIndex].classList.add('selected');
        } else if (event.key === 'Enter') {
            const selectedFile = this.files_names[this.selectedFileIndex];
            if (selectedFile.type === 'file') {
                this.addFileToUserFiles(selectedFile.name);
                this.replaceCSText(selectedFile.name);
                this.hideFileListPopup();
            } else if (selectedFile.type === 'dir') {
                this.pathInput.value = this.pathInput.value + '/' + selectedFile.name;
                this.replaceCSText('');
                this.sendPath();
            }
        } else if (event.key === 'Escape') {
            this.hideFileListPopup();
        }
    }

    populateFileListPopup() {
        const fileList = this.fileListPopup.querySelector('ul');
        fileList.innerHTML = '';
        this.files_names.forEach((file) => {
            const li = createEl('li');
            li.textContent = file.name;
            if (file.type === 'dir') {
                li.style.fontStyle = 'italic';
            }
            li.addEventListener('click', () => {
                if (file.type === 'file') {
                    this.addFileToUserFiles(file.name);
                    this.replaceCSText(file.name);
                    this.hideFileListPopup();
                } else if (file.type === 'dir') {
                    this.pathInput.value = this.pathInput.value + '/' + file.name;
                    this.messageInput.value.replace('./', '');
                    this.sendPath();
                }
            });
            fileList.appendChild(li);
        });
        this.selectedFileIndex = -1;
    }

    addFileToUserFiles(fileName) {
        if (!this.user_files.includes(fileName)) {
            this.user_files.push(fileName);
            this.createFileLabel(fileName);
        }
    }

    removeFileFromUserFiles(fileLabel) {
        const index = this.user_files.indexOf(fileLabel.getData('id'));
        console.log(index);
        if (index > -1) {
            this.user_files.splice(index, 1);
            fileLabel.remove();
        }
    }

    createFileLabel(fileName) {
        const fileLabel = createEl('span');
        fileLabel.setTEXT(fileName).addClass('file-label').addData('id', fileName).addEventListener('click', () => this.removeFileFromUserFiles(fileLabel));
        this.fileListWrapper.appendChild(fileLabel);
    }

    handleConfirmClick(btn) {
        const codeWrap = btn.parentElement;
        const hash = btn.getData('id');
        const file = this.parsed_data[hash].file;
        const codeBlock = codeWrap.querySelector('code');
        codeBlock.getManySelector('.removed').forEach(i => {
            i.remove();
        });
        const data = unescapeHtml(codeBlock.textContent);

        this.sendRequest('/saveFileContent', { path: this.path, file_name: file, data: data })
            .then(response => {
                console.log(response);
            })
            .catch(error => {
                this.handleError(lang.errFc, error);
            });
    }

    handleCancelClick(btn) {
        const codeWrap = btn.parentElement;
        const hash = codeWrap.id.substring(1);

        codeWrap.remove();

        delete this.parsed_data[hash];
    }

    replaceCSText(replacement){
        const mi = this.messageInput;
        mi.value = mi.value.replace(/\.\//g, replacement);
        mi.setSelectionRange(mi.selectionStart + (replacement.length - 2), mi.selectionEnd + (replacement.length - 2));
        mi.focus();
    }

    encodeHTML(text) {
        return text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    handleError(message, error = null) {
        console.error(message + (error ? error.message : ''));
        oPb.showSmMsg(lang.errMsg + message + (error ? error.message : ''), 'error_msg', 5000);
    }

    saveUserMessage(message) {
        const userMessageElement = createEl('div').addClass('user_msg');
        userMessageElement.innerHTML = '<pre><code>' + this.encodeHTML(message) + '</pre></code>';
        this.chatContent.appendChild(userMessageElement);
    }

    setLoading(isLoading) {
        this.loadingAnimation.style.display = isLoading ? 'block' : 'none';
        this.messageInput.disabled = isLoading;
    }
}