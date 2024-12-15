"""
Module for working with settings.
Includes methods for loading and saving configurations, as well as interacting with the file system.
"""
import json
import os.path
import re
import lang


class Settings:
    def __init__(self, file_path='settings.json'):
        self.file_path = os.path.join('config/', file_path)
        self.settings = self._read_settings()
        self.system = lang.SYSTEM_PROMPT
        self.system_diff = lang.SYSTEM_DIFF_PROMPT
        self.prompt_prefix = lang.PROMPT_PREFIX
        self.prefix = lang.PREFIX
        self.prefix_diff = lang.PREFIX_DIFF
        self.postfix = lang.POSTFIX
        self.postfix_diff = lang.POSTFIX_DIFF
        self.intermediate = lang.INTERMEDIATE
        self.llm_format = lang.LLM_FORMAT
        self.files_wrapper = lang.FILES_WRAPPER
        self.pattern = lang.PATTERN
        self.sample = lang.SAMPLE

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

    def get_trimmed(self, key, default=None):
        print(self.settings.get(key, default))
        return self.remove_spaces(self.remove_tabs(self.settings.get(key, default)))

    def get_system(self):
        self.system = self.remove_tabs(self.system)
        return self.remove_spaces(self.system)

    def get_system_diff(self):
        self.system_diff = self.remove_tabs(self.system_diff)
        return self.remove_spaces(self.system_diff)

    def get_prefix(self):
        self.prefix = self.remove_tabs(self.prefix)
        return self.remove_spaces(self.prefix)

    def get_prefix_diff(self):
        self.prefix_diff = self.remove_tabs(self.prefix_diff)
        return self.remove_spaces(self.prefix_diff)

    def get_postfix(self):
        self.postfix = self.remove_tabs(self.postfix)
        return self.remove_spaces(self.postfix)

    def get_postfix_diff(self):
        self.postfix_diff = self.remove_tabs(self.postfix_diff)
        return self.remove_spaces(self.postfix_diff)

    def get_prompt_prefix(self):
        self.postfix_diff = self.remove_tabs(self.prompt_prefix)
        return self.remove_spaces(self.prompt_prefix)

    def get_wrapper(self):
        return self.files_wrapper

    def get_pattern(self):
        return self.pattern

    def loadSettings(self, file_path):
        self.file_path = os.path.join('config/', file_path)
        self.settings = self._read_settings()

    def __str__(self):
        return f"(prefix={self.prefix}, postfix={self.postfix})"
