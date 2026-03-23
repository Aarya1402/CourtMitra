import React, { useState } from "react";
import { FileText, Download, Copy, Check } from "lucide-react";
import Button from "../shared/Button";
import styles from "./TranscriptEditor.module.css";
import { DEFAULT_PLACEHOLDER } from "./TranscriptEditor.logic";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Link } from "react-router-dom";

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
          <textarea
            className={styles.transcriptEditor}
            value={transcript}
            onChange={(e) => onChange(e.target.value)}
            placeholder={DEFAULT_PLACEHOLDER}
          />
        )}
      </div>
    </div>
  );
};

export default TranscriptEditor;
