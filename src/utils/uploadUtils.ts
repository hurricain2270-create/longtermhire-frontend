import sdk from "./sdk";

/**
 * Upload an image file to the server
 * @param {File} file - The image file to upload
 * @returns {Promise<{id: string, url: string}>} - The upload response with id and url
 */
export const uploadImage = async (file) => {
  try {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("Please select a valid image file");
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      throw new Error("Image file size must be less than 10MB");
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append("file", file);

    // Upload using MkdSDK
    console.log("Starting upload for file:", file.name, file.size, file.type);
    const response = await sdk.upload(file);
    console.log("Upload response:", response);

    // Return the response data which should contain {id, url}
    return response;
  } catch (error) {
    console.error("Upload error:", error);

    // Handle different types of errors
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error("Failed to upload image. Please try again.");
    }
  }
};

/**
 * Validate image file before upload
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxSize - Maximum file size in bytes (default: 10MB)
 * @param {number} options.minAspectRatio - Minimum aspect ratio (width/height)
 * @param {number} options.maxAspectRatio - Maximum aspect ratio (width/height)
 * @returns {Promise<boolean>} - True if valid, throws error if invalid
 */
export const validateImageFile = async (file, options = {}) => {
  if (!file) {
    throw new Error("Please select a file");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file (JPG, PNG, GIF, etc.)");
  }

  const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
  if (file.size > maxSize) {
    throw new Error("Image file size must be less than 10MB");
  }

  // Validate aspect ratio if specified
  if (options.minAspectRatio !== undefined || options.maxAspectRatio !== undefined) {
    const aspectRatio = await getImageAspectRatio(file);
    if (options.minAspectRatio !== undefined && aspectRatio < options.minAspectRatio) {
      throw new Error(`Image aspect ratio must be at least ${options.minAspectRatio}:1. Current: ${aspectRatio.toFixed(2)}:1`);
    }
    if (options.maxAspectRatio !== undefined && aspectRatio > options.maxAspectRatio) {
      throw new Error(`Image aspect ratio must be at most ${options.maxAspectRatio}:1. Current: ${aspectRatio.toFixed(2)}:1`);
    }
  }

  return true;
};

/**
 * Get image aspect ratio (width/height)
 * @param {File} file - The image file
 * @returns {Promise<number>} - Aspect ratio
 */
export const getImageAspectRatio = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const aspectRatio = img.width / img.height;
      resolve(aspectRatio);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    
    img.src = url;
  });
};

/**
 * Get image preview URL for display
 * @param {File} file - The image file
 * @returns {string} - Object URL for preview
 */
export const getImagePreview = (file) => {
  if (!file || !file.type.startsWith("image/")) {
    return null;
  }
  return URL.createObjectURL(file);
};

/**
 * Clean up image preview URL
 * @param {string} url - The object URL to revoke
 */
export const cleanupImagePreview = (url) => {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Check if a URL is a valid image URL
 * @param {string} url - The URL to check
 * @returns {boolean} - True if it's likely an image URL
 */
export const isImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;

  // Check for common image extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i;
  return imageExtensions.test(url) || url.includes("/v2/api/lambda/upload/");
};
