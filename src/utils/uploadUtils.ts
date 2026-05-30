// @ts-nocheck

/**
 * Returns true if the given string looks like an image URL.
 */
export function isImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().split('?')[0]; // strip query params
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)$/.test(lower);
}

/**
 * Returns true if the given string looks like a video URL.
 */
export function isVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().split('?')[0];
  return /\.(mp4|mov|avi|mkv|webm|flv|wmv)$/.test(lower);
}

/**
 * Formats bytes into a human-readable string (KB, MB, etc.)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}
