import { Property, CompanySettings } from '../types';
import { extractPropertyImages } from './pdfGenerator';
import { PostTemplateId, POST_TEMPLATES_CONFIG } from '../components/postTemplates';
import { renderPostToCanvas } from './canvasPostEngine';

/**
 * Renders a specific post template directly to a high-resolution 2D Canvas element.
 * 100% deterministic, zero HTML2Canvas distortions, instant execution.
 */
export async function generatePostImage(
  property: Property,
  companySettings: CompanySettings,
  templateId: PostTemplateId,
  photoUrl?: string
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
    height
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

/** Feed post — 1080x1350 (4:5), high-end portrait layout */
export async function generateFeedPost(prop: Property, companySettings: CompanySettings): Promise<HTMLCanvasElement> {
  const isRent = prop.purpose === 'Locação';
  const templateId: PostTemplateId = isRent ? 'feed_aluguel' : 'feed_venda';
  return generatePostImage(prop, companySettings, templateId);
}

/** Story post — 1080x1920 (9:16) */
export async function generateStoryPost(prop: Property, companySettings: CompanySettings): Promise<HTMLCanvasElement> {
  return generatePostImage(prop, companySettings, 'story');
}

/**
 * Generates and downloads both the feed and story images for a property.
 */
export async function generateAndDownloadSocialMedia(prop: Property, companySettings: CompanySettings) {
  const code = prop.code || prop.id || 'imovel';

  try {
    const feed = await generateFeedPost(prop, companySettings);
    downloadCanvas(feed, `${code}_feed_instagram.png`);

    const story = await generateStoryPost(prop, companySettings);
    await new Promise(resolve => setTimeout(resolve, 300));
    downloadCanvas(story, `${code}_story_instagram.png`);
  } catch (err: any) {
    console.error('Erro na renderização das mídias:', err);
    throw err;
  }
}
