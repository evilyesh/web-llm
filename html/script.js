/**
 * Initializes the main chat class.
 * Ensures the chat is ready when the page loads.
 */
oPb.docReady(() => {
    document.getElementById('loading-animation').style.display = 'none';
	const chat = new ChatList(); // Initialize ChatList instance
});
