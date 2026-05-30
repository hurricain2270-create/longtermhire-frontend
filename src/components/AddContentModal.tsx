// @ts-nocheck
import React, { useState } from "react";
import { equipmentApi } from "../services/equipmentApi";

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contentData: any) => Promise<void>;
  loading?: boolean;
}

const AddContentModal: React.FC<AddContentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
}) => {
  const [form, setForm] = useState({
    equipment_id: "",
    equipment_name: "",
    description: "",
  });
  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setForm({ equipment_id: "", equipment_name: "", description: "" });
    setImages([]);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.equipment_name.trim()) e.equipment_name = "Equipment name is required";
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const data = await equipmentApi.uploadFile(file);
      if (data.data?.url || data.url) {
        const url = data.data?.url || data.url;
        setImages((prev) => [
          ...prev,
          { image_url: url, caption: file.name, is_main: prev.length === 0 ? 1 : 0 },
        ]);
      }
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.is_main)) {
        updated[0].is_main = 1;
      }
      return updated;
    });
  };

  const setMainImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, is_main: i === index ? 1 : 0 }))
    );
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      await onSubmit({ ...form, images });
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333333] rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333333]">
          <h2 className="text-[#E5E5E5] font-[Inter] font-bold text-lg">Add Content</h2>
          <button onClick={handleClose} className="text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Equipment ID */}
          <div>
            <label className="block text-[#9CA3AF] text-sm font-[Inter] mb-1.5">Equipment ID</label>
            <input
              type="text"
              value={form.equipment_id}
              onChange={(e) => setForm((p) => ({ ...p, equipment_id: e.target.value }))}
              className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-2.5 text-sm font-[Inter] outline-none focus:border-[#FDCE06] transition-colors"
              placeholder="e.g. EQ-001"
            />
          </div>

          {/* Equipment Name */}
          <div>
            <label className="block text-[#9CA3AF] text-sm font-[Inter] mb-1.5">
              Equipment Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.equipment_name}
              onChange={(e) => setForm((p) => ({ ...p, equipment_name: e.target.value }))}
              className={`w-full bg-[#292A2B] border rounded-md text-[#E5E5E5] px-3 py-2.5 text-sm font-[Inter] outline-none focus:border-[#FDCE06] transition-colors ${errors.equipment_name ? "border-red-500" : "border-[#333333]"}`}
              placeholder="e.g. Excavator CAT 320"
            />
            {errors.equipment_name && <p className="text-red-400 text-xs mt-1">{errors.equipment_name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[#9CA3AF] text-sm font-[Inter] mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={4}
              className={`w-full bg-[#292A2B] border rounded-md text-[#E5E5E5] px-3 py-2.5 text-sm font-[Inter] outline-none focus:border-[#FDCE06] transition-colors resize-none ${errors.description ? "border-red-500" : "border-[#333333]"}`}
              placeholder="Enter content description..."
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-[#9CA3AF] text-sm font-[Inter] mb-1.5">Images</label>
            <label className="flex items-center gap-2 bg-[#292A2B] border border-dashed border-[#444444] rounded-md px-3 py-3 cursor-pointer hover:border-[#FDCE06] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-[#9CA3AF] text-sm font-[Inter]">
                {uploading ? "Uploading..." : "Upload image"}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>

            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img.image_url} alt={img.caption} className="w-full h-20 object-cover rounded border border-[#333333]" />
                    {img.is_main === 1 && (
                      <span className="absolute top-1 left-1 bg-[#FDCE06] text-black text-[10px] font-bold px-1 rounded">MAIN</span>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                      {img.is_main !== 1 && (
                        <button onClick={() => setMainImage(i)} className="text-[10px] bg-[#FDCE06] text-black px-1.5 py-0.5 rounded font-bold">Set Main</button>
                      )}
                      <button onClick={() => removeImage(i)} className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#333333] flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-[#444444] text-[#9CA3AF] rounded-md text-sm font-[Inter] hover:text-[#E5E5E5] hover:border-[#666666] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="px-5 py-2 bg-[#FDCE06] text-[#1F1F20] rounded-md text-sm font-[Inter] font-bold hover:bg-[#E5B800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Add Content"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddContentModal;
