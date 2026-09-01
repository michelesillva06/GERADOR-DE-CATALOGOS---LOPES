import React, { useState } from 'react';
import { Property, CompanySettings } from '../types';
import {
  generateAndDownloadSocialMedia,
  generatePostImage
} from '../lib/socialMediaGenerator';
import { X, Loader2, Instagram, Image, Smartphone, Download } from 'lucide-react';

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
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleDownloadCanvas = (canvas: HTMLCanvasElement, filename: string) => {
    const url = canvas.toDataURL('image/png', 0.95);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleGenerateAll = async () => {
    setLoadingAction('all');
    try {
      await generateAndDownloadSocialMedia(property, companySettings);
      setTimeout(onClose, 600);
    } catch (err) {
      console.error('Erro ao gerar mídias sociais:', err);
      alert('Não foi possível gerar as mídias. Verifique a imagem do imóvel e tente novamente.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGenerateFeedVertical = async () => {
    setLoadingAction('feed_vertical');
    try {
      const canvas = await generatePostImage(property, companySettings, 'feed_vertical');
      handleDownloadCanvas(canvas, `${property.code}_feed_retrato_1080x1350.png`);
      setTimeout(onClose, 600);
    } catch (err) {
      console.error('Erro ao gerar Feed Retrato:', err);
      alert('Não foi possível gerar a imagem para o Feed Retrato.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGenerateFeedQuadrado = async () => {
    setLoadingAction('feed_quadrado');
    try {
      const canvas = await generatePostImage(property, companySettings, 'feed_quadrado');
      handleDownloadCanvas(canvas, `${property.code}_feed_quadrado_1080x1080.png`);
      setTimeout(onClose, 600);
    } catch (err) {
      console.error('Erro ao gerar Feed Quadrado:', err);
      alert('Não foi possível gerar a imagem para o Feed Quadrado.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 shadow-sm">
              <Instagram className="text-[#F10F4D]" size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Gerar Post</h2>
              <p className="text-xs text-slate-500 font-medium">Layout editorial padrão Lopes Manaus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition shrink-0"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* Main Action: Generate Both */}
          <button
            onClick={handleGenerateAll}
            disabled={loadingAction !== null}
            className="w-full text-left p-4 rounded-2xl bg-[#F10F4D] hover:bg-rose-600 text-white transition disabled:opacity-50 flex items-center justify-between gap-3 shadow-md group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Download size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">Baixar Ambos (Retrato + Quadrado)</p>
                <p className="text-xs text-rose-100 mt-0.5">Gera e baixa as 2 versões em alta resolução</p>
              </div>
            </div>
            {loadingAction === 'all' ? (
              <Loader2 size={20} className="animate-spin text-white shrink-0" />
            ) : (
              <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg shrink-0">1-clique</span>
            )}
          </button>

          <div className="relative py-2 flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">Ou escolha o formato</span>
          </div>

          {/* Individual Options */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGenerateFeedVertical}
              disabled={loadingAction !== null}
              className="p-3.5 rounded-2xl border border-slate-200 hover:border-[#F10F4D] hover:bg-rose-50/30 transition disabled:opacity-50 flex flex-col items-center text-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center text-slate-600 group-hover:text-[#F10F4D] transition">
                <Image size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Feed Retrato</p>
                <p className="text-[10px] text-slate-400">1080 x 1350 (4:5)</p>
              </div>
              {loadingAction === 'feed_vertical' && <Loader2 size={16} className="animate-spin text-[#F10F4D] mt-1" />}
            </button>

            <button
              onClick={handleGenerateFeedQuadrado}
              disabled={loadingAction !== null}
              className="p-3.5 rounded-2xl border border-slate-200 hover:border-[#F10F4D] hover:bg-rose-50/30 transition disabled:opacity-50 flex flex-col items-center text-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center text-slate-600 group-hover:text-[#F10F4D] transition">
                <Image size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Feed Quadrado</p>
                <p className="text-[10px] text-slate-400">1080 x 1080 (1:1)</p>
              </div>
              {loadingAction === 'feed_quadrado' && <Loader2 size={16} className="animate-spin text-[#F10F4D] mt-1" />}
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            Imóvel: <span className="font-bold text-slate-700">{property.code}</span> — {property.neighborhood}
          </p>
        </div>
      </div>
    </div>
  );
};
