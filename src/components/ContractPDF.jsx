// @ts-nocheck
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { padding: 34, backgroundColor: "#ffffff", fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a" },
  logoWrap: { alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#FDCE06", paddingBottom: 8, marginBottom: 12 },
  logo: { width: 150, height: 37, objectFit: "contain" },
  co: { fontSize: 7.5, color: "#555", marginTop: 5, textAlign: "center" },
  h1: { fontSize: 17, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  docno: { fontSize: 9, color: "#666", marginBottom: 14 },
  band: { backgroundColor: "#1a1a1a", color: "#FDCE06", fontSize: 7.5, fontFamily: "Helvetica-Bold",
          paddingVertical: 3, paddingHorizontal: 7, letterSpacing: 0.6 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e2de" },
  lbl: { width: "34%", padding: 4, paddingHorizontal: 7, color: "#555", fontSize: 8.5 },
  val: { width: "66%", padding: 4, paddingHorizontal: 7, fontSize: 8.5 },
  h2: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 5,
        borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingBottom: 3 },
  h3: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 2 },
  p: { fontSize: 7.5, lineHeight: 1.45, marginBottom: 4, textAlign: "justify" },
  sigRow: { flexDirection: "row", marginTop: 18, gap: 22 },
  sigCell: { flex: 1 },
  sigLine: { borderBottomWidth: 0.5, borderBottomColor: "#999", height: 22, marginBottom: 3 },
  sigLbl: { fontSize: 7.5, color: "#666" },
  foot: { position: "absolute", bottom: 20, left: 34, right: 34, textAlign: "center",
          fontSize: 7, color: "#999", borderTopWidth: 0.5, borderTopColor: "#eee", paddingTop: 5 },
});

const money = (n) => {
  const v = parseFloat(n || 0);
  if (!v) return "—";
  return "$" + v.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,");
};

const date = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  } catch (e) { return "—"; }
};

const Row = ({ label, value }) => (
  <View style={s.row}>
    <Text style={s.lbl}>{label}</Text>
    <Text style={s.val}>{value || "—"}</Text>
  </View>
);

