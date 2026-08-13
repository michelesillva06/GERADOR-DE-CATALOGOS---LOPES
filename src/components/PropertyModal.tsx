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
  DollarSign,
  User as UserIcon
} from 'lucide-react';
import { generateQRCodeDataUrl } from '../lib/qrCode';
import { generateCatalogPDF } from '../lib/pdfGenerator';
import { buildWhatsAppUrl, formatPhoneDisplay, getEffectiveWhatsApp } from '../lib/whatsapp';
import { getPropertyImages, handleImageError } from '../lib/imageUtils';
import { getPropertyPriceInfo, formatCurrencyBRL } from '../lib/priceUtils';

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
      const url = `${window.location.origin}/imovel/${property.id}`;
      generateQRCodeDataUrl(url, '#F10F4D').then(setQrCodeUrl);
    }
  }, [property, captador]);

  if (!property) return null;

  const formatPrice = (val: number) => {
    if (!val || val === 0) return 'Sob Consulta';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const images = getPropertyImages(property);

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const effectivePhone = getEffectiveWhatsApp(captador, companySettings);
  const whatsappMsg = `Olá ${captador?.name || 'Lopes Captação'}! Gostaria de mais informações e agendar uma visita para o imóvel "${property.title}".`;
  const whatsappUrl = buildWhatsAppUrl(effectivePhone, whatsappMsg);

  const handleDownloadPdf = async () => {
    if (!captador) return;
    setIsGeneratingPdf(true);
    try {
      const doc = await generateCatalogPDF({
        title: `Imóvel - ${property.title}`,
        properties: [property],
        captador,
        companySettings: companySettings || {
          company_name: 'Lopes Captação',
          unit_name: 'Unidade Manaus',
          logo_url: '/lopes-logo.svg',
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
      doc.save(`Imovel_${property.title.replace(/\s+/g, '_')}_Lopes.pdf`);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar o PDF do imóvel.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 relative flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Gallery Slideshow */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center">
          <img
            src={images[activeImageIndex]}
            alt={property.title}
            onError={handleImageError}
            className="w-full h-full object-cover"
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white transition shadow-lg border border-white/20 backdrop-blur-md"
                title="Foto anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white transition shadow-lg border border-white/20 backdrop-blur-md"
                title="Próxima foto"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-3 right-3 bg-slate-950/80 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md border border-white/20 shadow">
                {activeImageIndex + 1} de {images.length}
              </div>
            </>
          )}

          {/* Badges Overlay */}
          <div className="absolute bottom-3 left-3 flex items-center space-x-2">
            <span className="bg-[#F10F4D] text-white text-xs font-extrabold px-3 py-1 rounded-lg shadow">
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

        {/* Thumbnails Row below main image */}
        {images.length > 1 && (
          <div className="p-3 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 ${
                    activeImageIndex === idx
                      ? 'border-[#F10F4D] ring-2 ring-[#F10F4D]/40 scale-105'
                      : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} onError={handleImageError} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Title & Price */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#F10F4D]" />
                <span>{property.neighborhood}, {property.city} - {property.state}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{property.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{property.address}</p>
            </div>

            <div className="text-left md:text-right shrink-0 bg-rose-50 p-3.5 rounded-2xl border border-rose-100">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                {getPropertyPriceInfo(property).isBoth
                  ? 'Venda / Locação'
                  : getPropertyPriceInfo(property).isRent
                  ? 'Valor de Locação'
                  : 'Valor de Venda'}
              </span>
              <span className="text-2xl font-black text-[#F10F4D]">
                {getPropertyPriceInfo(property).primaryFormatted}
              </span>
              {getPropertyPriceInfo(property).isBoth && getPropertyPriceInfo(property).rentPrice > 0 && getPropertyPriceInfo(property).salePrice > 0 && (
                <div className="text-xs font-bold text-slate-700 mt-0.5">
                  Locação: {getPropertyPriceInfo(property).rentFormatted}
                </div>
              )}
              <div className="text-[11px] text-slate-500 mt-0.5">
                <span>Cond: {formatCurrencyBRL(property.condo_fee)}</span> • <span>IPTU: {formatCurrencyBRL(property.iptu)}</span>
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

          {/* Client Buyer / Tenant details if registered */}
          {(property.client_name || property.client_phone || property.client_email) && (
            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Cliente {property.client_type || (property.status === 'Alugado' ? 'Inquilino / Locatário' : 'Comprador')} Cadastrado
                </span>
                {property.transaction_date && (
                  <span className="text-[11px] font-bold text-slate-500">
                    Data: {new Date(property.transaction_date).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Nome do Cliente</span>
                  <p className="font-extrabold text-slate-900">{property.client_name || '-'}</p>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">CPF / CNPJ</span>
                  <p className="font-mono font-semibold text-slate-800">{property.client_cpf_cnpj || '-'}</p>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Telefone / WhatsApp</span>
                  <p className="font-semibold text-slate-800">{property.client_phone || '-'}</p>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">E-mail</span>
                  <p className="font-semibold text-slate-800">{property.client_email || '-'}</p>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Valor do Negócio Fechado</span>
                  <p className="font-black text-emerald-700">
                    {property.transaction_value
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.transaction_value)
                      : '-'}
                  </p>
                </div>

                {property.transaction_notes && (
                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Observações do Negócio</span>
                    <p className="font-medium text-slate-700 italic">{property.transaction_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Captador Contact Card & QR Code */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 shadow-2xl border border-slate-800">
            {captador ? (
              <div className="flex items-center space-x-4 w-full md:w-auto">
                {captador.photo_url ? (
                  <img
                    src={captador.photo_url}
                    alt={captador.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#F10F4D] shadow-lg shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-[#F10F4D] flex items-center justify-center shrink-0">
                    <UserIcon className="w-8 h-8 text-rose-400" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold text-[#F10F4D] uppercase tracking-wider bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                      Captador Responsável
                    </span>
                    {captador.creci && (
                      <span className="text-[10px] font-mono text-slate-400">CRECI: {captador.creci}</span>
                    )}
                  </div>
                  <h4 className="text-base font-extrabold text-white">{captador.name}</h4>
                  <p className="text-xs text-rose-300 font-semibold">{captador.position || 'Consultor Imobiliário'}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 pt-1 font-medium">
                    <div className="flex items-center space-x-1 text-emerald-400 font-bold">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatPhoneDisplay(effectivePhone)}</span>
                    </div>
                    {captador.instagram && (
                      <span className="text-slate-400 text-[11px] font-mono">@{captador.instagram.replace(/^@/, '')}</span>
                    )}
                    {captador.email && (
                      <span className="text-slate-400 text-[11px] truncate max-w-[180px]">{captador.email}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-[#F10F4D] flex items-center justify-center font-bold">
                  L
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Lopes Captação</h4>
                  <p className="text-xs text-emerald-400 font-bold">{formatPhoneDisplay(effectivePhone)}</p>
                </div>
              </div>
            )}

            {/* QR Code & Phone Card */}
            {qrCodeUrl && (
              <div className="flex items-center space-x-3 bg-white p-2.5 rounded-2xl text-slate-900 shrink-0 shadow-lg border border-slate-200">
                <img src={qrCodeUrl} alt="QR Code Imóvel" className="w-16 h-16 rounded-lg object-contain" />
                <div className="text-left space-y-0.5">
                  <div className="flex items-center space-x-1 text-[10px] font-extrabold text-[#F10F4D] uppercase">
                    <QrIcon className="w-3.5 h-3.5" />
                    <span>QR Code do Imóvel</span>
                  </div>
                  <p className="text-[11px] font-black text-slate-900">{formatPhoneDisplay(effectivePhone)}</p>
                  <p className="text-[9px] text-slate-500 font-medium">Acesse a ficha completa</p>
                </div>
              </div>
            )}
          </div>

          {/* Action CTAs Bottom Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <a
              href={`/imovel/${property.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-2 transition border border-slate-300"
            >
              <Share2 className="w-4 h-4 text-[#F10F4D]" />
              <span>Ver Página Pública</span>
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
