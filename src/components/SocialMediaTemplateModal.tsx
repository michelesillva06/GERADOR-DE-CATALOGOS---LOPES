import React, { useState, useEffect, useRef } from 'react';
import { Property, CompanySettings } from '../types';
import {
  SocialMediaTemplate,
  generateFeedPost,
  generateStoryPost,
  generateAndDownloadSocialMedia
} from '../lib/socialMediaGenerator';
import { X, Download, Smartphone, Sparkles, Layout, Layers, CheckCircle2, Loader2 } from 'lucide-react';
import { getPropertyPriceInfo } from '../lib/priceUtils';

interface SocialMediaTemplateModalProps {
  property: Property;
  companySettings: CompanySettings;
  onClose: () => void;
}

export const SocialMediaTemplateModal: React.FC<SocialMediaTemplateModalProps> = ({
  property,
  companySettings,
  onClose
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<SocialMediaTemplate>('capa');
  const [previewFormat, setPreviewFormat] = useState<'feed' | 'story'>('feed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const priceInfo = getPropertyPriceInfo(property);

  // Update canvas preview whenever template or format changes
  useEffect(() => {
    let isMounted = true;
    setIsPreviewLoading(true);

    const updatePreview = async () => {
      try {
        let canvas: HTMLCanvasElement;
        if (previewFormat === 'feed') {
          canvas = await generateFeedPost(property, companySettings, selectedTemplate);
        } else {
          canvas = await generateStoryPost(property, companySettings, selectedTemplate);
        }

        if (!isMounted || !previewCanvasRef.current) return;

        const targetCanvas = previewCanvasRef.current;
        targetCanvas.width = canvas.width;
        targetCanvas.height = canvas.height;
        const ctx = targetCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
          ctx.drawImage(canvas, 0, 0);
        }
      } catch (err) {
        console.error('Erro ao gerar preview social media:', err);
      } finally {
        if (isMounted) setIsPreviewLoading(false);
      }
    };

    updatePreview();

    return () => {
      isMounted = false;
    };
  }, [property, companySettings, selectedTemplate, previewFormat]);

  const handleDownloadAll = async () => {
    setIsGenerating(true);
    try {
      await generateAndDownloadSocialMedia(property, companySettings, selectedTemplate);
    } catch (err) {
      console.error('Erro ao baixar mídias sociais:', err);
      alert('Ocorreu um erro ao baixar as mídias. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSingle = async (format: 'feed' | 'story') => {
    setIsGenerating(true);
    try {
      let canvas: HTMLCanvasElement;
      let filename: string;
      if (format === 'feed') {
        canvas = await generateFeedPost(property, companySettings, selectedTemplate);
        filename = `${property.code}_feed_instagram.png`;
      } else {
        canvas = await generateStoryPost(property, companySettings, selectedTemplate);
        filename = `${property.code}_story_instagram.png`;
      }
      const url = canvas.toDataURL('image/png', 0.95);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error('Erro ao baixar formato único:', err);
      alert('Ocorreu um erro ao baixar o arquivo.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full text-white shadow-2xl overflow-hidden my-8 flex flex-col md:flex-row">
        
        {/* Left Column: Preview Area */}
        <div className="md:w-1/2 bg-slate-950/80 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 relative">
          
          {/* Format Switcher Pills */}
          <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-4 shadow-inner">
            <button
              type="button"
              onClick={() => setPreviewFormat('feed')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                previewFormat === 'feed'
                  ? 'bg-[#F10F4D] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              Feed (4:5)
            </button>
            <button
              type="button"
              onClick={() => setPreviewFormat('story')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                previewFormat === 'story'
                  ? 'bg-[#F10F4D] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Stories (9:16)
            </button>
          </div>

          {/* Canvas Wrapper */}
          <div className="relative w-full max-w-[280px] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 bg-slate-900 aspect-[4/5] max-h-[420px]">
            {isPreviewLoading && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center z-10 gap-2">
                <Loader2 className="w-6 h-6 text-[#F10F4D] animate-spin" />
                <span className="text-[11px] font-semibold text-slate-300">Renderizando prévia...</span>
              </div>
            )}
            <canvas
              ref={previewCanvasRef}
              className="w-full h-full object-contain"
            />
          </div>

          <p className="text-[11px] text-slate-400 mt-3 text-center">
            {previewFormat === 'feed' ? 'Proporção 1080 × 1350 px (Instagram Feed)' : 'Proporção 1080 × 1920 px (Instagram Stories)'}
          </p>
        </div>

        {/* Right Column: Controls & Templates */}
        <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-[#F10F4D] flex items-center justify-center border border-rose-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Criar Arte para Instagram</h3>
                  <p className="text-xs text-slate-400">{property.code} • {property.neighborhood || property.city}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Property Summary Pill */}
            <div className="mt-4 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <p className="text-xs font-bold text-white truncate">{property.title}</p>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-300">
                <span className="font-semibold text-rose-400">{property.purpose || 'Venda'}</span>
                <span className="font-extrabold text-white">{priceInfo.primaryFormatted}</span>
              </div>
            </div>

            {/* Template Selector */}
            <div className="mt-5 space-y-2.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-[#F10F4D]" />
                Escolha o Modelo de Design
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* Template Capa */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('capa')}
                  className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 relative ${
                    selectedTemplate === 'capa'
                      ? 'border-[#F10F4D] bg-[#F10F4D]/10 text-white'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {selectedTemplate === 'capa' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F10F4D] absolute top-2 right-2" />
                  )}
                  <div>
                    <span className="text-[11px] font-extrabold block text-white">Capa</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5 leading-tight">
                      Destaque fotográfico e especificações.
                    </span>
                  </div>
                  <div className="h-5 rounded bg-slate-800 border border-white/10 flex items-end p-0.5">
                    <div className="w-4 h-1 bg-[#F10F4D] rounded-xs" />
                  </div>
                </button>

                {/* Template Ficha */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('ficha')}
                  className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 relative ${
                    selectedTemplate === 'ficha'
                      ? 'border-[#F10F4D] bg-[#F10F4D]/10 text-white'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {selectedTemplate === 'ficha' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F10F4D] absolute top-2 right-2" />
                  )}
                  <div>
                    <span className="text-[11px] font-extrabold block text-white">Ficha Técnica</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5 leading-tight">
                      Detalhes e botão de agendamento.
                    </span>
                  </div>
                  <div className="h-5 rounded bg-white border border-slate-700 flex flex-col justify-between p-0.5">
                    <div className="w-full h-1.5 bg-slate-200 rounded-xs" />
                    <div className="w-5 h-1 bg-[#F10F4D] rounded-xs" />
                  </div>
                </button>

                {/* Template Premium */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('premium')}
                  className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 relative ${
                    selectedTemplate === 'premium'
                      ? 'border-[#F10F4D] bg-[#F10F4D]/10 text-white'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {selectedTemplate === 'premium' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F10F4D] absolute top-2 right-2" />
                  )}
                  <div>
                    <span className="text-[11px] font-extrabold block text-white">Alto Padrão</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5 leading-tight">
                      Editorial minimalista sofisticado.
                    </span>
                  </div>
                  <div className="h-5 rounded bg-[#111114] border border-slate-700 flex items-center justify-center p-0.5">
                    <div className="w-3 h-1 bg-[#F10F4D] rounded-xs" />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleDownloadAll}
              className="w-full py-3.5 px-4 bg-[#F10F4D] hover:bg-rose-600 active:scale-[0.99] text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Imagens...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar Feed + Stories (2 PNGs)</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleDownloadSingle('feed')}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Layout className="w-3.5 h-3.5 text-slate-400" />
                Baixar só Feed
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleDownloadSingle('story')}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                Baixar só Story
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
