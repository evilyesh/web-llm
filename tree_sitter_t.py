from tree_sitter import Language, Parser
import tree_sitter_python as py_language
import tree_sitter_javascript as js_language
import tree_sitter_php as php_language
import json
from db import Database
from ext import get_short_description, get_file_code_type

def parse_file(file_path):
	with open(file_path, 'r', encoding='utf-8') as file:
		content = file.read()

	language_map = {
		'.php': php_language.language_php(),
		'.js': js_language.language(),
		'.jsx': js_language.language(),
		'.py': py_language.language()
	}
	
	file_extension = file_path.split('.')[-1]
	if file_extension not in language_map:
		raise ValueError("Unsupported file type")

	parser = Parser(Language(language_map[file_extension]))
	tree = parser.parse(content.encode('utf-8'))
	return tree.root_node, content

def extract_docstring(node):
	if node.type == 'comment':
		return node.text.decode('utf-8').strip()
	return ''

def extract_parameters(node):
	params = []
	if node and node.type in ('parameters', 'formal_parameters'):
		for child in node.children:
			if child.type in ('identifier', 'typed_parameter'):
				params.append(child.text.decode('utf-8'))
	return params

def extract_return_type(node):
	for child in node.children:
		if child.type == 'return_type':
			return child.text.decode('utf-8')
		if child.type == 'type_annotation':
			return_type_node = child.child(1)
			if return_type_node:
				return return_type_node.text.decode('utf-8').strip()
	return ''

def extract_decorations(node):
	decorations = []
	if node.type == 'decorated_definition':
		for child in node.children:
			if child.type == 'decorator':
				decorations.append(child.text.decode('utf-8'))
	return decorations

def extract_block_docstring(node):
	for child in node.children:
		if child.type == "block":
			try:
				expression_node = child.child(0)
				string_node = expression_node.child(0)
				if string_node.type == "string":
					return string_node.text.decode("utf8")
			except IndexError:
				pass
	return ''

def extract_class_docstring(node, file_type):
	if (file_type in ('js', 'php')) and node.prev_sibling:
		return extract_docstring(node.prev_sibling)
	return extract_block_docstring(node)

def extract_function_docstring(node, file_type):
	if (file_type in ('js', 'php')) and node.prev_sibling:
		return extract_docstring(node.prev_sibling)
	return extract_block_docstring(node)

def extract_functions_and_classes(node, content, file_path, file_type):
	results = []

	def process_node(node, source_code, current_class=''):
		if node.type == 'decorated_definition':
			decorations = extract_decorations(node)
			for child in node.children:
				if child.type in ('function_definition', 'method_definition'):
					function_name = child.child_by_field_name('name').text.decode('utf-8') if child.child_by_field_name('name') else ''
					full_code = node.text.decode('utf-8')
					function_type = 'method' if current_class else 'function'
					results.append({
						"file_type": file_type,
						"type": function_type,
						"path": file_path,
						"class": current_class,
						"method": function_name if function_type == 'method' else '',
						"function": function_name if function_type == 'function' else '',
						"short_description": "",
						"full_code": full_code,
						"decorations": ', '.join(decorations)
					})

		elif node.type in ('function_definition', 'function_declaration', 'method_definition', 'arrow_function'):
			function_name = node.child_by_field_name('name').text.decode('utf-8') if node.child_by_field_name('name') else ''
			full_code = node.text.decode('utf-8')

			# Determine function type based on language and context
			if file_type == 'javascript':
				if node.type == 'method_definition':
					function_type = 'method'
				elif node.type in ['function_declaration', 'arrow_function']:
					function_type = 'function'
				else:
					function_type = 'function'  # Default to function
			else:
				function_type = 'function' if not current_class else 'method'

			results.append({
				"file_type": file_type,
				"type": function_type,
				"path": file_path,
				"class": current_class,
				"method": function_name if function_type == 'method' else '',
				"function": function_name if function_type == 'function' else '',
				"short_description": "",
				"full_code": full_code,
				"decorations": ''
			})

		elif node.type in ('class_declaration', 'class_definition'):
			class_name = node.child_by_field_name('name').text.decode('utf-8') if node.child_by_field_name('name') else ''
			full_code = node.text.decode('utf-8')
			results.append({
				"file_type": file_type,
				"type": "class",
				"path": file_path,
				"class": class_name,
				"method": "",
				"function": "",
				"short_description": f"{class_name}",
				"full_code": full_code,
				"decorations": ''
			})
			for child in node.children:
				if child.type in ('class_body', 'declaration_list', 'block'):
					for subchild in child.children:
						process_node(subchild, source_code, class_name)

		elif node.type in ('program', 'module'):
			for child in node.children:
				process_node(child, source_code)

		elif node.type in ('expression_statement', 'statement_block'):
			for child in node.children:
				process_node(child, source_code)

	process_node(node, content)
	return results

def save_to_db(results, settings):
	db = Database()
	db.db_init()
	db.get_conn()

	records = [
		(
			result['type'],
			result['path'],
			result['class'],
			result['method'],
			result['function'],
			get_description(f"code block type: {result['type']}\n{'class: ' + result['class'] + '\n\n' if result['class'] else ''}```{result['file_type']}\n\n{result['full_code']}\n```", settings),
			result['full_code'],
			result['decorations']
		) for result in results
	]

	if records:
		db.add_records(records)

def get_description(full_code, settings):
	r = get_short_description(full_code, settings)
	print(full_code)
	print(r)
	return r

def parse_file_to_db(file_path, settings=None):
	root_node, content = parse_file(file_path)
	file_type = get_file_code_type(file_path)
	results = extract_functions_and_classes(root_node, content, file_path, file_type)
	save_to_db(results, settings)

if __name__ == "__main__":
	file_src_path = '/home/yesh/Projects/PycharmProjects/AI/web_llm_test/tree_sitter_t.py'
	db_path = 'db.db'
	parse_file_to_db(file_src_path)