import json
import os.path
import re


class Settings:
    def __init__(self, file_path='settings.json'):
        self.file_path = os.path.join('config/', file_path)
        self.settings = self._read_settings()
        self.prefix = """you are a coder assistant. You assist best in python javascript css html and php. 
                     Instruction for you: 
                     write file name and after file name code for that file wrapped in ```. one file name correspond to that one file code. edit code for this files.
                     example pattern: 
                     path/to/filename.txt:
                     ```txt
                     hello world
                     ```
                     Please dont miss path to file.
                     Edit files content in list, lisf of files and files content bellow:
                     """
        self.postfix = """ dont miss write file name before code and code in ``` with code type. 
                    write only files that you edit, dont send files without changes. 
                    write whole file content if you edit it. Dont write part of file content!
                    Use tab for indents. Think and do step by step.
                    """
        self.intermediate = """ dont miss write file name before code with : and code in ``` with code type.  
                    write whole file content if you edit it. Dont write part of file content!
                    """
        self.files_wrapper = "\nFile content: {}\n```\n{}\n```"
        self.pattern = r".*\s*```([\s\S]+?)```"

    def _read_settings(self):
        try:
            with open(self.file_path, 'r') as file:
                return json.load(file)
        except FileNotFoundError:
            return {}
        except json.JSONDecodeError:
            return {}

    def get(self, key, default=None):
        return self.settings.get(key, default)

    def set(self, key, value):
        self.settings[key] = value
        self._write_settings()

    def _write_settings(self):
        try:
            with open(self.file_path, 'w') as file:
                json.dump(self.settings, file, indent=4)
        except IOError as e:
            print(f"Error writing settings file: {e}")

    @staticmethod
    def remove_tabs(text):
        pattern = re.compile(r'\t+')
        return pattern.sub('\t', text)

    @staticmethod
    def remove_spaces(text):
        pattern = re.compile(r' +')
        return pattern.sub(' ', text)

    def get_prefix(self):
        self.prefix = self.remove_tabs(self.prefix)
        return self.remove_spaces(self.prefix)

    def get_postfix(self):
        self.postfix = self.remove_tabs(self.postfix)
        return self.remove_spaces(self.postfix)

    def get_wrapper(self):
        return self.files_wrapper

    def get_pattern(self):
        return self.pattern

    def __str__(self):
        return f"(prefix={self.prefix}, postfix={self.postfix})"
