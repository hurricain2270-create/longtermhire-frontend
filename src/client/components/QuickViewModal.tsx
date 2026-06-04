// @ts-nocheck
import React from "react";

const QuickViewModal = ({ isOpen, onClose, equipment, formatCurrency }) => {
  if (!isOpen || !equipment) return null;
  const images = equipment.images || [];
  const mainImage = images.find(img => img.is_main === 1 || img.is_main === true)?.image_url || images[0]?.image_url;
  const price = equipment.monthly_price || equipment.base_price || 0;
  const fmt = formatCurrency || (v => `$${parseFloat(String(v)).toLocaleString()}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-[#E5E5E5] font-bold text-lg font-[Inter]">{equipment.equipment_name}</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white">✕</button>
        </div>
        {mainImage && <img src={mainImage} alt={equipment.equipment_name} className="w-full h-48 object-cover" />}
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#9CA3AF] text-sm">Monthly Rate</span>
            <span className="text-[#FDCE06] font-bold text-lg">{fmt(price)}<span className="text-[#9CA3AF] font-normal text-sm">/month</span></span>
          </div>
          {[["Category", equipment.category_name],["Equipment ID", equipment.equipment_id],["Min Duration", equipment.minimum_duration || "3 Months"],["Status", equipment.availability ? "Available" : "Unavailable"]].map(([k, v]) => v ? (
            <div key={k} className="flex items-center justify-between">
              <span className="text-[#9CA3AF] text-sm">{k}</span>
              <span className="text-[#E5E5E5] text-sm">{v}</span>
            </div>
          ) : null)}
          {equipment.description && (
            <div><p className="text-[#9CA3AF] text-xs uppercase tracking-wide mb-1">Description</p>
              <div className="text-[#E5E5E5] text-sm" dangerouslySetInnerHTML={{ __html: Array.isArray(equipment.description) ? equipment.description.join("<br>") : equipment.description }} />
            </div>
          )}
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {images.map((img, i) => <img key={i} src={img.image_url} className="w-full h-16 object-cover rounded border border-[#333]" />)}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[#333]">
          <button onClick={onClose} className="w-full py-2 bg-[#FDCE06] text-black rounded-md font-bold text-sm">Close</button>
        </div>
      </div>
    </div>
  );
};
export default QuickViewModal;
