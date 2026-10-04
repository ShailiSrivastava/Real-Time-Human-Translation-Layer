import { useCallback, useEffect, useRef, useState } from 'react';
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
  maxAlternatives: number;
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

/**
 * Stable browser speech-recognition hook.
 * A fresh recognition instance is created for each session/restart. This
 * avoids Chrome's common "already started" / stale-language problems after
 * several language changes or recognition restarts.
 */
export function useSpeechRecognition({
  sourceLang,
  onSentenceFinalized,
}: UseSpeechRecognitionProps) {
  const [recognitionState, setRecognitionState] =
    useState<RecognitionState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(0);
  const sourceLangRef = useRef(sourceLang.speechCode);
  const callbackRef = useRef(onSentenceFinalized);

  sourceLangRef.current = sourceLang.speechCode;
  callbackRef.current = onSentenceFinalized;

  const API =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : undefined;

  const isSupported = Boolean(API);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const destroyRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    if (!recognition) return;

    try {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    } catch {
      // Ignore browser-specific shutdown errors.
    }
  }, []);

  const createAndStartRecognition = useCallback(() => {
    if (!API || !listeningRef.current) return;

    const sessionId = sessionIdRef.current;
    const recognition = new API();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = sourceLangRef.current;

    recognition.onstart = () => {
      if (sessionId !== sessionIdRef.current || !listeningRef.current) return;

      setRecognitionState('listening');
      setErrorMessage(null);
      console.log(`[Speech] Listening in ${sourceLangRef.current}`);
    };

    recognition.onresult = (event) => {
      if (sessionId !== sessionIdRef.current || !listeningRef.current) return;

      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript?.trim() || '';

        if (!transcript) continue;

        if (result.isFinal) {
          console.log('[Speech] Final:', transcript);
          setInterimTranscript('');
          callbackRef.current(transcript);
        } else {
          interim += `${transcript} `;
        }
      }

      setInterimTranscript(interim.trim());
    };

    recognition.onerror = (event) => {
      if (sessionId !== sessionIdRef.current) return;

      console.warn('[Speech] Error:', event.error, event.message || '');

      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          listeningRef.current = false;
          clearRestartTimer();
          setRecognitionState('permission_denied');
          setErrorMessage(
            'Microphone access was denied. Allow microphone access in Chrome.'
          );
          return;

        case 'audio-capture':
          setErrorMessage('No microphone was detected. Check your microphone.');
          return;

        case 'network':
          setErrorMessage('Speech recognition connection interrupted. Reconnecting...');
          return;

        case 'language-not-supported':
          listeningRef.current = false;
          clearRestartTimer();
          setRecognitionState('error');
          setErrorMessage(
            `Chrome does not support speech recognition for ${sourceLangRef.current}.`
          );
          return;

        case 'no-speech':
        case 'aborted':
          return;

        default:
          setErrorMessage(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (sessionId !== sessionIdRef.current) return;

      recognitionRef.current = null;
      console.log('[Speech] Session ended');

      if (!listeningRef.current) {
        setRecognitionState('idle');
        setInterimTranscript('');
        return;
      }

      // Chrome ends recognition by itself after silence/network events.
      // Start a fresh instance instead of calling start() on the old one.
      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (listeningRef.current && sessionId === sessionIdRef.current) {
          createAndStartRecognition();
        }
      }, 250);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      console.debug('[Speech] Start request failed; retrying:', error);

      if (listeningRef.current && sessionId === sessionIdRef.current) {
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (listeningRef.current && sessionId === sessionIdRef.current) {
            createAndStartRecognition();
          }
        }, 400);
      }
    }
  }, [API, clearRestartTimer]);

  useEffect(() => {
    if (!isSupported) {
      setRecognitionState('unsupported');
      return;
    }

    // Source language changed. Never keep an old recognition session alive.
    sessionIdRef.current += 1;
    listeningRef.current = false;
    clearRestartTimer();
    destroyRecognition();
    setInterimTranscript('');
    setRecognitionState('idle');
    setErrorMessage(null);

    return () => {
      sessionIdRef.current += 1;
      listeningRef.current = false;
      clearRestartTimer();
      destroyRecognition();
    };
  }, [sourceLang.speechCode, isSupported, clearRestartTimer, destroyRecognition]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setRecognitionState('unsupported');
      setErrorMessage('Speech recognition is not supported in this browser.');
      return;
    }

    if (listeningRef.current) return;

    sessionIdRef.current += 1;
    listeningRef.current = true;
    clearRestartTimer();
    destroyRecognition();

    setErrorMessage(null);
    setInterimTranscript('');
    setRecognitionState('processing');

    createAndStartRecognition();
  }, [isSupported, clearRestartTimer, destroyRecognition, createAndStartRecognition]);

  const stopListening = useCallback(() => {
    sessionIdRef.current += 1;
    listeningRef.current = false;
    clearRestartTimer();
    destroyRecognition();
    setInterimTranscript('');
    setRecognitionState('idle');
  }, [clearRestartTimer, destroyRecognition]);

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
    isListening: listeningRef.current && recognitionState === 'listening',
    interimTranscript,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
  };
}
