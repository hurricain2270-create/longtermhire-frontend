// @ts-nocheck
import React from "react";

const EquipmentCard = ({ equipment, onQuickView, onRequest, requestLoading }) => {
  const mainImage = equipment.images?.find(img => img.is_main === 1 || img.is_main === true)?.image_url || equipment.images?.[0]?.image_url;
  const isLoading = requestLoading?.[equipment.id];
  const price = equipment.monthly_price || equipment.base_price || 0;

  return (
    <div className="bg-[#1F1F20] border border-[#333] rounded-xl overflow-hidden hover:border-[#FDCE06] transition-colors">
      {mainImage ? (
        <img src={mainImage} alt={equipment.equipment_name} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-[#292A2B] flex items-center justify-center">
          <span className="text-[#555] text-sm">No image</span>
        </div>
      )}
      <div className="p-4">
        <p className="text-[#9CA3AF] text-xs mb-1">{equipment.category_name}</p>
        <h3 className="text-[#E5E5E5] font-semibold text-sm mb-1 font-[Inter]">{equipment.equipment_name}</h3>
        <p className="text-[#FDCE06] font-bold text-sm mb-1">${parseFloat(String(price)).toLocaleString()}<span className="text-[#9CA3AF] font-normal">/month</span></p>
        <p className="text-[#9CA3AF] text-xs mb-3">Min: {equipment.minimum_duration || "3 Months"}</p>
        {equipment.availability === false || equipment.availability === 0 ? (
          <p className="text-orange-400 text-xs font-medium">{equipment.unavailability_due_month ? `Available from ${equipment.unavailability_due_month}` : "Currently unavailable"}</p>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => onQuickView(equipment)} className="flex-1 py-1.5 border border-[#444] text-[#9CA3AF] rounded text-xs hover:text-[#E5E5E5] hover:border-[#666] transition-colors">Quick View</button>
            <button onClick={() => onRequest(equipment)} disabled={isLoading} className="flex-1 py-1.5 bg-[#FDCE06] text-black rounded text-xs font-bold hover:bg-[#E5B800] transition-colors disabled:opacity-50">{isLoading ? "..." : "Request"}</button>
          </div>
        )}
      </div>
    </div>
  );
};
export default EquipmentCard;
