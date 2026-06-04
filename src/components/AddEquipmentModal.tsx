// @ts-nocheck
import React, { useState } from "react";
import { equipmentApi } from "../services/equipmentApi";
import { BASE_URL } from "../services/apiConfig";

const AddEquipmentModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({ category_id: "", category_name: "", equipment_id: "", equipment_name: "", base_price: "", minimum_duration: "3 Months", availability: true });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => { setForm({ category_id: "", category_name: "", equipment_id: "", equipment_name: "", base_price: "", minimum_duration: "3 Months", availability: true }); setImages([]); };

  const handleClose = () => { reset(); onClose(); };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const data = await equipmentApi.uploadFile(file);
      const url = data.data?.url || data.url;
      if (url) setImages(prev => [...prev, { image_url: url, caption: file.name, is_main: prev.length === 0 ? 1 : 0 }]);
    } finally { setUploading(false); e.target.value = ""; }
  };

  const handleSave = async () => {
    if (!form.equipment_name || !form.base_price) return;
    setSaving(true);
    try { await onSave({ ...form, images }); reset(); } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  const inp = "w-full bg-[#292A2B] border border-[#333] rounded-md text-[#E5E5E5] px-3 py-2 text-sm font-[Inter] outline-none focus:border-[#FDCE06]";
  const lbl = "block text-[#9CA3AF] text-xs font-[Inter] mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-[#E5E5E5] font-bold text-lg font-[Inter]">Add Equipment</h2>
          <button onClick={handleClose} className="text-[#9CA3AF] hover:text-white">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {[["Category ID","category_id"],["Category Name","category_name"],["Equipment ID","equipment_id"],["Equipment Name","equipment_name"],["Base Price ($/month)","base_price"],["Minimum Duration","minimum_duration"]].map(([label, key]) => (
            <div key={key}><label className={lbl}>{label}</label><input className={inp} value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))} /></div>
          ))}
          <div><label className={lbl}>Availability</label>
            <select className={inp} value={form.availability ? "1" : "0"} onChange={e => setForm(p => ({...p, availability: e.target.value === "1"}))}>
              <option value="1">Available</option><option value="0">Unavailable</option>
            </select>
          </div>
          <div><label className={lbl}>Images</label>
            <label className="flex items-center gap-2 border border-dashed border-[#444] rounded-md px-3 py-2 cursor-pointer hover:border-[#FDCE06]">
              <span className="text-[#9CA3AF] text-sm">{uploading ? "Uploading..." : "Upload image"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
            {images.length > 0 && <div className="mt-2 flex gap-2 flex-wrap">{images.map((img, i) => <img key={i} src={img.image_url} className="w-16 h-16 object-cover rounded border border-[#333]" />)}</div>}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#333] flex justify-end gap-3">
          <button onClick={handleClose} className="px-4 py-2 border border-[#444] text-[#9CA3AF] rounded-md text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#FDCE06] text-black rounded-md text-sm font-bold disabled:opacity-50">{saving ? "Saving..." : "Add Equipment"}</button>
        </div>
      </div>
    </div>
  );
};
export default AddEquipmentModal;
