import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import Modal from "./Modal";
import { equipmentApi } from "../services/equipmentApi";
import { contentApi } from "../services/contentApi";
import ImageManager from "./ImageManager";
import { toast } from "react-toastify";
import SimpleRichTextEditor from "./SimpleRichTextEditor";

const EditContentModal = ({
  isOpen,
  onClose,
  onSubmit,
  content,
  loading = false,
}) => {
  console.log("content", content);
  const [formData, setFormData] = useState({
    equipment_id: "",
    description: "",
    bannerDescription: "",
    equipment_name: "",
  });

  const [images, setImages] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  // Load equipment list when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEquipmentList();
    }
  }, [isOpen]);

  // Update form data when content prop changes
  console.log("formdata", formData);
  useEffect(() => {
    if (content) {
      setFormData({
        equipment_id: content.content_equipment_id || "",
        equipment_name: content.equipment_name || "",
        description: content.description || "",
        bannerDescription: content.banner_description || "",
      });

      // Set existing images
      if (content.images && Array.isArray(content.images)) {
        setImages(content.images);
      } else if (content.image_url) {
        // Backward compatibility - convert single image to array format
        setImages([
          {
            id: null,
            image_url: content.image_url,
            is_main: 1,
            caption: "Main image",
          },
        ]);
      } else {
        setImages([]);
      }
    }
  }, [content]);

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      setImages([]);
    }
  }, [isOpen]);

  // Load equipment list
  const loadEquipmentList = async () => {
    try {
      setEquipmentLoading(true);
      const response = await equipmentApi.getEquipment(1, 100); // Get first 100 equipment
      if (!response.error) {
        setEquipmentList(response.data || []);
      }
    } catch (error) {
      console.error("Failed to load equipment list:", error);
    } finally {
      setEquipmentLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      const response = await contentApi.addImage(contentId, imageData);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const handleRemoveImage = async (contentId, imageId) => {
    try {
      const response = await contentApi.removeImage(contentId, imageId);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const handleSetMainImage = async (contentId, imageId) => {
    try {
      const response = await contentApi.setMainImage(contentId, imageId);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const handleReorderImages = async (contentId, imageOrder) => {
    try {
      const response = await contentApi.reorderImages(contentId, imageOrder);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if we have at least one image
    if (images.length === 0) {
      toast.error("Please upload at least one image for the content");
      return;
    }

    // Find selected equipment details
    const selectedEquipment = equipmentList.find(
      (eq) => eq.id.toString() === formData.equipment_id
    );

    // Get main image URL (for backward compatibility)
    const mainImage = images.find(
      (img) => img.is_main === 1 || img.is_main === true
    );
    const imageUrl = mainImage ? mainImage.image_url || mainImage.url : "";

    // Prepare data for API
    const contentData = {
      equipment_id: formData.equipment_id,
      equipment_name: formData?.equipment_name || "",
      description: formData.description,
      banner_description: formData.bannerDescription,
      image_url: imageUrl, // Keep for backward compatibility
      images: images.map((img, index) => ({
        url: img.image_url || img.url,
        is_main: img.is_main === 1 || img.is_main === true ? 1 : 0,
        caption: img.caption || `Image ${index + 1}`,
      })),
    };

    console.log("Submitting content data:", contentData);

    try {
      await onSubmit(contentData, content?.id);
    } catch (error) {
      // Error handling is done in parent component
      console.error("Form submission error:", error);
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form to original content data
    if (content) {
      setFormData({
        equipment_name: content.equipment_name || "",
        equipment_id: content.equipment_id || "",
        description: content.description || "",
        bannerDescription: content.banner_description || "",
      });

      // Reset images
      if (content.images && Array.isArray(content.images)) {
        setImages(content.images);
      } else if (content.image_url) {
        setImages([
          {
            id: null,
            image_url: content.image_url,
            is_main: 1,
            caption: "Main image",
          },
        ]);
      } else {
        setImages([]);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Content"
      width="800px"
      height="800px"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6" style={{ width: "734px" }}>
          {/* Equipment Selection */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Select Equipment*
            </label>
            {equipmentLoading ? (
              <div className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] flex items-center justify-center">
                <ClipLoader size={20} color="#FDCE06" />
                <span className="ml-2 text-[#9CA3AF] text-sm">
                  Loading equipment...
                </span>
              </div>
            ) : (
              <select
                name="equipment_id"
                value={formData.equipment_id}
                onChange={handleInputChange}
                required
                disabled
                className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 text-[#9CA3AF] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none transition-colors cursor-not-allowed opacity-60"
              >
                <option value="">Select an equipment...</option>
                {equipmentList.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.equipment_name} (ID:{" "}
                    {equipment.equipment_id || equipment.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Multiple Images Upload */}
          <ImageManager
            images={images}
            onImagesChange={handleImagesChange}
            contentId={content?.id}
            onAddImage={handleAddImage}
            onRemoveImage={handleRemoveImage}
            onSetMainImage={handleSetMainImage}
            onReorderImages={handleReorderImages}
            disabled={loading}
          />

          {/* Description */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Description
            </label>
            <SimpleRichTextEditor
              value={formData.description}
              onChange={handleDescriptionChange}
              height={200}
            />
          </div>

          {/* Banner Description */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Banner Description
            </label>
            <textarea
              name="bannerDescription"
              value={formData.bannerDescription}
              onChange={handleInputChange}
              rows={3}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 py-3 text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none focus:border-[#FDCE06] transition-colors resize-none"
              placeholder="Enter banner description"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 h-[48px] bg-transparent border border-[#333333] rounded-[8px] text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] hover:border-[#555555] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-[48px] bg-[#FDCE06] rounded-[8px] text-[#1A1A1A] font-[Inter] font-medium text-[14px] leading-[1.21em] hover:bg-[#E5B800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <ClipLoader color="#1A1A1A" size={20} />
              ) : (
                "Update Content"
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditContentModal;
