import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Download,
  Loader2,
  Instagram,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Sliders,
  Layers,
  FileCheck
} from 'lucide-react';
import { Property, CompanySettings } from '../types';
import { extractPropertyImages } from '../lib/pdfGenerator';
import { formatCurrencyBRL } from '../lib/priceUtils';
import {
  PostTemplateId,
  POST_TEMPLATES_CONFIG
} from './postTemplates';
import { CanvasPostLivePreview } from './CanvasPostLivePreview';
import { generatePostImage, generateAndDownloadSocialMedia } from '../lib/socialMediaGenerator';
import { CanvasPostData } from '../lib/canvasPostEngine';

interface AIPostGeneratorModalProps {
  property: Property | null;
  companySettings: CompanySettings;
  isOpen: boolean;
  onClose: () => void;
  allProperties?: Property[];
  onSelectProperty?: (property: Property) => void;
}

export const AIPostGeneratorModal: React.FC<AIPostGeneratorModalProps> = ({
  property,
  companySettings,
  isOpen,
  onClose
}) => {
  const [currentProperty, setCurrentProperty] = useState<Property | null>(property);
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplateId>('feed_vertical');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);

  // Canvas Live Overrides derived strictly from Property fields
  const [postData, setPostData] = useState<CanvasPostData>({
    headlineLine1: '',
    headlineLine2: '',
    highlightNumber: '',
    statusTag: 'VENDA',
    subStatus: 'EXCLUSIVO',
    priceFormatted: '',
    locationTag: '',
    specs: []
  });

  const [caption, setCaption] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isDownloadingPack, setIsDownloadingPack] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mobile view tab state ('preview' | 'edit')
  const [mobileTab, setMobileTab] = useState<'preview' | 'edit'>('preview');

  // Ref and state for proportional preview container scale
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [containerScale, setContainerScale] = useState<number>(0.3);

  // Sync currentProperty when prop changes
  useEffect(() => {
    if (property) {
      setCurrentProperty(property);
    }
  }, [property]);

  // Helper to extract real property specifications directly from property record
  const buildPropertySpecsFromProperty = (p: Property): Array<{ icon: string; label: string }> => {
    const specs: Array<{ icon: string; label: string }> = [];

    const bedrooms = p.bedrooms || 0;
    if (bedrooms > 0) {
      specs.push({ icon: 'bed', label: `${bedrooms} ${bedrooms === 1 ? 'QUARTO' : 'QUARTOS'}` });
    }

    const bathrooms = p.bathrooms || 0;
    if (bathrooms > 0) {
      specs.push({ icon: 'bath', label: `${bathrooms} ${bathrooms === 1 ? 'BANHEIRO' : 'BANHEIROS'}` });
    }

    const parking = p.parking_spaces || 0;
    if (parking > 0) {
      specs.push({ icon: 'car', label: `${parking} ${parking === 1 ? 'VAGA' : 'VAGAS'}` });
    }

    const area = p.total_area || p.built_area || p.usable_area || 0;
    if (area > 0) {
      specs.push({ icon: 'area', label: `${area} m²` });
    }

    const suites = p.suites || 0;
    if (suites > 0 && specs.length < 4) {
      specs.push({ icon: 'bed', label: `${suites} ${suites === 1 ? 'SUÍTE' : 'SUÍTES'}` });
    }

    if (p.features && Array.isArray(p.features)) {
      for (const feat of p.features) {
        if (specs.length >= 4) break;
        const f = feat.toLowerCase();
        if (f.includes('piscina') && !specs.some(s => s.icon === 'piscina')) {
          specs.push({ icon: 'piscina', label: 'PISCINA' });
        } else if ((f.includes('churras') || f.includes('gourmet')) && !specs.some(s => s.icon === 'churrasqueira')) {
          specs.push({ icon: 'churrasqueira', label: 'CHURRASQUEIRA' });
        } else if (f.includes('quadra') && !specs.some(s => s.icon === 'quadra')) {
          specs.push({ icon: 'quadra', label: 'QUADRA' });
        } else if ((f.includes('festa') || f.includes('evento')) && !specs.some(s => s.icon === 'salao')) {
          specs.push({ icon: 'salao', label: 'SALÃO FESTAS' });
        } else if ((f.includes('academia') || f.includes('fitness')) && !specs.some(s => s.icon === 'academia')) {
          specs.push({ icon: 'academia', label: 'ACADEMIA' });
        } else if (f.includes('elevador') && !specs.some(s => s.icon === 'elevador')) {
          specs.push({ icon: 'elevador', label: 'ELEVADOR' });
        } else if ((f.includes('portaria') || f.includes('segurança')) && !specs.some(s => s.icon === 'portaria')) {
          specs.push({ icon: 'portaria', label: 'PORTARIA 24H' });
        } else if ((f.includes('varanda') || f.includes('sacada')) && !specs.some(s => s.icon === 'varanda')) {
          specs.push({ icon: 'varanda', label: 'VARANDA' });
        }
      }
    }

    if (specs.length === 0) {
      specs.push({ icon: 'star', label: (p.category || 'IMÓVEL').toUpperCase() });
    }

    return specs.slice(0, 4);
  };

  // Initialize data strictly from property fields when opened
  useEffect(() => {
    if (isOpen && currentProperty) {
      const isRent = currentProperty.purpose === 'Locação' || currentProperty.purpose === 'Venda e Locação';
      setSelectedTemplate('feed_vertical');
      setSelectedPhotoIndex(0);
      setMobileTab('preview');

      const category = currentProperty.category || 'Imóvel';
      const isRentProp = currentProperty.purpose === 'Locação';
      const priceVal = isRentProp ? (currentProperty.rent_price || currentProperty.price || 0) : (currentProperty.price || 0);
      const priceText = priceVal > 0 ? `R$ ${priceVal.toLocaleString('pt-BR')}${isRentProp ? '/mês' : ''}` : 'Consulte-nos';
      const neighborhood = currentProperty.neighborhood || 'Manaus';
      const city = currentProperty.city || 'Manaus';
      const bedrooms = currentProperty.bedrooms || 0;
      const suites = currentProperty.suites || 0;

      const initialData: CanvasPostData = {
        headlineLine1: '',
        headlineLine2: currentProperty.title || `${category} em ${neighborhood}`,
        highlightNumber: '',
        statusTag: isRentProp ? 'LOCAÇÃO' : 'VENDA',
        subStatus: 'DISPONÍVEL',
        priceFormatted: priceText,
        locationTag: `${neighborhood} | ${city}`,
        ctaText: 'AGENDE SUA VISITA',
        whatsappNumber: companySettings.whatsapp || companySettings.phone || '(92) 99999-9999',
        specs: buildPropertySpecsFromProperty(currentProperty)
      };

      setPostData(initialData);

      // Auto-generate clean Instagram Caption
      const specsSummary = [
        bedrooms > 0 ? `• ${bedrooms} Quartos${suites > 0 ? ` (${suites} Suítes)` : ''}` : null,
        (currentProperty.bathrooms || 0) > 0 ? `• ${currentProperty.bathrooms} Banheiros` : null,
        (currentProperty.parking_spaces || 0) > 0 ? `• ${currentProperty.parking_spaces} Vagas de Garagem` : null,
        (currentProperty.total_area || currentProperty.built_area || 0) > 0 ? `• Área: ${currentProperty.total_area || currentProperty.built_area} m²` : null
      ].filter(Boolean).join('\n');

      const phone = companySettings.whatsapp || companySettings.phone || '(92) 99999-9999';

      const autoCaption = `🏡 *${currentProperty.title || `${category} em ${neighborhood}`}*\n\n📍 *Localização:* ${neighborhood}, ${city}\n💰 *Valor:* ${priceText}\n\n✨ *Destaques do Imóvel:*\n${specsSummary}\n\n📲 Entre em contato com a Lopes Manaus e agende sua visita exclusiva!\n📞 ${phone}\n\n#LopesManaus #ImoveisManaus #${neighborhood.replace(/\s+/g, '')} #ImovelDeAltoPadrao #RedeLopes`;
      setCaption(autoCaption);
    } else {
      setCaption('');
      setCopied(false);
    }
  }, [isOpen, currentProperty?.id]);

  const images = currentProperty ? extractPropertyImages(currentProperty) : [];
  const defaultFallbackImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
  const photoUrl = images[selectedPhotoIndex] || images[0] || defaultFallbackImage;

  const currentTemplateConfig = POST_TEMPLATES_CONFIG.find(t => t.id === selectedTemplate) || POST_TEMPLATES_CONFIG[0];
  const templateWidth = currentTemplateConfig.width;
  const templateHeight = currentTemplateConfig.height;

  // Dynamic scale calculation for preview container
  useEffect(() => {
    if (!isOpen) return;

    const updateScale = () => {
      if (!previewContainerRef.current) return;
      const { clientWidth, clientHeight } = previewContainerRef.current;
      if (clientWidth <= 0 || clientHeight <= 0) return;

      const availableW = Math.max(100, clientWidth - 24);
      const availableH = Math.max(100, clientHeight - 24);

      const scaleW = availableW / templateWidth;
      const scaleH = availableH / templateHeight;
      const calculatedScale = Math.min(scaleW, scaleH);

      setContainerScale(Math.max(0.1, Math.min(calculatedScale, 1.0)));
    };

    updateScale();
    const rafId = requestAnimationFrame(updateScale);
    const timerId = setTimeout(updateScale, 120);

    const resizeObserver = new ResizeObserver(updateScale);
    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }
    window.addEventListener('resize', updateScale);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [isOpen, selectedTemplate, templateWidth, templateHeight, mobileTab]);

  if (!isOpen || !currentProperty) return null;

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
    if (!currentProperty) return;
    setIsDownloading(true);
    try {
      const code = currentProperty.code || currentProperty.id || 'imovel';
      let canvas = liveCanvasRef.current;
      if (!canvas) {
        canvas = await generatePostImage(currentProperty, companySettings, selectedTemplate, photoUrl, postData);
      }
      const url = canvas.toDataURL('image/png', 0.95);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${code}_${selectedTemplate}_lopes_manaus.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Erro ao baixar arte:', err);
      alert('Não foi possível gerar o arquivo de imagem.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCompletePack = async () => {
    if (!currentProperty) return;
    setIsDownloadingPack(true);
    try {
      await generateAndDownloadSocialMedia(currentProperty, companySettings, photoUrl, postData);
    } catch (err) {
      console.error('Erro ao baixar pacote:', err);
      alert('Erro ao baixar pacote de artes.');
    } finally {
      setIsDownloadingPack(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!currentProperty) return;
    const phone = companySettings.whatsapp || companySettings.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const priceText = postData.priceFormatted || formatCurrencyBRL(currentProperty.price || currentProperty.rent_price || 0);

    const message = `*Confira este imóvel na Lopes Manaus!* 🏡\n\n*${postData.headlineLine1} ${postData.headlineLine2}*\n📍 Localização: ${postData.locationTag}\n💰 Valor: *${priceText}*\n\n📲 Fale conosco para agendar sua visita!`;
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

  return (
    <div
      id="ai-post-generator-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        id="ai-post-generator-modal-card"
        className="bg-white rounded-3xl max-w-6xl w-full h-[95vh] shadow-2xl border border-slate-200 relative flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#F10F4D] flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Gerador de Posts para Redes Sociais — Lopes Manaus
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-[#F10F4D] border border-rose-200">
                  Ficha Oficial
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Gere artes nos formatos Feed (1080x1350 / 1080x1080) e Stories (1080x1920) com a mesma estrutura de ficha do catálogo
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

        {/* Mobile Tab Switcher Bar (visible on mobile screens) */}
        <div className="lg:hidden shrink-0 bg-slate-900 border-b border-slate-800 p-2 flex items-center gap-2 px-4">
          <button
            type="button"
            id="mobile-tab-btn-preview"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mobileTab === 'preview'
                ? 'bg-[#F10F4D] text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-white" />
            <span>Visualizar Arte</span>
          </button>
          <button
            type="button"
            id="mobile-tab-btn-edit"
            onClick={() => setMobileTab('edit')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mobileTab === 'edit'
                ? 'bg-[#F10F4D] text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-white" />
            <span>Editar Dados & Foto</span>
          </button>
        </div>

        {/* Modal Body: 2 Columns on Desktop, Tabbed on Mobile */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">

          {/* LEFT COLUMN: Artboard Canvas Live Preview */}
          <div
            className={`lg:col-span-6 bg-slate-950 p-3 sm:p-4 flex-col justify-between items-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800 ${
              mobileTab === 'preview' ? 'flex flex-1 h-full min-h-0' : 'hidden lg:flex'
            }`}
          >
            {/* Top Bar */}
            <div className="w-full shrink-0 flex items-center justify-between px-3 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 mb-2">
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-[#F10F4D]" />
                <span className="text-xs font-bold text-white">
                  {currentTemplateConfig.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {templateWidth} × {templateHeight} px
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                  HD 300DPI
                </span>
              </div>
            </div>

            {/* Canvas Preview Viewport */}
            <div
              ref={previewContainerRef}
              className="w-full flex-1 min-h-[280px] sm:min-h-0 flex items-center justify-center relative overflow-hidden"
            >
              <CanvasPostLivePreview
                property={currentProperty}
                companySettings={companySettings}
                templateId={selectedTemplate}
                photoUrl={photoUrl}
                width={templateWidth}
                height={templateHeight}
                scale={containerScale}
                aiData={postData}
                onCanvasReady={(canvas) => {
                  liveCanvasRef.current = canvas;
                }}
              />
            </div>

            {/* Bottom Actions Bar */}
            <div className="w-full shrink-0 flex flex-col gap-2 pt-2 mt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                      <span>Baixando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span className="truncate">Baixar Arte PNG</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-baixar-pacote-completo"
                  onClick={handleDownloadCompletePack}
                  disabled={isDownloadingPack}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-700 transition transform active:scale-98 disabled:opacity-50 cursor-pointer"
                  title="Baixa Pacote Completo (Feed Retrato + Quadrado + Story)"
                >
                  {isDownloadingPack ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Gerando Pacote...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span className="truncate">Baixar Pacote (3 Artes)</span>
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
                  <span className="truncate">Enviar WhatsApp</span>
                </button>
              </div>

              {/* Mobile Quick Switch Button to Edit */}
              <button
                type="button"
                onClick={() => setMobileTab('edit')}
                className="lg:hidden w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-[#F10F4D]" />
                <span>Alterar Título, Foto ou Valores</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Photo Picker, Formats & Text Editor */}
          <div
            className={`lg:col-span-6 bg-white p-4 sm:p-5 flex-col justify-between min-h-0 overflow-y-auto space-y-4 ${
              mobileTab === 'edit' ? 'flex flex-1 h-full' : 'hidden lg:flex'
            }`}
          >

            {/* 1. Format Selection */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                Formato da Arte:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {POST_TEMPLATES_CONFIG.map((config) => {
                  const isSelected = selectedTemplate === config.id;
                  return (
                    <button
                      key={config.id}
                      type="button"
                      onClick={() => setSelectedTemplate(config.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-[#F10F4D] border-[#F10F4D] text-white shadow-md'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-fit ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {config.width}x{config.height}
                      </span>
                      <div className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {config.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Photo Selector */}
            {images.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#F10F4D]" />
                    <span>Selecione a Foto Principal do Post:</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#F10F4D] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                      Foto {selectedPhotoIndex + 1} de {images.length}
                    </span>
                    {images.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handlePrevPhoto}
                          className="p-1 rounded bg-white hover:bg-slate-200 text-slate-700 transition cursor-pointer shadow-xs"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextPhoto}
                          className="p-1 rounded bg-white hover:bg-slate-200 text-slate-700 transition cursor-pointer shadow-xs"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPhotoIndex(idx)}
                      className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
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
                        <div className="absolute inset-0 bg-[#F10F4D]/25 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Text & Property Data Editor */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#F10F4D]" />
                <span>Dados da Arte (Editáveis se quiser alterar):</span>
              </label>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                  Título do Imóvel:
                </label>
                <input
                  type="text"
                  value={postData.headlineLine2 || ''}
                  onChange={(e) => setPostData({ ...postData, headlineLine1: '', headlineLine2: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#F10F4D]"
                  placeholder="Ex: Lindo Apartamento com 2 Quartos no Parque 10"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    Selo Principal:
                  </label>
                  <input
                    type="text"
                    value={postData.statusTag || ''}
                    onChange={(e) => setPostData({ ...postData, statusTag: e.target.value.toUpperCase() })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#F10F4D] focus:outline-none focus:ring-1 focus:ring-[#F10F4D]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    Faixa do Selo:
                  </label>
                  <input
                    type="text"
                    value={postData.subStatus || ''}
                    onChange={(e) => setPostData({ ...postData, subStatus: e.target.value.toUpperCase() })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#F10F4D]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    Valor Formatado:
                  </label>
                  <input
                    type="text"
                    value={postData.priceFormatted || ''}
                    onChange={(e) => setPostData({ ...postData, priceFormatted: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#F10F4D] focus:outline-none focus:ring-1 focus:ring-[#F10F4D]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                  Bairro / Cidade:
                </label>
                <input
                  type="text"
                  value={postData.locationTag || ''}
                  onChange={(e) => setPostData({ ...postData, locationTag: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#F10F4D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    Chamada de Ação (CTA):
                  </label>
                  <input
                    type="text"
                    value={postData.ctaText || ''}
                    onChange={(e) => setPostData({ ...postData, ctaText: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    WhatsApp para Agendamento:
                  </label>
                  <input
                    type="text"
                    value={postData.whatsappNumber || ''}
                    onChange={(e) => setPostData({ ...postData, whatsappNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Instagram Caption Textarea */}
            <div className="flex-1 min-h-0 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Legenda do Instagram:</span>
                </label>
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  disabled={!caption}
                  className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar Legenda</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full flex-1 min-h-[120px] bg-slate-50 rounded-xl border border-slate-200 p-3 font-sans text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#F10F4D] resize-none"
                placeholder="Legenda gerada..."
              />
            </div>

            {/* Mobile Quick Switch Button to Preview */}
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className="lg:hidden w-full py-3 px-4 rounded-xl bg-[#F10F4D] hover:bg-[#d40d43] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-900/30 transition cursor-pointer shrink-0 mt-2"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Ver Arte Gerada em Tempo Real</span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPostGeneratorModal;
