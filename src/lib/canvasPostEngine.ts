import { Property, CompanySettings } from '../types';
import { PostTemplateId } from '../components/postTemplates';
import { extractPropertyImages } from './pdfGenerator';

export type PostDesignTheme = 'ruby_premium' | 'gold_dark';
export type PostLayoutStyle = 'single' | 'gallery';

export interface CanvasPostData {
  headlineLine1?: string;
  headlineLine2?: string;
  highlightNumber?: string;
  statusTag?: string;
  subStatus?: string;
  priceFormatted?: string;
  locationTag?: string;
  specs?: Array<{ icon: string; label: string }>;
  ctaText?: string;
  whatsappNumber?: string;
  hook?: string;
  designTheme?: PostDesignTheme;
  layoutStyle?: PostLayoutStyle;
  secondaryPhotos?: string[];
}

export function extractDefaultPropertySpecs(p: Property): Array<{ icon: string; label: string }> {
  const specs: Array<{ icon: string; label: string }> = [];

  const bedrooms = p.bedrooms || 0;
  if (bedrooms > 0) {
    specs.push({ icon: 'bed', label: `${bedrooms} ${bedrooms === 1 ? 'QUARTO' : 'QUARTOS'}` });
  }

  const bathrooms = p.bathrooms || 0;
  if (bathrooms > 0) {
    specs.push({ icon: 'bath', label: `${bathrooms} ${bathrooms === 1 ? 'BANHEIRO' : 'BANHEIROS'}` });
  }

  const parking = p.parking_spaces || 0;
  if (parking > 0) {
    specs.push({ icon: 'car', label: `${parking} ${parking === 1 ? 'VAGA' : 'VAGAS'}` });
  }

  const area = p.total_area || p.built_area || p.usable_area || 0;
  if (area > 0) {
    specs.push({ icon: 'area', label: `${area} m²` });
  }

  const suites = p.suites || 0;
  if (suites > 0 && specs.length < 8) {
    specs.push({ icon: 'bed', label: `${suites} ${suites === 1 ? 'SUÍTE' : 'SUÍTES'}` });
  }

  if (p.features && Array.isArray(p.features)) {
    for (const feat of p.features) {
      if (specs.length >= 8) break;
      const cleanFeat = (feat || '').trim();
      if (!cleanFeat) continue;
      const f = cleanFeat.toLowerCase();

      let icon = 'star';
      if (f.includes('piscina') || f.includes('pool')) icon = 'piscina';
      else if (f.includes('churras') || f.includes('gourmet') || f.includes('bbq')) icon = 'churrasqueira';
      else if (f.includes('quadra') || f.includes('campo')) icon = 'quadra';
      else if (f.includes('festa') || f.includes('evento') || f.includes('salao')) icon = 'salao';
      else if (f.includes('academia') || f.includes('fitness') || f.includes('ginast')) icon = 'academia';
      else if (f.includes('elevador')) icon = 'elevador';
      else if (f.includes('portaria') || f.includes('seguran') || f.includes('guarita')) icon = 'portaria';
      else if (f.includes('varanda') || f.includes('sacada') || f.includes('balcao')) icon = 'varanda';
      else if (f.includes('gerador')) icon = 'gerador';
      else if (f.includes('ar ') || f.includes('climatiz')) icon = 'ar';
      else if (f.includes('vista')) icon = 'vista';
      else if (f.includes('mobilia') || f.includes('armari')) icon = 'mobiliado';
      else if (f.includes('solar') || f.includes('fotovolta')) icon = 'solar';

      const upperLabel = cleanFeat.toUpperCase();
      if (!specs.some(s => s.label.toUpperCase() === upperLabel)) {
        specs.push({ icon, label: upperLabel });
      }
    }
  }

  if (specs.length === 0) {
    specs.push({ icon: 'star', label: (p.category || 'IMÓVEL').toUpperCase() });
  }

  return specs.slice(0, 8);
}

export interface CanvasPostOptions {
  property: Property;
  companySettings: CompanySettings;
  templateId: PostTemplateId;
  photoUrl: string;
  width: number;
  height: number;
  aiData?: CanvasPostData;
}

/**
 * Safe image loader with crossOrigin fallback handling
 */
export async function loadImageSafely(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (err) => reject(err);
      fallbackImg.src = src;
    };
    img.src = src;
  });
}

/**
 * Helper to draw a rounded rectangle on a 2D Canvas context.
 */
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | number[]
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  } else {
    const r = typeof radius === 'number' ? radius : radius[0] || 0;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Draws image with cover aspect ratio inside a bounding box.
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number
) {
  const imgWidth = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width || dWidth;
  const imgHeight = (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height || dHeight;

  const imgRatio = imgWidth / imgHeight;
  const targetRatio = dWidth / dHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = imgWidth;
  let sHeight = imgHeight;

  if (imgRatio > targetRatio) {
    sWidth = imgHeight * targetRatio;
    sx = (imgWidth - sWidth) / 2;
  } else {
    sHeight = imgWidth / targetRatio;
    sy = (imgHeight - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

/**
 * Draws the vector Lopes Heart logo icon directly on the canvas.
 */
export function drawLopesHeartVector(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 36,
  color: string = '#E5094C'
) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 100;
  ctx.scale(scale, scale);

  ctx.fillStyle = color;

  // Head circle
  ctx.beginPath();
  ctx.arc(75, 28, 18, 0, Math.PI * 2);
  ctx.fill();

  // Heart curve body
  ctx.beginPath();
  ctx.moveTo(46, 92);
  ctx.bezierCurveTo(25, 74, 2, 52, 2, 30);
  ctx.bezierCurveTo(2, 12, 16, 0, 34, 0);
  ctx.bezierCurveTo(44, 0, 52, 5, 57, 14);
  ctx.bezierCurveTo(52, 23, 50, 33, 53, 43);
  ctx.bezierCurveTo(57, 55, 67, 62, 76, 62);
  ctx.bezierCurveTo(68, 76, 57, 86, 46, 92);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a WhatsApp icon vector badge
 */
export function drawWhatsAppVectorIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 28
) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 32;
  ctx.scale(scale, scale);

  // Circle background
  ctx.fillStyle = '#25D366';
  ctx.beginPath();
  ctx.arc(16, 16, 15, 0, Math.PI * 2);
  ctx.fill();

  // Handset icon
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(22, 18);
  ctx.quadraticCurveTo(21, 16, 19, 16);
  ctx.quadraticCurveTo(18, 16, 17, 17);
  ctx.lineTo(15.5, 15.5);
  ctx.lineTo(17, 14);
  ctx.quadraticCurveTo(17, 13, 16, 11);
  ctx.quadraticCurveTo(14, 9, 13, 10);
  ctx.lineTo(11.5, 11.5);
  ctx.quadraticCurveTo(10, 13, 13, 17);
  ctx.quadraticCurveTo(16, 21, 20.5, 20.5);
  ctx.quadraticCurveTo(22, 19.5, 22, 18);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a modern luxury property badge tag (Dual Capsule / Pill style).
 */
export function drawModernPropertyBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  status: string = 'VENDA',
  subStatus: string = 'DISPONÍVEL',
  theme: PostDesignTheme = 'ruby_premium'
) {
  ctx.save();

  const mainStatusText = (status || 'VENDA').toUpperCase();
  const subStatusText = (subStatus || 'DISPONÍVEL').toUpperCase();

  ctx.font = "900 24px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const mainMetrics = ctx.measureText(mainStatusText);

  ctx.font = "900 24px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const subMetrics = ctx.measureText(subStatusText);

  const topH = 52;
  const subH = 48;

  const minBadgeW = Math.max(mainMetrics.width + 76, subMetrics.width + 56);
  const badgeW = Math.max(220, minBadgeW);

  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 10;

  // Top Main Capsule Pill (Lopes Ruby Red or Luxury Dark Gradient)
  drawRoundRect(ctx, x, y, badgeW, topH, [18, 18, subStatusText ? 4 : 18, 4]);

  if (theme === 'gold_dark') {
    const goldGrad = ctx.createLinearGradient(x, y, x + badgeW, y + topH);
    goldGrad.addColorStop(0, '#D4AF37');
    goldGrad.addColorStop(0.5, '#F3E5AB');
    goldGrad.addColorStop(1, '#AA771C');
    ctx.fillStyle = goldGrad;
  } else {
    const mainGrad = ctx.createLinearGradient(x, y, x + badgeW, y + topH);
    mainGrad.addColorStop(0, '#F10F4D');
    mainGrad.addColorStop(1, '#B30030');
    ctx.fillStyle = mainGrad;
  }
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // White inner border highlight
  ctx.strokeStyle = theme === 'gold_dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Main Status Text ("LOPES")
  ctx.fillStyle = theme === 'gold_dark' ? '#0F172A' : '#FFFFFF';
  ctx.font = "900 24px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(mainStatusText, x + badgeW / 2, y + topH / 2 + 8);

  // Sub Status Ribbon attached underneath ("MANAUS" with same 24px font)
  if (subStatusText) {
    const subY = y + topH + 3;
    const subW = badgeW;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;

    drawRoundRect(ctx, x, subY, subW, subH, [4, 4, 16, 16]);
    ctx.fillStyle = theme === 'gold_dark' ? '#1E293B' : '#0F172A';
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = theme === 'gold_dark' ? '#F3E5AB' : '#FFFFFF';
    ctx.font = "900 24px 'Plus Jakarta Sans', 'Inter', sans-serif"; // Same font size as principal!
    ctx.textAlign = 'center';
    ctx.fillText(subStatusText, x + subW / 2, subY + subH / 2 + 8);
  }

  ctx.restore();
}

/**
 * Draws the official Lopes Manaus Brand Logo Badge (Header Top-Right)
 */
export function drawLopesManausHeaderLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: PostDesignTheme = 'ruby_premium'
) {
  ctx.save();
  const badgeW = 210;
  const badgeH = 54;

  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;

  drawRoundRect(ctx, x, y, badgeW, badgeH, 16);
  if (theme === 'gold_dark') {
    ctx.fillStyle = '#0F172A';
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  }
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = theme === 'gold_dark' ? '#D4AF37' : 'rgba(241, 15, 77, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Lopes Heart Vector icon
  const iconColor = theme === 'gold_dark' ? '#D4AF37' : '#F10F4D';
  drawLopesHeartVector(ctx, x + 14, y + (badgeH - 28) / 2, 28, iconColor);

  // Logo Brand Text
  ctx.textAlign = 'left';
  ctx.fillStyle = theme === 'gold_dark' ? '#FFFFFF' : '#0F172A';
  ctx.font = "900 17px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText('LOPES', x + 50, y + 25);

  ctx.fillStyle = theme === 'gold_dark' ? '#F3E5AB' : '#F10F4D';
  ctx.font = "800 12px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText('MANAUS', x + 50, y + 41);

  ctx.restore();
}

/**
 * Draws a top-right luxury tag (e.g., "✨ LOPES ALTO PADRÃO")
 */
export function drawLuxuryTopTag(
  ctx: CanvasRenderingContext2D,
  rightX: number,
  y: number,
  text: string = '✨ LOPES ALTO PADRÃO',
  theme: PostDesignTheme = 'ruby_premium'
) {
  ctx.save();
  ctx.font = "800 16px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const metrics = ctx.measureText(text);
  const padX = 22;
  const tagW = metrics.width + padX * 2;
  const tagH = 40;
  const x = rightX - tagW;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;

  drawRoundRect(ctx, x, y, tagW, tagH, 20);
  ctx.fillStyle = theme === 'gold_dark' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.88)';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = theme === 'gold_dark' ? '#D4AF37' : '#F10F4D';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = theme === 'gold_dark' ? '#F3E5AB' : '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + tagW / 2, y + tagH / 2 + 5);

  ctx.restore();
}

