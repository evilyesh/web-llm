from aiohttp import web
from settings import Settings
from ext import get_files_list, get_files_content, save_file, save_settings, get_settings_list, set_selected_settings, record_audio, get_project_files, check_files_for_updates, db, prepare_send_prompt, send_edit_prompt
from tree_sitter_t import parse_file_to_db
import os

# Initialize settings
settings = Settings(file_path='settings.json')

# Initialize aiohttp app
app = web.Application()

async def error_handling_middleware(app, handler):
	async def middleware_handler(request):
		try:
			response = await handler(request)
			if isinstance(response, web.FileResponse):
				return response
			if isinstance(response, dict) or isinstance(response, list):
				return web.json_response(response, status=200)
			return web.Response(text=str(response), status=200)
		except Exception as e:
			print(e)
			return web.json_response({"error": str(e)}, status=500)
	return middleware_handler

app.middlewares.append(error_handling_middleware)

async def r_home(request):
	"""Serve the home page."""
	return web.FileResponse('html/index.html')

async def r_favicon(request):
	"""Serve the favicon."""
	return web.FileResponse('html/favicon.ico')

async def r_get_files(request):
	"""Return a list of files and directories in the specified path."""
	data = await request.json()
	return get_files_list(data)

async def r_get_files_content(request):
	"""Return the content of specified files."""
	data = await request.json()
	return get_files_content(data)

async def r_send_prompt(request):
	"""Send a prompt to the model and return the response."""
	data = await request.json()
	return prepare_send_prompt(data, settings)

async def r_send_edit_prompt(request):
	"""Send an edit prompt to the model and return the response."""
	data = await request.json()
	return send_edit_prompt(data, settings)

async def r_save_file(request):
	"""Save the content of a file."""
	data = await request.json()
	return save_file(data)

async def r_save_settings(request):
	"""Save the current settings."""
	data = await request.json()
	return save_settings(data, settings)

async def r_get_settings_list(request):
	"""Return a list of available settings files."""
	return get_settings_list()

async def r_set_selected_settings(request):
	"""Set the selected settings file."""
	data = await request.json()
	return set_selected_settings(data, settings)

async def r_record_audio(request):
	"""Receive audio file, send to Whisper LLM, and return transcription."""
	reader = await request.multipart()
	field = await reader.next()
	assert field.name == 'audio'
	audio_data = await field.read()
	return record_audio({'file': audio_data}, settings)

async def r_parse_project_files(request):
	"""Parse project files and save the parsed data to the database."""
	data = await request.json()
	path = data.get('path')
	exclude_dirs = data.get('exclude_dirs', [])  # Get exclude_dirs from request data

	if not path:
		return {"error": "Path parameter is required"}, 400

	files = get_project_files(path, exclude_dirs)  # Use exclude_dirs for filtering
	print(f"Files to parse: {files}")

	files_to_parse, files_content = check_files_for_updates(files, path)
	if files_to_parse:
		for file_path in files_to_parse:
			db.delete_record_by_path(file_path)

	for file_path in files_to_parse:
		if file_path.endswith(('.py', '.js', '.php')):
			print(file_path)
			parse_file_to_db(file_path, settings)

	return {"message": "Files parsed and saved to database successfully"}

app.router.add_static(prefix='/html/', path=os.path.join(os.getcwd(), 'html/'), name='html')

# Add routes
app.router.add_get('/', r_home)
app.router.add_get('/favicon.ico', r_favicon)
app.router.add_post('/getFilesList', r_get_files)
app.router.add_post('/getFilesContent', r_get_files_content)
app.router.add_post('/sendPrompt', r_send_prompt)
app.router.add_post('/sendImprovePrompt', r_send_edit_prompt)
app.router.add_post('/saveFileContent', r_save_file)
app.router.add_post('/saveSettings', r_save_settings)
app.router.add_post('/getSettingsList', r_get_settings_list)
app.router.add_post('/setSelectedSettings', r_set_selected_settings)
app.router.add_post('/recordAudio', r_record_audio)
app.router.add_post('/parseProjectFiles', r_parse_project_files)

if __name__ == "__main__":
	web.run_app(app, port=5002)