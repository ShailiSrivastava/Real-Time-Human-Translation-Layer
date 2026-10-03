import { useState, useEffect, useRef, useCallback } from 'react';
import type { Language, RecognitionState } from '../types';

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

interface UseSpeechRecognitionProps {
  sourceLang: Language;
  onSentenceFinalized: (sentence: string) => void;
}

export function useSpeechRecognition({
  sourceLang,
  onSentenceFinalized,
}: UseSpeechRecognitionProps) {
  const [recognitionState, setRecognitionState] =
    useState<RecognitionState>('idle');
  const [interimTranscript, setInterimTranscript] =
    useState('');
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const recognitionRef =
    useRef<ISpeechRecognition | null>(null);

  const listeningRef = useRef(false);
  const restartingRef = useRef(false);
  const restartTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const callbackRef = useRef(onSentenceFinalized);
  callbackRef.current = onSentenceFinalized;

  const sourceCodeRef = useRef(sourceLang.speechCode);
  sourceCodeRef.current = sourceLang.speechCode;

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );

  const clearRestart = useCallback(() => {
    if (restartTimerRef.current !== null) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    restartingRef.current = false;
  }, []);

  const scheduleRestart = useCallback(() => {
    if (
      !listeningRef.current ||
      restartingRef.current
    ) {
      return;
    }

    restartingRef.current = true;

    clearRestart();

    restartTimerRef.current = setTimeout(() => {
      restartingRef.current = false;

      if (!listeningRef.current) return;

      const recognition = recognitionRef.current;

      if (!recognition) return;

      try {
        recognition.lang = sourceCodeRef.current;
        recognition.start();
      } catch (error) {
        console.debug(
          '[Speech] Restart delayed:',
          error
        );

        if (listeningRef.current) {
          restartingRef.current = false;
          scheduleRestart();
        }
      }
    }, 500);
  }, [clearRestart]);

  useEffect(() => {
    if (!isSupported) {
      setRecognitionState('unsupported');
      return;
    }

    const API =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!API) {
      setRecognitionState('unsupported');
      return;
    }

    clearRestart();

    // Stop any previous recognition instance.
    const oldRecognition = recognitionRef.current;

    if (oldRecognition) {
      try {
        oldRecognition.abort();
      } catch {
        // Ignore.
      }
    }

    const recognition = new API();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = sourceLang.speechCode;

    if (recognition.maxAlternatives !== undefined) {
      recognition.maxAlternatives = 1;
    }

    recognition.onstart = () => {
      setRecognitionState('listening');
      setErrorMessage(null);
      console.log(
        `[Speech] Listening in ${sourceLang.speechCode}`
      );
    };

    recognition.onresult = (event) => {
      let interim = '';

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const result = event.results[i];
        const transcript =
          result[0]?.transcript?.trim() || '';

        if (!transcript) continue;

        if (result.isFinal) {
          console.log(
            '[Speech] Final:',
            transcript
          );

          callbackRef.current(transcript);
        } else {
          interim += `${transcript} `;
        }
      }

      setInterimTranscript(interim.trim());
    };

    recognition.onerror = (event) => {
      console.warn(
        '[Speech] Error:',
        event.error,
        event.message || ''
      );

      if (event.error === 'not-allowed') {
        listeningRef.current = false;
        clearRestart();

        setRecognitionState('permission_denied');
        setErrorMessage(
          'Microphone access was denied. Allow microphone access in Chrome.'
        );
        return;
      }

      if (event.error === 'audio-capture') {
        setErrorMessage(
          'No microphone was detected. Check your microphone.'
        );
        return;
      }

      if (event.error === 'network') {
        setErrorMessage(
          'Speech recognition connection was interrupted. Reconnecting...'
        );
        return;
      }

      if (
        event.error !== 'no-speech' &&
        event.error !== 'aborted'
      ) {
        setErrorMessage(
          `Speech recognition error: ${event.error}`
        );
      }
    };

    recognition.onend = () => {
      console.log('[Speech] Session ended');

      if (listeningRef.current) {
        scheduleRestart();
      } else {
        setRecognitionState('idle');
        setInterimTranscript('');
      }
    };

    recognitionRef.current = recognition;

    setRecognitionState('idle');
    setInterimTranscript('');
    setErrorMessage(null);

    return () => {
      listeningRef.current = false;
      clearRestart();

      try {
        recognition.abort();
      } catch {
        // Ignore.
      }

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [
    isSupported,
    sourceLang.speechCode,
    clearRestart,
    scheduleRestart,
  ]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setRecognitionState('unsupported');
      return;
    }

    const recognition = recognitionRef.current;

    if (!recognition) {
      setErrorMessage(
        'Speech recognition is not ready. Refresh the page once.'
      );
      return;
    }

    clearRestart();

    listeningRef.current = true;
    setErrorMessage(null);
    setInterimTranscript('');

    try {
      recognition.lang = sourceLang.speechCode;
      recognition.start();
    } catch (error) {
      console.debug(
        '[Speech] Start request:',
        error
      );

      /*
       * If Chrome says a session is already active, keep the
       * current session instead of creating another one.
       */
      setRecognitionState('listening');
    }
  }, [
    isSupported,
    sourceLang.speechCode,
    clearRestart,
  ]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    clearRestart();

    setInterimTranscript('');
    setRecognitionState('idle');

    const recognition = recognitionRef.current;

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          // Ignore.
        }
      }
    }
  }, [clearRestart]);

  const toggleListening = useCallback(() => {
    if (listeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  return {
    isSupported,
    recognitionState,
    isListening:
      recognitionState === 'listening',
    interimTranscript,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
  };
}
