// @ts-nocheck
import React, { useState } from "react";
import { uploadImage } from "../utils/uploadUtils";
import { ClipLoader } from "react-spinners";

const UploadTest = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setUploadResult(null);
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    try {
      setUploading(true);
      setError("");

      console.log("Starting upload...");
      const result = await uploadImage(selectedFile);
      console.log("Upload result:", result);

      setUploadResult(result);
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-[#1A1A1A] rounded-lg border border-[#333333] max-w-md mx-auto">
      <h3 className="text-[#E5E5E5] text-lg font-semibold mb-4">Upload Test</h3>

      {/* File Input */}
      <div className="mb-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="w-full p-2 bg-[#2A2A2A] border border-[#333333] rounded text-[#E5E5E5]"
        />
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className="mb-4 p-3 bg-[#2A2A2A] rounded border border-[#333333]">
          <p className="text-[#E5E5E5] text-sm">
            <strong>File:</strong> {selectedFile.name}
          </p>
          <p className="text-[#E5E5E5] text-sm">
            <strong>Size:</strong>{" "}
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <p className="text-[#E5E5E5] text-sm">
            <strong>Type:</strong> {selectedFile.type}
          </p>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="w-full h-12 bg-[#FDCE06] text-[#1A1A1A] font-medium rounded-lg hover:bg-[#E5B800] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {uploading ? (
          <>
            <ClipLoader color="#1A1A1A" size={20} className="mr-2" />
            Uploading...
          </>
        ) : (
          "Upload Image"
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500 rounded">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {uploadResult && (
        <div className="mt-4 p-3 bg-green-900/20 border border-green-500 rounded">
          <p className="text-green-400 text-sm mb-2">Upload successful!</p>
          <div className="text-[#E5E5E5] text-xs">
            <p>
              <strong>ID:</strong> {uploadResult.id}
            </p>
            <p>
              <strong>URL:</strong>{" "}
              <a
                href={uploadResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FDCE06] hover:underline"
              >
                {uploadResult.url}
              </a>
            </p>
          </div>

          {/* Image Preview */}
          {uploadResult.url && (
            <div className="mt-3">
              <img
                src={uploadResult.url}
                alt="Uploaded"
                className="max-w-full h-32 object-cover rounded border border-[#333333]"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadTest;
