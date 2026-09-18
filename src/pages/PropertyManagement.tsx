import React, { useState, useMemo } from 'react';
import { Property, User } from '../types';
import { PropertyCard } from '../components/PropertyCard';
import { PropertyTableView } from '../components/PropertyTableView';
import { Search, FileSpreadsheet, Building2, FileCode, LayoutGrid, List, Bed, SlidersHorizontal, X } from 'lucide-react';
import { PROPERTY_CATEGORIES } from '../lib/constants';

interface PropertyManagementProps {
  properties: Property[];
  users: User[];
  currentUser: User;
  onOpenNewPropertyModal: () => void;
  onOpenPdfModal: () => void;
  onOpenXmlImport?: () => void;
  onViewProperty: (property: Property) => void;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (property: Property) => void;
  onShareWhatsApp: (property: Property) => void;
  onGenerateSocialMedia?: (property: Property) => void;
  onGenerateAiPost?: (property: Property) => void;
}

const PRICE_RANGES = [
  { label: 'Qualquer valor', min: undefined as number | undefined, max: undefined as number | undefined },
  { label: 'Até R$ 350 mil', min: undefined as number | undefined, max: 350000 },
  { label: 'R$ 350 mil a R$ 600 mil', min: 350000, max: 600000 },
  { label: 'R$ 600 mil a R$ 1 milhão', min: 600000, max: 1000000 },
  { label: 'R$ 1M a R$ 2 milhões', min: 1000000, max: 2000000 },
  { label: 'Alto Padrão (> R$ 2M)', min: 2000000, max: undefined as number | undefined }
];

