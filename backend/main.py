import os
import re
import asyncio
from typing import Any

import httpx
import edge_tts
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai
from google.genai import types


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not configured.")


# ============================================================
# GEMINI CLIENT
# ============================================================

client = genai.Client(
    api_key=GEMINI_API_KEY
)


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Real-Time Human Translation Layer",
    version="2.0.0",
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
# SUPPORTED LANGUAGES
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
# TEXT-TO-SPEECH VOICES
# ============================================================

TTS_VOICES = {
    "en": "en-US-JennyNeural",
    "es": "es-ES-ElviraNeural",
    "fr": "fr-FR-DeniseNeural",
    "de": "de-DE-KatjaNeural",
    "it": "it-IT-ElsaNeural",
    "pt": "pt-BR-FranciscaNeural",
    "hi": "hi-IN-SwaraNeural",
    "ja": "ja-JP-NanamiNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "ko": "ko-KR-SunHiNeural",
    "ru": "ru-RU-SvetlanaNeural",
    "ar": "ar-SA-ZariyahNeural",
    "nl": "nl-NL-ColetteNeural",
    "tr": "tr-TR-EmelNeural",
    "pl": "pl-PL-ZofiaNeural",
    "sv": "sv-SE-SofieNeural",
    "th": "th-TH-PremwadeeNeural",
    "kn": "kn-IN-SapnaNeural",
    "pa": "pa-IN-VaaniNeural",
}


# ============================================================
# REQUEST MODELS
# ============================================================

class TranslationRequest(BaseModel):
    text: str
    source: str
    target: str


class TranslationResponse(BaseModel):
    translation: str


class SpeechRequest(BaseModel):
    text: str
    language: str


# ============================================================
# CLEAN TRANSLATION
# ============================================================

def clean_translation(text: str) -> str:

    text = text.strip()

    # Remove markdown code fences.
    text = re.sub(
        r"^```[a-zA-Z0-9_-]*\s*",
        "",
        text,
    )

    text = re.sub(
        r"\s*```$",
        "",
        text,
    )

    # Remove accidental surrounding quotes.
    if len(text) >= 2:

        if (
            text.startswith('"')
            and text.endswith('"')
        ) or (
            text.startswith("'")
            and text.endswith("'")
        ):
            text = text[1:-1].strip()

    return text.strip()


# ============================================================
# EXTRACT GEMINI RESPONSE
# ============================================================

def extract_response_text(response: Any) -> str:

    # First try response.text.
    try:

        direct_text = response.text

        if (
            isinstance(direct_text, str)
            and direct_text.strip()
        ):
            return direct_text.strip()

    except Exception:
        pass

    # Fallback to candidate parts.
    try:

        candidates = (
            getattr(response, "candidates", None)
            or []
        )

        for candidate in candidates:

            content = getattr(
                candidate,
                "content",
                None,
            )

            if not content:
                continue

            parts = (
                getattr(content, "parts", None)
                or []
            )

            collected = []

            for part in parts:

                if getattr(
                    part,
                    "thought",
                    False,
                ):
                    continue

                part_text = getattr(
                    part,
                    "text",
                    None,
                )

                if (
                    isinstance(part_text, str)
                    and part_text.strip()
                ):
                    collected.append(
                        part_text.strip()
                    )

            if collected:
                return "\n".join(
                    collected
                ).strip()

    except Exception:
        pass

    return ""


# ============================================================
# GEMINI TRANSLATION
# ============================================================

def translate_with_gemini(
    text: str,
    source_language: str,
    target_language: str,
) -> str:

    prompt = f"""
You are a professional real-time translation engine.

Translate the user's text from {source_language}
to {target_language}.

STRICT RULES:

1. Return ONLY the translated text.
2. Do not explain anything.
3. Do not add "Translation:".
4. Do not add quotation marks.
5. Preserve names.
6. Preserve numbers.
7. Preserve punctuation.
8. Preserve the original meaning.
9. Preserve tone and formality.
10. Use the natural writing system of the target language.
11. Do not transliterate unless normally required.
12. Keep conversational phrases natural.
13. Do not add information.
14. Keep questions as questions.

Source language:
{source_language}

Target language:
{target_language}

Text:
{text}
""".strip()

    # Try models in order.
    models = [
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash-lite",
    ]

    last_error = None

    for model_name in models:

        try:

            print(
                f"[Translation] Trying model: "
                f"{model_name}"
            )

            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=256,
                    response_mime_type="text/plain",
                ),
            )

            translation = clean_translation(
                extract_response_text(response)
            )

            if translation:

                print(
                    "[Translation] Gemini success:",
                    f"{source_language} -> "
                    f"{target_language}",
                    repr(translation),
                )

                return translation

            print(
                f"[Translation] {model_name} "
                "returned empty response."
            )

        except Exception as error:

            last_error = error

            print(
                f"[Translation] {model_name} failed:",
                repr(error),
            )

    raise RuntimeError(
        f"Gemini failed: {last_error}"
    )


