import React from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import type { Language, RecognitionState } from '../types';

interface MicControllerProps {
  recognitionState: RecognitionState;
  isListening: boolean;
  sourceLang: Language;
  onToggleMic: () => void;
  errorMessage: string | null;
}

export const MicController: React.FC<MicControllerProps> = ({
  recognitionState,
  isListening,
  sourceLang,
  onToggleMic,
  errorMessage,
}) => {
  const isDenied = recognitionState === 'permission_denied';
  const isUnsupported = recognitionState === 'unsupported';

  return (
    <div className="mic-controller-container">
      {/* Outer Glow Halo */}
      <div className={`mic-button-halo ${isListening ? 'halo-active' : ''}`}>
        <button
          className={`mic-button ${isListening ? 'mic-button-recording' : ''} ${
            isDenied ? 'mic-button-error' : ''
          }`}
          onClick={onToggleMic}
          disabled={isUnsupported}
          title={
            isListening
              ? 'Click to stop listening'
              : 'Click to start speaking'
          }
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? (
            <Mic className="mic-icon animate-pulse" size={32} />
          ) : (
            <MicOff className="mic-icon" size={32} />
          )}
        </button>
      </div>

      {/* Visual Audio Wave Bars when listening */}
      {isListening && (
        <div className="audio-wave-bars">
          <span className="wave-bar bar-1"></span>
          <span className="wave-bar bar-2"></span>
          <span className="wave-bar bar-3"></span>
          <span className="wave-bar bar-4"></span>
          <span className="wave-bar bar-5"></span>
          <span className="wave-bar bar-6"></span>
          <span className="wave-bar bar-7"></span>
        </div>
      )}

      {/* Status Instruction */}
      <div className="mic-status-text">
        {isListening ? (
          <p className="text-listening">
            Listening for <span className="highlight-text">{sourceLang.name}</span>... Speak naturally
          </p>
        ) : isDenied ? (
          <p className="text-error">
            <AlertCircle size={15} className="inline-icon" /> Microphone access blocked. Please enable permissions in your browser.
          </p>
        ) : isUnsupported ? (
          <p className="text-warning">
            Web Speech API not supported in this browser. Use Chrome, Edge, or Safari.
          </p>
        ) : (
          <p className="text-idle">
            Click microphone to start real-time translation
          </p>
        )}
      </div>

      {errorMessage && !isDenied && (
        <div className="error-banner">
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
