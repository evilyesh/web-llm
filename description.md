**# Project: Interactive Chat with File Management and Settings Support

This project is a web application that allows users to interact with a model through an interactive chat. Users can send messages, view and edit files, and configure chat settings. The project consists of several files, each responsible for a specific functionality.

---

## Project Structure

1. **HTML and CSS**:
   - `index.html`: The main HTML file that defines the structure of the web page. It includes interface elements such as the chat, message input form, settings, and file list.
   - `style.css`: The stylesheet file that defines the appearance of the interface.

2. **JavaScript**:
   - `fn.js`: Contains helper functions and extensions for working with the DOM, such as creating elements, handling events, and working with classes.
   - `cRequest.js`: The `CRequest` class is responsible for sending HTTP requests to the server.
   - `cRequestData.js`: The `RequestData` class handles data sent in requests and builds prompts for the model.
   - `cResponseData.js`: The `ResponseData` class handles server responses and parses them.
   - `cSettings.js`: The `CSettings` class manages chat settings, including loading and saving settings.
   - `cFilesList.js`: The `FilesList` class manages the file list, its display, and interaction with files.
   - `cMessage.js`: The `Message` class creates and manages chat messages.
   - `cChatList.js`: The main `ChatList` class manages the chat logic, including message handling, responses, and file interactions.
   - `script.js`: Initializes the main chat class (`ChatList`) when the page loads.

3. **Python (Flask)**:
   - `main.py`: The main server file that handles client requests, interacts with the file system, sends requests to the model, and returns responses.
   - `settings.py`: A module for working with settings, including loading and saving configurations.

---

## Description of Each File

### 1. **HTML and CSS**

- **`index.html`**:
  - The main file that defines the structure of the web page. It includes interface elements such as the chat, message input form, settings, and file list.
  - It connects all necessary JavaScript files and libraries for the application to work.

- **`style.css`**:
  - The stylesheet file that defines the appearance of the interface. It includes styles for the chat, input form, settings, and file list.

### 2. **JavaScript**

- **`fn.js`**:
  - Contains helper functions and extensions for working with the DOM.
  - Includes methods for creating elements, adding/removing classes, handling events, and other DOM operations.

- **`cRequest.js`**:
  - The `CRequest` class is responsible for sending HTTP requests to the server.
  - It is used to retrieve the file list, send prompts, save files, and other operations.

- **`cRequestData.js`**:
  - The `RequestData` class handles data sent in requests.
  - It includes methods for building prompts, sending them to the server, and processing responses.

- **`cResponseData.js`**:
  - The `ResponseData` class handles server responses.
  - It includes methods for parsing responses, processing files, and generating HTML code for display in the chat.

- **`cSettings.js`**:
  - The `CSettings` class manages chat settings.
  - It includes methods for loading and saving settings, as well as interacting with the server.

- **`cFilesList.js`**:
  - The `FilesList` class manages the file list.
  - It includes methods for displaying the file list, navigating directories, adding, and removing files.

- **`cMessage.js`**:
  - The `Message` class creates and manages chat messages.
  - It includes methods for generating message HTML code, processing files, and interacting with the user.

- **`cChatList.js`**:
  - The main `ChatList` class manages the chat logic.
  - It includes methods for handling messages, responses, file interactions, and settings.

- **`script.js`**:
  - Initializes the main chat class (`ChatList`) when the page loads.

### 3. **Python (Flask)**

- **`main.py`**:
  - The main server file that handles client requests.
  - It includes routes for retrieving the file list, sending prompts, saving files, executing SQL queries, and managing settings.

- **`settings.py`**:
  - A module for working with settings.
  - It includes methods for loading and saving configurations, as well as interacting with the file system.

---

## Main Functions of the Project

1. **Chat**:
   - Users can send messages in the chat, which are processed by the model.
   - The model returns responses that are displayed in the chat.

2. **File Management**:
   - Users can view the file list, navigate directories, and select files for editing.
   - Files can be sent to the chat for processing by the model.

3. **Settings**:
   - Users can configure chat parameters such as prefixes, postfixes, diff usage, and others.
   - Settings are saved on the server and can be loaded on the next launch.

4. **SQL Queries**:
   - Users can execute SQL queries through the interface if supported by the server.

---

## Conclusion

This project is an interactive chat with file management and settings support. It allows users to interact with the model, view and edit files, and configure chat parameters. The project consists of several files, each responsible for a specific functionality, making it structured and easily extensible.**