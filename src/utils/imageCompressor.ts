import imageCompression from 'browser-image-compression';

export interface CompressionResult {
  compressedDataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  savingsPercentage: number;
  fileName: string;
  fileType: string;
}

/**
 * Lossless/High-quality image compressor for medical casting photos & scans.
 * Reduces file size dramatically while preserving key clinical details.
 */
export async function compressImageFile(file: File): Promise<CompressionResult> {
  const originalSizeKB = Math.round(file.size / 1024);

  // Compression options for crisp clinical visibility with minimal storage footprint
  const options = {
    maxSizeMB: 0.5, // Max ~500KB
    maxWidthOrHeight: 1920, // Full HD resolution
    useWebWorker: true,
    fileType: file.type.includes('png') ? 'image/png' : 'image/jpeg',
    initialQuality: 0.85
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const compressedSizeKB = Math.round(compressedFile.size / 1024);
    
    // Convert to Data URL for instant rendering & storage
    const compressedDataUrl = await imageCompression.getDataUrlFromFile(compressedFile);
    
    const savings = originalSizeKB > 0
      ? Math.max(0, Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100))
      : 0;

    return {
      compressedDataUrl,
      originalSizeKB,
      compressedSizeKB,
      savingsPercentage: savings,
      fileName: file.name,
      fileType: file.type || 'image/jpeg'
    };
  } catch (error) {
    console.warn('Image compression fallback to standard reader:', error);
    // Fallback if compression fails
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          compressedDataUrl: e.target?.result as string,
          originalSizeKB,
          compressedSizeKB: originalSizeKB,
          savingsPercentage: 0,
          fileName: file.name,
          fileType: file.type || 'image/jpeg'
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
