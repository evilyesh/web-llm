# web-llm

Draft for a web-based LLM chat for developers. Use only with local models; no permissions control.

// This project uses the jsdiff library, which is licensed under the BSD-3-Clause license. https://github.com/kpdecker/jsdiff
// This project uses the flask library, which is licensed under the BSD-3-Clause license. https://github.com/pallets/flask.git

## To Start

1. Clone the repository:
```bash
git clone https://github.com/evilyesh/web-llm.git
cd web-llm
```
2. Create a virtual environment: 
```bash
python3 -m venv venv
```
3. Install Flask: 
```bash
pip install flask
```
4. Start the application: 
```bash
python3 main.py
```
5. Start local model
   1. I use llama.cpp server with llama-server -port 8989
   2. In config/settings.json need to set path to local llm with API like Openai API (example in settings.json for llama.cpp: http://127.0.0.1:8989/v1/chat/completions) 

Open your browser and navigate to [http://127.0.0.1:5001/](http://127.0.0.1:5001/).

### Usage

1. **Enter the path to the directory with files.**
2. **In the chat, use `./` to select files from the chosen directory and add a prompt.**
3. **For navigation through the directory, use `../` to go up one level and `./` to select a directory from the list to go down.**

The response from the model will be displayed in a diff manner.

## TODO

- [ ] fix user prompt insert in html - now <? ?> translates in html as comment
- [ ] Load file content before send prompt and before diff with model answer. (its differ if user edit file too)
- [ ] Display the full file path if there are files with the same name in different directories.
- [ ] Implement permissions control.
- [ ] Implement config select
- [ ] Put files drag and drop
- [ ] Make dataset from history
