import React from 'react';
import { Volume2, VolumeX, Trash2, Languages, Radio } from 'lucide-react';
import type { TranslationSettings } from '../types';

interface HeaderProps {
  isListening: boolean;
  itemCount: number;
  settings: TranslationSettings;
  onUpdateSettings: (newSettings: Partial<TranslationSettings>) => void;
  onClearHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isListening,
  itemCount,
  settings,
  onUpdateSettings,
  onClearHistory,
}) => {
  return (
    <header className="header-container">
      <div className="header-brand">
        <div className="brand-icon-wrapper">
          <Languages className="brand-icon" size={24} />
          {isListening && <span className="brand-pulse-dot" />}
        </div>
        <div>
          <div className="brand-title-row">
            <h1 className="brand-title">HumanLayer</h1>
            <span className="badge badge-accent">Phase 0</span>
          </div>
          <p className="brand-subtitle">Real-Time Speech-to-Speech Translation</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Live Audio Status */}
        <div className={`status-pill ${isListening ? 'status-pill-active' : ''}`}>
          <Radio size={14} className={isListening ? 'animate-pulse' : ''} />
          <span>{isListening ? 'Live Recognition Active' : 'Speech Engine Ready'}</span>
        </div>

        {/* Auto-Speak Toggle */}
        <button
          className={`btn-toggle ${settings.autoSpeak ? 'btn-toggle-active' : ''}`}
          onClick={() => onUpdateSettings({ autoSpeak: !settings.autoSpeak })}
          title={settings.autoSpeak ? 'Disable Auto-Speak' : 'Enable Auto-Speak'}
          aria-label="Toggle Auto-Speak Translation"
        >
          {settings.autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>Auto-Speak</span>
        </button>

        {/* Clear History */}
        {itemCount > 0 && (
          <button
            className="btn-icon"
            onClick={onClearHistory}
            title="Clear translation history"
            aria-label="Clear history"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </header>
  );
};
