import sqlite3


class Database:
	def __init__(self):
		self.conn = None
		self.cursor = None

	def get_conn(self):
		self.conn = sqlite3.connect('db.db')
		self.cursor = self.conn.cursor()

	def db_init(self):
		self.execute_query('''
		CREATE TABLE IF NOT EXISTS codebase (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			type TEXT,
			path TEXT,
			class TEXT,
			method TEXT,
			function TEXT,
			short_description TEXT,
			full_code TEXT,
			decorations TEXT
		);
		''')

		self.execute_query('''
		CREATE TABLE IF NOT EXISTS files (
			path TEXT,
			checksum TEXT,
			size INTEGER,
			mtime REAL,
			PRIMARY KEY (path)
		);
		''')

	def add_record(self, type, path, class_name, method, function, short_description, full_code, decorations):
		self.execute_query('''
		INSERT INTO codebase (type, path, class, method, function, short_description, full_code, decorations)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		''', (type, path, class_name, method, function, short_description, full_code, decorations))

	def add_records(self, records):
		self.execute_query('''
		INSERT INTO codebase (type, path, class, method, function, short_description, full_code, decorations)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		''', records, many=True)

	def search_texts(self, query):
		return self.execute_query('''
		SELECT * FROM codebase
		WHERE full_code LIKE ?
		ORDER BY id DESC
		''', ('%' + query + '%',))

	def search_by_class_and_method(self, queries):
		placeholders = ', '.join(['(?, ?)'] * len(queries))
		query = f'''
		SELECT * FROM codebase
		WHERE (class, method) IN ({placeholders})
		ORDER BY id DESC
		'''
		params = [item for sublist in queries for item in sublist]
		return self.execute_query(query, params)

	def search_by_function(self, functions):
		placeholders = ', '.join(['?'] * len(functions))
		query = f'''
		SELECT * FROM codebase
		WHERE function IN ({placeholders})
		ORDER BY id DESC
		'''
		return self.execute_query(query, functions)

	def update_record(self, record_id, type, path, class_name, method, function, short_description, full_code, decorations):
		self.execute_query('''
		UPDATE codebase
		SET type = ?, path = ?, class = ?, method = ?, function = ?, short_description = ?, full_code = ?, decorations = ?
		WHERE id = ?
		''', (type, path, class_name, method, function, short_description, full_code, decorations, record_id))

	def delete_record(self, record_id):
		self.execute_query('DELETE FROM codebase WHERE id = ?', (record_id,))

	def get_all_records(self):
		return self.execute_query('SELECT * FROM codebase ORDER BY id DESC')

	def categorize_search_queries(self, queries):
		class_method_queries = []
		function_queries = []

		for query in queries:
			if 'class' in query and 'method' in query:
				class_method_queries.append((query['class'], query['method']))
			elif 'function' in query:
				function_queries.append(query['function'])

		return class_method_queries, function_queries

	def delete_record_by_path(self, path):
		self.execute_query('DELETE FROM codebase WHERE path = ?', (path,))

	def execute_query(self, query, params=None, many=False):
		self.get_conn()
		if params:
			if many:
				self.cursor.executemany(query, params)
			else:
				self.cursor.execute(query, params)
		else:
			self.cursor.execute(query)

		results = []
		if self.cursor.description:
			# Получение названий полей
			columns = [description[0] for description in self.cursor.description]

			# Получение данных и преобразование в словарь
			results = []
			for row in self.cursor.fetchall():
				results.append(dict(zip(columns, row)))

		self.conn.commit()
		self.conn.close()
		self.conn = None
		self.cursor = None
		return results

	def get_file_info(self, paths):
		if isinstance(paths, str):
			paths = [paths]
		placeholders = ', '.join(['?'] * len(paths))
		query = f'''
		SELECT * FROM files WHERE path IN ({placeholders})
		'''
		return self.execute_query(query, paths)

	def add_or_update_file_info(self, files_data):
		for file_data in files_data:
			path, checksum, size, mtime = file_data
			self.execute_query('''
			INSERT INTO files (path, checksum, size, mtime) VALUES (?, ?, ?, ?)
			ON CONFLICT(path) DO UPDATE SET checksum = ?, size = ?, mtime = ?
			''', (path, checksum, size, mtime, checksum, size, mtime))


	def add_or_update_file_info_short(self, files_data):
		for file_data in files_data:
			path, size, mtime = file_data
			self.execute_query('''
			INSERT INTO files (path, size, mtime) VALUES (?, ?, ?)
			ON CONFLICT(path) DO UPDATE SET size = ?, mtime = ?
			''', (path, size, mtime, size, mtime))

	def delete_file_info_by_path(self, path):
		self.execute_query('DELETE FROM files WHERE path = ?', (path,))
