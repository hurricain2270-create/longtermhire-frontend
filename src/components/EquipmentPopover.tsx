// @ts-nocheck
import React, { useState, useEffect } from "react";
import { equipmentApi } from "../services/equipmentApi";

const EquipmentPopover = ({ isOpen, onClose, onApply, referenceElement, selectedEquipment }) => {
  const [equipment, setEquipment] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      equipmentApi.getEquipment().then(data => { setEquipment(data.data || []); setLoading(false); }).catch(() => setLoading(false));
      setSelected(Array.isArray(selectedEquipment) ? selectedEquipment.map(e => e.id || e.equipment_id) : []);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-[#E5E5E5] font-bold text-lg font-[Inter]">Assign Equipment</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading ? <p className="text-[#9CA3AF] text-sm">Loading...</p> : equipment.map(eq => (
            <label key={eq.id} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={selected.includes(eq.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, eq.id] : prev.filter(id => id !== eq.id))} className="w-4 h-4 accent-[#FDCE06]" />
              <span className="text-[#E5E5E5] text-sm">{eq.equipment_name}</span>
            </label>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-[#333] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-[#444] text-[#9CA3AF] rounded-md text-sm">Cancel</button>
          <button onClick={() => { onApply(selected); onClose(); }} className="px-5 py-2 bg-[#FDCE06] text-black rounded-md text-sm font-bold">Apply</button>
        </div>
      </div>
    </div>
  );
};
export default EquipmentPopover;
