import React, { useState } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';
import type { Language } from '../types';

interface ManualInputBarProps {
  sourceLang: Language;
  onSendSentence: (sentence: string) => void;
  disabled?: boolean;
}

export const ManualInputBar: React.FC<ManualInputBarProps> = ({
  sourceLang,
  onSendSentence,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || disabled) return;
    onSendSentence(trimmed);
    setInputText('');
  };

  return (
    <form className="manual-input-container" onSubmit={handleSubmit}>
      <input
        type="text"
        className="manual-input-field"
        placeholder={`Type in ${sourceLang.name} to test translation (or speak via microphone)...`}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        className="manual-input-submit"
        disabled={disabled || !inputText.trim()}
        title="Send sentence for translation"
      >
        <span>Translate</span>
        <Send size={15} />
        <span className="key-hint">
          <CornerDownLeft size={11} /> Enter
        </span>
      </button>
    </form>
  );
};
