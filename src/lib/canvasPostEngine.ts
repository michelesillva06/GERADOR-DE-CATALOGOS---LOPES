import { Property, CompanySettings } from '../types';
import { PostTemplateId } from '../components/postTemplates';

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
 * Draws a modern property badge tag (Dual Capsule / Pill style).
 * SubStatus (DISPONÍVEL) is now larger and proportional to top status text.
 */
export function drawModernPropertyBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  status: string = 'VENDA',
  subStatus: string = 'DISPONÍVEL'
) {
  ctx.save();

  const mainStatusText = (status || 'VENDA').toUpperCase();
  const subStatusText = (subStatus || 'DISPONÍVEL').toUpperCase();

  ctx.font = "900 24px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const mainMetrics = ctx.measureText(mainStatusText);

  ctx.font = "900 18px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const subMetrics = ctx.measureText(subStatusText);

  const topH = 48;
  const subH = 40;

  // Calculate badge width so both main and sub text fit with generous padding
  const minBadgeW = Math.max(mainMetrics.width + 68, subMetrics.width + 48);
  const badgeW = Math.max(210, minBadgeW);

  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  // Top Main Capsule Pill (Lopes Ruby Red Gradient)
  drawRoundRect(ctx, x, y, badgeW, topH, [16, 16, subStatusText ? 4 : 16, 4]);
  const mainGrad = ctx.createLinearGradient(x, y, x + badgeW, y + topH);
  mainGrad.addColorStop(0, '#E5094C');
  mainGrad.addColorStop(1, '#B30030');
  ctx.fillStyle = mainGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // White inner border highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // White Lopes Heart Icon inside main capsule
  drawLopesHeartVector(ctx, x + 14, y + (topH - 26) / 2, 26, '#FFFFFF');

  // Main Status Text ("LOCAÇÃO" / "VENDA")
  ctx.fillStyle = '#FFFFFF';
  ctx.font = "900 24px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText(mainStatusText, x + 50, y + topH / 2 + 8);

  // Sub Status Pill attached underneath ("DISPONÍVEL") - Larger font & height
  if (subStatusText) {
    const subY = y + topH + 3;
    const subW = badgeW;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    drawRoundRect(ctx, x, subY, subW, subH, [4, 4, 14, 14]);
    ctx.fillStyle = '#0F172A';
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = "900 18px 'Plus Jakarta Sans', 'Inter', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(subStatusText, x + subW / 2, subY + subH / 2 + 6);
  }

  ctx.restore();
}

export const drawHexagonalCrestBadge = drawModernPropertyBadge;

/**
 * Draws the high-impact Red Price Banner and Location Pill (Bottom Left of Photo)
 * Location text (Neighborhood | City) is enlarged as requested.
 */
export function drawPriceAndLocationBanners(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  priceText: string,
  locationText: string
) {
  ctx.save();

  // 1. Red Price Rectangle
  ctx.font = "900 42px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const priceMetrics = ctx.measureText(priceText);
  const pricePadX = 26;
  const priceW = Math.max(340, priceMetrics.width + pricePadX * 2);
  const priceH = 70;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;

  ctx.fillStyle = '#E5094C';
  ctx.fillRect(x, y, priceW, priceH);

  // Price Text
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(priceText, x + pricePadX, y + 49);

  // 2. Location Pill directly underneath (Larger font for Bairro | Cidade)
  const locY = y + priceH + 4;
  ctx.font = "800 22px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const locMetrics = ctx.measureText(locationText);
  const locPadX = 24;
  const locW = locMetrics.width + locPadX * 2;
  const locH = 46;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.30)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;

  drawRoundRect(ctx, x, locY, locW, locH, [0, 16, 16, 0]);
  ctx.fillStyle = '#E5094C';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(locationText, x + locPadX, locY + 31);

  ctx.restore();
}

/**
 * Draws custom vector icons in Lopes Red for specifications.
 */
