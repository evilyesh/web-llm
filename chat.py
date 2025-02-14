"""
Handles interactions with language model API.
Includes functions for sending prompts, processing responses,
and managing chat history.
"""

import requests
import json
import datetime
import re
import hashlib
import os

from anyio import sleep


def simple_hash(input_str):
	"""Generate a simple MD5 hash of the input string."""
	return hashlib.md5(input_str.encode()).hexdigest()

def parse_response(response_text, user_files):
	"""
	Parse the response text from the language model.
	Extracts known and unknown code blocks and replaces them with UUIDs.
	"""
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
	"""
	Send a prompt to the language model API and return the response.
	Raises an exception if the request fails.
	"""
	response = requests.post(url, headers=headers, data=json.dumps(payload))
	if response.status_code == 200:
		return response.json()['choices'][0]['message']['content'].strip()
	else:
		raise Exception(f"API request failed with status code {response.status_code}: {response.text}")

def calculate_total_tokens(messages):
	"""
	Calculate the total number of tokens in a list of messages.
	Each token is approximated as 3 words.
	"""
	total_tokens = 0
	for message in messages:
		total_tokens += len(message["content"].split()) * 3
	return total_tokens

def log_history(prompt, model_response):
	"""
	Log the chat history to a file with timestamps.
	Includes both user prompts and model responses.
	"""
	with open('history/history.txt', 'a') as history_file:
		history_file.write(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]\n")
		history_file.write(f"<|---###|>\n")
		history_file.write(f"\nUser: <|----####|>{prompt}<|####----|>\n")
		history_file.write(f"Model: <|-----#####|>{model_response}<|#####-----|>\n\n")
		history_file.write(f"<|###---|>\n")

def log_prompt(prompt):
	"""
	Log the user prompt to a separate file with timestamps.
	"""
	with open('history/prompt.txt', 'a') as prompt_file:
		prompt_file.write(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]\n")
		prompt_file.write(f"{prompt}\n\n")

def log_chatml(prompt, model_response):
	"""
	Store chat history in ChatML format in a JSONL file.
	
	Args:
		prompt (str): User's prompt
		model_response (str): Model's response
	"""
	# Create chat history entry
	chat_entry = {
		"messages": [
			{"role": "user", "content": prompt},
			{"role": "assistant", "content": model_response}
		]
	}
	
	# Convert to JSON string
	json_entry = json.dumps(chat_entry, ensure_ascii=False)
	
	# Write to file
	history_file_path = 'history/history.jsonl'
	with open(history_file_path, 'a') as f:
		f.write(json_entry + '\n')
