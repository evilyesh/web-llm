from flask import Flask, send_from_directory, request, jsonify
import os
import json
import requests
from settings import Settings
import datetime  # Добавляем импорт datetime

settings = Settings(file_path='settings.json')

app = Flask(__name__)
debug = False


@app.route('/')
def home():
    return send_from_directory('html', 'index.html')


@app.route('/html/<path:filename>')
def static_files(filename):
    return send_from_directory('html', filename)


@app.route('/getFilesList', methods=['POST'])
def get_files():
    try:
        data = request.json
        path = data.get('path')
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

        return jsonify(files_list), 200

    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/getSettings', methods=['POST'])
def get_settings():
    prefix = settings.get_prefix()
    postfix = settings.get_postfix()
    return jsonify({"prefix": prefix, "postfix": postfix}), 200


@app.route('/getFilesContent', methods=['POST'])
def get_files_content():
    try:
        data = request.json
        print(data)
        files = data.get('files')
        print(files)
        path = data.get('path')
        if files and path:
            files_content = {}
            for file in files.values():
                with open(file.get('path'), 'r') as f:
                    files_content[file.get('path')] = f.read()

            print(files_content)
            return jsonify(files_content), 200
        else:
            return jsonify({"error": "No files provided"}), 400
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500


@app.route('/sendPrompt', methods=['POST'])
def send_prompt():
    url = settings.get("url")
    headers = settings.get("headers")
    payload = settings.get("payload_init")

    try:
        if debug:
            total_tokens = 0
            return jsonify({"error": "",
                            "data": "I'd be happy to help you with that. To avoid using the `onclick` attribute, you can use JavaScript to add event listeners to your buttons instead. Here's how you can modify your `displayMessage` method to add click event listeners to the \"Confirm\" and \"Cancel\" buttons chat.js:\n\n```javascript\ndisplayMessage() {\n    let messageElement = document.createElement('div');\n    let content = this.parsed_response;\n    Object.keys(this.parsed_data).forEach(hash => {\n        const oldContent = this.files_data[this.parsed_data[hash].file] || '';\n        const newContent = this.parsed_data[hash].data;\n        const diff = this.renderDiff(oldContent, newContent);\n        content = content.replace(hash, `<div class=\"code_wrap\" id=\"d${hash}\"><pre><code>${diff.final_html}</pre></code><button class=\"confirm-btn\">Confirm</button><button class=\"cancel-btn\">Cancel</button></div>`);\n    });\n\n    // ... rest of the code\n\n    messageElement.innerHTML = content;\n    this.chatContent.appendChild(messageElement);\n\n    messageElement.getManySelector('.removed').forEach(i =>{\n        i.removeClass('removed');\n    });\n    messageElement.getManySelector('.added').forEach(i =>{\n        i.removeClass('added');\n    });\n\n    // Add event listeners to the buttons\n    messageElement.getManySelector('.confirm-btn').forEach(btn => {\n        btn.addEventListener('click', () => this.handleConfirmClick(btn));\n    });\n    messageElement.getManySelector('.cancel-btn').forEach(btn => {\n        btn.addEventListener('click', () => this.handleCancelClick(btn));\n    });\n\n    console.log({content});\n}\n```\n\nYou can then add the `handleConfirmClick` and `handleCancelClick` methods to your `Chat` class to handle the button clicks:\n\n```javascript\nhandleConfirmClick(btn) {\n    const codeWrap = btn.parentElement;\n    const hash = codeWrap.id.substring(1);\n    const file = this.parsed_data[hash].file;\n    const data = codeWrap.querySelector('code').textContent;\n\n    // Send the data to the server\n    this.sendRequest('/saveFileContent', {file, data})\n        .then(response => {\n            console.log(response);\n            // Handle the response\n        })\n        .catch(error => {\n            console.error(error);\n            // Handle the error\n        });\n}\n\nhandleCancelClick(btn) {\n    const codeWrap = btn.parentElement;\n    const hash = codeWrap.id.substring(1);\n\n    // Remove the code wrap from the view\n    codeWrap.remove();\n\n    // Remove the data from parsed_data\n    delete this.parsed_data[hash];\n}\n```",
                            "total_tokens": total_tokens}), 200

        data = request.json
        prompt = data.get('prompt')
        clear_input = data.get('clear_input')
        print(clear_input)

        if prompt:
            clctx = 'clear your context'
            if clctx in prompt or clear_input:
                payload["messages"] = [{"role": "system", "content": clctx}]

            payload["messages"].append({"role": "user", "content": prompt.replace(clctx, '')})
            response = requests.post(url, headers=headers, data=json.dumps(payload))

            # print(response)
            # print(response.text)

            if response.status_code == 200:
                response_data = response.json()
                print(json.dumps(response_data, indent=4))
                if 'choices' in response_data:
                    model_response = response_data["choices"][0]["message"]["content"]
                    usage = response_data.get("usage", {})
                    total_tokens = usage.get("total_tokens", 0)

                    # Добавляем запись в history.txt
                    with open('history.txt', 'a') as history_file:
                        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        history_file.write(f"[{timestamp}]\n")
                        history_file.write(f"<|---###|>\n")
                        history_file.write(f"\nUser: <|----####|>{prompt}<|####----|>\n")
                        history_file.write(f"Model: <|-----#####|>{model_response}<|#####-----|>\n\n")
                        history_file.write(f"<|###---|>\n")

                    return jsonify({"error": "", "data": model_response, "total_tokens": total_tokens}), 200
        else:
            return jsonify({"error": "No prompt provided"}), 400
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/saveFileContent', methods=['POST'])
def save_file():
    try:
        data = request.json
        path = data.get('path')
        file_name = data.get('file_name')
        file_path = data.get('file_path')
        file_content = data.get('data')

        if path and file_name and file_path and file_content:
            with open(file_path, 'w') as file:
                file.write(file_content)

            return jsonify({"error": "", "msg": f"File {os.path.join(path, file_name)} updated"}), 200

        else:
            return jsonify({"error": f"File {os.path.join(path, file_name)} was not updated."})

    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/saveSettings', methods=['POST'])
def save_settings():
    try:
        data = request.json
        prefix = data.get('prefix')
        postfix = data.get('postfix')
        if prefix and postfix:
            settings.set('prefix', prefix)
            settings.set('postfix', postfix)
            return jsonify({"error": "", "msg": f"Settings updated"}), 200
        else:
            return jsonify({"error": f"Settings were not updated."})
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON"}), 400


if __name__ == '__main__':
    app.run(debug=False, port=5001)
