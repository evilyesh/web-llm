# web-llm

Draft for a web-based LLM chat for developers. Use only with local models; no permissions control.

## To Start

1. Create a virtual environment: `make venv`
2. Install Flask: `pip install flask`
3. Start the application: `python main.py`

Open your browser and navigate to [http://127.0.0.1:5001/](http://127.0.0.1:5001/).

### Usage

1. **Enter the path to the directory with files.**
2. **In the chat, use `./` to select files from the chosen directory and add a prompt.**
3. **For navigation through the directory, use `../` to go up one level and `./` to select a directory from the list to go down.**

The response from the model will be displayed in a diff manner.

## TODO

- [ ] Display the full file path if there are files with the same name in different directories.
- [ ] Implement permissions control.