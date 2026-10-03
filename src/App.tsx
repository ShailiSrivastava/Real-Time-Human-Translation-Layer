import { useState, useCallback, useEffect } from 'react';
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

  // Handler when a sentence is finalized by speech recognition or manual trigger
  const handleSentenceFinalized = useCallback(
    async (finalSentence: string) => {
      const sentence = finalSentence.trim();
      if (!sentence) return;

      const itemId = `trans-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const newItem: TranslationItem = {
        id: itemId,
        timestamp: Date.now(),
        sourceText: sentence,
        translatedText: '',
        sourceLang,
        targetLang,
        status: 'translating',
      };

      // Add to front of the feed
      setItems((prev) => [newItem, ...prev]);

      try {
        const translated = await translateText(sentence, sourceLang, targetLang);

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

        // Auto-Speak if enabled
        if (settings.autoSpeak && translated) {
          speechSynthesisService.speak(
            translated,
            targetLang,
            settings.speechRate,
            settings.speechPitch
          );
        }
      } catch (err: unknown) {
        console.error('Translation error:', err);
        const errMsg = err instanceof Error ? err.message : 'Translation request failed';
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
    },
    [sourceLang, targetLang, settings.autoSpeak, settings.speechRate, settings.speechPitch]
  );

  // Hook for Web Speech API recognition
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

  // Swap source and target languages
  const handleSwapLanguages = () => {
    const prevSource = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(prevSource);
  };

  const handleUpdateSettings = (newSettings: Partial<TranslationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleClearHistory = () => {
    speechSynthesisService.stop();
    setItems([]);
  };

  // Keyboard shortcut listener: Space to toggle mic when not typing in input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'SELECT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleListening]);

  return (
    <div className="app-layout">
      {/* Background visual atmosphere */}
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />

      <div className="app-container">
        {/* Header Bar */}
        <Header
          isListening={isListening}
          itemCount={items.length}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClearHistory={handleClearHistory}
        />

        {/* Main Control Console */}
        <section className="console-panel" aria-label="Translation Controls">
          {/* Source and Target Language Selection */}
          <LanguageSelector
            sourceLang={sourceLang}
            targetLang={targetLang}
            onSelectSource={setSourceLang}
            onSelectTarget={setTargetLang}
            onSwapLanguages={handleSwapLanguages}
            disabled={isListening}
          />

          {/* Microphone Action Controller */}
          <MicController
            recognitionState={recognitionState}
            isListening={isListening}
            sourceLang={sourceLang}
            onToggleMic={toggleListening}
            errorMessage={errorMessage}
          />

          {/* Live Interim Streaming Transcription Card */}
          <LiveInterimCard
            interimTranscript={interimTranscript}
            sourceLang={sourceLang}
            isListening={isListening}
          />

          {/* Manual Input Bar for Keyboard Testing */}
          <ManualInputBar
            sourceLang={sourceLang}
            onSendSentence={handleSentenceFinalized}
          />
        </section>

        {/* Live Conversation / Translation Feed */}
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
