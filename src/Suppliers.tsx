// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "./services/api";
import { BTN } from "./styles/buttons";

// The trades that actually turn up to a breakdown. Add to this as needed —
// nothing depends on the list beyond the dropdown.
const TRADES = [
  "Tyres",
  "Hydraulics",
  "Auto electrical",
  "Fitter / mechanic",
  "Towing / float",
  "Glass",
  "Welding",
  "Other",
];

const EMPTY = {
  trade: "Tyres",
  business_name: "",
  contact_name: "",
  mobile: "",
  email: "",
  area: "",
  notes: "",
};

const Suppliers = () => {
  const [data, setData] = useState({ suppliers: [], links: [], machines: [] });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openMachines, setOpenMachines] = useState(null);

  const load = async () => {
    try {
      const res = await api.get("/v1/api/longtermhire/super_admin/suppliers");
      if (res?.data && !res.data.error) setData(res.data.data);
    } catch (e) {
      console.error("Could not load suppliers:", e);
      toast.error("Could not load the suppliers");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.business_name) { toast.error("Put in a business name"); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put("/v1/api/longtermhire/super_admin/suppliers/" + editing, form);
        toast.success("Saved");
      } else {
        await api.post("/v1/api/longtermhire/super_admin/suppliers", form);
        toast.success("Supplier added");
      }
      setForm(EMPTY); setAdding(false); setEditing(null); load();
    } catch (e) {
      toast.error("Could not save that");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, name) => {
    if (!window.confirm("Remove " + name + "?")) return;
    try {
      await api.delete("/v1/api/longtermhire/super_admin/suppliers/" + id);
      load();
    } catch (e) { toast.error("Could not remove that"); }
  };

  const startEdit = (s) => {
    setForm({
      trade: s.trade, business_name: s.business_name, contact_name: s.contact_name || "",
      mobile: s.mobile || "", email: s.email || "", area: s.area || "", notes: s.notes || "",
    });
    setEditing(s.id); setAdding(true);
  };

  const machinesFor = (supplierId) =>
    (data.links || []).filter((l) => l.supplier_id === supplierId);

  const toggleMachine = async (supplierId, equipmentId) => {
    const current = machinesFor(supplierId).map((l) => l.equipment_id);
    const next = current.includes(equipmentId)
      ? current.filter((x) => x !== equipmentId)
      : [...current, equipmentId];
    // Show it straight away, put it back if the save fails.
    const before = data.links;
    setData((d) => ({
      ...d,
      links: d.links
        .filter((l) => l.supplier_id !== supplierId)
        .concat(next.map((eid) => {
          const m = d.machines.find((x) => x.id === eid) || {};
          return { supplier_id: supplierId, equipment_id: eid,
                   plant_code: m.plant_code, equipment_name: m.equipment_name };
        })),
    }));
    try {
      await api.post("/v1/api/longtermhire/super_admin/suppliers/" + supplierId + "/machines",
                     { equipment_ids: next });
    } catch (e) {
      setData((d) => ({ ...d, links: before }));
      toast.error("Could not save that");
    }
  };

  const toggleAuto = async (m) => {
    const next = m.auto_dispatch ? 0 : 1;
    setData((d) => ({
      ...d,
      machines: d.machines.map((x) => (x.id === m.id ? { ...x, auto_dispatch: next } : x)),
    }));
    try {
      await api.put("/v1/api/longtermhire/super_admin/equipment/" + m.id + "/auto-dispatch",
                    { auto_dispatch: next });
      toast.success(
        (m.plant_code || m.equipment_name) + (next ? " set to dispatch automatically" : " back to manual")
      );
    } catch (e) {
      setData((d) => ({
        ...d,
        machines: d.machines.map((x) => (x.id === m.id ? { ...x, auto_dispatch: m.auto_dispatch } : x)),
      }));
      toast.error("Could not save that");
    }
  };

  const byTrade = useMemo(() => {
    const g = {};
    (data.suppliers || []).forEach((s) => {
      if (!g[s.trade]) g[s.trade] = [];
      g[s.trade].push(s);
    });
    return Object.keys(g).sort().map((t) => ({ trade: t, rows: g[t] }));
  }, [data]);

  const autoOn = (data.machines || []).filter((m) => Number(m.auto_dispatch) === 1);

  return (
    <div className="p-4 sm:p-8 bg-[#292A2B] min-h-screen">
      <header className="mb-6">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[28px] sm:text-[36px] leading-tight">
          Suppliers
        </h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          Who fixes what, and which machines they cover. As a machine moves, change
          who is ticked against it.
        </p>
      </header>

      {!adding && (
        <button onClick={() => { setForm(EMPTY); setEditing(null); setAdding(true); }}
          className={BTN.primaryLg + " mb-6"}>
          + Add a supplier
        </button>
      )}

      {adding && (
        <section className="bg-[#1F1F20] border border-[#333333] rounded-xl p-5 mb-6 max-w-[520px]">
          <h2 className="text-[#E5E5E5] font-[Inter] text-[18px] font-semibold mb-4">
            {editing ? "Edit supplier" : "Add a supplier"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">Trade</label>
              <select value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })}
                className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5] text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06]">
                {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">Business</label>
              <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder="Bridgestone Ipswich"
                className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5] text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06]" />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">Contact</label>
              <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                placeholder="Dave"
                className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5] text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06]" />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">Mobile</label>
              <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                inputMode="tel" placeholder="0412 345 678"
                className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5] text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06]" />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                inputMode="email" placeholder="dave@example.com.au"
                className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5] text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06]" />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">Area</label>
              <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="Ipswich, Toowoomba"
                className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5] text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06]" />
            </div>
          </div>

          <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">
            Notes <span className="text-[#6B7280]">optional</span>
          </label>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="hours, what they need to know, anything worth remembering"
            className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5] text-[15px] px-3.5 py-3 outline-none focus:border-[#FDCE06] mb-5" />

          <div className="flex gap-2.5">
            <button onClick={save} disabled={saving} className={BTN.success + " flex-1"}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setAdding(false); setEditing(null); }} className={BTN.secondary}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <p className="text-[#9CA3AF] font-[Inter] text-[14px]">Loading…</p>
      ) : byTrade.length === 0 ? (
        <p className="text-[#9CA3AF] font-[Inter] text-[14px]">
          No suppliers yet. Add the first one above.
        </p>
      ) : (
        byTrade.map((g) => (
          <section key={g.trade} className="mb-6">
            <h2 className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-2.5">
              {g.trade}
            </h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {g.rows.map((s) => {
                const mine = machinesFor(s.id);
                return (
                  <div key={s.id} className="bg-[#1F1F20] border border-[#333333] rounded-xl p-5">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <div>
                        <h3 className="text-[#E5E5E5] font-[Inter] text-[17px] font-semibold">
                          {s.business_name}
                        </h3>
                        <p className="text-[#9CA3AF] font-[Inter] text-[13px] mt-0.5">
                          {[s.contact_name, s.mobile, s.area].filter(Boolean).join(" · ")}
                        </p>
                        {s.email ? (
                          <p className="text-[#6B7280] font-[Inter] text-[13px]">{s.email}</p>
                        ) : null}
                        {s.notes ? (
                          <p className="text-[#6B7280] font-[Inter] text-[13px] mt-1.5">{s.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex gap-2 flex-none">
                        <button onClick={() => startEdit(s)} className={BTN.editSm}>Edit</button>
                        <button onClick={() => remove(s.id, s.business_name)} className={BTN.dangerSm}>×</button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#9CA3AF] font-[Inter] text-[13px]">
                          Covers {mine.length} {mine.length === 1 ? "machine" : "machines"}
                        </span>
                        <button onClick={() => setOpenMachines(openMachines === s.id ? null : s.id)}
                          className="text-[#FDCE06] font-[Inter] text-[13px] hover:underline">
                          {openMachines === s.id ? "Done" : "Change"}
                        </button>
                      </div>

                      {openMachines === s.id ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-3 mt-2">
                          {(data.machines || []).map((m) => {
                            const on = mine.some((l) => l.equipment_id === m.id);
                            return (
                              <label key={m.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input type="checkbox" checked={on}
                                  onChange={() => toggleMachine(s.id, m.id)}
                                  className="w-4 h-4 accent-[#FDCE06]" />
                                <span className="text-[#E5E5E5] font-[Inter] text-[13px]">
                                  {m.plant_code} <span className="text-[#6B7280]">{m.equipment_name}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : mine.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {mine.map((l) => (
                            <span key={l.equipment_id}
                              className="px-2.5 py-1 rounded-full bg-[#292A2B] border border-[#333] text-[#9CA3AF] text-[12px]">
                              {l.plant_code}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      <section className="bg-[#1F1F20] border border-[#333333] rounded-xl p-5 mt-8">
        <h2 className="text-[#E5E5E5] font-[Inter] text-[17px] font-semibold mb-1">
          Automatic dispatch
        </h2>
        <p className="text-[#9CA3AF] font-[Inter] text-[13px] mb-4">
          Switched on, a fault on that machine goes straight to the supplier without
          waiting for you. Start with one and watch it before turning on any more.
          {autoOn.length > 0 ? " Currently on for " + autoOn.length + "." : ""}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-y-2 gap-x-4">
          {(data.machines || []).map((m) => {
            const on = Number(m.auto_dispatch) === 1;
            const covered = (data.links || []).some((l) => l.equipment_id === m.id);
            return (
              <label key={m.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={on} onChange={() => toggleAuto(m)}
                  className="w-4 h-4 accent-[#4CAF50]" />
                <span className={"font-[Inter] text-[13px] " + (on ? "text-[#E5E5E5]" : "text-[#9CA3AF]")}>
                  {m.plant_code} <span className="text-[#6B7280]">{m.equipment_name}</span>
                </span>
                {on && !covered ? (
                  <span className="text-[#F59E0B] font-[Inter] text-[11px]">no supplier</span>
                ) : null}
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Suppliers;
