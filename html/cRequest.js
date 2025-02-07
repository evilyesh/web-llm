/**
 * Handles HTTP requests to the server:
 * - Sends POST requests
 * - Manages loading states
 * - Processes response errors
 */
class CRequest {
	constructor(chat) {
		this.chat = chat;
		this.path = '';
		this.loadingAnimation = document.querySelector('#loading-animation');
		this.requestInProgress = false;
	}

	sendRequest(path, data, hidden = false) {
		const url = path;
		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		};

		this.loadingAnimation.style.display = 'block';
		if (!hidden) {
			this.chat.disableChatInput();
		}

		return fetch(url, options)
			.then(response => {
				if (!response.ok) {
					return response.json().then(errorData => {
						throw new Error(errorData.error || 'Network response was not ok ' + response.statusText);
					});
				}
				return response.json();
			})
			.catch(error => {
				this.loadingAnimation.style.display = 'none';
				this.chat.requestInProgress = false;
				if (!hidden) {
					this.chat.enableChatInput();
				}
				this.chat.handleError('There was a problem with the fetch operation:', error);
			})
			.finally(() => {
				this.loadingAnimation.style.display = 'none';
				this.chat.requestInProgress = false;
				if (!hidden) {
					this.chat.enableChatInput();
				}
			});
	}

	sendRequestIfNotInProgress(requestFunction, messageText = null, className = null) {
		if (this.chat.requestInProgress) {
			this.chat.handleError(lang.requestInProgress);
			return;
		}
		this.chat.requestInProgress = true;
		this.chat.disableChatInput();
		if (messageText && className) {
			const msg = new Message('mid' + Date.now(), {
				className: className,
				data: ResponseData.create(this.chat, { data: messageText }),
				author: 'user',
				chat: this.chat,
				type: 'user_message'
			});
			msg.html.appendTo(this.chat.chatContent);
			this.chat.messages.push(msg);
			this.chat.scrollToMessage(msg.html);
		}
		requestFunction();
	}
}