import jsPDF from 'jspdf';
import { Property, User, CompanySettings } from '../types';
import { buildWhatsAppUrl, formatPhoneDisplay, getEffectiveWhatsApp } from './whatsapp';
import { getPropertyPriceInfo } from './priceUtils';

// Helper to convert image URL or Data URL to Base64 JPEG DataURL safely for jsPDF
async function urlToBase64(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  const img = await loadImageElement(url);
  if (img) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 1920;
      canvas.height = img.naturalHeight || img.height || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.88);
      }
    } catch (e) {
      console.warn('Canvas toDataURL warning in urlToBase64:', e);
    }
  }
  return url;
}

function formatCurrency(val: number): string {
  if (!val || val === 0) return 'Sob Consulta';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

/**
 * Draws the official pixel-perfect Lopes heart emblem on any HTML5 Canvas context.
 */
function drawLopesHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string = '#E50938'
) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 100;
  ctx.scale(scale, scale);
  ctx.fillStyle = color;

  // 1. Circle dot top-right
  ctx.beginPath();
  ctx.arc(75, 28, 18, 0, Math.PI * 2);
  ctx.fill();

  // 2. Heart body shape
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

export const DEFAULT_OFFICIAL_COVERS = {
  HORIZONTAL: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=85',
  VENDA: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=85',
  LOCACAO: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1920&q=85'
};

/**
 * Resolves the administrator-saved cover image URL based on purpose/type.
 * NEVER generates procedural canvas. Uses exclusively the administrator-saved covers.
 */
export function resolveAdminCoverUrl(
  type: 'VENDA' | 'LOCACAO' | 'GERAL',
  companySettings?: CompanySettings,
  customCoverImage?: string
): string {
  if (customCoverImage && customCoverImage.trim()) {
    return customCoverImage.trim();
  }

  if (type === 'LOCACAO') {
    return (
      companySettings?.cover_locacao_url ||
      companySettings?.cover_horizontal_url ||
      companySettings?.cover_geral_url ||
      companySettings?.cover_venda_url ||
      DEFAULT_OFFICIAL_COVERS.LOCACAO
    );
  }

  if (type === 'VENDA') {
    return (
      companySettings?.cover_venda_url ||
      companySettings?.cover_horizontal_url ||
      companySettings?.cover_geral_url ||
      companySettings?.cover_locacao_url ||
      DEFAULT_OFFICIAL_COVERS.VENDA
    );
  }

  return (
    companySettings?.cover_horizontal_url ||
    companySettings?.cover_geral_url ||
    companySettings?.cover_venda_url ||
    companySettings?.cover_locacao_url ||
    DEFAULT_OFFICIAL_COVERS.HORIZONTAL
  );
}

/**
 * Prepares the high-resolution cover page image (2970x2100 at 300 DPI)
 * using the real administrator-saved cover image.
 */
