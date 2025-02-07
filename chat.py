import requests
import json
import datetime
import re
import hashlib
import time

from anyio import sleep


def simple_hash(input_str):
	return hashlib.md5(input_str.encode()).hexdigest()

def parse_response(response_text, user_files):
	parsed_data = {}
	unknown_data = {}
	pattern = r'```(?:.*?\n)?(.*?)```'
	unknown_pattern = r'```(?:([a-zA-Z]+)\n)?(.*?)```'
	
	# Process known files
	for file in user_files.values():
		file_patterns = [
			re.escape(file['relative_path']) + r':\s*' + pattern,
			r'#\s*' + re.escape(file['relative_path']) + pattern
		]
		
		for file_pattern in file_patterns:
			regex = re.compile(file_pattern, re.DOTALL)
			for match in regex.finditer(response_text):
				code_content = match.group(1).strip()
				uuid = f"---{simple_hash(code_content)}---"
				parsed_data[uuid] = {
					"file": file,
					"data": code_content
				}
				response_text = response_text.replace(match.group(0), uuid)

	# Process unknown code blocks
	unknown_regex = re.compile(unknown_pattern, re.DOTALL)
	for match in unknown_regex.finditer(response_text):
		file_type = match.group(1) or 'plaintext'
		code_content = match.group(2).strip()
		uuid = f"---{simple_hash(code_content)}---"
		unknown_data[uuid] = {
			"file_type": file_type,
			"data": code_content
		}
		response_text = response_text.replace(match.group(0), uuid)

	return {
		"parsed_text": response_text,
		"parsed_data": parsed_data,
		"unknown_data": unknown_data
	}

def chat_with_model(url, payload, headers):
	response = requests.post(url, headers=headers, data=json.dumps(payload))
	if response.status_code == 200:
		return response.json()['choices'][0]['message']['content'].strip()
	else:
		raise Exception(f"API request failed with status code {response.status_code}: {response.text}")

def calculate_total_tokens(messages):
	total_tokens = 0
	for message in messages:
		total_tokens += len(message["content"].split()) * 3
	return total_tokens

def log_history(prompt, model_response):
	with open('history/history.txt', 'a') as history_file:
		history_file.write(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]\n")
		history_file.write(f"<|---###|>\n")
		history_file.write(f"\nUser: <|----####|>{prompt}<|####----|>\n")
		history_file.write(f"Model: <|-----#####|>{model_response}<|#####-----|>\n\n")
		history_file.write(f"<|###---|>\n")

def log_prompt(prompt):
	with open('history/prompt.txt', 'a') as prompt_file:
		prompt_file.write(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]\n")
		prompt_file.write(f"{prompt}\n\n")

