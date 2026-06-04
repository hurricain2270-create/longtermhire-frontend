// @ts-nocheck
import React from "react";

const EquipmentDetailsModal = ({ isOpen, onClose, equipment, onEdit }) => {
  if (!isOpen || !equipment) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-[#E5E5E5] font-bold text-lg font-[Inter]">Equipment Details</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {[["Equipment ID", equipment.equipment_id],["Equipment Name", equipment.equipment_name],["Category", equipment.category_name],["Base Price", `$${equipment.base_price}/month`],["Min Duration", equipment.minimum_duration],["Availability", equipment.availability ? "Available" : "Unavailable"]].map(([k, v]) => (
            <div key={k}><p className="text-[#9CA3AF] text-xs uppercase tracking-wide mb-0.5">{k}</p><p className="text-[#E5E5E5] text-sm">{v || "—"}</p></div>
          ))}
          {equipment.images?.length > 0 && (
            <div><p className="text-[#9CA3AF] text-xs uppercase tracking-wide mb-2">Images</p>
              <div className="grid grid-cols-3 gap-2">{equipment.images.map((img, i) => <img key={i} src={img.image_url} className="w-full h-20 object-cover rounded border border-[#333]" />)}</div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[#333] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-[#444] text-[#9CA3AF] rounded-md text-sm">Close</button>
          <button onClick={() => { onClose(); onEdit(equipment); }} className="px-5 py-2 bg-[#FDCE06] text-black rounded-md text-sm font-bold">Edit</button>
        </div>
      </div>
    </div>
  );
};
export default EquipmentDetailsModal;