/**
 * Draws the high-impact Luxury Price Banner and Location Pill
 */
export function drawPriceAndLocationBanners(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  priceText: string,
  locationText: string,
  theme: PostDesignTheme = 'ruby_premium'
) {
  ctx.save();

  // 1. Red / Dark Gold Price Banner
  ctx.font = "900 44px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const priceMetrics = ctx.measureText(priceText);
  const pricePadX = 30;
  const priceW = Math.max(360, priceMetrics.width + pricePadX * 2);
  const priceH = 76;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 10;

  drawRoundRect(ctx, x, y, priceW, priceH, [0, 22, 22, 0]);

  if (theme === 'gold_dark') {
    const darkGrad = ctx.createLinearGradient(x, y, x + priceW, y + priceH);
    darkGrad.addColorStop(0, '#0F172A');
    darkGrad.addColorStop(1, '#1E293B');
    ctx.fillStyle = darkGrad;
  } else {
    const rubyGrad = ctx.createLinearGradient(x, y, x + priceW, y + priceH);
    rubyGrad.addColorStop(0, '#F10F4D');
    rubyGrad.addColorStop(1, '#B30030');
    ctx.fillStyle = rubyGrad;
  }
  ctx.fill();

  // Left Gold/Ruby Accent Bar
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = theme === 'gold_dark' ? '#D4AF37' : '#FFFFFF';
  ctx.fillRect(x, y, 7, priceH);

  // Price Text
  ctx.fillStyle = theme === 'gold_dark' ? '#F3E5AB' : '#FFFFFF';
  ctx.fillText(priceText, x + pricePadX + 6, y + 52);

  // 2. Location Pill directly underneath (Bairro | Cidade)
  const locY = y + priceH + 6;
  ctx.font = "800 22px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const locMetrics = ctx.measureText(locationText);
  const locPadX = 24;
  const locW = locMetrics.width + locPadX * 2 + 20;
  const locH = 50;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;

  drawRoundRect(ctx, x, locY, locW, locH, [0, 20, 20, 0]);
  ctx.fillStyle = '#0F172A';
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // Map pin icon
  ctx.fillStyle = '#F10F4D';
  ctx.font = "800 20px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText('📍', x + 18, locY + 33);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = "800 22px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText(locationText, x + 48, locY + 33);

  ctx.restore();
}

/**
 * Draws custom vector icons in Lopes Red / Gold for specifications.
 */
