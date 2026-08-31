import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Download,
  Loader2,
  RefreshCw,
  Instagram,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Smartphone
} from 'lucide-react';
import { Property, CompanySettings } from '../types';
import { extractPropertyImages } from '../lib/pdfGenerator';
import { formatCurrencyBRL } from '../lib/priceUtils';
import {
  PostTemplateId,
  POST_TEMPLATES_CONFIG
} from './postTemplates';
import { CanvasPostLivePreview } from './CanvasPostLivePreview';
import { generatePostImage } from '../lib/socialMediaGenerator';

interface AIPostGeneratorModalProps {
  property: Property | null;
  companySettings: CompanySettings;
  isOpen: boolean;
  onClose: () => void;
}

export const AIPostGeneratorModal: React.FC<AIPostGeneratorModalProps> = ({
  property,
  companySettings,
  isOpen,
  onClose
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplateId>('feed_venda');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [caption, setCaption] = useState<string>('');
  const [isLoadingCaption, setIsLoadingCaption] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Ref and state for proportional preview container scale
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [containerScale, setContainerScale] = useState<number>(0.3);

  // Auto-selection of template & reset photo index on open
  useEffect(() => {
    if (isOpen && property) {
      if (property.purpose === 'Locação') {
        setSelectedTemplate('feed_aluguel');
      } else {
        setSelectedTemplate('feed_venda');
      }
      setSelectedPhotoIndex(0);
      fetchCaption();
    } else {
      setCaption('');
      setCopied(false);
    }
  }, [isOpen, property]);

  const images = property ? extractPropertyImages(property) : [];
  const defaultFallbackImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
  const photoUrl = images[selectedPhotoIndex] || images[0] || defaultFallbackImage;

  // Safe fallback if selected template is invalid
  const currentTemplateConfig = POST_TEMPLATES_CONFIG.find(t => t.id === selectedTemplate) || POST_TEMPLATES_CONFIG[0];
  const templateWidth = currentTemplateConfig.width;
  const templateHeight = currentTemplateConfig.height;

  // Calculate dynamic proportional scale based on the available container dimensions
  useEffect(() => {
    if (!isOpen) return;

    const updateScale = () => {
      if (!previewContainerRef.current) return;
      const { clientWidth, clientHeight } = previewContainerRef.current;
      if (clientWidth <= 0 || clientHeight <= 0) return;

      // Available space with a safe 24px internal margin
      const availableW = clientWidth - 24;
      const availableH = clientHeight - 24;

      const scaleW = availableW / templateWidth;
      const scaleH = availableH / templateHeight;
      const calculatedScale = Math.min(scaleW, scaleH);

      // Bound between 0.1 and 1.0
      setContainerScale(Math.max(0.1, Math.min(calculatedScale, 1.0)));
    };

    updateScale();

    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });

    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }

    window.addEventListener('resize', updateScale);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [isOpen, selectedTemplate, templateWidth, templateHeight]);

  if (!isOpen || !property) return null;

  const fetchCaption = async () => {
    setIsLoadingCaption(true);
    try {
      const response = await fetch('/api/social-media/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property,
          companySettings
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.caption) {
          setCaption(data.caption);
          return;
        }
      }
      throw new Error('Falha ao obter legenda');
    } catch (err) {
      // Fallback local caption if backend call fails
      const title = property.title || 'Oportunidade Exclusiva';
      const neighborhood = property.neighborhood || 'Manaus';
      const purpose = property.purpose || 'Venda';
      const priceText = formatCurrencyBRL(property.price || property.rent_price || 0);

      const fallback = `${title.toUpperCase()}\n\n📍 Localização privilegiada em ${neighborhood}, Manaus.\n🏷️ ${purpose.toUpperCase()}: ${priceText}\n\n🏡 Destaques do imóvel:\n• ${property.bedrooms || '-'} Quartos (${property.suites || '-'} Suítes)\n• ${property.bathrooms || '-'} Banheiros\n• ${property.parking_spaces || '-'} Vagas de Garagem\n• ${property.total_area || property.built_area || '-'}m² de área\n\n📲 Gostou? Entre em contato agora mesmo via WhatsApp e agende uma visita exclusiva com nossos consultores!\n\n#LopesManaus #ImoveisManaus #ImobiliariaManaus #${neighborhood.replace(/\s+/g, '')} #ImovelDeAltoPadrao`;
      setCaption(fallback);
    } finally {
      setIsLoadingCaption(false);
    }
  };

  const handleCopyCaption = async () => {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Erro ao copiar texto:', err);
    }
  };

  const handleDownloadImage = async () => {
    if (!property) return;
    setIsDownloading(true);
    try {
      const code = property.code || property.id || 'imovel';
      let canvas = liveCanvasRef.current;
      if (!canvas) {
        canvas = await generatePostImage(property, companySettings, selectedTemplate, photoUrl);
      }
      const url = canvas.toDataURL('image/png', 0.95);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${code}_${selectedTemplate}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Erro ao baixar arte:', err);
      alert('Não foi possível gerar o arquivo de imagem no momento.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!property) return;
    const title = property.title || 'Imóvel Exclusivo';
    const code = property.code ? ` (Cód: ${property.code})` : '';
    const neighborhood = property.neighborhood ? ` em ${property.neighborhood}` : '';
    const city = property.city ? `, ${property.city}` : '';
    const phone = companySettings.whatsapp || companySettings.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');

    const message = `*Confira este imóvel na Lopes Manaus!* 🏡\n\n*${title}*${code}\n📍 Localização: ${neighborhood}${city}\n\n📲 Fale conosco para agendar sua visita:\n${phone || 'Consulte nosso time'}`;
    const encoded = encodeURIComponent(message);
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePrevPhoto = () => {
    if (images.length <= 1) return;
    setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextPhoto = () => {
    if (images.length <= 1) return;
    setSelectedPhotoIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const renderedPreviewWidth = Math.round(templateWidth * containerScale);
  const renderedPreviewHeight = Math.round(templateHeight * containerScale);

  return (
    <div
      id="ai-post-generator-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        id="ai-post-generator-modal-card"
        className="bg-white rounded-3xl max-w-6xl w-full h-[94vh] shadow-2xl border border-slate-200 relative flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Fixed) */}
        <div className="shrink-0 px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F10F4D] to-[#99002B] flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                Gerador de Post para Redes Sociais com IA
              </h2>
              <p className="text-[11px] text-slate-500">
                Visualização fiel com motor idêntico ao PNG exportado
              </p>
            </div>
          </div>
          <button
            id="btn-close-ai-post-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Fixed 2 Columns Layout (No full-modal vertical scrolling) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
          {/* Left Column: Fixed Artboard Preview with Exact Proportional Scaling */}
          <div className="lg:col-span-6 bg-slate-950 p-4 flex flex-col justify-between items-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
            {/* Top Bar of Left Column: Template Indicator */}
            <div className="w-full shrink-0 flex items-center justify-between px-2 py-1 bg-slate-900/90 rounded-xl border border-slate-800 mb-2">
              <div className="flex items-center gap-2">
                <Instagram className="w-3.5 h-3.5 text-[#F10F4D]" />
                <span className="text-xs font-bold text-white">
                  {currentTemplateConfig.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {templateWidth} × {templateHeight} px
                </span>
                <span className="text-[10px] font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 rounded">
                  {Math.round(containerScale * 100)}% escala
                </span>
              </div>
            </div>

            {/* Centered Preview Canvas Box */}
            <div
              ref={previewContainerRef}
              className="w-full flex-1 min-h-0 flex items-center justify-center relative overflow-hidden"
            >
              <CanvasPostLivePreview
                property={property}
                companySettings={companySettings}
                templateId={selectedTemplate}
                photoUrl={photoUrl}
                width={templateWidth}
                height={templateHeight}
                scale={containerScale}
                onCanvasReady={(canvas) => {
                  liveCanvasRef.current = canvas;
                }}
              />
            </div>

            {/* Bottom Actions of Left Column */}
            <div className="w-full shrink-0 grid grid-cols-2 gap-2 pt-2 mt-1">
              <button
                type="button"
                id="btn-baixar-post-png"
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="py-2.5 px-3 rounded-xl bg-[#F10F4D] hover:bg-[#d40d43] text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-rose-900/40 transition transform active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Renderizando...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span className="truncate">Baixar {currentTemplateConfig.name.split(' (')[0]}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-compartilhar-whatsapp-post"
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-900/40 transition transform active:scale-98 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="truncate">WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Right Column: Controls, Photo Selector & Caption Area */}
          <div className="lg:col-span-6 bg-white p-5 flex flex-col justify-between min-h-0 overflow-y-auto space-y-4">
            {/* 1. Template Selector Cards */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                1. Escolha o Formato do Post:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {POST_TEMPLATES_CONFIG.map((config) => {
                  const isSelected = selectedTemplate === config.id;
                  let icon = '🏠';
                  let shortDesc = 'Venda';
                  if (config.id === 'feed_aluguel') {
                    icon = '🔑';
                    shortDesc = 'Locação';
                  } else if (config.id === 'story') {
                    icon = '📱';
                    shortDesc = 'Story 9:16';
                  } else if (config.id === 'carrossel_capa') {
                    icon = '📑';
                    shortDesc = 'Carrossel';
                  }

                  return (
                    <button
                      key={config.id}
                      type="button"
                      id={`template-btn-${config.id}`}
                      onClick={() => setSelectedTemplate(config.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#F10F4D] to-[#99002B] border-[#F10F4D] text-white shadow-md scale-[1.01]'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm">{icon}</span>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {config.width}x{config.height}
                        </span>
                      </div>
                      <div>
                        <div className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {config.name.split(' (')[0]}
                        </div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-rose-100' : 'text-slate-500'}`}>
                          {shortDesc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Photo Selector */}
            {images.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#F10F4D]" />
                    2. Escolha a Foto em Destaque:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#F10F4D] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                      Foto {selectedPhotoIndex + 1} de {images.length}
                    </span>
                    {images.length > 1 && (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={handlePrevPhoto}
                          className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          title="Foto anterior"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextPhoto}
                          className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          title="Próxima foto"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPhotoIndex(idx)}
                      className={`relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                        selectedPhotoIndex === idx
                          ? 'border-[#F10F4D] ring-2 ring-[#F10F4D]/30 scale-105 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {selectedPhotoIndex === idx && (
                        <div className="absolute inset-0 bg-[#F10F4D]/20 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. AI Caption & Copywriting Area */}
            <div className="flex-1 min-h-0 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    3. Legenda e Hashtags (IA Gemini):
                  </h3>
                </div>

                <button
                  id="btn-regenerar-legenda"
                  onClick={fetchCaption}
                  disabled={isLoadingCaption}
                  className="text-[11px] font-semibold text-slate-600 hover:text-[#F10F4D] flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition cursor-pointer disabled:opacity-50"
                  title="Gerar nova versão da legenda"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingCaption ? 'animate-spin text-[#F10F4D]' : ''}`} />
                  <span>Regenerar</span>
                </button>
              </div>

              {/* Textarea / Caption Box */}
              <div className="flex-1 min-h-[140px] bg-slate-50 rounded-xl border border-slate-200 p-3 font-sans text-xs text-slate-800 leading-relaxed whitespace-pre-wrap shadow-inner overflow-y-auto">
                {isLoadingCaption ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-2 py-8 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin text-[#F10F4D]" />
                    <p className="text-xs font-medium">A IA está criando uma legenda persuasiva...</p>
                  </div>
                ) : (
                  caption || 'Nenhuma legenda gerada ainda.'
                )}
              </div>

              {/* Action Bar for Copywriting */}
              <div className="flex items-center justify-between gap-2 shrink-0 pt-1">
                <span className="text-[11px] text-slate-500">
                  {caption ? `${caption.length} caracteres gerados` : ''}
                </span>

                <button
                  id="btn-copiar-legenda"
                  onClick={handleCopyCaption}
                  disabled={isLoadingCaption || !caption}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition transform active:scale-95 cursor-pointer disabled:opacity-50 ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Legenda</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPostGeneratorModal;


