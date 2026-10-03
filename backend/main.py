import asyncio
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. Create backend/.env from backend/.env.example."
    )

client = genai.Client(api_key=GEMINI_API_KEY)

CONFIGURED_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip() or "gemini-3.5-flash"
AVAILABLE_MODELS = list(dict.fromkeys([
    CONFIGURED_MODEL,
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
]))

app = FastAPI(
    title="Human Translation Layer API",
    version="1.0.0",
)

# CORS is kept for direct local API testing. The React app normally uses
# the Vite /api proxy, so browser requests stay on localhost:5173.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "hi": "Hindi",
    "ja": "Japanese",
    "zh": "Simplified Chinese",
    "ko": "Korean",
    "ru": "Russian",
    "ar": "Arabic",
    "nl": "Dutch",
    "tr": "Turkish",
    "pl": "Polish",
    "sv": "Swedish",
    "th": "Thai",
    "kn": "Kannada",
    "pa": "Punjabi",
}


class TranslationRequest(BaseModel):
    text: str
    source: str
    target: str


class TranslationResponse(BaseModel):
    translation: str


def language_name(code: str) -> str:
    normalized = code.strip().lower()
    return LANGUAGE_NAMES.get(normalized, normalized)


def extract_response_text(response) -> Optional[str]:
    """
    Read final text robustly from the Gemini SDK response.

    response.text is normally enough, but we also inspect candidate parts
    so a valid text part is not lost when the SDK response contains
    additional metadata/thinking parts.
    """
    try:
        text = response.text
        if isinstance(text, str) and text.strip():
            return text.strip()
    except Exception:
        pass

    candidates = getattr(response, "candidates", None) or []

    collected: list[str] = []

    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []

        for part in parts:
            part_text = getattr(part, "text", None)

            if not isinstance(part_text, str) or not part_text.strip():
                continue

            # Do not return a private/internal thought as the translation.
            if getattr(part, "thought", False):
                continue

            collected.append(part_text.strip())

    if collected:
        return "\n".join(collected).strip()

    return None


def clean_translation(text: str) -> str:
    """
    Remove accidental wrapping quotes/code fences without altering
    the actual translated sentence.
    """
    result = text.strip()

    if result.startswith("```") and result.endswith("```"):
        result = result[3:-3].strip()

    if len(result) >= 2:
        if (result[0], result[-1]) in {
            ('"', '"'),
            ("'", "'"),
            ("“", "”"),
            ("‘", "’"),
        }:
            result = result[1:-1].strip()

    return result


@app.get("/")
async def root():
    return {
        "message": "Human Translation Layer API is running",
        "status": "ok",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/translate", response_model=TranslationResponse)
async def translate(request: TranslationRequest):
    text = request.text.strip()
    source_code = request.source.strip().lower()
    target_code = request.target.strip().lower()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty.",
        )

    if not source_code or not target_code:
        raise HTTPException(
            status_code=400,
            detail="Source and target languages are required.",
        )

    if source_code == target_code:
        return TranslationResponse(translation=text)

    source_language = language_name(source_code)
    target_language = language_name(target_code)

    prompt = f"""
You are the translation engine for a real-time conversation app.

Translate the user's message from {source_language} to {target_language}.

Rules:
- Return ONLY the translation.
- Do not explain anything.
- Do not add quotation marks.
- Do not add labels such as "Translation:".
- Do not transliterate the source language unless the target language itself uses that script.
- Use the normal written script of the target language.
- Preserve the meaning, names, numbers, punctuation, and important terminology.
- Preserve conversational tone and formality.
- Do not invent information.
- Translate naturally rather than word-for-word when a natural translation is more appropriate.
- Keep short conversational phrases short.

Source language: {source_language}
Target language: {target_language}

User message:
{text}
""".strip()

    last_error: Optional[Exception] = None

    for model_name in AVAILABLE_MODELS:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        max_output_tokens=256,
                        thinking_config=types.ThinkingConfig(
                            thinking_level="low"
                        ),
                        response_mime_type="text/plain",
                    ),
                )

                translation = extract_response_text(response)

                if translation:
                    translation = clean_translation(translation)

                if translation:
                    return TranslationResponse(translation=translation)

            except Exception as error:
                last_error = error
                print(f"[Gemini] ({model_name} attempt {attempt + 1}) error: {type(error).__name__}: {error}")
                await asyncio.sleep(0.5)

    print(f"[Gemini] All translation attempts failed. Last error: {last_error}")
    raise HTTPException(
        status_code=502,
        detail="Translation service failed. Please check the backend terminal.",
    )
