import React, { useRef, useEffect, useState } from "react";
import styles from "./OrderForm.module.css";
import { Download, Mic, Square } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import OrderDocument from "./OrderDocument";
import { initialOrderData } from "./OrderForm.logic";
import { getTranslation, LANGUAGE_OPTIONS } from "../../constants/translations";
import { useTranscriber } from "../../hooks/useTranscriber";

export type OrderData = {
  header: {
    court_name: string;
    case_number: string;
    case_type: string;
    location: string;
    dates: {
      filing_date: string;
      registration_date: string;
      decision_date: string;
      other_dates: string[];
    };
  };
  case_title: {
    petitioner: string;
    respondent: string;
    full_title_text: string;
  };
  parties: {
    petitioners: string[];
    respondents: string[];
    accused: string[];
    complainant: string[];
    other_parties: string[];
  };
  advocates: {
    petitioner_side: string[];
    respondent_side: string[];
    government_side: string[];
    other: string[];
  };
  appearance_mode: string;
  case_details: {
    acts_sections: string;
    case_category: string;
    police_station: string;
    property_details: string;
    other_details: string;
  };
  procedural_history: string;
  issues_framed: string;
  evidence: {
    oral_evidence: string;
    documentary_evidence: string;
  };
  arguments: string;
  reasoning_points: string[];
  operative_order: {
    full_text: string;
    directions: string[];
    final_outcome: string;
  };
  final_order: string;
  signature: {
    judge_name: string;
    designation: string;
    court: string;
    date: string;
    place: string;
  };
  raw_text: string;
};

interface Props {
  data: OrderData | null;
  onUpdate: (data: OrderData) => void;
  isProcessing?: boolean;
  language?: string;
  onLanguageChange: (lang: string) => void;
}

// Custom text area that auto-resizes its height
const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className: string;
}> = ({ value, onChange, placeholder, className }) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
    />
  );
};

