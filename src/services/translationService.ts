import type { Language } from '../types';

interface TranslationResponse {
  translation: string;
}

interface ErrorResponse {
  detail?: string;
}

const TRANSLATION_ENDPOINT =
  import.meta.env.PROD
    ? 'https://real-time-human-translation-layer.onrender.com/api/translate'
    : '/api/translate';
export async function translateText(
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<string> {
  const trimmed = text.trim();

  if (!trimmed) {
    return '';
  }

  if (sourceLang.code === targetLang.code) {
    return trimmed;
  }

  let response: Response;

  try {
    response = await fetch(TRANSLATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        text: trimmed,
        source: sourceLang.code,
        target: targetLang.code,
      }),
    });
  } catch (error) {
    console.error('[Translation] Could not reach backend:', error);

    throw new Error(
      'Cannot reach the translation backend. Make sure FastAPI is running on port 8000.'
    );
  }

  if (!response.ok) {
    let message = `Translation failed (${response.status}).`;

    try {
      const data = (await response.json()) as ErrorResponse;

      if (data.detail) {
        message = data.detail;
      }
    } catch {
      if (response.status === 502) {
        message = 'Cannot connect to backend. Please ensure the FastAPI server is running on port 8000.';
      }
    }

    console.error('[Translation] Backend error:', message);
    throw new Error(message);
  }

  let data: TranslationResponse;

  try {
    data = (await response.json()) as TranslationResponse;
  } catch {
    throw new Error('Backend returned an invalid translation response.');
  }

  if (
    typeof data.translation !== 'string' ||
    !data.translation.trim()
  ) {
    throw new Error('Translation backend returned an empty result.');
  }

  return data.translation.trim();
}