# ============================================================
# MYMEMORY FALLBACK
# ============================================================

async def translate_with_mymemory(
    text: str,
    source: str,
    target: str,
) -> str:

    url = (
        "https://api.mymemory.translated.net/get"
    )

    params = {
        "q": text,
        "langpair": f"{source}|{target}",
    }

    async with httpx.AsyncClient(
        timeout=10.0
    ) as http:

        response = await http.get(
            url,
            params=params,
        )

        response.raise_for_status()

        data = response.json()

    translated = (
        data
        .get("responseData", {})
        .get("translatedText", "")
        .strip()
    )

    if not translated:

        raise RuntimeError(
            "MyMemory returned no translation."
        )

    return clean_translation(
        translated
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def root():

    return {
        "status": "ok",
        "service": (
            "Real-Time Human Translation Layer"
        ),
    }


@app.get("/health")
def health():

    return {
        "status": "healthy",
        "translation": (
            "Gemini + MyMemory fallback"
        ),
        "tts": "Edge TTS",
    }


# ============================================================
# TRANSLATION API
# ============================================================

@app.post(
    "/api/translate",
    response_model=TranslationResponse,
)
async def translate(
    request: TranslationRequest,
):

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
            detail=(
                f"Unsupported source language: "
                f"{source}"
            ),
        )

    if target not in LANGUAGE_NAMES:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported target language: "
                f"{target}"
            ),
        )

    # Same language = no API call.
    if source == target:

        return TranslationResponse(
            translation=text
        )

    source_language = LANGUAGE_NAMES[source]
    target_language = LANGUAGE_NAMES[target]

    # --------------------------------------------------------
    # GEMINI
    #
    # IMPORTANT:
    # Gemini is synchronous, so we run it in a separate
    # thread. This prevents it from blocking FastAPI.
    # --------------------------------------------------------

    try:

        print(
            f"[Translation] Request: "
            f"{source_language} -> "
            f"{target_language}: "
            f"{text!r}"
        )

        translation = await asyncio.wait_for(

            asyncio.to_thread(
                translate_with_gemini,
                text,
                source_language,
                target_language,
            ),

            timeout=20.0,
        )

        return TranslationResponse(
            translation=translation
        )

    except asyncio.TimeoutError:

        print(
            "[Translation] Gemini timed out "
            "after 20 seconds."
        )

    except Exception as error:

        print(
            "[Translation] Gemini failed:",
            repr(error),
        )

    # --------------------------------------------------------
    # MYMEMORY FALLBACK
    # --------------------------------------------------------

    try:

        print(
            f"[Translation] Using MyMemory fallback: "
            f"{source} -> {target}"
        )

        translation = await asyncio.wait_for(

            translate_with_mymemory(
                text,
                source,
                target,
            ),

            timeout=15.0,
        )

        print(
            "[Translation] Fallback success:",
            repr(translation),
        )

        return TranslationResponse(
            translation=translation
        )

    except asyncio.TimeoutError:

        print(
            "[Translation] MyMemory timed out."
        )

    except Exception as error:

        print(
            "[Translation] MyMemory failed:",
            repr(error),
        )

    # --------------------------------------------------------
    # EVERYTHING FAILED
    # --------------------------------------------------------

    raise HTTPException(
        status_code=502,
        detail=(
            "Translation services are currently "
            "unavailable. Please try again."
        ),
    )


# ============================================================
# TEXT TO SPEECH API
# ============================================================

@app.post("/api/speak")
async def speak(
    request: SpeechRequest,
):

    text = request.text.strip()
    language = request.language.strip().lower()

    if not text:

        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty.",
        )

    if language not in TTS_VOICES:

        raise HTTPException(
            status_code=400,
            detail=(
                f"TTS is not configured for "
                f"language: {language}"
            ),
        )

    voice = TTS_VOICES[language]

    print(
        f"[TTS] Generating: "
        f"{language} -> {voice}"
    )

    async def audio_stream():

        communicate = edge_tts.Communicate(
            text,
            voice,
            rate="+0%",
            volume="+0%",
            pitch="+0Hz",
        )

        try:

            async for chunk in communicate.stream():

                if chunk["type"] == "audio":

                    yield chunk["data"]

        except Exception as error:

            print(
                "[TTS] Generation failed:",
                repr(error),
            )

            raise

    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-cache",
        },
    )