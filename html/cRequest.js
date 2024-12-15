/**
 * Handles HTTP requests to the server.
 * Provides methods for sending requests and processing responses.
 */
class CRequest {
    // Constructor to initialize the path property
	constructor() {
		this.path = '';
		this.loadingAnimation = document.querySelector('#loading-animation');
	}

	// Method to send a request to the server
	sendRequest(path, data) {
		const url = path;
		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		};

		this.loadingAnimation.style.display = '';

		return fetch(url, options)
			.then(response => {
				if (!response.ok) {
					throw new Error('Network response was not ok ' + response.statusText);
				}
				return response.json();
			})
			.catch(error => {
                console.error('There was a problem with the fetch operation:', error);
                throw new Error('Network response was not ok ' + response.statusText);
			})
			.finally(() => {
				console.log('Request completed ' + path);
				this.loadingAnimation.style.display = 'none';
			});
	}
}

