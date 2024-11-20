class ResponseData {
    constructor(chatInstance) {
        this.chat = chatInstance;
    }

    displayMessage() {
        let messageElement = createEl('div').addClass('one_message');
        let content = nl2br(escapeHtml(this.chat.parsed_response));
        Object.keys(this.chat.parsed_data).forEach(hash => {

            const diff = this.renderDiff(replaceFourSpacesWithTab(this.chat.parsed_data[hash].file.content || ''), replaceFourSpacesWithTab(this.chat.parsed_data[hash].file.data));
            content = content.replace(hash, '<div class="file_name">' + this.chat.parsed_data[hash].file.relative_path + ':\n</div><div class="code_wrap" id="' + hash + '"><pre><code>' + diff.final_html + '</code></pre><button class="confirm" data-id="' + hash + '">Confirm</button><button class="cancel">Cancel</button></div>');
        });

        Object.keys(this.chat.unknown_response).forEach(hash => {
            content = content.replace(hash, '<div id="' + hash + '"><pre><code>' + escapeHtml(this.chat.unknown_response[hash]) + '</code></pre></div>');
        });

        messageElement.innerHTML = content;
        this.chat.chatContent.appendChild(messageElement);
        messageElement.getManySelector('.removed').forEach(i => {
            i.addEventListener('click', () => i.removeClass('removed'));
        });
        messageElement.getManySelector('.added').forEach(i => {
            i.addEventListener('click', () => i.remove());
        });
        messageElement.getManySelector('.confirm').forEach(btn => {
            btn.addEventListener('click', () => this.chat.handleConfirmClick(btn));
        });
        messageElement.getManySelector('.cancel').forEach(btn => {
            btn.addEventListener('click', () => this.chat.handleCancelClick(btn));
        });
        console.log(content);
    }

    parseResponse(response_data) {
        try {
            let data = response_data.data;
            if (typeof data !== 'undefined' && data) {
                data = replaceFourSpacesWithTab(data);
                console.log(JSON.stringify(data, null, 2));
                Object.values(this.chat.user_files).forEach(file => {
                    let regex = new RegExp(escapeRegExp(file.relative_path) + pattern, 'g');
                    console.log(regex);
                    let match = regex.exec(data);
                    console.log(match);
                    if (match) {
                        const uuid = '###' + simpleHash(match[2]) + '###';
                        this.chat.parsed_data[uuid] = { file: file, data: match[2] };
                        file.data = match[2];
                        data = data.replace(match[0], uuid);
                    }
                });

                let unknownMatch;
                while ((unknownMatch = /`{3}.*?\n([\s\S]*?)`{3}/g.exec(data)) !== null) {
                    console.log(unknownMatch);
                    const uuid = '###' + simpleHash(unknownMatch[1]) + '###';
                    this.chat.unknown_response[uuid] = unknownMatch[1];
                    data = data.replace(unknownMatch[0], uuid);
                }
                this.chat.parsed_response = data;
                console.log(this.chat);
            } else {
                throw new Error('Data is empty!');
            }
        } catch (error) {
            this.chat.handleError('Error occurred while parsing response: ', error);
        }
    }

    renderDiff(init_text, new_text) {
        let diffs = Diff.diffLines(init_text, new_text);
        let removed_html = '';
        let final_html = '';

        diffs.forEach(part => {
            const escval = escapeHtml(part.value);
            if (part.added) {
                final_html += '<span class="added">' + escval + '</span>';
            } else if (part.removed) {
                removed_html += '<span class="removed">' + escval + '</span>';
                final_html += '<span class="removed">' + escval + '</span>';
            } else {
                final_html += '<div class="unchainged">' + escval + '</div>';
            }
        });

        return {
            removed_html: removed_html,
            final_html: final_html
        };
    }
}