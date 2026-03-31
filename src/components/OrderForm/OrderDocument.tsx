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

  // Mirrors .documentPage: padding: 30mm 25mm, font-size: 13pt, line-height: 1.7
  // 1mm ≈ 2.835pt → 30mm ≈ 85pt, 25mm ≈ 71pt
  const styles = StyleSheet.create({
    page: {
      paddingTop: 85,
      paddingBottom: 85,
      paddingHorizontal: 71,
      fontSize: 13,
      fontFamily,
      lineHeight: 1.7,
      backgroundColor: "#FFFFFF",
    },

    // .pageHeader → justify-content: flex-end, margin-bottom: 20px, font-size: 11pt, font-weight: bold
    pageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
      fontSize: 11,
      fontWeight: "bold",
    },

    // .courtNameSection → text-align: center, margin-bottom: 25px
    // h2 → font-size: 18pt, font-weight: bold
    courtName: {
      fontSize: 18,
      fontWeight: "bold",
      textAlign: "left",
      marginBottom: 0,
    },
    // h3 → font-size: 14pt, margin: 8px 0 0 0
    locationText: {
      fontSize: 14,
      textAlign: "left",
      marginTop: 8,
      marginBottom: 14,
    },

    // .caseTypeSection h4 → text-align: center, font-weight: bold, font-size: 14pt, margin-bottom: 35px
    caseTypeText: {
      textAlign: "left",
      fontWeight: "bold",
      fontSize: 14,
      marginBottom: 18,
    },

    // .datesSection → flex-wrap, gap: 8px 32px, margin-bottom: 20px, font-size: 12pt
    datesSection: {
      flexDirection: "column",
      flexWrap: "wrap",
      marginBottom: 12,
      fontSize: 12,
    },
    // .dateRow → display: flex, align-items: center, gap: 8px
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: 32,
      marginBottom: 8,
    },
    // .dateRow span → font-weight: bold, white-space: nowrap
    dateLabel: {
      fontWeight: "bold",
      marginRight: 8,
    },

    // .divider → border-top: 2px solid black, margin: 25px 0
    divider: {
      borderTopWidth: 2,
      borderTopColor: "#000000",
      marginTop: 5,
      marginBottom: 5,
    },

    // .partiesSection → flex-direction: column, gap: 20px, margin-bottom: 35px
    // .partyRow → justify-content: space-between, align-items: flex-start
    partyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    // .partyDetails → flex: 1, max-width: 78%
    partyDetails: {
      flex: 1,
      maxWidth: "78%",
    },
    // .partyRole → width: 20%, text-align: right, font-weight: bold
    partyRole: {
      width: "20%",
      textAlign: "right",
      fontWeight: "bold",
    },
    // .vsText → text-align: center, font-weight: bold, margin: 15px 0, font-style: italic
    vsText: {
      textAlign: "center",
      fontWeight: "bold",
      marginTop: 15,
      marginBottom: 10,
    },

    // .partiesDetailSection → margin-bottom: 20px
    // .partyDetailRow → display: flex, gap: 12px, margin-bottom: 8px, align-items: flex-start
    partyDetailRow: {
      flexDirection: "row",
      marginBottom: 8,
      alignItems: "flex-start",
    },
    // .partyDetailLabel → font-weight: bold, min-width: 110px
    partyDetailLabel: {
      fontWeight: "bold",
      minWidth: 110,
      marginRight: 12,
    },
    partyDetailValue: {
      flex: 1,
    },

    // .advocatesSection → margin-bottom: 35px
    // .advocateRow → margin-bottom: 8px, display: flex, gap: 12px
    // .advocateRow span → font-weight: bold, white-space: nowrap
    advocateRow: {
      flexDirection: "row",
      marginBottom: 8,
    },
    advocateLabel: {
      fontWeight: "bold",
      marginRight: 12,
    },
    advocateValue: {
      flex: 1,
    },

    // .appearanceRow → display: flex, align-items: center, gap: 12px, margin-bottom: 20px, font-size: 12pt
    // .appearanceRow span → font-weight: bold, white-space: nowrap
    appearanceRow: {
      flexDirection: "row",
      alignItems: "center",
      // marginBottom: 8,
      fontSize: 12,
    },
    appearanceLabel: {
      fontWeight: "bold",
      marginRight: 12,
    },

    // .caseDetailsSection → margin-bottom: 30px
    // .sectionHeading → text-decoration: underline, font-size: 14pt, margin: 0 0 12px 0, font-weight: bold
    sectionHeading: {
      textDecoration: "underline",
      fontSize: 14,
      marginBottom: 12,
      fontWeight: "bold",
    },
    // .caseDetailRow → display: flex, gap: 12px, margin-bottom: 8px, align-items: flex-start
    caseDetailRow: {
      flexDirection: "row",
      marginBottom: 8,
      alignItems: "flex-start",
    },
    caseDetailLabel: {
      marginRight: 12,
    },
    caseDetailValue: {
      flex: 1,
    },

    // .narrativeSection → margin-bottom: 30px
    // .narrativeSection h5 → font-size: 13pt, margin: 0 0 10px 0, font-weight: bold
    narrativeSection: {
      marginBottom: 16,
    },
    narrativeHeading: {
      fontSize: 13,
      fontWeight: "bold",
      marginBottom: 10,
    },
    bodyText: {
      textAlign: "justify",
      marginBottom: 10,
    },

    // .reasoningSection → margin-bottom: 35px
    // h5 inline style: textDecoration: underline, fontSize: 14pt, marginBottom: 10px, fontWeight: bold
    reasoningHeading: {
      textDecoration: "underline",
      fontSize: 14,
      fontWeight: "bold",
      marginBottom: 10,
    },
    // .reasoningPoint → display: flex, gap: 12px, margin-bottom: 12px, align-items: flex-start
    // number span → font-weight: bold, width: 30px
    reasoningPoint: {
      flexDirection: "row",
      marginBottom: 12,
      alignItems: "flex-start",
    },
    pointNumber: {
      fontWeight: "bold",
      width: 30,
      marginRight: 12,
    },
    pointContent: {
      flex: 1,
      textAlign: "justify",
    },

    // .orderBodyTitle → text-align: center, font-weight: bold, font-size: 16pt,
    //   margin: 50px 0 25px 0, letter-spacing: 0.1em
    orderBodyTitle: {
      textAlign: "center",
      fontWeight: "bold",
      fontSize: 16,
      marginTop: 50,
      marginBottom: 14,
      letterSpacing: 1.3,
    },

    // .orderContent → margin-bottom: 45px, text-align: justify
    orderContent: {
      marginBottom: 24,
    },

    // directions h5 → font-size: 13pt (from .narrativeSection h5 equivalent), marginTop: 15px
    directionsHeading: {
      fontWeight: "bold",
      fontSize: 13,
      marginTop: 15,
      marginBottom: 10,
    },
    // .directionPoint → display: flex, gap: 12px, margin-bottom: 12px, align-items: flex-start
    directionPoint: {
      flexDirection: "row",
      marginBottom: 12,
      alignItems: "flex-start",
    },
    directionNumber: {
      fontWeight: "bold",
      marginRight: 12,
    },
    directionContent: {
      flex: 1,
      textAlign: "justify",
    },

    // .signatureSection → display: flex, justify-content: space-between, margin-top: 60px
    signatureSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 60,
    },
    // .sigLeft → width: 42%
    sigLeft: {
      width: "42%",
    },
    // .sigRow → margin-bottom: 8px, display: flex, align-items: center, gap: 12px
    // .sigRow span → font-weight: bold
    sigRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    sigLabel: {
      fontWeight: "bold",
      marginRight: 12,
    },
    // .sigRight → width: 42%, text-align: center, flex-direction: column, gap: 6px
    sigRight: {
      width: "42%",
      alignItems: "center",
    },
    // .sigPlaceholder → margin-bottom: 45px
    sigPlaceholder: {
      marginBottom: 24,
    },
    // .judgeName → font-weight: bold
    judgeName: {
      marginBottom: 6,
      textAlign: "center",
    },
    // .judgeDesig / .sigCourtName → font-size: 11pt
    judgeDesig: {
      fontSize: 11,
      marginBottom: 6,
      textAlign: "center",
    },
    sigCourtName: {
      fontSize: 11,
      textAlign: "center",
    },
  });

  const renderText = (text: string | undefined) => {
    if (!text) return null;
    return <Text style={styles.bodyText}>{text}</Text>;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* .pageHeader — case number top-right, page number top-left */}
        <View style={styles.pageHeader} fixed>
          <Text render={({ pageNumber }) => `Page No. ${pageNumber}`} />
          <Text>{data.header?.case_number}</Text>
        </View>

        {/* .courtNameSection h2 */}
        <Text style={styles.courtName}>{data.header?.court_name}</Text>
        {/* .courtNameSection h3 */}
        <Text style={styles.locationText}>{data.header?.location}</Text>

        {/* .caseTypeSection h4 */}
        <Text style={styles.caseTypeText}>{data.header?.case_type}</Text>
        <Text style={{ textAlign: "center" }}>NO.</Text>
        <Text style={styles.caseTypeText}>{data.header?.case_number}</Text>
        {/* .datesSection */}
        <View style={styles.datesSection}>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>{t.filing_date}:</Text>
            <Text>{data.header.dates.filing_date || "N/A"}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>{t.registration_date}:</Text>
            <Text>{data.header.dates.registration_date || "N/A"}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>{t.decision_date}:</Text>
            <Text>{data.header.dates.decision_date || "N/A"}</Text>
          </View>
        </View>

        {/* .partiesSection */}
        <View style={styles.partyRow} wrap>
          <Text style={styles.partyDetails}>{data.case_title?.petitioner}</Text>
          <Text style={styles.partyRole}>{t.petitioner}</Text>
        </View>

        <Text style={styles.vsText}>{t.versus}</Text>

        <View style={styles.partyRow} wrap>
          <Text style={styles.partyDetails}>{data.case_title?.respondent}</Text>
          <Text style={styles.partyRole}>{t.respondent}</Text>
        </View>

        {/* hr.divider */}
        <View style={styles.divider} />

        {/* .partiesDetailSection */}
        {(safeArray(data.parties?.complainant).length > 0 ||
          safeArray(data.parties?.accused).length > 0 ||
          safeArray(data.parties?.other_parties).length > 0) && (
          <View style={{ marginBottom: 12 }}>
            {safeArray(data.parties?.complainant).length > 0 && (
              <View style={styles.partyDetailRow}>
                <Text style={styles.partyDetailLabel}>{t.complainant}:</Text>
                <Text style={styles.partyDetailValue}>
                  {safeJoin(data.parties.complainant)}
                </Text>
              </View>
            )}
            {safeArray(data.parties?.accused).length > 0 && (
              <View style={styles.partyDetailRow}>
                <Text style={styles.partyDetailLabel}>{t.accused}:</Text>
                <Text style={styles.partyDetailValue}>
                  {safeJoin(data.parties.accused)}
                </Text>
              </View>
            )}
            {safeArray(data.parties?.other_parties).length > 0 && (
              <View style={styles.partyDetailRow}>
                <Text style={styles.partyDetailLabel}>{t.other_parties}:</Text>
                <Text style={styles.partyDetailValue}>
                  {safeJoin(data.parties.other_parties)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* .advocatesSection */}
        <View>
          <View style={styles.advocateRow}>
            <Text style={styles.advocateLabel}>{t.advocate_petitioner}:</Text>
            <Text style={styles.advocateValue}>
              {safeJoin(data.advocates?.petitioner_side)}
            </Text>
          </View>
          <View style={styles.advocateRow}>
            <Text style={styles.advocateLabel}>{t.advocate_respondent}:</Text>
            <Text style={styles.advocateValue}>
              {safeJoin(data.advocates?.respondent_side)}
            </Text>
          </View>
          {safeArray(data.advocates?.government_side).length > 0 && (
            <View style={styles.advocateRow}>
              <Text style={styles.advocateLabel}>{t.government_advocate}:</Text>
              <Text style={styles.advocateValue}>
                {safeJoin(data.advocates.government_side)}
              </Text>
            </View>
          )}
          {safeArray(data.advocates?.other).length > 0 && (
            <View style={styles.advocateRow}>
              <Text style={styles.advocateLabel}>{t.other_advocate}:</Text>
              <Text style={styles.advocateValue}>
                {safeJoin(data.advocates.other)}
              </Text>
            </View>
          )}
        </View>

        {/* .appearanceRow */}
        {data.appearance_mode ? (
          <View style={styles.appearanceRow}>
            <Text style={styles.appearanceLabel}>{t.appearance_mode}:</Text>
            <Text>{data.appearance_mode}</Text>
          </View>
        ) : null}

        {/* hr.divider */}
        <View style={styles.divider} />

        {/* .caseDetailsSection */}
        <Text style={styles.sectionHeading}>{t.case_details}:</Text>
        {data.case_details?.acts_sections ? (
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>{t.acts_sections}:</Text>
            <Text style={styles.caseDetailValue}>
              {data.case_details.acts_sections}
            </Text>
          </View>
        ) : null}
        {data.case_details?.case_category ? (
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>{t.case_category}:</Text>
            <Text style={styles.caseDetailValue}>
              {data.case_details.case_category}
            </Text>
          </View>
        ) : null}
        {data.case_details?.police_station ? (
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>{t.police_station}:</Text>
            <Text style={styles.caseDetailValue}>
              {data.case_details.police_station}
            </Text>
          </View>
        ) : null}
        {data.case_details?.property_details ? (
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>{t.property_details}:</Text>
            <Text style={styles.caseDetailValue}>
              {data.case_details.property_details}
            </Text>
          </View>
        ) : null}
        {data.case_details?.other_details ? (
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>{t.other_details}:</Text>
            <Text style={styles.caseDetailValue}>
              {data.case_details.other_details}
            </Text>
          </View>
        ) : null}

        {/* .narrativeSection — procedural history */}
        {data.procedural_history ? (
          <View style={styles.narrativeSection}>
            <Text style={styles.narrativeHeading}>{t.procedural_history}</Text>
            {renderText(data.procedural_history)}
          </View>
        ) : null}

        {/* .narrativeSection — issues framed */}
        {data.issues_framed ? (
          <View style={styles.narrativeSection}>
            <Text style={styles.narrativeHeading}>{t.issues_framed}:</Text>
            {renderText(data.issues_framed)}
          </View>
        ) : null}

        {/* .narrativeSection — evidence */}
        {data.evidence?.oral_evidence || data.evidence?.documentary_evidence ? (
          <View style={styles.narrativeSection}>
            <Text style={styles.narrativeHeading}>{t.evidence}:</Text>
            {data.evidence?.oral_evidence ? (
              <View style={styles.caseDetailRow}>
                <Text style={styles.caseDetailLabel}>{t.oral_evidence}:</Text>
                <Text style={styles.caseDetailValue}>
                  {data.evidence.oral_evidence}
                </Text>
              </View>
            ) : null}
            {data.evidence?.documentary_evidence ? (
              <View style={styles.caseDetailRow}>
                <Text style={styles.caseDetailLabel}>
                  {t.documentary_evidence}:
                </Text>
                <Text style={styles.caseDetailValue}>
                  {data.evidence.documentary_evidence}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* .narrativeSection — arguments */}
        {data.arguments ? (
          <View style={styles.narrativeSection}>
            <Text style={styles.narrativeHeading}>{t.arguments}</Text>
            {renderText(data.arguments)}
          </View>
        ) : null}

        {/* .reasoningSection */}
        <View>
          <Text style={styles.reasoningHeading}>{t.reasoning}:</Text>
          {safeArray(data.reasoning_points)
            .filter((p) => p?.trim())
            .map((point, i) => (
              <View key={`reasoning-${i}`} style={styles.reasoningPoint}>
                <Text style={styles.pointNumber}>{i + 1}.</Text>
                <Text style={styles.pointContent}>{point.trim()}</Text>
              </View>
            ))}
        </View>

        {/* .orderBodyTitle — "---- FINAL ORDER ----" */}
        <Text style={styles.orderBodyTitle}>---- {t.final_order} ----</Text>

        {/* .orderContent */}
        <View style={styles.orderContent}>
          {renderText(data.operative_order?.full_text)}

          {/* .directionsList */}
          <View>
            <Text style={styles.directionsHeading}>{t.directions}:</Text>
            {safeArray(data.operative_order?.directions)
              .filter((d) => d?.trim())
              .map((dir, i) => (
                <View key={`direction-${i}`} style={styles.directionPoint}>
                  <Text style={styles.directionNumber}>({i + 1})</Text>
                  <Text style={styles.directionContent}>{dir.trim()}</Text>
                </View>
              ))}
          </View>

          {/* final outcome inside orderContent */}
          {data.operative_order?.final_outcome ? (
            <View style={[styles.narrativeSection, { marginTop: 12 }]}>
              <Text style={styles.narrativeHeading}>{t.final_outcome}:</Text>
              {renderText(data.operative_order.final_outcome)}
            </View>
          ) : null}
        </View>

        {/* standalone final_order field */}
        {data.final_order ? (
          <View style={styles.narrativeSection}>
            <Text style={styles.sectionHeading}>{t.final_order}:</Text>
            {renderText(data.final_order)}
          </View>
        ) : null}

        {/* .signatureSection */}
        <View style={styles.signatureSection}>
          {/* .sigLeft */}
          <View style={styles.sigLeft}>
            <View style={styles.sigRow}>
              <Text style={styles.sigLabel}>{t.date}:</Text>
              <Text>{data.signature?.date}</Text>
            </View>
            <View style={styles.sigRow}>
              <Text style={styles.sigLabel}>{t.place}:</Text>
              <Text>{data.signature?.place}</Text>
            </View>
          </View>
          {/* .sigRight */}
          <View style={styles.sigRight}>
            <Text style={styles.sigPlaceholder}>{t.signature_placeholder}</Text>
            <Text style={styles.judgeName}>{data.signature?.judge_name}</Text>
            <Text style={styles.judgeDesig}>{data.signature?.designation}</Text>
            <Text style={styles.sigCourtName}>{data.signature?.court}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default OrderDocument;
