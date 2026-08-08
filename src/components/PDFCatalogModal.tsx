import React, { useState, useEffect } from 'react';
import { Property, User, CompanySettings } from '../types';
import { X, FileSpreadsheet, CheckSquare, Square, Download, Filter, Building2, Upload, Image as ImageIcon, User as UserIcon, ShieldCheck } from 'lucide-react';
import { generateCatalogPDF } from '../lib/pdfGenerator';
import { PROPERTY_CATEGORIES } from '../lib/constants';
import { compressImage } from '../utils/imageCompressor';

interface PDFCatalogModalProps {
  isOpen: boolean;
  properties: Property[];
  captadores: User[];
  currentCaptador: User;
  companySettings: CompanySettings;
  onSaveSettings?: (newSettings: Partial<CompanySettings>) => Promise<void>;
  onClose: () => void;
}

export const PDFCatalogModal: React.FC<PDFCatalogModalProps> = ({
  isOpen,
  properties,
  captadores,
  currentCaptador,
  companySettings,
  onSaveSettings,
  onClose
}) => {
  const isManagerOrAdmin = currentCaptador.role === 'MASTER_ADMIN' || currentCaptador.role === 'GESTORA' || currentCaptador.role === 'MASTER' || currentCaptador.role === 'GESTOR';
  const isAdmin = currentCaptador.role === 'MASTER_ADMIN' || currentCaptador.role === 'MASTER';

  // Scope: 'meus' (Apenas meus imóveis captados) vs 'todos' (Todos imóveis do sistema)
  const [scope, setScope] = useState<'meus' | 'todos'>('meus');
  const [selectedCaptadorId, setSelectedCaptadorId] = useState(currentCaptador.id);

  const selectedCaptador = (captadores.find(c => c.id === selectedCaptadorId) || currentCaptador);

  const [catalogTitle, setCatalogTitle] = useState(`Catálogo Digital - ${selectedCaptador.name}`);
  const [purposeFilter, setPurposeFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([]);
  const [customCoverImage, setCustomCoverImage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Resolution of official cover from companySettings based on purpose
  let officialCoverUrl = '';
  if (purposeFilter === 'Locação') {
    officialCoverUrl = companySettings.cover_locacao_url || companySettings.cover_horizontal_url || companySettings.cover_geral_url || companySettings.cover_venda_url || '';
  } else if (purposeFilter === 'Venda') {
    officialCoverUrl = companySettings.cover_venda_url || companySettings.cover_horizontal_url || companySettings.cover_geral_url || companySettings.cover_locacao_url || '';
  } else {
    officialCoverUrl = companySettings.cover_horizontal_url || companySettings.cover_geral_url || companySettings.cover_venda_url || companySettings.cover_locacao_url || '';
  }

  const activeCoverImage = customCoverImage || officialCoverUrl;

  // Update title and reset custom cover when selected captador changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCatalogTitle(`Catálogo Digital - ${selectedCaptador.name}`);
      setCustomCoverImage('');
    }
  }, [isOpen, selectedCaptadorId]);

  // Handle scope base properties
  const myProperties = properties.filter(p => p.user_id === currentCaptador.id);
  const scopeProperties = scope === 'meus' ? myProperties : properties;

  // Filtered properties based on purpose & category
  const displayProperties = scopeProperties.filter(p => {
    if (purposeFilter !== 'todos' && !p.purpose.includes(purposeFilter)) return false;
    if (categoryFilter !== 'todos' && p.category !== categoryFilter) return false;
    return true;
  });

  // Re-select all matching when filters change or modal opens
  useEffect(() => {
    if (isOpen) {
      const matchIds = displayProperties.map(p => p.id);
      setSelectedPropIds(matchIds);
    }
  }, [isOpen, scope, purposeFilter, categoryFilter]);

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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida (PNG, JPG ou WEBP).');
      return;
    }

    const compressed = await compressImage(file, { maxWidth: 1400, maxHeight: 1400, quality: 0.8 });
    if (compressed) {
      setCustomCoverImage(compressed);

      if (onSaveSettings) {
        let updateKey: keyof CompanySettings = 'cover_horizontal_url';
        if (purposeFilter === 'Locação') updateKey = 'cover_locacao_url';
        else if (purposeFilter === 'Venda') updateKey = 'cover_venda_url';
        else updateKey = 'cover_geral_url';

        await onSaveSettings({
          [updateKey]: compressed,
          cover_horizontal_url: compressed
        });
      }
    }
    e.target.value = '';
  };

  const handleDownload = async () => {
    if (selectedPropIds.length === 0) {
      alert('Selecione ao menos 1 imóvel para incluir no catálogo PDF.');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedProps = properties.filter(p => selectedPropIds.includes(p.id));
      let determinedCoverType: 'VENDA' | 'LOCACAO' | 'GERAL' = 'GERAL';
      if (purposeFilter === 'Locação') determinedCoverType = 'LOCACAO';
      else if (purposeFilter === 'Venda') determinedCoverType = 'VENDA';

      const doc = await generateCatalogPDF({
        title: catalogTitle,
        properties: selectedProps,
        captador: selectedCaptador,
        companySettings,
        customCoverImage,
        coverType: determinedCoverType,
        orientation: 'landscape'
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#F10F4D]/10 text-[#F10F4D] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Gerador de Catálogo PDF</h2>
              <p className="text-xs text-slate-500">
                Apresentado por: <strong className="text-slate-800">{selectedCaptador.name}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">

          {/* Scope Selection: Meus vs Todos */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              1. Origem / Escopo dos Imóveis
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope('meus')}
                className={`p-3.5 rounded-2xl border text-left flex items-center space-x-3 transition cursor-pointer ${
                  scope === 'meus'
                    ? 'bg-rose-50/90 border-[#F10F4D] ring-2 ring-[#F10F4D]/20 shadow-sm'
                    : 'bg-slate-50 border-slate-200 opacity-75 hover:opacity-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  scope === 'meus' ? 'bg-[#F10F4D] text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-900">Apenas Meus Imóveis</p>
                  <p className="text-[11px] text-slate-500 font-medium">{myProperties.length} imóveis sob sua captação</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('todos')}
                className={`p-3.5 rounded-2xl border text-left flex items-center space-x-3 transition cursor-pointer ${
                  scope === 'todos'
                    ? 'bg-rose-50/90 border-[#F10F4D] ring-2 ring-[#F10F4D]/20 shadow-sm'
                    : 'bg-slate-50 border-slate-200 opacity-75 hover:opacity-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  scope === 'todos' ? 'bg-[#F10F4D] text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-900">Todos os Imóveis do Sistema</p>
                  <p className="text-[11px] text-slate-500 font-medium">{properties.length} imóveis de todos captadores</p>
                </div>
              </button>
            </div>
          </div>

          {/* Filters: Purpose & Category */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-1 text-xs font-bold text-slate-700 uppercase mb-1">
              <Filter className="w-3.5 h-3.5 text-[#F10F4D]" />
              <span>2. Filtrar Por Finalidade e Categoria</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Finalidade</label>
                <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  {['todos', 'Venda', 'Locação'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPurposeFilter(p)}
                      className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        purposeFilter === p
                          ? 'bg-[#F10F4D] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p === 'todos' ? 'Todas' : p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoria</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="todos">Todas Categorias</option>
                  {PROPERTY_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Title input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título da Capa do PDF</label>
            <input
              type="text"
              value={catalogTitle}
              onChange={(e) => setCatalogTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
            />
          </div>

          {/* Select Captador (If Manager or Admin) */}
          {isManagerOrAdmin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Apresentador do Catálogo (Captador)</label>
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



          {/* Select Properties List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase">
                3. Imóveis para Incluir ({selectedPropIds.length} de {displayProperties.length})
              </label>
              {displayProperties.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-[#F10F4D] hover:underline cursor-pointer"
                >
                  {displayProperties.every(p => selectedPropIds.includes(p.id))
                    ? 'Desmarcar Todos'
                    : 'Marcar Todos'}
                </button>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
              {displayProperties.length > 0 ? (
                displayProperties.map(p => {
                  const isSelected = selectedPropIds.includes(p.id);
                  const captadorObj = captadores.find(c => c.id === p.user_id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePropSelection(p.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-rose-50/90 border-rose-300' : 'bg-white border-slate-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#F10F4D] shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.title}</p>
                          <p className="text-[10px] text-slate-500 font-medium truncate">
                            {p.neighborhood} • {p.category} ({p.purpose}) {scope === 'todos' && captadorObj ? `• Captador: ${captadorObj.name}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-[#F10F4D] shrink-0">
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
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || selectedPropIds.length === 0}
              className="px-6 py-2.5 rounded-xl bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-900/30 flex items-center space-x-2 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Gerando Catálogo PDF...' : `Gerar Catálogo PDF (${selectedPropIds.length} Imóveis)`}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
