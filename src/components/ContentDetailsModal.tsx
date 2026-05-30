// @ts-nocheck
import React from "react";
import { isImageUrl } from "../utils/uploadUtils";

interface ContentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: any;
  onEdit: (content: any) => void;
}

const ContentDetailsModal: React.FC<ContentDetailsModalProps> = ({
  isOpen,
  onClose,
  content,
  onEdit,
}) => {
  if (!isOpen || !content) return null;

  const description = Array.isArray(content.description)
    ? content.description.join("\n\n")
    : content.description || "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1F1F20] border border-[#333333] rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333333]">
          <h2 className="text-[#E5E5E5] font-[Inter] font-bold text-lg">Content Details</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Equipment ID */}
          <div>
            <p className="text-[#9CA3AF] text-xs font-[Inter] uppercase tracking-wide mb-1">Equipment ID</p>
            <p className="text-[#E5E5E5] font-[Inter] text-sm">{content.equipment_id || "—"}</p>
          </div>

          {/* Equipment Name */}
          <div>
            <p className="text-[#9CA3AF] text-xs font-[Inter] uppercase tracking-wide mb-1">Equipment Name</p>
            <p className="text-[#E5E5E5] font-[Inter] text-sm">{content.equipment_name || "—"}</p>
          </div>

          {/* Description */}
          <div>
            <p className="text-[#9CA3AF] text-xs font-[Inter] uppercase tracking-wide mb-1">Description</p>
            <div
              className="text-[#E5E5E5] font-[Inter] text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>

          {/* Images */}
          {content.images && Array.isArray(content.images) && content.images.length > 0 && (
            <div>
              <p className="text-[#9CA3AF] text-xs font-[Inter] uppercase tracking-wide mb-2">Images</p>
              <div className="grid grid-cols-3 gap-2">
                {content.images.map((img: any, i: number) => (
                  <div key={i} className="relative">
                    <img
                      src={img.image_url}
                      alt={img.caption || "Equipment"}
                      className="w-full h-20 object-cover rounded border border-[#333333]"
                    />
                    {(img.is_main === 1 || img.is_main === true) && (
                      <span className="absolute top-1 left-1 bg-[#FDCE06] text-black text-[10px] font-bold px-1 rounded">
                        MAIN
                      </span>
                    )}
                    {img.caption && (
                      <p className="text-[#9CA3AF] text-[10px] mt-1 truncate">{img.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single image fallback */}
          {(!content.images || content.images.length === 0) && content.image_url && isImageUrl(content.image_url) && (
            <div>
              <p className="text-[#9CA3AF] text-xs font-[Inter] uppercase tracking-wide mb-2">Image</p>
              <img
                src={content.image_url}
                alt="Equipment"
                className="w-full h-40 object-cover rounded border border-[#333333]"
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#333333] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#444444] text-[#9CA3AF] rounded-md text-sm font-[Inter] hover:text-[#E5E5E5] transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => { onClose(); onEdit(content); }}
            className="px-5 py-2 bg-[#FDCE06] text-[#1F1F20] rounded-md text-sm font-[Inter] font-bold hover:bg-[#E5B800] transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentDetailsModal;
