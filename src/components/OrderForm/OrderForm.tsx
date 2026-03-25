import React, { useRef, useEffect, useState } from "react";
import styles from "./OrderForm.module.css";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { initialOrderData } from "./OrderForm.logic";

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

const OrderForm: React.FC<Props> = ({ data, onUpdate, isProcessing }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const formData = data || initialOrderData;
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleGeneratePDF = async () => {
    if (!containerRef.current) return;

    setIsGeneratingPdf(true);

    let clone: HTMLDivElement | null = null;

    try {
      const element = containerRef.current;

      // ✅ Expand original textareas
      element.querySelectorAll("textarea").forEach((t) => {
        const ta = t;
        ta.style.height = "auto";
        ta.style.height = `${ta.scrollHeight}px`;
      });

      // ✅ Clone
      clone = element.cloneNode(true) as HTMLDivElement;
      clone.classList.add(styles.pdfMode);

      // ✅ Remove all buttons from PDF view
      clone
        .querySelectorAll("button")
        .forEach((btn) => ((btn as HTMLElement).style.display = "none"));

      Object.assign(clone.style, {
        position: "absolute",
        top: "0",
        left: "-100000px",
        width: "794px",
        background: "#ffffff",
        padding: "20px",
        margin: "0",
        boxShadow: "none",
      });

      // 🔥 IMPORTANT: Replace textarea → div
      clone.querySelectorAll("textarea").forEach((ta) => {
        const div = document.createElement("div");

        div.innerText = ta.value || "";

        Object.assign(div.style, {
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          fontFamily: "inherit",
          fontSize: "inherit",
          lineHeight: "inherit",
          padding: "6px",
          minHeight: "20px",
        });

        ta.parentNode?.replaceChild(div, ta);
      });

      // 🔥 Force wrapping everywhere
      clone.querySelectorAll("*").forEach((el) => {
        const e = el as HTMLElement;
        e.style.whiteSpace = "normal";
        e.style.wordBreak = "break-word";
        e.style.overflowWrap = "break-word";
        e.style.maxWidth = "100%";
      });

      document.body.appendChild(clone);

      // wait for layout
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );

      // ✅ Canvas
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = 210;
      const pageHeight = 297;

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // ✅ Multi-page logic (fixed)
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`order-details-${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      globalThis.print();
    } finally {
      if (clone && document.body.contains(clone)) {
        clone.remove();
      }
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
        <h3>Court Order</h3>
        <div className={styles.statusGroup}>
          {isProcessing && (
            <span className={styles.processingBadge}>Filling Order...</span>
          )}
          <button
            className={styles.pdfButton}
            onClick={() => onUpdate(initialOrderData)}
            type="button"
            title="Reset the form to its initial state"
          >
            Reset Form
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
            {isGeneratingPdf ? "Generating..." : "Print / Save PDF"}
          </button>
        </div>
      </div>

      <div className={styles.formContainer}>
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
                "કોર્ટનું નામ (Court Name)"
              )}
            </h2>
            <h3>
              {renderInline(
                formData.header?.location,
                ["header", "location"],
                "સ્થળ (Location)"
              )}
            </h3>
          </div>

          <div className={styles.caseTypeSection}>
            <h4>
              {renderInline(
                formData.header?.case_type,
                ["header", "case_type"],
                "કેસનો પ્રકાર"
              )}
              &nbsp;નં.&nbsp;
              {renderInline(
                formData.header?.case_number,
                ["header", "case_number"],
                "નંબર"
              )}
            </h4>
          </div>

          <div className={styles.partiesSection}>
            <div className={styles.partyRow}>
              <div className={styles.partyDetails}>
                {renderTextArea(
                  formData.case_title?.petitioner,
                  ["case_title", "petitioner"],
                  "વાદીનું સંપૂર્ણ નામ અને સરનામું (Petitioner Details)"
                )}
              </div>
              <div className={styles.partyRole}>વાદી (Petitioner)</div>
            </div>

            <div className={styles.vsText}>વિરુદ્ધ (Versus)</div>

            <div className={styles.partyRow}>
              <div className={styles.partyDetails}>
                {renderTextArea(
                  formData.case_title?.respondent,
                  ["case_title", "respondent"],
                  "પ્રતિવાદીનું સંપૂર્ણ નામ અને સરનામું (Respondent Details)"
                )}
              </div>
              <div className={styles.partyRole}>પ્રતિવાદી (Respondent)</div>
            </div>
          </div>

          <hr className={styles.divider} />

          <div className={styles.advocatesSection}>
            <div className={styles.advocateRow}>
              <span>વાદી તરફે વિધ્વાન વકીલશ્રી:</span>
              <div style={{ flex: 1 }}>
                {renderTextArea(
                  safeJoinArray(formData.advocates?.petitioner_side),
                  ["advocates", "petitioner_side"],
                  "વકીલશ્રીનું નામ"
                )}
              </div>
            </div>
            <div className={styles.advocateRow}>
              <span>પ્રતિવાદી તરફે વિધ્વાન વકીલશ્રી:</span>
              <div style={{ flex: 1 }}>
                {renderTextArea(
                  safeJoinArray(formData.advocates?.respondent_side),
                  ["advocates", "respondent_side"],
                  "વકીલશ્રીનું નામ"
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
              Reasoning / Analysis (મુદ્દાઓ):
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
                  <button
                    className={styles.removeBtn}
                    onClick={() => {
                      const next = [...formData.reasoning_points];
                      next.splice(idx, 1);
                      onUpdate({ ...formData, reasoning_points: next });
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "red",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                    }}
                    title="Remove Point"
                  >
                    ×
                  </button>
                </div>
              ))}
            <button
              className={styles.addBtn}
              onClick={() =>
                onUpdate({
                  ...formData,
                  reasoning_points: [...(formData.reasoning_points || []), ""],
                })
              }
            >
              + Add Reasoning Point
            </button>
          </div>

          <div className={styles.orderBodyTitle}>---- હુકમ (ORDER) ----</div>

          <div className={styles.orderContent}>
            {renderTextArea(
              formData.operative_order?.full_text,
              ["operative_order", "full_text"],
              "હુકમની વિગત (Order Details)"
            )}

            <div className={styles.directionsList}>
              <h5 style={{ marginTop: "15px" }}>
                Specific Directions / Conditions:
              </h5>
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
                ))}
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
                + Add Direction
              </button>
            </div>
          </div>

          <div className={styles.rawTextSection}>
            <h5>અન્ય વિગતો / રજૂઆતો (Other Details / Arguments):</h5>
            {renderTextArea(
              formData.raw_text,
              ["raw_text"],
              "સંપૂર્ણ લખાણ (Additional Text...)"
            )}
          </div>

          <div className={styles.signatureSection}>
            <div className={styles.sigLeft}>
              <div className={styles.sigRow}>
                <span>તારીખ:</span>{" "}
                {renderInline(
                  formData.signature?.date,
                  ["signature", "date"],
                  "DD/MM/YYYY"
                )}
              </div>
              <div className={styles.sigRow}>
                <span>સ્થળ:</span>{" "}
                {renderInline(
                  formData.signature?.place,
                  ["signature", "place"],
                  "સ્થળ"
                )}
              </div>
            </div>
            <div className={styles.sigRight}>
              <div className={styles.sigPlaceholder}>(સહી)</div>
              <div className={styles.judgeName}>
                {renderInline(
                  formData.signature?.judge_name,
                  ["signature", "judge_name"],
                  "જજ સાહેબનું નામ"
                )}
              </div>
              <div className={styles.judgeDesig}>
                {renderInline(
                  formData.signature?.designation,
                  ["signature", "designation"],
                  "હોદ્દો"
                )}
              </div>
              <div className={styles.sigCourtName}>
                {renderInline(
                  formData.signature?.court,
                  ["signature", "court"],
                  "કોર્ટ"
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
