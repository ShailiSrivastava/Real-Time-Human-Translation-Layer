import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants/languages';

interface LanguageSelectorProps {
  sourceLang: Language;
  targetLang: Language;
  onSelectSource: (lang: Language) => void;
  onSelectTarget: (lang: Language) => void;
  onSwapLanguages: () => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  sourceLang,
  targetLang,
  onSelectSource,
  onSelectTarget,
  onSwapLanguages,
  disabled = false,
}) => {
  return (
    <div className="language-selector-card">
      {/* Source Language Picker */}
      <div className="language-group">
        <label htmlFor="source-lang-select" className="language-label">
          Source Language (Speech Input)
        </label>
        <div className="select-wrapper">
          <span className="lang-flag">{sourceLang.flag}</span>
          <select
            id="source-lang-select"
            className="language-select"
            value={sourceLang.code}
            onChange={(e) => {
              const selected = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
              if (selected) onSelectSource(selected);
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={`src-${lang.code}`} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Swap Button */}
      <button
        className="btn-swap"
        onClick={onSwapLanguages}
        disabled={disabled}
        title="Swap Source and Target Languages"
        aria-label="Swap Languages"
      >
        <ArrowLeftRight size={18} />
      </button>

      {/* Target Language Picker */}
      <div className="language-group">
        <label htmlFor="target-lang-select" className="language-label">
          Target Language (Translation Output)
        </label>
        <div className="select-wrapper">
          <span className="lang-flag">{targetLang.flag}</span>
          <select
            id="target-lang-select"
            className="language-select"
            value={targetLang.code}
            onChange={(e) => {
              const selected = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
              if (selected) onSelectTarget(selected);
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={`tgt-${lang.code}`} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
