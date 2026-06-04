// @ts-nocheck
import React, { useState, useEffect } from "react";

const EditQuoteModal = ({ isOpen, onClose, onSave, quote }) => {
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (quote) setItems(Array.isArray(quote.items) ? quote.items : []); }, [quote]);

  const updateItem = (i, field, val) => setItems(prev => { const updated = [...prev]; updated[i] = { ...updated[i], [field]: val }; return updated; });

  const handleSave = async () => {
    setSaving(true);
    try { await onSave({ ...quote, items }, quote.id); onClose(); } finally { setSaving(false); }
  };

  if (!isOpen || !quote) return null;
  const inp = "w-full bg-[#292A2B] border border-[#333] rounded-md text-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#FDCE06]";
  const lbl = "block text-[#9CA3AF] text-xs mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-[#E5E5E5] font-bold text-lg">Edit Quote</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white">✕</button>
        </div>
        <div className="px-6 py-4">
          <p className="text-[#9CA3AF] text-sm mb-3">Client: <span className="text-[#E5E5E5]">{quote.company_name}</span></p>
          {items.map((item, i) => (
            <div key={i} className="bg-[#292A2B] border border-[#333] rounded-lg p-3 mb-2 grid grid-cols-2 gap-2">
              <div><label className={lbl}>Equipment</label><input className={inp} value={item.equipment_name || ""} onChange={e => updateItem(i, "equipment_name", e.target.value)} /></div>
              <div><label className={lbl}>Qty</label><input type="number" className={inp} value={item.quantity || 1} onChange={e => updateItem(i, "quantity", e.target.value)} /></div>
              <div><label className={lbl}>Unit Price</label><input type="number" className={inp} value={item.unit_price || ""} onChange={e => updateItem(i, "unit_price", e.target.value)} /></div>
              <div><label className={lbl}>Duration</label><input className={inp} value={item.duration || ""} onChange={e => updateItem(i, "duration", e.target.value)} /></div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-[#333] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-[#444] text-[#9CA3AF] rounded-md text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#FDCE06] text-black rounded-md text-sm font-bold disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
};
export default EditQuoteModal;
