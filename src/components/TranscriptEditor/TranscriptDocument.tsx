import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { getTranslation } from "../../constants/translations";

/**
 * 🔥 FONT REGISTRATION (same as OrderDocument)
 */
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
 * 🔥 Dynamic font selection
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
 * 🔥 Paragraph splitter (same logic as OrderDocument)
 */
const renderParagraphs = (styles: any, text: string = "") => {
  console.log(text);
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
    <Text key={i} style={styles.bodyText}>
      {p}
    </Text>
  ));
};

interface TranscriptDocumentProps {
  transcript: string;
  language?: string;
}

const TranscriptDocument: React.FC<TranscriptDocumentProps> = ({
  transcript,
  language,
}) => {
  const lang = language || "en-IN";
  const t = getTranslation(lang);
  const fontFamily = getFontFamily(lang);

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
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 25,
      textAlign: "center",
      textTransform: "uppercase",
    },
    bodyText: {
      textAlign: "justify",
      marginBottom: 10,
      textIndent: 30,
    },
  });
  console.log(transcript);

  return (
    <Document title={t.transcript_title}>
      <Page size="A4" style={styles.page}>
        <Text
          style={styles.pageNumHeader}
          render={({ pageNumber }) => `Page No. ${pageNumber}`}
          fixed
        />

        {/* Title */}
        <Text style={styles.header}>{t.transcript_title}</Text>

        {/* Transcript Content */}
        <View>{renderParagraphs(styles, transcript)}</View>
      </Page>
    </Document>
  );
};

export default TranscriptDocument;
