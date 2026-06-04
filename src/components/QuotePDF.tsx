// @ts-nocheck
import React from "react";
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", backgroundColor: "#fff" },
  header: { marginBottom: 30, borderBottom: "2pt solid #FDCE06", paddingBottom: 15 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1F1F20", marginBottom: 5 },
  subtitle: { fontSize: 12, color: "#666" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: "#1F1F20", marginBottom: 10, backgroundColor: "#f5f5f5", padding: 6 },
  row: { flexDirection: "row", paddingVertical: 6, borderBottom: "0.5pt solid #eee" },
  col: { flex: 1, fontSize: 10, color: "#333" },
  colHeader: { flex: 1, fontSize: 10, fontWeight: "bold", color: "#1F1F20" },
  total: { flexDirection: "row", justifyContent: "flex-end", marginTop: 15, paddingTop: 10, borderTop: "1pt solid #FDCE06" },
  totalText: { fontSize: 14, fontWeight: "bold", color: "#1F1F20" },
});

const QuoteDocument = ({ quoteData }) => {
  const items = Array.isArray(quoteData?.items) ? quoteData.items : [];
  const total = items.reduce((sum, item) => sum + (parseFloat(item.unit_price || 0) * parseInt(item.quantity || 1)), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Long Term Hire</Text>
          <Text style={styles.subtitle}>Quote #{quoteData?.quote_id || quoteData?.id || "—"}</Text>
          <Text style={styles.subtitle}>Date: {new Date().toLocaleDateString("en-AU")}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Details</Text>
          <Text style={{ fontSize: 11, color: "#333", marginBottom: 4 }}>Company: {quoteData?.company_name || "—"}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote Items</Text>
          <View style={styles.row}>{["Equipment", "Qty", "Unit Price", "Duration", "Total"].map(h => <Text key={h} style={styles.colHeader}>{h}</Text>)}</View>
          {items.map((item, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.col}>{item.equipment_name || "—"}</Text>
              <Text style={styles.col}>{item.quantity || 1}</Text>
              <Text style={styles.col}>${parseFloat(item.unit_price || 0).toFixed(2)}</Text>
              <Text style={styles.col}>{item.duration || "—"}</Text>
              <Text style={styles.col}>${(parseFloat(item.unit_price || 0) * parseInt(item.quantity || 1)).toFixed(2)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.total}>
          <Text style={styles.totalText}>Total: ${total.toFixed(2)}/month</Text>
        </View>
      </Page>
    </Document>
  );
};

const QuotePDF = ({ quoteData }) => (
  <PDFDownloadLink document={<QuoteDocument quoteData={quoteData} />} fileName={`quote-${quoteData?.quote_id || quoteData?.id || "draft"}.pdf`}>
    {({ loading }) => (
      <button className="flex items-center gap-2 bg-[#FDCE06] text-black px-4 py-2 rounded-md text-sm font-bold hover:bg-[#E5B800] transition-colors">
        {loading ? "Generating..." : "Download PDF"}
      </button>
    )}
  </PDFDownloadLink>
);

export default QuotePDF;
