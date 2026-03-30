import React, { useEffect, useRef, useState } from "react";
import { Download, Copy, Check, Trash2 } from "lucide-react";
import Button from "../shared/Button";
import styles from "./TranscriptEditor.module.css";
import { DEFAULT_PLACEHOLDER } from "./TranscriptEditor.logic";
import { pdf } from "@react-pdf/renderer";
import TranscriptDocument from "./TranscriptDocument";
import { getTranslation } from "../../constants/translations";
import { useAlert } from "../../context/AlertContext";

interface TranscriptEditorProps {
  transcript: string;
  onChange: (text: string) => void;
  isLoading?: boolean;
  onModify?: (start: number, end: number) => void;
  isRecording?: boolean;
  language?: string;
}

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  transcript,
  onChange,
  isLoading,
  onModify,
  isRecording,
  language,
}) => {
  const t = getTranslation(language || "gu-IN");
  const { showAlert, showConfirm } = useAlert();
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    show: boolean;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && textareaRef.current) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        show: true,
      });
    } else {
      setContextMenu(null);
    }
  };

  const handleModifyClick = async () => {
    if (isRecording) {
      await showAlert("Please complete the recording first");
      setContextMenu(null);
      return;
    }
    if (textareaRef.current && onModify) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      onModify(start, end);
    }
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const doc = <TranscriptDocument transcript={transcript} language={language} />;
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
            value={transcript}
            onChange={(e) => onChange(e.target.value)}
            onContextMenu={handleContextMenu}
            placeholder={DEFAULT_PLACEHOLDER}
            readOnly={isRecording}
          />
        )}
        {contextMenu && (
          <div
            className={styles.contextMenu}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.contextMenuItem}
              onClick={handleModifyClick}
            >
              Modify Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptEditor;
