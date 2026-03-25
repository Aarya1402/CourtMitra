import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { OrderData } from "./OrderForm";
import { getTranslation } from "../../constants/translations";

// Register fonts if needed, but for now use default serif
// Font.register({ family: 'Times-Roman', src: ... });

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 70,
    paddingHorizontal: 60,
    fontSize: 12,
    fontFamily: "Times-Roman",
    lineHeight: 1.5,
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
    marginBottom: 4,
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
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  column: {
    flexDirection: "column",
    flex: 1,
  },
  label: {
    fontWeight: "bold",
    width: 120,
  },
  partyContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  partyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  partyName: {
    flex: 1,
    paddingRight: 20,
    textAlign: "left",
  },
  partyRole: {
    width: 120,
    textAlign: "right",
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  versus: {
    textAlign: "center",
    marginVertical: 12,
    fontWeight: "bold",
    fontStyle: "italic",
    fontSize: 13,
  },
  bodyText: {
    textAlign: "justify",
    marginBottom: 12,
    textIndent: 30,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 8,
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
    textTransform: "uppercase",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 10,
  },
  signatureBlock: {
    marginTop: 60,
    flexDirection: "column",
    alignItems: "flex-end",
    paddingRight: 10,
  },
  sigArea: {
    width: "60%",
    textAlign: "center",
    alignItems: "center",
  },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: "#000",
    marginTop: 50,
    marginBottom: 5,
    width: "70%",
  },
  datePlaceGroup: {
    alignSelf: "flex-start",
    marginTop: -80, // pull back up
    marginBottom: 80,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: "#999",
    borderTopWidth: 0.5,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
});

interface OrderDocumentProps {
  data: OrderData;
  language: string;
}

const OrderDocument: React.FC<OrderDocumentProps> = ({ data, language }) => {
  const t = getTranslation(language);

  const safeArray = (arr: any) => (Array.isArray(arr) ? arr : []);

  return (
    <Document title={`Court Order - ${data.header.case_number}`}>
      <Page size="A4" style={styles.page}>
        <Text
          style={styles.pageNumHeader}
          render={({ pageNumber }) => `Page No. ${pageNumber}`}
          fixed
        />

        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.courtName}>{data.header.court_name || t.court_name}</Text>
          <Text style={styles.location}>{data.header.location || t.location}</Text>
          <Text style={styles.caseInfoLine}>
            {data.header.case_type} NO. {data.header.case_number}
          </Text>
        </View>

        {/* Parties Section */}
        <View style={styles.partyContainer}>
          <View style={styles.partyRow}>
            <Text style={styles.partyName}>{data.case_title.petitioner}</Text>
            <Text style={styles.partyRole}>... {t.petitioner}</Text>
          </View>

          <Text style={styles.versus}>{t.versus}</Text>

          <View style={styles.partyRow}>
            <Text style={styles.partyName}>{data.case_title.respondent}</Text>
            <Text style={styles.partyRole}>... {t.respondent}</Text>
          </View>
        </View>

        {/* Advocates Section */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>{t.advocate_petitioner}: </Text>
            <Text style={styles.column}>{safeArray(data.advocates.petitioner_side).join(", ")}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t.advocate_respondent}: </Text>
            <Text style={styles.column}>{safeArray(data.advocates.respondent_side).join(", ")}</Text>
          </View>
        </View>

        {/* Procedural History */}
        {data.procedural_history && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.procedural_history}</Text>
            <Text style={styles.bodyText}>{data.procedural_history}</Text>
          </View>
        )}

        {/* Arguments */}
        {data.arguments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.arguments}</Text>
            <Text style={styles.bodyText}>{data.arguments}</Text>
          </View>
        )}

        {/* Reasoning points */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.reasoning}</Text>
          {safeArray(data.reasoning_points).map((point, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>{index + 1}.</Text>
              <Text style={styles.listContent}>{point}</Text>
            </View>
          ))}
        </View>

        {/* Order Title Banner */}
        <Text style={styles.orderTitleBanner}>{t.final_order_header}</Text>

        {/* Operative Order */}
        <View style={styles.section}>
          <Text style={styles.bodyText}>{data.operative_order.full_text}</Text>
          
          {safeArray(data.operative_order.directions).map((dir, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>({index + 1})</Text>
              <Text style={styles.listContent}>{dir}</Text>
            </View>
          ))}
        </View>

        {/* Signature Block */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.datePlaceGroup}>
            <Text>{t.date}: {data.signature.date}</Text>
            <Text>{t.place}: {data.signature.place}</Text>
          </View>
          
          <View style={styles.sigArea}>
            <View style={styles.sigLine} />
            <Text style={{fontWeight: 'bold'}}>{data.signature.judge_name}</Text>
            <Text>{data.signature.designation}</Text>
            <Text>{data.signature.court}</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={() => `Court Order Management System - Generated Document`}
          fixed
        />
      </Page>
    </Document>
  );
};

export default OrderDocument;
