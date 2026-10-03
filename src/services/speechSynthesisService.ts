import type { Language } from '../types';

class SpeechSynthesisManager {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      this.synth = window.speechSynthesis;

      this.loadVoices();

      // Chrome may load voices after the page has already loaded.
      this.synth.addEventListener('voiceschanged', () => {
        this.loadVoices();
      });
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;

    this.voices = this.synth.getVoices();

    console.log(
      '[SpeechSynthesis] Available voices:',
      this.voices.length
    );
  }

  public isSupported(): boolean {
    return Boolean(this.synth);
  }

  public getBestVoice(
    lang: Language
  ): SpeechSynthesisVoice | undefined {
    if (!this.synth) return undefined;

    this.loadVoices();

    const targetLanguage = lang.speechCode.toLowerCase();
    const targetCode = lang.code.toLowerCase();

    // 1. Exact match: hi-IN, en-US, th-TH, etc.
    const exact = this.voices.find(
      (voice) =>
        voice.lang.toLowerCase() === targetLanguage
    );

    if (exact) {
      return exact;
    }

    // 2. Base language match: hi, en, th, etc.
    const baseLanguage = this.voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(`${targetCode}-`)
    );

    if (baseLanguage) {
      return baseLanguage;
    }

    // 3. Some browsers return just "en", "hi", "th", etc.
    const shortLanguage = this.voices.find(
      (voice) =>
        voice.lang.toLowerCase() === targetCode
    );

    return shortLanguage;
  }

  public speak(
    text: string,
    lang: Language,
    rate = 1.0,
    pitch = 1.0,
    onEnd?: () => void
  ): boolean {
    if (!this.synth) {
      console.warn(
        '[SpeechSynthesis] Browser speech synthesis is not supported.'
      );
      return false;
    }

    const trimmed = text.trim();

    if (!trimmed) {
      return false;
    }

    console.log(
      `[SpeechSynthesis] Speaking "${trimmed}" in ${lang.speechCode}`
    );

    // Stop anything currently speaking.
    this.synth.cancel();

    // Make sure Chrome is not stuck in a paused state.
    try {
      this.synth.resume();
    } catch {
      // Ignore.
    }

    const utterance = new SpeechSynthesisUtterance(trimmed);

    utterance.lang = lang.speechCode;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;

    const voice = this.getBestVoice(lang);

    if (voice) {
      utterance.voice = voice;

      console.log(
        `[SpeechSynthesis] Using voice: ${voice.name} (${voice.lang})`
      );
    } else {
      console.warn(
        `[SpeechSynthesis] No specific voice found for ${lang.speechCode}. Using browser fallback.`
      );
    }

    let finished = false;

    const finish = () => {
      if (finished) return;

      finished = true;
      onEnd?.();
    };

    utterance.onstart = () => {
      console.log(
        `[SpeechSynthesis] Started: ${lang.speechCode}`
      );
    };

    utterance.onend = () => {
      console.log('[SpeechSynthesis] Finished');
      finish();
    };

    utterance.onerror = (event) => {
      console.error(
        '[SpeechSynthesis] Error:',
        event.error
      );

      finish();
    };

    /*
     * IMPORTANT:
     * Do not await anything here.
     * Do not use setTimeout().
     *
     * This allows the Speak button's user gesture
     * to reach speechSynthesis.speak() directly.
     */
    try {
      this.synth.speak(utterance);
      return true;
    } catch (error) {
      console.error(
        '[SpeechSynthesis] Failed to start:',
        error
      );

      finish();
      return false;
    }
  }

  public stop(): void {
    if (!this.synth) return;

    this.synth.cancel();

    try {
      this.synth.resume();
    } catch {
      // Ignore.
    }
  }

  public isSpeaking(): boolean {
    return Boolean(this.synth?.speaking);
  }
}

export const speechSynthesisService =
  new SpeechSynthesisManager();