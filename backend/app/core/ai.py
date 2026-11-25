import json
import re
import time

from google import genai
from google.genai import types
from openai import OpenAI

from app.core.config import settings

CANDIDATES = [
    ("gemini-lite",   "gemini", settings.GEMINI_API_KEY, "gemini-3.5-flash-lite", None),
    ("gemini-flash",  "gemini", settings.GEMINI_API_KEY, "gemini-3.1-flash-lite", None),
    ("groq-120b",     "openai", settings.GROQ_API_KEY,   "openai/gpt-oss-120b",  "https://api.groq.com/openai/v1"),
    ("groq-20b",      "openai", settings.GROQ_API_KEY,   "openai/gpt-oss-20b",   "https://api.groq.com/openai/v1"),
    ("groq-qwen",     "openai", settings.GROQ_API_KEY,   "qwen/qwen3.8-27b",     "https://api.groq.com/openai/v1"),
    ("gemini-flash2", "gemini", settings.GEMINI_API_KEY, "gemini-3.6-flash",     None),
]
PER_MODEL_SECONDS = 10
TOTAL_SECONDS = 60

AI_PROGRESS: dict[str, list[dict]] = {}


def _progress(request_id, provider, status, reason=None):
    if not request_id:
        return
    if len(AI_PROGRESS) > 50 and request_id not in AI_PROGRESS:
        AI_PROGRESS.pop(next(iter(AI_PROGRESS)), None)
    AI_PROGRESS.setdefault(request_id, []).append(
        {"provider": provider, "status": status, "reason": reason}
    )


def get_progress(request_id: str) -> list[dict]:
    return list(AI_PROGRESS.get(request_id, []))


class AIError(Exception):
    """The AI call failed. Its message is a short, user-safe reason."""


def _reason(e: Exception) -> str:
    raw = str(e).strip() or e.__class__.__name__
    text = raw.lower()
    code = getattr(e, "status_code", None) or getattr(e, "code", None)
    if "deadline" in text or "timed out" in text or "timeout" in text:
        return "AI request timed out"
    if code == 429 or "quota" in text or "rate limit" in text:
        return "AI free-tier quota reached"
    if code in (502, 503, 504) or "unavailable" in text or "overloaded" in text:
        return "AI is busy right now"
    return raw[:160]


def _clean_json(text):
    if not isinstance(text, str) or not text.strip():
        return None
    s = re.sub(r"<think>.*?</think>", "", text.strip(), flags=re.I | re.S).strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    start, end = s.find("{"), s.rfind("}")
    if start == -1 or end <= start:
        return None
    candidate = s[start : end + 1]
    try:
        obj = json.loads(candidate)
    except Exception:
        return None
    return candidate if isinstance(obj, dict) else None


def _call_gemini(prompt, key, model, seconds):
    client = genai.Client(
        api_key=key,
        http_options=types.HttpOptions(
            timeout=seconds * 1000,
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )
    reply = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    if not reply.text:
        raise ValueError("empty reply")
    return reply.text


def _call_openai(prompt, key, base_url, model, seconds):
    client = OpenAI(api_key=key, base_url=base_url,
                    timeout=seconds, max_retries=0)
    reply = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        reasoning_effort="low",
    )
    text = reply.choices[0].message.content
    if not text:
        raise ValueError("empty reply")
    return text


def call(prompt, request_id=None) -> str:
    deadline = time.monotonic() + TOTAL_SECONDS
    failures = []
    if request_id:
        AI_PROGRESS[request_id] = []

    for name, kind, key, model, base_url in CANDIDATES:
        if not key:
            continue
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        seconds = min(PER_MODEL_SECONDS, max(1, int(remaining)))
        _progress(request_id, name, "trying")
        try:
            text = (
                _call_gemini(prompt, key, model, seconds)
                if kind == "gemini"
                else _call_openai(prompt, key, base_url, model, seconds)
            )
            cleaned = _clean_json(text)
            if cleaned is None:
                raise ValueError("reply is not a JSON object")
            _progress(request_id, name, "ok")
            return cleaned
        except Exception as e:
            reason = _reason(e)
            print(f"AI fallback: {name} failed: {e}")
            _progress(request_id, name, "failed", reason)
            failures.append(f"{name}: {reason}")

    if not failures:
        failures.append("no API keys configured")
    raise AIError("all AI providers failed — " + "; ".join(failures))
