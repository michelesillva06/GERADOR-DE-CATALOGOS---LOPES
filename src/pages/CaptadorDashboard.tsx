import React from 'react';
import { Property, User, CompanySettings, ScheduleEvent } from '../types';
import { PropertyCard } from '../components/PropertyCard';
import {
  Building2,
  FileSpreadsheet,
  Calendar,
  FileSignature,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink
} from 'lucide-react';

interface CaptadorDashboardProps {
  user: User;
  properties: Property[];
  companySettings: CompanySettings;
  scheduleEvents?: ScheduleEvent[];
  onNavigateView?: (view: string) => void;
  onOpenNewPropertyModal?: () => void;
  onOpenPdfModal: () => void;
  onViewProperty: (property: Property) => void;
  onEditProperty?: (property: Property) => void;
  onDeleteProperty?: (property: Property) => void;
  onShareWhatsApp: (property: Property) => void;
  onGenerateSocialMedia?: (property: Property) => void;
  onGenerateAiPost?: (property: Property) => void;
  onPropertyConfirmed?: (property: Property) => void;
}

export const CaptadorDashboard: React.FC<CaptadorDashboardProps> = ({
  user,
  properties,
  companySettings,
  scheduleEvents = [],
  onNavigateView,
  onOpenPdfModal,
  onViewProperty,
  onShareWhatsApp
}) => {
  const navigate = (view: string) => {
    if (onNavigateView) {
      onNavigateView(view);
    }
  };

  // Portfolio metrics (Consulta Geral do Estoque Lopes Manaus)
  const totalCount = properties.length;
  const vendaCount = properties.filter(p => p.purpose?.includes('Venda')).length;
  const locacaoCount = properties.filter(p => p.purpose?.includes('Locação')).length;

  // Filter user's upcoming visits from schedule
  const today = new Date().toISOString().split('T')[0];
  const userEvents = scheduleEvents.filter(e => {
    const isMine = !e.user_id || e.user_id === user.id || e.user_id === user.username || e.user_id === user.email;
    return isMine && (e.date >= today || !e.date);
  }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Most recent synced properties (first 6 items)
  const recentProperties = [...properties]
    .sort((a, b) => {
      const dateA = new Date(a.synced_at || a.created_at || 0).getTime();
      const dateB = new Date(b.synced_at || b.created_at || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 6);

  return (
    <div className="space-y-6">

      {/* Welcome & Consultation Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center space-x-4">
          {user.photo_url ? (
            <img
              src={user.photo_url}
              alt={user.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#F10F4D] shadow-xs shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-xs border-2 border-[#F10F4D]">
              {user.name ? user.name.charAt(0).toUpperCase() : 'C'}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] text-[#F10F4D] font-extrabold uppercase tracking-widest">Painel do Corretor Lopes Manaus</p>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-0.5">Olá, {user.name}!</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {user.position || 'Corretor Associado'} • CRECI: <strong className="text-slate-700">{user.creci || '1234-F/AM'}</strong> • Sincronização Lopesnet Ativa
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => navigate('properties')}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer"
          >
            <Search className="w-4 h-4 text-[#F10F4D]" />
            <span>Consultar Imóveis</span>
          </button>
          
          <button
            onClick={onOpenPdfModal}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#F10F4D] hover:bg-[#d40d43] text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Gerar Catálogo PDF</span>
          </button>
        </div>
      </div>

      {/* Quick Action Cards (4 Essential Shortcuts) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 1. Todos os Imóveis */}
        <button
          onClick={() => navigate('properties')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#F10F4D] hover:shadow-md transition text-left group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#F10F4D] flex items-center justify-center group-hover:scale-105 transition">
              <Building2 className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#F10F4D] group-hover:translate-x-0.5 transition" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#F10F4D] transition">Todos os Imóveis</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Consultar carteira ({totalCount} imóveis)
            </p>
          </div>
        </button>

        {/* 2. Gerar Catálogo PDF */}
        <button
          onClick={onOpenPdfModal}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#F10F4D] hover:shadow-md transition text-left group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#F10F4D] group-hover:translate-x-0.5 transition" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#F10F4D] transition">Catálogo PDF</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Apresentações com seu CRECI
            </p>
          </div>
        </button>

        {/* 3. Agenda de Visitas */}
        <button
          onClick={() => navigate('schedule')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#F10F4D] hover:shadow-md transition text-left group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
              <Calendar className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#F10F4D] group-hover:translate-x-0.5 transition" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#F10F4D] transition">Agenda de Visitas</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {userEvents.length > 0 ? `${userEvents.length} agendamento(s)` : 'Planejar visitas'}
            </p>
          </div>
        </button>

        {/* 4. Gerar Contratos */}
        <button
          onClick={() => navigate('contracts')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#F10F4D] hover:shadow-md transition text-left group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
              <FileSignature className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#F10F4D] group-hover:translate-x-0.5 transition" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#F10F4D] transition">Gerar Contratos</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Modelos jurídicos oficiais
            </p>
          </div>
        </button>

      </div>

      {/* Portfolio Overview Summary (Visão de Consulta da Carteira Lopesnet) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Estoque Lopes Manaus (Visão Geral)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Imóveis sincronizados e disponíveis para oferta e consulta
            </p>
          </div>
          <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Sincronizado
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Portfólio Total</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">imóveis disponíveis</p>
          </div>

          <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100">
            <p className="text-[10px] font-extrabold text-[#F10F4D] uppercase">Para Venda</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{vendaCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">prontos para oferta</p>
          </div>

          <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100">
            <p className="text-[10px] font-extrabold text-indigo-600 uppercase">Para Locação</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{locacaoCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">para aluguel</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Sua Agenda</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{userEvents.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">visitas futuras</p>
          </div>
        </div>
      </div>

      {/* Section: Resumo da Agenda de Visitas do Captador */}
      {userEvents.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Suas Próximas Visitas Agendadas</h3>
                <p className="text-[11px] text-slate-500">Compromissos cadastrados na sua agenda</p>
              </div>
            </div>
            <button
              onClick={() => navigate('schedule')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>Ver agenda completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {userEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 hover:bg-slate-100/80 transition space-y-2 cursor-pointer"
                onClick={() => navigate('schedule')}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-900 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-600" />
                    {event.date} • {event.start_time || '09:00'}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                    {event.type || 'Visita'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{event.title || 'Visita a Imóvel'}</h4>
                {event.client_name && (
                  <p className="text-[11px] text-slate-500 font-medium">Cliente: {event.client_name}</p>
                )}
                {event.property_code && (
                  <p className="text-[10px] font-mono text-[#F10F4D] font-bold">REO: {event.property_code}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section: Últimos Imóveis Sincronizados no Sistema */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#F10F4D]" />
              <span>Últimos Imóveis Sincronizados (Feed Lopesnet)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Atualizações recentes recebidas automaticamente do estoque da imobiliária
            </p>
          </div>

          <button
            onClick={() => navigate('properties')}
            className="text-xs font-bold text-[#F10F4D] hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>Ver todos ({totalCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentProperties.map(property => (
              <PropertyCard
                key={property.id}
                property={property}
                captador={user}
                onView={onViewProperty}
                onShareWhatsApp={onShareWhatsApp}
                hidePerMonth={true}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-500">
              Ainda não há imóveis sincronizados no sistema.
            </p>
          </div>
        )}

        <div className="pt-2 text-center">
          <button
            onClick={() => navigate('properties')}
            className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition inline-flex items-center space-x-2 cursor-pointer"
          >
            <span>Explorar Todos os {totalCount} Imóveis da Carteira</span>
            <ArrowRight className="w-4 h-4 text-[#F10F4D]" />
          </button>
        </div>
      </div>

    </div>
  );
};