export async function renderAdminCoverImage(
  type: 'VENDA' | 'LOCACAO' | 'GERAL',
  companySettings?: CompanySettings,
  customCoverImage?: string
): Promise<string> {
  const coverUrl = resolveAdminCoverUrl(type, companySettings, customCoverImage);
  const img = await loadImageElement(coverUrl);

  const canvas = document.createElement('canvas');
  canvas.width = 2970;
  canvas.height = 2100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (img) {
    const imgRatio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
    const canvasRatio = canvas.width / canvas.height;
    let renderW = canvas.width;
    let renderH = canvas.height;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > canvasRatio) {
      renderW = canvas.height * imgRatio;
      offsetX = -(renderW - canvas.width) / 2;
    } else {
      renderH = canvas.width / imgRatio;
      offsetY = -(renderH - canvas.height) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}

// Deprecated alias for backwards compatibility if needed
export async function renderCoverCanvas(
  type: 'VENDA' | 'LOCACAO' | 'GERAL',
  companySettings?: CompanySettings
): Promise<string> {
  return renderAdminCoverImage(type, companySettings);
}

export async function renderHorizontalCoverCanvas(
  type: 'VENDA' | 'LOCACAO' | 'GERAL',
  companySettings?: CompanySettings
): Promise<string> {
  return renderAdminCoverImage(type, companySettings);
}

function extractPropertyImages(prop: Property): string[] {
  const result: string[] = [];

  // 1. Check main_image
  if (prop.main_image && typeof prop.main_image === 'string' && prop.main_image.trim()) {
    result.push(prop.main_image.trim());
  }

  // 2. Check images array
  if (Array.isArray(prop.images) && prop.images.length > 0) {
    for (const item of prop.images) {
      if (typeof item === 'string' && item.trim()) {
        if (!result.includes(item.trim())) result.push(item.trim());
      } else if (item && typeof item === 'object' && (item as any).url) {
        const u = (item as any).url;
        if (typeof u === 'string' && u.trim() && !result.includes(u.trim())) result.push(u.trim());
      }
    }
  }

  // 3. Check photos array
  if (Array.isArray(prop.photos) && prop.photos.length > 0) {
    for (const item of prop.photos) {
      if (typeof item === 'string' && item.trim()) {
        if (!result.includes(item.trim())) result.push(item.trim());
      } else if (item && typeof item === 'object' && item.url) {
        const u = item.url;
        if (typeof u === 'string' && u.trim() && !result.includes(u.trim())) result.push(u.trim());
      }
    }
  }

  // Fallback default high-res real estate photo if empty
  if (result.length === 0) {
    result.push('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80');
  }

  return result;
}

async function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);

  const loadImgFromSrc = (src: string, useCrossOrigin = true): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      if (useCrossOrigin && !src.startsWith('data:')) {
        img.crossOrigin = 'Anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  // 1. Try standard crossOrigin loading
  let loadedImg = await loadImgFromSrc(url, true);
  if (loadedImg) return loadedImg;

  // 2. If CORS failed, try fetching as a blob and converting to Data URL
  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
      if (dataUrl) {
        loadedImg = await loadImgFromSrc(dataUrl, false);
        if (loadedImg) return loadedImg;
      }
    }
  } catch {
    // Ignore fetch error
  }

  // 3. Fallback: try loading without crossOrigin
  return await loadImgFromSrc(url, false);
}

function drawRoundedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fallbackText?: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();

  if (img) {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let renderW = w;
    let renderH = h;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > boxRatio) {
      renderW = h * imgRatio;
      offsetX = -(renderW - w) / 2;
    } else {
      renderH = w / imgRatio;
      offsetY = -(renderH - h) / 2;
    }
    ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);
  } else {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#334155');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    if (fallbackText) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fallbackText, x + w / 2, y + h / 2);
      ctx.textAlign = 'left';
    }
  }
  ctx.restore();
}

/**
 * Renders a 100% pixel-perfect A4 HORIZONTAL / LANDSCAPE property catalog page (2970px x 2100px)
 * exactly matching the Lopes Manaus luxury real estate magazine template.
 */
