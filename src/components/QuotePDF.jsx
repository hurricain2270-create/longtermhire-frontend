// @ts-nocheck
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { calculateMonthlyPrices } from "../utils/pricingCalculator";

// Format number with comma separator and 2 decimal places (safe for PDF renderer)
const formatNum = (n) => {
  const num = parseFloat(n || 0);
  const fixed = num.toFixed(2);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  contentWrapper: {
    border: "1px solid #000",
    padding: 20,
  },
  logoSection: {
    marginBottom: 10,
  },
  logo: {
    width: 280,
    height: 70,
    objectFit: "cover",
  },
  logoPlaceholder: {
    width: 100,
    height: 50,
    backgroundColor: "#f0f0f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "normal",
    color: "#000",
    marginBottom: 15,
    marginTop: 10,
  },
  detailsSection: {
    flexDirection: "row",
    marginBottom: 20,
    paddingBottom: 15,
    paddingTop: 15,
    borderTop: "1px solid #000",
    borderBottom: "1px solid #000",
  },
  leftColumn: {
    width: "33%",
    paddingRight: 10,
    borderRight: "1px solid #000",
  },
  rightColumn: {
    width: "67%",
    paddingLeft: 10,
    flexDirection: "row",
  },
  middleColumn: {
    width: "50%",
    paddingRight: 10,
  },
  farRightColumn: {
    width: "50%",
    paddingLeft: 10,
  },
  dateBox: {
    marginBottom: 15,
  },
  fromBox: {
    marginTop: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  infoText: {
    fontSize: 10,
    color: "#000",
    marginBottom: 3,
  },
  detailRow: {
    marginBottom: 5,
  },
  labelText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#000",
  },
  valueText: {
    fontSize: 10,
    fontWeight: "normal",
    color: "#000",
  },
  table: {
    marginTop: 10,
    marginBottom: 10,
    border: "1px solid #000",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #000",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #000",
  },
  tableCol: {
    fontSize: 9,
    color: "#000",
    padding: 6,
    borderRight: "1px solid #000",
  },
  tableColHeader: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#000",
    padding: 6,
    borderRight: "1px solid #000",
    backgroundColor: "#f5f5f5",
  },
  tableColLast: {
    borderRight: "none",
  },
  col1: { width: "8%" },
  col2: { width: "22%" },
  col3: { width: "10%", textAlign: "right" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "12%", textAlign: "center" },
  col6: { width: "15%", textAlign: "right" },
  col7: { width: "18%", textAlign: "right" },
  totalsRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
  },
  totalsCell: {
    width: "57%",
    padding: 5,
    borderRight: "1px solid #000",
  },
  totalsValues: {
    width: "43%",
    padding: 5,
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 9,
    color: "#000",
  },
  totalValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#000",
  },
  termsText: {
    fontSize: 7,
    color: "#000",
    lineHeight: 1.3,
  },
  watermark: {
    position: "absolute",
    fontSize: 80,
    color: "#f5f5f5",
    transform: "rotate(-45deg)",
    top: "45%",
    left: "20%",
    opacity: 0.2,
  },
});

