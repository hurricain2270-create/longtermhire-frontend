// @ts-nocheck
import React, { useState, useEffect } from "react";
import { clientApi } from "../services/clientApi";
import { equipmentApi } from "../services/equipmentApi";

const AddQuoteModal = ({ isOpen, onClose, onSave }) => {
  const [clients, setClients] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [form, setForm] = useState({ company_id: "", company_name: "", items: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      clientApi.getClients().then(d => setClients(d.data || [])).catch(() => {});
      equipmentApi.getEquipment().then(d => setEquipment(d.data || [])).catch(() => {});
    }
  }, [isOpen]);

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { equipment_id: "", equipment_name: "", quantity: 1, unit_price: "", duration: "3 Months", notes: "" }] }));
  const updateItem = (i, field, val) => setForm(p => { const items = [...p.items]; items[i] = { ...items[i], [field]: val }; return { ...p, items }; });
  const removeItem = (i) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); onClose(); setForm({ company_id: "", company_name: "", items: [] }); } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  const inp = "w-full bg-[#292A2B] border border-[#333] rounded-md text-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#FDCE06]";
  const lbl = "block text-[#9CA3AF] text-xs mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-[#E5E5E5] font-bold text-lg">Create Quote</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div><label className={lbl}>Client</label>
            <select className={inp} value={form.company_id} onChange={e => { const c = clients.find(cl => String(cl.company_id || cl.id) === e.target.value); setForm(p => ({ ...p, company_id: e.target.value, company_name: c?.company_name || "" })); }}>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.user_id || c.id} value={c.company_id || c.id}>{c.company_name} — {c.client_name}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><p className="text-[#E5E5E5] text-sm font-semibold">Quote Items</p><button onClick={addItem} className="text-xs bg-[#FDCE06] text-black px-3 py-1 rounded font-bold">+ Add Item</button></div>
            {form.items.map((item, i) => (
              <div key={i} className="bg-[#292A2B] border border-[#333] rounded-lg p-3 mb-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={lbl}>Equipment</label>
                    <select className={inp} value={item.equipment_id} onChange={e => { const eq = equipment.find(eq => String(eq.id) === e.target.value); updateItem(i, "equipment_id", e.target.value); updateItem(i, "equipment_name", eq?.equipment_name || ""); updateItem(i, "unit_price", eq?.base_price || ""); }}>
                      <option value="">Select...</option>
                      {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.equipment_name}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Qty</label><input type="number" className={inp} value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} min="1" /></div>
                  <div><label className={lbl}>Unit Price</label><input type="number" className={inp} value={item.unit_price} onChange={e => updateItem(i, "unit_price", e.target.value)} /></div>
                  <div><label className={lbl}>Duration</label><input className={inp} value={item.duration} onChange={e => updateItem(i, "duration", e.target.value)} /></div>
                </div>
                <div><label className={lbl}>Notes</label><input className={inp} value={item.notes} onChange={e => updateItem(i, "notes", e.target.value)} /></div>
                <button onClick={() => removeItem(i)} className="text-red-400 text-xs hover:text-red-300">Remove</button>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#333] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-[#444] text-[#9CA3AF] rounded-md text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#FDCE06] text-black rounded-md text-sm font-bold disabled:opacity-50">{saving ? "Saving..." : "Create Quote"}</button>
        </div>
      </div>
    </div>
  );
};
export default AddQuoteModal;