export async function renderHorizontalPropertyCanvas(
  prop: Property,
  captador: User,
  companySettings: CompanySettings,
  pageIndex: number = 0,
  totalPages: number = 1,
  baseUrl: string = window.location.origin
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 2970;
  canvas.height = 2100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const LOPES_RED = '#F10F4D';
  const NAVY_DARK = '#0B192C';
  const TEXT_DARK = '#0F172A';
  const TEXT_MUTED = '#475569';
  const BG_LIGHT = '#F8FAFC';
  const BORDER_COLOR = '#E2E8F0';

  // 1. Fill background pure white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Load photos asynchronously
  const allImgs = extractPropertyImages(prop);
  const mainImgUrl = allImgs[0] || '';
  const thumb1Url = allImgs[1] || allImgs[0] || mainImgUrl;
  const thumb2Url = allImgs[2] || allImgs[1] || mainImgUrl;
  const thumb3Url = allImgs[3] || allImgs[0] || mainImgUrl;
  const thumb4Url = allImgs[4] || allImgs[0] || mainImgUrl;

  const [mainImg, thumb1, thumb2, thumb3, thumb4] = await Promise.all([
    loadImageElement(mainImgUrl),
    loadImageElement(thumb1Url),
    loadImageElement(thumb2Url),
    loadImageElement(thumb3Url),
    loadImageElement(thumb4Url)
  ]);

  // =========================================================================
  // HEADER ZONE
  // =========================================================================
  // Top Left: Logo Lopes Manaus
  drawLopesHeart(ctx, 80, 50, 75, LOPES_RED);

  // Logo Text
  ctx.fillStyle = LOPES_RED;
  ctx.font = '900 68px sans-serif';
  ctx.fillText('Lopes', 170, 88);

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '800 30px sans-serif';
  ctx.fillText('MANAUS', 172, 126);

  // Top Right: Captador Contact & Brand
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '700 28px sans-serif';
  ctx.textAlign = 'right';
  const captadorPhoneStr = formatPhoneDisplay(getEffectiveWhatsApp(captador, companySettings));
  ctx.fillText(`CAPTADOR: ${captador.name.toUpperCase()}  •  TEL: ${captadorPhoneStr}  •  CRECI: ${captador.creci || '540-J/AM'}`, 2850, 92);
  ctx.textAlign = 'left';

  // Red Divider Line under header
  ctx.fillStyle = LOPES_RED;
  ctx.fillRect(750, 118, 2100, 3.5);

  // End dot
  ctx.beginPath();
  ctx.arc(2850, 120, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // =========================================================================
  // MAIN AREA (TOP SECTION)
  // =========================================================================

  // LEFT SIDE (40% width) - Main Image + Badge
  const mainImgX = 90;
  const mainImgY = 160;
  const mainImgW = 1120;
  const mainImgH = 1040;

  drawRoundedImage(ctx, mainImg, mainImgX, mainImgY, mainImgW, mainImgH, 16, 'Foto Principal');

  const priceInfo = getPropertyPriceInfo(prop);

  // Red Badge: "VENDA" or "LOCAÇÃO" or "VENDA E LOCAÇÃO"
  const badgeW = priceInfo.isBoth ? 360 : 220;
  const badgeH = 72;
  const badgeText = priceInfo.isBoth ? 'VENDA E LOCAÇÃO' : (priceInfo.isRent ? 'LOCAÇÃO' : 'VENDA');

  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(mainImgX, mainImgY, badgeW, badgeH, [16, 0, 16, 0]);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = priceInfo.isBoth ? '900 28px sans-serif' : '900 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, mainImgX + (badgeW / 2), mainImgY + 48);
  ctx.textAlign = 'left';

  // RIGHT SIDE (60% width) - Title, Subtitle, 6 Feature Cards
  const rightX = 1260;
  const rightW = 1590;

  // Title
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 82px Georgia, "Times New Roman", serif';
  
  // Wrap Title if needed
  const titleWords = prop.title.split(' ');
  let titleLine1 = '';
  let titleLine2 = '';
  let titleY = 235;

  for (let w = 0; w < titleWords.length; w++) {
    const testLine = titleLine1 + titleWords[w] + ' ';
    if (ctx.measureText(testLine).width > (rightW - 40) && w > 0) {
      titleLine2 = titleWords.slice(w).join(' ');
      break;
    } else {
      titleLine1 = testLine;
    }
  }

  ctx.fillText(titleLine1.trim(), rightX, titleY);
  if (titleLine2) {
    titleY += 90;
    ctx.fillText(titleLine2.trim(), rightX, titleY);
  }

  // Subtitle
  titleY += 55;
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '600 36px sans-serif';
  const subtitle = `Conforto, localização e qualidade de vida no bairro ${prop.neighborhood || 'Parque 10'} em Manaus.`;
  
  // Wrap subtitle into 2 lines if needed
  const subWords = subtitle.split(' ');
  let subLine1 = '';
  let subLine2 = '';
  for (let w = 0; w < subWords.length; w++) {
    const testLine = subLine1 + subWords[w] + ' ';
    if (ctx.measureText(testLine).width > (rightW - 40) && w > 0) {
      subLine2 = subWords.slice(w).join(' ');
      break;
    } else {
      subLine1 = testLine;
    }
  }

  ctx.fillText(subLine1.trim(), rightX, titleY);
  if (subLine2) {
    titleY += 48;
    ctx.fillText(subLine2.trim(), rightX, titleY);
  }

  // Red Bar Accent under Subtitle
  titleY += 30;
  ctx.fillStyle = LOPES_RED;
  ctx.fillRect(rightX, titleY, 140, 6);

  // 6 Feature Cards Grid (2 rows x 3 columns)
  const gridY = titleY + 50;
  const cardW = 505;
  const cardH = 260;
  const gapX = 35;
  const gapY = 32;

  const cardsData = [
    {
      icon: 'house',
      label: 'TIPO',
      value: prop.category || 'Casa'
    },
    {
      icon: 'pin',
      label: 'LOCALIZAÇÃO',
      value: `${prop.neighborhood || 'Parque 10'} -\nManaus/AM`
    },
    {
      icon: 'grid',
      label: 'ÁREA',
      value: `${prop.built_area || prop.total_area || 180} m²`
    },
    {
      icon: 'bed',
      label: 'QUARTOS',
      value: `${prop.bedrooms || 3} quartos${prop.suites ? ` (${prop.suites} suíte)` : ''}`
    },
    {
      icon: 'car',
      label: 'VAGAS',
      value: `${prop.parking_spaces || 2} vagas`
    },
    {
      icon: 'tag',
      label: priceInfo.pdfTagLabel,
      value: priceInfo.pdfDisplay,
      isPrice: true
    }
  ];

  cardsData.forEach((card, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);

    const cx = rightX + (col * (cardW + gapX));
    const cy = gridY + (row * (cardH + gapY));

    // Card background
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx, cy, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // Red Line Art Icon on left inside card
    const icx = cx + 50;
    const icy = cy + (cardH / 2);

    ctx.strokeStyle = LOPES_RED;
    ctx.fillStyle = LOPES_RED;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (card.icon === 'house') {
      ctx.beginPath();
      ctx.moveTo(icx - 22, icy + 5);
      ctx.lineTo(icx, icy - 18);
      ctx.lineTo(icx + 22, icy + 5);
      ctx.stroke();
      ctx.strokeRect(icx - 15, icy + 5, 30, 20);
    } else if (card.icon === 'pin') {
      ctx.beginPath();
      ctx.arc(icx, icy - 8, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(icx - 10, icy - 2);
      ctx.lineTo(icx, icy + 18);
      ctx.lineTo(icx + 10, icy - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(icx, icy - 8, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (card.icon === 'grid') {
      ctx.strokeRect(icx - 18, icy - 18, 36, 36);
      ctx.beginPath();
      ctx.moveTo(icx - 18, icy);
      ctx.lineTo(icx + 18, icy);
      ctx.moveTo(icx, icy - 18);
      ctx.lineTo(icx, icy + 18);
      ctx.stroke();
    } else if (card.icon === 'bed') {
      ctx.beginPath();
      ctx.strokeRect(icx - 22, icy - 14, 44, 28);
      ctx.strokeRect(icx - 18, icy - 10, 16, 12);
      ctx.strokeRect(icx + 2, icy - 10, 16, 12);
      ctx.moveTo(icx - 22, icy + 2);
      ctx.lineTo(icx + 22, icy + 2);
      ctx.stroke();
    } else if (card.icon === 'car') {
      ctx.beginPath();
      ctx.moveTo(icx - 22, icy + 5);
      ctx.lineTo(icx - 16, icy - 12);
      ctx.lineTo(icx + 16, icy - 12);
      ctx.lineTo(icx + 22, icy + 5);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeRect(icx - 24, icy + 5, 48, 12);
      ctx.beginPath();
      ctx.arc(icx - 14, icy + 17, 5, 0, Math.PI * 2);
      ctx.arc(icx + 14, icy + 17, 5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Tag / Sack / Dollar
      ctx.beginPath();
      ctx.arc(icx, icy, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', icx, icy + 8);
      ctx.textAlign = 'left';
    }

    // Card Label
    ctx.fillStyle = '#64748B';
    ctx.font = '800 22px sans-serif';
    ctx.fillText(card.label, cx + 90, cy + 55);

    // Card Value
    if (card.isPrice) {
      ctx.fillStyle = LOPES_RED;
      const vLen = card.value.length;
      ctx.font = vLen > 24 ? '900 26px sans-serif' : vLen > 16 ? '900 32px sans-serif' : '900 38px sans-serif';
      ctx.fillText(card.value, cx + 90, cy + 130);
    } else {
      ctx.fillStyle = TEXT_DARK;
      ctx.font = '800 30px sans-serif';
      const lines = card.value.split('\n');
      if (lines.length === 1) {
        ctx.fillText(lines[0], cx + 90, cy + 125);
      } else {
        ctx.fillText(lines[0], cx + 90, cy + 110);
        ctx.font = '600 26px sans-serif';
        ctx.fillText(lines[1], cx + 90, cy + 148);
      }
    }
  });

  // Top Right Info & Reference Strip under cards
  const stripY = gridY + 2 * cardH + gapY + 15;
  const stripH = 72;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(rightX, stripY, rightW, stripH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = '800 22px sans-serif';
  ctx.fillText('CÓDIGO: ', rightX + 35, stripY + 44);
  ctx.fillStyle = LOPES_RED;
  ctx.font = '900 24px sans-serif';
  ctx.fillText(prop.code, rightX + 135, stripY + 44);

  ctx.fillStyle = '#64748B';
  ctx.font = '800 22px sans-serif';
  ctx.fillText('FINALIDADE: ', rightX + 460, stripY + 44);
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 24px sans-serif';
  ctx.fillText(prop.purpose.toUpperCase(), rightX + 610, stripY + 44);

  ctx.fillStyle = '#64748B';
  ctx.font = '800 22px sans-serif';
  ctx.fillText('LOCAL: ', rightX + 1040, stripY + 44);
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 24px sans-serif';
  ctx.fillText(`${(prop.neighborhood || 'MANAUS').toUpperCase()} - MANAUS/AM`, rightX + 1125, stripY + 44);

  // =========================================================================
  // LOWER GALLERY & VER MAIS DETALHES ROW
  // =========================================================================
  const lowerY = 1240;

  // Gallery (4 photos on bottom left)
  const galX = 90;
  const photoW = 395;
  const photoH = 430;
  const photoGap = 30;

  const galleryThumbs = [
    { img: thumb1, label: 'Sala de Estar' },
    { img: thumb2, label: 'Cozinha' },
    { img: thumb3, label: 'Suíte Master' },
    { img: thumb4, label: 'Área Externa' }
  ];

  galleryThumbs.forEach((item, i) => {
    const px = galX + (i * (photoW + photoGap));
    drawRoundedImage(ctx, item.img, px, lowerY, photoW, photoH, 16, item.label);

    // Caption underneath photo
    ctx.fillStyle = '#334155';
    ctx.font = '700 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, px + (photoW / 2), lowerY + photoH + 42);
    ctx.textAlign = 'left';
  });

  // "VER MAIS DETALHES" Box with CTA Button on bottom right
  const descX = 1815;
  const descW = 1065;
  const descH = 430;

  // Box Background: Soft luxury light rose container with subtle border
  ctx.fillStyle = '#FFF5F7';
  ctx.strokeStyle = '#FECDD3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(descX, lowerY, descW, descH, 20);
  ctx.fill();
  ctx.stroke();

  // Red Left Border Accent
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(descX, lowerY, 10, descH, [20, 0, 0, 20]);
  ctx.fill();

  // Header inside Box: Lopes Emblem Heart + "VER MAIS DETALHES"
  drawLopesHeart(ctx, descX + 40, lowerY + 38, 48, LOPES_RED);

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 36px sans-serif';
  ctx.fillText('VER MAIS DETALHES', descX + 100, lowerY + 68);

  // Subtitle / Descriptive Copy
  ctx.fillStyle = '#475569';
  ctx.font = '600 26px sans-serif';
  const ctaDescText1 = 'Acesse a ficha completa deste imóvel no portal Lopes Manaus com';
  const ctaDescText2 = 'fotos em alta resolução, vídeo tour, comodidades e localização no mapa.';
  ctx.fillText(ctaDescText1, descX + 45, lowerY + 125);
  ctx.fillText(ctaDescText2, descX + 45, lowerY + 165);

  // Highlight points
  ctx.fillStyle = LOPES_RED;
  ctx.font = '800 22px sans-serif';
  ctx.fillText('✦ Galeria Completa   •   ✦ Vídeo & Tour   •   ✦ Fale no WhatsApp', descX + 45, lowerY + 220);

  // Prominent CTA Button: "CLIQUE AQUI E VEJA MAIS"
  const btnX = descX + 45;
  const btnY = lowerY + 258;
  const btnW = descW - 90; // 975px
  const btnH = 92;

  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 16);
  ctx.fill();

  // Button text inside
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('👉 CLIQUE AQUI E VEJA MAIS', btnX + (btnW / 2), btnY + 56);
  ctx.textAlign = 'left';

  // Subtext under button
  ctx.fillStyle = '#64748B';
  ctx.font = '700 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`lopesmanaus.com.br/imovel/${prop.code}  •  Cód: ${prop.code}`, btnX + (btnW / 2), btnY + 130);
  ctx.textAlign = 'left';

  // =========================================================================
  // FOOTER ZONE (Dark Navy Bar across bottom)
  // =========================================================================
  const footerY = 1910;
  const footerH = 190;

  ctx.fillStyle = NAVY_DARK;
  ctx.fillRect(0, footerY, canvas.width, footerH);

  // Footer Logo Left
  drawLopesHeart(ctx, 80, footerY + 38, 65, LOPES_RED);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 48px sans-serif';
  ctx.fillText('Lopes', 160, footerY + 95);

  ctx.fillStyle = LOPES_RED;
  ctx.font = '800 24px sans-serif';
  ctx.fillText('MANAUS', 162, footerY + 128);

  // Footer Center Slogan Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 24px sans-serif';
  ctx.textAlign = 'center';

  const footerSlogan = 'LOPES MANAUS   •   ATENDIMENTO PERSONALIZADO   •   SEGURANÇA   •   EXPERIÊNCIA IMOBILIÁRIA';
  ctx.fillText(footerSlogan, 1580, footerY + 105);
  ctx.textAlign = 'left';

  // Footer Right Divider & Page Number
  ctx.fillStyle = '#334155';
  ctx.fillRect(2720, footerY + 35, 2, 120);

  const pageNumStr = (pageIndex + 2).toString().padStart(2, '0');
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(pageNumStr, 2810, footerY + 110);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/jpeg', 0.95);
}

export async function generateCatalogPDF(options: {
  title?: string;
  properties: Property[];
  captador: User;
  companySettings: CompanySettings;
  appUrl?: string;
  customCoverImage?: string;
  coverType?: 'VENDA' | 'LOCACAO' | 'GERAL';
  orientation?: 'portrait' | 'landscape';
}): Promise<jsPDF> {
  const { properties, captador, companySettings, customCoverImage } = options;
  const baseUrl = options.appUrl || window.location.origin;
  const effectivePhone = getEffectiveWhatsApp(captador, companySettings);

  // All catalogs are strictly A4 Landscape (Horizontal 297mm x 210mm)
  const isLandscape = true;

  // Create PDF Document in Landscape A4 mode
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Determine Cover Type
  let coverType: 'VENDA' | 'LOCACAO' | 'GERAL' = options.coverType || 'GERAL';
  if (!options.coverType) {
    const allVenda = properties.length > 0 && properties.every(p => p.purpose === 'Venda');
    const allLocacao = properties.length > 0 && properties.every(p => p.purpose === 'Locação');

    if (allVenda || (options.title && options.title.toLowerCase().includes('venda'))) {
      coverType = 'VENDA';
    } else if (allLocacao || (options.title && options.title.toLowerCase().includes('loca'))) {
      coverType = 'LOCACAO';
    }
  }

  // ==========================================
  // PÁGINA 1: CAPA OFICIAL DO ADMINISTRADOR (Horizontal 297mm x 210mm)
  // ==========================================
  try {
    const coverDataUrl = await renderAdminCoverImage(coverType, companySettings, customCoverImage);
    if (coverDataUrl) {
      doc.addImage(coverDataUrl, 'JPEG', 0, 0, 297, 210);
    }
  } catch (err) {
    console.warn('Error applying admin cover image to PDF:', err);
  }

  // ==========================================
  // PÁGINA 2 EM DIANTE: FICHAS DOS IMÓVEIS (1 imóvel por página A4 Horizontal)
  // ==========================================
  const totalPages = properties.length + 1;

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    doc.addPage();

    // Use pixel-perfect Horizontal Property Canvas matching luxury magazine layout
    const horizontalCanvasDataUrl = await renderHorizontalPropertyCanvas(prop, captador, companySettings, i, totalPages, baseUrl);
    doc.addImage(horizontalCanvasDataUrl, 'JPEG', 0, 0, 297, 210);

    // Active interactive PDF link overlay for WhatsApp
    const propertyPublicUrl = `${baseUrl}/imovel/${prop.code}`;
    const waMsg = `Olá ${captador.name}! Vi o imóvel "${prop.title}" (Cód: ${prop.code}) no seu catálogo Lopes e gostaria de mais informações.`;
    const whatsappDirectUrl = buildWhatsAppUrl(effectivePhone, waMsg);

    // Clickable link on the footer logo area for website/WhatsApp
    doc.link(10, 190, 80, 20, { url: whatsappDirectUrl });

    // Register active link covering the "VER MAIS DETALHES" box and "CLIQUE AQUI E VEJA MAIS" CTA button
    // Coordinates match descX = 1815, lowerY = 1240, descW = 1065, descH = 430 in mm
    doc.link(181.5, 124, 106.5, 43, { url: propertyPublicUrl });

    // Keep footer slogan area link as fallback
    doc.link(120, 190, 160, 20, { url: propertyPublicUrl });
  }

  return doc;
}
