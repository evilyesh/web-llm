/**
 * Creates and manages chat messages.
 * Handles message HTML generation, file processing, and user interaction.
 */
class Message {
    constructor(id = null, {
        className = 'message',
        data = null,
        author = null,
        chat = null,
        clearContext = false,
        useDiff = false,
        autoAnswer = false,
        type = 'string' // prompt_w_files - prompt with files list, prompt_improve - text to improve prompt, string - text message, sql_query - message with formatted json with array or object, model_format_err - model not follow format
    } = {}) {
        this.id = id ? id : 'mid' + Date.now(); // Unique identifier for the message - string
        this.className = className; // CSS class name for styling - string
        this.data = data; // class instance - ResponseData
        this.author = author; // Indicates whether the message was created by the user, model, or agent - string
        this.html = null; // DOM element representation of the message - string
        this.chat = chat; // parent chat class - Chat
        this.clearContext = clearContext; // clear context
        this.useDiff = useDiff; // use diff
        this.autoAnswer = autoAnswer; //if model not following format we can auto answer
        this.notFollowFormat = null; //if model not following format mark this
        this.type = type;


        this.constructMessageHtml();
    }

    static escapeAndFormatContent(content) {
        return nl2br(escapeHtml(content));
    }

    constructMessageHtml() {
        this.html = createEl('div').addClass(this.className);
        let content = Message.escapeAndFormatContent(this.data.parsedResponse);

        if (this.data.type === 'array') {
            content = Message.showArrayOrObject(content);
        }

        if (this.data.type === 'prompt') {

            if (Object.entries(this.data.userFiles).length > 0) { // if there are files
                content = this.replaceParsedData(content);

                // possibly, we need show the message with warning
                if (Object.entries(this.data.parsedData).length !== Object.entries(this.data.userFiles).length) {
                    this.notFollowFormat = true; // possibly not follow format or make editings in only necessary files
                }
            }

            if (Object.entries(this.data.unknownData).length) { // if there are unknown data, it can be from model or user

                content = this.replaceUnknownResponse(content);
                //TODO actions for save parsed code
            }
        }

        this.html.innerHTML = content;
        this.attachDataEventListeners();
    }

    attachDataEventListeners() {
        console.log('this.type');
        console.log(this.type);
        if (this.type === 'prompt_w_files') {
            this.html.getManySelector('.removed').forEach(i => {
                i.addEventListener('click', () => i.removeClass('removed'));
            });
            this.html.getManySelector('.added').forEach(i => {
                i.addEventListener('click', () => i.remove());
            });
            this.html.getManySelector('.confirm').forEach(btn => {
                btn.addEventListener('click', () => this.chat.handleConfirmClick(btn, this.data));
            });
            this.html.getManySelector('.cancel').forEach(btn => {
                btn.addEventListener('click', () => this.chat.handleCancelClick(btn, this.data));
            });
        }

        if (this.type === 'prompt_improve') {
            const copyButton = createEl('button').addClass('copy_button').setHTML('📋');
            const textContent = this.html.textContent;
            copyButton.addEventListener('click', () => {
                // Append the text content of the .model_responce element to the chat message input
                this.chat.chatMessageInput.value += textContent;
            });
            this.html.appendChild(copyButton);
        }

        if (this.type === 'model_format_err') {
            this.html.addEventListener('click', () => {
                this.chat.requestData.sendPrompt(lang.modelFormatFollow, this.clearContext, this.useDiff, this.autoAnswer, 'prompt_w_files')  // TODO think how put type from parent request
                    .then(response => {
                        //do nothing, think about TODO
                    });
            });
        }

        if (this.type === 'sql_query') {
            //draft TODO
        }
    }

    replaceParsedData(content) {
        for (const hash in this.data.parsedData) {
            const diff = this.renderDiff(
                replaceFourSpacesWithTab(this.data.parsedData[hash].file.content || ''),
                replaceFourSpacesWithTab(this.data.parsedData[hash].file.data)
            );
            content = content.replace(hash, `
				<div class="file_name">${this.data.parsedData[hash].file.relative_path}:</div>
				<div class="code_wrap" id="${hash}">
					<pre><code>${replaceTabWithFourSpaces(diff.final_html)}</code></pre>
					<button class="confirm" data-id="${hash}">Confirm</button>
					<button class="cancel">Cancel</button>
				</div>
			`);
        }
        return content;
    }

    static showArrayOrObject(content) {
        content = `
				<div class="code_wrap">
					<pre><code>${content}</code></pre>
					<!--<button class="will_be_action_btn">Btn</button>-->
				</div>
			`;
        return content;
    }

    replaceUnknownResponse(content) {
        for (const hash in this.data.unknownData) {
            content = content.replace(hash, `
				<div id="${hash}">
    				<div class="file_name">unknown filename, save it? !TODO!:</div>  <!-- TODO -->
					<pre><code>${escapeHtml(this.data.unknownData[hash])}</code></pre>
                    <button class="save_as" data-id="${hash}">Save</button>
					<button class="cancel">Cancel</button>
				</div>
			`);
        }
        return content;
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
