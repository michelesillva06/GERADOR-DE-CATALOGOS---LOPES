import jsPDF from 'jspdf';
import { Property, User, CompanySettings } from '../types';
import { generateQRCodeDataUrl } from './qrCode';
import { buildWhatsAppUrl, formatPhoneDisplay, getEffectiveWhatsApp } from './whatsapp';

// Helper to convert image URL or Data URL to Base64 JPEG DataURL safely for jsPDF
async function urlToBase64(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 1200;
        canvas.height = img.naturalHeight || img.height || 1600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.90));
        } else {
          resolve(url);
        }
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => {
      // Retry without crossOrigin
      const imgFallback = new Image();
      imgFallback.onload = () => resolve(url);
      imgFallback.onerror = () => resolve(url);
      imgFallback.src = url;
    };
    img.src = url;
  });
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

/**
 * Generates an ultra high-resolution, pixel-perfect 1-piece cover page using HTML Canvas
 * that fills 100% of Page 1 in the PDF (210mm x 297mm full-bleed).
 * Matches the exact visual identity and layout of LOPES MANAUS catalog cover.
 */
export async function renderCoverCanvas(
  type: 'VENDA' | 'LOCACAO' | 'GERAL',
  companySettings?: CompanySettings
): Promise<string> {
  const canvas = document.createElement('canvas');
  // High resolution for 300 DPI print quality
  canvas.width = 2121;
  canvas.height = 3000;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Fill background pure white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const LOPES_RED = '#E50938';
  const LOPES_DARK_RED = '#B91C1C';
  const TEXT_DARK = '#0F172A';
  const TEXT_MUTED = '#475569';

  // ------------------------------------------------------------------------
  // 2. TOP HEADER LOGO & TOP-RIGHT CURVE ACCENT
  // ------------------------------------------------------------------------
  // Top-Right Swooping Red Accent Curve
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.moveTo(1250, 0);
  ctx.bezierCurveTo(1550, 60, 1850, 200, 2121, 450);
  ctx.lineTo(2121, 0);
  ctx.closePath();
  ctx.fill();

  // CRECI Badge (Top Right inside white area)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`CRECI: ${companySettings?.creci_j || '540-J/AM'}`, 2070, 90);
  ctx.textAlign = 'left';

  // Logo (Top-Left)
  drawLopesHeart(ctx, 110, 110, 130, LOPES_RED);

  // "LOPES" Text
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 128px sans-serif';
  ctx.fillText('LOPES', 260, 185);

  // "MANAUS" Text
  ctx.fillStyle = LOPES_RED;
  ctx.font = '800 82px sans-serif';
  ctx.fillText('MANAUS', 262, 270);

  // Red accent line under "MANAUS"
  ctx.fillStyle = LOPES_RED;
  ctx.fillRect(110, 310, 250, 10);

  // ------------------------------------------------------------------------
  // 3. RIGHT SIDE PHOTO FRAME & BADGE (Manaus Skyline Sunset River)
  // ------------------------------------------------------------------------
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(1120, 0);
  ctx.bezierCurveTo(900, 420, 900, 950, 1300, 1380);
  ctx.bezierCurveTo(1600, 1680, 1920, 1750, 2121, 1800);
  ctx.lineTo(2121, 0);
  ctx.closePath();
  ctx.clip();

  // Sunset sky backdrop gradient
  const skyGrad = ctx.createLinearGradient(1000, 0, 2121, 1800);
  skyGrad.addColorStop(0, '#0F172A');
  skyGrad.addColorStop(0.2, '#1E1B4B');
  skyGrad.addColorStop(0.45, '#7C2D12');
  skyGrad.addColorStop(0.7, '#C2410C');
  skyGrad.addColorStop(0.88, '#EA580C');
  skyGrad.addColorStop(1, '#FBBF24');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(900, 0, 1221, 1800);

  // River water reflection gradient
  const waterGrad = ctx.createLinearGradient(900, 700, 2121, 1800);
  waterGrad.addColorStop(0, '#0F172A');
  waterGrad.addColorStop(0.6, '#0369A1');
  waterGrad.addColorStop(0.9, '#D97706');
  waterGrad.addColorStop(1, '#F59E0B');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(900, 600, 1221, 1200);

  // Buildings & City Silhouette
  ctx.fillStyle = '#0F172A';
  const bldgs = [
    { x: 1100, w: 65, h: 380 },
    { x: 1180, w: 80, h: 520 },
    { x: 1275, w: 70, h: 440 },
    { x: 1360, w: 90, h: 620 },
    { x: 1465, w: 80, h: 540 },
    { x: 1560, w: 105, h: 680 },
    { x: 1680, w: 95, h: 580 },
    { x: 1790, w: 120, h: 720 },
    { x: 1920, w: 110, h: 630 },
    { x: 2040, w: 80, h: 760 },
  ];
  bldgs.forEach(b => {
    ctx.fillRect(b.x, 950 - b.h, b.w, b.h);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
    for (let wy = 980 - b.h; wy < 920; wy += 40) {
      for (let wx = b.x + 12; wx < b.x + b.w - 14; wx += 20) {
        ctx.fillRect(wx, wy, 10, 16);
      }
    }
    ctx.fillStyle = '#0F172A';
  });

  // Cable-stayed bridge silhouette
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(1050, 780);
  ctx.lineTo(2121, 730);
  ctx.stroke();

  // Cable stays
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  const towerX = 1750, towerY = 480;
  ctx.beginPath();
  ctx.moveTo(towerX, towerY);
  ctx.lineTo(towerX, 780);
  ctx.stroke();
  for (let cx = 1450; cx <= 2050; cx += 40) {
    ctx.beginPath();
    ctx.moveTo(towerX, towerY + 30);
    ctx.lineTo(cx, 740);
    ctx.stroke();
  }

  ctx.restore(); // end clip

  // Red Accent Line outlining the photo curve border
  ctx.strokeStyle = LOPES_RED;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(1120, 0);
  ctx.bezierCurveTo(900, 420, 900, 950, 1300, 1380);
  ctx.bezierCurveTo(1600, 1680, 1920, 1750, 2121, 1800);
  ctx.stroke();

  // Circular Badge with House & Key emblem (x=1480, y=1480)
  const badgeX = 1480;
  const badgeY = 1480;
  const badgeR = 170;

  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR - 18, 0, Math.PI * 2);
  ctx.stroke();

  // White Line-Art House + Key Icon inside emblem
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // House Roof
  ctx.beginPath();
  ctx.moveTo(badgeX - 80, badgeY - 15);
  ctx.lineTo(badgeX, badgeY - 80);
  ctx.lineTo(badgeX + 80, badgeY - 15);
  ctx.stroke();

  // House Frame
  ctx.beginPath();
  ctx.moveTo(badgeX - 60, badgeY - 20);
  ctx.lineTo(badgeX - 60, badgeY + 65);
  ctx.lineTo(badgeX + 60, badgeY + 65);
  ctx.lineTo(badgeX + 60, badgeY - 20);
  ctx.stroke();

  // Key inside
  ctx.beginPath();
  ctx.arc(badgeX - 15, badgeY + 20, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(badgeX, badgeY + 30);
  ctx.lineTo(badgeX + 38, badgeY - 8);
  ctx.lineTo(badgeX + 30, badgeY - 16);
  ctx.moveTo(badgeX + 28, badgeY + 4);
  ctx.lineTo(badgeX + 36, badgeY - 4);
  ctx.stroke();

  // ------------------------------------------------------------------------
  // 4. MAIN TITLE SECTION (LEFT SIDE)
  // ------------------------------------------------------------------------
  const tx = 130;
  let ty = 640;

  // "CATÁLOGO DE"
  ctx.fillStyle = '#334155';
  ctx.font = '600 82px sans-serif';
  ctx.fillText('CATÁLOGO DE', tx, ty);
  ty += 160;

  // "IMÓVEIS"
  ctx.fillStyle = LOPES_RED;
  ctx.font = '900 200px sans-serif';
  ctx.fillText('IMÓVEIS', tx, ty);
  ty += 40;

  // Banner Box for "PARA LOCAÇÃO" / "PARA VENDA"
  let bannerLabel = 'PARA LOCAÇÃO';
  let bannerWidth = 920;

  if (type === 'VENDA') {
    bannerLabel = 'PARA VENDA';
    bannerWidth = 840;
  } else if (type === 'GERAL') {
    bannerLabel = 'TODOS OS IMÓVEIS';
    bannerWidth = 980;
  }

  // Draw Red Banner Box
  ctx.fillStyle = LOPES_RED;
  const bannerH = 135;
  ctx.beginPath();
  ctx.roundRect(tx, ty, bannerWidth, bannerH, 16);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 86px sans-serif';
  ctx.fillText(bannerLabel, tx + 40, ty + 98);

  ty += bannerH + 90;

  // Subtitle
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '600 70px sans-serif';
  ctx.fillText('O seu próximo imóvel', tx, ty);
  ty += 85;

  ctx.fillStyle = LOPES_RED;
  ctx.font = '900 78px sans-serif';
  ctx.fillText('está aqui.', tx, ty);
  ty += 110;

  // Body Text Paragraph
  if (type === 'LOCACAO') {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 52px sans-serif';
    ctx.fillText('Conheça todas as oportunidades', tx, ty);
    ty += 70;

    ctx.fillText('para ', tx, ty);
    ctx.fillStyle = LOPES_RED;
    ctx.font = '800 52px sans-serif';
    ctx.fillText('alugar', tx + 120, ty);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 52px sans-serif';
    ctx.fillText(' com a segurança', tx + 280, ty);
    ty += 70;

    ctx.fillText('e praticidade da ', tx, ty);
    ctx.fillStyle = TEXT_DARK;
    ctx.font = '800 52px sans-serif';
    ctx.fillText('LOPES MANAUS.', tx + 390, ty);
    ty += 60;
  } else if (type === 'VENDA') {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 52px sans-serif';
    ctx.fillText('Os melhores imóveis para ', tx, ty);
    ctx.fillStyle = LOPES_RED;
    ctx.font = '800 52px sans-serif';
    ctx.fillText('investir,', tx + 630, ty);
    ty += 70;

    ctx.fillText('realizar', tx, ty);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 52px sans-serif';
    ctx.fillText(' e ', tx + 180, ty);
    ctx.fillStyle = LOPES_RED;
    ctx.font = '800 52px sans-serif';
    ctx.fillText('viver', tx + 240, ty);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 52px sans-serif';
    ctx.fillText(' grandes conquistas.', tx + 370, ty);
    ty += 60;
  } else {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 52px sans-serif';
    ctx.fillText('Conheça todas as oportunidades', tx, ty);
    ty += 70;
    ctx.fillText('para ', tx, ty);
    ctx.fillStyle = LOPES_RED;
    ctx.font = '800 52px sans-serif';
    ctx.fillText('comprar, vender ou alugar', tx + 120, ty);
    ty += 70;
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 52px sans-serif';
    ctx.fillText('com a segurança da ', tx, ty);
    ctx.fillStyle = TEXT_DARK;
    ctx.font = '800 52px sans-serif';
    ctx.fillText('LOPES MANAUS.', tx + 490, ty);
    ty += 60;
  }

  // Accent horizontal bar under paragraph
  ctx.fillStyle = LOPES_RED;
  ctx.fillRect(tx, ty + 15, 320, 10);

  // ------------------------------------------------------------------------
  // 5. CATEGORIES SECTION (MIDDLE SECTION)
  // ------------------------------------------------------------------------
  const catSectionY = 1840;

  // Red line on left and right, centered title
  ctx.fillStyle = LOPES_RED;
  ctx.fillRect(130, catSectionY, 480, 5);
  ctx.fillRect(1511, catSectionY, 480, 5);

  ctx.fillStyle = LOPES_RED;
  ctx.font = '800 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NOSSAS CATEGORIAS DE IMÓVEIS', 1060, catSectionY + 15);
  ctx.textAlign = 'left';

  const categoriesData = [
    { title: 'APARTAMENTOS', desc: 'Diversos padrões\ne localizações' },
    { title: 'CASAS', desc: 'Térreas, duplex\ne em condomínio' },
    { title: 'SALAS COMERCIAIS', desc: 'Espaços para seu\nnegócio crescer' },
    { title: 'CONDOMÍNIOS', desc: 'Segurança e lazer\npara sua família' },
    { title: 'KITNETS E STUDIOS', desc: 'Práticos e ideais\npara o dia a dia' },
    { title: 'IMÓVEIS COMERCIAIS', desc: 'Lojas, pontos e\noutros espaços' },
  ];

  const catColW = 280;
  const catStartX = 130;
  const catStartY = catSectionY + 65;

  categoriesData.forEach((cat, idx) => {
    const cx = catStartX + (idx * 312);
    const cy = catStartY;

    // Vertical divider lines
    if (idx > 0) {
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy + 15);
      ctx.lineTo(cx - 16, cy + 280);
      ctx.stroke();
    }

    // Vector Icon
    ctx.strokeStyle = LOPES_RED;
    ctx.fillStyle = LOPES_RED;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const icx = cx + (catColW / 2);
    const icy = cy + 55;

    if (idx === 0) {
      ctx.beginPath();
      ctx.strokeRect(icx - 35, icy - 38, 48, 76);
      ctx.strokeRect(icx + 13, icy - 15, 26, 53);
      ctx.fillRect(icx - 26, icy - 26, 12, 12);
      ctx.fillRect(icx - 8, icy - 26, 12, 12);
      ctx.fillRect(icx - 26, icy - 5, 12, 12);
      ctx.fillRect(icx - 8, icy - 5, 12, 12);
    } else if (idx === 1) {
      ctx.beginPath();
      ctx.moveTo(icx - 42, icy);
      ctx.lineTo(icx, icy - 38);
      ctx.lineTo(icx + 42, icy);
      ctx.stroke();
      ctx.strokeRect(icx - 30, icy, 60, 38);
      ctx.strokeRect(icx - 12, icy + 12, 24, 26);
    } else if (idx === 2) {
      ctx.beginPath();
      ctx.strokeRect(icx - 32, icy - 40, 64, 80);
      ctx.fillRect(icx - 20, icy - 28, 15, 15);
      ctx.fillRect(icx + 5, icy - 28, 15, 15);
      ctx.fillRect(icx - 20, icy - 5, 15, 15);
      ctx.fillRect(icx + 5, icy - 5, 15, 15);
    } else if (idx === 3) {
      ctx.beginPath();
      ctx.moveTo(icx - 32, icy - 8);
      ctx.lineTo(icx - 8, icy - 32);
      ctx.lineTo(icx + 16, icy - 8);
      ctx.stroke();
      ctx.strokeRect(icx - 26, icy - 8, 36, 42);
      ctx.beginPath();
      ctx.moveTo(icx + 18, icy + 34);
      ctx.lineTo(icx + 42, icy + 34);
      ctx.moveTo(icx + 24, icy + 14);
      ctx.lineTo(icx + 24, icy + 34);
      ctx.moveTo(icx + 36, icy + 14);
      ctx.lineTo(icx + 36, icy + 34);
      ctx.stroke();
    } else if (idx === 4) {
      ctx.beginPath();
      ctx.strokeRect(icx - 38, icy, 60, 32);
      ctx.moveTo(icx - 30, icy - 20);
      ctx.lineTo(icx + 12, icy - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(icx + 32, icy - 36);
      ctx.lineTo(icx + 24, icy - 15);
      ctx.lineTo(icx + 40, icy - 15);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(icx + 32, icy - 15);
      ctx.lineTo(icx + 32, icy + 32);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.strokeRect(icx - 36, icy - 6, 72, 42);
      ctx.moveTo(icx - 38, icy - 6);
      ctx.lineTo(icx - 38, icy - 30);
      ctx.lineTo(icx + 38, icy - 30);
      ctx.lineTo(icx + 38, icy - 6);
      ctx.stroke();
      ctx.strokeRect(icx - 18, icy + 10, 36, 26);
    }

    // Title
    ctx.fillStyle = TEXT_DARK;
    ctx.font = '800 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cat.title, icx, cy + 150);

    // Subtitle
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '400 23px sans-serif';
    const splitDesc = cat.desc.split('\n');
    ctx.fillText(splitDesc[0], icx, cy + 200);
    if (splitDesc[1]) {
      ctx.fillText(splitDesc[1], icx, cy + 235);
    }
    ctx.textAlign = 'left';
  });

  // ------------------------------------------------------------------------
  // 6. BOTTOM DEEP RED FOOTER BAR
  // ------------------------------------------------------------------------
  const footerY = 2430;
  const footerH = 570;

  ctx.fillStyle = LOPES_DARK_RED;
  ctx.fillRect(0, footerY, canvas.width, footerH);

  const pillars = [
    { title: 'SEGURANÇA', desc: 'Transparência e confiança\nem cada negociação.' },
    { title: 'ATENDIMENTO', desc: 'Atendimento personalizado\nem todas as etapas.' },
    { title: 'EXPERIÊNCIA', desc: 'Tradição e credibilidade\nno mercado imobiliário.' },
    { title: 'ATUAÇÃO EM MANAUS', desc: 'Conhecemos a cidade\ne os melhores bairros.' },
  ];

  const pillarW = 460;
  const pillarStartX = 80;

  pillars.forEach((p, i) => {
    const px = pillarStartX + (i * 500);
    const py = footerY + 85;

    // Vertical dividing lines
    if (i > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px - 20, py);
      ctx.lineTo(px - 20, py + 340);
      ctx.stroke();
    }

    const icx = px + (pillarW / 2);
    const icy = py + 60;

    // Circle Badge Outline
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(icx, icy, 60, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (i === 0) {
      ctx.beginPath();
      ctx.moveTo(icx - 24, icy - 26);
      ctx.lineTo(icx + 24, icy - 26);
      ctx.lineTo(icx + 24, icy + 6);
      ctx.bezierCurveTo(icx + 24, icy + 26, icx, icy + 36, icx, icy + 36);
      ctx.bezierCurveTo(icx, icy + 36, icx - 24, icy + 26, icx - 24, icy + 6);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(icx - 12, icy + 2);
      ctx.lineTo(icx - 3, icy + 11);
      ctx.lineTo(icx + 12, icy - 7);
      ctx.stroke();
    } else if (i === 1) {
      ctx.beginPath();
      ctx.arc(icx - 12, icy - 12, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(icx + 12, icy - 12, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(icx, icy + 24, 26, Math.PI, Math.PI * 2);
      ctx.stroke();
    } else if (i === 2) {
      ctx.beginPath();
      ctx.arc(icx, icy - 10, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(icx - 15, icy + 16);
      ctx.lineTo(icx - 22, icy + 38);
      ctx.lineTo(icx - 6, icy + 30);
      ctx.lineTo(icx + 6, icy + 30);
      ctx.lineTo(icx + 22, icy + 38);
      ctx.lineTo(icx + 15, icy + 16);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(icx, icy - 12, 18, Math.PI * 0.85, Math.PI * 0.15);
      ctx.lineTo(icx, icy + 28);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(icx, icy - 12, 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.title, icx, py + 185);

    // Subtitle
    ctx.fillStyle = '#FEE2E2';
    ctx.font = '400 27px sans-serif';
    const splitDesc = p.desc.split('\n');
    ctx.fillText(splitDesc[0], icx, py + 240);
    if (splitDesc[1]) {
      ctx.fillText(splitDesc[1], icx, py + 280);
    }
    ctx.textAlign = 'left';
  });

  return canvas.toDataURL('image/jpeg', 0.95);
}

export async function renderHorizontalCoverCanvas(
  type: 'VENDA' | 'LOCACAO' | 'GERAL',
  companySettings?: CompanySettings
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 2970;
  canvas.height = 2100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const LOPES_RED = '#E50938';
  const LOPES_DARK_RED = '#B91C1C';
  const TEXT_DARK = '#0F172A';
  const TEXT_MUTED = '#475569';

  // 1. Pure white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Top-Right Red Accent Curve
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.moveTo(1800, 0);
  ctx.bezierCurveTo(2200, 80, 2600, 240, 2970, 500);
  ctx.lineTo(2970, 0);
  ctx.closePath();
  ctx.fill();

  // CRECI Badge (Top Right)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`CRECI: ${companySettings?.creci_j || '540-J/AM'}`, 2920, 85);
  ctx.textAlign = 'left';

  // Logo (Top Left)
  drawLopesHeart(ctx, 90, 90, 110, LOPES_RED);

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 96px sans-serif';
  ctx.fillText('LOPES', 220, 160);

  ctx.fillStyle = LOPES_RED;
  ctx.font = '800 64px sans-serif';
  ctx.fillText('MANAUS', 222, 230);

  ctx.fillStyle = LOPES_RED;
  ctx.fillRect(90, 265, 210, 8);

  // 3. Right Side Photo Area
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(1500, 0);
  ctx.bezierCurveTo(1250, 450, 1250, 1050, 1750, 1500);
  ctx.bezierCurveTo(2150, 1850, 2600, 1950, 2970, 2000);
  ctx.lineTo(2970, 0);
  ctx.closePath();
  ctx.clip();

  const skyGrad = ctx.createLinearGradient(1400, 0, 2970, 2100);
  skyGrad.addColorStop(0, '#0F172A');
  skyGrad.addColorStop(0.3, '#1E1B4B');
  skyGrad.addColorStop(0.6, '#7C2D12');
  skyGrad.addColorStop(0.85, '#EA580C');
  skyGrad.addColorStop(1, '#FBBF24');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(1200, 0, 1770, 2100);

  // City Skyline
  ctx.fillStyle = '#0F172A';
  const bldgs = [
    { x: 1400, w: 80, h: 450 },
    { x: 1500, w: 100, h: 620 },
    { x: 1620, w: 90, h: 540 },
    { x: 1730, w: 110, h: 720 },
    { x: 1860, w: 95, h: 650 },
    { x: 1970, w: 130, h: 780 },
    { x: 2120, w: 110, h: 690 },
    { x: 2250, w: 140, h: 840 },
    { x: 2410, w: 120, h: 750 },
    { x: 2550, w: 160, h: 890 },
  ];
  bldgs.forEach(b => {
    ctx.fillRect(b.x, 1200 - b.h, b.w, b.h);
  });
  ctx.restore();

  ctx.strokeStyle = LOPES_RED;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(1500, 0);
  ctx.bezierCurveTo(1250, 450, 1250, 1050, 1750, 1500);
  ctx.bezierCurveTo(2150, 1850, 2600, 1950, 2970, 2000);
  ctx.stroke();

  // 4. Left Content Text
  const tx = 110;
  let ty = 440;

  ctx.fillStyle = '#334155';
  ctx.font = '600 72px sans-serif';
  ctx.fillText('CATÁLOGO DE', tx, ty);
  ty += 130;

  ctx.fillStyle = LOPES_RED;
  ctx.font = '900 160px sans-serif';
  ctx.fillText('IMÓVEIS', tx, ty);
  ty += 40;

  let bannerLabel = 'TODOS OS IMÓVEIS';
  let bannerWidth = 840;
  if (type === 'VENDA') {
    bannerLabel = 'PARA VENDA';
    bannerWidth = 720;
  } else if (type === 'LOCACAO') {
    bannerLabel = 'PARA LOCAÇÃO';
    bannerWidth = 780;
  }

  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(tx, ty, bannerWidth, 110, 16);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 70px sans-serif';
  ctx.fillText(bannerLabel, tx + 35, ty + 80);
  ty += 180;

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '600 56px sans-serif';
  ctx.fillText('O seu próximo imóvel está aqui.', tx, ty);
  ty += 80;

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 40px sans-serif';
  ctx.fillText('Conheça as melhores oportunidades de Manaus e Região', tx, ty);

  // Bottom Deep Red Footer
  const footerY = 1680;
  ctx.fillStyle = LOPES_DARK_RED;
  ctx.fillRect(0, footerY, canvas.width, 420);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LOPES MANAUS • EXCELÊNCIA E TRADIÇÃO NO MERCADO IMOBILIÁRIO', 1485, footerY + 140);

  ctx.fillStyle = '#FEE2E2';
  ctx.font = '400 30px sans-serif';
  ctx.fillText(`Atendimento com ${companySettings?.company_name || 'Lopes Manaus'} • Telefone/WhatsApp: ${companySettings?.whatsapp || '(92) 3182-5500'}`, 1485, footerY + 230);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/jpeg', 0.95);
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
  totalPages: number = 1
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

  // Red Badge: "VENDA" or "LOCAÇÃO"
  const badgeW = 220;
  const badgeH = 72;
  const badgeText = prop.purpose === 'Locação' ? 'LOCAÇÃO' : 'VENDA';

  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(mainImgX, mainImgY, badgeW, badgeH, [16, 0, 16, 0]);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 34px sans-serif';
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
  const cardH = 225;
  const gapX = 35;
  const gapY = 30;

  const priceFormatted = prop.purpose.includes('Locação') && prop.rent_price
    ? `R$ ${prop.rent_price.toLocaleString('pt-BR')},00`
    : `R$ ${prop.price.toLocaleString('pt-BR')},00`;

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
      label: 'VALOR',
      value: priceFormatted,
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
    ctx.fillText(card.label, cx + 90, cy + 52);

    // Card Value
    if (card.isPrice) {
      ctx.fillStyle = LOPES_RED;
      ctx.font = '900 40px sans-serif';
      ctx.fillText(card.value, cx + 90, cy + 115);
    } else {
      ctx.fillStyle = TEXT_DARK;
      ctx.font = '800 30px sans-serif';
      const lines = card.value.split('\n');
      if (lines.length === 1) {
        ctx.fillText(lines[0], cx + 90, cy + 110);
      } else {
        ctx.fillText(lines[0], cx + 90, cy + 98);
        ctx.font = '600 26px sans-serif';
        ctx.fillText(lines[1], cx + 90, cy + 132);
      }
    }
  });

  // =========================================================================
  // LOWER GALLERY & DESCRIPTION ROW
  // =========================================================================
  const lowerY = 1240;

  // Gallery (4 photos on bottom left)
  const galX = 90;
  const photoW = 395;
  const photoH = 410;
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

  // Description Box ("SOBRE O IMÓVEL") on bottom right
  const descX = 1835;
  const descW = 1015;
  const descH = 410;

  // Box Background
  ctx.fillStyle = BG_LIGHT;
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(descX, lowerY, descW, descH, 16);
  ctx.fill();
  ctx.stroke();

  // Red Left Border Accent
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(descX, lowerY, 8, descH, [16, 0, 0, 16]);
  ctx.fill();

  // Header inside Box: House icon + "SOBRE O IMÓVEL"
  const descHeaderX = descX + 45;
  const descHeaderY = lowerY + 60;

  ctx.strokeStyle = LOPES_RED;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(descHeaderX, descHeaderY - 5);
  ctx.lineTo(descHeaderX + 16, descHeaderY - 22);
  ctx.lineTo(descHeaderX + 32, descHeaderY - 5);
  ctx.stroke();
  ctx.strokeRect(descHeaderX + 5, descHeaderY - 5, 22, 18);

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 36px sans-serif';
  ctx.fillText('SOBRE O IMÓVEL', descHeaderX + 48, descHeaderY + 8);

  // Description Paragraph Text
  const defaultDesc = `Imóvel de alto padrão com excelente projeto arquitetônico e acabamento impecável. Projetado para oferecer conforto, segurança e funcionalidade para toda a família. Ambientes amplos e integrados, excelente iluminação natural e localização privilegiada no bairro ${prop.neighborhood || 'Parque 10'}, próximo a escolas, supermercados, serviços e vias principais de Manaus.`;
  
  const rawDesc = prop.description && prop.description.trim().length > 30 ? prop.description : defaultDesc;
  
  ctx.fillStyle = '#334155';
  ctx.font = '600 30px sans-serif';
  
  const descWords = rawDesc.split(' ');
  let line = '';
  let lineY = descHeaderY + 68;
  let lineCount = 0;

  for (let n = 0; n < descWords.length; n++) {
    const testLine = line + descWords[n] + ' ';
    if (ctx.measureText(testLine).width > (descW - 90) && n > 0) {
      ctx.fillText(line.trim(), descHeaderX, lineY);
      line = descWords[n] + ' ';
      lineY += 46;
      lineCount++;
      if (lineCount >= 7) {
        ctx.fillText(line.trim() + '...', descHeaderX, lineY);
        break;
      }
    } else {
      line = testLine;
    }
  }
  if (lineCount < 7 && line.trim()) {
    ctx.fillText(line.trim(), descHeaderX, lineY);
  }

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
  // PÁGINA 1: CAPA OFICIAL DO CATÁLOGO (Horizontal)
  // ==========================================
  let selectedCoverUrl = customCoverImage;

  if (!selectedCoverUrl) {
    if (coverType === 'LOCACAO') {
      selectedCoverUrl = companySettings?.cover_locacao_url || companySettings?.cover_horizontal_url || companySettings?.cover_geral_url || companySettings?.cover_venda_url;
    } else if (coverType === 'VENDA') {
      selectedCoverUrl = companySettings?.cover_venda_url || companySettings?.cover_horizontal_url || companySettings?.cover_geral_url || companySettings?.cover_locacao_url;
    } else {
      selectedCoverUrl = companySettings?.cover_horizontal_url || companySettings?.cover_geral_url || companySettings?.cover_venda_url || companySettings?.cover_locacao_url;
    }
  }

  let coverDataUrl = '';
  if (selectedCoverUrl) {
    coverDataUrl = await urlToBase64(selectedCoverUrl);
  }

  if (!coverDataUrl) {
    coverDataUrl = await renderHorizontalCoverCanvas(coverType, companySettings);
  }

  if (coverDataUrl) {
    try {
      doc.addImage(coverDataUrl, 'JPEG', 0, 0, 297, 210);
    } catch (err) {
      console.warn('Error applying cover image to PDF:', err);
      const defaultCanvas = await renderHorizontalCoverCanvas(coverType, companySettings);
      doc.addImage(defaultCanvas, 'JPEG', 0, 0, 297, 210);
    }
  }

  // ==========================================
  // PÁGINA 2 EM DIANTE: FICHAS DOS IMÓVEIS (1 imóvel por página A4 Horizontal)
  // ==========================================
  const totalPages = properties.length + 1;

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    doc.addPage();

    // Use pixel-perfect Horizontal Property Canvas matching luxury magazine layout
    const horizontalCanvasDataUrl = await renderHorizontalPropertyCanvas(prop, captador, companySettings, i, totalPages);
    doc.addImage(horizontalCanvasDataUrl, 'JPEG', 0, 0, 297, 210);

    // Active interactive PDF link overlay for WhatsApp
    const propertyPublicUrl = `${baseUrl}/imovel/${prop.code}`;
    const waMsg = `Olá ${captador.name}! Vi o imóvel "${prop.title}" (Cód: ${prop.code}) no seu catálogo Lopes e gostaria de mais informações.`;
    const whatsappDirectUrl = buildWhatsAppUrl(effectivePhone, waMsg);

    // Clickable link on the footer logo area for website/WhatsApp
    doc.link(10, 190, 80, 20, { url: whatsappDirectUrl });
    doc.link(120, 190, 160, 20, { url: propertyPublicUrl });
  }

  return doc;
}
