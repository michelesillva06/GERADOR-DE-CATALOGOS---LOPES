import { Property, CompanySettings } from '../types';
import {
  loadImageElement,
  drawRoundedImage,
  drawLopesHeart,
  extractPropertyImages
} from './pdfGenerator';
import { getPropertyPriceInfo } from './priceUtils';

const LOPES_RED = '#F10F4D';
const NEAR_BLACK = '#111114';

export type SocialMediaTemplate = 'capa' | 'ficha' | 'premium';

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

// =============================================================================
// VECTOR ICONS — simple line icons drawn with canvas paths. No emoji: the brand rules for this
// generator explicitly call for a clean, editorial look, and emoji render inconsistently across
// devices/browsers and read as informal rather than "imobiliária premium".
// =============================================================================

function drawBedIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Mattress base
  ctx.beginPath();
  ctx.roundRect(x, y + s * 0.45, s, s * 0.35, s * 0.08);
  ctx.stroke();
  // Pillow
  ctx.beginPath();
  ctx.roundRect(x + s * 0.08, y + s * 0.15, s * 0.32, s * 0.32, s * 0.06);
  ctx.stroke();
  // Legs
  ctx.beginPath();
  ctx.moveTo(x + s * 0.05, y + s * 0.8);
  ctx.lineTo(x + s * 0.05, y + s * 0.95);
  ctx.moveTo(x + s * 0.95, y + s * 0.8);
  ctx.lineTo(x + s * 0.95, y + s * 0.95);
  ctx.stroke();
  ctx.restore();
}

function drawShowerIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.08;
  ctx.lineCap = 'round';
  // Showerhead: a small rounded rectangle
  ctx.beginPath();
  ctx.roundRect(x + s * 0.15, y + s * 0.05, s * 0.7, s * 0.22, s * 0.1);
  ctx.stroke();
  // Water streams
  ctx.beginPath();
  ctx.moveTo(x + s * 0.28, y + s * 0.42);
  ctx.lineTo(x + s * 0.24, y + s * 0.85);
  ctx.moveTo(x + s * 0.5, y + s * 0.42);
  ctx.lineTo(x + s * 0.5, y + s * 0.9);
  ctx.moveTo(x + s * 0.72, y + s * 0.42);
  ctx.lineTo(x + s * 0.76, y + s * 0.85);
  ctx.stroke();
  ctx.restore();
}

function drawCarIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.07;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Body
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.65);
  ctx.lineTo(x + s * 0.12, y + s * 0.35);
  ctx.quadraticCurveTo(x + s * 0.2, y + s * 0.25, x + s * 0.32, y + s * 0.25);
  ctx.lineTo(x + s * 0.68, y + s * 0.25);
  ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.25, x + s * 0.88, y + s * 0.35);
  ctx.lineTo(x + s, y + s * 0.65);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x, y + s * 0.6, s, s * 0.15, s * 0.04);
  ctx.stroke();
  // Wheels
  ctx.beginPath();
  ctx.arc(x + s * 0.24, y + s * 0.78, s * 0.11, 0, Math.PI * 2);
  ctx.arc(x + s * 0.76, y + s * 0.78, s * 0.11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawAreaIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.08;
  ctx.lineCap = 'round';
  const armLen = s * 0.32;
  // Four corner "expand" brackets
  const corners: [number, number, number, number][] = [
    [x, y, 1, 1],
    [x + s, y, -1, 1],
    [x, y + s, 1, -1],
    [x + s, y + s, -1, -1]
  ];
  corners.forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx * armLen, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * armLen);
    ctx.stroke();
  });
  ctx.restore();
}

function drawPinIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + s * 0.5, y + s * 0.38, s * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.5, y + s);
  ctx.lineTo(x + s * 0.24, y + s * 0.55);
  ctx.lineTo(x + s * 0.76, y + s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x + s * 0.5, y + s * 0.38, s * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

interface SpecItem { icon: (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) => void; label: string; }

function buildSpecItems(prop: Property): SpecItem[] {
  return [
    prop.bedrooms ? { icon: drawBedIcon, label: `${prop.bedrooms} Quartos` } : null,
    prop.bathrooms ? { icon: drawShowerIcon, label: `${prop.bathrooms} Banheiros` } : null,
    prop.parking_spaces ? { icon: drawCarIcon, label: `${prop.parking_spaces} Vagas` } : null,
    prop.total_area ? { icon: drawAreaIcon, label: `${prop.total_area}m²` } : null
  ].filter((x): x is SpecItem => x !== null);
}

/** Draws an icon+label spec row. `compact` uses shorter numeric labels (for tight overlays). */
function drawSpecsRow(
  ctx: CanvasRenderingContext2D,
  prop: Property,
  canvasW: number,
  x: number,
  y: number,
  color: string,
  iconSize: number,
  gap: number,
  compact = false
) {
  const items = buildSpecItems(prop);
  let cursorX = x;
  ctx.font = `700 ${iconSize * 0.75}px sans-serif`;
  for (const item of items) {
    item.icon(ctx, cursorX, y - iconSize * 0.72, iconSize, color);
    const labelText = compact ? item.label.replace(/[^\d,.m²]+/g, '').trim() || item.label : item.label;
    ctx.fillStyle = color;
    ctx.fillText(labelText, cursorX + iconSize * 1.2, y);
    const labelW = ctx.measureText(labelText).width;
    cursorX += iconSize * 1.2 + labelW + gap;
  }
}

/**
 * TEMPLATE "capa" — Capa Premium: photo fills ~70% of the frame, purpose tag + price +
 * neighborhood overlaid on the photo (with a gradient for legibility), then a clean white
 * section below with the property title, an icon spec row, and the logo footer.
 */
function drawCapaTemplate(
  ctx: CanvasRenderingContext2D,
  prop: Property,
  companySettings: CompanySettings,
  canvasW: number,
  canvasH: number,
  photoH: number
) {
  const pad = canvasW * 0.06;
  const priceInfo = getPropertyPriceInfo(prop);

  // Legibility gradient over the lower part of the photo
  const grad = ctx.createLinearGradient(0, photoH * 0.55, 0, photoH);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, photoH * 0.55, canvasW, photoH * 0.45);

  // Purpose tag — top-left over the photo
  ctx.font = `900 ${canvasW * 0.03}px sans-serif`;
  const tag = (prop.purpose || 'Venda').toUpperCase();
  const tagW = ctx.measureText(tag).width + canvasW * 0.045;
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(pad, pad, tagW, canvasW * 0.055, canvasW * 0.006);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(tag, pad + canvasW * 0.022, pad + canvasW * 0.038);

  // Price + neighborhood pill, bottom of the photo
  let py = photoH - canvasW * 0.15;
  ctx.font = `900 ${canvasW * 0.062}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(priceInfo.primaryFormatted, pad, py);
  py += canvasW * 0.055;

  ctx.font = `600 ${canvasW * 0.026}px sans-serif`;
  const locationText = `${prop.neighborhood} | ${prop.city}`;
  const locW = ctx.measureText(locationText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.roundRect(pad, py, locW + canvasW * 0.06, canvasW * 0.045, canvasW * 0.022);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(locationText, pad + canvasW * 0.03, py + canvasW * 0.032);

  // Bottom white section
  const bottomY = photoH;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, bottomY, canvasW, canvasH - bottomY);

  let y = bottomY + canvasW * 0.075;
  ctx.font = `800 ${canvasW * 0.038}px sans-serif`;
  ctx.fillStyle = NEAR_BLACK;
  const titleLines = wrapText(ctx, prop.title, canvasW - pad * 2);
  titleLines.slice(0, 2).forEach(line => {
    ctx.fillText(line, pad, y);
    y += canvasW * 0.05;
  });
  y += canvasW * 0.02;

  // Divider
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(canvasW - pad, y);
  ctx.stroke();
  y += canvasW * 0.06;

  drawSpecsRow(ctx, prop, canvasW, pad, y, NEAR_BLACK, canvasW * 0.045, canvasW * 0.04);
  y += canvasW * 0.09;

  // Footer logo
  drawLopesHeart(ctx, canvasW / 2 - canvasW * 0.025, canvasH - canvasW * 0.11, canvasW * 0.05, LOPES_RED);
  ctx.font = `900 ${canvasW * 0.03}px sans-serif`;
  ctx.fillStyle = NEAR_BLACK;
  ctx.textAlign = 'center';
  ctx.fillText(companySettings.company_name || 'Lopes Manaus', canvasW / 2, canvasH - canvasW * 0.03);
  ctx.textAlign = 'left';
}

/**
 * TEMPLATE "ficha" — Ficha Técnica: catalog-style layout. Photo on top, then title, a detail
 * list (Quartos/Suítes/Banheiros/Vagas/Área), the description, price, and a visual
 * "Agende sua visita" call-to-action bar at the bottom.
 */
function drawFichaTemplate(
  ctx: CanvasRenderingContext2D,
  prop: Property,
  companySettings: CompanySettings,
  canvasW: number,
  canvasH: number,
  photoH: number
) {
  const pad = canvasW * 0.06;
  const priceInfo = getPropertyPriceInfo(prop);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, photoH, canvasW, canvasH - photoH);

  let y = photoH + canvasW * 0.08;
  ctx.font = `800 ${canvasW * 0.042}px sans-serif`;
  ctx.fillStyle = NEAR_BLACK;
  const heroTitle = `Seu novo lar em ${prop.neighborhood}`;
  const titleLines = wrapText(ctx, heroTitle, canvasW - pad * 2);
  titleLines.slice(0, 2).forEach(line => {
    ctx.fillText(line, pad, y);
    y += canvasW * 0.052;
  });
  y += canvasW * 0.015;

  // Location + type row, with icon
  drawPinIcon(ctx, pad, y - canvasW * 0.03, canvasW * 0.032, LOPES_RED);
  ctx.font = `600 ${canvasW * 0.028}px sans-serif`;
  ctx.fillStyle = '#4B5563';
  ctx.fillText(`${prop.neighborhood} · ${prop.city}  —  ${prop.category}`, pad + canvasW * 0.045, y);
  y += canvasW * 0.06;

  ctx.strokeStyle = '#E5E7EB';
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(canvasW - pad, y);
  ctx.stroke();
  y += canvasW * 0.05;

  // Detail list — label / value pairs, two columns
  const details = [
    ['Quartos', String(prop.bedrooms || '-')],
    ['Suítes', String(prop.suites || '-')],
    ['Banheiros', String(prop.bathrooms || '-')],
    ['Vagas', String(prop.parking_spaces || '-')],
    ['Área', prop.total_area ? `${prop.total_area}m²` : '-']
  ];
  const colW = (canvasW - pad * 2) / 2;
  details.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const dx = pad + col * colW;
    const dy = y + row * (canvasW * 0.075);
    ctx.font = `600 ${canvasW * 0.025}px sans-serif`;
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(label, dx, dy);
    ctx.font = `800 ${canvasW * 0.034}px sans-serif`;
    ctx.fillStyle = NEAR_BLACK;
    ctx.fillText(value, dx, dy + canvasW * 0.038);
  });
  y += Math.ceil(details.length / 2) * (canvasW * 0.075) + canvasW * 0.03;

  // Description
  if (prop.description) {
    ctx.font = `500 ${canvasW * 0.024}px sans-serif`;
    ctx.fillStyle = '#4B5563';
    const descLines = wrapText(ctx, prop.description, canvasW - pad * 2);
    descLines.slice(0, 3).forEach(line => {
      ctx.fillText(line, pad, y);
      y += canvasW * 0.033;
    });
    y += canvasW * 0.02;
  }

  // Price + CTA bar
  const ctaH = canvasW * 0.13;
  const ctaY = canvasH - ctaH - canvasW * 0.06;
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(pad, ctaY, canvasW - pad * 2, ctaH, canvasW * 0.02);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${canvasW * 0.034}px sans-serif`;
  ctx.fillText(priceInfo.primaryFormatted, pad + canvasW * 0.04, ctaY + ctaH * 0.42);
  ctx.font = `700 ${canvasW * 0.024}px sans-serif`;
  ctx.fillText('Agende sua visita', pad + canvasW * 0.04, ctaY + ctaH * 0.75);

  drawLopesHeart(ctx, canvasW - pad - canvasW * 0.06, ctaY + ctaH / 2 - canvasW * 0.03, canvasW * 0.06, '#FFFFFF');
}

