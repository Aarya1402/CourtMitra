import React, { useState, useEffect, useRef } from "react";
import styles from "./ChatInput.module.css";
import { Mic, Send } from "lucide-react";
import { useTranscriber } from "../../hooks/useTranscriber";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<Props> = ({ onSend, disabled }) => {
  const [input, setInput] = useState("");
  const { isRecording, transcript, start, stop, error } = useTranscriber();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayValue = isRecording ? transcript : input;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);
 
  // Track recording state transition to sync transcript back to input
  const wasRecordingRef = useRef(false);
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      if (transcript.trim()) {
        setInput(prev => {
          const trimmedPrev = prev.trim();
          return trimmedPrev ? `${trimmedPrev} ${transcript.trim()}` : transcript.trim();
        });
      }
    }
    wasRecordingRef.current = isRecording;
  }, [isRecording, transcript]);

  const handleSend = () => {
    if (!input.trim() || isRecording) return;
    onSend(input);
    setInput("");
  };

  const toggleMic = async () => {
    if (isRecording) {
      stop();
    } else {
      await start(); // Uses default 'unknown' for auto-detect
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.inputBar}>
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          placeholder={
            isRecording ? "Listening..." : "Type your message here..."
          }
          className={styles.chatInput}
          value={displayValue}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        <button
          className={`${styles.micBtn} ${isRecording ? styles.recording : ""}`}
          onClick={toggleMic}
          disabled={disabled}
          title={isRecording ? "Stop recording" : "Speak to type"}
          type="button"
        >
          <Mic size={20} />
        </button>

        {error && <span className={styles.errorText}>{error}</span>}
      </div>

      <button
        className={styles.sendBtn}
        onClick={handleSend}
        disabled={disabled || !input.trim() || isRecording}
      >
        <Send size={18} />
      </button>
    </div>
  );
};

export default ChatInput;
