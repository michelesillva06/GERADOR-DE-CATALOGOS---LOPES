import React, { useState, useEffect } from 'react';
import { Property, User, CompanySettings } from '../types';
import { X, FileSpreadsheet, CheckSquare, Square, Download, Filter, Building2 } from 'lucide-react';
import { generateCatalogPDF } from '../lib/pdfGenerator';

interface PDFCatalogModalProps {
  isOpen: boolean;
  properties: Property[];
  captadores: User[];
  currentCaptador: User;
  companySettings: CompanySettings;
  onClose: () => void;
}

export const PDFCatalogModal: React.FC<PDFCatalogModalProps> = ({
  isOpen,
  properties,
  captadores,
  currentCaptador,
  companySettings,
  onClose
}) => {
  const isCaptadorOnly = currentCaptador.role === 'CAPTADOR';

  // Scope base properties: Captadores only see their own properties
  const baseProperties = isCaptadorOnly
    ? properties.filter(p => p.user_id === currentCaptador.id)
    : properties;

  const [selectedCaptadorId, setSelectedCaptadorId] = useState(currentCaptador.id);

  const selectedCaptador = isCaptadorOnly
    ? currentCaptador
    : (captadores.find(c => c.id === selectedCaptadorId) || currentCaptador);

  const [catalogTitle, setCatalogTitle] = useState(`Catálogo Digital - ${selectedCaptador.name}`);
  const [purposeFilter, setPurposeFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Update title when selected captador changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCatalogTitle(`Catálogo Digital - ${selectedCaptador.name}`);
    }
  }, [isOpen, selectedCaptadorId]);

  // Initialize selected properties when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      const initialIds = baseProperties
        .filter(p => {
          if (purposeFilter !== 'todos' && !p.purpose.includes(purposeFilter)) return false;
          if (categoryFilter !== 'todos' && p.category !== categoryFilter) return false;
          return true;
        })
        .map(p => p.id);
      setSelectedPropIds(initialIds);
    }
  }, [isOpen, purposeFilter, categoryFilter, currentCaptador.id]);

  const displayProperties = baseProperties.filter(p => {
    if (purposeFilter !== 'todos' && !p.purpose.includes(purposeFilter)) return false;
    if (categoryFilter !== 'todos' && p.category !== categoryFilter) return false;
    return true;
  });

  const toggleSelectAll = () => {
    const displayIds = displayProperties.map(p => p.id);
    const allSelected = displayIds.every(id => selectedPropIds.includes(id));

    if (allSelected) {
      setSelectedPropIds(selectedPropIds.filter(id => !displayIds.includes(id)));
    } else {
      const newSet = new Set([...selectedPropIds, ...displayIds]);
      setSelectedPropIds(Array.from(newSet));
    }
  };

  const togglePropSelection = (id: string) => {
    if (selectedPropIds.includes(id)) {
      setSelectedPropIds(selectedPropIds.filter(pid => pid !== id));
    } else {
      setSelectedPropIds([...selectedPropIds, id]);
    }
  };

  const handleDownload = async () => {
    if (selectedPropIds.length === 0) {
      alert('Selecione ao menos 1 imóvel para incluir no catálogo PDF.');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedProps = properties.filter(p => selectedPropIds.includes(p.id));
      const doc = await generateCatalogPDF({
        title: catalogTitle,
        properties: selectedProps,
        captador: selectedCaptador,
        companySettings
      });

      doc.save(`Catalogo_LopesManaus_${selectedCaptador.url_slug || 'imoveis'}.pdf`);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar catálogo em PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#F10F4D]/10 text-[#F10F4D] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Gerador de Catálogo em PDF</h2>
              <p className="text-xs text-slate-500">
                {isCaptadorOnly
                  ? `Modo Captador (${currentCaptador.name}) - Imóveis sob sua captação`
                  : 'Selecione os imóveis e o captador para personalizar o catálogo'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          
          {/* Title input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título da Capa do Catálogo</label>
            <input
              type="text"
              value={catalogTitle}
              onChange={(e) => setCatalogTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
            />
          </div>

          {/* Select Captador (hidden or disabled if Captador) */}
          {!isCaptadorOnly && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Apresentado por (Captador)</label>
              <select
                value={selectedCaptadorId}
                onChange={(e) => setSelectedCaptadorId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              >
                {captadores.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.position} ({c.whatsapp})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filters for Purpose and Category */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-1 text-xs font-bold text-slate-700 uppercase mb-1">
              <Filter className="w-3.5 h-3.5 text-[#F10F4D]" />
              <span>Filtros do Catálogo (Finalidade e Categoria)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Finalidade</label>
                <select
                  value={purposeFilter}
                  onChange={(e) => setPurposeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="todos">Todas Finalidades</option>
                  <option value="Venda">Venda</option>
                  <option value="Locação">Locação</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoria</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="todos">Todas Categorias</option>
                  <option value="Apartamento">Apartamento</option>
                  <option value="Casa">Casa</option>
                  <option value="Sala comercial">Sala comercial</option>
                  <option value="Terreno">Terreno</option>
                  <option value="Condomínio">Condomínio</option>
                  <option value="Cobertura">Cobertura</option>
                </select>
              </div>
            </div>
          </div>

          {/* Select Properties */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Selecione os Imóveis ({selectedPropIds.length} selecionados de {displayProperties.length})
              </label>
              {displayProperties.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-[#F10F4D] hover:underline"
                >
                  {displayProperties.every(p => selectedPropIds.includes(p.id))
                    ? 'Desmarcar Exibidos'
                    : 'Marcar Todos Exibidos'}
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
              {displayProperties.length > 0 ? (
                displayProperties.map(p => {
                  const isSelected = selectedPropIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePropSelection(p.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-rose-50/90 border-rose-300' : 'bg-white border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#F10F4D] shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">{p.title}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {p.code} • {p.neighborhood} • {p.category} ({p.purpose})
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-[#F10F4D]">
                        R$ {p.price.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 font-medium">
                  Nenhum imóvel encontrado com os filtros selecionados.
                </div>
              )}
            </div>
          </div>

          {/* Footer CTAs */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || selectedPropIds.length === 0}
              className="px-6 py-2.5 rounded-xl bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-900/30 flex items-center space-x-2 transition transform active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Gerando Catálogo PDF...' : `Baixar PDF (${selectedPropIds.length} Imóveis)`}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
