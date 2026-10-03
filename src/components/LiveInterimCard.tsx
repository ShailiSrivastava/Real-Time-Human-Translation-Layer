import React from 'react';
import { Activity } from 'lucide-react';
import type { Language } from '../types';

interface LiveInterimCardProps {
  interimTranscript: string;
  sourceLang: Language;
  isListening: boolean;
}

export const LiveInterimCard: React.FC<LiveInterimCardProps> = ({
  interimTranscript,
  sourceLang,
  isListening,
}) => {
  // Only display if listening or if there is active interim text
  if (!isListening && !interimTranscript) {
    return null;
  }

  return (
    <div className="live-interim-card">
      <div className="live-interim-header">
        <div className="live-tag">
          <Activity size={14} className="animate-spin-slow" />
          <span>Real-Time Speech Stream</span>
        </div>
        <span className="live-lang-badge">
          {sourceLang.flag} {sourceLang.name}
        </span>
      </div>

      <div className="live-interim-body">
        {interimTranscript ? (
          <p className="interim-text">
            {interimTranscript}
            <span className="streaming-cursor" />
          </p>
        ) : (
          <p className="interim-placeholder">
            Listening for your voice... speak now
          </p>
        )}
      </div>
    </div>
  );
};
