// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";
import api from "./services/api";
import { PDFViewer } from "@react-pdf/renderer";
import ContractPDF from "./components/ContractPDF";
import { PDFViewer } from "@react-pdf/renderer";
import ContractPDF from "./components/ContractPDF";
import { clientApi } from "./services/clientApi";
import { equipmentApi } from "./services/equipmentApi";

const LBL = "text-[#9CA3AF] font-[Inter] text-[13px]";
const BOX =
  "w-full bg-[#292A2B] border border-[#333333] rounded px-3 py-2 text-[#E5E5E5] font-[Inter] text-[13px] outline-none focus:border-[#FDCE06] transition-colors";
const NEED =
  "w-full bg-[#3a2e00] border border-[#5a4800] rounded px-3 py-2 text-[#E5E5E5] font-[Inter] text-[13px] outline-none focus:border-[#FDCE06] transition-colors";

const PAYMENT_TERMS = [
  "Payment before Delivery",
  "Due on Invoice",
  "30 days from end of Month",
];

const BLANK = {
  client_user_id: "",
  equipment_id: "",
  attachment_equipment_id: "",
  agreement_date: "",
  signed_date: "",
  delivery_date: "",
  hire_start_date: "",
  site_address: "",
  delivery_cost: "",
  pickup_cost: "",
  standard_hire_rate: "",
  discount: "",
  discount_type: "%",
  minimum_hire_months: "",
  hours_at_signing: "",
  damage_waiver_accepted: 1,
  damage_waiver_excess: "",
  notes: "",
  status: "draft",
  // write-back fields, held here but saved to the client / equipment record
  abn: "",
  contact_position: "",
  payment_terms: "30 days from end of Month",
  model: "",
  year_made: "",
  fuel_type: "",
};

// At module scope so inputs keep focus while typing — see Maintenance.tsx
const Row = ({ label, children, tag }) => (
  <div className="grid grid-cols-[170px_1fr_110px] gap-3 items-center py-2 border-b border-[#252525] last:border-0">
    <span className={LBL}>{label}</span>
    <div>{children}</div>
    <div className="text-right">{tag}</div>
  </div>
);

const Tag = ({ kind }) => {
  const map = {
    auto: ["from system", "bg-[#1a3a1a] text-[#4CAF50] border-[#2d5a2d]"],
    need: ["saves back", "bg-[#3a2e00] text-[#FDCE06] border-[#5a4800]"],
    hire: ["this hire", "bg-[#292A2B] text-[#9CA3AF] border-[#333]"],
    fixed: ["fixed", "bg-[#252525] text-[#666] border-[#333]"],
  };
  const [text, cls] = map[kind] || map.hire;
  return <span className={"text-[10px] px-2 py-0.5 rounded-full border font-[Inter] " + cls}>{text}</span>;
};

const Section = ({ n, title, children, note }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-2">
      <span className="w-5 h-5 rounded-full bg-[#292A2B] text-[#9CA3AF] text-[11px] flex items-center justify-center font-[Inter]">{n}</span>
      <h2 className="text-[#E5E5E5] font-[Inter] font-bold text-[15px]">{title}</h2>
      {note ? <span className="ml-auto text-[11px] text-[#6B7280] font-[Inter]">{note}</span> : null}
    </div>
    <div className="bg-[#1F1F20] border border-[#333] rounded-lg px-4 py-1">{children}</div>
  </div>
);


