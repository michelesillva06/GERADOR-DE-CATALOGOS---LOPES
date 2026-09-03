import React, { useState, useMemo } from 'react';
import { Property, User, CompanySettings } from '../types';
import { PropertyTableView } from '../components/PropertyTableView';
import { PropertyStatusBadge, PropertyPurposeBadge, PropertyCategoryBadge } from '../components/PropertyBadges';
import { Building2 as BuildingIcon, Search as SearchIcon, Filter as FilterIcon, FileText as FileTextIcon, MapPin as MapPinIcon, Bed as BedIcon, Bath as BathIcon, Car as CarIcon, Maximize2 as MaximizeIcon, ExternalLink as ExternalLinkIcon, CheckCircle2 as CheckCircleIcon, User as UserIconComponent, Image as ImageIcon, LayoutGrid, List } from 'lucide-react';
import { getPropertyPriceInfo } from '../lib/priceUtils';

interface GeneralCatalogPageProps {
  properties: Property[];
  users: User[];
  companySettings: CompanySettings;
  onOpenPdfCatalog: (prefilteredProps?: Property[]) => void;
  onViewProperty: (property: Property) => void;
  onGenerateAiPost?: (property: Property) => void;
  onGenerateSocialMedia?: (property: Property) => void;
}

export const GeneralCatalogPage: React.FC<GeneralCatalogPageProps> = ({
  properties,
  users,
  companySettings,
  onOpenPdfCatalog,
  onViewProperty,
  onGenerateAiPost,
  onGenerateSocialMedia
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState<'todos' | 'venda' | 'locacao'>('todos');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedCaptador, setSelectedCaptador] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('Disponível');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    const saved = localStorage.getItem('catalog_view_mode');
    return saved === 'table' ? 'table' : 'grid';
  });

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('catalog_view_mode', mode);
  };

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    properties.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesCode = (p.code || '').toLowerCase().includes(q);
        const matchesTitle = (p.title || '').toLowerCase().includes(q);
        const matchesNeighborhood = (p.neighborhood || '').toLowerCase().includes(q);
        const matchesAddress = (p.address || '').toLowerCase().includes(q);
        const matchesCaptador = (p.user_name || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesNeighborhood && !matchesAddress && !matchesCaptador) {
          return false;
        }
      }

      // Purpose (Finalidade: Venda / Locação / Ambos)
      if (selectedPurpose !== 'todos') {
        const pPurpose = (p.purpose || '').toLowerCase();
        if (selectedPurpose === 'venda' && !pPurpose.includes('venda')) return false;
        if (selectedPurpose === 'locacao' && !pPurpose.includes('loca') && !pPurpose.includes('alugu')) return false;
      }

      // Category / Type
      if (selectedCategory !== 'todos') {
        if ((p.category || '').toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Captador Responsável
      if (selectedCaptador !== 'todos') {
        const targetCaptador = users.find(u => u.id === selectedCaptador);
        const matchesId = p.user_id === selectedCaptador || (p.user_id || '').toLowerCase() === selectedCaptador.toLowerCase();
        const matchesName = targetCaptador && ((p.user_name || '').toLowerCase() === targetCaptador.name.toLowerCase() || (p.user_id || '').toLowerCase() === targetCaptador.username.toLowerCase());
        if (!matchesId && !matchesName) return false;
      }

      // Status (Disponível, Reservado, Vendido, Alugado, Todos)
      if (selectedStatus !== 'todos') {
        const rawStatus = (p.status || 'Disponível').trim();
        const normPStatus = rawStatus.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normSelected = selectedStatus.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normPStatus !== normSelected) return false;
      }

      return true;
    });
  }, [properties, users, searchTerm, selectedPurpose, selectedCategory, selectedCaptador, selectedStatus]);

  const activeCaptadors = useMemo(() => {
    return users.filter(u => u.status === 'active' && u.id !== 'usr_demo' && u.username !== 'demo' && u.role !== 'DEMO');
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <BuildingIcon className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-rose-500/20 border border-rose-400/30 px-3 py-1 rounded-full text-xs font-extrabold text-rose-300 mb-2">
              <BuildingIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>Vitrine Completa da Imobiliária</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Catálogo Geral de Imóveis Prontos</h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Pesquise e filtre instantaneamente todos os imóveis disponíveis da equipe. Apresente as melhores opções para o seu cliente com exportação direta em PDF HD.
            </p>
          </div>

          <button
            onClick={() => onOpenPdfCatalog(filteredProperties)}
            className="px-5 py-3 bg-[#F10F4D] hover:bg-rose-600 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-900/40 flex items-center justify-center space-x-2 transition transform active:scale-95 shrink-0 cursor-pointer"
          >
            <FileTextIcon className="w-4 h-4" />
            <span>Gerar Catálogo PDF ({filteredProperties.length})</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search input */}
          <div className="flex-1 relative">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código (ex: LOP-1001), bairro, título ou endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#F10F4D]/20 focus:border-[#F10F4D] transition"
            />
          </div>

          {/* Finalidade Toggle (Venda / Locação / Ambos) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl shrink-0">
            <button
              onClick={() => setSelectedPurpose('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                selectedPurpose === 'todos' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedPurpose('venda')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                selectedPurpose === 'venda' ? 'bg-[#F10F4D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏠 Venda
            </button>
            <button
              onClick={() => setSelectedPurpose('locacao')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                selectedPurpose === 'locacao' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔑 Locação
            </button>
          </div>
        </div>

        {/* Second Row of Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Tipo de Imóvel */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Tipo de Imóvel</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
            >
              <option value="todos">Todos os Tipos</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Captador Responsável */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Captador Responsável</label>
            <select
              value={selectedCaptador}
              onChange={(e) => setSelectedCaptador(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
            >
              <option value="todos">Todos os Captadores</option>
              {activeCaptadors.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
            >
              <option value="Disponível">Disponíveis Apenas</option>
              <option value="todos">Todos os Status</option>
              <option value="Reservado">Reservados</option>
              <option value="Vendido">Vendidos</option>
              <option value="Alugado">Alugados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-600 px-1">
        <div className="flex items-center space-x-3">
          <span>Mostrando <strong>{filteredProperties.length}</strong> de <strong>{properties.length}</strong> imóveis no catálogo geral</span>
          {(searchTerm || selectedPurpose !== 'todos' || selectedCategory !== 'todos' || selectedCaptador !== 'todos' || selectedStatus !== 'Disponível') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedPurpose('todos');
                setSelectedCategory('todos');
                setSelectedCaptador('todos');
                setSelectedStatus('Disponível');
              }}
              className="text-[#F10F4D] hover:underline font-extrabold text-xs cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-end sm:self-auto">
          <button
            type="button"
            id="btn-catalog-view-grid"
            onClick={() => handleSetViewMode('grid')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Visualização em Grade"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grade</span>
          </button>

          <button
            type="button"
            id="btn-catalog-view-table"
            onClick={() => handleSetViewMode('table')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-[#F10F4D] shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Visualização em Tabela Compacta"
          >
            <List className="w-3.5 h-3.5" />
            <span>Tabela</span>
          </button>
        </div>
      </div>

      {/* Properties Display: Grid or Table */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
          <BuildingIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-800">Nenhum imóvel encontrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tente ajustar os filtros acima ou buscar por outro código ou bairro.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <PropertyTableView
          properties={filteredProperties}
          users={users}
          currentUser={users[0]}
          onView={onViewProperty}
          onGenerateAiPost={onGenerateAiPost || onGenerateSocialMedia}
          canEditAny={false}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map(property => {
            const captador = users.find(u =>
              u.id === property.user_id ||
              (property.user_id && u.id?.toLowerCase() === property.user_id.toLowerCase()) ||
              (property.user_id && u.username?.toLowerCase() === property.user_id.toLowerCase()) ||
              (property.user_name && u.name?.toLowerCase() === property.user_name.toLowerCase())
            );
            const isRent = property.purpose?.toLowerCase().includes('loca') || property.purpose?.toLowerCase().includes('alugu');

            return (
              <div
                key={property.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col group"
              >
                {/* Image Box */}
                <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                  <img
                    src={property.main_image || property.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 bg-slate-900/90 text-white font-black text-[10px] uppercase rounded-lg tracking-wider backdrop-blur-md border border-white/20">
                      {property.code}
                    </span>

                    <PropertyStatusBadge status={property.status} variant="solid" size="xs" />
                  </div>

                  {/* Purpose & Category Tag */}
                  <div className="absolute bottom-3 left-3 flex items-center space-x-1.5">
                    <PropertyPurposeBadge purpose={property.purpose} variant="solid" size="xs" />
                    <PropertyCategoryBadge category={property.category} variant="dark-glass" size="xs" />
                  </div>
                </div>

                {/* Content Box */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-1 text-[11px] font-extrabold text-[#F10F4D]">
                      <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{property.neighborhood}, {property.city}</span>
                    </div>

                    <h3 className="font-extrabold text-sm text-slate-900 line-clamp-2 group-hover:text-[#F10F4D] transition">
                      {property.title}
                    </h3>
                  </div>

                  {/* Price */}
                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <div>
                      {(() => {
                        const priceInfo = getPropertyPriceInfo(property);
                        return (
                          <>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">
                              {priceInfo.isBoth ? 'Venda / Locação' : (priceInfo.isRent ? 'Valor de Locação' : 'Valor de Venda')}
                            </span>
                            <span className="text-lg font-black text-slate-900">
                              {priceInfo.primaryFormatted}
                            </span>
                            {priceInfo.isBoth && priceInfo.rentPrice > 0 && priceInfo.salePrice > 0 && (
                              <span className="text-[10px] font-bold text-slate-600 block">
                                Locação: {priceInfo.rentFormatted}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {property.total_area > 0 && (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        {property.total_area} m²
                      </span>
                    )}
                  </div>

                  {/* Key Features Icons */}
                  <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-600 text-center">
                    <div className="flex items-center justify-center space-x-1 py-1 bg-slate-50 rounded-lg">
                      <BedIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{property.bedrooms || 0} dorms</span>
                    </div>

                    <div className="flex items-center justify-center space-x-1 py-1 bg-slate-50 rounded-lg">
                      <BathIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{property.bathrooms || 0} banhs</span>
                    </div>

                    <div className="flex items-center justify-center space-x-1 py-1 bg-slate-50 rounded-lg">
                      <CarIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{property.parking_spaces || 0} vagas</span>
                    </div>
                  </div>

                  {/* Captador Tag */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 shrink-0">
                        {captador?.photo_url ? (
                          <img src={captador.photo_url} alt={captador.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserIconComponent className="w-4 h-4 text-slate-400 m-1" />
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 truncate max-w-[130px]">
                        {captador?.name || 'Lopes Team'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {(onGenerateAiPost || onGenerateSocialMedia) && (
                        <button
                          type="button"
                          id={`btn-gerar-post-ia-general-${property.id || property.code || 'item'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onGenerateAiPost) {
                              onGenerateAiPost(property);
                            } else if (onGenerateSocialMedia) {
                              onGenerateSocialMedia(property);
                            }
                          }}
                          className="px-3 py-1.5 h-8 bg-[#F10F4D] hover:bg-[#d40d43] text-white font-extrabold text-[11px] whitespace-nowrap rounded-xl flex items-center justify-center shadow-xs transition transform active:scale-95 cursor-pointer shrink-0"
                          title="Gerar Post para Redes Sociais"
                        >
                          <span>Gerar Post</span>
                        </button>
                      )}

                      <button
                        onClick={() => onViewProperty(property)}
                        className="px-3 py-1.5 h-8 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] whitespace-nowrap rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
