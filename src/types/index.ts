export interface Language {
  code: string; // ISO 639-1 e.g. "en", "es"
  name: string; // Display name e.g. "English"
  flag: string; // Emoji flag e.g. "🇺🇸"
  speechCode: string; // BCP-47 speech recognition tag e.g. "en-US"
}

export interface TranslationItem {
  id: string;
  timestamp: number;
  sourceText: string;
  translatedText: string;
  sourceLang: Language;
  targetLang: Language;
  status: 'translating' | 'completed' | 'error';
  errorMessage?: string;
}

export type RecognitionState = 
  | 'idle' 
  | 'listening' 
  | 'processing' 
  | 'unsupported' 
  | 'permission_denied' 
  | 'error';

export interface TranslationSettings {
  autoSpeak: boolean;
  speechRate: number; // 0.8 - 1.2
  speechPitch: number; // 0.8 - 1.2
}