const OrderForm: React.FC<Props> = ({
  data,
  onUpdate,
  isProcessing,
  language,
  onLanguageChange,
}) => {
  const t = getTranslation(language || "gu-IN");
  const containerRef = useRef<HTMLDivElement>(null);
  const formData = data || initialOrderData;
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [recordingField, setRecordingField] = useState<{
    path: string[];
    isNew: boolean;
  } | null>(null);

  const { isRecording, transcript, start, stop } = useTranscriber();

  const handleToggleVoice = async (path: string[], isNew: boolean) => {
    if (isRecording) {
      if (
        recordingField?.path.join(",") === path.join(",") &&
        recordingField?.isNew === isNew
      ) {
        // Stopping same field
        stop();
        finalizeTranscription();
      } else {
        // Stopping old, starting new
        stop();
        finalizeTranscription();
        setRecordingField({ path, isNew });
        await start(language || "gu-IN");
      }
    } else {
      setRecordingField({ path, isNew });
      await start(language || "gu-IN");
    }
  };

  const finalizeTranscription = () => {
    if (!recordingField) return;
    const { path, isNew } = recordingField;

    if (transcript.trim()) {
      if (isNew) {
        // Append to the array
        const newData = JSON.parse(JSON.stringify(formData));
        let current = newData;
        for (let i = 0; i < path.length; i++) {
          const key = path[i];
          if (i === path.length - 1) {
            if (!Array.isArray(current[key])) current[key] = [];
            current[key].push(transcript);
          } else {
            if (!current[key]) current[key] = {};
            current = current[key];
          }
        }
        onUpdate(newData);
      } else {
        // Replace existing
        handleChange(path, transcript);
      }
    }
    setRecordingField(null);
  };

  useEffect(() => {
    if (!isRecording && recordingField) {
      finalizeTranscription();
    }
  }, [isRecording]);

  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      console.log(formData);
      const doc = (
        <OrderDocument data={formData} language={language || "gu-IN"} />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `order-${formData.header.case_number || Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleChange = (path: string[], value: any) => {
    const newData = JSON.parse(JSON.stringify(formData));
    let current = newData;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!current[key]) current[key] = {};
      current = current[key];
    }
    const index = path.at(-1);
    if (index) {
      current[index] = value;
      onUpdate(newData);
    }
  };

  const safeJoinArray = (arr: any): string => {
    if (!arr || !Array.isArray(arr)) return "";
    return arr
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null) {
          return (
            item.name || item.advocate_name || item.text || JSON.stringify(item)
          );
        }
        return String(item);
      })
      .join(", ");
  };

  // Inputs do not word-wrap reliably (especially when exporting to PDF via canvas).
  // Use an auto-resizing textarea so long values wrap instead of getting clipped.
  const renderInline = (
    value: string | undefined,
    path: string[],
    placeholder: string
  ) => {
    return (
      <AutoResizeTextarea
        className={styles.docInlineTextarea}
        value={value || ""}
        onChange={(v) => handleChange(path, v)}
        placeholder={placeholder}
      />
    );
  };

  const renderTextArea = (
    value: string | undefined,
    path: string[],
    placeholder: string
  ) => {
    return (
      <AutoResizeTextarea
        className={styles.docTextarea}
        value={value || ""}
        onChange={(v) => handleChange(path, v)}
        placeholder={placeholder}
      />
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <h3>{t.order_title}</h3>
        <div className={styles.statusGroup}>
          <select
            className={styles.languageSelect}
            value={language || "gu-IN"}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {isProcessing && (
            <span className={styles.processingBadge}>{t.filling_order}</span>
          )}
          <button
            className={styles.pdfButton}
            onClick={() => onUpdate(initialOrderData)}
            type="button"
            title="Reset the form to its initial state"
          >
            {t.reset_form}
          </button>
          <button
            className={styles.pdfButton}
            onClick={handleGeneratePDF}
            disabled={isGeneratingPdf}
            aria-busy={isGeneratingPdf}
            type="button"
            title="Generates a multi-page PDF (handles overflow)"
          >
            <Download size={16} />
            {isGeneratingPdf ? t.generating : t.save_pdf}
          </button>
        </div>
      </div>

      <div className={styles.formContainer}>
        {isProcessing && (
          <div className={styles.loaderOverlay}>
            <div className={styles.spinner}></div>
            <span>{t.filling_order}</span>
          </div>
        )}
        {/* Printable Page Layout */}
        <div className={styles.documentPage} ref={containerRef}>
          <div className={styles.pageHeader}>
            <div className={styles.caseNoTop}>
              {formData.header?.case_number}
            </div>
          </div>

          <div className={styles.courtNameSection}>
            <h2>
              {renderInline(
                formData.header?.court_name,
                ["header", "court_name"],
                t.court_name
              )}
            </h2>
            <h3>
              {renderInline(
                formData.header?.location,
                ["header", "location"],
                t.location
              )}
            </h3>
          </div>

          <div className={styles.caseTypeSection}>
            <h4>
              {renderInline(
                formData.header?.case_type,
                ["header", "case_type"],
                t.case_type
              )}
              &nbsp;NO.&nbsp;
              {renderInline(
                formData.header?.case_number,
                ["header", "case_number"],
                t.case_number
              )}
            </h4>
          </div>

          <div className={styles.partiesSection}>
            <div className={styles.partyRow}>
              <div className={styles.partyDetails}>
                {renderTextArea(
                  formData.case_title?.petitioner,
                  ["case_title", "petitioner"],
                  `${t.petitioner} ${t.full_name_address}`
                )}
              </div>
              <div className={styles.partyRole}>{t.petitioner}</div>
            </div>

            <div className={styles.vsText}>{t.versus}</div>

            <div className={styles.partyRow}>
              <div className={styles.partyDetails}>
                {renderTextArea(
                  formData.case_title?.respondent,
                  ["case_title", "respondent"],
                  `${t.respondent} ${t.full_name_address}`
                )}
              </div>
              <div className={styles.partyRole}>{t.respondent}</div>
            </div>
          </div>

          <hr className={styles.divider} />

          <div className={styles.advocatesSection}>
            <div className={styles.advocateRow}>
              <span>{t.advocate_petitioner}:</span>
              <div style={{ flex: 1 }}>
                {renderTextArea(
                  safeJoinArray(formData.advocates?.petitioner_side),
                  ["advocates", "petitioner_side"],
                  t.judge // Placeholder misuse? Let's use a generic one
                )}
              </div>
            </div>
            <div className={styles.advocateRow}>
              <span>{t.advocate_respondent}:</span>
              <div style={{ flex: 1 }}>
                {renderTextArea(
                  safeJoinArray(formData.advocates?.respondent_side),
                  ["advocates", "respondent_side"],
                  t.judge
                )}
              </div>
            </div>
          </div>
          <div className={styles.reasoningSection}>
            <h5
              style={{
                textDecoration: "underline",
                fontSize: "14pt",
                marginBottom: "15px",
              }}
            >
              {t.reasoning}:
            </h5>
            {Array.isArray(formData.reasoning_points) &&
              formData.reasoning_points.map((p, idx) => (
                <div key={idx} className={styles.reasoningPoint}>
                  <span style={{ fontWeight: "bold", width: "30px" }}>
                    {idx + 1}.
                  </span>
                  <div style={{ flex: 1 }}>
                    {renderTextArea(
                      p,
                      ["reasoning_points", idx.toString()],
                      `Point ${idx + 1}`
                    )}
                  </div>
                  <div className={styles.pointActions}>
                    <button
                      className={styles.removeBtn}
                      onClick={() => {
                        const next = [...formData.reasoning_points];
                        next.splice(idx, 1);
                        onUpdate({ ...formData, reasoning_points: next });
                      }}
                      title="Remove Point"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            <div className={styles.addActions}>
              <button
                className={styles.addBtn}
                onClick={() =>
                  onUpdate({
                    ...formData,
                    reasoning_points: [
                      ...(formData.reasoning_points || []),
                      "",
                    ],
                  })
                }
              >
                {t.add_point}
              </button>
              <button
                className={`${styles.micBtn} ${
                  isRecording &&
                  recordingField?.path[0] === "reasoning_points" &&
                  recordingField?.isNew
                    ? styles.recording
                    : ""
                }`}
                onClick={() => handleToggleVoice(["reasoning_points"], true)}
                title="Add Point via Audio"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyItems: "center",
                  }}
                >
                  {isRecording &&
                  recordingField?.path[0] === "reasoning_points" &&
                  recordingField?.isNew ? (
                    <Square size={16} fill="currentColor" />
                  ) : (
                    <Mic size={16} />
                  )}
                </div>
              </button>
            </div>
            {isRecording &&
              recordingField?.path[0] === "reasoning_points" &&
              recordingField?.isNew && (
                <div className={styles.liveTranscriptNew}>
                  {transcript || "Listening..."}
                </div>
              )}
          </div>

          <div className={styles.orderBodyTitle}>
            ---- {t.final_order} (ORDER) ----
          </div>

          <div className={styles.orderContent}>
            {renderTextArea(
              formData.operative_order?.full_text,
              ["operative_order", "full_text"],
              t.operative_order
            )}

            <div className={styles.directionsList}>
              <h5 style={{ marginTop: "15px" }}>{t.directions}:</h5>
              {Array.isArray(formData.operative_order?.directions) &&
                formData.operative_order.directions.map((d, idx) => (
                  <div key={idx} className={styles.directionPoint}>
                    <span style={{ fontWeight: "bold" }}>({idx + 1})</span>
                    <div style={{ flex: 1 }}>
                      {renderTextArea(
                        d,
                        ["operative_order", "directions", idx.toString()],
                        `Direction ${idx + 1}`
                      )}
                    </div>
                    <div className={styles.pointActions}>
                      <button
                        className={styles.removeBtn}
                        onClick={() => {
                          const next = [...formData.operative_order.directions];
                          next.splice(idx, 1);
                          onUpdate({
                            ...formData,
                            operative_order: {
                              ...formData.operative_order,
                              directions: next,
                            },
                          });
                        }}
                        title="Remove Direction"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              <div className={styles.addActions}>
                <button
                  className={styles.addBtn}
                  onClick={() => {
                    const current = formData.operative_order.directions || [];
                    onUpdate({
                      ...formData,
                      operative_order: {
                        ...formData.operative_order,
                        directions: [...current, ""],
                      },
                    });
                  }}
                >
                  {t.add_direction}
                </button>
                <button
                  className={`${styles.micBtn} ${
                    isRecording &&
                    recordingField?.path[0] === "operative_order" &&
                    recordingField?.isNew
                      ? styles.recording
                      : ""
                  }`}
                  onClick={() =>
                    handleToggleVoice(["operative_order", "directions"], true)
                  }
                  title="Add Direction via Audio"
                >
                <div style={{ display: "flex", alignItems: "center", justifyItems: "center" }}>
                  {isRecording &&
                  recordingField?.path[0] === "operative_order" &&
                  recordingField?.isNew ? (
                    <Square size={16} fill="currentColor" />
                  ) : (
                    <Mic size={16} />
                  )}
                </div>
              </button>
              </div>
              {isRecording &&
                recordingField?.path[0] === "operative_order" &&
                recordingField?.isNew && (
                  <div className={styles.liveTranscriptNew}>
                    {transcript || "Listening..."}
                  </div>
                )}
            </div>
          </div>

          <div className={styles.signatureSection}>
            <div className={styles.sigLeft}>
              <div className={styles.sigRow}>
                <span>{t.date}:</span>{" "}
                {renderInline(
                  formData.signature?.date,
                  ["signature", "date"],
                  "DD/MM/YYYY"
                )}
              </div>
              <div className={styles.sigRow}>
                <span>{t.place}:</span>{" "}
                {renderInline(
                  formData.signature?.place,
                  ["signature", "place"],
                  t.place
                )}
              </div>
            </div>
            <div className={styles.sigRight}>
              <div className={styles.sigPlaceholder}>
                {t.signature_placeholder}
              </div>
              <div className={styles.judgeName}>
                {renderInline(
                  formData.signature?.judge_name,
                  ["signature", "judge_name"],
                  t.judge
                )}
              </div>
              <div className={styles.judgeDesig}>
                {renderInline(
                  formData.signature?.designation,
                  ["signature", "designation"],
                  t.designation
                )}
              </div>
              <div className={styles.sigCourtName}>
                {renderInline(
                  formData.signature?.court,
                  ["signature", "court"],
                  t.court_name
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;
