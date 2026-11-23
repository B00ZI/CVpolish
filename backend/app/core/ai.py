from app.core.config import settings

from google import genai
from google.genai import types

aikey = settings.GEMINI_API_KEY


class AIError(Exception):
    """The AI call failed. Its message is a short, user-safe reason."""


def _describe(e: Exception) -> str:
    """Turn a provider exception into one short readable sentence."""
    raw = str(e).strip() or e.__class__.__name__
    text = raw.lower()
    code = getattr(e, "code", None)

    if "deadline" in text or "timed out" in text or "timeout" in text:
        return "AI request timed out (20s limit)"
    if code == 429 or "quota" in text or "rate limit" in text:
        return "AI free-tier quota reached — wait a minute"
    if code == 503 or "503" in raw or "unavailable" in text or "overloaded" in text:
        return "AI is busy right now (provider 503 high demand)"
    if code is not None:
        return f"AI provider error {code}: {raw[:180]}"
    return f"AI call failed: {raw[:180]}"


def call(prompt) -> str:
    """One model call — returns the text or raises AIError with the reason.
    Never returns None: callers must fail honestly instead of guessing."""
    if aikey == "":
        raise AIError("GEMINI_API_KEY is not set")

    try:
        client = genai.Client(
            api_key=aikey,
            http_options=types.HttpOptions(timeout=20_000),
        )
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite", contents=prompt
        )
        if response.text is None:
            raise AIError("AI returned no text (blocked or empty reply)")
        return response.text
    except AIError:
        raise
    except Exception as e:
        print(e)
        raise AIError(_describe(e)) from e
