import React, { useState } from 'react';
import { Volume2, Copy, Check, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import type { TranslationItem } from '../types';
import { speechSynthesisService } from '../services/speechSynthesisService';

interface TranslationFeedProps {
  items: TranslationItem[];
  onSampleClick: (text: string) => void;
}

export const TranslationFeed: React.FC<TranslationFeedProps> = ({
  items,
  onSampleClick,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSpeak = (item: TranslationItem) => {
    if (!item.translatedText) return;

    if (speakingId === item.id) {
      speechSynthesisService.stop();
      setSpeakingId(null);
      return;
    }

    setSpeakingId(item.id);
    speechSynthesisService.speak(
      item.translatedText,
      item.targetLang,
      1.0,
      1.0,
      () => {
        setSpeakingId(null);
      }
    );
  };

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestamp);
  };

  const samplePrompts = [
    'Hello, how are you doing today?',
    'Could you please show me the way to the train station?',
    'I would like to order a warm cup of coffee.',
    'Thank you so much for your kind assistance!',
  ];

  if (items.length === 0) {
    return (
      <div className="empty-feed-card">
        <div className="empty-icon-wrap">
          <Sparkles className="empty-sparkle-icon" size={32} />
        </div>
        <h3 className="empty-title">Real-Time Translation Feed</h3>
        <p className="empty-desc">
          Speak into the microphone above or test with sample sentences below. Your sentences will be
          automatically transcribed, translated, and optionally spoken aloud.
        </p>

        <div className="sample-prompts-container">
          <span className="sample-prompts-title">Try quick sample phrases:</span>
          <div className="sample-prompts-list">
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                className="sample-prompt-btn"
                onClick={() => onSampleClick(prompt)}
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-container">
      <div className="feed-header-bar">
        <h2 className="feed-title">Translations ({items.length})</h2>
      </div>

      <div className="feed-list">
        {items.map((item) => {
          const isItemSpeaking = speakingId === item.id;
          const isPending = item.status === 'translating';

          return (
            <div key={item.id} className="translation-card">
              {/* Card Meta Header */}
              <div className="translation-card-meta">
                <div className="lang-route">
                  <span className="lang-tag">
                    {item.sourceLang.flag} {item.sourceLang.name}
                  </span>
                  <ArrowRight size={14} className="route-arrow" />
                  <span className="lang-tag lang-tag-target">
                    {item.targetLang.flag} {item.targetLang.name}
                  </span>
                </div>
                <div className="time-badge">{formatTime(item.timestamp)}</div>
              </div>

              {/* Original & Translated Grid */}
              <div className="translation-content-grid">
                {/* Original Source Box */}
                <div className="speech-box source-box">
                  <div className="speech-box-header">
                    <span className="box-role">Original Sentence</span>
                    <button
                      className="btn-mini-action"
                      onClick={() => handleCopy(`src-${item.id}`, item.sourceText)}
                      title="Copy original sentence"
                    >
                      {copiedId === `src-${item.id}` ? (
                        <Check size={14} className="text-emerald" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                  <p className="speech-text source-text">{item.sourceText}</p>
                </div>

                {/* Translated Output Box */}
                <div className="speech-box target-box">
                  <div className="speech-box-header">
                    <span className="box-role target-role">Translated Sentence</span>
                    <div className="box-actions">
                      {item.status === 'completed' && (
                        <>
                          <button
                            className={`btn-mini-action btn-speak ${
                              isItemSpeaking ? 'speaking-active' : ''
                            }`}
                            onClick={() => handleSpeak(item)}
                            title={isItemSpeaking ? 'Stop speaking' : 'Speak Translation'}
                            aria-label="Speak Translation"
                          >
                            <Volume2 size={14} className={isItemSpeaking ? 'animate-bounce' : ''} />
                            <span>{isItemSpeaking ? 'Speaking...' : 'Speak'}</span>
                          </button>
                          <button
                            className="btn-mini-action"
                            onClick={() => handleCopy(`tgt-${item.id}`, item.translatedText)}
                            title="Copy translation"
                          >
                            {copiedId === `tgt-${item.id}` ? (
                              <Check size={14} className="text-emerald" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isPending ? (
                    <div className="translating-indicator">
                      <Loader2 size={16} className="animate-spin text-accent" />
                      <span>Translating sentence...</span>
                    </div>
                  ) : item.status === 'error' ? (
                    <p className="speech-text error-text">
                      Translation error: {item.errorMessage || 'Failed to translate'}
                    </p>
                  ) : (
                    <p className="speech-text target-text">{item.translatedText}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