const QuotePDF = ({ quoteData }) => {
  console.log(quoteData, "component");

  // Get equipment data or use dummy data
  const equipmentData = quoteData?.equipmentData || {
    id: "001",
    description: "7 Ton Excavator",
    basePrice: 5000,
    discount: 1, // 1% discount per month
  };

  // Calculate number of months from produce_quote_for
  const numberOfMonths = parseInt(quoteData?.produce_quote_for || 8);

  // Generate monthly pricing with compounding discounts
  const equipmentItems = [];

  // Use robust check for values
  const basePrice = parseFloat(equipmentData.basePrice || equipmentData.custom_base_price || 0);
  const discount = parseFloat(equipmentData.discount || equipmentData.discount_value || 0);
  const discountTypeField = equipmentData.discount_type || equipmentData.discountType;
  const discountType = (discountTypeField === 'percentage' || discountTypeField === '%' || discountTypeField === '0' || discountTypeField === 0) ? '%' : '$';
  const compoundingDiscount = parseFloat(equipmentData.compounding_discount || equipmentData.compounding_discount_value || 0);
  const compoundingDiscountTypeField = equipmentData.compounding_discount_type || equipmentData.compoundingDiscountType;
  const compoundingDiscountType = (compoundingDiscountTypeField === 'percentage' || compoundingDiscountTypeField === '%' || compoundingDiscountTypeField === '0' || compoundingDiscountTypeField === 0) ? '%' : '$';

  const schedule = calculateMonthlyPrices(
    basePrice,
    discount,
    discountType,
    compoundingDiscount,
    compoundingDiscountType,
    numberOfMonths
  );

  // Map schedule to equipmentItems format
  schedule.forEach(item => {
    equipmentItems.push({
      id: equipmentData.id,
      description: equipmentData.description || equipmentData.name,
      month: item.month,
      unitPrice: item.unitPrice,
      discount: item.discountType === '%' ? `${item.discount.toFixed(2)}%` : `$${item.discount.toFixed(2)}`,
      price: item.price,
      total: item.cumulativeTotal,
    });
  });

  const accumulativeTotal = schedule.length > 0 ? schedule[schedule.length - 1].cumulativeTotal : 0;

  // Calculate totals
  const subtotal = accumulativeTotal;
  const gstPercentage = parseFloat(quoteData?.gst_percentage || 15);
  const gst = subtotal * (gstPercentage / 100);
  const totalAUD = subtotal + gst;

  console.log(quoteData, "component");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>Long Term Hire</Text>

        {/* Content Wrapper with Border */}
        <View style={styles.contentWrapper}>
          {/* Logo and Title */}
          <View style={styles.logoSection}>

            <Image src="/login-logo.png" style={styles.logo} />

          </View>
          <Text style={styles.title}>Quotation</Text>

          {/* Quote Details Section - 3 Columns with Borders */}
          <View style={styles.detailsSection}>
            {/* Left Column - To */}
            <View style={styles.leftColumn}>
              <Text style={styles.sectionLabel}>To:</Text>
              <Text style={styles.infoText}>
                {quoteData?.company_name || ""}
              </Text>
              {quoteData?.company_address ? (
                <Text style={styles.infoText}>{quoteData.company_address}</Text>
              ) : null}
              {quoteData?.company_email ? (
                <Text style={styles.infoText}>{quoteData.company_email}</Text>
              ) : null}
            </View>

            {/* Right Section - Split into 2 columns */}
            <View style={styles.rightColumn}>
              {/* Middle Column - Date Details */}
              <View style={styles.middleColumn}>
                <View style={styles.detailRow}>
                  <Text style={styles.labelText}>
                    Date Issued:{" "}
                    <Text style={styles.valueText}>
                      {quoteData?.created_at ? new Date(quoteData.created_at).toLocaleDateString("en-AU") : new Date().toLocaleDateString("en-AU")}
                    </Text>
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.labelText}>
                    Expiry:{" "}
                    <Text style={styles.valueText}>
                      {(() => {
                        const createdDate = quoteData?.created_at ? new Date(quoteData.created_at) : new Date();
                        const expiryDate = new Date(createdDate);
                        expiryDate.setDate(expiryDate.getDate() + parseInt(quoteData?.quote_expires_after || 7));
                        return expiryDate.toLocaleDateString("en-AU");
                      })()}
                    </Text>
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.labelText}>
                    Quote Number:{" "}
                    <Text style={styles.valueText}>
                      {quoteData?.quote_id || "QU-001"}
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Far Right Column - From */}
              <View style={styles.farRightColumn}>
                <Text style={styles.sectionLabel}>From:</Text>
                <Text style={styles.infoText}>
                  {quoteData?.admin_company_name || "Long Term Hire Pty Ltd"}
                </Text>
                {quoteData?.admin_company_address ? (
                  <Text style={styles.infoText}>{quoteData.admin_company_address}</Text>
                ) : null}
                <Text style={styles.infoText}>admin@longtermhire.com</Text>
              </View>
            </View>
          </View>

          {/* Equipment Table */}
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableColHeader, styles.col1]}>Item</Text>
              <Text style={[styles.tableColHeader, styles.col2]}>
                Description
              </Text>
              <Text style={[styles.tableColHeader, styles.col3]}>Month</Text>
              <Text style={[styles.tableColHeader, styles.col4]}>
                Unit Price
              </Text>
              <Text style={[styles.tableColHeader, styles.col5]}>Discount</Text>
              <Text style={[styles.tableColHeader, styles.col6]}>Price</Text>
              <Text
                style={[
                  styles.tableColHeader,
                  styles.col7,
                  styles.tableColLast,
                ]}
              >
                Accumulative
              </Text>
            </View>

            {/* Table Rows */}
            {equipmentItems.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCol, styles.col1]}>
                  {index === 0 ? item.id : ""}
                </Text>
                <Text style={[styles.tableCol, styles.col2]}>
                  {index === 0 ? item.description : ""}
                </Text>
                <Text style={[styles.tableCol, styles.col3]}>{item.month}</Text>
                <Text style={[styles.tableCol, styles.col4]}>
                  ${formatNum(item.unitPrice)}
                </Text>
                <Text style={[styles.tableCol, styles.col5]}>
                  {item.discount}
                </Text>
                <Text style={[styles.tableCol, styles.col6]}>
                  ${formatNum(item.price)}
                </Text>
                <Text
                  style={[styles.tableCol, styles.col7, styles.tableColLast]}
                >
                  ${formatNum(item.total)}
                </Text>
              </View>
            ))}

            {/* Totals Row */}
            <View style={styles.totalsRow}>
              <View style={styles.totalsCell}>
                <Text style={styles.tableCol}></Text>
              </View>
              <View style={styles.totalsValues}>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>${formatNum(subtotal)}</Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>
                    GST ({gstPercentage.toFixed(0)}%)
                  </Text>
                  <Text style={styles.totalValue}>${formatNum(gst)}</Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={[styles.totalLabel, { fontWeight: "bold" }]}>
                    Total AUD
                  </Text>
                  <Text style={[styles.totalValue, { fontSize: 10 }]}>
                    ${formatNum(totalAUD)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Terms & Conditions */}
          <View style={styles.footer}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>
              {quoteData?.terms_of_hire ||
                "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum."}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Change this at the bottom of your QuotePDF file:
export default React.memo(QuotePDF, (prevProps, nextProps) => {
  // Only re-render if the core quote ID or equipment changes, not on random cursor triggers
  return prevProps.quoteData?.quote_id === nextProps.quoteData?.quote_id;
});