export function drawSpecIcon(
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  size: number = 38,
  color: string = '#F10F4D'
) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 32;
  ctx.scale(scale, scale);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const t = (type || '').toLowerCase();

  if (t.includes('bed') || t.includes('quart') || t.includes('suit')) {
    ctx.beginPath();
    ctx.moveTo(4, 24);
    ctx.lineTo(4, 8);
    ctx.moveTo(28, 24);
    ctx.lineTo(28, 14);
    ctx.moveTo(4, 16);
    ctx.lineTo(28, 16);
    ctx.moveTo(4, 22);
    ctx.lineTo(28, 22);
    ctx.stroke();

    ctx.beginPath();
    drawRoundRect(ctx, 7, 10, 8, 5, 2);
    ctx.stroke();

    ctx.beginPath();
    drawRoundRect(ctx, 15, 14, 12, 7, 2);
    ctx.stroke();
  } else if (t.includes('bath') || t.includes('banh')) {
    ctx.beginPath();
    ctx.moveTo(6, 26);
    ctx.lineTo(6, 8);
    ctx.quadraticCurveTo(6, 4, 12, 4);
    ctx.lineTo(16, 4);
    ctx.quadraticCurveTo(22, 4, 22, 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(22, 10, 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(19, 17);
    ctx.lineTo(19, 19);
    ctx.moveTo(22, 18);
    ctx.lineTo(22, 21);
    ctx.moveTo(25, 17);
    ctx.lineTo(25, 19);
    ctx.stroke();
  } else if (t.includes('car') || t.includes('vaga') || t.includes('garag')) {
    ctx.beginPath();
    ctx.arc(8, 23, 3, 0, Math.PI * 2);
    ctx.arc(24, 23, 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(3, 20);
    ctx.lineTo(5, 20);
    ctx.moveTo(11, 20);
    ctx.lineTo(21, 20);
    ctx.moveTo(27, 20);
    ctx.lineTo(29, 20);
    ctx.lineTo(28, 14);
    ctx.lineTo(22, 14);
    ctx.lineTo(19, 8);
    ctx.lineTo(9, 8);
    ctx.lineTo(6, 14);
    ctx.lineTo(3, 15);
    ctx.closePath();
    ctx.stroke();
  } else if (t.includes('piscina') || t.includes('pool')) {
    ctx.beginPath();
    ctx.moveTo(4, 14);
    ctx.quadraticCurveTo(8, 10, 12, 14);
    ctx.quadraticCurveTo(16, 18, 20, 14);
    ctx.quadraticCurveTo(24, 10, 28, 14);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4, 22);
    ctx.quadraticCurveTo(8, 18, 12, 22);
    ctx.quadraticCurveTo(16, 26, 20, 22);
    ctx.quadraticCurveTo(24, 18, 28, 22);
    ctx.stroke();
  } else if (t.includes('churras') || t.includes('bbq') || t.includes('gourmet')) {
    ctx.beginPath();
    ctx.arc(16, 14, 10, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, 14);
    ctx.lineTo(26, 14);
    ctx.moveTo(10, 24);
    ctx.lineTo(6, 28);
    ctx.moveTo(22, 24);
    ctx.lineTo(26, 28);
    ctx.stroke();
  } else if (t.includes('area') || t.includes('m²')) {
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.lineTo(6, 6);
    ctx.lineTo(12, 6);

    ctx.moveTo(20, 6);
    ctx.lineTo(26, 6);
    ctx.lineTo(26, 12);

    ctx.moveTo(26, 20);
    ctx.lineTo(26, 26);
    ctx.lineTo(20, 26);

    ctx.moveTo(12, 26);
    ctx.lineTo(6, 26);
    ctx.lineTo(6, 20);
    ctx.stroke();
  } else if (t.includes('academia') || t.includes('fitness') || t.includes('ginast')) {
    ctx.beginPath();
    ctx.moveTo(6, 16); ctx.lineTo(26, 16);
    ctx.moveTo(8, 10); ctx.lineTo(8, 22);
    ctx.moveTo(11, 8); ctx.lineTo(11, 24);
    ctx.moveTo(24, 10); ctx.lineTo(24, 22);
    ctx.moveTo(21, 8); ctx.lineTo(21, 24);
    ctx.stroke();
  } else if (t.includes('elevador')) {
    ctx.beginPath();
    ctx.moveTo(16, 5); ctx.lineTo(10, 12); ctx.lineTo(22, 12); ctx.closePath();
    ctx.moveTo(16, 27); ctx.lineTo(10, 20); ctx.lineTo(22, 20); ctx.closePath();
    ctx.fill();
  } else if (t.includes('portaria') || t.includes('seguran') || t.includes('guarita')) {
    ctx.beginPath();
    ctx.moveTo(16, 5);
    ctx.lineTo(26, 9);
    ctx.lineTo(26, 17);
    ctx.quadraticCurveTo(26, 25, 16, 28);
    ctx.quadraticCurveTo(6, 25, 6, 17);
    ctx.lineTo(6, 9);
    ctx.closePath();
    ctx.stroke();
  } else if (t.includes('varanda') || t.includes('sacada') || t.includes('balcao')) {
    ctx.beginPath();
    ctx.rect(6, 6, 20, 20);
    ctx.moveTo(6, 16); ctx.lineTo(26, 16);
    ctx.moveTo(16, 6); ctx.lineTo(16, 26);
    ctx.stroke();
  } else if (t.includes('gerador')) {
    ctx.beginPath();
    ctx.moveTo(18, 4);
    ctx.lineTo(8, 17);
    ctx.lineTo(15, 17);
    ctx.lineTo(14, 28);
    ctx.lineTo(24, 15);
    ctx.lineTo(17, 15);
    ctx.closePath();
    ctx.stroke();
  } else if (t.includes('quadra') || t.includes('campo')) {
    ctx.beginPath();
    ctx.rect(5, 7, 22, 18);
    ctx.moveTo(16, 7); ctx.lineTo(16, 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(16, 16, 4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (t.includes('salao') || t.includes('festa') || t.includes('evento')) {
    ctx.beginPath();
    ctx.arc(12, 12, 4, 0, Math.PI * 2);
    ctx.arc(20, 20, 4, 0, Math.PI * 2);
    ctx.moveTo(7, 25); ctx.lineTo(25, 7);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(20, 12);
    ctx.lineTo(28, 13);
    ctx.lineTo(22, 19);
    ctx.lineTo(24, 28);
    ctx.lineTo(16, 23);
    ctx.lineTo(8, 28);
    ctx.lineTo(10, 19);
    ctx.lineTo(4, 13);
    ctx.lineTo(12, 12);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws proportional CTA Button aligned left on footer ("AGENDE SUA VISITA")
 */
/**
 * Draws prominent, centered CTA Button ("AGENDE SUA VISITA")
 */
export function drawCtaBannerCentered(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  ctaText: string = 'AGENDE SUA VISITA',
  theme: PostDesignTheme = 'ruby_premium',
  isStory: boolean = false
): number {
  ctx.save();

  let textToDraw = (ctaText || 'AGENDE SUA VISITA').trim();
  if (textToDraw.includes('•')) {
    textToDraw = textToDraw.split('•')[0].trim();
  }
  textToDraw = textToDraw.toUpperCase();

  const fontSize = isStory ? 26 : 22;
  ctx.font = `900 ${fontSize}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
  const textMetrics = ctx.measureText(textToDraw);

  const padX = isStory ? 44 : 36;
  const maxW = isStory ? 560 : 480;
  const minW = isStory ? 420 : 340;
  const ctaW = Math.max(minW, Math.min(textMetrics.width + padX * 2, maxW));
  const ctaH = isStory ? 68 : 58;
  const ctaX = centerX - ctaW / 2;
  const ctaY = centerY - ctaH / 2;

  // Drop shadow
  ctx.shadowColor = 'rgba(5, 150, 105, 0.40)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  // Emerald Green Capsule Pill
  drawRoundRect(ctx, ctaX, ctaY, ctaW, ctaH, Math.floor(ctaH / 2));
  const grad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
  grad.addColorStop(0, '#059669');
  grad.addColorStop(1, '#047857');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // White subtle border highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // CTA Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${fontSize}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(textToDraw, centerX, ctaY + ctaH / 2 + Math.floor(fontSize / 3));

  ctx.restore();
  return ctaY + ctaH;
}

export function drawCtaBannerLeft(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  centerY: number,
  ctaText: string = 'AGENDE SUA VISITA',
  theme: PostDesignTheme = 'ruby_premium'
): number {
  return drawCtaBannerCentered(ctx, leftX + 170, centerY, ctaText, theme);
}

export function drawCtaBannerLeftCompact(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  centerY: number,
  ctaText: string = 'AGENDE SUA VISITA',
  theme: PostDesignTheme = 'ruby_premium'
) {
  drawCtaBannerCentered(ctx, leftX + 170, centerY, ctaText, theme);
}

export function drawCtaBanner(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
  ctaText: string = 'AGENDE SUA VISITA',
  theme: PostDesignTheme = 'ruby_premium'
) {
  drawCtaBannerCentered(ctx, centerX, y + 30, ctaText, theme);
}

/**
 * Draws an Instagram icon vector directly on canvas
 */
export function drawInstagramVectorIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 22,
  color: string = '#F10F4D'
) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 24;
  ctx.scale(scale, scale);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer rounded square
  drawRoundRect(ctx, 2, 2, 20, 20, 5.5);
  ctx.stroke();

  // Center lens circle
  ctx.beginPath();
  ctx.arc(12, 12, 4.8, 0, Math.PI * 2);
  ctx.stroke();

  // Top-right flash dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(17.2, 6.8, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a Web / Globe vector icon directly on canvas
 */
export function drawGlobeVectorIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 22,
  color: string = '#38BDF8'
) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 24;
  ctx.scale(scale, scale);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer circle
  ctx.beginPath();
  ctx.arc(12, 12, 9.5, 0, Math.PI * 2);
  ctx.stroke();

  // Horizontal equator line
  ctx.beginPath();
  ctx.moveTo(2.5, 12);
  ctx.lineTo(21.5, 12);
  ctx.stroke();

  // Vertical meridian ellipse
  ctx.beginPath();
  ctx.ellipse(12, 12, 5.2, 9.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a solid dark footer bar at the bottom of the canvas with Logo, Slogan, Instagram and Website URL
 */
export function drawLopesManausFooterBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: PostDesignTheme = 'ruby_premium',
  isSquare: boolean = false,
  isStory: boolean = false
) {
  ctx.save();

  const footerH = isSquare ? 88 : (isStory ? 110 : 96);
  const footerY = height - footerH;

  // 1. Solid Dark Background Bar
  const barBg = theme === 'gold_dark' ? '#090D16' : '#0F172A';
  ctx.fillStyle = barBg;
  ctx.fillRect(0, footerY, width, footerH);

  // 2. Top Accent Line (4px thick in brand red or gold)
  ctx.fillStyle = theme === 'gold_dark' ? '#D4AF37' : '#F10F4D';
  ctx.fillRect(0, footerY, width, 4);

  const paddingX = isSquare ? 40 : 45;
  // Precise alphabetic baseline for ALL text elements to guarantee 100% horizontal alignment
  const baselineY = footerY + Math.floor(footerH / 2) + 9;

  ctx.textBaseline = 'alphabetic';

  // 3. LEFT SIDE: Logo & MANAUS only (no slogan) with larger, highly visible font
  const textLopes = 'Lopes';
  const textManaus = 'MANAUS';

  const fontLopes = isSquare ? "900 34px 'Plus Jakarta Sans', 'Inter', sans-serif" : "900 38px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const fontManaus = isSquare ? "800 24px 'Plus Jakarta Sans', 'Inter', sans-serif" : "800 26px 'Plus Jakarta Sans', 'Inter', sans-serif";

  ctx.font = fontLopes;
  const lopesWidth = ctx.measureText(textLopes).width;

  ctx.font = fontManaus;
  const manausWidth = ctx.measureText(textManaus).width;

  const heartSize = isSquare ? 32 : 36;
  const heartGap = 10;
  const wordGap = 10;

  let currentX = paddingX;

  // Heart Icon in brand red #F10F4D
  drawLopesHeartVector(ctx, currentX, baselineY - (isSquare ? 26 : 30), heartSize, '#F10F4D');
  currentX += heartSize + heartGap;

  // "Lopes" in brand red
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F10F4D';
  ctx.font = fontLopes;
  ctx.fillText(textLopes, currentX, baselineY);
  currentX += lopesWidth + wordGap;

  // "MANAUS" in crisp White (exact same baseline as Lopes)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = fontManaus;
  ctx.fillText(textManaus, currentX, baselineY);

  // 4. RIGHT SIDE: Instagram (@lopesmanaus) & Website (lopes.manaus.com.br) - Large & legible
  const siteText = 'lopes.manaus.com.br';
  const igText = '@lopesmanaus';

  const fontRight = isSquare ? "800 22px 'Plus Jakarta Sans', 'Inter', sans-serif" : "800 24px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.font = fontRight;
  const siteWidth = ctx.measureText(siteText).width;
  const igWidth = ctx.measureText(igText).width;

  const iconSize = isSquare ? 26 : 28;
  const iconTextGap = 8;
  const channelGap = isSquare ? 24 : 32;

  let rightX = width - paddingX;

  // Draw Website text & Globe icon
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = fontRight;
  ctx.fillText(siteText, rightX, baselineY);

  const siteIconX = rightX - siteWidth - iconTextGap - iconSize;
  drawGlobeVectorIcon(ctx, siteIconX, baselineY - (isSquare ? 20 : 22), iconSize, '#38BDF8');

  // Move left for Instagram
  rightX = siteIconX - channelGap;

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = fontRight;
  ctx.fillText(igText, rightX, baselineY);

  const igIconX = rightX - igWidth - iconTextGap - iconSize;
  drawInstagramVectorIcon(ctx, igIconX, baselineY - (isSquare ? 20 : 22), iconSize, '#F10F4D');

  ctx.restore();
}

/**
 * Legacy wrapper for luxury footer
 */
export function drawLuxuryFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ctaText: string,
  whatsappNum: string,
  theme: PostDesignTheme = 'ruby_premium',
  isSquare: boolean = false,
  isStory: boolean = false
) {
  drawLopesManausFooterBar(ctx, width, height, theme, isSquare, isStory);
}

/**
 * Draws the clean Lopes Manaus footer signature aligned right
 */
export function drawLopesManausFooterRight(
  ctx: CanvasRenderingContext2D,
  rightX: number,
  centerY: number,
  theme: PostDesignTheme = 'ruby_premium'
) {
  ctx.save();

  const textLopes = 'Lopes';
  const textManaus = 'MANAUS';

  ctx.font = "900 24px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const lopesWidth = ctx.measureText(textLopes).width;

  ctx.font = "800 16px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const manausWidth = ctx.measureText(textManaus).width;

  const heartSize = 26;
  const heartGap = 10;
  const wordGap = 8;
  const totalW = heartSize + heartGap + lopesWidth + wordGap + manausWidth;

  const startX = rightX - totalW;

  // 1. Draw Lopes Heart Vector ALWAYS in official brand red (#F10F4D)
  const heartColor = '#F10F4D';
  drawLopesHeartVector(ctx, startX, centerY - 15, heartSize, heartColor);

  // 2. Draw "Lopes" ALWAYS in official brand red (#F10F4D)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F10F4D';
  ctx.font = "900 24px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText(textLopes, startX + heartSize + heartGap, centerY + 6);

  // 3. Draw "MANAUS" in dark slate (#0F172A) or white (#FFFFFF in dark mode)
  ctx.fillStyle = theme === 'gold_dark' ? '#FFFFFF' : '#0F172A';
  ctx.font = "800 16px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText(textManaus, startX + heartSize + heartGap + lopesWidth + wordGap, centerY + 6);

  ctx.restore();
}

export function drawLopesManausFooter(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  bottomY: number,
  theme: PostDesignTheme = 'ruby_premium'
) {
  drawLopesManausFooterRight(ctx, centerX + 120, bottomY - 10, theme);
}

/**
 * Helper to wrap and draw centered bold headline text.
 */
function drawCenteredWrappedHeadline(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  fontSizePx: number,
  textColor: string = '#0F172A'
): number {
  ctx.font = `900 ${fontSizePx}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testWidth = ctx.measureText(currentLine + ' ' + word).width;
    if (testWidth <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  const linesToDraw = lines.slice(0, 2);
  const lineHeight = fontSizePx * 1.25;

  linesToDraw.forEach((line, idx) => {
    ctx.fillText(line, centerX, startY + idx * lineHeight);
  });

  return startY + (linesToDraw.length - 1) * lineHeight;
}

/**
 * Dedicated Instagram Story Renderer (9:16 - 1080x1920)
 * Engineered with strict safe-zones for Instagram UI (top 200px header & bottom 150px input overlay)
 * Features a portrait hero photo card, floating badges, balanced specs grid, CTA & Footer.
 */
async function drawInstagramStoryDedicatedLayout(
  ctx: CanvasRenderingContext2D,
  options: CanvasPostOptions
): Promise<void> {
  const { property, companySettings, photoUrl, width, height, aiData } = options;
  const theme = aiData?.designTheme || 'ruby_premium';

  // 1. Process variables
  const purposeLower = (property.purpose || '').toLowerCase().trim();
  const isRent = purposeLower.includes('loca') || purposeLower.includes('aluguel') || purposeLower.includes('rent');
  const defaultStatus = isRent ? 'LOCAÇÃO' : 'VENDA';
  const statusText = (aiData?.statusTag && aiData.statusTag.trim()) ? aiData.statusTag.trim().toUpperCase() : defaultStatus;
  const subStatusText = aiData?.subStatus !== undefined ? aiData.subStatus : 'DISPONÍVEL';

  const priceVal = isRent ? (property.rent_price || property.price || 0) : (property.price || 0);
  const defaultPriceText = priceVal > 0 
    ? `R$ ${priceVal.toLocaleString('pt-BR')}${isRent ? '/mês' : ''}` 
    : 'Consulte-nos';
  const priceFormatted = aiData?.priceFormatted || defaultPriceText;

  const neighborhood = property.neighborhood || 'Manaus';
  const city = property.city || 'Manaus';
  const locationText = aiData?.locationTag || `${neighborhood} | ${city}`;

  const category = (property.category || 'IMÓVEL').toUpperCase();
  const rawTitle = property.title || `${category} em ${neighborhood}`;

  let fullTitle = '';
  if (aiData?.headlineLine1 || aiData?.headlineLine2) {
    fullTitle = `${aiData.headlineLine1 || ''} ${aiData.headlineLine2 || ''}`.trim();
  } else {
    fullTitle = rawTitle;
  }

  const specs = aiData?.specs && aiData.specs.length > 0 ? aiData.specs : extractDefaultPropertySpecs(property);
  const ctaText = aiData?.ctaText || 'AGENDE SUA VISITA';
  const whatsappNum = (aiData?.whatsappNumber || companySettings.whatsapp || companySettings.phone || '').trim();

  const isGallery = aiData?.layoutStyle === 'gallery';

  // 2. Full Background Canvas Fill
  ctx.save();
  if (theme === 'gold_dark') {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0B1120');
    bgGrad.addColorStop(0.5, '#0F172A');
    bgGrad.addColorStop(1, '#080D1A');
    ctx.fillStyle = bgGrad;
  } else {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#F8FAFC');
    bgGrad.addColorStop(0.5, '#FFFFFF');
    bgGrad.addColorStop(1, '#F1F5F9');
    ctx.fillStyle = bgGrad;
  }
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 3. Header Top Safe Zone Badge (Y = 190px - Below top Instagram UI overlay)
  const headerY = 190;
  drawModernPropertyBadge(ctx, 40, headerY, statusText, subStatusText, theme);

  // 4. Hero Photo Card (Y = 270px to Y = 1030px, Height = 760px)
  const cardX = 32;
  const cardY = 270;
  const cardW = width - cardX * 2; // 1016px
  const cardH = 760;
  const cardRadius = 24;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;

  drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fillStyle = '#1E293B';
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Clip photo inside card
  ctx.save();
  ctx.beginPath();
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.clip();

  try {
    const bgImg = await loadImageSafely(photoUrl);
    drawImageCover(ctx, bgImg, cardX, cardY, cardW, cardH);
  } catch (e) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(cardX, cardY, cardW, cardH);
  }

  // Soft bottom dark gradient inside photo card for legibility of floating banners
  const photoGrad = ctx.createLinearGradient(0, cardY + cardH - 220, 0, cardY + cardH);
  photoGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
  photoGrad.addColorStop(1, 'rgba(15, 23, 42, 0.75)');
  ctx.fillStyle = photoGrad;
  ctx.fillRect(cardX, cardY + cardH - 220, cardW, 220);

  ctx.restore(); // end clip

  // Crisp border frame accent
  ctx.strokeStyle = theme === 'gold_dark' ? 'rgba(212, 175, 55, 0.6)' : 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 3;
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.stroke();

  ctx.restore();

  // 5. Floating Banners inside / on bottom edge of Photo Card
  const secondaryList = aiData?.secondaryPhotos || [];
  let thumbUrls: string[] = secondaryList.filter(img => img && img !== photoUrl);
  if (isGallery && thumbUrls.length < 3) {
    const propImgs = extractPropertyImages(property);
    for (const img of propImgs) {
      if (thumbUrls.length >= 3) break;
      if (img !== photoUrl && !thumbUrls.includes(img)) {
        thumbUrls.push(img);
      }
    }
  }

  const thumbCount = isGallery ? Math.min(3, thumbUrls.length) : 0;
  const hasThumbnails = isGallery && thumbCount > 0;

  if (hasThumbnails) {
    // Gallery Thumbnails anchored at bottom edge of photo card (Y = 860px to Y = 1010px)
    const thumbPadX = cardX + 20;
    const gap = 14;
    const availW = cardW - 40;
    const thumbW = Math.floor((availW - gap * (thumbCount - 1)) / thumbCount);
    const thumbH = 150;
    const thumbY = cardY + cardH - 170;

    // Draw Price & Location floating above thumbnails
    drawPriceAndLocationBanners(ctx, cardX + 20, thumbY - 110, priceFormatted, locationText, theme);

    const loadedThumbs = await Promise.all(
      thumbUrls.slice(0, thumbCount).map(url => loadImageSafely(url).catch(() => null))
    );

    loadedThumbs.forEach((tImg, idx) => {
      const tx = thumbPadX + idx * (thumbW + gap);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;

      drawRoundRect(ctx, tx, thumbY, thumbW, thumbH, 14);
      ctx.fillStyle = '#1E293B';
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.save();
      ctx.beginPath();
      drawRoundRect(ctx, tx, thumbY, thumbW, thumbH, 14);
      ctx.clip();

      if (tImg) {
        drawImageCover(ctx, tImg, tx, thumbY, thumbW, thumbH);
      } else {
        ctx.fillStyle = '#334155';
        ctx.fillRect(tx, thumbY, thumbW, thumbH);
      }
      ctx.restore();

      ctx.strokeStyle = theme === 'gold_dark' ? '#D4AF37' : '#FFFFFF';
      ctx.lineWidth = 3;
      drawRoundRect(ctx, tx, thumbY, thumbW, thumbH, 14);
      ctx.stroke();

      ctx.restore();
    });
  } else {
    // Single photo mode: Price & Location floating near bottom of photo card
    drawPriceAndLocationBanners(ctx, cardX + 24, cardY + cardH - 120, priceFormatted, locationText, theme);
  }

  // 6. Property Title (Y = 1070px)
  const titleStartY = 1070;
  const maxTitleWidth = width - 80;
  const titleFontSizePx = 44;
  const textColor = theme === 'gold_dark' ? '#FFFFFF' : '#0F172A';

  const lastTitleY = drawCenteredWrappedHeadline(
    ctx,
    fullTitle,
    width / 2,
    titleStartY,
    maxTitleWidth,
    titleFontSizePx,
    textColor
  );

  // 7. Specifications Cards Grid (Y = lastTitleY + 45)
  const specsY = lastTitleY + 45;
  const totalSpecsCount = specs.length;

  let specRows: Array<Array<{ icon: string; label: string }>> = [];
  if (totalSpecsCount <= 3) {
    specRows = [specs];
  } else if (totalSpecsCount <= 6) {
    const half = Math.ceil(totalSpecsCount / 2);
    specRows = [specs.slice(0, half), specs.slice(half)];
  } else {
    specRows = [specs.slice(0, 3), specs.slice(3, 6), specs.slice(6, 8)];
  }

  const badgeH = 74;
  const rowGapY = 18;

  ctx.save();
  specRows.forEach((rowItems, rowIndex) => {
    const rowItemCount = Math.max(1, rowItems.length);
    const gapX = 14;
    const maxRowWidth = width - 80;
    const calculatedBadgeW = Math.floor((maxRowWidth - (rowItemCount - 1) * gapX) / rowItemCount);
    const badgeW = Math.min(320, Math.max(180, calculatedBadgeW));

    const totalRowW = rowItemCount * badgeW + (rowItemCount - 1) * gapX;
    const rowStartX = (width - totalRowW) / 2;
    const currentRowCenterY = specsY + rowIndex * (badgeH + rowGapY) + badgeH / 2;
    const badgeY = currentRowCenterY - badgeH / 2;

    rowItems.forEach((item, index) => {
      const badgeX = rowStartX + index * (badgeW + gapX);

      // Card drop shadow
      ctx.save();
      ctx.shadowColor = theme === 'gold_dark' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;

      drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 18);
      if (theme === 'gold_dark') {
        const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeH);
        badgeGrad.addColorStop(0, '#1E293B');
        badgeGrad.addColorStop(1, '#131D2E');
        ctx.fillStyle = badgeGrad;
      } else {
        const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeH);
        badgeGrad.addColorStop(0, '#FFFFFF');
        badgeGrad.addColorStop(1, '#F8FAFC');
        ctx.fillStyle = badgeGrad;
      }
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = theme === 'gold_dark' ? '#334155' : '#E2E8F0';
      ctx.lineWidth = 1.4;
      drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 18);
      ctx.stroke();
      ctx.restore();

      // Icon circle
      const iconCircleSize = 48;
      const iconCircleX = badgeX + 10;
      const iconCircleY = badgeY + (badgeH - iconCircleSize) / 2;
      drawRoundRect(ctx, iconCircleX, iconCircleY, iconCircleSize, iconCircleSize, 14);
      if (theme === 'gold_dark') {
        ctx.fillStyle = '#334155';
      } else {
        const iconBgGrad = ctx.createLinearGradient(iconCircleX, iconCircleY, iconCircleX, iconCircleY + iconCircleSize);
        iconBgGrad.addColorStop(0, '#FFF1F5');
        iconBgGrad.addColorStop(1, '#FFE4EC');
        ctx.fillStyle = iconBgGrad;
      }
      ctx.fill();

      const iconSize = 30;
      const iconX = iconCircleX + (iconCircleSize - iconSize) / 2;
      const iconY = iconCircleY + (iconCircleSize - iconSize) / 2;
      const iconColor = theme === 'gold_dark' ? '#F3E5AB' : '#F10F4D';
      drawSpecIcon(ctx, item.icon, iconX, iconY, iconSize, iconColor);

      // Label text - large and prominent
      const labelText = item.label.toUpperCase();
      ctx.fillStyle = theme === 'gold_dark' ? '#FFFFFF' : '#0F172A';

      let fontSize = totalSpecsCount <= 3 ? 26 : 24;
      ctx.font = `900 ${fontSize}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
      let labelWidth = ctx.measureText(labelText).width;
      const maxTextWidth = badgeW - iconCircleSize - 22;

      while (labelWidth > maxTextWidth && fontSize > 16) {
        fontSize -= 1;
        ctx.font = `900 ${fontSize}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
        labelWidth = ctx.measureText(labelText).width;
      }

      ctx.textAlign = 'left';
      ctx.fillText(labelText, iconCircleX + iconCircleSize + 10, badgeY + badgeH / 2 + (fontSize / 3));
    });
  });
  ctx.restore();

  // 8. Call to Action & WhatsApp Area (Anchored safely at Y = 1520px)
  const ctaCenterY = 1520;
  drawCtaBannerCentered(ctx, width / 2, ctaCenterY, ctaText, theme, true);

  if (whatsappNum) {
    ctx.save();
    const waY = 1620;
    const waText = `WhatsApp: ${whatsappNum}`;
    const waFontSize = 25;
    const waIconSize = 32;

    ctx.font = `800 ${waFontSize}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
    const waTextMetrics = ctx.measureText(waText);
    const waTotalW = waIconSize + 12 + waTextMetrics.width;
    const waStartX = (width - waTotalW) / 2;

    drawWhatsAppVectorIcon(ctx, waStartX, waY - Math.floor(waIconSize / 2 + 5), waIconSize);

    ctx.fillStyle = theme === 'gold_dark' ? '#F3E5AB' : '#0F172A';
    ctx.textAlign = 'left';
    ctx.fillText(waText, waStartX + waIconSize + 12, waY);
    ctx.restore();
  }

  // 9. Footer Bar (Anchored at Y = 1680px to Y = 1790px - ABOVE bottom Instagram safe zone!)
  const storyFooterH = 110;
  const storyFooterY = 1680;

  ctx.save();
  ctx.fillStyle = theme === 'gold_dark' ? '#090D16' : '#0F172A';
  ctx.fillRect(0, storyFooterY, width, storyFooterH);

  ctx.fillStyle = theme === 'gold_dark' ? '#D4AF37' : '#F10F4D';
  ctx.fillRect(0, storyFooterY, width, 4);

  const paddingX = 45;
  const baselineY = storyFooterY + Math.floor(storyFooterH / 2) + 9;

  ctx.textBaseline = 'alphabetic';

  const textLopes = 'Lopes';
  const textManaus = 'MANAUS';

  const fontLopes = "900 38px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const fontManaus = "800 26px 'Plus Jakarta Sans', 'Inter', sans-serif";

  ctx.font = fontLopes;
  const lopesWidth = ctx.measureText(textLopes).width;

  ctx.font = fontManaus;
  const manausWidth = ctx.measureText(textManaus).width;

  const heartSize = 36;
  const heartGap = 10;
  const wordGap = 10;

  let currentX = paddingX;

  drawLopesHeartVector(ctx, currentX, baselineY - 30, heartSize, '#F10F4D');
  currentX += heartSize + heartGap;

  ctx.fillStyle = '#F10F4D';
  ctx.font = fontLopes;
  ctx.fillText(textLopes, currentX, baselineY);
  currentX += lopesWidth + wordGap;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = fontManaus;
  ctx.fillText(textManaus, currentX, baselineY);

  const siteText = 'lopes.manaus.com.br';
  const igText = '@lopesmanaus';

  const fontRight = "800 24px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.font = fontRight;
  const siteWidth = ctx.measureText(siteText).width;
  const igWidth = ctx.measureText(igText).width;

  const iconSize = 28;
  const iconTextGap = 8;
  const channelGap = 32;

  let rightX = width - paddingX;

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = fontRight;
  ctx.fillText(siteText, rightX, baselineY);

  const siteIconX = rightX - siteWidth - iconTextGap - iconSize;
  drawGlobeVectorIcon(ctx, siteIconX, baselineY - 22, iconSize, '#38BDF8');

  rightX = siteIconX - channelGap;

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = fontRight;
  ctx.fillText(igText, rightX, baselineY);

  const igIconX = rightX - igWidth - iconTextGap - iconSize;
  drawInstagramVectorIcon(ctx, igIconX, baselineY - 22, iconSize, '#F10F4D');

  ctx.restore();
}

/**
 * Primary Native 2D Canvas Post Renderer (100% Deterministic & Ultra-Luxury)
 */
export async function renderPostToCanvas(
  targetCanvas: HTMLCanvasElement,
  options: CanvasPostOptions
): Promise<void> {
  const { property, companySettings, templateId, photoUrl, width, height, aiData } = options;
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  targetCanvas.width = width;
  targetCanvas.height = height;

  const theme = aiData?.designTheme || 'ruby_premium';
  const isSquare = height === 1080;
  const isStory = height >= 1800;

  // Dedicated Instagram Stories Layout Engine (9:16 - 1080x1920)
  if (isStory) {
    return await drawInstagramStoryDedicatedLayout(ctx, options);
  }

  const photoHeightRatio = 0.50; // Always half of post height (50%)
  const photoHeight = Math.round(height * photoHeightRatio);

  // 1. Draw Background Photo
  try {
    const bgImg = await loadImageSafely(photoUrl);
    drawImageCover(ctx, bgImg, 0, 0, width, photoHeight + 35); // Overlap slightly under card
  } catch (e) {
    console.warn('Failed to load photo, drawing placeholder:', e);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, photoHeight);
  }

  // 2. Photographic Vignette Top Gradient
  const topGrad = ctx.createLinearGradient(0, 0, 0, 240);
  topGrad.addColorStop(0, 'rgba(15, 23, 42, 0.60)');
  topGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, 240);

  // 3. Bottom Gradient Transition Overlay on Photo
  const transitionGrad = ctx.createLinearGradient(0, photoHeight - 200, 0, photoHeight);
  transitionGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
  transitionGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.50)');
  transitionGrad.addColorStop(1, 'rgba(15, 23, 42, 0.88)');
  ctx.fillStyle = transitionGrad;
  ctx.fillRect(0, photoHeight - 200, width, 200);

  // 4. Process Variables
  const purposeLower = (property.purpose || '').toLowerCase().trim();
  const isRent = purposeLower.includes('loca') || purposeLower.includes('aluguel') || purposeLower.includes('rent');
  const defaultStatus = isRent ? 'LOCAÇÃO' : 'VENDA';
  const statusText = (aiData?.statusTag && aiData.statusTag.trim()) ? aiData.statusTag.trim().toUpperCase() : defaultStatus;
  const subStatusText = aiData?.subStatus !== undefined ? aiData.subStatus : 'DISPONÍVEL';

  const priceVal = isRent ? (property.rent_price || property.price || 0) : (property.price || 0);
  const defaultPriceText = priceVal > 0 
    ? `R$ ${priceVal.toLocaleString('pt-BR')}${isRent ? '/mês' : ''}` 
    : 'Consulte-nos';
  const priceFormatted = aiData?.priceFormatted || defaultPriceText;

  const neighborhood = property.neighborhood || 'Manaus';
  const city = property.city || 'Manaus';
  const locationText = aiData?.locationTag || `${neighborhood} | ${city}`;

  const category = (property.category || 'IMÓVEL').toUpperCase();
  const rawTitle = property.title || `${category} em ${neighborhood}`;

  // Unified Title handling
  let fullTitle = '';
  if (aiData?.headlineLine1 || aiData?.headlineLine2) {
    fullTitle = `${aiData.headlineLine1 || ''} ${aiData.headlineLine2 || ''}`.trim();
  } else {
    fullTitle = rawTitle;
  }

  // Specs array
  const specs = aiData?.specs && aiData.specs.length > 0 ? aiData.specs : [];

  const ctaText = aiData?.ctaText || 'AGENDE SUA VISITA';
  const whatsappNum = (aiData?.whatsappNumber || companySettings.whatsapp || companySettings.phone || '').trim();

  const isGallery = aiData?.layoutStyle === 'gallery';

  // 5. Bottom Information Card Background Container (Refined Luxury Multi-layer Background)
  const bottomCardY = photoHeight;
  const bottomCardH = height - photoHeight;

  ctx.save();
  if (theme === 'gold_dark') {
    const cardBgGrad = ctx.createLinearGradient(0, bottomCardY, 0, height);
    cardBgGrad.addColorStop(0, '#0B1120');
    cardBgGrad.addColorStop(0.4, '#0F172A');
    cardBgGrad.addColorStop(1, '#080D1A');
    ctx.fillStyle = cardBgGrad;
  } else {
    // Default Ruby Premium: Elegant warm slate & soft champagne pearl gradient with micro-depth
    const cardBgGrad = ctx.createLinearGradient(0, bottomCardY, 0, height);
    cardBgGrad.addColorStop(0, '#FFFFFF');
    cardBgGrad.addColorStop(0.35, '#FBFBFC');
    cardBgGrad.addColorStop(0.75, '#F4F5F8');
    cardBgGrad.addColorStop(1, '#E9ECF2');
    ctx.fillStyle = cardBgGrad;
  }
  ctx.fillRect(0, bottomCardY, width, bottomCardH);

  // Soft atmospheric radial glow under headline
  const radialGlow = ctx.createRadialGradient(width / 2, bottomCardY + 160, 20, width / 2, bottomCardY + 160, 480);
  if (theme === 'gold_dark') {
    radialGlow.addColorStop(0, 'rgba(212, 175, 55, 0.08)');
    radialGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  } else {
    radialGlow.addColorStop(0, 'rgba(241, 15, 77, 0.04)');
    radialGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  }
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, bottomCardY, width, bottomCardH);

  // Premium Top Accent Bar on Card (Dual-color metallic/ruby pill)
  const topAccentW = 100;
  const topAccentH = 5;
  const topAccentX = (width - topAccentW) / 2;
  const topAccentY = bottomCardY + 10;
  drawRoundRect(ctx, topAccentX, topAccentY, topAccentW, topAccentH, 3);
  
  if (theme === 'gold_dark') {
    const goldLine = ctx.createLinearGradient(topAccentX, topAccentY, topAccentX + topAccentW, topAccentY);
    goldLine.addColorStop(0, '#AA771C');
    goldLine.addColorStop(0.5, '#F3E5AB');
    goldLine.addColorStop(1, '#D4AF37');
    ctx.fillStyle = goldLine;
  } else {
    const rubyLine = ctx.createLinearGradient(topAccentX, topAccentY, topAccentX + topAccentW, topAccentY);
    rubyLine.addColorStop(0, '#F10F4D');
    rubyLine.addColorStop(0.5, '#FF4D7E');
    rubyLine.addColorStop(1, '#B30030');
    ctx.fillStyle = rubyLine;
  }
  ctx.fill();
  ctx.restore();

  // 6. Overlaid Elements on Photo & Card Junction (Badge + Price/Location + Gallery Thumbnails on TOP)
  drawModernPropertyBadge(ctx, 45, 40, statusText, subStatusText, theme);

  if (isGallery) {
    // 6.1 Build secondary photos array without repeating the main photoUrl
    const secondaryList = aiData?.secondaryPhotos || [];
    let thumbUrls: string[] = secondaryList.filter(img => img && img !== photoUrl);

    if (thumbUrls.length < 3) {
      const propImgs = extractPropertyImages(property);
      for (const img of propImgs) {
        if (thumbUrls.length >= 3) break;
        if (img !== photoUrl && !thumbUrls.includes(img)) {
          thumbUrls.push(img);
        }
      }
    }

    const thumbCount = Math.min(3, thumbUrls.length);

    // 6.2 Placement of Thumbnails ON TOP of the photo & description card junction (Taller rectangular frame)
    const thumbH = isSquare ? 160 : (isStory ? 240 : 200);
    const thumbY = photoHeight - 55;

    // Price & Location Banner positioned cleanly above thumbnails so Location Pill is 100% visible!
    const priceBannerY = thumbCount > 0 ? (thumbY - 144) : (photoHeight - 140);
    drawPriceAndLocationBanners(ctx, 45, priceBannerY, priceFormatted, locationText, theme);

    if (thumbCount > 0) {
      // 6.3 Draw available thumbnails on top of both main photo and description card
      const padX = 24;
      const gap = 12;
      const availW = width - padX * 2;
      const thumbW = Math.floor((availW - gap * (thumbCount - 1)) / thumbCount);

      const loadedThumbs = await Promise.all(
        thumbUrls.slice(0, thumbCount).map(url => loadImageSafely(url).catch(() => null))
      );

      loadedThumbs.forEach((tImg, idx) => {
        const tx = padX + idx * (thumbW + gap);

        ctx.save();
        // Rich drop shadow so thumbnail pops ON TOP of the white background
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 8;

        drawRoundRect(ctx, tx, thumbY, thumbW, thumbH, 2);
        ctx.fillStyle = '#1E293B';
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // Clip image inside crisp 2px rectangular frame (no rounded squishing)
        ctx.save();
        ctx.beginPath();
        drawRoundRect(ctx, tx, thumbY, thumbW, thumbH, 2);
        ctx.clip();

        if (tImg) {
          drawImageCover(ctx, tImg, tx, thumbY, thumbW, thumbH);
        } else {
          ctx.fillStyle = '#334155';
          ctx.fillRect(tx, thumbY, thumbW, thumbH);
        }
        ctx.restore();

        // Crisp border frame accent
        ctx.strokeStyle = theme === 'gold_dark' ? '#D4AF37' : '#FFFFFF';
        ctx.lineWidth = 4;
        drawRoundRect(ctx, tx, thumbY, thumbW, thumbH, 2);
        ctx.stroke();

        ctx.restore();
      });
    }
  } else {
    // Single Photo Standard Banner Position
    drawPriceAndLocationBanners(ctx, 45, photoHeight - 140, priceFormatted, locationText, theme);
  }

  // 7. Main Property Headline (Extra Bold / Impactful, placed cleanly below thumbnails with guaranteed gap)
  const secondaryList = aiData?.secondaryPhotos || [];
  const hasThumbnails = isGallery && secondaryList.length > 0;
  const thumbH = isSquare ? 160 : (isStory ? 240 : 200);
  const thumbY = photoHeight - 55;
  const thumbsBottomY = hasThumbnails ? (thumbY + thumbH) : photoHeight;

  ctx.save();
  const titleCenterX = width / 2;
  const titleGap = hasThumbnails
    ? (isSquare ? 65 : (isStory ? 90 : 75))
    : (isSquare ? 90 : (isStory ? 125 : 105));
  const titleStartY = thumbsBottomY + titleGap;
  const maxTitleWidth = width - 100; // 50px inner padding on left & right
  const titleFontSizePx = isSquare ? 38 : (isStory ? 46 : 42);
  const textColor = theme === 'gold_dark' ? '#FFFFFF' : '#090D16';

  const lastTitleY = drawCenteredWrappedHeadline(
    ctx,
    fullTitle,
    titleCenterX,
    titleStartY,
    maxTitleWidth,
    titleFontSizePx,
    textColor
  );
  ctx.restore();

  // 8. Specifications & Features Cards Grid (Custom spacing for single photo vs gallery mode)
  const specsGap = hasThumbnails
    ? (isSquare ? 50 : (isStory ? 75 : 65))
    : (isSquare ? 75 : (isStory ? 95 : 95));
  const specsY = lastTitleY + specsGap;
  const totalSpecsCount = specs.length;

  let specRows: Array<Array<{ icon: string; label: string }>> = [];
  const maxPerRow = isStory ? 3 : 4;

  if (totalSpecsCount <= maxPerRow) {
    specRows = [specs];
  } else if (isStory) {
    // For Stories, chunk into max 3 columns per row (e.g. 3, 3, 3) to fill width and vertical space nicely
    specRows = [];
    for (let i = 0; i < totalSpecsCount; i += 3) {
      specRows.push(specs.slice(i, i + 3));
    }
  } else {
    const half = Math.ceil(totalSpecsCount / 2);
    specRows = [specs.slice(0, half), specs.slice(half)];
  }

  const badgeH = isStory
    ? (totalSpecsCount > 3 ? 76 : 84)
    : (isSquare ? (totalSpecsCount > 4 ? 54 : 64) : (totalSpecsCount > 4 ? 62 : 72));
  const rowGapY = isStory ? 26 : (isSquare ? 16 : 20);

  let lastRowBottomY = specsY;

  ctx.save();
  specRows.forEach((rowItems, rowIndex) => {
    const rowItemCount = Math.max(1, rowItems.length);
    const gapX = isStory ? 14 : 12;
    const maxRowWidth = width - (isStory ? 70 : 100); // 35px inner padding on left & right for Story
    const calculatedBadgeW = Math.floor((maxRowWidth - (rowItemCount - 1) * gapX) / rowItemCount);
    const badgeW = Math.min(isStory ? 330 : 270, Math.max(165, calculatedBadgeW));

    const totalRowW = rowItemCount * badgeW + (rowItemCount - 1) * gapX;
    const rowStartX = (width - totalRowW) / 2;
    const currentRowCenterY = specsY + rowIndex * (badgeH + rowGapY);
    const badgeY = currentRowCenterY - badgeH / 2;

    rowItems.forEach((item, index) => {
      const badgeX = rowStartX + index * (badgeW + gapX);
      const badgeRadius = isStory ? 20 : 16;

      // Soft ambient drop shadow for card depth
      ctx.save();
      ctx.shadowColor = theme === 'gold_dark' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;

      drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeRadius);
      if (theme === 'gold_dark') {
        const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeH);
        badgeGrad.addColorStop(0, '#1E293B');
        badgeGrad.addColorStop(1, '#131D2E');
        ctx.fillStyle = badgeGrad;
      } else {
        // Pure White Pearl Card with subtle top gloss
        const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeH);
        badgeGrad.addColorStop(0, '#FFFFFF');
        badgeGrad.addColorStop(1, '#F8FAFC');
        ctx.fillStyle = badgeGrad;
      }
      ctx.fill();
      ctx.restore();

      // Border stroke (with top gloss highlight)
      ctx.save();
      if (theme === 'gold_dark') {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1.4;
      }
      drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeRadius);
      ctx.stroke();
      ctx.restore();

      // Circle background for icon (Pill with brand color glow)
      const iconCircleSize = Math.max(isStory ? 48 : 38, badgeH - 14);
      const iconCircleX = badgeX + 8;
      const iconCircleY = badgeY + (badgeH - iconCircleSize) / 2;
      drawRoundRect(ctx, iconCircleX, iconCircleY, iconCircleSize, iconCircleSize, isStory ? 14 : 12);
      
      if (theme === 'gold_dark') {
        ctx.fillStyle = '#334155';
      } else {
        const iconBgGrad = ctx.createLinearGradient(iconCircleX, iconCircleY, iconCircleX, iconCircleY + iconCircleSize);
        iconBgGrad.addColorStop(0, '#FFF1F5');
        iconBgGrad.addColorStop(1, '#FFE4EC');
        ctx.fillStyle = iconBgGrad;
      }
      ctx.fill();

      // Vector Icon
      const iconSize = Math.min(isStory ? 32 : 28, iconCircleSize - 8);
      const iconX = iconCircleX + (iconCircleSize - iconSize) / 2;
      const iconY = iconCircleY + (iconCircleSize - iconSize) / 2;
      const iconColor = theme === 'gold_dark' ? '#F3E5AB' : '#F10F4D';
      drawSpecIcon(ctx, item.icon, iconX, iconY, iconSize, iconColor);

      // Label with dynamic font size based on badge width
      const labelText = item.label.toUpperCase();
      ctx.fillStyle = theme === 'gold_dark' ? '#FFFFFF' : '#0F172A';

      // Dynamic font sizing (much larger and readable)
      let fontSize = isStory
        ? (totalSpecsCount <= 3 ? 26 : 23)
        : (isSquare ? (totalSpecsCount <= 4 ? 22 : 19) : (totalSpecsCount <= 4 ? 24 : 21));
      ctx.font = `900 ${fontSize}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
      let labelWidth = ctx.measureText(labelText).width;
      const maxTextWidth = badgeW - iconCircleSize - 18;

      while (labelWidth > maxTextWidth && fontSize > 15) {
        fontSize -= 1;
        ctx.font = `900 ${fontSize}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
        labelWidth = ctx.measureText(labelText).width;
      }

      ctx.textAlign = 'left';
      ctx.fillText(labelText, iconCircleX + iconCircleSize + 10, badgeY + badgeH / 2 + (fontSize / 3));
    });

    lastRowBottomY = currentRowCenterY + badgeH / 2;
  });
  ctx.restore();

  // 9. Prominent CTA Button, WhatsApp & Footer anchored near the bottom with generous spacing
  const footerH = isSquare ? 80 : (isStory ? 100 : 90);
  const footerBarY = height - footerH;

  // Lift WhatsApp & CTA higher in Stories layout to fill white space cleanly
  const waY = footerBarY - (isSquare ? 30 : (isStory ? 68 : 36));
  const ctaCenterY = whatsappNum
    ? (waY - (isSquare ? 70 : (isStory ? 105 : 76)))
    : (footerBarY - (isStory ? 120 : 70));

  // Draw CTA Button
  drawCtaBannerCentered(ctx, width / 2, ctaCenterY, ctaText, theme, isStory);

  // Draw WhatsApp Row
  if (whatsappNum) {
    ctx.save();
    const waText = `WhatsApp: ${whatsappNum}`;

    const waFontSize = isStory ? 25 : 20;
    const waIconSize = isStory ? 32 : 26;
    ctx.font = `800 ${waFontSize}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
    const waTextMetrics = ctx.measureText(waText);
    const waTotalW = waIconSize + 12 + waTextMetrics.width;
    const waStartX = (width - waTotalW) / 2;

    drawWhatsAppVectorIcon(ctx, waStartX, waY - Math.floor(waIconSize / 2 + 5), waIconSize);

    ctx.fillStyle = theme === 'gold_dark' ? '#F3E5AB' : '#0F172A';
    ctx.textAlign = 'left';
    ctx.fillText(waText, waStartX + waIconSize + 12, waY);
    ctx.restore();
  }

  // Draw Lopes Manaus Solid Dark Footer Bar
  drawLopesManausFooterBar(ctx, width, height, theme, isSquare, isStory);
}
