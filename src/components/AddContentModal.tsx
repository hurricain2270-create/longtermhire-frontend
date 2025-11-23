import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import Modal from "./Modal";
import { equipmentApi } from "../services/equipmentApi";
import { contentApi } from "../services/contentApi";
import ImageManager from "./ImageManager";
import { toast } from "react-toastify";
import SimpleRichTextEditor from "./SimpleRichTextEditor";

const AddContentModal = ({ isOpen, onClose, onSubmit, loading = false }) => {
  const [formData, setFormData] = useState({
    equipment_id: "",
    description: "",
    bannerDescription: "",
  });

  const [images, setImages] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [existingContent, setExistingContent] = useState([]);

  // Load equipment list when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEquipmentList();
      loadExistingContent();
    }
  }, [isOpen]);

  // Only clean up on successful submission, not on modal close
  // Form data is preserved when canceling

  // Load equipment list
  const loadEquipmentList = async () => {
    try {
      setEquipmentLoading(true);
      const response = await equipmentApi.getEquipment(1, 100); // Get first 100 equipment
      if (!response.error) {
        setEquipmentList(response.data || []);
        console.log("Loaded equipment list:", response.data);
      }
    } catch (error) {
      console.error("Failed to load equipment list:", error);
    } finally {
      setEquipmentLoading(false);
    }
  };

  // Load existing content to prevent duplicates
  const loadExistingContent = async () => {
    try {
      const response = await contentApi.getContent(1, 1000); // Get all content
      if (!response.error) {
        setExistingContent(response.data || []);
        console.log("Loaded existing content:", response.data);
      }
    } catch (error) {
      console.error("Failed to load existing content:", error);
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
      equipment_name: selectedEquipment?.equipment_name || "",
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
      await onSubmit(contentData);
      // Clear form data only on successful submission
      setImages([]);
      setFormData({
        equipment_id: "",
        description: "",
        bannerDescription: "",
      });
    } catch (error) {
      // Error handling is done in parent component
      console.error("Form submission error:", error);
    }
  };

  const handleCancel = () => {
    // Don't clear form data when canceling - preserve user input
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Content"
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
            ) : equipmentList.filter((equipment) => {
              const hasContent = existingContent.some((content) => {
                const contentEquipmentId = content.equipment_id?.toString();
                const equipmentId = equipment.equipment_id?.toString();
                const equipmentDbId = equipment.id?.toString();

                return (
                  contentEquipmentId === equipmentId ||
                  contentEquipmentId === equipmentDbId
                );
              });
              return !hasContent;
            }).length === 0 ? (
              <div className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 flex items-center">
                <span className="text-[#9CA3AF] text-sm">
                  All equipment already have content. No equipment available for
                  new content.
                </span>
              </div>
            ) : (
              <select
                name="equipment_id"
                value={formData.equipment_id}
                onChange={handleInputChange}
                required
                className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none focus:border-[#FDCE06] transition-colors"
              >
                <option value="">Select an equipment...</option>
                {equipmentList
                  .filter((equipment) => {
                    // Filter out equipment that already has content
                    const hasContent = existingContent.some((content) => {
                      // Check multiple possible ID matches
                      const contentEquipmentId =
                        content.equipment_id?.toString();
                      const equipmentId = equipment.equipment_id?.toString();
                      const equipmentDbId = equipment.id?.toString();

                      return (
                        contentEquipmentId === equipmentId ||
                        contentEquipmentId === equipmentDbId
                      );
                    });

                    console.log(
                      `Equipment ${equipment.equipment_name} (${equipment.equipment_id || equipment.id}) has content:`,
                      hasContent
                    );
                    return !hasContent;
                  })
                  .map((equipment) => (
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
            contentId={null} // Will be set after content creation
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
              disabled={
                loading ||
                equipmentList.filter((equipment) => {
                  const hasContent = existingContent.some((content) => {
                    const contentEquipmentId = content.equipment_id?.toString();
                    const equipmentId = equipment.equipment_id?.toString();
                    const equipmentDbId = equipment.id?.toString();

                    return (
                      contentEquipmentId === equipmentId ||
                      contentEquipmentId === equipmentDbId
                    );
                  });
                  return !hasContent;
                }).length === 0
              }
              className="flex-1 h-[48px] bg-[#FDCE06] rounded-[8px] text-[#1A1A1A] font-[Inter] font-medium text-[14px] leading-[1.21em] hover:bg-[#E5B800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <ClipLoader color="#1A1A1A" size={20} />
              ) : (
                "Add Content"
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddContentModal;
