import React, { useState } from 'react';
import { Property, User, CompanySettings } from '../types';
import { PropertyCard } from '../components/PropertyCard';
import { Search, Filter, Plus, FileSpreadsheet, Building2, Layers, MapPin, FileCode, Sparkles } from 'lucide-react';
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
}

export const PropertyManagement: React.FC<PropertyManagementProps> = ({
  properties,
  users,
  currentUser,
  onOpenNewPropertyModal,
  onOpenPdfModal,
  onOpenXmlImport,
  onViewProperty,
  onEditProperty,
  onDeleteProperty,
  onShareWhatsApp
}) => {
  const [scopeTab, setScopeTab] = useState<'meus' | 'geral'>('meus');
  const [search, setSearch] = useState('');
  const [filterCaptador, setFilterCaptador] = useState('todos');
  const [filterCategory, setFilterCategory] = useState('todos');
  const [filterPurpose, setFilterPurpose] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterNeighborhood, setFilterNeighborhood] = useState('todos');
  const [loadingDemo, setLoadingDemo] = useState(false);

  const isMaster = currentUser.role === 'MASTER_ADMIN';
  const isGestora = currentUser.role === 'GESTORA';
  const isCaptador = currentUser.role === 'CAPTADOR';
  const isMasterOrGestora = isMaster || isGestora;

  const handleSeedDemoProperties = async () => {
    setLoadingDemo(true);
    try {
      const res = await fetch('/api/properties/seed-demo', { method: 'POST' });
      if (res.ok) {
        window.dispatchEvent(new Event('lopes_properties_updated'));
      }
    } catch (e) {
      console.warn('Error loading demo properties:', e);
    } finally {
      setLoadingDemo(false);
    }
  };

  const isOwnedByCurrentUser = (p: Property) =>
    p.user_id === currentUser.id ||
    p.user_id?.toLowerCase() === currentUser.id?.toLowerCase() ||
    p.user_id?.toLowerCase() === currentUser.username?.toLowerCase() ||
    p.user_id?.toLowerCase() === currentUser.email?.toLowerCase();

  const myProperties = properties.filter(isOwnedByCurrentUser);

  // Base properties scoping
  let baseProperties = properties;
  if (isCaptador) {
    baseProperties = scopeTab === 'meus' ? myProperties : properties;
  }

  // Get list of unique neighborhoods
  const neighborhoods = Array.from(new Set(baseProperties.map(p => p.neighborhood))).filter(Boolean);

  // Filter properties
  const filteredProperties = baseProperties.filter(p => {
    if (filterCaptador !== 'todos' && p.user_id !== filterCaptador) return false;
    if (filterCategory !== 'todos' && p.category !== filterCategory) return false;
    if (filterPurpose !== 'todos' && !p.purpose.includes(filterPurpose)) return false;
    if (filterStatus !== 'todos' && p.status !== filterStatus) return false;
    if (filterNeighborhood !== 'todos' && p.neighborhood !== filterNeighborhood) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.code.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {isMaster ? 'Gestão de Imóveis do Sistema' : isGestora ? 'Visualização Geral de Imóveis (Gestora)' : 'Gestão e Catálogo de Imóveis'}
          </h1>
          <p className="text-xs text-slate-500">
            Exibindo {filteredProperties.length} de {baseProperties.length} imóveis cadastrados em Manaus
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isMasterOrGestora && onOpenXmlImport && (
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

          {!isGestora && (
            <button
              onClick={onOpenNewPropertyModal}
              className="px-4 py-2.5 rounded-xl bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-rose-900/30 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Imóvel</span>
            </button>
          )}
        </div>
      </div>

      {/* Scope Selector Tabs for Captadores */}
      {isCaptador && (
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center space-x-2 max-w-md">
          <button
            type="button"
            onClick={() => setScopeTab('meus')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              scopeTab === 'meus'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Meus Imóveis Captados</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
              scopeTab === 'meus' ? 'bg-rose-100 text-[#F10F4D]' : 'bg-slate-200 text-slate-700'
            }`}>
              {myProperties.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setScopeTab('geral')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              scopeTab === 'geral'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Catálogo Geral</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
              scopeTab === 'geral' ? 'bg-rose-100 text-[#F10F4D]' : 'bg-slate-200 text-slate-700'
            }`}>
              {properties.length}
            </span>
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        
        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código (ex: LOP-1001), título, bairro, endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#F10F4D]"
          />
        </div>

        {/* Dropdowns row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          
          {isMasterOrGestora && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Captador</label>
              <select
                value={filterCaptador}
                onChange={(e) => setFilterCaptador(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="todos">Todos os Captadores</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Finalidade</label>
            <select
              value={filterPurpose}
              onChange={(e) => setFilterPurpose(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="todos">Todas Finalidades</option>
              <option value="Venda">Venda</option>
              <option value="Locação">Locação</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Categoria</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="todos">Todas Categorias</option>
              {PROPERTY_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="todos">Todos os Status</option>
              <option value="Disponível">Disponível</option>
              <option value="Reservado">Reservado</option>
              <option value="Vendido">Vendido</option>
              <option value="Alugado">Alugado</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bairro</label>
            <select
              value={filterNeighborhood}
              onChange={(e) => setFilterNeighborhood(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="todos">Todos os Bairros</option>
              {neighborhoods.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Property Cards Grid */}
      {filteredProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map(prop => {
            const owner = users.find(u => u.id === prop.user_id);
            const canEdit = isMaster || (!isGestora && isOwnedByCurrentUser(prop));
            return (
              <PropertyCard
                key={prop.id}
                property={prop}
                captador={owner}
                onView={onViewProperty}
                onEdit={onEditProperty}
                onDelete={onDeleteProperty}
                onShareWhatsApp={onShareWhatsApp}
                canEdit={canEdit}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-slate-200 space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {baseProperties.length === 0 ? 'Nenhum imóvel cadastrado no momento' : 'Nenhum imóvel corresponde aos filtros'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {baseProperties.length === 0
                ? 'O sistema está pronto para receber os imóveis da sua imobiliária em Manaus. Você pode cadastrar manualmente, importar em lote via XML ou carregar imóveis de exemplo para testar.'
                : 'Tente ajustar ou limpar os filtros de busca para visualizar outros imóveis.'}
            </p>
          </div>

          {baseProperties.length === 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onOpenNewPropertyModal}
                className="px-4 py-2.5 bg-[#F10F4D] hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Cadastrar Imóvel</span>
              </button>

              {onOpenXmlImport && (
                <button
                  type="button"
                  onClick={onOpenXmlImport}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-emerald-600" />
                  <span>Importar XML</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSeedDemoProperties}
                disabled={loadingDemo}
                className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{loadingDemo ? 'Carregando Exemplos...' : 'Carregar 4 Imóveis de Exemplo'}</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
