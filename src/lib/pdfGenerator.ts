import jsPDF from 'jspdf';
import { Property, User, CompanySettings } from '../types';
import { generateQRCodeDataUrl } from './qrCode';

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

  // Create A4 PDF Document (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Color Palette - Lopes Manaus Luxury Brand
  const primaryRed = '#F10F4D'; // [241, 15, 77]
  const darkSlate = '#0F172A';  // [15, 23, 42]
  const borderGray = '#E2E8F0'; // [226, 232, 240]

  // --- AUTOMATIC TITLE CALCULATION ---
  let autoTitle = 'Imóveis Selecionados';
  if (properties.length > 0) {
    const allVenda = properties.every(p => p.purpose === 'Venda');
    const allLocacao = properties.every(p => p.purpose === 'Locação');
    if (allVenda) {
      autoTitle = 'Imóveis à Venda';
    } else if (allLocacao) {
      autoTitle = 'Imóveis para Locação';
    }
  }

  const catalogTitle = (options.title && options.title !== 'CATÁLOGO DE IMÓVEIS SELECIONADOS - MANAUS')
    ? options.title
    : autoTitle;

  // ==========================================
  // 1. CAPA DINÂMICA (COVER PAGE)
  // ==========================================

  // Top Branding Header
  doc.setFillColor(15, 23, 42); // Dark Slate #0F172A
  doc.rect(0, 0, 210, 36, 'F');

  // Accent Line
  doc.setFillColor(241, 15, 77); // Red Accent
  doc.rect(0, 35, 210, 2, 'F');

  // Logo Lopes Manaus
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('LOPES MANAUS', 15, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text('CATÁLOGO DE IMÓVEIS', 15, 28);

  // CRECI PJ da unidade
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(241, 15, 77);
  doc.text(`CRECI-J: ${companySettings.creci_j || '540-J/AM'}`, 195, 20, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text((companySettings.unit_name || 'UNIDADE PONTA NEGRA').toUpperCase(), 195, 27, { align: 'right' });

  // Cover Hero Image (Institutional photo or first property photo)
  const coverHeroUrl = properties[0]?.main_image || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80';
  const coverHeroBase64 = await urlToBase64(coverHeroUrl);
  
  if (coverHeroBase64) {
    try {
      doc.addImage(coverHeroBase64, 'JPEG', 15, 43, 180, 62);
    } catch {
      doc.setFillColor(241, 245, 249);
      doc.rect(15, 43, 180, 62, 'F');
    }
  } else {
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 43, 180, 62, 'F');
  }

  // Cover Hero Overlay Box with Dynamic Title
  doc.setFillColor(241, 15, 77); // Lopes Red
  doc.rect(15, 108, 180, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(catalogTitle.toUpperCase(), 25, 122);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(254, 242, 242);
  doc.text(`Manaus - AM • Portfolio Exclusivo com ${properties.length} ${properties.length === 1 ? 'Imóvel' : 'Imóveis'} Selecionados`, 25, 129);

  // Captador Card Frame
  doc.setFillColor(248, 250, 252); // Light Gray
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 140, 180, 105, 4, 4, 'FD');

  // Captador Card Header Bar
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(15, 140, 180, 10, 4, 4, 'F');
  doc.rect(15, 146, 180, 4, 'F'); // flatten bottom corners of header

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CAPTADOR & CONSULTOR IMOBILIÁRIO RESPONSÁVEL', 22, 146.5);

  // Captador Photo
  const captadorPhotoBase64 = captador.photo_url ? await urlToBase64(captador.photo_url) : '';
  if (captadorPhotoBase64) {
    try {
      doc.addImage(captadorPhotoBase64, 'JPEG', 22, 155, 34, 34);
      doc.setDrawColor(241, 15, 77);
      doc.setLineWidth(0.8);
      doc.rect(22, 155, 34, 34, 'D');
      doc.setLineWidth(0.2); // reset
    } catch {
      doc.setFillColor(241, 15, 77);
      doc.rect(22, 155, 34, 34, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text(captador.name.charAt(0).toUpperCase(), 39, 176, { align: 'center' });
    }
  } else {
    doc.setFillColor(241, 15, 77);
    doc.rect(22, 155, 34, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(captador.name.charAt(0).toUpperCase(), 39, 176, { align: 'center' });
  }

  // Captador Info
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(captador.name, 62, 163);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(241, 15, 77);
  doc.text(captador.position || 'Corretor de Imóveis - Lopes Manaus', 62, 170);

  if (captador.creci) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(`CRECI: ${captador.creci}`, 62, 176);
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(62, 180, 132, 180);

  // Contacts
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Telefone / WhatsApp: ${captador.whatsapp || captador.phone}`, 62, 187);
  doc.text(`E-mail: ${captador.email}`, 62, 194);
  doc.text(`Instagram: ${captador.instagram || companySettings.instagram}`, 62, 201);
  doc.text(`Catálogo Digital: ${publicCatalogUrl}`, 62, 208);

  // Categories & Summary
  const categoriesList = Array.from(new Set(properties.map(p => p.category))).join(', ');
  const neighborhoodsList = Array.from(new Set(properties.map(p => p.neighborhood))).slice(0, 3).join(', ');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Categorias no Catálogo: ${categoriesList || 'Diversas'}`, 22, 222);
  doc.text(`Bairros em Destaque: ${neighborhoodsList || 'Adrianópolis, Ponta Negra'}`, 22, 228);
  doc.text(`Unidade de Atendimento: ${companySettings.address}`, 22, 234);

  // QR Code for Captador's Public Catalog
  const captadorQrCodeUrl = await generateQRCodeDataUrl(publicCatalogUrl, '#F10F4D');
  if (captadorQrCodeUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.rect(138, 155, 48, 56, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(138, 155, 48, 56, 'D');

      doc.addImage(captadorQrCodeUrl, 'PNG', 142, 158, 40, 40);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(241, 15, 77);
      doc.text('CATÁLOGO ONLINE', 162, 203, { align: 'center' });
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Aponte a câmera', 162, 207, { align: 'center' });
    } catch {
      // ignore qr error
    }
  }

  // Cover Page Bottom Footer
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 262, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(companySettings.company_name.toUpperCase(), 15, 274);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`${companySettings.address} • ${companySettings.phone} • ${companySettings.email}`, 15, 281);
  doc.text(`Lopes Manaus © 2026 • Todos os direitos reservados • CRECI-J: ${companySettings.creci_j}`, 15, 287);

  // ==========================================
  // 2. COMMERCIAL PROPERTY PAGES
  // ==========================================
  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    doc.addPage();

    // Property Page Top Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 12, 'F');

    doc.setFillColor(241, 15, 77);
    doc.rect(0, 11.5, 210, 0.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`LOPES CAPTAÇÃO • ${companySettings.company_name || 'Lopes Manaus'}`, 15, 8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 232, 240);
    doc.text(`PÁGINA ${i + 2}`, 195, 8, { align: 'right' });

    // Property Title & Subtitle Header
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(prop.title, 180);
    doc.text(titleLines[0], 15, 21);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(241, 15, 77);
    doc.text(`${prop.category} em ${prop.purpose} • Bairro: ${prop.neighborhood}, ${prop.city}-${prop.state}`, 15, 27);

    // Main Featured Property Image
    let currentY = 31;
    const mainImgBase64 = prop.main_image ? await urlToBase64(prop.main_image) : '';
    if (mainImgBase64) {
      try {
        doc.addImage(mainImgBase64, 'JPEG', 15, currentY, 180, 80);
        currentY += 84;
      } catch {
        doc.setFillColor(241, 245, 249);
        doc.rect(15, currentY, 180, 80, 'F');
        currentY += 84;
      }
    } else {
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 180, 80, 'F');
      currentY += 84;
    }

    // Price & Primary Features Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, currentY, 180, 28, 3, 3, 'FD');

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

    // Badges / Characteristics Columns
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Área: ${prop.total_area} m²`, 110, currentY + 10);
    doc.text(`Dormitórios: ${prop.bedrooms} (${prop.suites} suítes)`, 110, currentY + 17);
    doc.text(`Banheiros: ${prop.bathrooms}  |  Vagas: ${prop.parking_spaces}`, 110, currentY + 24);

    currentY += 33;

    // Commercial Description
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIÇÃO COMERCIAL', 15, currentY);
    currentY += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const descLines = doc.splitTextToSize(prop.description || 'Imóvel de alto padrão em excelente localização em Manaus.', 180);
    const descText = descLines.slice(0, 3).join('\n');
    doc.text(descText, 15, currentY);
    currentY += (Math.min(descLines.length, 3) * 4) + 5;

    // Additional Photos Grid (Fotos Adicionais)
    const extraImages = (prop.images || []).filter(img => img !== prop.main_image).slice(0, 3);
    if (extraImages.length > 0) {
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('FOTOS ADICIONAIS', 15, currentY);
      currentY += 4;

      const thumbWidth = (180 - (extraImages.length - 1) * 4) / extraImages.length;
      const thumbHeight = 30;

      for (let imgIdx = 0; imgIdx < extraImages.length; imgIdx++) {
        const thumbX = 15 + imgIdx * (thumbWidth + 4);
        const thumbBase64 = await urlToBase64(extraImages[imgIdx]);
        if (thumbBase64) {
          try {
            doc.addImage(thumbBase64, 'JPEG', thumbX, currentY, thumbWidth, thumbHeight);
          } catch {
            doc.setFillColor(226, 232, 240);
            doc.rect(thumbX, currentY, thumbWidth, thumbHeight, 'F');
          }
        } else {
          doc.setFillColor(226, 232, 240);
          doc.rect(thumbX, currentY, thumbWidth, thumbHeight, 'F');
        }
      }
      currentY += thumbHeight + 7;
    }

    // Features / Highlights Line
    if (prop.features && prop.features.length > 0) {
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('DIFERENCIAIS:', 15, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const featText = prop.features.join(' • ');
      const featLines = doc.splitTextToSize(featText, 150);
      doc.text(featLines.slice(0, 2), 40, currentY);
      currentY += (Math.min(featLines.length, 2) * 4) + 4;
    }

    // ==========================================
    // FOOTER CALL TO ACTION & INTERACTIVE BUTTONS
    // ==========================================
    const propertyPublicUrl = `${baseUrl}/imovel/${prop.code}`;
    
    // Build WhatsApp URL from the captador's WhatsApp configuration saved in profile settings
    let whatsappDirectUrl = '';
    const userWa = (captador.whatsapp || captador.phone || companySettings.whatsapp || companySettings.phone || '').trim();
    const waMsg = encodeURIComponent(`Olá ${captador.name}! Tenho interesse no imóvel "${prop.title}" (Código: ${prop.code}) do catálogo Lopes Manaus.`);
    
    if (userWa.startsWith('http://') || userWa.startsWith('https://')) {
      whatsappDirectUrl = userWa;
      if ((userWa.includes('wa.me') || userWa.includes('api.whatsapp.com')) && !userWa.includes('text=')) {
        const sep = userWa.includes('?') ? '&' : '?';
        whatsappDirectUrl = `${userWa}${sep}text=${waMsg}`;
      }
    } else if (userWa.startsWith('wa.me/')) {
      const fullUrl = `https://${userWa}`;
      if (!fullUrl.includes('text=')) {
        const sep = fullUrl.includes('?') ? '&' : '?';
        whatsappDirectUrl = `${fullUrl}${sep}text=${waMsg}`;
      } else {
        whatsappDirectUrl = fullUrl;
      }
    } else {
      let cleanPhone = userWa.replace(/\D/g, '');
      if (!cleanPhone.startsWith('55') && (cleanPhone.length === 10 || cleanPhone.length === 11)) {
        cleanPhone = `55${cleanPhone}`;
      }
      whatsappDirectUrl = `https://wa.me/${cleanPhone || '5592981234567'}?text=${waMsg}`;
    }

    // Footer Box
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
    doc.text(`WhatsApp: ${captador.whatsapp || captador.phone}`, 22, 258);

    // --- INTERACTIVE BUTTON 1: "Ver detalhes completos" ---
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
    doc.text('Página pública do imóvel', btn1X + (btn1W / 2), btn1Y + 14, { align: 'center' });

    // Attach Clickable Hyperlink Annotation
    doc.link(btn1X, btn1Y, btn1W, btn1H, { url: propertyPublicUrl });

    // --- INTERACTIVE BUTTON 2: "Tenho interesse" ---
    const btn2X = 86;
    const btn2Y = 264;
    const btn2W = 55;
    const btn2H = 18;

    doc.setFillColor(241, 15, 77); // Lopes Red Button
    doc.roundedRect(btn2X, btn2Y, btn2W, btn2H, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Tenho interesse', btn2X + (btn2W / 2), btn2Y + 10, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(254, 242, 242);
    doc.text('Abrir no WhatsApp', btn2X + (btn2W / 2), btn2Y + 14, { align: 'center' });

    // Attach Clickable Hyperlink Annotation
    doc.link(btn2X, btn2Y, btn2W, btn2H, { url: whatsappDirectUrl });

    // Property QR Code inside Footer (Right side)
    const propertyQrCode = await generateQRCodeDataUrl(propertyPublicUrl, '#F10F4D');
    if (propertyQrCode) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.rect(148, 246, 40, 40, 'F');
        doc.addImage(propertyQrCode, 'PNG', 150, 248, 36, 36);
      } catch {
        // ignore QR error
      }
    }
  }

  return doc;
}
