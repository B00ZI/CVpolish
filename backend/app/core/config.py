"""App settings, read from environment variables.

One Settings object (pydantic-settings or plain os.environ) that every other
module imports — never read env vars anywhere else. It must already know:
DATABASE_URL, GEMINI_API_KEY (optional — backends must run without it),
and the frontend origin for CORS.
"""
