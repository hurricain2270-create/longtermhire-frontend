import React, { useState, useRef } from "react";
import { ClipLoader } from "react-spinners";
import {
  uploadImage,
  validateImageFile,
  getImagePreview,
  cleanupImagePreview,
  formatFileSize,
  isImageUrl,
} from "../utils/uploadUtils";

const ImageManager = ({
  images = [],
  onImagesChange,
  contentId,
  onAddImage,
  onRemoveImage,
  onSetMainImage,
  onReorderImages,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    setUploadError("");

    if (files.length === 0) return;

    setUploading(true);
    const newImages = [];

    try {
      for (const file of files) {
        validateImageFile(file);

        // Upload image
        const uploadResult = await uploadImage(file);
        console.log("Upload result:", uploadResult);

        // Create image object
        const imageObj = {
          image_url: uploadResult.url || uploadResult.image_url,
          is_main: images.length === 0 ? 1 : 0, // First image becomes main if no images exist
          caption: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for caption
        };

        console.log("Created image object:", imageObj);

        // Validate that we have a valid image_url
        if (!imageObj.image_url) {
          throw new Error(
            `Upload failed for ${file.name}: No image URL received`
          );
        }

        newImages.push(imageObj);
      }

      // Add new images to the list
      const updatedImages = [...images, ...newImages];
      onImagesChange(updatedImages);

      // If this is the first image, set it as main
      if (images.length === 0 && newImages.length > 0 && contentId) {
        onSetMainImage(contentId, newImages[0].id);
      }
    } catch (error) {
      console.error("Image upload error:", error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async (imageId, index) => {
    if (disabled) return;
    // Not just this form - it goes from the server too.
    if (imageId && contentId && !window.confirm("Remove this photo?")) return;

    try {
      if (imageId && contentId) {
        // Remove from server
        await onRemoveImage(contentId, imageId);
      }

      // Remove from local state
      const updatedImages = images.filter((_, i) => i !== index);
      onImagesChange(updatedImages);

      // If we removed the main image and there are other images, set the first one as main
      if (
        (images[index]?.is_main === 1 || images[index]?.is_main === true) &&
        updatedImages.length > 0 &&
        contentId
      ) {
        onSetMainImage(contentId, updatedImages[0].id);
      }
    } catch (error) {
      console.error("Failed to remove image:", error);
      setUploadError("Failed to remove image");
    }
  };

  const handleSetMainImage = async (imageId, index) => {
    if (disabled) return;

    try {
      if (contentId) {
        await onSetMainImage(contentId, imageId);
      }

      // Update local state
      const updatedImages = images.map((img, i) => ({
        ...img,
        is_main: i === index,
      }));
      onImagesChange(updatedImages);
    } catch (error) {
      console.error("Failed to set main image:", error);
      setUploadError("Failed to set main image");
    }
  };

  const handleDragStart = (e, index) => {
    if (disabled) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    if (disabled) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e, dropIndex) => {
    if (disabled || draggedIndex === null) return;
    e.preventDefault();

    if (draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder images
    const reorderedImages = [...images];
    const [draggedImage] = reorderedImages.splice(draggedIndex, 1);
    reorderedImages.splice(dropIndex, 0, draggedImage);

    // Update local state
    onImagesChange(reorderedImages);

    // Update server with new order
    try {
      const imageOrder = reorderedImages.map((img) => img.id).filter(Boolean);
      if (imageOrder.length > 0 && contentId) {
        await onReorderImages(contentId, imageOrder);
      }
    } catch (error) {
      console.error("Failed to reorder images:", error);
      setUploadError("Failed to reorder images");
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div>
        <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
          Equipment Images {images.length > 0 && `(${images.length})`}
        </label>

        <div className="border-2 border-dashed border-[#333333] rounded-[8px] p-6 text-center hover:border-[#FDCE06] transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="multiple-image-upload"
            disabled={uploading || disabled}
          />
          <label
            htmlFor="multiple-image-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-[#333333] rounded-full flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-[#9CA3AF]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <span className="text-[#E5E5E5] font-[Inter] font-medium text-[14px]">
              {uploading ? "Uploading..." : "Click to upload images"}
            </span>
            <span className="text-[#9CA3AF] font-[Inter] font-normal text-[12px] mt-1">
              PNG, JPG, GIF up to 10MB (Multiple files supported)
            </span>
          </label>
          {uploading && (
            <div className="mt-3">
              <ClipLoader color="#FDCE06" size={20} />
            </div>
          )}
        </div>

        {uploadError && (
          <div className="mt-2 text-red-400 font-[Inter] font-normal text-[12px]">
            {uploadError}
          </div>
        )}
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id || index}
              className={`relative group border-2 rounded-lg overflow-hidden transition-all ${
                draggedIndex === index
                  ? "border-[#FDCE06] opacity-50"
                  : dragOverIndex === index
                    ? "border-[#FDCE06] border-dashed"
                    : "border-[#333333] hover:border-[#555555]"
              } ${image.is_main === 1 || image.is_main === true ? "ring-2 ring-[#FDCE06]" : ""}`}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Image */}
              <div className="aspect-square relative">
                <img
                  src={image.image_url || image.url}
                  alt={image.caption || "Equipment"}
                  className="w-full h-full object-cover"
                />

                {/* Main Image Badge */}
                {(image.is_main === 1 || image.is_main === true) && (
                  <div className="absolute top-2 left-2 bg-[#FDCE06] text-[#1A1A1A] px-2 py-1 rounded text-xs font-medium">
                    Main
                  </div>
                )}

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    {!(image.is_main === 1 || image.is_main === true) && (
                      <button
                        type="button"
                        onClick={() => handleSetMainImage(image.id, index)}
                        disabled={disabled}
                        className="w-8 h-8 bg-[#FDCE06] rounded-full flex items-center justify-center text-[#1A1A1A] hover:bg-[#E5B800] transition-colors"
                        title="Set as main image"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(image.id, index)}
                      disabled={disabled}
                      className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Drag Handle */}
                {!disabled && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 rounded flex items-center justify-center cursor-move">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 6h8v2H8V6zm0 5h8v2H8v-2zm0 5h8v2H8v-2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Caption */}
              <div className="p-2 bg-[#1A1A1A]">
                <input
                  type="text"
                  value={image.caption || ""}
                  onChange={(e) => {
                    const updatedImages = [...images];
                    updatedImages[index].caption = e.target.value;
                    onImagesChange(updatedImages);
                  }}
                  disabled={disabled}
                  className="w-full bg-transparent text-[#E5E5E5] text-xs border-none outline-none placeholder-[#9CA3AF]"
                  placeholder="Image caption"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      {images.length > 0 && (
        <div className="text-[#9CA3AF] text-xs">
          <p>• Drag images to reorder them</p>
          <p>• Click the checkmark to set an image as main</p>
          <p>• Click the X to remove an image</p>
          <p>• The main image will be displayed prominently</p>
        </div>
      )}
    </div>
  );
};

export default ImageManager;
