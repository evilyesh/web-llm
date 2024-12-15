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
	} = {}) {
		this.id = id ? id : 'mid' + Date.now() ; // Unique identifier for the message - string
		this.className = className; // CSS class name for styling - string
		this.data = data; // class instance - ResponseData
		this.author = author; // Indicates whether the message was created by the user, model, or agent - string
		this.html = null; // DOM element representation of the message - string
		this.chat = chat; // parent chat class - Chat
		this.clearContext = clearContext; // clear context
		this.useDiff = useDiff; // use diff
		this.autoAnswer = autoAnswer; //if model not following format we can auto answer
		this.notFollowFormat = null; //if model not following format mark this


		this.constructMessageHtml();
	}

	static escapeAndFormatContent(content) {
		return nl2br(escapeHtml(content));
	}

	constructMessageHtml() {
		this.html = createEl('div').addClass(this.className);
		let content = Message.escapeAndFormatContent(this.data.parsedResponse);

		if(Object.entries(this.data.userFiles).length > 0) { // if there are files
			if(Object.entries(this.data.parsedData).length) {
				content = this.replaceParsedData(content);
			}else{ // if there are no parsed data, we need show the message with warning
				this.notFollowFormat = true;
			}
		}

		if(Object.entries(this.data.unknownData).length){ // if there are no unknown data, it can be from model or user

			content = this.replaceUnknownResponse(content);

		}

		this.html.innerHTML = content;
		this.attachDataEventListeners(this.html);
		console.log(content);
	}

	attachDataEventListeners(messageElement) {
		console.log(messageElement);
		messageElement.getManySelector('.removed').forEach(i => {
			i.addEventListener('click', () => i.removeClass('removed'));
		});
		messageElement.getManySelector('.added').forEach(i => {
			i.addEventListener('click', () => i.remove());
		});
		messageElement.getManySelector('.confirm').forEach(btn => {
			console.log(btn);
			btn.addEventListener('click', () => this.chat.handleConfirmClick(btn, this.data));
		});
		messageElement.getManySelector('.cancel').forEach(btn => {
			btn.addEventListener('click', () => this.chat.handleCancelClick(btn, this.data));
		});
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

	replaceUnknownResponse(content) {
		for (const hash in this.data.unknownData) {
			content = content.replace(hash, `
				<div id="${hash}">
					<pre><code>${escapeHtml(this.data.unknownData[hash])}</code></pre>
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
