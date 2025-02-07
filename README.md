# web-llm

Draft for a web-based LLM chat for developers. 


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
   - In config/settings.json need to set path to local llm with API like Openai API (example in settings.json for llama.cpp: http://127.0.0.1:8989/v1/chat/completions) 
   - I use llama.cpp server with llama-server -port 8989, for example start local llama.cpp model with web server interface:
```bash
/path_to_bin/llama-server --port 8989 -m /path_to_model/Qwen2.5-Coder-32B-Instruct-Q5_K_L.gguf -p "Hello, you are coder assistant" -ngl 99 --n-predict -1 --ctx-size 12240 --threads 4 --no-mmap --temp 0.01 --top-k 10 --cache-type-k q8_0 --cache-type-v q8_0 --flash-attn
```
Llama.cpp https://github.com/ggerganov/llama.cpp

6. Open your browser and navigate to [http://127.0.0.1:5001/](http://127.0.0.1:5001/).

### Usage

1. **Enter the path to the directory with files.**
2. **In the chat, use `./` to select files from the chosen directory and add a prompt.**
3. **For navigation through the directory, use `../` to go up one level and `./` to select a directory from the list to go down.**

The response from the model will be displayed in a diff manner.

## TODO

- [x] fix user prompt insert in html - now <? ?> translates in html as comment
- [x] Load file content before send prompt... 
- [x] and before diff with model answer. (its differ if user edit file too)
- [x] Display the full file path if there are files with the same name in different directories.
- [ ] Implement permissions control. (semi realised, model can't save files outside project directory)
- [x] Implement config select
- [x] Make dataset draft from history
- [ ] Put files drag and drop (need electron for this feature, may be in future)
- [x] make improve prompt button


- [x] Fix files list popup.
- [x] Make settings popup.
- [x] make sql query to database.
- [ ] currently can't edit files with ``` in content
- [ ] set files encodings
- [ ] save code blocks


- This project uses the jsdiff library, which is licensed under the BSD-3-Clause license. https://github.com/kpdecker/jsdiff
- This project uses the flask library, which is licensed under the BSD-3-Clause license. https://github.com/pallets/flask.git
- This project uses the psycopg2 library, which is licensed under the LGPL license. https://github.com/psycopg/psycopg2
