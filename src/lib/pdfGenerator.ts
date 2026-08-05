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
          resolve(canvas.toDataURL('image/jpeg', 0.82));
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
 * Generates a high-resolution, pixel-perfect 1-piece cover image using HTML Canvas
 * that fills 100% of Page 1 in the PDF.
 */
export async function renderCoverCanvas(
  type: 'VENDA' | 'LOCACAO' | 'GERAL',
  companySettings?: CompanySettings
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1414;
  canvas.height = 2000;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Fill background white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Top-Left Brand Logo "LOPES MANAUS"
  // Red Heart Logo Icon
  ctx.fillStyle = '#F10F4D';
  ctx.beginPath();
  ctx.arc(150, 140, 32, 0, Math.PI * 2);
  ctx.arc(195, 140, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(122, 150);
  ctx.lineTo(223, 150);
  ctx.lineTo(172.5, 215);
  ctx.closePath();
  ctx.fill();

  // "LOPES" Text
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 115px sans-serif';
  ctx.fillText('LOPES', 260, 170);

  // "MANAUS" Text
  ctx.fillStyle = '#F10F4D';
  ctx.font = '800 75px sans-serif';
  ctx.fillText('MANAUS', 260, 240);

  // Red accent line under logo
  ctx.fillStyle = '#F10F4D';
  ctx.fillRect(140, 275, 260, 10);

  // Top-Right Curved Red Shapes
  ctx.fillStyle = '#991B1B'; // Deep Red
  ctx.beginPath();
  ctx.moveTo(850, 0);
  ctx.lineTo(1414, 0);
  ctx.lineTo(1414, 380);
  ctx.bezierCurveTo(1200, 200, 1000, 100, 850, 0);
  ctx.fill();

  ctx.fillStyle = '#F10F4D'; // Bright Red
  ctx.beginPath();
  ctx.moveTo(700, 0);
  ctx.lineTo(1414, 0);
  ctx.lineTo(1414, 260);
  ctx.bezierCurveTo(1100, 140, 900, 50, 700, 0);
  ctx.fill();

  // CRECI PJ Badge Top Right
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`CRECI: ${companySettings?.creci_j || '540-J/AM'}`, 1370, 70);
  ctx.font = '22px sans-serif';
  ctx.fillText((companySettings?.unit_name || 'PONTA NEGRA').toUpperCase(), 1370, 105);
  ctx.textAlign = 'left';

  // 3. Right Side Curve Frame displaying Manaus Sunset River Panorama
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(750, 0);
  ctx.bezierCurveTo(620, 250, 620, 600, 850, 850);
  ctx.bezierCurveTo(1050, 1050, 1300, 1100, 1414, 1150);
  ctx.lineTo(1414, 0);
  ctx.closePath();
  ctx.clip();

  // Render sunset river water and sky
  const skyGrad = ctx.createLinearGradient(700, 0, 1414, 1150);
  skyGrad.addColorStop(0, '#0F172A');
  skyGrad.addColorStop(0.3, '#312E81');
  skyGrad.addColorStop(0.6, '#9A3412');
  skyGrad.addColorStop(0.85, '#EA580C');
  skyGrad.addColorStop(1, '#F59E0B');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(600, 0, 814, 1150);

  const waterGrad = ctx.createLinearGradient(600, 400, 1414, 1150);
  waterGrad.addColorStop(0, '#1E293B');
  waterGrad.addColorStop(1, '#0284C7');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(600, 350, 814, 800);

  // Buildings silhouette
  ctx.fillStyle = '#0F172A';
  const buildings = [
    { x: 750, w: 40, h: 220 },
    { x: 800, w: 55, h: 320 },
    { x: 865, w: 45, h: 280 },
    { x: 920, w: 60, h: 380 },
    { x: 990, w: 50, h: 340 },
    { x: 1050, w: 70, h: 420 },
    { x: 1130, w: 65, h: 360 },
    { x: 1200, w: 80, h: 450 },
    { x: 1290, w: 75, h: 390 },
    { x: 1370, w: 44, h: 480 },
  ];
  buildings.forEach(b => {
    ctx.fillRect(b.x, 600 - b.h, b.w, b.h);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.6)';
    for (let wy = 620 - b.h; wy < 580; wy += 30) {
      for (let wx = b.x + 8; wx < b.x + b.w - 10; wx += 14) {
        ctx.fillRect(wx, wy, 8, 12);
      }
    }
    ctx.fillStyle = '#0F172A';
  });

  ctx.restore(); // end clip

  // Red Accent Line along the curve border
  ctx.strokeStyle = '#F10F4D';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(750, 0);
  ctx.bezierCurveTo(620, 250, 620, 600, 850, 850);
  ctx.bezierCurveTo(1050, 1050, 1300, 1100, 1414, 1150);
  ctx.stroke();

  // Red Circular Badge intersecting the curve (Key Symbol)
  ctx.fillStyle = '#F10F4D';
  ctx.beginPath();
  ctx.arc(970, 980, 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(970, 980, 95, 0, Math.PI * 2);
  ctx.stroke();

  // Key Icon inside badge
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 90px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔑', 970, 1010);
  ctx.textAlign = 'left';

  // 4. Main Cover Title Section (x=120)
  ctx.fillStyle = '#475569';
  ctx.font = '700 68px sans-serif';
  ctx.fillText('CATÁLOGO DE', 120, 480);

  if (type === 'VENDA') {
    ctx.fillStyle = '#F10F4D';
    ctx.font = '900 145px sans-serif';
    ctx.fillText('IMÓVEIS', 120, 630);
    ctx.fillText('PARA VENDA', 120, 780);

    ctx.fillStyle = '#F10F4D';
    ctx.fillRect(120, 820, 240, 14);

    ctx.fillStyle = '#334155';
    ctx.font = '500 42px sans-serif';
    ctx.fillText('Os melhores imóveis para ', 120, 920);
    
    ctx.fillStyle = '#F10F4D';
    ctx.font = '800 42px sans-serif';
    ctx.fillText('investir,', 615, 920);

    ctx.fillText('realizar', 120, 975);
    ctx.fillStyle = '#334155';
    ctx.font = '500 42px sans-serif';
    ctx.fillText(' e ', 270, 975);
    ctx.fillStyle = '#F10F4D';
    ctx.font = '800 42px sans-serif';
    ctx.fillText('viver', 320, 975);
    ctx.fillStyle = '#334155';
    ctx.font = '500 42px sans-serif';
    ctx.fillText(' grandes conquistas.', 420, 975);

  } else if (type === 'LOCACAO') {
    ctx.fillStyle = '#F10F4D';
    ctx.font = '900 140px sans-serif';
    ctx.fillText('IMÓVEIS', 120, 620);
    ctx.fillText('PARA', 120, 760);
    ctx.fillText('LOCAÇÃO', 120, 900);

    ctx.fillStyle = '#F10F4D';
    ctx.fillRect(120, 935, 240, 14);

    ctx.fillStyle = '#334155';
    ctx.font = '500 42px sans-serif';
    ctx.fillText('Os melhores imóveis para morar', 120, 1010);
    ctx.fillText('com ', 120, 1060);

    ctx.fillStyle = '#F10F4D';
    ctx.font = '800 42px sans-serif';
    ctx.fillText('conforto, segurança', 210, 1060);

    ctx.fillStyle = '#334155';
    ctx.font = '500 42px sans-serif';
    ctx.fillText(' e ', 620, 1060);

    ctx.fillStyle = '#F10F4D';
    ctx.font = '800 42px sans-serif';
    ctx.fillText('praticidade.', 670, 1060);

  } else {
    // GERAL
    ctx.fillStyle = '#F10F4D';
    ctx.font = '900 155px sans-serif';
    ctx.fillText('IMÓVEIS', 120, 640);

    ctx.fillStyle = '#F10F4D';
    ctx.fillRect(120, 680, 240, 14);

    ctx.fillStyle = '#0F172A';
    ctx.font = '800 58px sans-serif';
    ctx.fillText('O seu próximo imóvel', 120, 780);
    ctx.fillStyle = '#F10F4D';
    ctx.fillText('está aqui.', 120, 850);

    ctx.fillStyle = '#475569';
    ctx.font = '500 38px sans-serif';
    ctx.fillText('Conheça todas as oportunidades', 120, 930);
    ctx.fillText('para ', 120, 980);

    ctx.fillStyle = '#F10F4D';
    ctx.font = '800 38px sans-serif';
    ctx.fillText('comprar, vender', 210, 980);

    ctx.fillStyle = '#475569';
    ctx.font = '500 38px sans-serif';
    ctx.fillText(' ou ', 510, 980);

    ctx.fillStyle = '#F10F4D';
    ctx.font = '800 38px sans-serif';
    ctx.fillText('alugar', 580, 980);

    ctx.fillStyle = '#475569';
    ctx.font = '500 38px sans-serif';
    ctx.fillText('com a LOPES MANAUS.', 120, 1030);
  }

  // 5. Categories Section (y=1220)
  const catY = 1220;
  ctx.fillStyle = '#F10F4D';
  ctx.fillRect(120, catY, 1174, 5);

  ctx.fillStyle = '#F10F4D';
  ctx.font = '800 36px sans-serif';
  ctx.textAlign = 'center';
  const catTitleText = type === 'GERAL' ? 'NOSSAS CATEGORIAS DE IMÓVEIS' : 'TRABALHAMOS COM OS SEGUINTES IMÓVEIS';
  ctx.fillText(catTitleText, 707, catY - 15);

  const categories = [
    { title: 'APARTAMENTOS', desc: 'Diversos padrões\ne localizações' },
    { title: 'CASAS', desc: 'Térreas, duplex\ne em condomínio' },
    { title: 'SALAS COMERCIAIS', desc: 'Espaços para seu\nnegócio crescer' },
    { title: 'CONDOMÍNIOS', desc: 'Segurança e lazer\npara sua família' },
    { title: 'KITNETS E STUDIOS', desc: 'Práticos e ideais\npara o dia a dia' },
    { title: 'IMÓVEIS COMERCIAIS', desc: 'Lojas, pontos e\noutros espaços' }
  ];

  const colW = 180;
  const colG = 18;
  const startX = 120;
  const startY = catY + 30;

  for (let idx = 0; idx < categories.length; idx++) {
    const col = idx % 6;
    const cx = startX + (col * (colW + colG));
    const cy = startY;

    // Card Box
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.fillRect(cx, cy, colW, 200);
    ctx.strokeRect(cx, cy, colW, 200);

    // Category Icon
    ctx.fillStyle = '#F10F4D';
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    const icons = ['🏢', '🏠', '🏢', '🏡', '🛋️', '🏪'];
    ctx.fillText(icons[idx], cx + (colW / 2), cy + 45);

    // Title
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 20px sans-serif';
    ctx.fillText(categories[idx].title, cx + (colW / 2), cy + 85);

    // Desc
    ctx.fillStyle = '#64748B';
    ctx.font = '400 17px sans-serif';
    const splitDesc = categories[idx].desc.split('\n');
    ctx.fillText(splitDesc[0], cx + (colW / 2), cy + 125);
    if (splitDesc[1]) {
      ctx.fillText(splitDesc[1], cx + (colW / 2), cy + 150);
    }
  }

  // 6. Bottom Deep Red Footer Bar (y=1640 to 2000)
  ctx.fillStyle = '#991B1B';
  ctx.fillRect(0, 1640, 1414, 360);

  const pillars = [
    { icon: '🛡️', title: 'SEGURANÇA', desc: 'Transparência e confiança\nem cada negociação.' },
    { icon: '🤝', title: 'ATENDIMENTO', desc: 'Atendimento personalizado\nem todas as etapas.' },
    { icon: '🎖️', title: 'EXPERIÊNCIA', desc: 'Tradição e credibilidade\nno mercado imobiliário.' },
    { icon: '📍', title: 'ATUAÇÃO EM MANAUS', desc: 'Conhecemos a cidade\ne os melhores bairros.' }
  ];

  const pW = 310;
  const pStartX = 70;

  pillars.forEach((p, i) => {
    const px = pStartX + (i * 335);
    const py = 1710;

    // Pillar Circle Icon Frame
    ctx.strokeStyle = '#FEE2E2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + (pW / 2), py + 35, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.icon, px + (pW / 2), py + 48);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 26px sans-serif';
    ctx.fillText(p.title, px + (pW / 2), py + 115);

    ctx.fillStyle = '#FEE2E2';
    ctx.font = '400 21px sans-serif';
    const descLines = p.desc.split('\n');
    ctx.fillText(descLines[0], px + (pW / 2), py + 155);
    if (descLines[1]) {
      ctx.fillText(descLines[1], px + (pW / 2), py + 185);
    }
  });

  return canvas.toDataURL('image/jpeg', 0.94);
}

