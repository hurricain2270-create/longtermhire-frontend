// @ts-nocheck
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const YELLOW = "#FDCE06";

const s = StyleSheet.create({
  page: { padding: 34, paddingBottom: 52, backgroundColor: "#fff", fontFamily: "Helvetica", fontSize: 9 },
  head: { alignItems: "center", borderBottomWidth: 2, borderBottomColor: YELLOW, paddingBottom: 8, marginBottom: 12 },
  logo: { width: 150, height: 42, objectFit: "contain", marginBottom: 5 },
  co: { fontSize: 7.5, color: "#555", textAlign: "center" },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  docno: { fontSize: 9, color: "#666", marginBottom: 14 },
  band: { backgroundColor: "#1a1a1a", color: YELLOW, fontSize: 7.5, fontFamily: "Helvetica-Bold",
          paddingVertical: 3, paddingHorizontal: 8, letterSpacing: 0.6 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e2de" },
  lbl: { width: "34%", padding: 4, paddingHorizontal: 8, color: "#555", fontSize: 8.5 },
  val: { width: "66%", padding: 4, paddingHorizontal: 8, fontSize: 8.5 },
  h2: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 6,
        borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingBottom: 3 },
  clause: { marginBottom: 7 },
  ch: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  cb: { fontSize: 7.5, color: "#222", lineHeight: 1.45, textAlign: "justify" },
  note: { fontSize: 7.5, color: "#555", fontStyle: "italic", marginTop: 8 },
  sigWrap: { marginTop: 20, borderTopWidth: 0.5, borderTopColor: "#ddd", paddingTop: 14 },
  sigRow: { flexDirection: "row", marginBottom: 16 },
  sigCell: { width: "50%", paddingRight: 18 },
  sigLine: { borderBottomWidth: 0.5, borderBottomColor: "#999", height: 20, marginBottom: 3 },
  sigLbl: { fontSize: 7.5, color: "#666" },
  foot: { position: "absolute", bottom: 22, left: 34, right: 34, textAlign: "center",
          fontSize: 7, color: "#999", borderTopWidth: 0.5, borderTopColor: "#eee", paddingTop: 5 },
});

const money = (n) => {
  const v = parseFloat(n || 0);
  return "$" + v.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,");
};

