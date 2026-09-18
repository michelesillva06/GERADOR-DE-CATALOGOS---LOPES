import React, { useState, useMemo } from 'react';
import { Property, User } from '../types';
import { PropertyCard } from '../components/PropertyCard';
import { PropertyTableView } from '../components/PropertyTableView';
import { Search, FileSpreadsheet, Building2, FileCode, LayoutGrid, List, X, DollarSign, Tag, MapPin } from 'lucide-react';
import { PROPERTY_CATEGORIES } from '../lib/constants';

interface PropertyManagementProps {
  properties: Property[];
  users: User[];
  currentUser: User;
  onOpenNewPropertyModal?: () => void;
  onOpenPdfModal: () => void;
  onOpenXmlImport?: () => void;
  onViewProperty: (property: Property) => void;
  onEditProperty?: (property: Property) => void;
  onDeleteProperty?: (property: Property) => void;
  onShareWhatsApp: (property: Property) => void;
}

export const PropertyManagement: React.FC<PropertyManagementProps> = ({
  properties,
  users,
  currentUser,
  onOpenPdfModal,
  onOpenXmlImport,
  onViewProperty,
  onDeleteProperty,
  onShareWhatsApp
}) => {
  const [search, setSearch] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<'todos' | 'Venda' | 'Locação' | 'Venda e Locação'>('todos');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [priceMinCustom, setPriceMinCustom] = useState('');
  const [priceMaxCustom, setPriceMaxCustom] = useState('');
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
  const vendaCount = properties.filter(p => p.purpose === 'Venda' || p.purpose === 'Venda e Locação' || p.purpose?.includes('Venda')).length;
  const locacaoCount = properties.filter(p => p.purpose === 'Locação' || p.purpose === 'Venda e Locação' || p.purpose?.includes('Locação')).length;
  const vendaELocacaoCount = properties.filter(p => p.purpose === 'Venda e Locação').length;

  const neighborhoods = useMemo(
    () => Array.from(new Set(properties.map(p => p.neighborhood))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [properties]
  );

  // Helper to parse typed price into a clean number
  const parsePriceInput = (val: string): number | undefined => {
    if (!val) return undefined;
    const clean = val.replace(/[^\d]/g, '');
    if (!clean) return undefined;
    const num = Number(clean);
    return isNaN(num) ? undefined : num;
  };

  const effectiveMin = parsePriceInput(priceMinCustom);
  const effectiveMax = parsePriceInput(priceMaxCustom);

  const filteredProperties = properties.filter(p => {
    // 1. Tipo de Negócio
    if (purposeFilter === 'Venda') {
      if (!p.purpose?.includes('Venda')) return false;
    } else if (purposeFilter === 'Locação') {
      if (!p.purpose?.includes('Locação')) return false;
    } else if (purposeFilter === 'Venda e Locação') {
      if (p.purpose !== 'Venda e Locação') return false;
    }

    // 2. Bairro / Localização
    if (neighborhoodFilter !== 'todos' && p.neighborhood !== neighborhoodFilter) return false;

    // 3. Categoria do Imóvel
    if (categoryFilter !== 'todos' && p.category !== categoryFilter) return false;

    // 4. Faixa de Preço Livre
    const effectivePrice = p.price || p.rent_price || 0;
    if (effectiveMin !== undefined && effectivePrice < effectiveMin) return false;
    if (effectiveMax !== undefined && effectivePrice > effectiveMax) return false;

    // 5. Busca rápida por código REO, título, bairro ou endereço
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        (p.code || '').toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.neighborhood || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  const hasActiveFilters =
    neighborhoodFilter !== 'todos' ||
    categoryFilter !== 'todos' ||
    purposeFilter !== 'todos' ||
    !!priceMinCustom ||
    !!priceMaxCustom ||
    !!search.trim();

  const clearFilters = () => {
    setPurposeFilter('todos');
    setNeighborhoodFilter('todos');
    setCategoryFilter('todos');
    setPriceMinCustom('');
    setPriceMaxCustom('');
    setSearch('');
  };

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Carteira de Imóveis Lopes Manaus</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Estoque oficial com dados em tempo real sincronizados do feed Lopesnet
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isMaster && onOpenXmlImport && (
            <button
              onClick={onOpenXmlImport}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-1.5 border border-slate-300/80 shadow-2xs transition cursor-pointer"
              title="Sincronização e Importação de imóveis Lopesnet"
            >
              <FileCode className="w-4 h-4 text-[#F10F4D]" />
              <span>Importar XML</span>
            </button>
          )}

          <button
            onClick={onOpenPdfModal}
            className="px-4 py-2 rounded-xl bg-[#F10F4D] hover:bg-[#d40d43] text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Gerar Catálogo PDF</span>
          </button>
        </div>
      </div>

      {/* Modern Purpose Filter: Venda x Locação x Venda e Locação x Todos */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto shadow-inner border border-slate-200/60">
        {[
          { key: 'todos' as const, label: 'Todos os Imóveis', count: totalCount },
          { key: 'Venda' as const, label: 'Comprar / Venda', count: vendaCount },
          { key: 'Locação' as const, label: 'Alugar / Locação', count: locacaoCount },
          { key: 'Venda e Locação' as const, label: 'Venda e Locação', count: vendaELocacaoCount }
        ].map(tab => {
          const isSelected = purposeFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPurposeFilter(tab.key)}
              className={`shrink-0 py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                isSelected
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
                isSelected ? 'bg-rose-100 text-[#F10F4D]' : 'bg-slate-200/80 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar (Essential Filters Only) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-4">

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código (ex: REO843669), título, bairro, condomínio ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F10F4D] focus:bg-white transition"
          />
        </div>

        {/* Essential Filter Fields: Bairro, Categoria e Faixa de Preço Livre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* 1. Bairro / Localização */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#F10F4D]" />
              <span>Bairro / Localização</span>
            </label>
            <select
              value={neighborhoodFilter}
              onChange={(e) => setNeighborhoodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#F10F4D] focus:bg-white transition"
            >
              <option value="todos">Todos os Bairros ({neighborhoods.length})</option>
              {neighborhoods.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* 2. Categoria do Imóvel */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#F10F4D]" />
              <span>Tipo de Imóvel</span>
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#F10F4D] focus:bg-white transition"
            >
              <option value="todos">Todos os Tipos</option>
              {PROPERTY_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 3. Preço Mínimo Livre */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-[#F10F4D]" />
              <span>Valor Mínimo (R$)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={priceMinCustom}
                onChange={(e) => setPriceMinCustom(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#F10F4D] focus:bg-white transition"
              />
            </div>
          </div>

          {/* 4. Preço Máximo Livre */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-[#F10F4D]" />
              <span>Valor Máximo (R$)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Sem limite"
                value={priceMaxCustom}
                onChange={(e) => setPriceMaxCustom(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#F10F4D] focus:bg-white transition"
              />
            </div>
          </div>

        </div>

        {/* Toolbar Footer: Results Counter + View Switcher + Clear Filters */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 font-medium">
              <strong className="text-slate-900 font-bold">{filteredProperties.length}</strong> {filteredProperties.length === 1 ? 'imóvel disponível' : 'imóveis disponíveis'}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-bold text-[#F10F4D] hover:underline flex items-center space-x-1 cursor-pointer"
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
                : 'Tente ajustar ou limpar os filtros de busca para visualizar outros imóveis da carteira.'}
            </p>
          </div>

          {hasActiveFilters && (
            <div className="pt-1">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          )}

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
