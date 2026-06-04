// @ts-nocheck
import React, { useState } from "react";

const AddPricingPackageModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [form, setForm] = useState({ package_id: "", name: "", description: "", discount_type: 0, discount_value: "" });
  const reset = () => setForm({ package_id: "", name: "", description: "", discount_type: 0, discount_value: "" });
  if (!isOpen) return null;
  const inp = "w-full bg-[#292A2B] border border-[#333] rounded-md text-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#FDCE06]";
  const lbl = "block text-[#9CA3AF] text-xs mb-1";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-[#E5E5E5] font-bold text-lg">Add Pricing Package</h2>
          <button onClick={() => { reset(); onClose(); }} className="text-[#9CA3AF] hover:text-white">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {[["Package ID","package_id"],["Name","name"],["Description","description"]].map(([l, k]) => (
            <div key={k}><label className={lbl}>{l}</label><input className={inp} value={form[k]} onChange={e => setForm(p => ({...p, [k]: e.target.value}))} /></div>
          ))}
          <div><label className={lbl}>Discount Type</label>
            <select className={inp} value={form.discount_type} onChange={e => setForm(p => ({...p, discount_type: parseInt(e.target.value)}))}>
              <option value={0}>Percentage (%)</option><option value={1}>Fixed Amount ($)</option>
            </select>
          </div>
          <div><label className={lbl}>Discount Value</label><input type="number" className={inp} value={form.discount_value} onChange={e => setForm(p => ({...p, discount_value: e.target.value}))} /></div>
        </div>
        <div className="px-6 py-4 border-t border-[#333] flex justify-end gap-3">
          <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 border border-[#444] text-[#9CA3AF] rounded-md text-sm">Cancel</button>
          <button onClick={() => onSubmit(form)} disabled={loading} className="px-5 py-2 bg-[#FDCE06] text-black rounded-md text-sm font-bold disabled:opacity-50">{loading ? "Saving..." : "Add Package"}</button>
        </div>
      </div>
    </div>
  );
};
export default AddPricingPackageModal;
