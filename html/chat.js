class Chat {
    constructor() {
        this.path = ''; //project path
        this.current_path = ''; //current path
        this.files_list = [];
        this.user_files = {};
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
        this.current_path_label = getOneSelector('.current_path_text');
        this.selectedFileIndex = -1;

        this.requestData = new RequestData(this);
        this.responseData = new ResponseData(this);
    }

    async getSettings() {
        this.settings = await this.sendRequest('/getSettings');
    }

    async sendPrompt() {
        this.response_data = await this.sendRequest('/sendPrompt', { prompt: await this.requestData.buildPrompt(), clear_input: this.clearInput.checked});
        console.log(this.response_data);
        this.parsed_data = {};
        this.responseData.parseResponse(this.response_data);
        this.responseData.displayMessage();
        this.messageInput.value = '';
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
            this.path = this.pathInput.value.trim();
            if(!this.current_path){
                this.current_path = this.path;
                this.showCurrentPath();
            }
            if (this.current_path !== '') {
                this.sendRequest('/getFilesList', { path: this.path, current_path: this.current_path })
                    .then(result =>{
                    this.files_list = result;
                });
            } else {
                this.handleError(lang.pthEmp);
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
            const selectedFile = this.files_list[this.selectedFileIndex];
            this.handleFileSelect(selectedFile);
        } else if (event.key === 'Escape') {
            this.hideFileListPopup();
        }
    }

    handleFileSelect(selectedFile){
        if (selectedFile.type === 'file') {
            this.addFileToUserFiles(selectedFile);
            this.replaceCSText(selectedFile.name);
            this.hideFileListPopup();
        } else if (selectedFile.type === 'dir') {
            this.current_path = this.current_path + '/' + selectedFile.name;
            this.showCurrentPath();
            this.replaceCSText('');
            this.sendPath();
            this.hideFileListPopup();
        }
    }

    showCurrentPath(){
        this.current_path_label.setTEXT(this.current_path);
    }

    populateFileListPopup() {
        const fileList = this.fileListPopup.querySelector('ul');
        fileList.innerHTML = '';
        this.files_list.forEach((file) => {
            const li = createEl('li');
            li.textContent = file.name;
            if (file.type === 'dir') {
                li.style.fontStyle = 'italic';
            }
            li.addEventListener('click', () => {
                this.handleFileSelect(file);
            });
            fileList.appendChild(li);
        });
        this.selectedFileIndex = -1;
    }

    addFileToUserFiles(file) {
        this.user_files[file.path] = file;
        this.createFileLabel(file);
    }

    removeFileFromUserFiles(file) {
        const file_element = getOneSelector('.files_list .file_label[data-id="' + file.path + '"]');
        const files_dir_wrapper = getOneSelector('.files_list .files_dir[data-dir_path="' + file.relative_path.replace(file.name, '') + '"]');
        file_element.remove();
        if(files_dir_wrapper.children.length === 1){
            files_dir_wrapper.remove();
        }
        delete this.user_files[file.path];
    }

    createFileLabel(file) {
        let dir_section = getOneSelector('.files_list .files_dir[data-dir_path="' + file.relative_path.replace(file.name, '') + '"]');
        console.log(dir_section);
        if(!dir_section){
            dir_section = createEl('div').addClass('files_dir').addData('dir_path', file.relative_path.replace(file.name, ''));
            const dir_section_label = createEl('div').addClass('dir_section_label').setTEXT(file.relative_path.replace(file.name, ''));
            dir_section.appendChild(dir_section_label);
            getOneSelector('.files_list').appendChild(dir_section);
        }
        const fileLabel = createEl('span');
        fileLabel.setTEXT(file.name).addClass('file_label').addData('id', file.path).addEventListener('click', () => this.removeFileFromUserFiles(file));
        dir_section.appendChild(fileLabel);
    }

    handleConfirmClick(btn) {
        btn.addClass('active');
        const codeWrap = btn.parentElement;
        const hash = btn.getData('id');
        const file = this.parsed_data[hash].file;
        const codeBlock = codeWrap.getOneSelector('code');
        codeBlock.getManySelector('.removed').forEach(i => {
            i.remove();
        });
        const data = unescapeHtml(codeBlock.textContent);

        this.sendRequest('/saveFileContent', { path: this.path, file_name: file.name, file_path: file.path, data: data })
            .then(response => {
                console.log(response);
                codeWrap.getOneSelector('.cancel').remove();
            })
            .catch(error => {
                this.handleError(lang.errFc, error);
            });
    }

    handleCancelClick(btn) {
        btn.addClass('active');
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

    handleError(message, error = null) {
        console.error(message + (error ? error.message : ''));
        oPb.showSmMsg(lang.errMsg + message + (error ? error.message : ''), 'error_msg', 5000);
    }

    saveUserMessage(message) {
        const userMessageElement = createEl('div').addClass('user_msg');
        userMessageElement.innerHTML = nl2br(escapeHtml(message));
        this.chatContent.appendChild(userMessageElement);
    }

    setLoading(isLoading) {
        this.loadingAnimation.style.display = isLoading ? 'block' : 'none';
        this.messageInput.disabled = isLoading;
    }

    getParentDirectory(path) {
        const separator = path.includes('\\') ? '\\' : '/';
        const parts = path.split(separator);
        parts.pop();
        return parts.join(separator);
    }

}