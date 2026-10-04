import type { Language } from '../types';

const SPEAK_ENDPOINT = '/api/speak';

class SpeechSynthesisManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private speaking = false;

  private queue: Array<{
    text: string;
    lang: Language;
    rate: number;
    pitch: number;
  }> = [];

  private processingQueue = false;

  public isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Keeps compatibility with App.tsx.
   * Browser audio is already unlocked by the user's click.
   */
  public unlock(): void {
    console.log('[Speech] Audio unlocked by user interaction.');
  }

  /**
   * Queue speech for Auto-Speak.
   */
  public enqueue(
    text: string,
    lang: Language,
    rate = 1.0,
    pitch = 1.0
  ): void {
    const trimmed = text.trim();

    if (!trimmed) return;

    this.queue.push({
      text: trimmed,
      lang,
      rate,
      pitch,
    });

    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;

    this.processingQueue = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();

        if (!item) continue;

        await this.generateAndPlay(
          item.text,
          item.lang,
          item.rate,
          item.pitch
        );
      }
    } finally {
      this.processingQueue = false;
    }
  }

  public speak(
    text: string,
    lang: Language,
    rate = 1.0,
    pitch = 1.0,
    onEnd?: () => void
  ): boolean {
    const trimmed = text.trim();

    if (!trimmed) {
      return false;
    }

    this.stop();

    void this.generateAndPlay(
      trimmed,
      lang,
      rate,
      pitch,
      onEnd
    );

    return true;
  }

  private async generateAndPlay(
    text: string,
    lang: Language,
    _rate = 1.0,
    _pitch = 1.0,
    onEnd?: () => void
  ): Promise<void> {
    try {
      this.stopCurrentAudio();

      this.speaking = true;

      console.log(
        `[Server TTS] Generating ${lang.name} (${lang.code})`
      );

      const response = await fetch(
        SPEAK_ENDPOINT,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            language: lang.code,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          errorText ||
          `TTS failed (${response.status})`
        );
      }

      const blob = await response.blob();

      this.currentObjectUrl =
        URL.createObjectURL(blob);

      const audio =
        new Audio(this.currentObjectUrl);

      this.currentAudio = audio;

      audio.onended = () => {
        this.cleanup();

        onEnd?.();
      };

      audio.onerror = () => {
        console.error(
          '[Server TTS] Audio playback failed.'
        );

        this.cleanup();

        onEnd?.();
      };

      await audio.play();

    } catch (error) {
      console.error(
        '[Server TTS] Error:',
        error
      );

      this.cleanup();

      /*
       * Browser fallback.
       * This only works when Chrome has a voice
       * installed for the selected language.
       */
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window
      ) {
        try {
          const utterance =
            new SpeechSynthesisUtterance(text);

          utterance.lang =
            lang.speechCode;

          utterance.rate = 1.0;
          utterance.pitch = 1.0;

          utterance.onend = () => {
            onEnd?.();
          };

          utterance.onerror = () => {
            onEnd?.();
          };

          window.speechSynthesis.cancel();

          window.speechSynthesis.speak(
            utterance
          );

          return;
        } catch {
          // Browser fallback failed.
        }
      }

      onEnd?.();

    } finally {
      this.speaking = false;
    }
  }

  private stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio.src = '';
      this.currentAudio = null;
    }

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(
        this.currentObjectUrl
      );

      this.currentObjectUrl = null;
    }
  }

  private cleanup(): void {
    this.speaking = false;
    this.stopCurrentAudio();
  }

  public stop(): void {
    this.queue = [];

    this.stopCurrentAudio();

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      window.speechSynthesis.cancel();
    }

    this.speaking = false;
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }
}

export const speechSynthesisService =
  new SpeechSynthesisManager();