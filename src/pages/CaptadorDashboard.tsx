import React from 'react';
import { Property, User, CompanySettings } from '../types';
import { PropertyCard } from '../components/PropertyCard';
import { buildWhatsAppUrl, getEffectiveWhatsApp } from '../lib/whatsapp';
import { Building2, PlusCircle, Share2, FileSpreadsheet, ExternalLink, CheckCircle2, Copy } from 'lucide-react';

interface CaptadorDashboardProps {
  user: User;
  properties: Property[];
  companySettings: CompanySettings;
  onOpenNewPropertyModal: () => void;
  onOpenPdfModal: () => void;
  onViewProperty: (property: Property) => void;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (property: Property) => void;
  onShareWhatsApp: (property: Property) => void;
}

export const CaptadorDashboard: React.FC<CaptadorDashboardProps> = ({
  user,
  properties,
  companySettings,
  onOpenNewPropertyModal,
  onOpenPdfModal,
  onViewProperty,
  onEditProperty,
  onDeleteProperty,
  onShareWhatsApp
}) => {
  const isOwnedByCurrentUser = (p: Property) =>
    p.user_id === user.id ||
    p.user_id?.toLowerCase() === user.id?.toLowerCase() ||
    p.user_id?.toLowerCase() === user.username?.toLowerCase() ||
    p.user_id?.toLowerCase() === user.email?.toLowerCase() ||
    ((user.role === 'DEMO' || user.id === 'usr_demo') && (p.user_id === 'usr_demo' || p.id.startsWith('prop_demo_')));

  const myProperties = properties.filter(isOwnedByCurrentUser);

  const availableCount = myProperties.filter(p => p.status === 'Disponível').length;
  const soldCount = myProperties.filter(p => p.status === 'Vendido' || p.status === 'Alugado').length;

  const publicUrl = `${window.location.origin}/catalogo/${user.url_slug || user.username}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    alert('Link público copiado para a área de transferência!');
  };

  const handleShareCatalogWhatsApp = () => {
    const text = `Olá! Confira meu catálogo de imóveis atualizado na Lopes Captação: ${publicUrl}`;
    const targetWa = getEffectiveWhatsApp(user, companySettings);
    const waUrl = buildWhatsAppUrl(targetWa, text);
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {user.photo_url ? (
            <img
              src={user.photo_url}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#F10F4D] shadow-sm shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-[#F10F4D] flex items-center justify-center text-slate-800 font-black text-xl shrink-0 shadow-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : 'C'}
            </div>
          )}
          <div>
            <p className="text-[10px] text-[#F10F4D] font-extrabold uppercase tracking-widest">Painel do Captador</p>
            <h1 className="text-2xl font-black text-slate-900">Bem-vindo(a), {user.name}!</h1>
            <p className="text-xs text-slate-500 mt-0.5">{user.position} • CRECI: {user.creci || '1234-F/AM'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenPdfModal}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 flex items-center space-x-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#F10F4D]" />
            <span>Gerar Catálogo PDF</span>
          </button>
          
          <button
            onClick={onOpenNewPropertyModal}
            className="px-4 py-2.5 rounded-xl bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs flex items-center space-x-2 shadow-md shadow-rose-500/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Imóvel</span>
          </button>
        </div>
      </div>

      {/* Public Catalog Link Box */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Sua Página Pública de Vendas</span>
          <p className="text-sm font-extrabold text-slate-900 mt-0.5">{publicUrl}</p>
          <p className="text-xs text-slate-500">Qualquer cliente pode acessar seus imóveis e solicitar atendimento via WhatsApp</p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition"
          >
            <Copy className="w-4 h-4" />
            <span>Copiar Link</span>
          </button>

          <button
            onClick={handleShareCatalogWhatsApp}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow transition"
          >
            <Share2 className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </button>

          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition"
            title="Abrir página pública"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Meus Imóveis Captados</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{myProperties.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#F10F4D] flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Imóveis Disponíveis</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{availableCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Vendidos / Alugados</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{soldCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Properties List Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Seus Imóveis no Sistema ({myProperties.length})</h2>
          <button
            onClick={onOpenNewPropertyModal}
            className="text-xs font-bold text-[#F10F4D] hover:underline flex items-center space-x-1"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Adicionar Novo</span>
          </button>
        </div>

        {myProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myProperties.map(property => (
              <PropertyCard
                key={property.id}
                property={property}
                captador={user}
                onView={onViewProperty}
                onEdit={onEditProperty}
                onDelete={onDeleteProperty}
                onShareWhatsApp={onShareWhatsApp}
                canEdit={true}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Nenhum imóvel cadastrado ainda</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Comece cadastrando seu primeiro imóvel para gerar catálogos PDF e criar sua vitrine pública.
            </p>
            <button
              onClick={onOpenNewPropertyModal}
              className="px-5 py-2.5 bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Cadastrar Primeiro Imóvel
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
