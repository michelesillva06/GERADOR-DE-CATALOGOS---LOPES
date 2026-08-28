import { Property, User, CompanySettings } from '../types';
import {
  loadImageElement,
  drawRoundedImage,
  drawLopesHeart,
  formatCurrency,
  extractPropertyImages
} from './pdfGenerator';
import { getPropertyPriceInfo } from './priceUtils';

const LOPES_RED = '#F10F4D';

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Draws the shared bottom info panel (price, specs, neighborhood, logo, captador contact) used
 * by both the feed post and the story. `panelY`/`panelH` let each format position it differently
 * since a story is much taller than a feed post.
 */
function drawInfoPanel(
  ctx: CanvasRenderingContext2D,
  prop: Property,
  captador: User,
  companySettings: CompanySettings,
  canvasW: number,
  panelY: number,
  panelH: number
) {
  const priceInfo = getPropertyPriceInfo(prop);
  const pad = canvasW * 0.06;

  // Gradient so text stays legible over any photo
  const grad = ctx.createLinearGradient(0, panelY - panelH * 0.6, 0, panelY + panelH);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, panelY - panelH * 0.6, canvasW, panelH * 1.6);

  let y = panelY + pad * 0.6;

  // Purpose tag (VENDA / LOCAÇÃO)
  ctx.font = `900 ${canvasW * 0.032}px sans-serif`;
  ctx.fillStyle = LOPES_RED;
  const tag = (prop.purpose || 'Venda').toUpperCase();
  const tagW = ctx.measureText(tag).width + canvasW * 0.05;
  ctx.beginPath();
  ctx.roundRect(pad, y, tagW, canvasW * 0.06, canvasW * 0.03);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(tag, pad + canvasW * 0.025, y + canvasW * 0.042);
  y += canvasW * 0.095;

  // Price
  ctx.font = `900 ${canvasW * 0.075}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(priceInfo.primaryFormatted, pad, y + canvasW * 0.06);
  y += canvasW * 0.09;

  // Title / neighborhood
  ctx.font = `700 ${canvasW * 0.036}px sans-serif`;
  ctx.fillStyle = '#F1F5F9';
  const titleLines = wrapText(ctx, `${prop.title} — ${prop.neighborhood}, ${prop.city}`, canvasW - pad * 2);
  titleLines.slice(0, 2).forEach(line => {
    ctx.fillText(line, pad, y + canvasW * 0.03);
    y += canvasW * 0.045;
  });
  y += canvasW * 0.015;

  // Specs row
  const specs = [
    prop.bedrooms ? `${prop.bedrooms} quartos` : null,
    prop.bathrooms ? `${prop.bathrooms} banheiros` : null,
    prop.parking_spaces ? `${prop.parking_spaces} vagas` : null,
    prop.total_area ? `${prop.total_area}m²` : null
  ].filter(Boolean).join('   •   ');
  ctx.font = `600 ${canvasW * 0.03}px sans-serif`;
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText(specs, pad, y + canvasW * 0.03);
  y += canvasW * 0.075;

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(canvasW - pad, y);
  ctx.stroke();
  y += canvasW * 0.045;

  // Footer: logo + company + captador contact
  drawLopesHeart(ctx, pad, y, canvasW * 0.06, '#FFFFFF');
  ctx.font = `900 ${canvasW * 0.032}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(companySettings.company_name || 'Lopes', pad + canvasW * 0.08, y + canvasW * 0.02);
  ctx.font = `600 ${canvasW * 0.026}px sans-serif`;
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText(`${captador.name} • ${prop.code}`, pad + canvasW * 0.08, y + canvasW * 0.048);
}

async function renderSocialCanvas(
  prop: Property,
  captador: User,
  companySettings: CompanySettings,
  width: number,
  height: number,
  panelHRatio: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const images = extractPropertyImages(prop);
  const mainImg = await loadImageElement(images[0] || '');
  drawRoundedImage(ctx, mainImg, 0, 0, width, height, 0, prop.title);

  const panelH = height * panelHRatio;
  drawInfoPanel(ctx, prop, captador, companySettings, width, height - panelH, panelH);

  return canvas;
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const url = canvas.toDataURL('image/png', 0.95);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

/** Feed post — 1080x1350 (4:5), the safest aspect ratio for Instagram feed. */
export async function generateFeedPost(prop: Property, captador: User, companySettings: CompanySettings): Promise<HTMLCanvasElement> {
  return renderSocialCanvas(prop, captador, companySettings, 1080, 1350, 0.5);
}

/** Story — 1080x1920 (9:16). */
export async function generateStoryPost(prop: Property, captador: User, companySettings: CompanySettings): Promise<HTMLCanvasElement> {
  return renderSocialCanvas(prop, captador, companySettings, 1080, 1920, 0.4);
}

/** Generates and downloads both the feed and the story image for a property. */
export async function generateAndDownloadSocialMedia(
  prop: Property,
  captador: User,
  companySettings: CompanySettings
) {
  const feed = await generateFeedPost(prop, captador, companySettings);
  downloadCanvas(feed, `${prop.code}_feed_instagram.png`);

  const story = await generateStoryPost(prop, captador, companySettings);
  // Slight delay so the browser doesn't drop the second automatic download.
  await new Promise(resolve => setTimeout(resolve, 400));
  downloadCanvas(story, `${prop.code}_story_instagram.png`);
}
