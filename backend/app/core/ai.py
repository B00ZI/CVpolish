from app.core.config import settings

from google import genai
from google.genai import types

aikey = settings.GEMINI_API_KEY

def call(prompt) -> str | None:
    if aikey == "":
        return None

    try :
           
        client = genai.Client(
            api_key=aikey , 
             http_options=types.HttpOptions(timeout=10_000))
        
        response = client.models.generate_content(model='gemini-3.8-flash', contents=prompt)
        return response.text
    
    except Exception as e :
        print(e)
        return None


 

    