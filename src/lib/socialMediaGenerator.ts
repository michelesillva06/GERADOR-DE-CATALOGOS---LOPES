import { Property, CompanySettings } from '../types';
import { extractPropertyImages } from './pdfGenerator';
import { PostTemplateId, POST_TEMPLATES_CONFIG } from '../components/postTemplates';
import { renderPostToCanvas, CanvasPostData } from './canvasPostEngine';

/**
 * Renders a specific post template directly to a high-resolution 2D Canvas element.
 */
export async function generatePostImage(
  property: Property,
  companySettings: CompanySettings,
  templateId: PostTemplateId,
  photoUrl?: string,
  aiData?: CanvasPostData
): Promise<HTMLCanvasElement> {
  const images = extractPropertyImages(property);
  const selectedPhoto = photoUrl || images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';

  const config = POST_TEMPLATES_CONFIG.find(t => t.id === templateId) || {
    width: 1080,
    height: 1350
  };

  const width = config.width;
  const height = config.height;

  const canvas = document.createElement('canvas');
  await renderPostToCanvas(canvas, {
    property,
    companySettings,
    templateId,
    photoUrl: selectedPhoto,
    width,
    height,
    aiData
  });

  return canvas;
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const url = canvas.toDataURL('image/png', 0.95);
  downloadDataUrl(url, filename);
}

/**
 * Generates and downloads the full pack (Feed Retrato + Feed Quadrado)
 */
export async function generateAndDownloadSocialMedia(
  prop: Property,
  companySettings: CompanySettings,
  photoUrl?: string,
  aiData?: CanvasPostData
) {
  const code = prop.code || prop.id || 'imovel';

  try {
    // 1. Feed Retrato (1080x1350)
    const feedVert = await generatePostImage(prop, companySettings, 'feed_vertical', photoUrl, aiData);
    downloadCanvas(feedVert, `${code}_feed_retrato_1080x1350.png`);

    // 2. Feed Quadrado (1080x1080)
    await new Promise(resolve => setTimeout(resolve, 300));
    const feedQuad = await generatePostImage(prop, companySettings, 'feed_quadrado', photoUrl, aiData);
    downloadCanvas(feedQuad, `${code}_feed_quadrado_1080x1080.png`);
  } catch (err: any) {
    console.error('Erro na renderização do pacote de artes:', err);
    throw err;
  }
}
