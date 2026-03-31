import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  Copy,
  Check,
  Trash2,
  Mic as MicIcon,
  Square,
} from "lucide-react";
import Button from "../shared/Button";
import styles from "./TranscriptEditor.module.css";
import { DEFAULT_PLACEHOLDER } from "./TranscriptEditor.logic";
import { pdf } from "@react-pdf/renderer";
import TranscriptDocument from "./TranscriptDocument";
import { getTranslation } from "../../constants/translations";
import { useAlert } from "../../context/AlertContext";
import { useTranscriber } from "../../hooks/useTranscriber";

interface TranscriptEditorProps {
  transcript: string;
  onChange: (text: string) => void;
  isLoading?: boolean;
  isRecording?: boolean;
  language?: string;
}

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  transcript,
  onChange,
  isLoading,
  isRecording,
  language,
}) => {
  const {
    isRecording: isLocalRecording,
    transcript: localTranscript,
    start: startLocal,
    stop: stopLocal,
  } = useTranscriber();

  const [selectionRange, setSelectionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const t = getTranslation(language || "gu-IN");
  const { showConfirm } = useAlert();
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    show: boolean;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSelection = (e: React.MouseEvent) => {
    if (isLocalRecording) return; // Don't allow changing selection while recording locally

    // Small timeout to allow the browser to finalize selection
    setTimeout(() => {
      if (!textareaRef.current) return;
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = textareaRef.current.value
        .substring(start, end)
        .trim();

      if (selectedText) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY + 10,
          show: true,
        });
      } else {
        setContextMenu(null);
      }
    }, 10);
  };

  const handleModifyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isLocalRecording) {
      stopLocal();
      const finalValue =
        transcript.substring(0, selectionRange!.start) +
        localTranscript +
        transcript.substring(selectionRange!.end);
      onChange(finalValue);
      setSelectionRange(null);
      setContextMenu(null);
      return;
    }

    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      setSelectionRange({ start, end });
      await startLocal(language);
    }
  };

  useEffect(() => {
    const handleClick = () => {
      if (!isLocalRecording) {
        setContextMenu(null);
      }
    };
    globalThis.addEventListener("click", handleClick);
    return () => globalThis.removeEventListener("click", handleClick);
  }, [isLocalRecording]);

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const doc = (
        <TranscriptDocument transcript={transcript} language={language} />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transcript-${new Date().toISOString()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF generation error:", error);
    }
  };

  return (
    <div className={styles.transcriptContainer}>
      <div className={styles.headerActions}>
        <div className={styles.transcriptHeader}>
          <Button
            variant="ghost"
            onClick={handleCopy}
            className={styles.actionButton}
            title={t.copy_transcript}
            icon={copied ? <Check size={16} /> : <Copy size={16} />}
          />
          <Button
            variant="ghost"
            onClick={handleDownload}
            className={styles.actionButton}
            title={t.download_pdf}
            icon={<Download size={16} />}
          />
          <Button
            variant="ghost"
            className={styles.actionButton}
            onClick={async () => {
              const ok = await showConfirm(t.clear_confirm);
              if (ok) {
                onChange("");
              }
            }}
            title={t.clear_transcript}
            icon={<Trash2 size={16} />}
          />
        </div>
      </div>
      <div className={styles.editorWrapper}>
        {isLoading ? (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Processing audio...</p>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className={styles.transcriptEditor}
            value={
              isLocalRecording && selectionRange
                ? transcript.substring(0, selectionRange.start) +
                  localTranscript +
                  transcript.substring(selectionRange.end)
                : transcript
            }
            onChange={(e) => onChange(e.target.value)}
            onMouseUp={handleSelection}
            placeholder={DEFAULT_PLACEHOLDER}
            readOnly={isRecording || isLocalRecording}
          />
        )}
        {contextMenu && (
          <button
            className={`${styles.floatingMic} ${isLocalRecording ? styles.recording : ""}`}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={handleModifyClick}
            title={isLocalRecording ? "Stop Recording" : "Modify via Voice"}
          >
            {isLocalRecording ? (
              <Square size={18} fill="currentColor" />
            ) : (
              <MicIcon size={18} />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default TranscriptEditor;