export function drawSpecIcon(
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  size: number = 38,
  color: string = '#E5094C'
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
    // Bed Vector Icon
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
    // Shower / Bath Icon
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
    // Car Icon
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
    // Pool Waves
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
    // Grill / Flame
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
    // Area / Maximize Icon
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
  } else {
    // Star / Feature Icon
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
 * Draws proportional, centered CTA Button ("AGENDE SUA VISITA")
 */
export function drawCtaBanner(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
  ctaText: string = 'AGENDE SUA VISITA'
) {
  ctx.save();

  let textToDraw = (ctaText || 'AGENDE SUA VISITA').trim();
  if (textToDraw.includes('•')) {
    textToDraw = textToDraw.split('•')[0].trim();
  }
  textToDraw = textToDraw.toUpperCase();

  ctx.font = "900 24px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const textMetrics = ctx.measureText(textToDraw);

  const padX = 46;
  const ctaW = Math.max(340, Math.min(textMetrics.width + padX * 2, 540));
  const ctaH = 62;
  const ctaX = centerX - ctaW / 2;

  // Drop shadow
  ctx.shadowColor = 'rgba(5, 150, 105, 0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  // Emerald Green Capsule Pill
  drawRoundRect(ctx, ctaX, y, ctaW, ctaH, 31);
  const grad = ctx.createLinearGradient(ctaX, y, ctaX + ctaW, y + ctaH);
  grad.addColorStop(0, '#059669');
  grad.addColorStop(1, '#047857');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // White inner subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // CTA Text centered
  ctx.fillStyle = '#FFFFFF';
  ctx.font = "900 24px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(textToDraw, centerX, y + ctaH / 2 + 8);

  ctx.restore();
}

/**
 * Draws the clean Lopes Manaus footer signature
 */
export function drawLopesManausFooter(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  bottomY: number
) {
  ctx.save();

  const textLopes = 'Lopes';
  const textManaus = 'MANAUS';

  ctx.font = "900 26px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const lopesWidth = ctx.measureText(textLopes).width;

  ctx.font = "800 18px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const manausWidth = ctx.measureText(textManaus).width;

  const heartSize = 28;
  const heartGap = 12;
  const wordGap = 10;
  const totalW = heartSize + heartGap + lopesWidth + wordGap + manausWidth;

  const startX = centerX - totalW / 2;

  // 1. Draw Lopes Heart Vector
  drawLopesHeartVector(ctx, startX, bottomY - 26, heartSize, '#E5094C');

  // 2. Draw "Lopes" in Red
  ctx.textAlign = 'left';
  ctx.fillStyle = '#E5094C';
  ctx.font = "900 26px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText(textLopes, startX + heartSize + heartGap, bottomY - 4);

  // 3. Draw "MANAUS" in dark slate
  ctx.fillStyle = '#0F172A';
  ctx.font = "800 18px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText(textManaus, startX + heartSize + heartGap + lopesWidth + wordGap, bottomY - 4);

  ctx.restore();
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
  fontSizePx: number
): number {
  ctx.font = `900 ${fontSizePx}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
  ctx.fillStyle = '#0F172A';
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
 * Primary Native 2D Canvas Post Renderer (100% Deterministic)
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

  const isSquare = height === 1080;
  const isStory = height >= 1800;
  const photoHeightRatio = isSquare ? 0.62 : (isStory ? 0.70 : 0.67);
  const photoHeight = Math.round(height * photoHeightRatio);

  // 1. Draw Background Photo (Top section)
  try {
    const bgImg = await loadImageSafely(photoUrl);
    drawImageCover(ctx, bgImg, 0, 0, width, photoHeight);
  } catch (e) {
    console.warn('Failed to load photo, drawing placeholder:', e);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, photoHeight);
  }

  // 2. Photographic Vignette (Top shadow for badge readability)
  const topGrad = ctx.createLinearGradient(0, 0, 0, 220);
  topGrad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
  topGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, 220);

  // 3. Smooth Dark Transparent Gradient Transition Overlay between photo and lower white section
  const transitionGrad = ctx.createLinearGradient(0, photoHeight - 160, 0, photoHeight);
  transitionGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
  transitionGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.50)');
  transitionGrad.addColorStop(1, 'rgba(15, 23, 42, 0.88)');
  ctx.fillStyle = transitionGrad;
  ctx.fillRect(0, photoHeight - 160, width, 160);

  // 4. Process Variables
  const isRent = property.purpose === 'Locação';
  const defaultStatus = isRent ? 'LOCAÇÃO' : 'VENDA';
  const statusText = aiData?.statusTag || defaultStatus;
  const subStatusText = aiData?.subStatus || 'DISPONÍVEL';

  const priceVal = isRent ? (property.rent_price || property.price || 0) : (property.price || 0);
  const defaultPriceText = priceVal > 0 
    ? `R$ ${priceVal.toLocaleString('pt-BR')}${isRent ? '/mês' : ''}` 
    : 'Consulte-nos';
  const priceFormatted = aiData?.priceFormatted || defaultPriceText;

  const neighborhood = property.neighborhood || 'Manaus';
  const city = property.city || 'Manaus';
  const locationText = aiData?.locationTag || `${neighborhood} | ${city}`;

  const category = property.category || 'Imóvel';
  const rawTitle = property.title || `${category} em ${neighborhood}`;

  // Unified Title handling: create a clean, bold, strong headline
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

  // 5. Overlaid Elements on Photo (Modern Badge + Price / Location)
  drawModernPropertyBadge(ctx, 45, 40, statusText, subStatusText);
  drawPriceAndLocationBanners(ctx, 45, photoHeight - 130, priceFormatted, locationText);

  // 6. Bottom Information Card
  const bottomCardY = photoHeight;
  const bottomCardH = height - photoHeight;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, bottomCardY, width, bottomCardH);

  // 7. Property Headline Typography - LARGER, EXTRA BOLD, UNIFIED, CENTERED
  // Pushed down slightly more from photo edge as requested (clears top gradient)
  ctx.save();
  const titleCenterX = width / 2;
  const titleStartY = bottomCardY + (isSquare ? 64 : (isStory ? 84 : 70));
  const maxTitleWidth = width - 100;
  const titleFontSizePx = isSquare ? 38 : 42;

  const lastTitleY = drawCenteredWrappedHeadline(
    ctx,
    fullTitle,
    titleCenterX,
    titleStartY,
    maxTitleWidth,
    titleFontSizePx
  );
  ctx.restore();

  // 8. Specifications Row - FULLY CENTERED & EXPANDED TO FILL
  const specsY = lastTitleY + (isSquare ? 52 : (isStory ? 74 : 62));
  const specItemCount = Math.max(1, specs.length);
  const gap = 16;
  const maxRowWidth = width - 90;
  const calculatedBadgeW = Math.floor((maxRowWidth - (specItemCount - 1) * gap) / specItemCount);
  const badgeW = Math.min(280, Math.max(195, calculatedBadgeW));
  const badgeH = isSquare ? 58 : 64;
  const totalSpecsW = specItemCount * badgeW + (specItemCount - 1) * gap;
  const specsStartX = (width - totalSpecsW) / 2;

  ctx.save();
  specs.forEach((item, index) => {
    const badgeX = specsStartX + index * (badgeW + gap);
    const badgeY = specsY - badgeH / 2;

    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 16);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Icon + Label inside badge (Larger icon & text, centered/aligned)
    const iconSize = isSquare ? 34 : 38;
    const iconX = badgeX + 16;
    const iconY = badgeY + (badgeH - iconSize) / 2;
    drawSpecIcon(ctx, item.icon, iconX, iconY, iconSize, '#E5094C');

    ctx.fillStyle = '#0F172A';
    ctx.font = `${isSquare ? '800 19px' : '800 21px'} 'Plus Jakarta Sans', 'Inter', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(item.label.toUpperCase(), iconX + iconSize + 10, badgeY + badgeH / 2 + 7);
  });
  ctx.restore();

  // 9. Centered Proportional CTA Button ("AGENDE SUA VISITA")
  const ctaY = specsY + (isSquare ? 54 : (isStory ? 82 : 62));
  drawCtaBanner(ctx, width / 2, ctaY, width, ctaText);

  // 10. WhatsApp Text below CTA Button - Larger font & spaced slightly more below button
  if (whatsappNum) {
    ctx.save();
    ctx.fillStyle = '#0F172A';
    ctx.font = "800 23px 'Plus Jakarta Sans', 'Inter', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(`📲 WhatsApp: ${whatsappNum}`, width / 2, ctaY + 62 + 38);
    ctx.restore();
  }

  // 11. Clean Centered Lopes Manaus Signature
  const footerY = height - (isSquare ? 18 : (isStory ? 28 : 22));
  drawLopesManausFooter(ctx, width / 2, footerY);
}
