import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { MicController } from './components/MicController';
import { LiveInterimCard } from './components/LiveInterimCard';
import { TranslationFeed } from './components/TranslationFeed';
import { ManualInputBar } from './components/ManualInputBar';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { translateText } from './services/translationService';
import { speechSynthesisService } from './services/speechSynthesisService';
import type { Language, TranslationItem, TranslationSettings } from './types';
import { DEFAULT_SOURCE_LANG, DEFAULT_TARGET_LANG } from './constants/languages';

export function App() {
  const [sourceLang, setSourceLang] = useState<Language>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<Language>(DEFAULT_TARGET_LANG);
  const [items, setItems] = useState<TranslationItem[]>([]);
  const [settings, setSettings] = useState<TranslationSettings>({
    autoSpeak: true,
    speechRate: 1.0,
    speechPitch: 1.0,
  });

  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);
  const settingsRef = useRef(settings);

  sourceLangRef.current = sourceLang;
  targetLangRef.current = targetLang;
  settingsRef.current = settings;

  const handleSentenceFinalized = useCallback(async (finalSentence: string) => {
    const sentence = finalSentence.trim();
    if (!sentence) return;

    // Snapshot the languages at the exact moment the sentence was received.
    // This prevents a later language change from altering an in-flight request.
    const requestSource = sourceLangRef.current;
    const requestTarget = targetLangRef.current;
    const requestSettings = settingsRef.current;

    const itemId = `trans-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const newItem: TranslationItem = {
      id: itemId,
      timestamp: Date.now(),
      sourceText: sentence,
      translatedText: '',
      sourceLang: requestSource,
      targetLang: requestTarget,
      status: 'translating',
    };

    setItems((prev) => [newItem, ...prev]);

    try {
      const translated = await translateText(
        sentence,
        requestSource,
        requestTarget
      );

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                translatedText: translated,
                status: 'completed',
              }
            : item
        )
      );

      if (requestSettings.autoSpeak && translated) {
        speechSynthesisService.enqueue(
          translated,
          requestTarget,
          requestSettings.speechRate,
          requestSettings.speechPitch
        );
      }
    } catch (err: unknown) {
      console.error('[Translation] Error:', err);
      const errMsg =
        err instanceof Error ? err.message : 'Translation request failed';

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: 'error',
                errorMessage: errMsg,
              }
            : item
        )
      );
    }
  }, []);

  const {
    recognitionState,
    isListening,
    interimTranscript,
    errorMessage,
    toggleListening,
  } = useSpeechRecognition({
    sourceLang,
    onSentenceFinalized: handleSentenceFinalized,
  });

  const handleSourceChange = (language: Language) => {
    speechSynthesisService.stop();
    setSourceLang(language);
  };

  const handleTargetChange = (language: Language) => {
    speechSynthesisService.stop();
    setTargetLang(language);
  };

  const handleSwapLanguages = () => {
    speechSynthesisService.stop();

    setSourceLang(targetLangRef.current);
    setTargetLang(sourceLangRef.current);
  };

  const handleUpdateSettings = (newSettings: Partial<TranslationSettings>) => {
    if (newSettings.autoSpeak === false) {
      speechSynthesisService.stop();
    }

    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleClearHistory = () => {
    speechSynthesisService.stop();
    setItems([]);
  };

  // Any real user interaction can unlock browser speech synthesis.
  const handleUserInteraction = () => {
    speechSynthesisService.unlock();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'SELECT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        speechSynthesisService.unlock();
        toggleListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleListening]);

  return (
    <div className="app-layout" onPointerDown={handleUserInteraction}>
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />

      <div className="app-container">
        <Header
          isListening={isListening}
          itemCount={items.length}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClearHistory={handleClearHistory}
        />

        <section className="console-panel" aria-label="Translation Controls">
          <LanguageSelector
            sourceLang={sourceLang}
            targetLang={targetLang}
            onSelectSource={handleSourceChange}
            onSelectTarget={handleTargetChange}
            onSwapLanguages={handleSwapLanguages}
            disabled={isListening}
          />

          <MicController
            recognitionState={recognitionState}
            isListening={isListening}
            sourceLang={sourceLang}
            onToggleMic={() => {
              speechSynthesisService.unlock();
              toggleListening();
            }}
            errorMessage={errorMessage}
          />

          <LiveInterimCard
            interimTranscript={interimTranscript}
            sourceLang={sourceLang}
            isListening={isListening}
          />

          <ManualInputBar
            sourceLang={sourceLang}
            onSendSentence={handleSentenceFinalized}
          />
        </section>

        <section className="feed-section" aria-label="Translation History">
          <TranslationFeed
            items={items}
            onSampleClick={handleSentenceFinalized}
          />
        </section>
      </div>
    </div>
  );
}

export default App;
