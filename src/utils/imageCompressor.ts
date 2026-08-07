/**
 * Utility for client-side image compression & optimization.
 * Automatically resizes large property & profile photos to lightweight, fast-loading JPEGs.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default 0.75)
  mimeType?: string; // default 'image/jpeg'
}

export async function compressImage(
  source: File | string,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.75,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve) => {
    // If it's already a small string URL (like external unsplash or http), leave it as is if it's not a dataURL
    if (typeof source === 'string' && source.startsWith('http')) {
      return resolve(source);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const processImage = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          return resolve(typeof source === 'string' ? source : '');
        }

        // Calculate aspect ratio scaling
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(typeof source === 'string' ? source : '');
        }

        // Fill white background for transparent PNGs converting to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Smooth image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Image compression fallback to original source:', err);
        resolve(typeof source === 'string' ? source : '');
      }
    };

    img.onload = processImage;
    img.onerror = () => {
      resolve(typeof source === 'string' ? source : '');
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Compress multiple files in parallel
 */
export async function compressMultipleImages(
  files: FileList | File[],
  options: CompressionOptions = {}
): Promise<string[]> {
  const fileArray = Array.from(files);
  const results = await Promise.all(
    fileArray.map((file) => compressImage(file, options))
  );
  return results.filter((dataUrl) => Boolean(dataUrl));
}
