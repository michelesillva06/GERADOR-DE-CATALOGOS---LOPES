import React, { useState } from 'react';
import { Property, CompanySettings } from '../types';
import { generateAndDownloadSocialMedia, SocialMediaTemplate } from '../lib/socialMediaGenerator';
import { X, Loader2, Instagram } from 'lucide-react';

interface SocialMediaTemplateModalProps {
  property: Property;
  companySettings: CompanySettings;
  onClose: () => void;
}

const TEMPLATES: { id: SocialMediaTemplate; name: string; description: string }[] = [
  {
    id: 'capa',
    name: 'Capa Premium',
    description: 'Foto grande com selo, preço e localização sobre a imagem; título e características na parte de baixo.'
  },
  {
    id: 'ficha',
    name: 'Ficha Técnica',
    description: 'Estilo catálogo: foto no topo, lista de detalhes, descrição e um botão de "Agende sua visita".'
  },
  {
    id: 'premium',
    name: 'Alto Padrão',
    description: 'Fundo escuro elegante, poucos textos, bastante espaço — estilo revista imobiliária.'
  }
];

export const SocialMediaTemplateModal: React.FC<SocialMediaTemplateModalProps> = ({
  property,
  companySettings,
  onClose
}) => {
  const [generatingTemplate, setGeneratingTemplate] = useState<SocialMediaTemplate | null>(null);

  const handleGenerate = async (template: SocialMediaTemplate) => {
    setGeneratingTemplate(template);
    try {
      await generateAndDownloadSocialMedia(property, companySettings, template);
      onClose();
    } catch (err) {
      console.error('Erro ao gerar mídia social:', err);
      alert('Não foi possível gerar a mídia. Tente novamente.');
    } finally {
      setGeneratingTemplate(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <Instagram className="text-[#F10F4D]" size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Escolha o modelo</h2>
              <p className="text-xs text-slate-500 mt-0.5">Gera o Feed e o Story juntos, no modelo escolhido.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0" title="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleGenerate(t.id)}
              disabled={generatingTemplate !== null}
              className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[#F10F4D] hover:bg-rose-50/40 transition disabled:opacity-50 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-bold text-slate-800">{t.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
              </div>
              {generatingTemplate === t.id && <Loader2 size={18} className="animate-spin text-[#F10F4D] shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
