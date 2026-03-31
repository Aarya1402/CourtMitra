import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { OrderData } from "./OrderForm";
import { getTranslation } from "../../constants/translations";

Font.register({
  family: "Gujarati",
  src: "/fonts/NotoSerifGujarati-Regular.ttf",
});
Font.register({
  family: "Hindi",
  src: "/fonts/NotoSerifDevanagari-Regular.ttf",
});
Font.register({
  family: "Tamil",
  src: "/fonts/NotoSerifTamil_SemiCondensed-Regular.ttf",
});
Font.register({ family: "Telugu", src: "/fonts/NotoSerifTelugu-Regular.ttf" });
Font.register({
  family: "Kannada",
  src: "/fonts/NotoSerifKannada-Regular.ttf",
});
Font.register({
  family: "Bengali",
  src: "/fonts/NotoSerifBengali-Regular.ttf",
});
Font.register({
  family: "Punjabi",
  src: "/fonts/NotoSerifGurmukhi-Regular.ttf",
});
Font.register({ family: "Odia", src: "/fonts/NotoSerifOriya-Regular.ttf" });

const getFontFamily = (language: string) => {
  switch (language) {
    case "gu-IN":
      return "Gujarati";
    case "hi-IN":
    case "mr-IN":
      return "Hindi";
    case "ta-IN":
      return "Tamil";
    case "te-IN":
      return "Telugu";
    case "kn-IN":
      return "Kannada";
    case "bn-IN":
      return "Bengali";
    case "pa-IN":
      return "Punjabi";
    case "od-IN":
      return "Odia";
    default:
      return "Times-Roman";
  }
};

const renderParagraphs = (styles: Record<string, any>, text: string = "") => {
  if (!text) return null;
  const sentences = text
    .replace(/([.?!।])/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];
  let temp: string[] = [];
  sentences.forEach((s, i) => {
    temp.push(s);
    if ((i + 1) % 3 === 0) {
      paragraphs.push(temp.join(" "));
      temp = [];
    }
  });
  if (temp.length) paragraphs.push(temp.join(" "));

  return paragraphs.map((p, i) => (
    <Text key={`p-${i}`} style={styles.bodyText}>
      {p}
    </Text>
  ));
};

const safeArray = (arr: any): string[] => (Array.isArray(arr) ? arr : []);

const safeJoin = (arr: any): string => {
  if (!arr || !Array.isArray(arr)) return "";
  return arr
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "object" && item !== null)
        return (
          item.name || item.advocate_name || item.text || JSON.stringify(item)
        );
      return String(item);
    })
    .join(", ");
};

interface OrderDocumentProps {
  data: OrderData;
  language: string;
}

