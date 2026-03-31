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
  isMobile?: boolean;
}

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
  isMobile,
}) => {
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
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
        stop();
        finalizeTranscription();
      } else {
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

  const appendToArrayAtPath = (path: string[], value: string) => {
    const newData = JSON.parse(JSON.stringify(formData));
    let current = newData;

    path.forEach((key, i) => {
      if (i === path.length - 1) {
        if (!Array.isArray(current[key])) current[key] = [];
        current[key].push(value);
      } else {
        if (!current[key]) current[key] = {};
        current = current[key];
      }
    });

    return newData;
  };

  const finalizeTranscription = () => {
    if (!recordingField) return;

    const { path, isNew } = recordingField;
    const text = transcript.trim();

    if (text) {
      if (isNew) {
        onUpdate(appendToArrayAtPath(path, text));
      } else {
        handleChange(path, text);
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
          {isMobile ? (
            <>
              <button
                type="button"
                className={styles.languageInline}
                onClick={() => setShowLanguageMenu(true)}
              >
                {LANGUAGE_OPTIONS.find((opt) => opt.value === language)
                  ?.label || "English"}
              </button>
              {showLanguageMenu && (
                <>
                  <button
                    type="button"
                    className={styles.languageMenuBackdrop}
                    onClick={() => setShowLanguageMenu(false)}
                    aria-label="Close language menu"
                  />
                  <div className={styles.languageMenuSheet}>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.languageMenuItem} ${
                          option.value === language
                            ? styles.languageMenuItemActive
                            : ""
                        }`}
                        onClick={() => {
                          onLanguageChange(option.value);
                          setShowLanguageMenu(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
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
          )}

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

          {/* Dates Section */}
          <div className={styles.datesSection}>
            <div className={styles.dateRow}>
              <span>{t.filing_date}:</span>

              {renderInline(
                formData.header?.dates?.filing_date,
                ["header", "dates", "filing_date"],
                "DD/MM/YYYY"
              )}
            </div>
            <div className={styles.dateRow}>
              <span>{t.registration_date}:</span>

              {renderInline(
                formData.header?.dates?.registration_date,
                ["header", "dates", "registration_date"],
                "DD/MM/YYYY"
              )}
            </div>
            <div className={styles.dateRow}>
              <span>{t.decision_date}:</span>
              {renderInline(
                formData.header?.dates?.decision_date,
                ["header", "dates", "decision_date"],
                "DD/MM/YYYY"
              )}
            </div>
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

          {/* Parties Detail Section */}
          {(formData.parties?.complainant?.length > 0 ||
            formData.parties?.accused?.length > 0 ||
            formData.parties?.other_parties?.length > 0) && (
            <div className={styles.partiesDetailSection}>
              {formData.parties?.complainant?.length > 0 && (
                <div className={styles.partyDetailRow}>
                  <span className={styles.partyDetailLabel}>
                    {t.complainant}:
                  </span>

                  <div style={{ flex: 1 }}>
                    {renderTextArea(
                      safeJoinArray(formData.parties?.complainant),
                      ["parties", "complainant"],
                      "Complainant name(s)"
                    )}
                  </div>
                </div>
              )}
              {formData.parties?.accused?.length > 0 && (
                <div className={styles.partyDetailRow}>
                  <span className={styles.partyDetailLabel}>{t.accused}:</span>

                  <div style={{ flex: 1 }}>
                    {renderTextArea(
                      safeJoinArray(formData.parties?.accused),
                      ["parties", "accused"],
                      "Accused name(s)"
                    )}
                  </div>
                </div>
              )}
              {formData.parties?.other_parties?.length > 0 && (
                <div className={styles.partyDetailRow}>
                  <span className={styles.partyDetailLabel}>
                    {t.other_parties}:
                  </span>
                  <div style={{ flex: 1 }}>
                    {renderTextArea(
                      safeJoinArray(formData.parties?.other_parties),
                      ["parties", "other_parties"],
                      "Other party name(s)"
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={styles.advocatesSection}>
            <div className={styles.advocateRow}>
              <span>{t.advocate_petitioner}:</span>
              <div style={{ flex: 1 }}>
                {renderTextArea(
                  safeJoinArray(formData.advocates?.petitioner_side),
                  ["advocates", "petitioner_side"],
                  t.judge
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
            {/* NEW: government_side advocates */}
            {formData.advocates?.government_side?.length > 0 && (
              <div className={styles.advocateRow}>
                <span>{t.government_advocate}:</span>

                <div style={{ flex: 1 }}>
                  {renderTextArea(
                    safeJoinArray(formData.advocates?.government_side),
                    ["advocates", "government_side"],
                    "Government advocate name(s)"
                  )}
                </div>
              </div>
            )}
            {/* NEW: other advocates */}
            {formData.advocates?.other?.length > 0 && (
              <div className={styles.advocateRow}>
                <span>{t.other_advocate}:</span>
                <div style={{ flex: 1 }}>
                  {renderTextArea(
                    safeJoinArray(formData.advocates?.other),
                    ["advocates", "other"],
                    "Other advocate name(s)"
                  )}
                </div>
              </div>
            )}
          </div>

          {/* NEW: Appearance Mode */}
          {formData.appearance_mode && (
            <div className={styles.appearanceRow}>
              <span>{t.appearance_mode}:</span>
              {renderInline(
                formData.appearance_mode,
                ["appearance_mode"],
                "e.g. In Person / Video Conference"
              )}
            </div>
          )}

          <hr className={styles.divider} />

          {/* NEW: Case Details */}
          <div className={styles.caseDetailsSection}>
            <h5 className={styles.sectionHeading}>{t.case_details}:</h5>

            {formData.case_details?.acts_sections && (
              <div className={styles.caseDetailRow}>
                <span>{t.acts_sections}:</span>
                <div style={{ flex: 1 }}>
                  {renderTextArea(
                    formData.case_details?.acts_sections,
                    ["case_details", "acts_sections"],
                    "Relevant acts and sections"
                  )}
                </div>
              </div>
            )}
            {formData.case_details?.case_category && (
              <div className={styles.caseDetailRow}>
                <span>{t.case_category}:</span>
                <div style={{ flex: 1 }}>
                  {renderInline(
                    formData.case_details?.case_category,
                    ["case_details", "case_category"],
                    "Case category"
                  )}
                </div>
              </div>
            )}
            {formData.case_details?.police_station && (
              <div className={styles.caseDetailRow}>
                <span>{t.police_station}:</span>

                <div style={{ flex: 1 }}>
                  {renderInline(
                    formData.case_details?.police_station,
                    ["case_details", "police_station"],
                    "Police station name"
                  )}
                </div>
              </div>
            )}
            {formData.case_details?.property_details && (
              <div className={styles.caseDetailRow}>
                <span>{t.property_details}:</span>

                <div style={{ flex: 1 }}>
                  {renderTextArea(
                    formData.case_details?.property_details,
                    ["case_details", "property_details"],
                    "Property or seized item details"
                  )}
                </div>
              </div>
            )}
            {formData.case_details?.other_details && (
              <div className={styles.caseDetailRow}>
                <span>{t.other_details}:</span>
                <div style={{ flex: 1 }}>
                  {renderTextArea(
                    formData.case_details?.other_details,
                    ["case_details", "other_details"],
                    "Other case details"
                  )}
                </div>
              </div>
            )}
          </div>

          {/* NEW: Procedural History */}
          {formData.procedural_history && (
            <div className={styles.narrativeSection}>
              <h5 className={styles.sectionHeading}>{t.procedural_history}</h5>
              {renderTextArea(
                formData.procedural_history,
                ["procedural_history"],
                "Procedural history of the case"
              )}
            </div>
          )}

          {/* NEW: Issues Framed */}
          {formData.issues_framed && (
            <div className={styles.narrativeSection}>
              <h5>{t.issues_framed}:</h5>

              {renderTextArea(
                formData.issues_framed,
                ["issues_framed"],
                "Issues framed by the court"
              )}
            </div>
          )}

          {/* NEW: Evidence */}
          {(formData.evidence?.oral_evidence ||
            formData.evidence?.documentary_evidence) && (
            <div className={styles.narrativeSection}>
              <h5>{t.evidence}:</h5>

              {formData.evidence?.oral_evidence && (
                <div className={styles.caseDetailRow}>
                  <span>{t.oral_evidence}:</span>
                  <div style={{ flex: 1 }}>
                    {renderTextArea(
                      formData.evidence?.oral_evidence,
                      ["evidence", "oral_evidence"],
                      "Oral evidence details"
                    )}
                  </div>
                </div>
              )}
              {formData.evidence?.documentary_evidence && (
                <div className={styles.caseDetailRow}>
                  <span>{t.documentary_evidence}:</span>
                  <div style={{ flex: 1 }}>
                    {renderTextArea(
                      formData.evidence?.documentary_evidence,
                      ["evidence", "documentary_evidence"],
                      "Documentary evidence details"
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NEW: Arguments */}
          {formData.arguments && (
            <div className={styles.narrativeSection}>
              <h5 className={styles.sectionHeading}>{t.arguments}</h5>
              {renderTextArea(
                formData.arguments,
                ["arguments"],
                "Arguments presented by both sides"
              )}
            </div>
          )}

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

          <div className={styles.orderBodyTitle}>---- {t.final_order} ----</div>

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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyItems: "center",
                    }}
                  >
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

            {/* NEW: Final Outcome */}
            {formData.operative_order?.final_outcome && (
              <div className={styles.narrativeSection}>
                <h5>{t.final_outcome}:</h5>
                {renderTextArea(
                  formData.operative_order?.final_outcome,
                  ["operative_order", "final_outcome"],
                  "Final outcome of the case"
                )}
              </div>
            )}
          </div>

          {/* NEW: Final Order (standalone field) */}
          {formData.final_order && (
            <div className={styles.narrativeSection}>
              <h5 className={styles.sectionHeading}>{t.final_order}:</h5>
              {renderTextArea(
                formData.final_order,
                ["final_order"],
                "Final order text"
              )}
            </div>
          )}

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
