import os
import json
import requests
import datetime
import lang
from db import Database
from code_request import process_model_response
from chat import chat_with_model, log_chatml
import copy
import re  # Import regex module

selected_settings = None
db = Database()
db.db_init()

def get_files_list(data):
	path = data.get('path') or data.get('project_path')
	current_path = data.get('current_path')

	if not path or not current_path:
		return {"error": "No directory provided"}, 400

	files_list = [
		{
			"name": entry.name,
			"type": 'file' if entry.is_file() else 'dir',
			"path": entry.path,
			"directory": current_path,
			"project_path": path,
			"content": '',
			"data": '',
			"relative_path": entry.path.replace(path, ''),
			"code_type": get_file_code_type(entry.name)
		}
		for entry in os.scandir(current_path)
	]

	files_list.sort(key=lambda x: (x['type'] == 'file', x['name']))

	return files_list

def get_files_content(data):
	files = data.get('files')
	path = data.get('path')

	if not files or not path:
		return {"error": "No files provided"}, 400

	return _get_files_content(files)

def _get_files_content(files):
	return {file.get('path'): open(file.get('path'), 'r').read() for file in files.values()}

def calculate_total_tokens(messages):
	return sum(len(message["content"].split()) * 3 for message in messages)

def save_file(data):
	path = data.get('path')
	file_name = data.get('file_name')
	file_path = data.get('file_path')
	file_content = data.get('data')

	if not all([path, file_name, file_path, file_content]):
		return {"error": f"File {os.path.join(path, file_name)} was not updated."}

	with open(file_path, 'w') as file:
		file.write(file_content)

	return {"error": "", "msg": f"File {os.path.join(path, file_name)} updated"}

def save_settings(data, settings):
	prefix = data.get('prefix')
	postfix = data.get('postfix')

	if not all([prefix, postfix]):
		return {"error": f"Settings were not updated."}

	settings.set('prefix', prefix)
	settings.set('postfix', postfix)
	return {"error": "", "msg": f"Settings updated"}

def get_settings_list():
	config_dir = 'config/'
	config_files = [f for f in os.listdir(config_dir) if f.endswith('.json')]
	return [
		{
			"file_name": config_file,
			"settings": json.load(open(os.path.join(config_dir, config_file), 'r'))
		}
		for config_file in config_files
	]

def set_selected_settings(data, settings):
	global selected_settings
	selected_settings = data.get('selectedSettings')
	settings.loadSettings(selected_settings)
	return {"error": "", "msg": f"Selected settings set to {selected_settings}"}

def record_audio(data, settings):
	whisper_address = settings.get("whisper_address")
	response = requests.post(whisper_address, files=data)
	if response.status_code == 200:
		return {"transcription": response.json().get('text', '')}
	else:
		return {"error": "Failed to transcribe audio"}

def get_project_files(path, exclude_items=None):
	exclude_items = exclude_items or []

	def get_files_recursively(current_path):
		files = []
		for item in os.scandir(current_path):
			if os.path.abspath(item.path) not in exclude_items.keys() and not check_binary_extension(item.name):
				print(item.name)
				files.extend(get_files_recursively(item.path)) if item.is_dir() else files.append(os.path.abspath(item.path))
		return files

	return get_files_recursively(path)

def check_files_for_updates(files, path):
	files_info_dict = {info['path']: info for info in db.get_file_info(files)}
	files_to_parse = [
		file
		for file in files
		if not (files_info_dict.get(file) and files_info_dict[file]['mtime'] == os.path.getmtime(file) and files_info_dict[file]['size'] == os.path.getsize(file))
	]

	files_content = _get_files_content({file: {'path': file} for file in files_to_parse}) if files_to_parse else {}
	db.add_or_update_file_info_short([(file, os.path.getsize(file), os.path.getmtime(file)) for file in files_to_parse])

	return files_to_parse, files_content

def find_retrieve_code(model_response):
	return process_model_response(model_response, db)

