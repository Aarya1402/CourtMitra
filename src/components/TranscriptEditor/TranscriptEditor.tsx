import React, { useState, useRef, useEffect } from "react";
import { FileText, Download, Copy, Check, Edit2, X } from "lucide-react";
import Button from "../shared/Button";
import styles from "./TranscriptEditor.module.css";
import { DEFAULT_PLACEHOLDER } from "./TranscriptEditor.logic";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Link } from "react-router-dom";
import AudioRecorder from "../AudioRecorder/AudioRecorder";

interface TranscriptEditorProps {
  transcript: string;
  onChange: (text: string) => void;
  isLoading?: boolean;
}

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  transcript,
  onChange,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number, end: number, text: string } | null>(null);
  const [originalParts, setOriginalParts] = useState<{ before: string, after: string } | null>(null);
  const [isModifying, setIsModifying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const textarea = textareaRef.current;
    
    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
      setSelectionRange({
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
        text: transcript.slice(textarea.selectionStart, textarea.selectionEnd)
      });
      setContextMenu({ x: e.pageX, y: e.pageY });
    } else {
      setContextMenu(null);
    }
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleModifyClick = () => {
    if (selectionRange) {
      setOriginalParts({
        before: transcript.slice(0, selectionRange.start),
        after: transcript.slice(selectionRange.end)
      });
      setIsModifying(true);
    }
    setContextMenu(null);
  };

  const handleTranscriptionUpdate = (newText: string) => {
    if (originalParts) {
      const updatedTranscript = originalParts.before + newText + originalParts.after;
      onChange(updatedTranscript);
    }
  };

  const handleModifyDone = () => {
    setIsModifying(false);
    setSelectionRange(null);
    setOriginalParts(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      // Create a temporary element to render the text with correct fonts
      const element = document.createElement("div");
      element.style.padding = "40px";
      element.style.background = "#fff";
      element.style.color = "#000";
      // Apply fonts to correctly render Indic scripts
      element.style.fontFamily =
        "var(--font-main), 'Inter', 'Shruti', 'Noto Sans Gujarati', 'Mangal', 'Noto Sans Devanagari', sans-serif";
      element.style.fontSize = "16px";
      element.style.lineHeight = "1.6";
      element.style.position = "absolute";
      element.style.left = "-9999px";
      element.style.top = "0";
      element.style.width = "800px";
      element.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; font-family: sans-serif;">Transcription</h2>
        <div style="white-space: pre-wrap;">${transcript}</div>
      `;
      document.body.appendChild(element);

      const canvas = await html2canvas(element, { scale: 2 });
      element.remove();

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`transcript-${new Date().toISOString()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF, falling back to text:", error);
      const blob = new Blob([transcript], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transcript-${new Date().toISOString()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={styles.transcriptContainer}>
      <div className={styles.transcriptHeader}>
        <Link
          className={styles.headerLeft}
          to={"/"}
          style={{ cursor: "pointer", textDecoration: "none", color: "black" }}
        >
          <FileText size={20} className={styles.textAccent} />
          <h3>CourtMitra</h3>
        </Link>
        <div className={styles.headerActions}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check size={16} /> : <Copy size={16} />}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            icon={<Download size={16} />}
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
          <>
            <textarea
              ref={textareaRef}
              className={`${styles.transcriptEditor} ${isModifying ? styles.modifying : ""}`}
              value={transcript}
              onChange={(e) => onChange(e.target.value)}
              placeholder={DEFAULT_PLACEHOLDER}
              onContextMenu={handleContextMenu}
            />

            {contextMenu && (
              <div 
                className={styles.contextMenu}
                style={{ top: contextMenu.y, left: contextMenu.x }}
              >
                <div 
                  className={styles.contextMenuItem}
                  onClick={handleModifyClick}
                >
                  <Edit2 size={14} />
                  <span>Modify with Voice</span>
                </div>
              </div>
            )}

            {isModifying && (
              <div className={styles.modifyOverlay}>
                <div className={styles.modifyRecorder}>
                  <div className={styles.modifyHeader}>
                    <h3>Modifying Selection</h3>
                    <p>Recording will replace: "{selectionRange?.text.slice(0, 30)}..."</p>
                    <button className={styles.closeBtn} onClick={() => setIsModifying(false)}>
                      <X size={20} />
                    </button>
                  </div>
                  <AudioRecorder 
                    onTranscriptionComplete={handleTranscriptionUpdate}
                    onClose={handleModifyDone}
                  />
                  <div className={styles.modifyActions}>
                    <Button onClick={handleModifyDone} className={styles.doneBtn}>
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TranscriptEditor;
