import { Property, User, CompanySettings } from '../types';
import { formatCurrencyBRL } from './priceUtils';
import { getPropertyMainImage } from './imageUtils';

/**
 * Loads an image from a URL as an HTMLImageElement with crossOrigin set.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without CORS if CORS fails
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (e) => reject(e);
      fallbackImg.src = src;
    };
    img.src = src;
  });
}

/**
 * Generates an Instagram/Social Media post image (1080x1350 vertical/feed format)
 * with the property's main photo, title, price, key features, and captador branding,
 * and automatically initiates a browser download.
 */
export async function generateAndDownloadSocialMedia(
  property: Property,
  captador: User,
  companySettings: CompanySettings
): Promise<void> {
  const canvas = document.createElement('canvas');
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível inicializar o canvas 2D.');
  }

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Load Main Property Image
  const mainImageUrl = getPropertyMainImage(property);
  try {
    const propImg = await loadImage(mainImageUrl);
    // Draw Property Image in top/mid section (0 to 800)
    const imgHeight = 820;
    // Cover fit
    const imgAspect = propImg.width / propImg.height;
    const targetAspect = width / imgHeight;
    let renderW = width;
    let renderH = imgHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > targetAspect) {
      renderW = imgHeight * imgAspect;
      offsetX = (width - renderW) / 2;
    } else {
      renderH = width / imgAspect;
      offsetY = (imgHeight - renderH) / 2;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, imgHeight);
    ctx.clip();
    ctx.drawImage(propImg, offsetX, offsetY, renderW, renderH);

    // Gradient overlay at bottom of photo
    const grad = ctx.createLinearGradient(0, imgHeight - 200, 0, imgHeight);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0)');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, imgHeight - 200, width, 200);
    ctx.restore();
  } catch (e) {
    console.warn('Could not load property image on canvas:', e);
  }

  // Top header bar / Status Badge
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(40, 40, 360, 60);
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(40, 40, 8, 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`${property.purpose.toUpperCase()} • ${property.code}`, 65, 78);

  // Category Tag on right
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(width - 240, 40, 200, 60);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(property.category.substring(0, 16), width - 140, 78);
  ctx.textAlign = 'left';

  // Lower Content Area (y = 820 to 1350)
  const contentY = 850;

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  const title = property.title.length > 36 ? property.title.substring(0, 34) + '...' : property.title;
  ctx.fillText(title, 50, contentY);

  // Neighborhood & City
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 28px sans-serif';
  ctx.fillText(`${property.neighborhood || 'Excelente Localização'} • ${property.city || 'Manaus'}, ${property.state || 'AM'}`, 50, contentY + 45);

  // Price Card
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(50, contentY + 75, 460, 95, 16);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(property.purpose === 'Locação' ? 'VALOR DA LOCAÇÃO' : 'VALOR DE VENDA', 75, contentY + 110);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 38px sans-serif';
  const priceValue = property.purpose === 'Locação' && property.rent_price ? property.rent_price : property.price;
  ctx.fillText(formatCurrencyBRL(priceValue) + (property.purpose === 'Locação' ? '/mês' : ''), 75, contentY + 152);

  // Specs Badges (Bedrooms, Suites, Bathrooms, Parking, Area)
  const specs = [
    property.bedrooms ? `${property.bedrooms} Qts` : null,
    property.suites ? `${property.suites} Suítes` : null,
    property.parking_spaces ? `${property.parking_spaces} Vagas` : null,
    property.total_area || property.built_area ? `${property.total_area || property.built_area} m²` : null
  ].filter(Boolean) as string[];

  let specX = 530;
  specs.slice(0, 3).forEach((spec) => {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(specX, contentY + 75, 145, 95, 16);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(spec, specX + 72, contentY + 130);
    ctx.textAlign = 'left';
    specX += 160;
  });

  // Divider line
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 1080);
  ctx.lineTo(width - 50, 1080);
  ctx.stroke();

  // Captador & Company Footer
  // Load captador photo if exists
  if (captador.photo_url) {
    try {
      const capImg = await loadImage(captador.photo_url);
      ctx.save();
      ctx.beginPath();
      ctx.arc(110, 1190, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(capImg, 60, 1140, 100, 100);
      ctx.restore();
    } catch {}
  }

  // Captador Details
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(captador.name, 180, 1175);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(captador.phone || captador.whatsapp || companySettings.phone || '', 180, 1215);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 20px sans-serif';
  ctx.fillText(captador.creci ? `CRECI: ${captador.creci}` : (companySettings.company_name || 'Lopes Manaus'), 180, 1250);

  // Lopes Logo or Brand watermark on bottom right
  ctx.fillStyle = '#f43f5e';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(companySettings.company_name || 'LOPES MANAUS', width - 50, 1185);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 20px sans-serif';
  ctx.fillText(companySettings.unit_name || 'Shopping Ponta Negra', width - 50, 1220);
  ctx.fillText(companySettings.creci_j ? `CRECI PJ ${companySettings.creci_j}` : '', width - 50, 1250);
  ctx.textAlign = 'left';

  // Export to Blob and download
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `post-${property.code || 'imovel'}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      resolve();
    }, 'image/png');
  });
}
