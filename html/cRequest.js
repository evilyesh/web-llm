/**
 * Handles HTTP requests to the server.
 * Provides methods for sending requests and processing responses.
 */
class CRequest {
    // Constructor to initialize the path property
	constructor(chat) {
        this.chat = chat;
		this.path = '';
		this.loadingAnimation = document.querySelector('#loading-animation');
	}

	// Method to send a request to the server
	sendRequest(path, data, hidden = false) {
		const url = path;
		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		};

		// Ensure the loading animation is displayed before the request is sent
		this.loadingAnimation.style.display = 'block';
		if(!hidden){
            this.chat.disableChatInputAndSubmitBtn();
		}

		return fetch(url, options)
			.then(response => {
				if (!response.ok) {
					throw new Error('Network response was not ok ' + response.statusText);
				}
				return response.json();
			})
			.catch(error => {
				console.error('There was a problem with the fetch operation:', error);
				throw new Error('Network response was not ok ' + error.statusText);
			})
			.finally(() => {
				console.log('Request completed ' + path);
				this.loadingAnimation.style.display = 'none';
                this.chat.requestInProgress = false;
                if(!hidden) {
                    this.chat.enableChatInputAndSubmitBtn();
                }
            });
	}
}