const ContractSetup = () => {
  const [view, setView] = useState("list");
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [editingContractNo, setEditingContractNo] = useState(null);
  const [contractNo, setContractNo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executeDoc, setExecuteDoc] = useState(null);
  const [executeDoc, setExecuteDoc] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [cRes, clRes, eqRes] = await Promise.all([
        api.get("/v1/api/longtermhire/super_admin/contracts"),
        clientApi.getClients(1, 200, {}),
        equipmentApi.getEquipment(1, 300, {}),
      ]);
      if (cRes?.data && !cRes.data.error) setContracts(cRes.data.data || []);
      setClients(clRes?.data || []);
      setEquipment(eqRes?.data || []);
    } catch (e) {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const client = clients.find((c) => String(c.user_id) === String(form.client_user_id));
  const plant = equipment.find((e) => String(e.id) === String(form.equipment_id));

  // pull what the system already holds when a selection is made
  const pickClient = (userId) => {
    const c = clients.find((x) => String(x.user_id) === String(userId));
    setForm((f) => ({
      ...f,
      client_user_id: userId,
      abn: c?.abn || "",
      contact_position: c?.contact_position || "",
      payment_terms: c?.payment_terms || "30 days from end of Month",
    }));
  };

  const pickPlant = (id) => {
    const e = equipment.find((x) => String(x.id) === String(id));
    setForm((f) => ({
      ...f,
      equipment_id: id,
      model: e?.model || "",
      year_made: e?.year_made || "",
      fuel_type: e?.fuel_type || "",
      standard_hire_rate: f.standard_hire_rate || e?.base_price || "",
      damage_waiver_excess: f.damage_waiver_excess || e?.waiver_excess || "",
    }));
  };

  // fields that must still be typed
  const outstanding = () => {
    const miss = [];
    if (!form.client_user_id) miss.push("company");
    if (!form.equipment_id) miss.push("plant");
    if (!form.abn) miss.push("ABN");
    if (!form.contact_position) miss.push("position");
    if (!form.model) miss.push("model");
    if (!form.year_made) miss.push("year");
    if (!form.standard_hire_rate) miss.push("hire rate");
    if (!form.site_address) miss.push("site address");
    if (!form.damage_waiver_excess) miss.push("waiver excess");
    return miss;
  };

  const startNew = () => {
    setForm({ ...BLANK, agreement_date: new Date().toISOString().slice(0, 10) });
    setContractNo("");
    setEditingId(null);
    setEditingContractNo(null);
    setView("edit");
  };

  const openContract = async (row) => {
    setForm({
      ...BLANK,
      ...Object.fromEntries(
        Object.keys(BLANK).map((k) => [k, row[k] ?? BLANK[k]])
      ),
      client_user_id: row.client_user_id || "",
      equipment_id: row.equipment_id || "",
      abn: row.abn || "",
      contact_position: row.contact_position || "",
      model: row.model || "",
      year_made: row.year_made || "",
      fuel_type: row.fuel_type || "",
      agreement_date: (row.agreement_date || "").slice(0, 10),
      signed_date: (row.signed_date || "").slice(0, 10),
      delivery_date: (row.delivery_date || "").slice(0, 10),
      hire_start_date: (row.hire_start_date || "").slice(0, 10),
    });
    setContractNo(row.contract_no || "");
    setEditingId(row.id);
    setEditingContractNo(row.contract_no);
    setView("edit");
  };

  // facts about a thing save back; decisions about this deal stay on the contract
  const writeBack = async () => {
    try {
      if (client && (form.abn !== (client.abn || "") ||
                     form.contact_position !== (client.contact_position || "") ||
                     form.payment_terms !== (client.payment_terms || ""))) {
        await clientApi.updateClient(client.id, {
          client_name: client.client_name,
          company_name: client.company_name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          street: client.street,
          suburb: client.suburb,
          state: client.state,
          postcode: client.postcode,
          abn: form.abn,
          contact_position: form.contact_position,
          payment_terms: form.payment_terms,
        });
      }
      if (plant && (form.model !== (plant.model || "") ||
                    form.year_made !== (plant.year_made || "") ||
                    form.fuel_type !== (plant.fuel_type || "") ||
                    String(form.damage_waiver_excess) !== String(plant.waiver_excess || ""))) {
        await equipmentApi.updateEquipment(plant.id, {
          categoryId: plant.category_id,
          category: plant.category_name,
          equipmentId: plant.equipment_id,
          equipmentName: plant.equipment_name,
          basePrice: plant.base_price,
          minimumDuration: plant.minimum_duration,
          position: plant.position,
          availability: plant.availability,
          ownership_status: plant.ownership_status,
          model: form.model,
          year_made: form.year_made,
          fuel_type: form.fuel_type,
          previous_code: plant.previous_code,
          waiver_excess: form.damage_waiver_excess,
        });
      }
    } catch (e) {
      console.error("Write-back failed:", e);
      toast.info("Contract saved, but the client or equipment record could not be updated");
    }
  };

  const execute = () => {
    if (!client || !plant) {
      toast.error("Choose a company and a plant item first");
      return;
    }
    const attach = equipment.find(
      (e) => String(e.id) === String(form.attachment_equipment_id)
    );
    setExecuteDoc({
      ...form,
      contract_no: contractNo || "Draft",
      company_name: client.company_name,
      client_name: client.client_name,
      email: client.email,
      plant_code: plant.equipment_id,
      equipment_name: plant.equipment_name,
      attachment_name: attach
        ? attach.equipment_id + " — " + attach.equipment_name
        : null,
      maintenance_levy: "3.50",
      environmental_levy: "1.50",
      damage_waiver_rate: "7.50",
    });
  };

  // Everything the document needs, pulled from the record and the two lookups
  const buildDoc = () => {
    const attachment = equipment.find(
      (e) => String(e.id) === String(form.attachment_equipment_id)
    );
    return {
      ...form,
      contract_no: editingContractNo,
      company_name: client?.company_name,
      client_name: client?.client_name,
      email: client?.email,
      plant_code: plant?.equipment_id,
      equipment_name: plant?.equipment_name,
      attachment_name: attachment
        ? attachment.equipment_id + " — " + attachment.equipment_name
        : null,
      logo: "/login-logo.png",
    };
  };

  const save = async () => {
    if (!form.client_user_id || !form.equipment_id) {
      toast.error("Choose a company and a plant item first");
      return;
    }
    try {
      setSaving(true);
      const body = { ...form };
      delete body.abn; delete body.contact_position; delete body.payment_terms;
      delete body.model; delete body.year_made; delete body.fuel_type;

      if (editingId) {
        await api.put(`/v1/api/longtermhire/super_admin/contracts/${editingId}`, body);
        toast.success("Contract updated");
      } else {
        const res = await api.post("/v1/api/longtermhire/super_admin/contracts", body);
        const made = res?.data?.data?.contract_no || "";
        setContractNo(made);
        toast.success("Contract created — " + made);
      }
      await writeBack();
      await loadAll();
      setView("list");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to save contract");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><ClipLoader color="#FDCE06" size={40} /></div>;
  }

  if (view === "list") {
    return (
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[36px] leading-[1.11em] mb-1">Contract set up</h1>
            <p className="text-[#9CA3AF] font-[Inter] text-sm">Every field the hire agreement needs, in the order it appears on the document.</p>
          </div>
          <button onClick={startNew}
            className="px-4 py-2 rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#E5B800] transition-colors whitespace-nowrap">
            New contract
          </button>
        </div>

        <div className="bg-[#1F1F20] border border-[#333] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF] w-40">Contract</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF]">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF]">Plant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF] w-28">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#9CA3AF] w-24"></th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#9CA3AF] text-sm font-[Inter]">No contracts yet.</td></tr>
              ) : contracts.map((row) => (
                <tr key={row.id} className="border-b border-[#1a1a1a] last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-[#FDCE06] font-[Inter]">{row.contract_no}</td>
                  <td className="px-4 py-3 text-sm text-[#E5E5E5] font-[Inter]">{row.company_name}</td>
                  <td className="px-4 py-3 text-sm text-[#9CA3AF] font-[Inter]">{row.plant_code} — {row.equipment_name}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded-full border bg-[#292A2B] text-[#9CA3AF] border-[#333] font-[Inter]">{row.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openContract(row)}
                      className="px-3 py-1.5 rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#E5B800] transition-colors">
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      </div>
    );
  }

  const miss = outstanding();

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[28px] leading-[1.2em] mb-1">
            {editingId ? "Contract" : "New contract"}
          </h1>
          <p className="text-[#9CA3AF] font-[Inter] text-sm">Work down the page. Amber fields are typed once and kept for next time.</p>
        </div>
        <button onClick={() => setView("list")}
          className="px-3 py-1.5 border border-[#444] rounded text-[#E5E5E5] font-[Inter] font-bold text-[13px] hover:border-[#666] transition-colors whitespace-nowrap">
          Back
        </button>
      </div>

      <Section n="1" title="Hirer">
        <Row label="Company" tag={null}>
          <select className={BOX} value={form.client_user_id} onChange={(e) => pickClient(e.target.value)}>
            <option value="">Select a company</option>
            {clients.map((c) => <option key={c.id} value={c.user_id}>{c.company_name}</option>)}
          </select>
        </Row>
        {client && (
          <>
            <Row label="Contact" tag={<Tag kind="auto" />}>
              <div className={BOX + " opacity-70"}>{client.client_name}</div>
            </Row>
            <Row label="Position" tag={<Tag kind={client.contact_position ? "auto" : "need"} />}>
              <input className={client.contact_position ? BOX : NEED} value={form.contact_position}
                onChange={(e) => set("contact_position", e.target.value)} placeholder="Director" />
            </Row>
            <Row label="ABN" tag={<Tag kind={client.abn ? "auto" : "need"} />}>
              <input className={client.abn ? BOX : NEED} value={form.abn}
                onChange={(e) => set("abn", e.target.value)} placeholder="00 000 000 000" />
            </Row>
            <Row label="Payment terms" tag={<Tag kind={client.payment_terms ? "auto" : "need"} />}>
              <select
                className={BOX}
                value={form.payment_terms}
                onChange={(e) => set("payment_terms", e.target.value)}
              >
                {form.payment_terms && !PAYMENT_TERMS.includes(form.payment_terms) && (
                  <option value={form.payment_terms}>{form.payment_terms}</option>
                )}
                {PAYMENT_TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
          </>
        )}
      </Section>

      <Section n="2" title="Equipment">
        <Row label="Plant" tag={null}>
          <select className={BOX} value={form.equipment_id} onChange={(e) => pickPlant(e.target.value)}>
            <option value="">Select a plant item</option>
            {equipment.map((e) => <option key={e.id} value={e.id}>{e.equipment_id} — {e.equipment_name}</option>)}
          </select>
        </Row>
        {plant && (
          <>
            <Row label="Model" tag={<Tag kind={plant.model ? "auto" : "need"} />}>
              <input className={plant.model ? BOX : NEED} value={form.model} onChange={(e) => set("model", e.target.value)} />
            </Row>
            <Row label="Year" tag={<Tag kind={plant.year_made ? "auto" : "need"} />}>
              <input className={plant.year_made ? BOX : NEED} value={form.year_made} onChange={(e) => set("year_made", e.target.value)} />
            </Row>
            <Row label="Fuel type" tag={<Tag kind={plant.fuel_type ? "auto" : "need"} />}>
              <input className={plant.fuel_type ? BOX : NEED} value={form.fuel_type} onChange={(e) => set("fuel_type", e.target.value)} placeholder="Diesel" />
            </Row>
            <Row label="Hours at signing" tag={<Tag kind="hire" />}>
              <input className={BOX} value={form.hours_at_signing} onChange={(e) => set("hours_at_signing", e.target.value)} placeholder="200 hrs" />
            </Row>
            <Row label="Attachment" tag={<Tag kind="hire" />}>
              <select className={BOX} value={form.attachment_equipment_id} onChange={(e) => set("attachment_equipment_id", e.target.value)}>
                <option value="">None</option>
                {equipment.filter((e) => String(e.id) !== String(form.equipment_id))
                  .map((e) => <option key={e.id} value={e.id}>{e.equipment_id} — {e.equipment_name}</option>)}
              </select>
            </Row>
          </>
        )}
      </Section>

      <Section n="3" title="Rates and term">
        <Row label="Standard hire rate" tag={<Tag kind="hire" />}>
          <input className={form.standard_hire_rate ? BOX : NEED} value={form.standard_hire_rate}
            onChange={(e) => set("standard_hire_rate", e.target.value)} placeholder="6000.00" />
        </Row>
        <Row label="Discount" tag={<Tag kind="hire" />}>
          <div className="flex gap-2">
            <input className={BOX} value={form.discount} onChange={(e) => set("discount", e.target.value)} placeholder="1" />
            <select className={BOX + " w-28"} value={form.discount_type} onChange={(e) => set("discount_type", e.target.value)}>
              <option value="%">% per month</option>
              <option value="$">$ per month</option>
            </select>
          </div>
        </Row>
        <Row label="Minimum hire" tag={<Tag kind="hire" />}>
          <input className={BOX} value={form.minimum_hire_months} onChange={(e) => set("minimum_hire_months", e.target.value)} placeholder="3" />
        </Row>
      </Section>

      <Section n="4" title="Dates" note="fill in as they happen">
        <Row label="Agreement date" tag={<Tag kind="hire" />}>
          <input type="date" className={BOX} value={form.agreement_date} onChange={(e) => set("agreement_date", e.target.value)} />
        </Row>
        <Row label="Signed date" tag={<Tag kind="hire" />}>
          <input type="date" className={BOX} value={form.signed_date} onChange={(e) => set("signed_date", e.target.value)} />
        </Row>
        <Row label="Delivery date" tag={<Tag kind="hire" />}>
          <input type="date" className={BOX} value={form.delivery_date} onChange={(e) => set("delivery_date", e.target.value)} />
        </Row>
        <Row label="Hire start" tag={<Tag kind="hire" />}>
          <input type="date" className={BOX} value={form.hire_start_date} onChange={(e) => set("hire_start_date", e.target.value)} />
        </Row>
      </Section>

      <Section n="5" title="Delivery">
        <Row label="Site address" tag={<Tag kind="hire" />}>
          <input className={form.site_address ? BOX : NEED} value={form.site_address}
            onChange={(e) => set("site_address", e.target.value)} placeholder="Site, suburb, state" />
        </Row>
        <Row label="Delivery cost" tag={<Tag kind="hire" />}>
          <input className={BOX} value={form.delivery_cost} onChange={(e) => set("delivery_cost", e.target.value)} placeholder="650.00" />
        </Row>
        <Row label="Pick up cost" tag={<Tag kind="hire" />}>
          <input className={BOX} value={form.pickup_cost} onChange={(e) => set("pickup_cost", e.target.value)} placeholder="650.00" />
        </Row>
      </Section>

      <Section n="6" title="Fees">
        <Row label="Maintenance levy" tag={<Tag kind="fixed" />}>
          <div className={BOX + " opacity-60"}>3.5% of the standard hire rate</div>
        </Row>
        <Row label="Environmental levy" tag={<Tag kind="fixed" />}>
          <div className={BOX + " opacity-60"}>1.5% of the standard hire rate</div>
        </Row>
        <Row label="Damage waiver" tag={<Tag kind="hire" />}>
          <select className={BOX} value={form.damage_waiver_accepted}
            onChange={(e) => set("damage_waiver_accepted", parseInt(e.target.value))}>
            <option value={1}>Accepted — 7.5%</option>
            <option value={0}>Declined</option>
          </select>
        </Row>
        <Row label="Waiver excess" tag={<Tag kind={plant?.waiver_excess ? "auto" : "need"} />}>
          <input className={form.damage_waiver_excess ? BOX : NEED} value={form.damage_waiver_excess}
            onChange={(e) => set("damage_waiver_excess", e.target.value)} placeholder="2500.00" />
        </Row>
      </Section>

      <Section n="7" title="Notes" note="optional">
        <div className="py-2">
          <textarea className={BOX + " resize-none"} rows={3} value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything specific to this hire — prints under the schedule." />
        </div>
      </Section>

      <div className="bg-[#1F1F20] border border-[#333] rounded-lg px-4 py-3 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[#E5E5E5] font-[Inter] text-[13px] font-medium">
            {miss.length === 0 ? "All fields complete" : miss.length + " field" + (miss.length === 1 ? "" : "s") + " still to fill"}
          </div>
          {miss.length > 0 && (
            <div className="text-[#9CA3AF] font-[Inter] text-[12px] mt-0.5">{miss.join(", ")}</div>
          )}
        </div>
        <button onClick={save} disabled={saving}
          className="px-4 py-2 rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#E5B800] disabled:opacity-50 transition-colors whitespace-nowrap">
          {saving ? "Saving..." : editingId ? "Save changes" : "Save draft"}
        </button>
        <button
          onClick={() => {
            if (!form.client_user_id || !form.equipment_id) {
              toast.error("Choose a company and a plant item first");
              return;
            }
            setExecuteDoc(buildDoc());
          }}
          className="px-4 py-2 rounded bg-[#4CAF50] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#3d9e43] transition-colors whitespace-nowrap"
        >
          Execute
        </button>
        <button onClick={execute}
          className="px-4 py-2 rounded bg-[#4CAF50] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#3d9e43] transition-colors whitespace-nowrap">
          Execute
        </button>
      </div>

      {executeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-[#1F1F20] border border-[#333] rounded-lg w-full max-w-4xl h-[92vh] flex flex-col">
            <div className="px-5 py-3 border-b border-[#333] flex items-center justify-between">
              <div>
                <h3 className="text-[#E5E5E5] font-[Inter] font-bold text-[16px]">
                  Hire Agreement — {executeDoc.contract_no}
                </h3>
                <p className="text-[#6B7280] font-[Inter] text-xs mt-0.5">
                  Use the viewer controls to save or print.
                </p>
              </div>
              <button onClick={() => setExecuteDoc(null)}
                className="text-[#9CA3AF] hover:text-white text-xl leading-none px-2">✕</button>
            </div>
            <div className="flex-1 bg-[#525659]">
              <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
                <ContractPDF data={executeDoc} />
              </PDFViewer>
            </div>
          </div>
        </div>
      )}

      {executeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#1F1F20] border border-[#333] rounded-lg w-full max-w-5xl h-[92vh] flex flex-col">
            <div className="px-5 py-3 border-b border-[#333] flex items-center justify-between">
              <div>
                <h3 className="text-[#E5E5E5] font-[Inter] font-bold text-[16px]">
                  Hire Agreement {executeDoc.contract_no || "(draft)"}
                </h3>
                <p className="text-[#6B7280] font-[Inter] text-xs mt-0.5">
                  {executeDoc.company_name} · {executeDoc.equipment_name}
                </p>
              </div>
              <button onClick={() => setExecuteDoc(null)}
                className="text-[#9CA3AF] hover:text-white text-xl leading-none px-2">✕</button>
            </div>
            <div className="flex-1 bg-[#525659]">
              <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
                <ContractPDF contract={executeDoc} />
              </PDFViewer>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
};

export default ContractSetup;
