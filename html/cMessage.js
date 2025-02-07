/**
 * Manages chat messages and their content:
 * - Creates message objects
 * - Parses server responses
 * - Renders messages in chat interface
 */
class Message {
	constructor(id = null, {
		className = 'message',
		data = null,
		author = null,
		chat = null,
		clearContext = false,
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
		this.autoAnswer = autoAnswer; //if model not following format we can auto answer
		this.notFollowFormat = null; //if model not following format mark this
		this.type = type;

		this.constructMessageHtml();
	}

	constructMessageHtml() {
		const escaped_text = escapeAndFormatContent(this.data.parsedResponse);
		const escaped_html = splitTextInHtml(escaped_text, Object.keys(this.data.parsedData), Object.keys(this.data.unknownData));

		this.html = createEl('div').addClass(this.className);
		this.html.append(escaped_html);

		if (this.data.type === 'prompt' && Object.entries(this.data.userFiles).length > 0 && Object.entries(this.data.parsedData).length !== Object.entries(this.data.userFiles).length) {
			this.notFollowFormat = true; // possibly not follow format or make editings in only necessary files
		}
	}

	replaceParsedData() {
		for (const hash in this.data.parsedData) {
			const message_block = this.html.getOneSelector(`#${hash}`);
			const code_wrap = createEl('div').addClass('code_wrap');
			code_wrap.id = `cw-${hash}`;
			const file_name = createEl('div').addClass('file_name').setTEXT(this.data.parsedData[hash].file.relative_path);
			const confirm_btn = createEl('button').addClass('confirm').addData('id', `cw-${hash}`).setTEXT('Confirm');
			const cancel_btn = createEl('button').addClass('cancel').addData('id', `cw-${hash}`).setTEXT('Remove editor');

			message_block.append(file_name);
			message_block.append(code_wrap);
			message_block.append(confirm_btn);
			message_block.append(cancel_btn);

			const redactor = this.renderDiff(
				replaceFourSpacesWithTab(this.data.parsedData[hash].file.content || ''),
				removeMarkdownAndCodeLanguage(replaceFourSpacesWithTab(this.data.parsedData[hash].file.data)),
				code_wrap,
				this.data.parsedData[hash].file.code_type || 'plaintext'
			);

			const modifiedModel = redactor.getModel().modified;
			confirm_btn.onClick(e => {
				this.chat.handleConfirmClick(confirm_btn, this.data.parsedData[hash].file, modifiedModel.getValue())
			});
			cancel_btn.onClick(e => {
				this.chat.handleCancelClick(cancel_btn, redactor, `cw-${hash}`, this.data.parsedData, hash)
			});
		}
	}

	replaceUnknownData() {
		for (const hash in this.data.unknownData) {
			const message_block = this.html.getOneSelector(`#${hash}`);
			const code_wrap = createEl('div').addClass('code_wrap');
			code_wrap.id = `cw-${hash}`;
			const save_as = createEl('button').addClass('save_as').addData('id', `cw-${hash}`).setTEXT('Save as');
			const cancel_btn = createEl('button').addClass('cancel').addData('id', `cw-${hash}`).setTEXT('Remove editor');

			message_block.append(code_wrap);
			message_block.append(save_as);
			message_block.append(cancel_btn);

			const redactor = this.renderEditor(
				removeMarkdownAndCodeLanguage(replaceFourSpacesWithTab(this.data.unknownData[hash].data || '')),
				code_wrap
			);

			cancel_btn.onClick(e => {
				this.chat.handleCancelClick(cancel_btn, redactor, `cw-${hash}`, {}, hash); // TODO remove from this.data.unknownData
			});

			save_as.onClick(e => {
				this.saveEditorDataToFile(redactor.getValue(), `unknown_data_${hash}.txt`);
			});
		}
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

	renderDiff(init_text, new_text, element, code_type) {

		const diffEditor = window.monaco.editor.createDiffEditor(element, {
			originalEditable: false,
			readOnly: false,
			theme: 'vs-dark',
			scrollbar:
				{
					alwaysConsumeMouseWheel: false
				}
		});

		const originalModel = window.monaco.editor.createModel(init_text, code_type);
		const modifiedModel = window.monaco.editor.createModel(new_text, code_type);

		diffEditor.setModel({
			original: originalModel,
			modified: modifiedModel
		});

		return diffEditor;
	}

	renderEditor(text, element) {
		// Создаем экземпляр редактора
		const editor = window.monaco.editor.create(element, {
			value: text,  // Изначальный текст в редакторе
			language: 'javascript',  // Язык программирования
			theme: 'vs-dark',  // Тема редактора
			readOnly: false,  // Режим только для чтения
			scrollbar: {
				alwaysConsumeMouseWheel: false  // Отключение прокрутки колесиком мыши вне области прокрутки
			}
		});

		return editor;
	}

	saveEditorDataToFile(content, filename) {
		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
}