const ContractPDF = ({ data = {} }) => {
  const d = data;
  const waiver = String(d.damage_waiver_accepted) === "1" || d.damage_waiver_accepted === true;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.logoWrap}>
          <Image src="/login-logo.png" style={s.logo} />
          <Text style={s.co}>
            LONG TERM HIRE Pty Ltd  ·  ABN 83 246 158 161  ·  admin@longtermhire.com
          </Text>
        </View>

        <Text style={s.h1}>Hire Agreement</Text>
        <Text style={s.docno}>
          {d.contract_no || "Draft"}{d.company_name ? "  ·  " + d.company_name : ""}
        </Text>

        <Text style={s.band}>EQUIPMENT</Text>
        <Row label="Plant number" value={d.plant_code} />
        <Row label="Plant name" value={d.equipment_name} />
        <Row label="Model" value={d.model} />
        <Row label="Year" value={d.year_made} />
        <Row label="Fuel type" value={d.fuel_type} />
        <Row label="Hours at signing" value={d.hours_at_signing} />
        {d.attachment_name ? <Row label="Attachment" value={d.attachment_name} /> : null}

        <View style={{ marginTop: 10 }}>
          <Text style={s.band}>HIRER</Text>
        </View>
        <Row label="Company name" value={d.company_name} />
        <Row label="ABN" value={d.abn} />
        <Row label="Contact" value={[d.client_name, d.contact_position].filter(Boolean).join(", ")} />
        <Row label="Email" value={d.email} />
        <Row label="Payment terms" value={d.payment_terms} />

        <View style={{ marginTop: 10 }}>
          <Text style={s.band}>THIS HIRE</Text>
        </View>
        <Row label="Agreement date" value={date(d.agreement_date)} />
        <Row label="Delivery address" value={d.site_address} />
        <Row label="Delivery date" value={d.delivery_date ? date(d.delivery_date) : "TBC"} />
        <Row label="Delivery cost" value={money(d.delivery_cost)} />
        <Row label="Pick up cost" value={money(d.pickup_cost)} />
        <Row label="Standard Hire Rate" value={money(d.standard_hire_rate) + " per calendar month"} />
        <Row label="Minimum hire" value={d.minimum_hire_months ? d.minimum_hire_months + " months" : "—"} />
        <Row label="Discount applied"
             value={d.discount ? d.discount + (d.discount_type === "%" ? "% per month, compounding" : " per month") : "—"} />

        <View style={{ marginTop: 10 }}>
          <Text style={s.band}>FEES</Text>
        </View>
        <Row label="Maintenance Levy" value={(d.maintenance_levy || "3.50") + "% of the Standard Hire Rate"} />
        <Row label="Environmental Levy" value={(d.environmental_levy || "1.50") + "% of the Standard Hire Rate"} />
        <Row label="Damage Waiver"
             value={waiver ? "Accepted  ·  " + (d.damage_waiver_rate || "7.50") + "% of the Standard Hire Rate" : "Declined"} />
        {waiver ? <Row label="Damage Waiver Excess" value={money(d.damage_waiver_excess)} /> : null}

        {d.notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={s.h3}>Notes</Text>
            <Text style={s.p}>{d.notes}</Text>
          </View>
        ) : null}

        <View style={s.sigRow}>
          <View style={s.sigCell}><View style={s.sigLine} /><Text style={s.sigLbl}>Signed for and on behalf of the Hirer</Text></View>
          <View style={s.sigCell}><View style={s.sigLine} /><Text style={s.sigLbl}>Position</Text></View>
        </View>
        <View style={s.sigRow}>
          <View style={s.sigCell}><View style={s.sigLine} /><Text style={s.sigLbl}>Print name</Text></View>
          <View style={s.sigCell}><View style={s.sigLine} /><Text style={s.sigLbl}>Date</Text></View>
        </View>

        <Text style={s.foot} fixed>
          LONG TERM HIRE Pty Ltd  ·  ABN 83 246 158 161  ·  {d.contract_no || "Draft"}
        </Text>
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Terms and Conditions of Hire</Text>

        <Text style={s.h3}>1. Definitions</Text>
        <Text style={s.p}>
          Standard Hire Rate means the hire charge for the Equipment set out in the Schedule, calculated
          before the application of any discount, rebate or allowance. Where a discount applies, it reduces
          the hire charge only and does not reduce the Standard Hire Rate for the purposes of calculating
          any levy or waiver under this Agreement.
        </Text>
        <Text style={s.p}>
          Equipment means any machine hired by Long Term Hire to the Hirer, including all tools, GET,
          accessories and devices affixed thereto. Hirer means the party named in the Schedule.
        </Text>

        <Text style={s.h3}>2. Title and risk</Text>
        <Text style={s.p}>
          Long Term Hire retains title to the Equipment at all times and it will not in any circumstances be
          deemed a fixture. The Hirer holds the Equipment as bailee only and must not sell, assign, sub-let,
          charge or create any security interest over it. All risk passes to the Hirer on delivery and
          continues until Long Term Hire acknowledges its return.
        </Text>

        <Text style={s.h3}>3. Hire period</Text>
        <Text style={s.p}>
          The Hire Period commences on delivery or collection and ends when the Equipment is back in the
          possession of Long Term Hire. It includes weekends and public holidays, and is irrespective of the
          time the Equipment is in use. Where the Hirer returns the Equipment before the minimum period stated
          in the Schedule, the Hirer remains liable for the charges for that minimum period.
        </Text>

        <Text style={s.h3}>4. Environmental Levy</Text>
        <Text style={s.p}>
          The Hirer will pay an Environmental Levy of {(d.environmental_levy || "1.50")}% of the Standard Hire
          Rate for each month of the Hire Period. It covers the collection, handling and lawful disposal of
          oils, greases, coolants, filters and similar contaminants used in or discarded from the Equipment.
          It does not cover remediating contamination caused by the Hirer, including spills, leaks arising
          from a failure to maintain the Equipment, or contamination of the site, which remain the Hirer's
          responsibility.
        </Text>

        <Text style={s.h3}>5. Maintenance Levy</Text>
        <Text style={s.p}>
          The Hirer will pay a Maintenance Levy of {(d.maintenance_levy || "3.50")}% of the Standard Hire Rate
          for each month of the Hire Period, covering scheduled servicing in accordance with the manufacturer's
          guidelines; attendance to breakdowns during normal business hours where not caused by the Hirer;
          aesthetic and incidental wear from ordinary use; and inspection and certification required to keep
          the Equipment compliant with applicable Australian Standards.
        </Text>
        <Text style={s.p}>
          The Maintenance Levy does not cover, and the Hirer remains responsible for, any loss or damage
          listed in the Damage Waiver exclusions below. Payment of the Maintenance Levy entitles the Hirer to
          one set of tyres per twelve months of continuous hire, measured at the start and end of the Hire
          Period. Usage beyond that entitlement is charged on a usage basis.
        </Text>

        <Text style={s.h3}>6. Damage Waiver</Text>
        <Text style={s.p}>
          The Hirer may accept or decline the Damage Waiver by the election recorded in the Schedule. The
          election applies for the whole Hire Period and cannot be changed once the Hire Period has commenced.
          Where accepted, the Hirer will pay a Damage Waiver charge of {(d.damage_waiver_rate || "7.50")}% of
          the Standard Hire Rate for each month of the Hire Period.
        </Text>
        <Text style={s.p}>
          Where the Damage Waiver has been accepted and the Hirer has complied with this Agreement, the
          Hirer's liability for accidental physical damage to the Equipment is limited to the Damage Waiver
          Excess stated in the Schedule for each separate incident, and Long Term Hire bears the balance of
          the repair cost.
        </Text>
        <Text style={s.p}>
          The Damage Waiver does not apply to, and the Hirer remains fully liable for: (a) theft of the
          Equipment, or any loss where it is not recovered; (b) damage that is deliberate, or caused by
          misuse, abuse, overloading or operation outside the manufacturer's specifications; (c) damage
          arising while the Equipment is operated by a person who is not licensed, trained or competent to
          operate it; (d) damage arising while the Equipment is unattended and not secured; (e) damage
          arising from any breach by the Hirer of this Agreement; (f) damage to tyres, tubes, glass, screens
          or mirrors; (g) damage arising from lack of lubrication, failure to carry out daily checks, or
          failure to follow servicing instructions; (h) damage arising from use in or over water, or in
          underground workings, unless agreed in writing; (i) damage arising from exposure to corrosive or
          caustic substances, including salt water, acid and concrete; (j) damage arising during transport of
          the Equipment by or on behalf of the Hirer; (k) contamination, including asbestos exposure and the
          cost of decontamination; and (l) consequential loss of any kind, including lost hire revenue while
          the Equipment is repaired.
        </Text>
        <Text style={s.p}>
          Where the Damage Waiver is declined, the Hirer is liable for the full cost of repair, or the
          replacement cost where the Equipment cannot economically be repaired. The Damage Waiver is not a
          contract of insurance and does not replace the Hirer's obligation to effect and maintain the
          insurance required under this Agreement.
        </Text>

        <Text style={s.h3}>7. Hirer's obligations</Text>
        <Text style={s.p}>
          The Hirer must operate the Equipment safely, lawfully and in accordance with the manufacturer's
          instructions; ensure operators are suitably trained and hold any required Certificate of Competency;
          return the Equipment in the same good and clean condition, ordinary fair wear and tear excepted;
          carry out daily checks and maintain the Equipment at its own cost; and not alter, modify or repair
          the Equipment without written consent. The Hire Agreement is personal to the Hirer, who must not
          allow any other party to use, re-hire or possess the Equipment.
        </Text>

        <Text style={s.h3}>8. Breakdown</Text>
        <Text style={s.p}>
          If the Equipment breaks down or becomes unsafe the Hirer must immediately stop using it, notify Long
          Term Hire, and take all steps necessary to prevent injury or further damage. Where the breakdown is
          through no fault of the Hirer, Long Term Hire will repair the Equipment as soon as reasonably
          possible and will not charge hire for the period it was unusable.
        </Text>

        <Text style={s.h3}>9. Insurance</Text>
        <Text style={s.p}>
          The Hirer must effect and maintain, at its own expense and for the whole Hire Period, cover against
          physical loss including theft and damage to the Equipment for its full replacement value including
          in transit, and public liability cover of not less than $20,000,000. Each policy must name Long Term
          Hire as a named insured as owner of the Equipment.
        </Text>

        <Text style={s.h3}>10. Payment and default</Text>
        <Text style={s.p}>
          Payment terms are as stated in the Schedule. The Hirer must notify Long Term Hire of any invoice
          dispute within 14 days of the invoice date, after which the invoice is taken to be accepted. Long
          Term Hire may terminate this Agreement immediately by notice if the Hirer breaches any term, or
          becomes bankrupt or insolvent, and may take all steps necessary to recover the Equipment.
        </Text>

        <Text style={s.h3}>11. PPS Law</Text>
        <Text style={s.p}>
          The Hirer acknowledges that this Agreement is a security agreement and a PPS Lease for the purposes
          of the Personal Property Securities Act 2009 (Cth) and creates a security interest in the Equipment.
          The Hirer agrees to do all things reasonably necessary to enable Long Term Hire to acquire a
          perfected security interest.
        </Text>

        <Text style={s.h3}>12. General</Text>
        <Text style={s.p}>
          This Agreement, including the Schedule, comprises the entire agreement between the parties. All
          prices are GST exclusive unless otherwise stated. If any part becomes void or unenforceable it is
          severed and the remainder continues in full force. The person signing on behalf of the Hirer
          warrants they have authority to bind the Hirer.
        </Text>

        <Text style={s.foot} fixed>
          LONG TERM HIRE Pty Ltd  ·  ABN 83 246 158 161  ·  {d.contract_no || "Draft"}
        </Text>
      </Page>
    </Document>
  );
};

export default ContractPDF;
