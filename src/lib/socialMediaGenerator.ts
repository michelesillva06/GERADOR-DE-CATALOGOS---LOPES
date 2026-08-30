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

/** Shortens text with an ellipsis if it would overflow maxWidth. */
function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}

// =============================================================================
// VECTOR ICONS — simple line/fill icons drawn with canvas paths. No emoji, no external icon
// library: this generator's brand rules call for a clean, editorial look, and emoji render
// inconsistently across devices/browsers.
// =============================================================================

function drawHouseIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.5, y);
  ctx.lineTo(x + s * 0.95, y + s * 0.42);
  ctx.lineTo(x + s * 0.8, y + s * 0.42);
  ctx.lineTo(x + s * 0.8, y + s * 0.95);
  ctx.lineTo(x + s * 0.2, y + s * 0.95);
  ctx.lineTo(x + s * 0.2, y + s * 0.42);
  ctx.lineTo(x + s * 0.05, y + s * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBedIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.roundRect(x, y + s * 0.45, s, s * 0.35, s * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + s * 0.08, y + s * 0.15, s * 0.32, s * 0.32, s * 0.06);
  ctx.stroke();
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
  ctx.beginPath();
  ctx.roundRect(x + s * 0.15, y + s * 0.05, s * 0.7, s * 0.22, s * 0.1);
  ctx.stroke();
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

/**
 * THE template — a single standard layout modeled directly on the style Michele approved
 * (red rounded header/badge, circular category icon, location/area/price info boxes,
 * "CARACTERÍSTICAS" icon row). Only public-facing fields are shown: no captação status, no
 * caução/renda requirements or anything else from internal negotiation — those never belong on
 * a public social post.
 */
function drawStandardTemplate(
  ctx: CanvasRenderingContext2D,
  prop: Property,
  companySettings: CompanySettings,
  canvasW: number,
  canvasH: number,
  photoH: number
) {
  const pad = canvasW * 0.055;
  const priceInfo = getPropertyPriceInfo(prop);

  // ---- Header banner (drawn over the photo, top-left) ----
  const headerW = canvasW * 0.36;
  const headerH = canvasW * 0.1;
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(0, 0, headerW, headerH, [0, 0, canvasW * 0.03, 0]);
  ctx.fill();
  drawLopesHeart(ctx, canvasW * 0.03, headerH * 0.16, canvasW * 0.045, '#FFFFFF');
  ctx.font = `900 ${canvasW * 0.034}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Lopes', canvasW * 0.09, headerH * 0.5);
  ctx.font = `700 ${canvasW * 0.017}px sans-serif`;
  ctx.fillText('MANAUS', canvasW * 0.09, headerH * 0.82);

  // ---- Purpose badge (top-right, over the photo) ----
  const purposeText = (prop.purpose || 'Venda').toUpperCase();
  ctx.font = `900 ${canvasW * 0.024}px sans-serif`;
  const badgeTextW = ctx.measureText(purposeText).width;
  const badgeW = badgeTextW + canvasW * 0.13;
  const badgeH = canvasW * 0.08;
  const badgeX = canvasW - badgeW;
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(badgeX, canvasW * 0.025, badgeW, badgeH, [canvasW * 0.03, 0, 0, canvasW * 0.03]);
  ctx.fill();
  drawHouseIcon(ctx, badgeX + canvasW * 0.025, canvasW * 0.025 + badgeH * 0.28, canvasW * 0.035, '#FFFFFF');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(purposeText, badgeX + canvasW * 0.075, canvasW * 0.025 + badgeH * 0.6);

  // ---- White content area below the photo ----
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, photoH, canvasW, canvasH - photoH);

  let y = photoH + canvasW * 0.08;

  // Category icon + title/subtitle
  const circleR = canvasW * 0.052;
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.arc(pad + circleR, y, circleR, 0, Math.PI * 2);
  ctx.fill();
  drawHouseIcon(ctx, pad + circleR - circleR * 0.5, y - circleR * 0.5, circleR, '#FFFFFF');

  const titleX = pad + circleR * 2 + canvasW * 0.03;
  ctx.font = `900 ${canvasW * 0.04}px sans-serif`;
  ctx.fillStyle = NEAR_BLACK;
  ctx.fillText(truncateText(ctx, (prop.category || 'Imóvel').toUpperCase(), canvasW - titleX - pad), titleX, y - canvasW * 0.008);
  ctx.font = `600 ${canvasW * 0.024}px sans-serif`;
  ctx.fillStyle = '#6B7280';
  ctx.fillText(truncateText(ctx, `${prop.neighborhood} — ${prop.city}`, canvasW - titleX - pad), titleX, y + canvasW * 0.028);

  y += circleR + canvasW * 0.055;

  // Location / Área / Preço info boxes, single row
  const boxGap = canvasW * 0.025;
  const boxH = canvasW * 0.175;
  const locW = canvasW * 0.31;
  const areaW = canvasW * 0.21;
  const priceW = canvasW - pad * 2 - locW - areaW - boxGap * 2;

  const drawInfoBox = (bx: number, bw: number, filled: boolean) => {
    ctx.fillStyle = filled ? LOPES_RED : '#F8FAFC';
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = filled ? 0 : 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, y, bw, boxH, canvasW * 0.02);
    ctx.fill();
    if (!filled) ctx.stroke();
  };

  // Localização box
  let bx = pad;
  drawInfoBox(bx, locW, false);
  drawPinIcon(ctx, bx + canvasW * 0.02, y + canvasW * 0.02, canvasW * 0.032, LOPES_RED);
  ctx.font = `700 ${canvasW * 0.016}px sans-serif`;
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText('LOCALIZAÇÃO', bx + canvasW * 0.02, y + canvasW * 0.09);
  ctx.font = `800 ${canvasW * 0.021}px sans-serif`;
  ctx.fillStyle = NEAR_BLACK;
  const locLines = wrapText(ctx, prop.neighborhood || '', locW - canvasW * 0.04);
  locLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, bx + canvasW * 0.02, y + canvasW * 0.12 + i * canvasW * 0.025);
  });

  // Área box
  bx = pad + locW + boxGap;
  drawInfoBox(bx, areaW, false);
  const areaValue = prop.built_area || prop.total_area;
  drawAreaIcon(ctx, bx + canvasW * 0.02, y + canvasW * 0.02, canvasW * 0.032, LOPES_RED);
  ctx.font = `700 ${canvasW * 0.016}px sans-serif`;
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText('ÁREA', bx + canvasW * 0.02, y + canvasW * 0.09);
  ctx.font = `800 ${canvasW * 0.024}px sans-serif`;
  ctx.fillStyle = NEAR_BLACK;
  ctx.fillText(areaValue ? `${areaValue}m²` : '-', bx + canvasW * 0.02, y + canvasW * 0.13);

  // Preço box (filled red)
  bx = pad + locW + areaW + boxGap * 2;
  drawInfoBox(bx, priceW, true);
  ctx.font = `900 ${canvasW * 0.03}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  const priceLines = wrapText(ctx, priceInfo.primaryFormatted, priceW - canvasW * 0.03);
  priceLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, bx + canvasW * 0.018, y + canvasW * 0.075 + i * canvasW * 0.032);
  });
  ctx.font = `700 ${canvasW * 0.015}px sans-serif`;
  ctx.fillText(purposeText, bx + canvasW * 0.018, y + boxH - canvasW * 0.018);

  y += boxH + canvasW * 0.06;

  // "CARACTERÍSTICAS" label
  ctx.font = `900 ${canvasW * 0.019}px sans-serif`;
  const labelText = 'CARACTERÍSTICAS';
  const labelW = ctx.measureText(labelText).width + canvasW * 0.05;
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(pad, y, labelW, canvasW * 0.045, canvasW * 0.008);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(labelText, pad + canvasW * 0.025, y + canvasW * 0.031);
  y += canvasW * 0.045 + canvasW * 0.05;

  // Feature icons row: quartos, banheiros, vagas
  const features: { icon: (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) => void; value: string; label: string }[] = [
    { icon: drawBedIcon, value: String(prop.bedrooms || '-'), label: 'QUARTOS' },
    { icon: drawShowerIcon, value: String(prop.bathrooms || '-'), label: 'BANHEIROS' },
    { icon: drawCarIcon, value: String(prop.parking_spaces || '-'), label: 'VAGAS' }
  ];
  const featColW = (canvasW - pad * 2) / features.length;
  features.forEach((f, i) => {
    const fx = pad + i * featColW + featColW / 2;
    const iconSize = canvasW * 0.05;
    f.icon(ctx, fx - iconSize / 2, y, iconSize, LOPES_RED);
    ctx.textAlign = 'center';
    ctx.font = `900 ${canvasW * 0.03}px sans-serif`;
    ctx.fillStyle = NEAR_BLACK;
    ctx.fillText(f.value, fx, y + iconSize + canvasW * 0.036);
    ctx.font = `700 ${canvasW * 0.015}px sans-serif`;
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(f.label, fx, y + iconSize + canvasW * 0.058);
    ctx.textAlign = 'left';
  });
  y += canvasW * 0.05 + canvasW * 0.075;

  // Footer logo — positioned dynamically right after the content above, clamped so it never
  // runs past the bottom edge on the taller Story canvas.
  const footerY = Math.min(y, canvasH - canvasW * 0.09);
  drawLopesHeart(ctx, canvasW / 2 - canvasW * 0.022, footerY, canvasW * 0.044, LOPES_RED);
  ctx.font = `800 ${canvasW * 0.022}px sans-serif`;
  ctx.fillStyle = NEAR_BLACK;
  ctx.textAlign = 'center';
  ctx.fillText(companySettings.company_name || 'Lopes Manaus', canvasW / 2, footerY + canvasW * 0.06);
  ctx.textAlign = 'left';
}

