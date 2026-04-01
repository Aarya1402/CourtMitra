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
import { fontConfigs, getFontFamily } from "../../constants/fontConfig";

for (const font of fontConfigs) {
  Font.register(font);
}

const renderParagraphs = (
  styles: {
    page: {
      paddingTop: number;
      paddingBottom: number;
      paddingHorizontal: number;
      fontSize: number;
      fontFamily: string;
      lineHeight: number;
      backgroundColor: string;
    };
    pageNumHeader: {
      position: "absolute";
      top: number;
      left: number;
      fontSize: number;
      color: string;
    };
    header: {
      fontSize: number;
      fontWeight: string;
      marginBottom: number;
      textAlign: "center";
      textTransform: "uppercase";
    };
    bodyText: {
      textAlign: "justify";
      marginBottom: number;
      textIndent: number;
    };
  },
  text: string = ""
) => {
  const sentences = text
    .replaceAll(/([.?!।])/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];
  let temp: string[] = [];

  for (const [i, s] of sentences.entries()) {
    temp.push(s);

    if ((i + 1) % 3 === 0) {
      paragraphs.push(temp.join(" "));
      temp = [];
    }
  }

  if (temp.length) paragraphs.push(temp.join(" "));

  return paragraphs.map((p, i) => (
    <Text key={i + p} style={styles.bodyText}>
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
  const lang = language || "gu-IN";
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
