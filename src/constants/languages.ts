import type { Language } from '../types';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English (US)', flag: '🇺🇸', speechCode: 'en-US' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', speechCode: 'es-ES' },
  { code: 'fr', name: 'French', flag: '🇫🇷', speechCode: 'fr-FR' },
  { code: 'de', name: 'German', flag: '🇩🇪', speechCode: 'de-DE' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', speechCode: 'it-IT' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', speechCode: 'pt-BR' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', speechCode: 'hi-IN' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', speechCode: 'ja-JP' },
  { code: 'zh', name: 'Chinese (Simplified)', flag: '🇨🇳', speechCode: 'zh-CN' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', speechCode: 'ko-KR' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', speechCode: 'ru-RU' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', speechCode: 'ar-SA' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', speechCode: 'nl-NL' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷', speechCode: 'tr-TR' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', speechCode: 'pl-PL' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪', speechCode: 'sv-SE' },

  // Added languages
  { code: 'th', name: 'Thai', flag: '🇹🇭', speechCode: 'th-TH' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳', speechCode: 'kn-IN' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳', speechCode: 'pa-IN' },
];

export const DEFAULT_SOURCE_LANG: Language = SUPPORTED_LANGUAGES[0]; // English
export const DEFAULT_TARGET_LANG: Language = SUPPORTED_LANGUAGES[1]; // Spanish