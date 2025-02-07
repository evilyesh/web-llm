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
		
		# Initialize properties using _get methods
		self.system = self._get_system()
		self.prompt_prefix = self._get_prompt_prefix()
		self.prefix = self._get_prefix()
		self.postfix = self._get_postfix()
		self.llm_format = self._get_llm_format()
		self.files_wrapper = lang.FILES_WRAPPER
		self.pattern = lang.PATTERN
		self.edit_prompt_prefix = self._get_edit_prompt_prefix()
		self.parse_file_for_db_system = self._get_parse_file_for_db_system()
		self.parse_file_for_db_prompt = self._get_parse_file_for_db_prompt()
		self.content_delimiter = lang.CONTENT_DELIMITER
		self.files_content_wrapper = lang.FILES_CONTENT_WRAPPER

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
		return self.remove_spaces(self.remove_tabs(self.settings.get(key, default)))

	def _get_system(self):
		return self.remove_spaces(self.remove_tabs(lang.SYSTEM_PROMPT))

	def _get_prompt_prefix(self):
		return self.remove_spaces(self.remove_tabs(lang.PROMPT_PREFIX))

	def _get_prefix(self):
		return self.remove_spaces(self.remove_tabs(lang.PREFIX))

	def _get_postfix(self):
		return self.remove_spaces(self.remove_tabs(lang.POSTFIX))

	def _get_edit_prompt_prefix(self):
		return self.remove_spaces(self.remove_tabs(lang.EDIT_PROMPT_PREFIX))

	def _get_parse_file_for_db_system(self):
		return self.remove_spaces(self.remove_tabs(lang.PARSE_FILE_FOR_DB_SYSTEM))

	def _get_parse_file_for_db_prompt(self):
		return self.remove_spaces(self.remove_tabs(lang.PARSE_FILE_FOR_DB_PROMPT))

	def _get_intermediate(self):
		return self.remove_spaces(self.remove_tabs(lang.INTERMEDIATE))

	def _get_llm_format(self):
		return self.remove_spaces(self.remove_tabs(lang.LLM_FORMAT))

	def get_wrapper(self):
		return self.files_wrapper

	def get_pattern(self):
		return self.pattern

	def get_edit_prompt_prefix(self):
		return self.edit_prompt_prefix

	def loadSettings(self, file_path):
		self.file_path = os.path.join('config/', file_path)
		self.settings = self._read_settings()

	def __str__(self):
		return f"(prefix={self.prefix}, postfix={self.postfix})"
