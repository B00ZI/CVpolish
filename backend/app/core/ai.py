from app.core.config import settings

from google import genai
from google.genai import types

aikey = settings.GEMINI_API_KEY

settings.GEMINI_API_KEY
def call(prompt) -> str | None:
    if aikey is None:
        return None
    

    client = genai.Client(api_key=aikey)
    
    response = client.models.generate_content(
    model='gemini-3.8-flash', contents=prompt
    )
    return response

    