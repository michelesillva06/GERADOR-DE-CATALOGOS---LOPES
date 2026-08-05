import React, { useState, useEffect } from 'react';
import { Property, User, CompanySettings } from '../types';
import {
  X,
  MapPin,
  Bed,
  Bath,
  Car,
  Maximize,
  CheckCircle2,
  Share2,
  FileSpreadsheet,
  MessageCircle,
  QrCode as QrIcon,
  ChevronLeft,
  ChevronRight,
  Phone,
  Building,
  DollarSign
} from 'lucide-react';
import { generateQRCodeDataUrl } from '../lib/qrCode';
import { generateCatalogPDF } from '../lib/pdfGenerator';

interface PropertyModalProps {
  property: Property | null;
  captador?: User | null;
  companySettings?: CompanySettings;
  onClose: () => void;
}

export const PropertyModal: React.FC<PropertyModalProps> = ({
  property,
  captador,
  companySettings,
  onClose
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (property) {
      setActiveImageIndex(0);
      const url = `${window.location.origin}/catalogo/${captador?.url_slug || 'lopes'}?code=${property.code}`;
      generateQRCodeDataUrl(url, '#F10F4D').then(setQrCodeUrl);
    }
  }, [property, captador]);

  if (!property) return null;

  const formatPrice = (val: number) => {
    if (!val || val === 0) return 'Sob Consulta';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const images = property.images && property.images.length > 0 ? property.images : [property.main_image];

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const whatsappRaw = captador?.whatsapp || captador?.phone || companySettings?.whatsapp || '5592981234567';
  const whatsappMsg = encodeURIComponent(
    `Olá ${captador?.name || 'Lopes Manaus'}! Gostaria de mais informações e agendar uma visita para o imóvel Cód: ${property.code} - ${property.title}.`
  );
  let whatsappUrl = '';
  if (whatsappRaw.startsWith('http://') || whatsappRaw.startsWith('https://')) {
    whatsappUrl = whatsappRaw;
  } else if (whatsappRaw.startsWith('wa.me/')) {
    whatsappUrl = `https://${whatsappRaw}`;
  } else {
    let cleanWa = whatsappRaw.replace(/\D/g, '');
    if (!cleanWa.startsWith('55') && (cleanWa.length === 10 || cleanWa.length === 11)) {
      cleanWa = `55${cleanWa}`;
    }
    whatsappUrl = `https://wa.me/${cleanWa}?text=${whatsappMsg}`;
  }

  const handleDownloadPdf = async () => {
    if (!captador) return;
    setIsGeneratingPdf(true);
    try {
      const doc = await generateCatalogPDF({
        title: `Imóvel Cód. ${property.code} - Lopes Manaus`,
        properties: [property],
        captador,
        companySettings: companySettings || {
          company_name: 'Lopes Manaus',
          unit_name: 'Unidade Manaus',
          logo_url: '',
          primary_color: '#F10F4D',
          phone: '(92) 3659-1000',
          whatsapp: '5592981234567',
          email: 'contato@lopesmanaus.com.br',
          address: 'Manaus - AM',
          city: 'Manaus',
          state: 'AM',
          instagram: '@lopesmanaus',
          creci_j: '540-J/AM'
        }
      });
      doc.save(`Imovel_${property.code}_LopesManaus.pdf`);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar o PDF do imóvel.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 relative flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Gallery Slideshow */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-slate-900 overflow-hidden shrink-0">
          <img
            src={images[activeImageIndex]}
            alt={property.title}
            className="w-full h-full object-cover"
          />

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-3 right-3 bg-slate-900/80 text-white text-xs font-semibold px-2.5 py-1 rounded-lg backdrop-blur">
                {activeImageIndex + 1} / {images.length}
              </div>
            </>
          )}

          {/* Badges Overlay */}
          <div className="absolute bottom-3 left-3 flex items-center space-x-2">
            <span className="bg-[#F10F4D] text-white text-xs font-bold px-3 py-1 rounded-lg shadow">
              {property.purpose}
            </span>
            <span className="bg-slate-900/90 text-white text-xs font-semibold px-3 py-1 rounded-lg border border-slate-700">
              {property.category}
            </span>
            <span className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 rounded-lg shadow-md border border-emerald-700">
              {property.status}
            </span>
          </div>
        </div>

        {/* Thumbnails row if multiple images */}
        {images.length > 1 && (
          <div className="flex space-x-2 p-3 bg-slate-100 overflow-x-auto border-b border-slate-200">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                  activeImageIndex === idx ? 'border-[#F10F4D] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="Thumb" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Title & Price */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-1">
                <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">{property.code}</span>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5 text-[#F10F4D]" />
                <span>{property.neighborhood}, {property.city} - {property.state}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{property.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{property.address}</p>
            </div>

            <div className="text-left md:text-right shrink-0 bg-rose-50 p-3.5 rounded-2xl border border-rose-100">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Valor de Investimento</span>
              <span className="text-2xl font-black text-[#F10F4D]">
                {property.purpose.includes('Locação') && property.rent_price
                  ? `${formatPrice(property.rent_price)} /mês`
                  : formatPrice(property.price)}
              </span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                <span>Cond: {formatPrice(property.condo_fee)}</span> • <span>IPTU: {formatPrice(property.iptu)}</span>
              </div>
            </div>
          </div>

          {/* Specs Grid Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <Maximize className="w-5 h-5 text-[#F10F4D] mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 uppercase font-bold">Área Total</p>
              <p className="text-sm font-black text-slate-800">{property.total_area || property.built_area} m²</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <Bed className="w-5 h-5 text-[#F10F4D] mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 uppercase font-bold">Quartos / Suítes</p>
              <p className="text-sm font-black text-slate-800">{property.bedrooms} ({property.suites} suítes)</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <Bath className="w-5 h-5 text-[#F10F4D] mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 uppercase font-bold">Banheiros</p>
              <p className="text-sm font-black text-slate-800">{property.bathrooms}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <Car className="w-5 h-5 text-[#F10F4D] mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 uppercase font-bold">Vagas de Garagem</p>
              <p className="text-sm font-black text-slate-800">{property.parking_spaces}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Descrição Completa</h4>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {property.description}
            </p>
          </div>

          {/* Features Checklist */}
          {property.features && property.features.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Características & Diferenciais</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {property.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-[#F10F4D] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Captador Contact Card & QR Code */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            {captador && (
              <div className="flex items-center space-x-4">
                {captador.photo_url ? (
                  <img
                    src={captador.photo_url}
                    alt={captador.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#F10F4D] shadow"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-[#F10F4D] flex items-center justify-center text-white font-extrabold text-lg shadow shrink-0">
                    {captador.name ? captador.name.charAt(0).toUpperCase() : 'C'}
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold">Captador Responsável</p>
                  <h4 className="text-base font-extrabold text-white">{captador.name}</h4>
                  <p className="text-xs text-rose-400 font-semibold">{captador.position}</p>
                  <p className="text-xs text-slate-300 mt-1">{captador.phone || captador.whatsapp}</p>
                </div>
              </div>
            )}

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex flex-col items-center bg-white p-2 rounded-xl text-slate-900 shrink-0">
                <img src={qrCodeUrl} alt="QR Code Imóvel" className="w-20 h-20" />
                <span className="text-[9px] font-bold text-slate-500 mt-1">Escaneie para acessar</span>
              </div>
            )}
          </div>

          {/* Action CTAs Bottom Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <a
              href={`/imovel/${property.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-2 transition border border-slate-300"
            >
              <Share2 className="w-4 h-4 text-[#F10F4D]" />
              <span>Ver Página Pública (/imovel/{property.code})</span>
            </a>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition border border-slate-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#F10F4D]" />
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar Catálogo PDF'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/30 transition transform active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Solicitar Visita via WhatsApp</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};
