from flask import Flask, send_from_directory, request, jsonify
import os
import json
import requests
from settings import Settings
import datetime
import psycopg2

# Initialize settings
settings = Settings(file_path='settings.json')
selected_settings = None  # Variable to store the selected settings

# Initialize Flask app
app = Flask(__name__)
debug = False


@app.route('/')
def home():
    """Serve the home page."""
    return send_from_directory('html', 'index.html')


@app.route('/html/<path:filename>')
def static_files(filename):
    """Serve static files from the 'html' directory."""
    return send_from_directory('html', filename)


@app.route('/html.v2/<path:filename>')
def static_files_v2(filename):
    """Serve static files from the 'html.v2' directory."""
    return send_from_directory('html.v2', filename)


@app.route('/getFilesList', methods=['POST'])
def get_files():
    """Return a list of files and directories in the specified path."""
    try:
        data = request.json
        path = data.get('path') or data.get('project_path')
        current_path = data.get('current_path')

        if not path or not current_path:
            return jsonify({"error": "No directory provided"}), 400

        files_list = []
        for name in os.listdir(current_path):
            full_path = os.path.join(current_path, name)
            file_type = 'file' if os.path.isfile(full_path) else 'dir'

            files_list.append({
                "name": name,
                "type": file_type,
                "path": full_path,
                "directory": current_path,
                "project_path": path,
                "content": '',
                "data": '',
                "relative_path": full_path.replace(path, ''),
            })

        # Sort files_list by 'type' (directories first) and then by 'name'
        files_list.sort(key=lambda x: (x['type'] == 'file', x['name']))

        return jsonify(files_list), 200

    except json.JSONDecodeError as e:
        print(f"JSONDecodeError: {e}")
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/getSettings', methods=['POST'])
def get_settings():
    """Return the current settings."""
    return jsonify({
        "prefix": settings.get_prefix(),
        "postfix": settings.get_postfix(),
        "prefix_diff": settings.get_prefix_diff(),
        "postfix_diff": settings.get_postfix_diff(),
        "prompt_prefix": settings.get_prompt_prefix()
    }), 200


@app.route('/getFilesContent', methods=['POST'])
def get_files_content():
    """Return the content of specified files."""
    try:
        data = request.json
        files = data.get('files')
        path = data.get('path')

        if not files or not path:
            return jsonify({"error": "No files provided"}), 400

        files_content = {}
        for file in files.values():
            with open(file.get('path'), 'r') as f:
                files_content[file.get('path')] = f.read()

        return jsonify(files_content), 200

    except json.JSONDecodeError as e:
        print(f"JSONDecodeError: {e}")
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({"error": str(e)}), 500


def calculate_total_tokens(messages):
    total_tokens = 0
    for message in messages:
        print(message)
        total_tokens += len(message["content"].split())*3
    return total_tokens