export async function generateCatalogPDF(options: {
  title?: string;
  properties: Property[];
  captador: User;
  companySettings: CompanySettings;
  appUrl?: string;
}): Promise<jsPDF> {
  const { properties, captador, companySettings } = options;
  const baseUrl = options.appUrl || window.location.origin;
  const publicCatalogUrl = `${baseUrl}/catalogo/${captador.url_slug || captador.username}`;
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
  // PÁGINA 1: CAPA COMPLETA DO CATÁLOGO (IMAGEM FULL-BLEED 210x297mm)
  // ==========================================
  const coverDataUrl = await renderCoverCanvas(coverType, companySettings);
  if (coverDataUrl) {
    doc.addImage(coverDataUrl, 'JPEG', 0, 0, 210, 297);
  }

  // NOTE: Página 2 com resumo e ficha do captador foi REMOVIDA conforme solicitação do usuário.
  // Fichas individuais de cada imóvel começam diretamente na Página 2!

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
    doc.setFillColor(241, 15, 77);
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
    doc.setTextColor(241, 15, 77);
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
    doc.setTextColor(241, 15, 77);
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

    doc.setFillColor(241, 15, 77); // Lopes Red
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
    const propertyQrCode = await generateQRCodeDataUrl(propertyPublicUrl, '#F10F4D');
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
