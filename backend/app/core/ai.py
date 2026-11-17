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
             http_options=types.HttpOptions(timeout=20_000))
        
        response = client.models.generate_content(model='gemini-3.5-flash-lite', contents=prompt)
        return response.text
    
    except Exception as e :
        print(e)
        return None


 

    