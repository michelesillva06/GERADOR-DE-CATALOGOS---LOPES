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
// VECTOR ICONS — the actual Lucide icon paths (the same icon set used everywhere else in this
// app's UI), rendered on canvas via Path2D. Hand-drawn placeholder icons read as noticeably
// less polished than a real, professionally designed icon set, so this generator uses the real
// thing instead of reinventing bed/car/shower shapes from scratch.
// =============================================================================

type LucideNode = { d: string } | { cx: number; cy: number; r: number };

function isCircleNode(node: LucideNode): node is { cx: number; cy: number; r: number } {
  return 'cx' in node;
}

/** Draws a 24x24-viewBox Lucide icon at (x, y) scaled to `size`, stroked in `color`. */
function drawLucideIcon(ctx: CanvasRenderingContext2D, nodes: LucideNode[], x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 24;
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const node of nodes) {
    if (isCircleNode(node)) {
      ctx.beginPath();
      ctx.arc(node.cx, node.cy, node.r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.stroke(new Path2D(node.d));
    }
  }
  ctx.restore();
}

// Icon path data copied directly from lucide-react (same package this app's UI already uses).
const ICON_HOUSE: LucideNode[] = [
  { d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' },
  { d: 'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }
];
const ICON_BED: LucideNode[] = [
  { d: 'M2 4v16' },
  { d: 'M2 8h18a2 2 0 0 1 2 2v10' },
  { d: 'M2 17h20' },
  { d: 'M6 8v9' }
];
const ICON_BATH: LucideNode[] = [
  { d: 'M10 4 8 6' },
  { d: 'M17 19v2' },
  { d: 'M2 12h20' },
  { d: 'M7 19v2' },
  { d: 'M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5' }
];
const ICON_CAR: LucideNode[] = [
  { d: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2' },
  { cx: 7, cy: 17, r: 2 },
  { d: 'M9 17h6' },
  { cx: 17, cy: 17, r: 2 }
];
const ICON_MAXIMIZE: LucideNode[] = [
  { d: 'M8 3H5a2 2 0 0 0-2 2v3' },
  { d: 'M21 8V5a2 2 0 0 0-2-2h-3' },
  { d: 'M3 16v3a2 2 0 0 0 2 2h3' },
  { d: 'M16 21h3a2 2 0 0 0 2-2v-3' }
];
const ICON_MAP_PIN: LucideNode[] = [
  { d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' },
  { cx: 12, cy: 10, r: 3 }
];

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
  drawLucideIcon(ctx, ICON_HOUSE, badgeX + canvasW * 0.02, canvasW * 0.025 + badgeH * 0.22, canvasW * 0.04, '#FFFFFF');
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
  drawLucideIcon(ctx, ICON_HOUSE, pad + circleR - circleR * 0.55, y - circleR * 0.55, circleR * 1.1, '#FFFFFF');

  const titleX = pad + circleR * 2 + canvasW * 0.03;
  ctx.font = `900 ${canvasW * 0.04}px sans-serif`;
  ctx.fillStyle = NEAR_BLACK;
  ctx.fillText(truncateText(ctx, (prop.category || 'Imóvel').toUpperCase(), canvasW - titleX - pad), titleX, y - canvasW * 0.008);
  ctx.font = `600 ${canvasW * 0.024}px sans-serif`;
  ctx.fillStyle = '#6B7280';
  ctx.fillText(truncateText(ctx, `${prop.neighborhood} — ${prop.city}`, canvasW - titleX - pad), titleX, y + canvasW * 0.028);

  y += circleR + canvasW * 0.055;

  // Location / Área / Preço info boxes, single row. Área only gets its own box when the
  // property actually has that data — showing a bare "-" in a labeled box reads as broken to
  // someone viewing the post, worse than just not mentioning it at all.
  const areaValue = prop.built_area || prop.total_area;
  const boxGap = canvasW * 0.025;
  const boxH = canvasW * 0.175;
  const locW = areaValue ? canvasW * 0.31 : canvasW * 0.42;
  const areaW = areaValue ? canvasW * 0.21 : 0;
  const priceW = canvasW - pad * 2 - locW - areaW - boxGap * (areaValue ? 2 : 1);

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
  drawLucideIcon(ctx, ICON_MAP_PIN, bx + canvasW * 0.02, y + canvasW * 0.018, canvasW * 0.036, LOPES_RED);
  ctx.font = `700 ${canvasW * 0.016}px sans-serif`;
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText('LOCALIZAÇÃO', bx + canvasW * 0.02, y + canvasW * 0.09);
  ctx.font = `800 ${canvasW * 0.021}px sans-serif`;
  ctx.fillStyle = NEAR_BLACK;
  const locLines = wrapText(ctx, prop.neighborhood || '', locW - canvasW * 0.04);
  locLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, bx + canvasW * 0.02, y + canvasW * 0.12 + i * canvasW * 0.025);
  });

  // Área box — only drawn when there's real data to show
  if (areaValue) {
    bx = pad + locW + boxGap;
    drawInfoBox(bx, areaW, false);
    drawLucideIcon(ctx, ICON_MAXIMIZE, bx + canvasW * 0.02, y + canvasW * 0.018, canvasW * 0.036, LOPES_RED);
    ctx.font = `700 ${canvasW * 0.016}px sans-serif`;
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('ÁREA', bx + canvasW * 0.02, y + canvasW * 0.09);
    ctx.font = `800 ${canvasW * 0.024}px sans-serif`;
    ctx.fillStyle = NEAR_BLACK;
    ctx.fillText(`${areaValue}m²`, bx + canvasW * 0.02, y + canvasW * 0.13);
  }

  // Preço box (filled red)
  bx = pad + locW + areaW + boxGap * (areaValue ? 2 : 1);
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
  y += canvasW * 0.045 + canvasW * 0.06;

  // Feature icons row: quartos, banheiros, vagas, área (área repeated here even when it also
  // has its own info box above — grouping every spec together under "Características" reads
  // more complete than splitting them, and matches the reference layout Michele approved).
  const features: { icon: LucideNode[]; value: string; label: string }[] = [
    { icon: ICON_BED, value: String(prop.bedrooms || '-'), label: 'QUARTOS' },
    { icon: ICON_BATH, value: String(prop.bathrooms || '-'), label: 'BANHEIROS' },
    { icon: ICON_CAR, value: String(prop.parking_spaces || '-'), label: 'VAGAS' },
    { icon: ICON_MAXIMIZE, value: areaValue ? `${areaValue}m²` : '-', label: 'ÁREA' }
  ];
  const featColW = (canvasW - pad * 2) / features.length;
  features.forEach((f, i) => {
    const fx = pad + i * featColW + featColW / 2;
    const iconSize = canvasW * 0.05;
    drawLucideIcon(ctx, f.icon, fx - iconSize / 2, y, iconSize, LOPES_RED);
    ctx.textAlign = 'center';
    ctx.font = `900 ${canvasW * 0.03}px sans-serif`;
    ctx.fillStyle = NEAR_BLACK;
    ctx.fillText(f.value, fx, y + iconSize + canvasW * 0.036);
    ctx.font = `700 ${canvasW * 0.015}px sans-serif`;
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(f.label, fx, y + iconSize + canvasW * 0.058);
    ctx.textAlign = 'left';
  });
  y += canvasW * 0.05 + canvasW * 0.09;

  // Footer band — a full-width colored strip rather than a logo floating on bare white space.
  // On the Story format especially, there's meaningfully more vertical room below the content
  // than on Feed; a deliberate footer band fills that space as a designed element instead of
  // reading as "ran out of content halfway down the image".
  const footerBandH = canvasH - y;
  ctx.fillStyle = '#FFF1F4';
  ctx.fillRect(0, y, canvasW, footerBandH);
  const footerCenterY = y + footerBandH / 2;
  drawLopesHeart(ctx, canvasW / 2 - canvasW * 0.022, footerCenterY - canvasW * 0.06, canvasW * 0.044, LOPES_RED);
  ctx.font = `800 ${canvasW * 0.022}px sans-serif`;
  ctx.fillStyle = NEAR_BLACK;
  ctx.textAlign = 'center';
  ctx.fillText(companySettings.company_name || 'Lopes Manaus', canvasW / 2, footerCenterY + canvasW * 0.01);
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
