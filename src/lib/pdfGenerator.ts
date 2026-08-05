import jsPDF from 'jspdf';
import { Property, User, CompanySettings } from '../types';
import { generateQRCodeDataUrl } from './qrCode';
import { buildWhatsAppUrl, formatPhoneDisplay, getEffectiveWhatsApp } from './whatsapp';

// Helper to convert image URL to Base64 DataURL safely
async function urlToBase64(url: string): Promise<string> {
  if (!url) return '';
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 800;
        canvas.height = img.height || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve('');
        }
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
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

export async function generateCatalogPDF(options: {
  title?: string;
  properties: Property[];
  captador: User;
  companySettings: CompanySettings;
  appUrl?: string;
  customCoverImage?: string; // Optional user-provided custom cover image (data URL or Base64)
}): Promise<jsPDF> {
  const { properties, captador, companySettings, customCoverImage } = options;
  const baseUrl = options.appUrl || window.location.origin;
  const effectivePhone = getEffectiveWhatsApp(captador, companySettings);

  // Create A4 PDF Document (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Determine Catalog Type for Cover Page 1
  let coverType: 'VENDA' | 'LOCACAO' | 'GERAL' = 'GERAL';
  const allVenda = properties.length > 0 && properties.every(p => p.purpose === 'Venda');
  const allLocacao = properties.length > 0 && properties.every(p => p.purpose === 'Locação');

  if (allVenda || (options.title && options.title.toLowerCase().includes('venda'))) {
    coverType = 'VENDA';
  } else if (allLocacao || (options.title && options.title.toLowerCase().includes('loca'))) {
    coverType = 'LOCACAO';
  }

  // ==========================================
  // PÁGINA 1: CAPA OFICIAL DO CATÁLOGO (100% FULL-BLEED 210mm x 297mm)
  // ==========================================
  let selectedCoverUrl = customCoverImage;

  // Check admin configured cover per purpose if custom cover is not provided
  if (!selectedCoverUrl) {
    if (coverType === 'LOCACAO' && companySettings?.cover_locacao_url) {
      selectedCoverUrl = companySettings.cover_locacao_url;
    } else if (coverType === 'VENDA' && companySettings?.cover_venda_url) {
      selectedCoverUrl = companySettings.cover_venda_url;
    } else if (companySettings?.cover_geral_url) {
      selectedCoverUrl = companySettings.cover_geral_url;
    }
  }

  let coverDataUrl = '';
  if (selectedCoverUrl) {
    if (selectedCoverUrl.startsWith('data:')) {
      coverDataUrl = selectedCoverUrl;
    } else {
      coverDataUrl = await urlToBase64(selectedCoverUrl);
    }
  }

  if (!coverDataUrl) {
    coverDataUrl = await renderCoverCanvas(coverType, companySettings);
  }

  if (coverDataUrl) {
    try {
      doc.addImage(coverDataUrl, 'JPEG', 0, 0, 210, 297);
    } catch {
      // Fallback
      const defaultCanvas = await renderCoverCanvas(coverType, companySettings);
      doc.addImage(defaultCanvas, 'JPEG', 0, 0, 210, 297);
    }
  }

  // ==========================================
  // PÁGINA 2 EM DIANTE: FICHA INDIVIDUAL DE CADA IMÓVEL (1 imóvel por página)
  // ==========================================
  const totalPages = properties.length + 1; // 1 cover page + N property pages

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    doc.addPage();

    // Top Header Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 12, 'F');
    doc.setFillColor(229, 9, 56);
    doc.rect(0, 11.5, 210, 0.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`LOPES CAPTAÇÃO • ${companySettings.company_name || 'Lopes Captação'}`, 15, 8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 232, 240);
    doc.text(`PÁGINA ${i + 2} DE ${totalPages}`, 195, 8, { align: 'right' });

    // Header Title & Subtitle
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(prop.title, 180);
    doc.text(titleLines[0], 15, 21);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(229, 9, 56);
    doc.text(`${prop.category} em ${prop.purpose} • Bairro: ${prop.neighborhood}, ${prop.city}-${prop.state} • Cód: ${prop.code}`, 15, 27);

    // Featured Image
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

    // Specifications Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    const boxHeight = mainImgBase64 ? 32 : 52;
    doc.roundedRect(15, currentY, 180, boxHeight, 3, 3, 'FD');

    // Price Column
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

    // Characteristics Columns
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

    // Commercial Description
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

    // Features
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

    // ==========================================
    // FOOTER CALL TO ACTION & INTERACTIVE BUTTONS
    // ==========================================
    const propertyPublicUrl = `${baseUrl}/imovel/${prop.code}`;
    const waMsg = `Olá ${captador.name}! Gostaria de mais informações e agendar uma visita para o imóvel "${prop.title}" (Cód: ${prop.code}).`;
    const whatsappDirectUrl = buildWhatsAppUrl(effectivePhone, waMsg);

    // Footer Container Box
    doc.setFillColor(15, 23, 42); // Dark Slate
    doc.roundedRect(15, 242, 180, 48, 4, 4, 'F');

    // Contact Header inside Footer
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`GOSTOU DESTE IMÓVEL? FALE COM ${captador.name.toUpperCase()}`, 22, 252);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`WhatsApp: ${formatPhoneDisplay(effectivePhone)}`, 22, 258);

    // BUTTON 1: "Ver detalhes completos"
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

    // BUTTON 2: "Solicitar Visita via WhatsApp"
    const btn2X = 86;
    const btn2Y = 264;
    const btn2W = 58;
    const btn2H = 18;

    doc.setFillColor(229, 9, 56); // Lopes Red
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

    // Property QR Code inside Footer (Right side)
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

  return doc;
}
