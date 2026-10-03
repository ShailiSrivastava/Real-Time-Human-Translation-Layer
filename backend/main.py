import os
import re
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types


# ============================================================
# Environment
# ============================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not configured.")


# ============================================================
# Gemini client
# ============================================================

client = genai.Client(api_key=GEMINI_API_KEY)


# ============================================================
# FastAPI app
# ============================================================

app = FastAPI(
    title="Real-Time Human Translation Layer",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://real-time-human-translation-layer.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Supported languages
# ============================================================

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


# ============================================================
# Request / Response models
# ============================================================

class TranslationRequest(BaseModel):
    text: str
    source: str
    target: str


class TranslationResponse(BaseModel):
    translation: str


# ============================================================
# Helpers
# ============================================================

def clean_translation(text: str) -> str:
    """
    Clean accidental formatting returned by the model.
    """

    text = text.strip()

    # Remove markdown code fences.
    text = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    # Remove accidental surrounding quotes.
    if len(text) >= 2:
        if (
            (text.startswith('"') and text.endswith('"'))
            or (text.startswith("'") and text.endswith("'"))
        ):
            text = text[1:-1].strip()

    return text.strip()


def extract_response_text(response: Any) -> str:
    """
    Safely extract text from a Gemini response.

    Prefer response.text, then fall back to candidate parts.
    """

    try:
        direct_text = response.text

        if isinstance(direct_text, str) and direct_text.strip():
            return direct_text.strip()
    except Exception:
        pass

    try:
        candidates = getattr(response, "candidates", None) or []

        for candidate in candidates:
            content = getattr(candidate, "content", None)

            if not content:
                continue

            parts = getattr(content, "parts", None) or []

            collected = []

            for part in parts:
                # Ignore thought parts if Gemini returns them.
                if getattr(part, "thought", False):
                    continue

                part_text = getattr(part, "text", None)

                if isinstance(part_text, str) and part_text.strip():
                    collected.append(part_text.strip())

            if collected:
                return "\n".join(collected).strip()

    except Exception:
        pass

    return ""


# ============================================================
# Routes
# ============================================================

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "Real-Time Human Translation Layer",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.post(
    "/api/translate",
    response_model=TranslationResponse,
)
def translate(request: TranslationRequest):

    text = request.text.strip()
    source = request.source.strip().lower()
    target = request.target.strip().lower()

    # --------------------------------------------------------
    # Validation
    # --------------------------------------------------------

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty.",
        )

    if source not in LANGUAGE_NAMES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported source language: {source}",
        )

    if target not in LANGUAGE_NAMES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported target language: {target}",
        )

    # No translation needed.
    if source == target:
        return TranslationResponse(
            translation=text
        )

    source_language = LANGUAGE_NAMES[source]
    target_language = LANGUAGE_NAMES[target]

    # --------------------------------------------------------
    # Translation prompt
    # --------------------------------------------------------

    prompt = f"""
You are a professional real-time translation engine.

Translate the user's text from {source_language} to {target_language}.

STRICT RULES:

1. Return ONLY the translated text.
2. Do not explain the translation.
3. Do not add labels such as "Translation:".
4. Do not use quotation marks around the translation.
5. Preserve the original meaning exactly.
6. Preserve names, numbers, punctuation, and important terminology.
7. Preserve the speaker's tone and level of formality.
8. Do NOT transliterate unless the target language normally requires
   that form of writing.
9. Use the normal writing system/script of the target language.
10. Keep short conversational phrases short and natural.
11. Do not add information that does not exist in the original.
12. If the input is already a natural sentence, translate it directly.
13. If the input is informal, keep the translation informal.
14. If the input is a question, keep it as a question.

Source language:
{source_language}

Target language:
{target_language}

Text to translate:
{text}
""".strip()

    # --------------------------------------------------------
    # Gemini request
    # --------------------------------------------------------

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=256,
                response_mime_type="text/plain",
                thinking_config=types.ThinkingConfig(
                    thinking_level="low"
                ),
            ),
        )

        translation = extract_response_text(response)
        translation = clean_translation(translation)

        if not translation:
            print(
                "[Translation] Gemini returned an empty response."
            )

            raise HTTPException(
                status_code=502,
                detail="Gemini returned an empty translation.",
            )

        print(
            f"[Translation] "
            f"{source_language} -> {target_language}: "
            f"{text!r} -> {translation!r}"
        )

        return TranslationResponse(
            translation=translation
        )

    except HTTPException:
        raise

    except Exception as error:
        print(
            "[Translation] Gemini error:",
            repr(error),
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Translation service failed. "
                "Check the Render logs for the Gemini error."
            ),
        )