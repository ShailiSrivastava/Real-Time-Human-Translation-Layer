import type { Language } from '../types';

const TRANSLATION_ENDPOINT =
  import.meta.env.PROD
    ? 'https://real-time-human-translation-layer.onrender.com/api/translate'
    : '/api/translate';

interface TranslationResponse {
  translation?: string;
  translated_text?: string;
  error?: string;
  detail?: string;
}

export async function translateText(
  text: string,
  sourceLanguage: Language,
  targetLanguage: Language
): Promise<string> {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error('Please enter some text to translate.');
  }

  const response = await fetch(TRANSLATION_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: trimmedText,
      source: sourceLanguage.code,
      target: targetLanguage.code,
    }),
  });

  let data: TranslationResponse = {};

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Translation server returned invalid data (${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.detail ||
      data.error ||
      `Translation failed (${response.status}).`
    );
  }

  const translation =
    data.translation ||
    data.translated_text;

  if (!translation) {
    throw new Error(
      'The translation server returned no translation.'
    );
  }

  return translation;
}