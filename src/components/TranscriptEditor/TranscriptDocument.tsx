import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { getTranslation } from "../../constants/translations";

const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontSize: 12,
    fontFamily: "Times-Roman",
    lineHeight: 1.6,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  content: {
    textAlign: "justify",
  },
});

interface TranscriptDocumentProps {
  transcript: string;
  language?: string;
}

const TranscriptDocument: React.FC<TranscriptDocumentProps> = ({ transcript, language }) => {
  const t = getTranslation(language || "en-IN");
  
  return (
    <Document title={t.transcript_title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{t.transcript_title}</Text>
        <View style={styles.content}>
          <Text>{transcript}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default TranscriptDocument;
