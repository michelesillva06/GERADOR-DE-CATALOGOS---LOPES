import { Property, User, CompanySettings } from '../types';
import {
  loadImageElement,
  drawRoundedImage,
  drawLopesHeart,
  extractPropertyImages
} from './pdfGenerator';
import { getPropertyPriceInfo } from './priceUtils';

const LOPES_RED = '#F10F4D';
const LOPES_DARK = '#1A1A2E';

export type SocialMediaTemplate = 'gradient' | 'card';

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

/** Small emoji-style icons stand in for the spec icons — no icon library needed for canvas. */
function buildSpecItems(prop: Property): { icon: string; label: string }[] {
  return [
    prop.bedrooms ? { icon: '🛏️', label: `${prop.bedrooms}` } : null,
    prop.bathrooms ? { icon: '🚿', label: `${prop.bathrooms}` } : null,
    prop.parking_spaces ? { icon: '🚗', label: `${prop.parking_spaces}` } : null,
    prop.total_area ? { icon: '📐', label: `${prop.total_area}m²` } : null
  ].filter((x): x is { icon: string; label: string } => x !== null);
}

function drawSpecsRow(ctx: CanvasRenderingContext2D, prop: Property, canvasW: number, x: number, y: number, color: string) {
  const items = buildSpecItems(prop);
  let cursorX = x;
  const gap = canvasW * 0.055;
  for (const item of items) {
    ctx.font = `${canvasW * 0.034}px sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(item.icon, cursorX, y);
    const iconW = ctx.measureText(item.icon).width;
    ctx.font = `700 ${canvasW * 0.03}px sans-serif`;
    ctx.fillText(item.label, cursorX + iconW + canvasW * 0.012, y);
    const labelW = ctx.measureText(item.label).width;
    cursorX += iconW + labelW + gap;
  }
}

/**
 * TEMPLATE A — "gradient": full-bleed photo with a dark gradient panel at the bottom, price and
 * tag over the photo itself. The original layout.
 */
function drawGradientTemplate(
  ctx: CanvasRenderingContext2D,
  prop: Property,
  companySettings: CompanySettings,
  canvasW: number,
  panelY: number,
  panelH: number
) {
  const priceInfo = getPropertyPriceInfo(prop);
  const pad = canvasW * 0.06;

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
  y += canvasW * 0.025;

  // Specs row, with icons
  drawSpecsRow(ctx, prop, canvasW, pad, y + canvasW * 0.03, '#F1F5F9');
  y += canvasW * 0.075;

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(canvasW - pad, y);
  ctx.stroke();
  y += canvasW * 0.045;

  // Footer: logo + company name only — no captador name, no internal property code, since this
  // image is meant for public posting and neither belongs on a public-facing post.
  drawLopesHeart(ctx, pad, y, canvasW * 0.06, '#FFFFFF');
  ctx.font = `900 ${canvasW * 0.034}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(companySettings.company_name || 'Lopes', pad + canvasW * 0.08, y + canvasW * 0.038);
}

/**
 * TEMPLATE B — "card": photo framed with a white border and rounded corners, solid-color info
 * card below it (not overlapping the photo) — a cleaner, more "catalog" look as an alternative
 * to the gradient-over-photo style.
 */
function drawCardTemplate(
  ctx: CanvasRenderingContext2D,
  prop: Property,
  companySettings: CompanySettings,
  canvasW: number,
  canvasH: number,
  photoH: number
) {
  const priceInfo = getPropertyPriceInfo(prop);
  const pad = canvasW * 0.065;
  const cardY = photoH;
  const cardH = canvasH - photoH;

  // Solid dark card background below the photo
  ctx.fillStyle = LOPES_DARK;
  ctx.fillRect(0, cardY, canvasW, cardH);

  let y = cardY + pad * 0.9;

  // Purpose tag
  ctx.font = `900 ${canvasW * 0.03}px sans-serif`;
  const tag = (prop.purpose || 'Venda').toUpperCase();
  const tagW = ctx.measureText(tag).width + canvasW * 0.045;
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(pad, y, tagW, canvasW * 0.055, canvasW * 0.027);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(tag, pad + canvasW * 0.022, y + canvasW * 0.038);

  // Price, right-aligned on the same row as the tag
  ctx.font = `900 ${canvasW * 0.055}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.fillText(priceInfo.primaryFormatted, canvasW - pad, y + canvasW * 0.045);
  ctx.textAlign = 'left';
  y += canvasW * 0.09;

  // Title / neighborhood
  ctx.font = `700 ${canvasW * 0.034}px sans-serif`;
  ctx.fillStyle = '#F1F5F9';
  const titleLines = wrapText(ctx, `${prop.title} — ${prop.neighborhood}, ${prop.city}`, canvasW - pad * 2);
  titleLines.slice(0, 2).forEach(line => {
    ctx.fillText(line, pad, y + canvasW * 0.028);
    y += canvasW * 0.042;
  });
  y += canvasW * 0.03;

  // Specs row, with icons, inside a subtle rounded strip
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.roundRect(pad, y, canvasW - pad * 2, canvasW * 0.075, canvasW * 0.02);
  ctx.fill();
  drawSpecsRow(ctx, prop, canvasW, pad + canvasW * 0.025, y + canvasW * 0.05, '#F1F5F9');
  y += canvasW * 0.11;

  // Footer: logo + company name only
  drawLopesHeart(ctx, pad, y, canvasW * 0.055, LOPES_RED);
  ctx.font = `900 ${canvasW * 0.032}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(companySettings.company_name || 'Lopes', pad + canvasW * 0.075, y + canvasW * 0.036);
}

async function renderSocialCanvas(
  prop: Property,
  companySettings: CompanySettings,
  width: number,
  height: number,
  template: SocialMediaTemplate,
  panelHRatio: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const images = extractPropertyImages(prop);
  const mainImg = await loadImageElement(images[0] || '');

  if (template === 'card') {
    // Photo only fills the top portion, leaving a solid card area below for the text — so the
    // photo needs a smaller height than the gradient template, where text overlaps the photo.
    const photoH = height * (1 - panelHRatio * 1.3);
    drawRoundedImage(ctx, mainImg, 0, 0, width, photoH, 0, prop.title);
    drawCardTemplate(ctx, prop, companySettings, width, height, photoH);
  } else {
    drawRoundedImage(ctx, mainImg, 0, 0, width, height, 0, prop.title);
    const panelH = height * panelHRatio;
    drawGradientTemplate(ctx, prop, companySettings, width, height - panelH, panelH);
  }

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
export async function generateFeedPost(
  prop: Property,
  companySettings: CompanySettings,
  template: SocialMediaTemplate = 'gradient'
): Promise<HTMLCanvasElement> {
  return renderSocialCanvas(prop, companySettings, 1080, 1350, template, 0.5);
}

/** Story — 1080x1920 (9:16). */
export async function generateStoryPost(
  prop: Property,
  companySettings: CompanySettings,
  template: SocialMediaTemplate = 'gradient'
): Promise<HTMLCanvasElement> {
  return renderSocialCanvas(prop, companySettings, 1080, 1920, template, 0.4);
}

/** Generates and downloads both the feed and the story image for a property, in the chosen template. */
export async function generateAndDownloadSocialMedia(
  prop: Property,
  companySettings: CompanySettings,
  template: SocialMediaTemplate = 'gradient'
) {
  const feed = await generateFeedPost(prop, companySettings, template);
  downloadCanvas(feed, `${prop.code}_feed_instagram.png`);

  const story = await generateStoryPost(prop, companySettings, template);
  // Slight delay so the browser doesn't drop the second automatic download.
  await new Promise(resolve => setTimeout(resolve, 400));
  downloadCanvas(story, `${prop.code}_story_instagram.png`);
}
