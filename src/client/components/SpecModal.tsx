import React, { useState } from "react";
import { ClipLoader } from "react-spinners";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface SpecFile {
    name: string;
    url: string;
    type?: string;
}

interface SpecModalProps {
    isOpen: boolean;
    onClose: () => void;
    files: SpecFile[] | string; // Can be array or JSON string
    equipmentName: string;
}

const SpecModal: React.FC<SpecModalProps> = ({ isOpen, onClose, files, equipmentName }) => {
    const [downloading, setDownloading] = useState(false);

    if (!isOpen) return null;

    // Parse files if string
    let parsedFiles: SpecFile[] = [];
    if (typeof files === "string") {
        try {
            parsedFiles = JSON.parse(files);
        } catch (e) {
            console.error("Error parsing spec files", e);
            parsedFiles = [];
        }
    } else if (Array.isArray(files)) {
        parsedFiles = files;
    }

    const handleDownloadAll = async () => {
        if (parsedFiles.length === 0) return;

        setDownloading(true);
        try {
            const zip = new JSZip();
            const folder = zip.folder(`${equipmentName.replace(/[^a-z0-9]/gi, '_')}_specs`);

            // Fetch all files
            const promises = parsedFiles.map(async (file) => {
                try {
                    const response = await fetch(file.url);
                    const blob = await response.blob();
                    folder?.file(file.name, blob);
                } catch (e) {
                    console.error(`Failed to download ${file.name}`, e);
                }
            });

            await Promise.all(promises);

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${equipmentName}_specifications.zip`);
        } catch (error) {
            console.error("Error creating zip", error);
        } finally {
            setDownloading(false);
        }
    };

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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {parsedFiles.length === 0 ? (
                        <div className="text-[#9CA3AF] text-center py-8">
                            No specification documents available.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {parsedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="bg-[#2A2A2B] border border-[#333333] rounded p-4 flex items-center justify-between hover:border-[#FDCE06] transition-colors"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="bg-[#333333] p-2 rounded text-[#E5E5E5]">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                            </svg>
                                        </div>
                                        <div className="truncate">
                                            <div className="text-[#E5E5E5] font-medium truncate">{file.name}</div>
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
                    {parsedFiles.length > 0 && (
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