const OrderDocument: React.FC<OrderDocumentProps> = ({ data, language }) => {
  const t = getTranslation(language);
  const fontFamily = getFontFamily(language);

  const styles = StyleSheet.create({
    page: {
      paddingTop: 50,
      paddingBottom: 70,
      paddingHorizontal: 60,
      fontSize: 12,
      fontFamily,
      lineHeight: 1.6,
      backgroundColor: "#FFFFFF",
    },
    pageNumHeader: {
      position: "absolute",
      top: 30,
      left: 60,
      fontSize: 10,
      color: "#666",
    },
    /* ── HEADER ── */
    header: { marginBottom: 20, textAlign: "center" },
    courtName: { fontSize: 16, fontWeight: "bold", textTransform: "uppercase" },
    location: { fontSize: 13, marginBottom: 6 },
    caseInfoLine: {
      fontSize: 13,
      fontWeight: "bold",
      marginVertical: 10,
      textDecoration: "underline",
    },
    /* ── DATES ── */
    datesRow: {
      flexDirection: "row",
      gap: 24,
      marginBottom: 12,
      flexWrap: "wrap",
    },
    dateItem: { flexDirection: "row", gap: 4, fontSize: 11 },
    dateLabel: { fontWeight: "bold" },
    /* ── DIVIDER ── */
    divider: {
      borderTopWidth: 1.5,
      borderTopColor: "#000",
      marginVertical: 16,
    },
    /* ── PARTIES ── */
    partiesSection: { marginBottom: 16 },
    partyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    partyText: { flex: 1, maxWidth: "78%" },
    partyRole: { width: "20%", textAlign: "right", fontWeight: "bold" },
    vsText: {
      textAlign: "center",
      fontWeight: "bold",
      marginVertical: 8,
    },
    /* ── LABEL ROWS (advocates / detail rows) ── */
    labelRow: { flexDirection: "row", marginBottom: 6, gap: 8 },
    labelBold: { fontWeight: "bold", minWidth: 140 },
    labelValue: { flex: 1, textAlign: "justify" },
    labelValueSmall: { flex: 1, fontSize: 11 },
    /* ── APPEARANCE ── */
    appearanceRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
      fontSize: 11,
    },
    /* ── SECTIONS ── */
    section: { marginBottom: 16 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "bold",
      marginBottom: 8,
      marginTop: 10,
      textDecoration: "underline",
    },
    bodyText: { textAlign: "justify", marginBottom: 10, textIndent: 30 },
    listItem: { flexDirection: "row", marginBottom: 6, paddingLeft: 20 },
    bullet: { width: 25, fontWeight: "bold" },
    listContent: { flex: 1, textAlign: "justify" },
    /* ── ORDER BANNER ── */
    orderTitleBanner: {
      textAlign: "center",
      fontSize: 14,
      fontWeight: "bold",
      marginVertical: 26,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      paddingVertical: 8,
    },
    /* ── SIGNATURE ── */
    signatureSection: {
      marginTop: 40,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    signatureLeft: { fontSize: 11 },
    signatureRight: { textAlign: "right" },
    judgeName: { marginTop: 20, fontWeight: "bold" },
    designation: { fontSize: 11 },
    smallCourtName: { fontSize: 11 },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text
          style={styles.pageNumHeader}
          render={({ pageNumber }) => `Page No. ${pageNumber}`}
          fixed
        />

        {/* ── COURT HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.courtName}>{data.header?.court_name}</Text>
          <Text style={styles.location}>{data.header?.location}</Text>
          <Text style={styles.caseInfoLine}>
            {data.header?.case_type} NO. {data.header?.case_number}
          </Text>
        </View>

        {/* ── DATES ── */}
        {(data.header?.dates?.filing_date ||
          data.header?.dates?.registration_date ||
          data.header?.dates?.decision_date) && (
          <View style={styles.datesRow}>
            {data.header.dates.filing_date && (
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>{t.filing_date}</Text>
                <Text>{data.header.dates.filing_date}</Text>
              </View>
            )}
            {data.header.dates.registration_date && (
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>{t.registration_date}:</Text>
                <Text>{data.header.dates.registration_date}</Text>
              </View>
            )}
            {data.header.dates.decision_date && (
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>{t.decision_date}:</Text>
                <Text>{data.header.dates.decision_date}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── PETITIONER vs RESPONDENT ── */}
        <View style={styles.partiesSection}>
          <View style={styles.partyRow}>
            <Text style={styles.partyText}>{data.case_title?.petitioner}</Text>
            <Text style={styles.partyRole}>{t.petitioner}</Text>
          </View>
          <Text style={styles.vsText}>{t.versus}</Text>
          <View style={styles.partyRow}>
            <Text style={styles.partyText}>{data.case_title?.respondent}</Text>
            <Text style={styles.partyRole}>{t.respondent}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── PARTIES DETAIL (complainant / accused / other) ── */}
        {(safeArray(data.parties?.complainant).length > 0 ||
          safeArray(data.parties?.accused).length > 0 ||
          safeArray(data.parties?.other_parties).length > 0) && (
          <View style={styles.section}>
            {safeArray(data.parties?.complainant).length > 0 && (
              <View style={styles.labelRow}>
                <Text style={styles.labelBold}>{t.complainant}:</Text>
                <Text style={styles.labelValue}>
                  {safeJoin(data.parties.complainant)}
                </Text>
              </View>
            )}
            {safeArray(data.parties?.accused).length > 0 && (
              <View style={styles.labelRow}>
                <Text style={styles.labelBold}>{t.accused}:</Text>
                <Text style={styles.labelValue}>
                  {safeJoin(data.parties.accused)}
                </Text>
              </View>
            )}
            {safeArray(data.parties?.other_parties).length > 0 && (
              <View style={styles.labelRow}>
                <Text style={styles.labelBold}>{t.other_parties}:</Text>
                <Text style={styles.labelValue}>
                  {safeJoin(data.parties.other_parties)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── ADVOCATES ── */}
        <View style={styles.section}>
          {safeArray(data.advocates?.petitioner_side).length > 0 && (
            <View style={styles.labelRow}>
              <Text style={styles.labelBold}>{t.advocate_petitioner}:</Text>
              <Text style={styles.labelValue}>
                {safeJoin(data.advocates.petitioner_side)}
              </Text>
            </View>
          )}
          {safeArray(data.advocates?.respondent_side).length > 0 && (
            <View style={styles.labelRow}>
              <Text style={styles.labelBold}>{t.advocate_respondent}:</Text>
              <Text style={styles.labelValue}>
                {safeJoin(data.advocates.respondent_side)}
              </Text>
            </View>
          )}
          {safeArray(data.advocates?.government_side).length > 0 && (
            <View style={styles.labelRow}>
              <Text style={styles.labelBold}>{t.government_advocate}:</Text>
              <Text style={styles.labelValue}>
                {safeJoin(data.advocates.government_side)}
              </Text>
            </View>
          )}
          {safeArray(data.advocates?.other).length > 0 && (
            <View style={styles.labelRow}>
              <Text style={styles.labelBold}>{t.other_advocate}:</Text>
              <Text style={styles.labelValue}>
                {safeJoin(data.advocates.other)}
              </Text>
            </View>
          )}
        </View>

        {/* ── APPEARANCE MODE ── */}
        {data.appearance_mode && (
          <View style={styles.appearanceRow}>
            <Text style={styles.dateLabel}>{t.appearance_mode}:</Text>
            <Text>{data.appearance_mode}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* ── CASE DETAILS ── */}
        {(data.case_details?.acts_sections ||
          data.case_details?.case_category ||
          data.case_details?.police_station ||
          data.case_details?.property_details ||
          data.case_details?.other_details) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.case_details}</Text>
            {data.case_details?.acts_sections && (
              <View style={styles.labelRow}>
                <Text style={styles.labelBold}>{t.acts_sections}:</Text>
                <Text style={styles.labelValue}>
                  {data.case_details.acts_sections}
                </Text>
              </View>
            )}
            {data.case_details?.case_category && (
              <View style={styles.labelRow}>
                <Text style={styles.labelBold}>{t.case_category}:</Text>
                <Text style={styles.labelValue}>
                  {data.case_details.case_category}
                </Text>
              </View>
            )}
            {data.case_details?.police_station && (
              <View style={styles.labelRow}>
                <Text style={styles.labelBold}>{t.police_station}:</Text>
                <Text style={styles.labelValue}>
                  {data.case_details.police_station}
                </Text>
              </View>
            )}
            {data.case_details?.property_details && (
              <View style={styles.labelRow}>
                <Text style={styles.labelBold}>{t.property_details}:</Text>
                <Text style={styles.labelValue}>
                  {data.case_details.property_details}
                </Text>
              </View>
            )}
            {data.case_details?.other_details && (
              <View style={styles.labelRow}>
                <Text style={styles.labelBold}>{t.other_details}:</Text>
                <Text style={styles.labelValue}>
                  {data.case_details.other_details}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── PROCEDURAL HISTORY ── */}
        {data.procedural_history && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.procedural_history}</Text>
            {renderParagraphs(styles, data.procedural_history)}
          </View>
        )}

        {/* ── ISSUES FRAMED ── */}
        {data.issues_framed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.issues_framed}</Text>
            {renderParagraphs(styles, data.issues_framed)}
          </View>
        )}

        {/* ── EVIDENCE ── */}
        {(data.evidence?.oral_evidence ||
          data.evidence?.documentary_evidence) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.evidence}:</Text>
            {data.evidence?.oral_evidence && (
              <View style={styles.labelRow}>
                <Text style={styles.labelBold}>{t.oral_evidence}:</Text>
                <Text style={styles.labelValue}>
                  {data.evidence.oral_evidence}
                </Text>
              </View>
            )}
            {data.evidence?.documentary_evidence && (
              <View style={styles.labelRow}>
                <Text style={styles.labelBold}>{t.documentary_evidence}:</Text>
                <Text style={styles.labelValue}>
                  {data.evidence.documentary_evidence}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── ARGUMENTS ── */}
        {data.arguments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.arguments}</Text>
            {renderParagraphs(styles, data.arguments)}
          </View>
        )}

        {/* ── REASONING ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.reasoning}:</Text>
          {safeArray(data.reasoning_points)
            .filter((p) => p?.trim())
            .map((point, i) => (
              <View key={`reasoning-${i}`} style={styles.listItem}>
                <Text style={styles.bullet}>{i + 1}.</Text>
                <Text style={styles.listContent}>{point.trim()}</Text>
              </View>
            ))}
        </View>

        {/* ── ORDER BANNER ── */}
        <Text style={styles.orderTitleBanner}>{t.final_order_header}</Text>

        {/* ── OPERATIVE ORDER ── */}
        <View style={styles.section}>
          {renderParagraphs(styles, data.operative_order?.full_text)}

          {safeArray(data.operative_order?.directions)
            .filter((d) => d?.trim())
            .map((dir, i) => (
              <View key={`direction-${i}`} style={styles.listItem}>
                <Text style={styles.bullet}>({i + 1})</Text>
                <Text style={styles.listContent}>{dir.trim()}</Text>
              </View>
            ))}

          {/* Final Outcome */}
          {data.operative_order?.final_outcome && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionTitle}>{t.final_outcome}:</Text>
              {renderParagraphs(styles, data.operative_order.final_outcome)}
            </View>
          )}
        </View>

        {/* ── FINAL ORDER (standalone) ── */}
        {data.final_order && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.final_order}:</Text>
            {renderParagraphs(styles, data.final_order)}
          </View>
        )}

        {/* ── SIGNATURE ── */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureLeft}>
            {data.signature?.date && (
              <Text>
                {t.date}: {data.signature.date}
              </Text>
            )}
            {data.signature?.place && (
              <Text>
                {t.place}: {data.signature.place}
              </Text>
            )}
          </View>
          <View style={styles.signatureRight}>
            <Text>{t.signature_placeholder}</Text>
            {data.signature?.judge_name && (
              <Text style={styles.judgeName}>{data.signature.judge_name}</Text>
            )}
            {data.signature?.designation && (
              <Text style={styles.designation}>
                {data.signature.designation}
              </Text>
            )}
            {data.signature?.court && (
              <Text style={styles.smallCourtName}>{data.signature.court}</Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default OrderDocument;
