// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SimpleRichTextEditor from "./components/SimpleRichTextEditor";
import ImageManager from "./components/ImageManager";
import { contentApi } from "./services/contentApi";
import { equipmentApi } from "./services/equipmentApi";

const ContentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    equipmentId: "",
    equipmentName: "",
    categoryId: "",
    categoryName: "",
    description: "",
    images: [],
    specsFiles: [],
  });

  const [images, setImages] = useState([]);

  useEffect(() => {
    if (id) {
      loadContentDetails();
    }
  }, [id]);

  const loadContentDetails = async () => {
    try {
      setLoading(true);
      const response = await contentApi.getContentById(id);

      if (response && !response.error) {
        const content = response.data;
        setFormData({
          equipmentId:
            content.content_equipment_id || content.equipment_id || "",
          equipmentName: content.equipment_name || "",
          categoryId: content.category_id || "",
          categoryName: content.category_name || "",
          description: content.description || "",
          images: content.images || [],
          specsFiles: content.specs_files
            ? JSON.parse(content.specs_files)
            : [],
        });

        // Set existing images if available
        if (content.images && Array.isArray(content.images)) {
          setImages(
            content.images.map((img) => ({
              ...img,
              url: img.image_url, // Ensure url property exists for ImageManager
              is_main: img.is_main === 1 || img.is_main === true,
            }))
          );
        }
      } else {
        toast.error(response?.message || "Failed to load content details");
      }
    } catch (error) {
      console.error("Error loading content:", error);
      toast.error(error.message || "Failed to load content details");
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptionChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      description: value,
    }));
  };

  const handleImagesChange = (newImages) => {
    setImages(newImages);
  };

  const handleAddImage = async (contentId, imageData) => {
    try {
      // If we have an ID, upload immediately
      if (id) {
        const response = await contentApi.addImage(id, imageData);
        return response;
      }
      return null;
    } catch (error) {
      throw error;
    }
  };

  const handleRemoveImage = async (contentId, imageId) => {
    try {
      if (id && imageId) {
        const response = await contentApi.removeImage(id, imageId);
        return response;
      }
      return null;
    } catch (error) {
      throw error;
    }
  };

  const handleSetMainImage = async (contentId, imageId) => {
    try {
      if (id && imageId) {
        const response = await contentApi.setMainImage(id, imageId);
        return response;
      }
      return null;
    } catch (error) {
      throw error;
    }
  };

  const handleReorderImages = async (contentId, imageOrder) => {
    try {
      if (id) {
        const response = await contentApi.reorderImages(id, imageOrder);
        return response;
      }
      return null;
    } catch (error) {
      throw error;
    }
  };

  const handleSpecsUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await equipmentApi.uploadFile(file);
      if (response && response.url) {
        setFormData((prev) => ({
          ...prev,
          specsFiles: [...(prev.specsFiles || []), response.url],
        }));
        toast.success("Specs uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading specs:", error);
      toast.error("Failed to upload specs");
    }
  };

  const handleRemoveSpec = (index) => {
    setFormData((prev) => ({
      ...prev,
      specsFiles: prev.specsFiles.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Prepare data for update
      const data = {
        equipment_id: formData.equipmentId,
        equipment_name: formData.equipmentName,
        description: formData.description,
        specs_files: formData.specsFiles,
      };

      // If there are new images, we need to upload them separately
      // For now, update the content first
      const response = await contentApi.updateContent(id, data);

      if (!response.error) {
        toast.success("Content updated successfully!");
        // No navigation needed, stay on page
      } else {
        toast.error(response.message || "Failed to save content");
      }
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error(error.message || "Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#292A2B]">
        <div className="text-center">
          <ClipLoader color="#FDCE06" size={50} />
          <div className="text-[#E5E5E5] font-[Inter] mt-4">
            Loading content details...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-[#292A2B] min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/content-management")}
            className="text-[#9CA3AF] hover:text-[#FDCE06] transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-[36px]">
            *{formData.equipmentName || "Equipment Name"}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Equipment Info Card */}
          <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                  Category ID: {formData.categoryId || "001"}
                </label>
                <div className="text-[#E5E5E5] font-[Inter] text-base">
                  Category Name: {formData.categoryName || "Excavator"}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6">
            <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl mb-6">
              Description
            </h3>
            <SimpleRichTextEditor
              value={formData.description}
              onChange={handleDescriptionChange}
              height={300}
            />
          </div>

          {/* Specification Document */}
          <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6">
            <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl mb-6">
              Specification Document
            </h3>

            <div className="mb-4">
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                Upload Specification Document
              </label>
              <div className="flex items-center gap-4">
                <label className="bg-[#FDCE06] text-[#1F1F20] px-4 py-2 rounded-md font-[Inter] font-medium text-sm cursor-pointer hover:bg-[#E5B800] transition-colors inline-flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  Choose File
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleSpecsUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Specs Files List */}
            {formData.specsFiles && formData.specsFiles.length > 0 && (
              <div className="space-y-2 mt-4">
                <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                  Documents
                </label>
                {formData.specsFiles.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-[#292A2B] border border-[#333333] rounded-md p-3"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9CA3AF"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <span className="text-[#E5E5E5] text-sm truncate">
                        {url.split("/").pop()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-[#FDCE06] hover:text-[#E5B800] transition-colors"
                        title="View Document"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(index)}
                        className="p-2 text-[#EF4444] hover:text-[#DC2626] transition-colors"
                        title="Remove Document"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Images */}
        <div className="space-y-6">
          <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6">
            <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl mb-6">
              Images
            </h3>
            <ImageManager
              images={images}
              onImagesChange={handleImagesChange}
              contentId={id}
              onAddImage={handleAddImage}
              onRemoveImage={handleRemoveImage}
              onSetMainImage={handleSetMainImage}
              onReorderImages={handleReorderImages}
              disabled={saving}
            />
          </div>

          {/* Save Button */}

          {/* Save Button */}
          <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#FDCE06] text-[#1F1F20] py-3 px-6 rounded-md font-[Inter] font-bold text-sm hover:bg-[#E5B800] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <ClipLoader size={16} color="#1F1F20" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default ContentDetails;
