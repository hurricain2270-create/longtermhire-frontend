// @ts-nocheck
import React, { useState } from "react";

const AddClientModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [form, setForm] = useState({ client_name: "", company_name: "", email: "", phone: "", address: "" });
  const reset = () => setForm({ client_name: "", company_name: "", email: "", phone: "", address: "" });
  const handleClose = () => { reset(); onClose(); };
  const handleSubmit = async () => { if (!form.client_name || !form.email) return; await onSubmit(form); reset(); };

  if (!isOpen) return null;
  const inp = "w-full bg-[#292A2B] border border-[#333] rounded-md text-[#E5E5E5] px-3 py-2 text-sm font-[Inter] outline-none focus:border-[#FDCE06]";
  const lbl = "block text-[#9CA3AF] text-xs font-[Inter] mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-[#E5E5E5] font-bold text-lg font-[Inter]">Invite Client</h2>
          <button onClick={handleClose} className="text-[#9CA3AF] hover:text-white">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {[["Client Name *","client_name","text"],["Company Name *","company_name","text"],["Email *","email","email"],["Phone","phone","tel"],["Address","address","text"]].map(([label, key, type]) => (
            <div key={key}><label className={lbl}>{label}</label><input type={type} className={inp} value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))} /></div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-[#333] flex justify-end gap-3">
          <button onClick={handleClose} className="px-4 py-2 border border-[#444] text-[#9CA3AF] rounded-md text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-5 py-2 bg-[#FDCE06] text-black rounded-md text-sm font-bold disabled:opacity-50">{loading ? "Inviting..." : "Invite Client"}</button>
        </div>
      </div>
    </div>
  );
};
export default AddClientModal;