export const PropertyManagement: React.FC<PropertyManagementProps> = ({
  properties,
  users,
  currentUser,
  onOpenPdfModal,
  onOpenXmlImport,
  onViewProperty,
  onDeleteProperty,
  onShareWhatsApp,
  onGenerateSocialMedia,
  onGenerateAiPost
}) => {
  const [search, setSearch] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<'todos' | 'Venda' | 'Locação'>('todos');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [bedroomFilter, setBedroomFilter] = useState('todos');
  const [priceRangeIndex, setPriceRangeIndex] = useState(0);
  const [priceMinCustom, setPriceMinCustom] = useState('');
  const [priceMaxCustom, setPriceMaxCustom] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    const saved = localStorage.getItem('property_view_mode');
    return saved === 'table' ? 'table' : 'grid';
  });

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('property_view_mode', mode);
  };

  const isMaster = currentUser.role === 'MASTER_ADMIN' || currentUser.role === 'MASTER' || currentUser.username === 'admin' || currentUser.email?.toLowerCase() === 'admin@lopes.com.br';

  const totalCount = properties.length;
  const vendaCount = properties.filter(p => p.purpose.includes('Venda')).length;
  const locacaoCount = properties.filter(p => p.purpose.includes('Locação')).length;

  const neighborhoods = useMemo(
    () => Array.from(new Set(properties.map(p => p.neighborhood))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [properties]
  );

  const activeRange = PRICE_RANGES[priceRangeIndex];
  const effectivePriceMin = priceMinCustom ? Number(priceMinCustom) : activeRange.min;
  const effectivePriceMax = priceMaxCustom ? Number(priceMaxCustom) : activeRange.max;

  const filteredProperties = properties.filter(p => {
    if (purposeFilter !== 'todos' && !p.purpose.includes(purposeFilter)) return false;
    if (neighborhoodFilter !== 'todos' && p.neighborhood !== neighborhoodFilter) return false;
    if (categoryFilter !== 'todos' && p.category !== categoryFilter) return false;
    if (statusFilter !== 'todos' && p.status !== statusFilter) return false;
    if (bedroomFilter !== 'todos' && (p.bedrooms || 0) < parseInt(bedroomFilter, 10)) return false;

    const effectivePrice = p.price || p.rent_price || 0;
    if (effectivePriceMin && effectivePrice < effectivePriceMin) return false;
    if (effectivePriceMax && effectivePrice > effectivePriceMax) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.code.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const hasActiveFilters = neighborhoodFilter !== 'todos' || categoryFilter !== 'todos' || statusFilter !== 'todos' || bedroomFilter !== 'todos' || priceRangeIndex !== 0 || !!priceMinCustom || !!priceMaxCustom;

  const clearFilters = () => {
    setNeighborhoodFilter('todos');
    setCategoryFilter('todos');
    setStatusFilter('todos');
    setBedroomFilter('todos');
    setPriceRangeIndex(0);
    setPriceMinCustom('');
    setPriceMaxCustom('');
  };

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Carteira de Imóveis Lopes Manaus</h1>
          <p className="text-xs text-slate-500">
            Estoque oficial com dados em tempo real, direto do feed Lopesnet
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isMaster && onOpenXmlImport && (
            <button
              onClick={onOpenXmlImport}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-1.5 border border-slate-300/80 shadow-2xs transition"
              title="Importar imóveis em lote via arquivo XML"
            >
              <FileCode className="w-4 h-4 text-[#F10F4D]" />
              <span>Importar XML</span>
            </button>
          )}

          <button
            onClick={onOpenPdfModal}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-2 shadow transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#F10F4D]" />
            <span>Gerar Catálogo PDF</span>
          </button>
        </div>
      </div>

      {/* Purpose Tabs with Counts */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-2 max-w-xl overflow-x-auto">
        {[
          { key: 'todos' as const, label: 'Todos os Imóveis', count: totalCount },
          { key: 'Venda' as const, label: 'Comprar / Venda', count: vendaCount },
          { key: 'Locação' as const, label: 'Alugar / Locação', count: locacaoCount }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setPurposeFilter(tab.key)}
            className={`shrink-0 py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              purposeFilter === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
              purposeFilter === tab.key ? 'bg-rose-100 text-[#F10F4D]' : 'bg-slate-200 text-slate-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm space-y-3">

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código (ex: REO843669), título, bairro, endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#F10F4D]"
          />
        </div>

        {/* Bairro & Tipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bairro / Localização</label>
            <select
              value={neighborhoodFilter}
              onChange={(e) => setNeighborhoodFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="todos">Todos os Bairros de Manaus</option>
              {neighborhoods.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Imóvel</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="todos">Todos os Tipos de Imóvel</option>
              {PROPERTY_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quartos */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center space-x-1">
            <Bed className="w-3 h-3 text-[#F10F4D]" />
            <span>Quartos (mínimo)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['todos', '1', '2', '3', '4'].map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setBedroomFilter(b)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  bedroomFilter === b
                    ? 'bg-[#F10F4D] text-white border-[#F10F4D]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {b === 'todos' ? 'Todos' : `${b}+`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowMoreFilters(v => !v)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-100 transition flex items-center space-x-1 ml-auto"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Mais Filtros</span>
            </button>
          </div>
        </div>

        {/* Faixa de Preço */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Faixa de Preço (R$)</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRICE_RANGES.map((range, idx) => (
              <button
                key={range.label}
                type="button"
                onClick={() => {
                  setPriceRangeIndex(idx);
                  setPriceMinCustom('');
                  setPriceMaxCustom('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  priceRangeIndex === idx && !priceMinCustom && !priceMaxCustom
                    ? 'bg-[#F10F4D] text-white border-[#F10F4D]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="R$ Mín."
              value={priceMinCustom}
              onChange={(e) => setPriceMinCustom(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            />
            <span className="text-xs text-slate-400">até</span>
            <input
              type="number"
              placeholder="R$ Máx."
              value={priceMaxCustom}
              onChange={(e) => setPriceMaxCustom(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* More Filters (Status) */}
        {showMoreFilters && (
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status do Imóvel</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 sm:max-w-xs"
            >
              <option value="todos">Todos os Status</option>
              <option value="Disponível">Disponível</option>
              <option value="Reservado">Reservado</option>
              <option value="Vendido">Vendido</option>
              <option value="Alugado">Alugado</option>
            </select>
          </div>
        )}

        {/* Clear filters + View mode + count */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 font-medium">
              <strong className="text-slate-800 font-bold">{filteredProperties.length}</strong> {filteredProperties.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-bold text-rose-600 hover:underline flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Visualização em Grade (Cards)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grade</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#F10F4D] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Visualização em Tabela Compacta"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
          </div>
        </div>

      </div>

      {/* Property Display: Grid or Table */}
      {filteredProperties.length > 0 ? (
        viewMode === 'table' ? (
          <PropertyTableView
            properties={filteredProperties}
            users={users}
            currentUser={currentUser}
            onView={onViewProperty}
            onEdit={undefined}
            onDelete={isMaster ? onDeleteProperty : undefined}
            onShareWhatsApp={onShareWhatsApp}
            onGenerateAiPost={onGenerateAiPost}
            canEditAny={false}
            canDeleteAny={isMaster}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(prop => {
              const owner = users.find(u => u.id === prop.user_id);
              return (
                <PropertyCard
                  key={prop.id}
                  property={prop}
                  captador={owner}
                  onView={onViewProperty}
                  onEdit={undefined}
                  onDelete={isMaster ? onDeleteProperty : undefined}
                  onShareWhatsApp={onShareWhatsApp}
                  onGenerateSocialMedia={onGenerateSocialMedia}
                  onGenerateAiPost={onGenerateAiPost}
                  canEdit={false}
                  canDelete={isMaster}
                  hidePerMonth={true}
                />
              );
            })}
          </div>
        )
      ) : (
        <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-slate-200 space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {properties.length === 0 ? 'Nenhum imóvel na carteira no momento' : 'Nenhum imóvel corresponde aos filtros'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {properties.length === 0
                ? 'Os imóveis chegam automaticamente pela sincronização com o feed Lopesnet.'
                : 'Tente ajustar ou limpar os filtros de busca para visualizar outros imóveis.'}
            </p>
          </div>

          {properties.length === 0 && isMaster && onOpenXmlImport && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onOpenXmlImport}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>Importar XML</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
