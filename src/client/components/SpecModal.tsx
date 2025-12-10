import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { clientEquipmentApi } from "../../services/clientEquipmentApi";
import { toast } from "react-toastify";

interface SpecFile {
  name: string;
  url: string;
  type?: string;
}

interface SpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentId: string | number;
  equipmentName: string;
}

const SpecModal: React.FC<SpecModalProps> = ({
  isOpen,
  onClose,
  equipmentId,
  equipmentName,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [specs, setSpecs] = useState<SpecFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && equipmentId) {
      fetchSpecs();
    }
  }, [isOpen, equipmentId]);

  const fetchSpecs = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!equipmentId) {
        throw new Error("Equipment ID is required");
      }

      const response = await clientEquipmentApi.getSpecs(equipmentId);
      console.log("Specs API response:", response);

      // Get specs_files from response (handle both direct response and nested data)
      const specsFiles =
        response.specs_files || response.data?.specs_files || [];

      // If no specs files, show friendly message instead of error
      if (!specsFiles || specsFiles.length === 0) {
        setSpecs([]);
        setError(null); // Clear any previous errors
        return; // Don't show error, just show empty state
      }

      // Convert URL strings to file objects with names
      const parsedSpecs = specsFiles.map((urlOrObj: any) => {
        if (typeof urlOrObj === "string") {
          // Extract filename from URL
          const urlParts = urlOrObj.split("/");
          const filename = urlParts[urlParts.length - 1] || "document.pdf";
          return {
            name: decodeURIComponent(filename),
            url: urlOrObj,
          };
        } else if (urlOrObj && typeof urlOrObj === "object") {
          // Handle object format
          return {
            name: urlOrObj.name || urlOrObj.filename || "document.pdf",
            url: urlOrObj.url || urlOrObj.file_url || urlOrObj,
          };
        } else {
          return urlOrObj;
        }
      });

      setSpecs(parsedSpecs);
    } catch (error: any) {
      console.error("Error fetching specs", error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to load specifications. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (specs.length === 0) return;

    setDownloading(true);
    try {
      const zip = new JSZip();
      const folderName = equipmentName
        ? `${equipmentName.replace(/[^a-z0-9]/gi, "_")}_specs`
        : "specifications";
      const folder = zip.folder(folderName);

      // Fetch all files
      const promises = specs.map(async (file, index) => {
        try {
          const response = await fetch(file.url);
          const blob = await response.blob();
          const fileName = file.name || `document_${index + 1}.pdf`;
          folder?.file(fileName, blob);
        } catch (e) {
          console.error(`Failed to download ${file.name}`, e);
        }
      });

      await Promise.all(promises);

      const content = await zip.generateAsync({ type: "blob" });
      const zipName = equipmentName
        ? `${equipmentName}_specifications.zip`
        : "specifications.zip";
      saveAs(content, zipName);
      toast.success("Specifications downloaded successfully!");
    } catch (error) {
      console.error("Error creating zip", error);
      toast.error("Failed to create zip file");
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-[#1F1F20] border border-[#333333] rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#333333] flex justify-between items-center">
          <h2 className="text-[#E5E5E5] text-xl font-bold">
            Specifications: {equipmentName}
          </h2>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <ClipLoader color="#FDCE06" size={40} />
              <p className="text-[#E5E5E5] mt-4">Loading specifications...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchSpecs}
                className="px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded hover:bg-[#E5B800] transition-colors font-bold"
              >
                Retry
              </button>
            </div>
          ) : specs.length === 0 ? (
            <div className="text-[#9CA3AF] text-center py-8">
              No specification documents available.
            </div>
          ) : (
            <div className="grid gap-4">
              {specs.map((file, index) => (
                <div
                  key={index}
                  className="bg-[#2A2A2B] border border-[#333333] rounded p-4 flex items-center justify-between hover:border-[#FDCE06] transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-[#333333] p-2 rounded text-[#E5E5E5]">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="truncate">
                      <div className="text-[#E5E5E5] font-medium truncate">
                        {file.name}
                      </div>
                      <div className="text-[#9CA3AF] text-xs">Document</div>
                    </div>
                  </div>
                  <a
                    href={file.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FDCE06] hover:text-[#E5B800] font-medium text-sm px-3 py-1"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#333333] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#333333] text-[#E5E5E5] rounded hover:bg-[#404040] transition-colors font-medium"
          >
            Close
          </button>
          {specs.length > 0 && (
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded hover:bg-[#E5B800] transition-colors font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <ClipLoader size={16} color="#1F1F20" />
                  Zipping...
                </>
              ) : (
                "Download All (Zip)"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecModal;
