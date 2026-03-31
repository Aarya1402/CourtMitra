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

Font.register({
  family: "Telugu",
  src: "/fonts/NotoSerifTelugu-Regular.ttf",
});

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

Font.register({
  family: "Odia",
  src: "/fonts/NotoSerifOriya-Regular.ttf",
});

/**
 * 🔥 Dynamic font selector
 */
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
    case "ml-IN":
      return "Malayalam";
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

/**
 * 🔥 Paragraph splitter (works even without \n)
 */
const renderParagraphs = (styles: Record<string, any>, text: string = "") => {
  if (!text) return null;

  const sentences = text
    .replaceAll(/([.?!।])/g, "$1|")
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
    <Text key={`paragraph-${i}-${p.substring(0, 10)}`} style={styles.bodyText}>
      {p}
    </Text>
  ));
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
      fontFamily: fontFamily,
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
    header: {
      marginBottom: 30,
      textAlign: "center",
    },
    courtName: {
      fontSize: 14,
      fontWeight: "bold",
      textTransform: "uppercase",
    },
    location: {
      fontSize: 13,
      marginBottom: 10,
    },
    caseInfoLine: {
      fontSize: 12,
      fontWeight: "bold",
      marginVertical: 15,
      textDecoration: "underline",
    },
    section: {
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "bold",
      marginBottom: 8,
      marginTop: 10,
      textDecoration: "underline",
    },
    bodyText: {
      textAlign: "justify",
      marginBottom: 10,
      textIndent: 30,
    },
    listItem: {
      flexDirection: "row",
      marginBottom: 6,
      paddingLeft: 30,
    },
    bullet: {
      width: 25,
      fontWeight: "bold",
    },
    listContent: {
      flex: 1,
      textAlign: "justify",
    },
    orderTitleBanner: {
      textAlign: "center",
      fontSize: 14,
      fontWeight: "bold",
      marginVertical: 30,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      paddingVertical: 10,
    },
    signatureSection: {
      marginTop: 40,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    signatureLeft: {
      fontSize: 11,
    },
    signatureRight: {
      textAlign: "right",
    },
    judgeName: {
      marginTop: 20,
      fontWeight: "bold",
    },
    designation: {
      fontSize: 11,
    },
    smallCourtName: {
      fontSize: 11,
    },
  });

  const safeArray = (arr: string[]) => (Array.isArray(arr) ? arr : []);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text
          style={styles.pageNumHeader}
          render={({ pageNumber }) => `Page No. ${pageNumber}`}
          fixed
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.courtName}>{data.header.court_name}</Text>
          <Text style={styles.location}>{data.header.location}</Text>
          <Text style={styles.caseInfoLine}>
            {data.header.case_type} NO. {data.header.case_number}
          </Text>
        </View>

        {/* Procedural History */}
        {data.procedural_history && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.procedural_history}</Text>
            {renderParagraphs(styles, data.procedural_history)}
          </View>
        )}

        {/* Arguments */}
        {data.arguments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.arguments}</Text>
            {renderParagraphs(styles, data.arguments)}
          </View>
        )}

        {/* Reasoning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.reasoning}</Text>
          {safeArray(data.reasoning_points)
            .filter((p) => p?.trim())
            .map((point, i) => (
              <View
                key={`reasoning-${i}-${point.trim().substring(0, 10)}`}
                style={styles.listItem}
              >
                <Text style={styles.bullet}>{i + 1}.</Text>
                <Text style={styles.listContent}>{point.trim()}</Text>
              </View>
            ))}
        </View>

        {/* Order */}
        <Text style={styles.orderTitleBanner}>{t.final_order_header}</Text>

        <View style={styles.section}>
          {renderParagraphs(styles, data.operative_order.full_text)}

          {safeArray(data.operative_order.directions)
            .filter((d) => d?.trim())
            .map((dir, i) => (
              <View
                key={`direction-${i}-${dir.trim().substring(0, 10)}`}
                style={styles.listItem}
              >
                <Text style={styles.bullet}>({i + 1})</Text>
                <Text style={styles.listContent}>{dir.trim()}</Text>
              </View>
            ))}
        </View>
        <View style={styles.signatureRight}>
          <Text>{t.signature_placeholder}</Text>

          {data.signature?.judge_name && (
            <Text style={styles.judgeName}>{data.signature.judge_name}</Text>
          )}

          {data.signature?.designation && (
            <Text style={styles.designation}>{data.signature.designation}</Text>
          )}

          {data.signature?.court && (
            <Text style={styles.smallCourtName}>{data.signature.court}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

export default OrderDocument;