const showDate = (d) => {
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

const Band = ({ children }) => <Text style={s.band}>{children}</Text>;

const TERMS = [
  ["1. Definitions", "Standard Hire Rate means the hire charge set out in the Schedule, calculated before the application of any discount, rebate or allowance. Where a discount applies it reduces the hire charge only, and does not reduce the Standard Hire Rate for the purposes of calculating any levy or waiver under this Agreement. Equipment means any machine hired by Long Term Hire to the Hirer, including all tools, GET, accessories, parts and devices affixed or supplied with it. Hirer means the party named in the Schedule and includes its contractors, employees and agents."],
  ["2. Title to equipment", "Long Term Hire retains title to the Equipment at all times, including if the Hirer enters liquidation or becomes bankrupt during the Hire Period, and the Equipment will not in any circumstances be deemed a fixture. The Hirer holds the Equipment as bailee only and must not sell, assign, sub-let, charge or create any security interest over it. All risk passes to the Hirer on delivery and ceases only when Long Term Hire acknowledges its return."],
  ["3. Hire period", "The Hire Period commences when the Hirer takes possession of the Equipment, or when Long Term Hire delivers it in accordance with the Hirer's instructions, and ends when the Equipment is back in the possession of Long Term Hire. It includes weekends and public holidays and is irrespective of the time the Equipment is in use. The Hire Period is not subject to stand down or adjustment unless agreed in writing."],
  ["4.1 Hire charges", "The Hirer will pay the hire charges set out in the Schedule together with any levies or charges applicable. No discount or rebate applies for periods in which the Equipment is not used. Payment terms are as stated in the Schedule. Long Term Hire may withdraw credit terms at any time, in which case outstanding amounts fall due immediately."],
  ["4.2 Environmental Levy", "The Hirer will pay an Environmental Levy of 1.5% of the Standard Hire Rate for each month of the Hire Period. It covers the collection, handling and lawful disposal of oils, greases, coolants, filters and similar contaminants used in or discarded from the Equipment. It does not cover remediating contamination caused by the Hirer, including spills, leaks arising from a failure to maintain the Equipment, or contamination of the site or surrounding land, which remain the Hirer's responsibility."],
  ["4.3 Maintenance Levy", "The Hirer will pay a Maintenance Levy of 3.5% of the Standard Hire Rate for each month of the Hire Period, covering scheduled servicing in accordance with the manufacturer's guidelines, attendance to breakdowns during normal business hours where not caused by the Hirer, aesthetic and incidental wear from ordinary use, and inspection and certification required to keep the Equipment compliant with applicable Australian Standards. It does not cover any loss or damage listed in the Damage Waiver exclusions. Payment of the Maintenance Levy entitles the Hirer to one set of tyres per twelve months of continuous hire, measured at the start and end of the Hire Period."],
  ["5. Damage Waiver", "The Hirer may accept or decline the Damage Waiver by the election recorded in the Schedule. The election applies for the whole Hire Period and cannot be changed once it has commenced. Where accepted, the Hirer will pay a Damage Waiver charge of 7.5% of the Standard Hire Rate for each month of the Hire Period, and the Hirer's liability for accidental physical damage is limited to the Damage Waiver Excess stated in the Schedule for each separate incident."],
  ["5.1 Waiver exclusions", "The Damage Waiver does not apply to, and the Hirer remains fully liable for: theft of the Equipment or any loss where it is not recovered; damage that is deliberate or caused by misuse, abuse, overloading or operation outside the manufacturer's specifications; damage arising while operated by a person not licensed, trained or competent; damage while unattended and not secured; damage arising from any breach of this Agreement; damage to tyres, tubes, glass, screens or mirrors; damage from lack of lubrication or failure to carry out daily checks; damage from use in or over water or underground unless agreed in writing; damage from exposure to corrosive or caustic substances including salt water, acid and concrete; damage during transport by or on behalf of the Hirer; contamination including asbestos and the cost of decontamination; and consequential loss of any kind. Where the Damage Waiver is declined, the Hirer is liable for the full cost of repair or the replacement cost where the Equipment cannot economically be repaired. The Damage Waiver is not a contract of insurance and does not replace the Hirer's obligation to maintain the insurance required by clause 9."],
  ["6. Hirer's obligations", "The Hire Agreement is personal to the Hirer, who must not allow any other person to use, re-hire or possess the Equipment. The Hirer warrants it will operate the Equipment safely, lawfully and in accordance with the manufacturer's instructions; ensure operators are suitably trained and hold any required Certificate of Competency; return the Equipment in the same good and clean condition, ordinary fair wear and tear excepted; maintain all safety signage; ensure operators wear suitable protective equipment; conduct a job safety analysis before use; carry out daily checks, cleaning, fuelling and lubrication at its own cost; and comply with all Environmental Laws. The Hirer must not alter, modify or repair the Equipment without written consent, and must not remove it from the site without consent."],
  ["7. Equipment breakdown", "If the Equipment breaks down or becomes unsafe the Hirer must immediately stop using it, notify Long Term Hire, take all steps to prevent injury or further damage, and must not attempt repair without written consent. Where the breakdown is through no fault of the Hirer, Long Term Hire will repair it as soon as reasonably possible and will not charge hire for the period the Equipment was unusable. Long Term Hire is not liable for any expenditure, damages, loss or inconvenience arising from a breakdown."],
  ["8. Loss or damage", "The Hirer is responsible for the Equipment and its attached tools, GET and accessories at all times during the Hire Period. Subject to clause 5, if the Equipment is lost, stolen or damaged, or is not returned within agreed timeframes, the Hirer is liable for the cost of repair or the replacement cost where it cannot economically be repaired, together with hire charges until replacement Equipment is available for use."],
  ["9. Insurance", "The Hirer must effect and maintain, at its own expense and for the whole Hire Period, a policy indemnifying against physical loss including theft and damage to the Equipment for its full replacement value including in transit, and a public liability policy providing indemnity in respect of the operation of the Equipment to a limit of not less than $20,000,000. Each policy must name Long Term Hire as a named insured as owner of the Equipment, and evidence must be provided on demand."],
  ["10. Liability", "To the extent permitted by law all terms, conditions and warranties relating to Long Term Hire's obligations are excluded. Where legislation implies a term that cannot be excluded it applies to the minimum extent permissible. Long Term Hire is not liable for consequential loss, including loss of profits or revenue. The Hirer indemnifies Long Term Hire against all liability, claims, loss, costs and expenses arising from or in connection with the Hirer's hire and use of the Equipment or its breach of this Agreement."],
  ["11. PPS law", "The Hirer acknowledges that this Agreement is a security agreement and a PPS Lease for the purposes of the Personal Property Securities Act 2009 (Cth) and creates a security interest in all Equipment hired. The Hirer agrees to do all things reasonably necessary to enable Long Term Hire to acquire a perfected security interest, and indemnifies Long Term Hire for the costs of registration, maintenance, enforcement or discharge of that interest. The Hirer must not sub-hire without prior written consent."],
  ["12. Termination and recovery", "Long Term Hire may terminate this Agreement immediately by notice if the Hirer breaches any term, becomes bankrupt or insolvent, enters liquidation or external administration, goes into receivership or ceases to carry on business. Hire charges continue to apply until the Equipment is returned to or collected by Long Term Hire. Where the Hirer is in breach or this Agreement has been terminated, Long Term Hire may take all steps necessary to recover the Equipment, including entering the Hirer's premises, and the Hirer authorises it to do so."],
  ["13. Miscellaneous", "If any part of this Agreement becomes void or unenforceable that part is severed and the remainder continues in full force. This Agreement, including the Schedule, comprises the entire agreement between the parties, and no additional terms proposed by the Hirer apply unless agreed in writing. All prices are GST exclusive unless otherwise stated. The person signing on behalf of the Hirer warrants they have authority to bind the Hirer. Time is of the essence in respect of all obligations of the Hirer."],
];

const ContractPDF = ({ contract = {} }) => {
  const c = contract;
  const rate = parseFloat(c.standard_hire_rate || 0);
  const waiver = String(c.damage_waiver_accepted) === "1" || c.damage_waiver_accepted === true;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          {c.logo ? <Image style={s.logo} src={c.logo} /> : null}
          <Text style={s.co}>LONG TERM HIRE Pty Ltd   ·   ABN 83 246 158 161</Text>
          <Text style={s.co}>admin@longtermhire.com</Text>
        </View>

        <Text style={s.h1}>Hire Agreement</Text>
        <Text style={s.docno}>
          {c.contract_no || "Draft"}   ·   {c.company_name || ""}
        </Text>

        <Band>EQUIPMENT</Band>
        <Row label="Plant number" value={c.plant_code} />
        <Row label="Plant name" value={c.equipment_name} />
        <Row label="Plant model" value={c.model} />
        <Row label="Year" value={c.year_made} />
        <Row label="Fuel type" value={c.fuel_type} />
        <Row label="Hours at signing" value={c.hours_at_signing} />
        {c.attachment_name ? <Row label="Attachment" value={c.attachment_name} /> : null}

        <View style={{ marginTop: 10 }}><Band>HIRER</Band></View>
        <Row label="Company name" value={c.company_name} />
        <Row label="ABN" value={c.abn} />
        <Row label="Contact" value={[c.client_name, c.contact_position].filter(Boolean).join(", ")} />
        <Row label="Email" value={c.email} />
        <Row label="Payment terms" value={c.payment_terms} />

        <View style={{ marginTop: 10 }}><Band>THIS HIRE</Band></View>
        <Row label="Agreement date" value={showDate(c.agreement_date)} />
        <Row label="Delivery address" value={c.site_address} />
        <Row label="Delivery date" value={c.delivery_date ? showDate(c.delivery_date) : "To be confirmed"} />
        <Row label="Delivery cost" value={c.delivery_cost ? money(c.delivery_cost) : "—"} />
        <Row label="Pick up cost" value={c.pickup_cost ? money(c.pickup_cost) : "—"} />
        <Row label="Standard Hire Rate" value={rate ? money(rate) + " per calendar month" : "—"} />
        <Row label="Minimum hire" value={c.minimum_hire_months ? c.minimum_hire_months + " months" : "—"} />
        <Row label="Discount applied"
          value={c.discount ? c.discount + (c.discount_type === "%" ? "% per month, compounding" : " per month") : "—"} />

        <View style={{ marginTop: 10 }}><Band>FEES</Band></View>
        <Row label="Maintenance Levy" value="3.5% of the Standard Hire Rate" />
        <Row label="Environmental Levy" value="1.5% of the Standard Hire Rate" />
        <Row label="Damage Waiver" value={waiver ? "Accepted  ·  7.5% of the Standard Hire Rate" : "Declined"} />
        <Row label="Damage Waiver Excess" value={c.damage_waiver_excess ? money(c.damage_waiver_excess) : "—"} />

        {c.notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={s.ch}>Notes</Text>
            <Text style={s.cb}>{c.notes}</Text>
          </View>
        ) : null}

        <View style={s.sigWrap}>
          <View style={s.sigRow}>
            <View style={s.sigCell}><View style={s.sigLine} /><Text style={s.sigLbl}>Signed for and on behalf of the Hirer</Text></View>
            <View style={s.sigCell}><View style={s.sigLine} /><Text style={s.sigLbl}>Position</Text></View>
          </View>
          <View style={s.sigRow}>
            <View style={s.sigCell}><View style={s.sigLine} /><Text style={s.sigLbl}>Print name</Text></View>
            <View style={s.sigCell}><View style={s.sigLine} /><Text style={s.sigLbl}>Date</Text></View>
          </View>
        </View>

        <Text style={s.foot} fixed>
          LONG TERM HIRE Pty Ltd  ·  ABN 83 246 158 161  ·  {c.contract_no || "Draft"}
        </Text>
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Terms and Conditions of Hire</Text>
        {TERMS.map(([heading, body]) => (
          <View key={heading} style={s.clause} wrap={false}>
            <Text style={s.ch}>{heading}</Text>
            <Text style={s.cb}>{body}</Text>
          </View>
        ))}
        <Text style={s.note}>
          These Terms and Conditions form part of the Hire Agreement identified above and
          replace all previously issued terms.
        </Text>
        <Text style={s.foot} fixed>
          LONG TERM HIRE Pty Ltd  ·  ABN 83 246 158 161  ·  {c.contract_no || "Draft"}
        </Text>
      </Page>
    </Document>
  );
};

export default ContractPDF;