@app.route('/sendPrompt', methods=['POST'])
def send_prompt():
    """Send a prompt to the model and return the response."""
    total_tokens = 0
    try:
        if debug:
            return jsonify({"error": "", "data": settings.get('sample'), "total_tokens": total_tokens}), 200

        data = request.json
        api = data.get('api', 'openai')  # Default to OpenAI if 'api' is not provided
        prompt = data.get('prompt')
        clear_input = data.get('clear_input')
        use_diff = data.get('use_diff')
        url = settings.get("url")
        headers = settings.get("headers")
        payload = settings.get("payload_init")
        print(json.dumps(payload, indent=4))


        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400

        if clear_input or prompt.startswith("/clear") or not payload["messages"]:
            if use_diff:
                payload["messages"] = [{"role": "system", "content": settings.get_system_diff()}]
            else:
                payload["messages"] = [{"role": "system", "content": settings.get_system()}]

        # payload["max_tokens"] = settings.get("max_tokens")
        # payload["cache_prompt"] = settings.get("cache_prompt")
        # payload["samplers"] = "dkypmxt"

        # Check if total tokens exceed max_tokens
        try:
            if calculate_total_tokens([{'content': prompt}]) + calculate_total_tokens([{'content': payload["messages"][0].get('content')}]) > payload["max_tokens"]:
                payload["messages"] = [payload["messages"][0]]
            else:
                while calculate_total_tokens(payload["messages"]) + calculate_total_tokens([{'content': prompt}]) > payload["max_tokens"]:
                    payload["messages"].pop(1) if len(payload["messages"]) > 1 else None  # dont delete system prompt
        except Exception as e:
            print(e)

        payload["messages"].append({"role": "user", "content": prompt})
        print(json.dumps(payload, indent=4))

        print("url", url)
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        print(response)
        if response.status_code == 200:
            response_data = response.json()
            print(json.dumps(response_data, indent=4))
            if 'choices' in response_data:
                model_response = response_data["choices"][0]["message"]["content"]
                payload["messages"].append({"role": "assistant", "content": model_response})
                usage = response_data.get("usage", {})

                with open('history/history.txt', 'a') as history_file:
                    history_file.write(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]\n")
                    history_file.write(f"<|---###|>\n")
                    history_file.write(f"\nUser: <|----####|>{prompt}<|####----|>\n")
                    history_file.write(f"Model: <|-----#####|>{model_response}<|#####-----|>\n\n")
                    history_file.write(f"<|###---|>\n")

                return jsonify({"error": "", "data": model_response, "usage": usage}), 200

    except json.JSONDecodeError as e:
        print(f"JSONDecodeError: {e}")
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/sendEditPrompt', methods=['POST'])
def send_edit_prompt():
    """Send an edit prompt to the model and return the response."""
    try:
        data = request.json
        api = data.get('api', 'openai')  # Default to OpenAI if 'api' is not provided
        prompt = data.get('prompt')
        clear_input = data.get('clear_input')
        use_diff = data.get('use_diff')

        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400

        url = settings.get("url")
        headers = settings.get("headers")
        payload = settings.get("payload_init")

        if clear_input or prompt.startswith("/clear") or not payload["messages"]:
            if use_diff:
                payload["messages"] = [{"role": "system", "content": settings.get_system_diff()}]
            else:
                payload["messages"] = [{"role": "system", "content": settings.get_system()}]

        try:
            # Check if total tokens exceed max_tokens
            if calculate_total_tokens([{'content': f"{settings.get_edit_prompt_prefix()} \n{prompt}"}]) + calculate_total_tokens([{'content': payload["messages"][0].get('content')}]) > payload["max_tokens"]:
                payload["messages"] = [payload["messages"][0]]
            else:
                while calculate_total_tokens(payload["messages"]) + calculate_total_tokens([{'content': f"{settings.get_edit_prompt_prefix()} \n{prompt}"}]) > payload["max_tokens"]:
                    payload["messages"].pop(1) if len(payload["messages"]) > 1 else None  # dont delete system prompt
        except Exception as e:
            print(e)


        payload["messages"].append({"role": "user", "content": f"{settings.get_edit_prompt_prefix()} \n{prompt}"})
        print(json.dumps(payload, indent=4))

        response = requests.post(url, headers=headers, data=json.dumps(payload))

        if response.status_code == 200:
            response_data = response.json()
            print(json.dumps(response_data, indent=4))
            if 'choices' in response_data:
                model_response = response_data["choices"][0]["message"]["content"]
                payload["messages"].append({"role": "assistant", "content": model_response})
                return jsonify({"error": "", "data": model_response}), 200

    except json.JSONDecodeError as e:
        print(f"JSONDecodeError: {e}")
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/saveFileContent', methods=['POST'])
def save_file():
    """Save the content of a file."""
    try:
        data = request.json
        path = data.get('path')
        file_name = data.get('file_name')
        file_path = data.get('file_path')
        file_content = data.get('data')

        if not path or not file_name or not file_path or not file_content:
            return jsonify({"error": f"File {os.path.join(path, file_name)} was not updated."})

        with open(file_path, 'w') as file:
            file.write(file_content)

        return jsonify({"error": "", "msg": f"File {os.path.join(path, file_name)} updated"}), 200

    except json.JSONDecodeError as e:
        print(f"JSONDecodeError: {e}")
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/saveSettings', methods=['POST'])
def save_settings():
    """Save the current settings."""
    try:
        data = request.json
        prefix = data.get('prefix')
        postfix = data.get('postfix')

        if not prefix or not postfix:
            return jsonify({"error": f"Settings were not updated."})

        settings.set('prefix', prefix)
        settings.set('postfix', postfix)
        return jsonify({"error": "", "msg": f"Settings updated"}), 200

    except json.JSONDecodeError as e:
        print(f"JSONDecodeError: {e}")
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/runSQLQuery', methods=['POST'])
def run_sql_query():
    """Execute a SQL query and return the results."""
    try:
        data = request.json
        host = data.get('host')
        port = data.get('port')
        username = data.get('username')
        password = data.get('password')
        database = data.get('database')  # Added database field
        query = data.get('query')

        if not host or not port or not username or not password or not database or not query:
            return jsonify({"error": "Missing required parameters"}), 400

        conn = psycopg2.connect(
            host=host,
            port=port,
            user=username,
            password=password,
            database=database  # Added database field
        )
        cursor = conn.cursor()
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify({"error": "", "data": results}), 200

    except psycopg2.Error as e:
        print(f"psycopg2.Error: {e}")
        return jsonify({"error": str(e)}), 500
    except json.JSONDecodeError as e:
        print(f"JSONDecodeError: {e}")
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/getSettingsList', methods=['POST'])
def get_settings_list():
    """Return a list of available settings files."""
    try:
        config_dir = 'config/'
        config_files = [f for f in os.listdir(config_dir) if f.endswith('.json')]
        settings_list = []

        for config_file in config_files:
            file_path = os.path.join(config_dir, config_file)
            with open(file_path, 'r') as file:
                settings_data = json.load(file)
                settings_list.append({
                    "file_name": config_file,
                    "settings": settings_data
                })

        return jsonify(settings_list), 200

    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/setSelectedSettings', methods=['POST'])
def set_selected_settings():
    """Set the selected settings file."""
    global selected_settings
    try:
        data = request.json
        selected_settings = data.get('selectedSettings')
        settings.loadSettings(selected_settings)
        return jsonify({"error": "", "msg": f"Selected settings set to {selected_settings}"}), 200

    except json.JSONDecodeError as e:
        print(f"JSONDecodeError: {e}")
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=False, port=5001)
