/**
 * Image Loader Utility with Canvas Taint Protection
 * 
 * Guarantees that any loaded image drawn onto an HTML5 Canvas will NEVER taint the canvas,
 * ensuring canvas.toDataURL() and canvas.toBlob() always succeed without throwing DOMException.
 */

/**
 * Creates an elegant, origin-clean fallback image via in-memory canvas
 */
export function createFallbackImage(
  width = 1200,
  height = 800,
  text = 'Lopes Manaus'
): HTMLImageElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(width, 100);
  canvas.height = Math.max(height, 100);
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#1E293B');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#E50938';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 40, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 40);
  }

  const img = new Image();
  img.src = canvas.toDataURL('image/jpeg', 0.9);
  return img;
}

/**
 * Tests whether an image taints a canvas when drawn
 */
function isImageCanvasSafe(img: HTMLImageElement): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 4;
    testCanvas.height = 4;
    const testCtx = testCanvas.getContext('2d');
    if (!testCtx) return true;
    testCtx.drawImage(img, 0, 0, 4, 4);
    // If this throws, the image is tainted
    testCanvas.toDataURL('image/png');
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads an image from a Data URL
 */
function loadFromDataUrl(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Loads an image with anonymous crossOrigin
 */
function loadDirectCrossOrigin(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Converts a Blob to a Base64 Data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

/**
 * Primary image loader for Canvas operations.
 * Resolves to a guaranteed canvas-safe HTMLImageElement.
 */
export async function loadImageSafely(src?: string | null): Promise<HTMLImageElement> {
  if (!src || typeof src !== 'string' || !src.trim()) {
    return createFallbackImage(1200, 800, 'Lopes Manaus');
  }

  const cleanSrc = src.trim();

  // 1. Data URLs & Blob URLs are locally generated and origin-clean
  if (cleanSrc.startsWith('data:') || cleanSrc.startsWith('blob:')) {
    const loaded = await loadFromDataUrl(cleanSrc);
    return loaded || createFallbackImage(1200, 800, 'Lopes Manaus');
  }

  // 2. Try direct CORS loading
  try {
    const directImg = await loadDirectCrossOrigin(cleanSrc);
    if (directImg && isImageCanvasSafe(directImg)) {
      return directImg;
    }
  } catch {}

  // 3. Try fetching as Blob directly in browser and converting to Data URL
  try {
    const res = await fetch(cleanSrc, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl) {
        const blobImg = await loadFromDataUrl(dataUrl);
        if (blobImg && isImageCanvasSafe(blobImg)) {
          return blobImg;
        }
      }
    }
  } catch {}

  // 4. Try fetching via server proxy endpoint (/api/proxy-image)
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(cleanSrc)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl) {
        const proxyImg = await loadFromDataUrl(dataUrl);
        if (proxyImg && isImageCanvasSafe(proxyImg)) {
          return proxyImg;
        }
      }
    }
  } catch {}

  // 5. Ultimate fallback: Return a clean generated image so Canvas is NEVER tainted!
  return createFallbackImage(1200, 800, 'Lopes Manaus');
}