def prepare_send_prompt(data, settings):
	url = settings.get("url")
	headers = settings.get("headers")
	system = settings.system
	prompt = data.get('prompt')
	clear_input = data.get('clear_input')
	files_list = data.get('files_list')
	use_descriptions = data.get('use_descriptions', False)
	prepare_plan = data.get('prepare_plan', False)
	prompt_prefix = data.get('prompt_prefix', '')

	retrieved_code = retrieve_send_prompt(data, settings) if use_descriptions else ''
	analise_task = analise_send_prompt({"prompt": f"{lang.PROMPT_PREFIX}{prompt}\n{lang.PROMPT_PREFIX_PREFIX + prompt_prefix + '\n' if prompt_prefix else ''}\n{retrieved_code}", "files_list": files_list}, settings) if prepare_plan else ''

	files_content = _get_files_content(files_list) if files_list else {}
	additional_prompt = settings.prefix + ''.join(
		settings.files_content_wrapper.format(file.replace(files_list.get(file, {}).get('project_path'), ''), settings.content_delimiter, content, settings.content_delimiter)
		for file, content in files_content.items()
	)

	prompt = f"{lang.PROMPT_PREFIX}{prompt}\n{lang.PROMPT_PREFIX_PREFIX + prompt_prefix + '\n' if prompt_prefix else ''}{analise_task + '\n'if analise_task else ''}{additional_prompt + '\n' if additional_prompt else ''}{retrieved_code + '\n' if retrieved_code else ''}\n{lang.POSTFIX}"

	payload = settings.get("payload_init")

	if clear_input or not payload["messages"]:
		payload["messages"] = [{"role": "system", "content": system}]

	try:
		if calculate_total_tokens([{'content': prompt}]) + calculate_total_tokens([{'content': payload["messages"][0].get('content')}]) > payload["max_tokens"]:
			payload["messages"] = [payload["messages"][0]]
		else:
			while calculate_total_tokens(payload["messages"]) + calculate_total_tokens([{'content': prompt}]) > payload["max_tokens"]:
				payload["messages"].pop(1) if len(payload["messages"]) > 1 else None
	except Exception as e:
		print(e)

	payload["messages"].append({"role": "user", "content": prompt})
	model_response = chat_with_model(url, payload, headers)
	payload["messages"].append({"role": "assistant", "content": model_response})

	log_chatml(prompt, model_response)

	return {"error": "", "data": f'{analise_task}\n---\n{model_response}'}

def retrieve_send_prompt(data, settings):
	system = settings.system  # ?
	prompt = data.get('prompt')
	files_list = data.get('files_list')
	url = settings.get("url")
	headers = settings.get("headers")
	files_content = _get_files_content(files_list) if files_list else {}

	func_additional_prompt = ''.join(
		settings.files_content_wrapper.format(file.replace(files_list.get(file, {}).get('project_path'), ''), settings.content_delimiter, content, settings.content_delimiter)
		for file, content in files_content.items()
	)

	tp = f"{lang.GET_CODE_ADD_PROMPT}{prompt}{lang.GET_CODE_FILES_LIST}{func_additional_prompt}"
	messages = {"messages": [{"role": "system", "content": system}, {"role": "user", "content": tp}]}

	payload = copy.deepcopy(settings.get('payload_init', {}))
	payload.update(messages)

	model_response = chat_with_model(url, payload, headers)
	retrieved_code = find_retrieve_code(model_response)
	if retrieved_code:
		retrieved_code = f"{lang.GET_CODE_FOR_INFORMATION}\n{retrieved_code}"

	return retrieved_code

def analise_send_prompt(data, settings):
	url = settings.get("think_model_address") or settings.get("url")
	headers = settings.get("headers")
	prompt = data.get('prompt')
	files_list = data.get('files_list')
	payload = copy.deepcopy(settings.get('payload_init', {}))

	model = settings.get("think_model")
	if model:
		payload.update({"model": model})

	files_content = _get_files_content(files_list) if files_list else {}

	think_additional_prompt = ''.join(
		settings.files_content_wrapper.format(file.replace(files_list.get(file, {}).get('project_path'), ''), settings.content_delimiter, content, settings.content_delimiter)
		for file, content in files_content.items()
	)

	tp = f"{lang.THINK_ADD_PROMPT}{prompt}{lang.THINK_FILES_LIST}{think_additional_prompt}"
	messages = {"messages": [{"role": "system", "content": lang.SYSTEM_THINK_PROMPT}, {"role": "user", "content": tp}]}

	payload.update(messages)
	model_response = chat_with_model(url, payload, headers)

	log_chatml(prompt, model_response)

	cleaned_response = clean_think_content(model_response)  # Clean the response
	prompt += '\n\n' + cleaned_response

	return cleaned_response

def get_short_description(code, settings):
	url = settings.get("url")
	headers = settings.get("headers")
	payload = copy.deepcopy(settings.get('payload_init', {}))

	messages = {"messages": [{"role": "system", "content": lang.PARSE_SHORT_DESCRIPTION_DB_SYSTEM}, {"role": "user", "content": f"{lang.PARSE_SHORT_DESCRIPTION_DB_PROMPT}{code}"}]}
	payload.update(messages)

	return chat_with_model(url, messages, headers)

