// @ts-nocheck
import React from "react";

const ClientDetailsModal = ({ isOpen, onClose, client, clientEquipment }) => {
  if (!isOpen || !client) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <h2 className="text-[#E5E5E5] font-bold text-lg font-[Inter]">Client Details</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {[["Name", client.client_name],["Company", client.company_name],["Email", client.email],["Phone", client.phone],["Address", client.address]].map(([k, v]) => v ? (
            <div key={k}><p className="text-[#9CA3AF] text-xs uppercase tracking-wide mb-0.5">{k}</p><p className="text-[#E5E5E5] text-sm">{v}</p></div>
          ) : null)}
          {clientEquipment?.length > 0 && (
            <div><p className="text-[#9CA3AF] text-xs uppercase tracking-wide mb-2">Assigned Equipment ({clientEquipment.length})</p>
              <div className="space-y-1">{clientEquipment.map((eq, i) => <p key={i} className="text-[#E5E5E5] text-sm bg-[#292A2B] px-3 py-2 rounded">{eq.equipment_name}</p>)}</div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[#333] flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-[#FDCE06] text-black rounded-md text-sm font-bold">Close</button>
        </div>
      </div>
    </div>
  );
};
export default ClientDetailsModal;
