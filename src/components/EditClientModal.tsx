// @ts-nocheck
import React, { useState, useEffect } from "react";

const EditClientModal = ({ isOpen, onClose, onSubmit, client, loading }) => {
  const [form, setForm] = useState({ client_name: "", company_name: "", phone: "", address: "" });
  useEffect(() => { if (client) setForm({ client_name: client.client_name || "", company_name: client.company_name || "", phone: client.phone || "", address: client.address || "" }); }, [client]);

  if (!isOpen || !client) return null;
  const inp = "w-full bg-[#292A2B] border border-[#333] rounded-md text-[#E5E5E5] px-3 py-2 text-sm font-[Inter] outline-none focus:border-[#FDCE06]";
  const lbl = "block text-[#9CA3AF] text-xs font-[Inter] mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-[#E5E5E5] font-bold text-lg font-[Inter]">Edit Client</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {[["Client Name","client_name"],["Company Name","company_name"],["Phone","phone"],["Address","address"]].map(([label, key]) => (
            <div key={key}><label className={lbl}>{label}</label><input className={inp} value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))} /></div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-[#333] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-[#444] text-[#9CA3AF] rounded-md text-sm">Cancel</button>
          <button onClick={() => onSubmit(form, client.user_id || client.id)} disabled={loading} className="px-5 py-2 bg-[#FDCE06] text-black rounded-md text-sm font-bold disabled:opacity-50">{loading ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
};
export default EditClientModal;
