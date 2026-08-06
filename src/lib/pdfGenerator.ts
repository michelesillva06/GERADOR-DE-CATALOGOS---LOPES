import jsPDF from 'jspdf';
import { Property, User, CompanySettings } from '../types';
import { generateQRCodeDataUrl } from './qrCode';
import { buildWhatsAppUrl, formatPhoneDisplay, getEffectiveWhatsApp } from './whatsapp';

// Helper to convert image URL or Data URL to Base64 JPEG DataURL safely for jsPDF
async function urlToBase64(url: string): Promise<string> {
  if (!url) return '';
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 1200;
        canvas.height = img.height || 1600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.90));
        } else {
          resolve(url.startsWith('data:') ? url : '');
        }
      } catch {
        resolve(url.startsWith('data:') ? url : '');
      }
    };
    img.onerror = () => resolve(url.startsWith('data:') ? url : '');
    img.src = url;
  });
}

function formatCurrency(val: number): string {
  if (!val || val === 0) return 'Sob Consulta';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
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
  // Lopes Red Heart Symbol
  ctx.save();
  ctx.translate(170, 160);
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  // Left heart lobe
  ctx.arc(-22, -18, 32, Math.PI * 0.7, Math.PI * 1.85);
  // Right heart lobe
  ctx.arc(22, -18, 32, Math.PI * 1.15, Math.PI * 0.3);
  ctx.lineTo(0, 48);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // "LOPES" Text
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 128px sans-serif';
  ctx.fillText('LOPES', 270, 185);

  // "MANAUS" Text
  ctx.fillStyle = LOPES_RED;
  ctx.font = '800 82px sans-serif';
  ctx.fillText('MANAUS', 272, 270);

  // Red accent line under "MANAUS"
  ctx.fillStyle = LOPES_RED;
  ctx.fillRect(120, 310, 240, 10);

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
  ctx.save();
  ctx.translate(140, 140);
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.arc(-20, -16, 28, Math.PI * 0.7, Math.PI * 1.85);
  ctx.arc(20, -16, 28, Math.PI * 1.15, Math.PI * 0.3);
  ctx.lineTo(0, 42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 96px sans-serif';
  ctx.fillText('LOPES', 230, 160);

  ctx.fillStyle = LOPES_RED;
  ctx.font = '800 64px sans-serif';
  ctx.fillText('MANAUS', 232, 230);

  ctx.fillStyle = LOPES_RED;
  ctx.fillRect(100, 265, 200, 8);

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

function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
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
 * Renders a 100% pixel-perfect HORIZONTAL / LANDSCAPE property catalog page (2970px x 2100px)
 * exactly matching the layout in the user's uploaded reference image.
 */
export async function renderHorizontalPropertyCanvas(
  prop: Property,
  captador: User,
  companySettings: CompanySettings
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

  // 1. White Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Load photos asynchronously
  const allImgs = prop.images && prop.images.length > 0 ? prop.images : [prop.main_image];
  const mainImgUrl = prop.main_image || allImgs[0] || '';
  const thumb1Url = allImgs[1] || allImgs[0] || mainImgUrl;
  const thumb2Url = allImgs[2] || allImgs[1] || mainImgUrl;
  const thumb3Url = allImgs[3] || allImgs[0] || mainImgUrl;

  const [mainImg, thumb1, thumb2, thumb3] = await Promise.all([
    loadImageElement(mainImgUrl),
    loadImageElement(thumb1Url),
    loadImageElement(thumb2Url),
    loadImageElement(thumb3Url)
  ]);

  // =========================================================================
  // TOP HEADER (Logo + Slogan Ribbon)
  // =========================================================================
  // Logo Heart
  ctx.save();
  ctx.translate(110, 85);
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.arc(-16, -12, 22, Math.PI * 0.7, Math.PI * 1.85);
  ctx.arc(16, -12, 22, Math.PI * 1.15, Math.PI * 0.3);
  ctx.lineTo(0, 32);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // "LOPES MANAUS" Text
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 60px sans-serif';
  ctx.fillText('LOPES', 180, 95);

  ctx.fillStyle = LOPES_RED;
  ctx.font = '800 42px sans-serif';
  ctx.fillText('MANAUS', 182, 140);

  // Header Divider Line
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(450, 55, 3, 95);

  // Slogan subtext left
  ctx.fillStyle = '#475569';
  ctx.font = '700 22px sans-serif';
  ctx.fillText('CONFIANÇA QUE CONECTA', 475, 90);
  ctx.fillText('VOCÊ AO SEU NOVO IMÓVEL', 475, 122);

  // Top Right Curved Red Banner Ribbon
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.moveTo(1950, 0);
  ctx.bezierCurveTo(2200, 30, 2500, 110, 2970, 150);
  ctx.lineTo(2970, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 32px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Mais que imóveis, realizamos sonhos.', 2920, 68);
  ctx.fillRect(2400, 85, 520, 4);
  ctx.textAlign = 'left';

  // =========================================================================
  // LEFT COLUMN (Main Photo, 3 Thumbnails, "Sobre o condomínio")
  // =========================================================================
  const leftX = 90;
  const leftW = 1320;

  // Main Image (Large)
  drawRoundedImage(ctx, mainImg, leftX, 180, leftW, 730, 28, 'Foto Principal do Imóvel');

  // Location Badge Pill on Main Image Top Left
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.beginPath();
  ctx.roundRect(leftX + 35, 215, 300, 64, 32);
  ctx.fill();

  // Map pin icon inside pill
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(leftX + 70, 247, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 24px sans-serif';
  ctx.fillText(`${prop.city || 'Manaus'} / ${prop.state || 'AM'}`, leftX + 95, 255);

  // 3 Thumbnails below Main Image
  const thumbY = 935;
  const thumbW = 420;
  const thumbH = 260;
  const thumbGap = 30;

  drawRoundedImage(ctx, thumb1, leftX, thumbY, thumbW, thumbH, 22, 'Foto 2');
  drawRoundedImage(ctx, thumb2, leftX + thumbW + thumbGap, thumbY, thumbW, thumbH, 22, 'Foto 3');
  drawRoundedImage(ctx, thumb3, leftX + (thumbW + thumbGap) * 2, thumbY, thumbW, thumbH, 22, 'Foto 4');

  // "Sobre o condomínio" / "Sobre o empreendimento"
  const condoY = 1225;
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 42px sans-serif';
  ctx.fillText('Sobre o condomínio', leftX, condoY + 40);

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 25px sans-serif';
  ctx.fillText('Infraestrutura completa para o seu bem-estar e o da sua família, com segurança 24 horas.', leftX, condoY + 80);

  // 5 Outlined Cards with Red Line Art Icons
  const iconY = condoY + 110;
  const iconW = 240;
  const iconH = 155;
  const iconGap = 30;

  const condoAmenities = [
    { title: 'Piscina\nadulto e infantil', icon: 'pool' },
    { title: 'Academia\nequipada', icon: 'gym' },
    { title: 'Playground', icon: 'play' },
    { title: 'Espaço\ngourmet', icon: 'gourmet' },
    { title: 'Salão\nde festas', icon: 'party' }
  ];

  condoAmenities.forEach((item, idx) => {
    const cx = leftX + (idx * (iconW + iconGap));
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FECDD3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cx, iconY, iconW, iconH, 22);
    ctx.fill();
    ctx.stroke();

    // Red vector icon
    const icx = cx + (iconW / 2);
    const icy = iconY + 52;

    ctx.strokeStyle = LOPES_RED;
    ctx.fillStyle = LOPES_RED;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (item.icon === 'pool') {
      ctx.beginPath();
      ctx.arc(icx - 15, icy - 15, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(icx - 40, icy + 15);
      ctx.bezierCurveTo(icx - 20, icy + 5, icx - 10, icy + 25, icx + 10, icy + 15);
      ctx.bezierCurveTo(icx + 25, icy + 5, icx + 35, icy + 25, icx + 45, icy + 15);
      ctx.stroke();
    } else if (item.icon === 'gym') {
      ctx.beginPath();
      ctx.strokeRect(icx - 35, icy - 18, 12, 36);
      ctx.strokeRect(icx + 23, icy - 18, 12, 36);
      ctx.moveTo(icx - 23, icy);
      ctx.lineTo(icx + 23, icy);
      ctx.stroke();
    } else if (item.icon === 'play') {
      ctx.beginPath();
      ctx.moveTo(icx - 30, icy + 20);
      ctx.lineTo(icx, icy - 25);
      ctx.lineTo(icx + 30, icy + 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(icx - 15, icy + 20);
      ctx.lineTo(icx - 15, icy);
      ctx.lineTo(icx + 15, icy + 20);
      ctx.stroke();
    } else if (item.icon === 'gourmet') {
      ctx.beginPath();
      ctx.arc(icx, icy - 5, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(icx - 18, icy + 15);
      ctx.lineTo(icx + 18, icy + 15);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(icx - 20, icy - 20);
      ctx.lineTo(icx, icy + 5);
      ctx.lineTo(icx - 20, icy + 5);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(icx + 20, icy - 20);
      ctx.lineTo(icx, icy + 5);
      ctx.lineTo(icx + 20, icy + 5);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(icx, icy + 5);
      ctx.lineTo(icx, icy + 25);
      ctx.stroke();
    }

    // Title multiline
    ctx.fillStyle = TEXT_DARK;
    ctx.font = '700 21px sans-serif';
    ctx.textAlign = 'center';
    const lines = item.title.split('\n');
    if (lines.length === 1) {
      ctx.fillText(lines[0], icx, iconY + 118);
    } else {
      ctx.fillText(lines[0], icx, iconY + 105);
      ctx.fillText(lines[1], icx, iconY + 130);
    }
    ctx.textAlign = 'left';
  });

  // =========================================================================
  // RIGHT COLUMN (Category, Title, Price Badge, Specs, Destaques, Localização)
  // =========================================================================
  const rightX = 1470;
  const rightW = 1410;

  // Category (e.g., "Apartamento")
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 64px sans-serif';
  ctx.fillText(prop.category || 'Apartamento', rightX, 235);

  // Condo / Property Title (e.g., "Condomínio Reserva das Águas")
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '800 44px sans-serif';
  const titleText = prop.title.startsWith(prop.category) ? prop.title.replace(prop.category, '').trim() : prop.title;
  const splitTitle = ctx.measureText(titleText).width > 1350 ? titleText.substring(0, 45) + '...' : titleText;
  ctx.fillText(splitTitle, rightX, 295);

  // Tagline
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 27px sans-serif';
  ctx.fillText('Conforto, lazer e praticidade em um só lugar. O imóvel ideal para você e sua família!', rightX, 345);

  // Red Underline Accent
  ctx.fillStyle = LOPES_RED;
  ctx.fillRect(rightX, 375, 240, 8);

  // Price Section
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 30px sans-serif';
  const priceLabel = prop.purpose.includes('Locação') ? 'Valor de locação' : 'Valor de venda';
  ctx.fillText(priceLabel, rightX, 435);

  // Red Price Badge Box
  const priceFormatted = prop.purpose.includes('Locação') && prop.rent_price
    ? `R$ ${prop.rent_price.toLocaleString('pt-BR')},00 /mês`
    : `R$ ${prop.price.toLocaleString('pt-BR')},00`;

  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.roundRect(rightX, 460, 820, 110, 24);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 62px sans-serif';
  ctx.fillText(priceFormatted, rightX + 45, 538);

  // Specs Card Container
  const specY = 600;
  const specH = 200;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(rightX, specY, rightW, specH, 26);
  ctx.fill();
  ctx.stroke();

  // Specs Vertical Dividers
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rightX + 470, specY + 25);
  ctx.lineTo(rightX + 470, specY + specH - 25);
  ctx.moveTo(rightX + 940, specY + 25);
  ctx.lineTo(rightX + 940, specY + specH - 25);
  ctx.stroke();

  // Col 1: Dormitórios
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 56px sans-serif';
  ctx.fillText(`${prop.bedrooms || 3}`, rightX + 60, specY + 105);

  ctx.font = '700 26px sans-serif';
  ctx.fillText('Dormitórios', rightX + 125, specY + 85);
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 24px sans-serif';
  ctx.fillText(`(${prop.suites || 1} suíte)`, rightX + 125, specY + 120);

  // Col 2: Vagas
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 56px sans-serif';
  ctx.fillText(`${prop.parking_spaces || 2}`, rightX + 530, specY + 105);

  ctx.font = '700 26px sans-serif';
  ctx.fillText('Vagas', rightX + 595, specY + 85);
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 24px sans-serif';
  ctx.fillText('de garagem', rightX + 595, specY + 120);

  // Col 3: Área Privativa
  const areaVal = prop.built_area || prop.total_area || 78;
  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 56px sans-serif';
  ctx.fillText(`${areaVal} m²`, rightX + 1000, specY + 105);

  ctx.font = '700 26px sans-serif';
  ctx.fillText('Área privativa', rightX + 1000 + (ctx.measureText(`${areaVal} m²`).width > 160 ? 190 : 180), specY + 105);

  // "Destaques do imóvel" Card
  const destY = 830;
  const destH = 340;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(rightX, destY, rightW, destH, 26);
  ctx.fill();
  ctx.stroke();

  // Star Icon
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.arc(rightX + 60, destY + 55, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★', rightX + 60, destY + 63);
  ctx.textAlign = 'left';

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 38px sans-serif';
  ctx.fillText('Destaques do imóvel', rightX + 100, destY + 68);

  // 4 Checkmark Items
  const defaultHighlights = [
    'Ambientes bem iluminados e ventilados',
    'Acabamento moderno e de qualidade',
    'Varanda com vista privilegiada',
    'Pronto para morar'
  ];

  const highlightsToUse = prop.features && prop.features.length >= 4
    ? prop.features.slice(0, 4)
    : [...(prop.features || []), ...defaultHighlights].slice(0, 4);

  highlightsToUse.forEach((hl, i) => {
    const itemY = destY + 130 + (i * 52);

    // Red Checkmark Circle
    ctx.fillStyle = LOPES_RED;
    ctx.beginPath();
    ctx.arc(rightX + 60, itemY - 8, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(rightX + 53, itemY - 8);
    ctx.lineTo(rightX + 58, itemY - 3);
    ctx.lineTo(rightX + 67, itemY - 12);
    ctx.stroke();

    ctx.fillStyle = TEXT_DARK;
    ctx.font = '700 27px sans-serif';
    ctx.fillText(hl, rightX + 90, itemY);
  });

  // "Localização privilegiada" Card
  const locY = 1200;
  const locH = 260;
  ctx.fillStyle = '#FFF1F2';
  ctx.strokeStyle = '#FFE4E6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(rightX, locY, rightW, locH, 26);
  ctx.fill();
  ctx.stroke();

  // Map Pin Icon
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.arc(rightX + 60, locY + 55, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📍', rightX + 60, locY + 63);
  ctx.textAlign = 'left';

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 36px sans-serif';
  ctx.fillText('Localização privilegiada', rightX + 100, locY + 68);

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 25px sans-serif';
  const locText = `Em uma das regiões mais valorizadas de ${prop.city || 'Manaus'}, no bairro ${prop.neighborhood}, com fácil acesso a shoppings, escolas, supermercados, farmácias e principais vias da cidade.`;

  // Multiline location paragraph
  const words = locText.split(' ');
  let line = '';
  let lineY = locY + 125;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > 1280 && n > 0) {
      ctx.fillText(line, rightX + 45, lineY);
      line = words[n] + ' ';
      lineY += 40;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, rightX + 45, lineY);

  // =========================================================================
  // BOTTOM BANNER & FOOTER (Red CTA shape + Lopes Manaus Logo + Contacts bar)
  // =========================================================================
  const footerTopY = 1510;

  // Red CTA Curved Box (Bottom Left)
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.moveTo(0, footerTopY + 40);
  ctx.lineTo(1350, footerTopY + 40);
  ctx.bezierCurveTo(1550, footerTopY + 40, 1650, footerTopY + 240, 1420, footerTopY + 280);
  ctx.lineTo(0, footerTopY + 280);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 52px sans-serif';
  ctx.fillText('Agende uma visita', 90, footerTopY + 115);

  ctx.font = '500 27px sans-serif';
  ctx.fillText('Conheça de perto o seu próximo imóvel', 90, footerTopY + 165);
  ctx.fillText('e viva essa nova conquista.', 90, footerTopY + 202);

  // Center Right Lopes Logo
  ctx.save();
  ctx.translate(1760, footerTopY + 105);
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.arc(-16, -12, 22, Math.PI * 0.7, Math.PI * 1.85);
  ctx.arc(16, -12, 22, Math.PI * 1.15, Math.PI * 0.3);
  ctx.lineTo(0, 32);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 64px sans-serif';
  ctx.fillText('LOPES', 1830, footerTopY + 115);

  ctx.fillStyle = LOPES_RED;
  ctx.font = '800 44px sans-serif';
  ctx.fillText('MANAUS', 1832, footerTopY + 162);

  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(2120, footerTopY + 70, 4, 110);

  ctx.fillStyle = '#475569';
  ctx.font = '800 24px sans-serif';
  ctx.fillText('A IMOBILIÁRIA', 2150, footerTopY + 100);
  ctx.fillText('QUE É REFERÊNCIA', 2150, footerTopY + 132);
  ctx.fillText('EM TODO O BRASIL', 2150, footerTopY + 164);

  // Bottom 3 Contact Pills Bar
  const contactY = 1810;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, contactY, canvas.width, 290);

  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(0, contactY, canvas.width, 3);

  const effectivePhone = captador.whatsapp || companySettings.whatsapp || '(92) 3182-5500';
  const displayPhone = effectivePhone.startsWith('55') ? effectivePhone.substring(2) : effectivePhone;
  const formattedPhone = displayPhone.length >= 10 ? `(${displayPhone.substring(0,2)}) ${displayPhone.substring(2,7)}-${displayPhone.substring(7)}` : displayPhone;

  // Contact 1: WhatsApp
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.arc(200, contactY + 130, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📞', 200, contactY + 142);

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 36px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formattedPhone || '(92) 3182-5500', 260, contactY + 125);
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 25px sans-serif';
  ctx.fillText('Telefone / WhatsApp', 260, contactY + 160);

  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(940, contactY + 60, 3, 150);

  // Contact 2: Website
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.arc(1040, contactY + 130, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌐', 1040, contactY + 142);

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 36px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('www.lopesmanaus.com.br', 1100, contactY + 125);
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 25px sans-serif';
  ctx.fillText('Acesse nosso site', 1100, contactY + 160);

  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(1950, contactY + 60, 3, 150);

  // Contact 3: Instagram
  ctx.fillStyle = LOPES_RED;
  ctx.beginPath();
  ctx.arc(2050, contactY + 130, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📷', 2050, contactY + 142);

  ctx.fillStyle = TEXT_DARK;
  ctx.font = '900 36px sans-serif';
  ctx.textAlign = 'left';
  const instaHandle = captador.instagram || companySettings.instagram || '@lopesmanaus';
  ctx.fillText(instaHandle.startsWith('@') ? instaHandle : `@${instaHandle}`, 2110, contactY + 125);
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '500 25px sans-serif';
  ctx.fillText('Siga nossas redes sociais', 2110, contactY + 160);

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
  const { properties, captador, companySettings, customCoverImage, orientation = 'portrait' } = options;
  const baseUrl = options.appUrl || window.location.origin;
  const effectivePhone = getEffectiveWhatsApp(captador, companySettings);

  const isLandscape = orientation === 'landscape';

  // Create PDF Document with chosen orientation
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
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
  // PÁGINA 1: CAPA OFICIAL DO CATÁLOGO
  // ==========================================
  let selectedCoverUrl = customCoverImage;

  if (!selectedCoverUrl) {
    if (coverType === 'LOCACAO') {
      selectedCoverUrl = companySettings?.cover_locacao_url || companySettings?.cover_geral_url;
    } else if (coverType === 'VENDA') {
      selectedCoverUrl = companySettings?.cover_venda_url || companySettings?.cover_geral_url;
    } else {
      selectedCoverUrl = companySettings?.cover_geral_url || companySettings?.cover_venda_url || companySettings?.cover_locacao_url;
    }
  }

  let coverDataUrl = '';
  if (selectedCoverUrl) {
    coverDataUrl = await urlToBase64(selectedCoverUrl);
  }

  if (!coverDataUrl) {
    if (isLandscape) {
      coverDataUrl = await renderHorizontalCoverCanvas(coverType, companySettings);
    } else {
      coverDataUrl = await renderCoverCanvas(coverType, companySettings);
    }
  }

  if (coverDataUrl) {
    try {
      if (isLandscape) {
        doc.addImage(coverDataUrl, 'JPEG', 0, 0, 297, 210);
      } else {
        doc.addImage(coverDataUrl, 'JPEG', 0, 0, 210, 297);
      }
    } catch (err) {
      console.warn('Error applying cover image to PDF:', err);
      const defaultCanvas = isLandscape
        ? await renderHorizontalCoverCanvas(coverType, companySettings)
        : await renderCoverCanvas(coverType, companySettings);
      
      if (isLandscape) {
        doc.addImage(defaultCanvas, 'JPEG', 0, 0, 297, 210);
      } else {
        doc.addImage(defaultCanvas, 'JPEG', 0, 0, 210, 297);
      }
    }
  }

  // ==========================================
  // PÁGINA 2 EM DIANTE: FICHAS DOS IMÓVEIS (1 imóvel por página)
  // ==========================================
  const totalPages = properties.length + 1;

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    doc.addPage();

    if (isLandscape) {
      // LANDSCAPE MODE: Use pixel-perfect Horizontal Property Canvas matching user image design
      const horizontalCanvasDataUrl = await renderHorizontalPropertyCanvas(prop, captador, companySettings);
      doc.addImage(horizontalCanvasDataUrl, 'JPEG', 0, 0, 297, 210);
    } else {
      // PORTRAIT MODE: Standard vertical page
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 12, 'F');
      doc.setFillColor(229, 9, 56);
      doc.rect(0, 11.5, 210, 0.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`LOPES MANAUS • ${companySettings.company_name || 'Lopes Manaus'}`, 15, 8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(226, 232, 240);
      doc.text(`PÁGINA ${i + 2} DE ${totalPages}`, 195, 8, { align: 'right' });

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(prop.title, 180);
      doc.text(titleLines[0], 15, 21);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(229, 9, 56);
      doc.text(`${prop.category} em ${prop.purpose} • Bairro: ${prop.neighborhood}, ${prop.city}-${prop.state} • Cód: ${prop.code}`, 15, 27);

      let currentY = 31;
      const mainImgBase64 = prop.main_image ? await urlToBase64(prop.main_image) : '';
      if (mainImgBase64) {
        try {
          doc.addImage(mainImgBase64, 'JPEG', 15, currentY, 180, 75);
          currentY += 79;
        } catch {
          // Fallback
        }
      }

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      const boxHeight = mainImgBase64 ? 32 : 52;
      doc.roundedRect(15, currentY, 180, boxHeight, 3, 3, 'FD');

      doc.setTextColor(229, 9, 56);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const priceFormatted = prop.purpose.includes('Locação') && prop.rent_price
        ? formatCurrency(prop.rent_price) + ' /mês'
        : formatCurrency(prop.price);
      doc.text(priceFormatted, 22, currentY + 12);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Condomínio: ${formatCurrency(prop.condo_fee)} | IPTU: ${formatCurrency(prop.iptu)}`, 22, currentY + 20);

      if (!mainImgBase64) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`Finalidade: ${prop.purpose} • Categoria: ${prop.category}`, 22, currentY + 28);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Localização: ${prop.address ? prop.address + ' - ' : ''}${prop.neighborhood}, ${prop.city}-${prop.state}`, 22, currentY + 35);
        doc.text(`Status do Imóvel: ${prop.status} • Código: ${prop.code}`, 22, currentY + 42);
      }

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Área Total: ${prop.total_area || prop.built_area || 0} m²`, 110, currentY + 10);
      if (prop.built_area && prop.built_area !== prop.total_area) {
        doc.text(`Área Útil: ${prop.built_area} m²`, 110, currentY + 16);
      } else {
        doc.text(`Dormitórios: ${prop.bedrooms} (${prop.suites} suítes)`, 110, currentY + 16);
      }
      doc.text(`Banheiros: ${prop.bathrooms}  |  Vagas: ${prop.parking_spaces}`, 110, currentY + 23);

      currentY += boxHeight + 6;

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text('CARACTERÍSTICAS E DESCRIÇÃO DO IMÓVEL', 15, currentY);
      currentY += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const maxDescLines = mainImgBase64 ? 5 : 12;
      const descLines = doc.splitTextToSize(prop.description || 'Imóvel de alto padrão com excelente infraestrutura e localização privilegiada.', 180);
      const descText = descLines.slice(0, maxDescLines).join('\n');
      doc.text(descText, 15, currentY);
      currentY += (Math.min(descLines.length, maxDescLines) * 4.2) + 6;

      if (prop.features && prop.features.length > 0) {
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.text('DIFERENCIAIS DO IMÓVEL:', 15, currentY);
        currentY += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const featText = prop.features.join(' • ');
        const featLines = doc.splitTextToSize(featText, 180);
        const maxFeatLines = mainImgBase64 ? 3 : 6;
        doc.text(featLines.slice(0, maxFeatLines), 15, currentY);
      }

      const propertyPublicUrl = `${baseUrl}/imovel/${prop.code}`;
      const waMsg = `Olá ${captador.name}! Gostaria de mais informações e agendar uma visita para o imóvel "${prop.title}" (Cód: ${prop.code}).`;
      const whatsappDirectUrl = buildWhatsAppUrl(effectivePhone, waMsg);

      doc.setFillColor(15, 23, 42);
      doc.roundedRect(15, 242, 180, 48, 4, 4, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`GOSTOU DESTE IMÓVEL? FALE COM ${captador.name.toUpperCase()}`, 22, 252);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(`WhatsApp: ${formatPhoneDisplay(effectivePhone)}`, 22, 258);

      const btn1X = 22;
      const btn1Y = 264;
      const btn1W = 60;
      const btn1H = 18;

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(btn1X, btn1Y, btn1W, btn1H, 3, 3, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Ver detalhes completos', btn1X + (btn1W / 2), btn1Y + 10, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Catálogo Digital do Captador', btn1X + (btn1W / 2), btn1Y + 14, { align: 'center' });

      doc.link(btn1X, btn1Y, btn1W, btn1H, { url: propertyPublicUrl });

      const btn2X = 86;
      const btn2Y = 264;
      const btn2W = 58;
      const btn2H = 18;

      doc.setFillColor(229, 9, 56);
      doc.roundedRect(btn2X, btn2Y, btn2W, btn2H, 3, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Solicitar Visita via WhatsApp', btn2X + (btn2W / 2), btn2Y + 10, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(254, 242, 242);
      doc.text('Falar direto com Captador', btn2X + (btn2W / 2), btn2Y + 14, { align: 'center' });

      doc.link(btn2X, btn2Y, btn2W, btn2H, { url: whatsappDirectUrl });

      const propertyQrCode = await generateQRCodeDataUrl(propertyPublicUrl, '#E50938');
      if (propertyQrCode) {
        try {
          doc.setFillColor(255, 255, 255);
          doc.rect(148, 246, 40, 40, 'F');
          doc.addImage(propertyQrCode, 'PNG', 150, 248, 36, 36);
        } catch {
          // ignore
        }
      }
    }
  }

  return doc;
}