def send_edit_prompt(data, settings):
	prompt = data.get('prompt')
	clear_input = data.get('clear_input')

	if not prompt:
		return {"error": "No prompt provided"}, 400

	url = settings.get("small_model_address") or settings.get("url")
	headers = settings.get("headers")
	payload = copy.deepcopy(settings.get("payload_init"))

	if clear_input or not payload["messages"]:
		payload["messages"] = [{"role": "system", "content": settings.system}]

	try:
		if calculate_total_tokens([{'content': f"{settings.edit_prompt_prefix} \n{prompt}"}]) + calculate_total_tokens([{'content': payload["messages"][0].get('content')}]) > payload["max_tokens"]:
			payload["messages"] = [payload["messages"][0]]
		else:
			while calculate_total_tokens(payload["messages"]) + calculate_total_tokens([{'content': f"{settings.edit_prompt_prefix} \n{prompt}"}]) > payload["max_tokens"]:
				payload["messages"].pop(1) if len(payload["messages"]) > 1 else None
	except Exception as e:
		print(e)

	payload["messages"].append({"role": "user", "content": f"{settings.edit_prompt_prefix} \n{prompt}"})
	model_response = chat_with_model(url, payload, headers)
	payload["messages"].append({"role": "assistant", "content": model_response})

	return {"error": "", "data": model_response}

def get_file_code_type(file_name):
	extension = os.path.splitext(file_name)[1].lower()
	code_types = {
		'.py': 'python',
		'.js': 'javascript',
		'.html': 'html',
		'.css': 'css',
		'.php': 'php',
		'.java': 'java',
		'.c': 'c',
		'.cpp': 'cpp',
		'.go': 'go',
		'.rb': 'ruby',
		'.swift': 'swift',
		'.ts': 'typescript',
		'.jsx': 'jsx',
		'.tsx': 'tsx',
		'.vue': 'vue',
		'.md': 'markdown',
		'.json': 'json',
		'.xml': 'xml',
		'.yml': 'yaml',
		'.sh': 'bash',
		'.bat': 'batch',
		'.sql': 'sql',
		'.rs': 'rust',
		'.dart': 'dart',
		'.scala': 'scala',
		'.kotlin': 'kotlin',
		'.perl': 'perl',
		'.r': 'r',
		'.lua': 'lua',
		'.groovy': 'groovy',
		'.h': 'c_header',
		'.hpp': 'cpp_header',
		'.cs': 'csharp',
		'.elm': 'elm',
		'.erl': 'erlang',
		'.ex': 'elixir',
		'.exs': 'elixir_script',
		'.fs': 'fsharp',
		'.fsi': 'fsharp_interactive',
		'.fsx': 'fsharp_script',
		'.hs': 'haskell',
		'.lhs': 'literate_haskell',
		'.jl': 'julia',
		'.nim': 'nim',
		'.nix': 'nix',
		'.pl': 'perl',
		'.pm': 'perl_module',
		'.pm6': 'perl6',
		'.pod': 'perl_pod',
		'.pod6': 'perl6_pod',
		'.raku': 'raku',
		'.rakumod': 'raku_module',
		'.rakutest': 'raku_test',
		'.rhtml': 'rhtml',
		'.sml': 'sml',
		'.t': 'test',
		'.v': 'verilog',
		'.vhdl': 'vhdl',
		'.wat': 'webassembly',
		'.wasm': 'webassembly',
		'.xhtml': 'xhtml',
		'.yaml': 'yaml',
		'.zig': 'zig'
	}
	return code_types.get(extension, 'plaintext')

import os

def check_binary_extension(file_name):
	# Используем множество для более эффективной проверки
	binary_extensions = {
		# Исполняемые файлы
		'.exe', '.dll', '.so', '.bin', '.app', '.apk', '.jar', '.msi',
		# Архивы
		'.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.z', '.iso',
		# Медиафайлы
		'.mp3', '.wav', '.flac', '.aac', '.ogg', '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.mpeg',
		'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg', '.psd', '.raw', '.ico',
		# Документы (бинарные форматы)
		'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
		# Базы данных
		'.db', '.sqlite', '.mdb', '.accdb', '.dbf', '.sql', '.dump',
		# Виртуальные машины и образы
		'.vmdk', '.vdi', '.qcow2', '.ova', '.ovf',
		# Криптографические файлы
		'.pem', '.key', '.crt', '.cer', '.pfx', '.p12', '.gpg', '.pgp',
		# Логи и дампы
		'.log', '.core', '.crash',
		# Игровые файлы
		'.pak', '.dat', '.save', '.rom', '.sav',
		# Файлы прошивок и образов
		'.img', '.hex', '.fw', '.rom',
		# Другие бинарные форматы
		'.dmg', '.pkg', '.deb', '.rpm', '.cab', '.swf', '.fla', '.ps', '.eps',
	}

	# Получаем расширение файла и приводим его к нижнему регистру
	extension = os.path.splitext(file_name)[1].lower()
	return extension in binary_extensions

def clean_think_content(text):
	pattern = r'<think>(.*?)</think>'
	return re.sub(pattern, '', text, flags=re.DOTALL)