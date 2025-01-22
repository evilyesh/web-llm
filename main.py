from flask import Flask, send_from_directory, request, jsonify
import json
from settings import Settings
from ext import get_files_list, get_files_content, send_prompt, send_edit_prompt, save_file, save_settings, run_sql_query, get_settings_list, set_selected_settings, record_audio, get_project_files, index_files_in_db, check_files_for_updates, db
from tree_sitter_t import parse_file_to_db

# Initialize settings
settings = Settings(file_path='settings.json')

# Initialize Flask app
app = Flask(__name__)

@app.route('/')
def r_home():
	"""Serve the home page."""
	return send_from_directory('html', 'index.html')

@app.route('/favicon.ico')
def r_favicon():
	"""Serve the favicon."""
	return send_from_directory('html', 'favicon.ico')


@app.route('/html/<path:filename>')
def r_static_files(filename):
	"""Serve static files from the 'html' directory."""
	return send_from_directory('html', filename)


@app.route('/getFilesList', methods=['POST'])
def r_get_files():
	"""Return a list of files and directories in the specified path."""
	try:
		data = request.json
		files_list, status_code = get_files_list(data)
		return jsonify(files_list), status_code
	except json.JSONDecodeError as e:
		print(f"JSONDecodeError: {e}")
		return jsonify({"error": "Invalid JSON"}), 400
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500

@app.route('/getSettings', methods=['POST'])
def r_get_settings():
	"""Return the current settings."""
	return jsonify({
		"prefix": settings.prefix,
		"postfix": settings.postfix,
		"prefix_diff": settings.prefix_diff,
		"postfix_diff": settings.postfix_diff,
		"prompt_prefix": settings.prompt_prefix
	}), 200

@app.route('/getFilesContent', methods=['POST'])
def r_get_files_content():
	"""Return the content of specified files."""
	try:
		data = request.json
		files_content, status_code = get_files_content(data)
		return jsonify(files_content), status_code
	except json.JSONDecodeError as e:
		print(f"JSONDecodeError: {e}")
		return jsonify({"error": "Invalid JSON"}), 400
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500

@app.route('/sendPrompt', methods=['POST'])
def r_send_prompt():
	"""Send a prompt to the model and return the response."""
	try:
		data = request.json
		response, status_code = send_prompt(data, settings)
		return jsonify(response), status_code
	except json.JSONDecodeError as e:
		print(f"JSONDecodeError: {e}")
		return jsonify({"error": "Invalid JSON"}), 400
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500

@app.route('/sendEditPrompt', methods=['POST'])
def r_send_edit_prompt():
	"""Send an edit prompt to the model and return the response."""
	try:
		data = request.json
		response, status_code = send_edit_prompt(data, settings)
		return jsonify(response), status_code
	except json.JSONDecodeError as e:
		print(f"JSONDecodeError: {e}")
		return jsonify({"error": "Invalid JSON"}), 400
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500

@app.route('/saveFileContent', methods=['POST'])
def r_save_file():
	"""Save the content of a file."""
	try:
		data = request.json
		response, status_code = save_file(data)
		return jsonify(response), status_code
	except json.JSONDecodeError as e:
		print(f"JSONDecodeError: {e}")
		return jsonify({"error": "Invalid JSON"}), 400
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500

@app.route('/saveSettings', methods=['POST'])
def r_save_settings():
	"""Save the current settings."""
	try:
		data = request.json
		response, status_code = save_settings(data, settings)
		return jsonify(response), status_code
	except json.JSONDecodeError as e:
		print(f"JSONDecodeError: {e}")
		return jsonify({"error": "Invalid JSON"}), 400
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500

@app.route('/runSQLQuery', methods=['POST'])
def r_run_sql_query():
	"""Execute a SQL query and return the results."""
	try:
		data = request.json
		response, status_code = run_sql_query(data)
		return jsonify(response), status_code
	except json.JSONDecodeError as e:
		print(f"JSONDecodeError: {e}")
		return jsonify({"error": "Invalid JSON"}), 400
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500

@app.route('/getSettingsList', methods=['POST'])
def r_get_settings_list():
	"""Return a list of available settings files."""
	try:
		settings_list, status_code = get_settings_list()
		return jsonify(settings_list), status_code
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500

@app.route('/setSelectedSettings', methods=['POST'])
def r_set_selected_settings():
	"""Set the selected settings file."""
	try:
		data = request.json
		response, status_code = set_selected_settings(data, settings)
		return jsonify(response), status_code
	except json.JSONDecodeError as e:
		print(f"JSONDecodeError: {e}")
		return jsonify({"error": "Invalid JSON"}), 400
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500

@app.route('/recordAudio', methods=['POST'])
def r_record_audio():
	"""Receive audio file, send to Whisper LLM, and return transcription."""
	try:
		files = {'file': request.files['audio']}
		response, status_code = record_audio(files, settings)
		return jsonify(response), status_code
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500

@app.route('/getProjectFiles', methods=['POST'])
def r_get_project_files():
	"""Return a list of absolute paths of all files in the project directory that are not excluded."""
	try:
		data = request.json
		path = data.get('path')
		print(data)
		exclude_dirs = [".venv", "venv", ".git", "__pycache__", ".idea", "structure.py", "llama-cpp-python", "config", "history", "db.db", "lang.py", "test_calc.py", "db.db-journal",
						"test_style_parse.py", "lib", "description.md", "description_classes.md", "json.json", "project_structure.txt", "README.md", "requirements.txt", "LICENSE"]  # temporary TODO remove!!!
		files = get_project_files(path, exclude_dirs)
		print(files)
		files_to_parse, files_content, status_code = check_files_for_updates(files, path)
		# If we find changed files we must remove corresponding code from db
		if files_to_parse:
			for file_path in files_to_parse:
				db.delete_record_by_path(file_path)
		index_files_in_db(files_content, settings)
		return jsonify(files), 200
	except json.JSONDecodeError as e:
		print(f"JSONDecodeError: {e}")
		return jsonify({"error": "Invalid JSON"}), 400
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500

@app.route('/parseProjectFiles', methods=['POST'])
def r_parse_project_files():
	"""Parse project files and save the parsed data to the database."""
	try:
		data = request.json
		path = data.get('path')
		if not path:
			return jsonify({"error": "Path parameter is required"}), 400

		exclude_dirs = [".venv", "venv", ".git", "__pycache__", ".idea", "structure.py", "llama-cpp-python", "config", "history", "db.db", "lang.py", "test_calc.py", "db.db-journal",
						"test_style_parse.py", "lib", "description.md", "description_classes.md", "json.json", "project_structure.txt", "README.md", "requirements.txt", "LICENSE"]  # temporary TODO remove!!!
		files = get_project_files(path, exclude_dirs)
		print(f"Files to parse: {files}")

		files_to_parse, files_content, status_code = check_files_for_updates(files, path)
		# If we find changed files we must remove corresponding code from db
		if files_to_parse:
			for file_path in files_to_parse:
				db.delete_record_by_path(file_path)

		for file_path in files_to_parse:
			if file_path.endswith(('.py', '.js', '.php')):
				parse_file_to_db(file_path)

		return jsonify({"message": "Files parsed and saved to database successfully"}), 200
	except json.JSONDecodeError as e:
		print(f"JSONDecodeError: {e}")
		return jsonify({"error": "Invalid JSON"}), 400
	except Exception as e:
		print(f"Exception: {e}")
		return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
	app.run(debug=False, port=5001)
