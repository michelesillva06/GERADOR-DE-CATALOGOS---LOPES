import { Property, CompanySettings } from '../types';
import { formatCurrencyBRL } from './priceUtils';
import { PostTemplateId } from '../components/postTemplates';

export interface CanvasPostOptions {
  property: Property;
  companySettings: CompanySettings;
  templateId: PostTemplateId;
  photoUrl: string;
  width: number;
  height: number;
}

/**
 * Loads an image safely with cross-origin handling.
 */
export async function loadImageSafely(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If anonymous CORS failed, try fallback without crossOrigin
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
 * Helper to wrap text cleanly and return lines.
 */
export function getWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = 2
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) {
        const remaining = words.slice(i).join(' ');
        let lastLine = remaining;
        while (ctx.measureText(`${lastLine}...`).width > maxWidth && lastLine.length > 0) {
          lastLine = lastLine.slice(0, -1);
        }
        lines.push(`${lastLine.trim()}...`);
        return lines;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Draws the vector Lopes Heart logo icon directly on the canvas.
 */
export function drawLopesHeartVector(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 44,
  color: string = '#F10F4D'
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
 * Draws the complete Lopes brand lockup badge (Header Pill).
 */
export function drawBrandHeaderBadge(
  ctx: CanvasRenderingContext2D,
  companySettings: CompanySettings,
  x: number,
  y: number
) {
  const companyName = (companySettings.company_name || 'LOPES').toUpperCase();
  const unitName = (companySettings.unit_name || 'MANAUS').toUpperCase();

  ctx.save();
  // Outer Pill Container
  const badgeWidth = 240;
  const badgeHeight = 64;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  drawRoundRect(ctx, x, y, badgeWidth, badgeHeight, 18);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Lopes Heart Icon
  drawLopesHeartVector(ctx, x + 16, y + 10, 42, '#F10F4D');

  // Brand Name Typography
  ctx.fillStyle = '#0F172A';
  ctx.font = "900 24px 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
  ctx.fillText(companyName.includes('LOPES') ? 'LOPES' : companyName, x + 68, y + 36);

  // Unit Name Typography
  ctx.fillStyle = '#F10F4D';
  ctx.font = "800 11px 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
  ctx.fillText(unitName, x + 70, y + 52);

  ctx.restore();
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
 * Primary Native 2D Canvas Post Renderer.
 * High-performance, pixel-perfect, zero html2canvas distortion.
 */
export async function renderPostToCanvas(
  targetCanvas: HTMLCanvasElement,
  options: CanvasPostOptions
): Promise<void> {
  const { property, companySettings, templateId, photoUrl, width, height } = options;
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  targetCanvas.width = width;
  targetCanvas.height = height;

  // 1. Draw Background Photo (Cover)
  try {
    const bgImg = await loadImageSafely(photoUrl);
    drawImageCover(ctx, bgImg, 0, 0, width, height);
  } catch (e) {
    console.warn('Failed to load primary photo, drawing solid backdrop:', e);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Soft photographic gradient overlays
  // Top vignette for logo clarity
  const topGrad = ctx.createLinearGradient(0, 0, 0, 320);
  topGrad.addColorStop(0, 'rgba(15, 23, 42, 0.65)');
  topGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.20)');
  topGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, 320);

  // Bottom dark gradient to lift information card without muting the main photo
  const bottomGrad = ctx.createLinearGradient(0, height * 0.45, 0, height);
  bottomGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
  bottomGrad.addColorStop(0.4, 'rgba(15, 23, 42, 0.25)');
  bottomGrad.addColorStop(1, 'rgba(15, 23, 42, 0.90)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, height * 0.45, width, height * 0.55);

  // 3. Top Header Bar
  drawBrandHeaderBadge(ctx, companySettings, 48, 48);

  // Status Badge on Top Right
  const isRent =
    templateId === 'feed_aluguel' ||
    property.purpose === 'Locação' ||
    property.purpose === 'Venda e Locação';

  let statusText = 'VENDA EXCLUSIVA';
  let statusColor = '#F10F4D';

  if (templateId === 'feed_aluguel' || isRent) {
    statusText = 'LOCAÇÃO DISPONÍVEL';
    statusColor = '#059669';
  } else if (templateId === 'carrossel_capa') {
    statusText = 'TOUR COMPLETO';
    statusColor = '#F10F4D';
  } else if (templateId === 'story') {
    statusText = isRent ? 'LOCAÇÃO EXCLUSIVA' : 'OPORTUNIDADE EXCLUSIVA';
    statusColor = isRent ? '#059669' : '#F10F4D';
  }

  // Draw Status Badge Pill (Top Right)
  ctx.save();
  ctx.font = "800 13px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const statusWidth = ctx.measureText(statusText).width + 48;
  const statusX = width - 48 - statusWidth;
  const statusY = 56;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  drawRoundRect(ctx, statusX, statusY, statusWidth, 48, 14);
  ctx.fillStyle = statusColor;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  // Pulsing white dot
  ctx.beginPath();
  ctx.arc(statusX + 22, statusY + 24, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Status text
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(statusText, statusX + 36, statusY + 29);
  ctx.restore();

  // 4. Data Variables
  const category = (property.category || 'Imóvel').toUpperCase();
  const code = property.code || property.id?.slice(0, 6) || 'LOPES';
  const neighborhood = property.neighborhood || 'Manaus';
  const city = property.city || 'Manaus';
  const bedrooms = property.bedrooms || 0;
  const suites = property.suites || 0;
  const bathrooms = property.bathrooms || 0;
  const parkingSpaces = property.parking_spaces || 0;
  const area = property.total_area || property.built_area || 0;

  const priceFormatted = isRent
    ? formatCurrencyBRL(property.rent_price || property.price || 0)
    : formatCurrencyBRL(property.price || 0);

  // 5. Render Main Floating Card Layout based on template dimensions
  const isStory = templateId === 'story' || height >= 1800;
  const cardMargin = 48;
  const cardWidth = width - cardMargin * 2;
  const cardHeight = isStory ? 760 : 640;
  const footerHeight = 68;
  const cardY = height - cardHeight - footerHeight - (isStory ? 48 : 36);

  // Floating Location Pill (Above Main Card)
  ctx.save();
  const locationText = `📍  ${neighborhood.toUpperCase()}, ${city.toUpperCase()}`;
  ctx.font = "800 13px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const locWidth = ctx.measureText(locationText).width + 36;
  const locX = cardMargin;
  const locY = cardY - 56;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  drawRoundRect(ctx, locX, locY, locWidth, 42, 21);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(locationText, locX + 18, locY + 26);
  ctx.restore();

  // Floating Code Tag (Above Main Card, Right)
  ctx.save();
  const codeText = `CÓD: ${code}`;
  ctx.font = "800 12px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const codeWidth = ctx.measureText(codeText).width + 28;
  const codeX = width - cardMargin - codeWidth;
  const codeY = cardY - 56;

  drawRoundRect(ctx, codeX, codeY, codeWidth, 42, 21);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#E2E8F0';
  ctx.fillText(codeText, codeX + 14, codeY + 26);
  ctx.restore();

  // 6. Draw White Editorial Card Container
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 16;

  drawRoundRect(ctx, cardMargin, cardY, cardWidth, cardHeight, 32);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  let innerY = cardY + 40;
  const innerLeft = cardMargin + 36;
  const innerRight = cardMargin + cardWidth - 36;
  const innerContentWidth = innerRight - innerLeft;

  // Category Tag inside card
  ctx.font = "800 12px 'Plus Jakarta Sans', 'Inter', sans-serif";
  const catTagText = `${category} • ${isRent ? 'LOCAÇÃO' : 'VENDA'}`;
  const catTagWidth = ctx.measureText(catTagText).width + 24;

  drawRoundRect(ctx, innerLeft, innerY, catTagWidth, 30, 8);
  ctx.fillStyle = isRent ? '#ECFDF5' : '#FFF1F4';
  ctx.fill();

  ctx.fillStyle = isRent ? '#059669' : '#F10F4D';
  ctx.fillText(catTagText, innerLeft + 12, innerY + 20);

  // Agency branding right alignment
  ctx.fillStyle = '#94A3B8';
  ctx.font = "800 12px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.textAlign = 'right';
  ctx.fillText('LOPES MANAUS', innerRight, innerY + 20);
  ctx.textAlign = 'left';

  innerY += 56;

  // Property Title (Wrapped cleanly)
  ctx.fillStyle = '#0F172A';
  ctx.font = isStory
    ? "900 36px 'Plus Jakarta Sans', 'Inter', sans-serif"
    : "900 30px 'Plus Jakarta Sans', 'Inter', sans-serif";

  const rawTitle = property.title || `${category} de Alto Padrão em ${neighborhood}`;
  const titleLines = getWrappedLines(ctx, rawTitle, innerContentWidth, 2);
  const titleLineHeight = isStory ? 44 : 38;

  titleLines.forEach((line) => {
    ctx.fillText(line, innerLeft, innerY);
    innerY += titleLineHeight;
  });

  innerY += 12;

  // Price Banner Box
  const priceBoxHeight = isStory ? 120 : 105;
  drawRoundRect(ctx, innerLeft, innerY, innerContentWidth, priceBoxHeight, 20);
  ctx.fillStyle = '#F8FAFC';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Price Label
  ctx.fillStyle = '#64748B';
  ctx.font = "800 12px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText(isRent ? 'VALOR DE LOCAÇÃO MENSAL' : 'VALOR DE VENDA', innerLeft + 24, innerY + 34);

  // Price Value Big
  ctx.fillStyle = isRent ? '#059669' : '#F10F4D';
  ctx.font = isStory
    ? "900 46px 'Plus Jakarta Sans', 'Inter', sans-serif"
    : "900 40px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText(priceFormatted, innerLeft + 24, innerY + 84);

  if (isRent) {
    ctx.font = "700 16px 'Plus Jakarta Sans', 'Inter', sans-serif";
    ctx.fillStyle = '#64748B';
    const pWidth = ctx.measureText(priceFormatted).width;
    ctx.fillText('/mês', innerLeft + 24 + pWidth + 8, innerY + 84);
  }

  // Right side of Price Banner: Condo Fee or Ready badge
  if (property.condo_fee && property.condo_fee > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94A3B8';
    ctx.font = "700 11px 'Plus Jakarta Sans', 'Inter', sans-serif";
    ctx.fillText('CONDOMÍNIO', innerRight - 24, innerY + 44);

    ctx.fillStyle = '#1E293B';
    ctx.font = "800 15px 'Plus Jakarta Sans', 'Inter', sans-serif";
    ctx.fillText(formatCurrencyBRL(property.condo_fee), innerRight - 24, innerY + 70);
    ctx.textAlign = 'left';
  } else {
    ctx.textAlign = 'right';
    const tag = isRent ? 'PRONTO PARA MORAR' : 'ALTO PADRÃO';
    ctx.font = "800 11px 'Plus Jakarta Sans', 'Inter', sans-serif";
    const tagW = ctx.measureText(tag).width + 20;

    drawRoundRect(ctx, innerRight - 24 - tagW, innerY + 40, tagW, 28, 6);
    ctx.fillStyle = '#F1F5F9';
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.fillText(tag, innerRight - 34, innerY + 58);
    ctx.textAlign = 'left';
  }

  innerY += priceBoxHeight + 20;

  // 4 Specification Metrics Boxes
  const specGap = 12;
  const specWidth = (innerContentWidth - specGap * 3) / 4;
  const specHeight = isStory ? 92 : 82;

  const specs = [
    { label: 'ÁREA', value: area > 0 ? `${area}m²` : '-' },
    {
      label: 'QUARTOS',
      value: bedrooms > 0 ? (suites > 0 ? `${bedrooms} (${suites}s)` : `${bedrooms}`) : '-'
    },
    { label: 'BANHEIROS', value: bathrooms > 0 ? `${bathrooms}` : '-' },
    { label: 'VAGAS', value: parkingSpaces > 0 ? `${parkingSpaces}` : '-' }
  ];

  specs.forEach((spec, idx) => {
    const boxX = innerLeft + idx * (specWidth + specGap);
    drawRoundRect(ctx, boxX, innerY, specWidth, specHeight, 16);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    // Label
    ctx.fillStyle = '#94A3B8';
    ctx.font = "800 11px 'Plus Jakarta Sans', 'Inter', sans-serif";
    ctx.fillText(spec.label, boxX + specWidth / 2, innerY + 28);

    // Value
    ctx.fillStyle = '#0F172A';
    ctx.font = "900 18px 'Plus Jakarta Sans', 'Inter', sans-serif";
    ctx.fillText(spec.value, boxX + specWidth / 2, innerY + 58);
    ctx.textAlign = 'left';
  });

  innerY += specHeight + 20;

  // Story CTA or Carrossel CTA Banner
  if (isStory) {
    const ctaHeight = 52;
    drawRoundRect(ctx, innerLeft, innerY, innerContentWidth, ctaHeight, 16);
    ctx.fillStyle = '#F10F4D';
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = "800 14px 'Plus Jakarta Sans', 'Inter', sans-serif";
    ctx.fillText('📲  RESPONDA ESTE STORY PARA AGENDAR UMA VISITA', innerLeft + innerContentWidth / 2, innerY + 32);
    ctx.textAlign = 'left';
  } else if (templateId === 'carrossel_capa') {
    const ctaHeight = 48;
    drawRoundRect(ctx, innerLeft, innerY, innerContentWidth, ctaHeight, 14);
    ctx.fillStyle = '#F10F4D';
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = "800 13px 'Plus Jakarta Sans', 'Inter', sans-serif";
    ctx.fillText('DESLIZE PARA VER TODAS AS FOTOS  ➡️', innerLeft + innerContentWidth / 2, innerY + 29);
    ctx.textAlign = 'left';
  }

  ctx.restore();

  // 7. Footer Contact Bar
  ctx.save();
  const phone = companySettings.whatsapp || companySettings.phone || '(92) 98111-0000';
  const instagram = companySettings.instagram || '@lopesmanaus';
  const creci = companySettings.creci_j ? `CRECI ${companySettings.creci_j}` : 'CRECI PJ 432';

  ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
  ctx.fillRect(0, height - footerHeight, width, footerHeight);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = "700 14px 'Plus Jakarta Sans', 'Inter', sans-serif";

  // Phone Left
  ctx.fillStyle = '#F10F4D';
  ctx.fillText('WhatsApp: ', cardMargin, height - 28);
  const waPrefixW = ctx.measureText('WhatsApp: ').width;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(phone, cardMargin + waPrefixW, height - 28);

  // Center CRECI
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = "600 12px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText(creci, width / 2, height - 28);

  // Instagram Right
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94A3B8';
  ctx.font = "700 14px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillText('Instagram: ', width - cardMargin - ctx.measureText(instagram).width - 4, height - 28);
  ctx.fillStyle = '#F10F4D';
  ctx.fillText(instagram, width - cardMargin, height - 28);

  ctx.restore();
}