async function renderSocialCanvas(
  prop: Property,
  companySettings: CompanySettings,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const images = extractPropertyImages(prop);
  const mainImg = await loadImageElement(images[0] || '');

  // Real-estate photos captadores upload are usually plain phone snapshots (flat lighting,
  // muted colors). A gentle brightness/contrast/saturation boost — the same kind of correction
  // a phone camera app applies automatically — makes them read as noticeably more polished,
  // without altering anything about the property itself.
  const photoH = height * 0.4;
  ctx.filter = 'brightness(1.06) contrast(1.14) saturate(1.22)';
  drawRoundedImage(ctx, mainImg, 0, 0, width, photoH, 0, prop.title);
  ctx.filter = 'none';

  drawStandardTemplate(ctx, prop, companySettings, width, height, photoH);

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
export async function generateFeedPost(prop: Property, companySettings: CompanySettings): Promise<HTMLCanvasElement> {
  return renderSocialCanvas(prop, companySettings, 1080, 1350);
}

/** Story — 1080x1920 (9:16). */
export async function generateStoryPost(prop: Property, companySettings: CompanySettings): Promise<HTMLCanvasElement> {
  return renderSocialCanvas(prop, companySettings, 1080, 1920);
}

/** Generates and downloads both the feed and the story image for a property. */
export async function generateAndDownloadSocialMedia(prop: Property, companySettings: CompanySettings) {
  const feed = await generateFeedPost(prop, companySettings);
  downloadCanvas(feed, `${prop.code}_feed_instagram.png`);

  const story = await generateStoryPost(prop, companySettings);
  // Slight delay so the browser doesn't drop the second automatic download.
  await new Promise(resolve => setTimeout(resolve, 400));
  downloadCanvas(story, `${prop.code}_story_instagram.png`);
}