/**
 * TEMPLATE "premium" — Alto Padrão: elegant dark background, large photo, minimal text, heavy
 * negative space — a "real-estate magazine" look rather than a busy ad card.
 */
function drawPremiumTemplate(
  ctx: CanvasRenderingContext2D,
  prop: Property,
  companySettings: CompanySettings,
  canvasW: number,
  canvasH: number,
  photoY: number,
  photoH: number
) {
  const pad = canvasW * 0.08;

  // Only the strip below the photo needs a solid dark fill — the photo itself must stay
  // visible. Filling the whole canvas here was overwriting the photo entirely.
  ctx.fillStyle = NEAR_BLACK;
  ctx.fillRect(0, photoY + photoH, canvasW, canvasH - (photoY + photoH));

  // Photo is drawn by the caller (renderSocialCanvas) before this function runs.

  // Dark gradient at top and bottom of the photo for text legibility
  const topGrad = ctx.createLinearGradient(0, photoY, 0, photoY + canvasH * 0.22);
  topGrad.addColorStop(0, 'rgba(0,0,0,0.65)');
  topGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, photoY, canvasW, canvasH * 0.22);

  const bottomGrad = ctx.createLinearGradient(0, photoY + photoH - canvasH * 0.3, 0, photoY + photoH);
  bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
  bottomGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, photoY + photoH - canvasH * 0.3, canvasW, canvasH * 0.3);

  // Overline
  ctx.font = `italic 400 ${canvasW * 0.028}px Georgia, serif`;
  ctx.fillStyle = '#E5E7EB';
  ctx.fillText('Exclusividade em cada detalhe', pad, photoY + canvasW * 0.06);

  // Title
  ctx.font = `400 ${canvasW * 0.065}px Georgia, serif`;
  ctx.fillStyle = '#FFFFFF';
  const titleLines = wrapText(ctx, prop.title, canvasW - pad * 2);
  let ty = photoY + canvasW * 0.13;
  titleLines.slice(0, 2).forEach(line => {
    ctx.fillText(line, pad, ty);
    ty += canvasW * 0.075;
  });

  // Bottom block: location + price
  const priceInfo = getPropertyPriceInfo(prop);
  let by = photoY + photoH - canvasW * 0.075;
  ctx.font = `400 ${canvasW * 0.03}px Georgia, serif`;
  ctx.fillStyle = '#D1D5DB';
  ctx.fillText(`${prop.neighborhood} — ${prop.city}`, pad, by);
  by -= canvasW * 0.06;
  ctx.font = `700 ${canvasW * 0.05}px Georgia, serif`;
  ctx.fillStyle = LOPES_RED;
  ctx.fillText(priceInfo.primaryFormatted, pad, by);

  // Footer logo, below the photo on the dark background
  const footerY = photoY + photoH + canvasW * 0.07;
  drawLopesHeart(ctx, canvasW / 2 - canvasW * 0.03, footerY, canvasW * 0.06, LOPES_RED);
  ctx.font = `400 ${canvasW * 0.028}px Georgia, serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(companySettings.company_name || 'Lopes Manaus', canvasW / 2, footerY + canvasW * 0.06);
  ctx.textAlign = 'left';
}


async function renderSocialCanvas(
  prop: Property,
  companySettings: CompanySettings,
  width: number,
  height: number,
  template: SocialMediaTemplate
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const images = extractPropertyImages(prop);
  const mainImg = await loadImageElement(images[0] || '');

  // Real-estate photos captadores upload are usually plain phone snapshots (flat lighting,
  // muted colors) rather than professionally shot/rendered images. A gentle brightness/
  // contrast/saturation boost — the same kind of correction a phone camera app applies
  // automatically — makes them read as noticeably more polished, without altering anything
  // about the property itself (no AI-invented details, so nothing here can misrepresent what's
  // actually being advertised). Reset the filter right after so it never leaks into the
  // text/icon drawing that follows.
  const applyPhotoEnhancement = () => {
    ctx.filter = 'brightness(1.06) contrast(1.14) saturate(1.22)';
  };
  const resetFilter = () => {
    ctx.filter = 'none';
  };

  if (template === 'capa') {
    const photoH = height * 0.68;
    applyPhotoEnhancement();
    drawRoundedImage(ctx, mainImg, 0, 0, width, photoH, 0, prop.title);
    resetFilter();
    drawCapaTemplate(ctx, prop, companySettings, width, height, photoH);
  } else if (template === 'ficha') {
    const photoH = height * 0.32;
    applyPhotoEnhancement();
    drawRoundedImage(ctx, mainImg, 0, 0, width, photoH, 0, prop.title);
    resetFilter();
    drawFichaTemplate(ctx, prop, companySettings, width, height, photoH);
  } else {
    const photoY = 0;
    const photoH = height * 0.78;
    applyPhotoEnhancement();
    drawRoundedImage(ctx, mainImg, 0, photoY, width, photoH, 0, prop.title);
    resetFilter();
    drawPremiumTemplate(ctx, prop, companySettings, width, height, photoY, photoH);
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
  template: SocialMediaTemplate = 'capa'
): Promise<HTMLCanvasElement> {
  return renderSocialCanvas(prop, companySettings, 1080, 1350, template);
}

/** Story — 1080x1920 (9:16). */
export async function generateStoryPost(
  prop: Property,
  companySettings: CompanySettings,
  template: SocialMediaTemplate = 'capa'
): Promise<HTMLCanvasElement> {
  return renderSocialCanvas(prop, companySettings, 1080, 1920, template);
}

/** Generates and downloads both the feed and the story image for a property, in the chosen template. */
export async function generateAndDownloadSocialMedia(
  prop: Property,
  companySettings: CompanySettings,
  template: SocialMediaTemplate = 'capa'
) {
  const feed = await generateFeedPost(prop, companySettings, template);
  downloadCanvas(feed, `${prop.code}_feed_instagram.png`);

  const story = await generateStoryPost(prop, companySettings, template);
  // Slight delay so the browser doesn't drop the second automatic download.
  await new Promise(resolve => setTimeout(resolve, 400));
  downloadCanvas(story, `${prop.code}_story_instagram.png`);
}
