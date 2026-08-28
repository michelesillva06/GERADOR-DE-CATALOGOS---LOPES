import React from 'react';
import { DashboardStats, Property, User, AuditLog } from '../types';
import { Users, Building2, CheckCircle2, ShoppingBag, Award, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MasterDashboardProps {
  stats: DashboardStats | null;
  properties: Property[];
  users: User[];
  logs: AuditLog[];
  onOpenNewPropertyModal: () => void;
  onOpenNewUserModal: () => void;
  setActiveView: (view: string) => void;
  onPropertyConfirmed: (property: Property) => void;
}

export const MasterDashboard: React.FC<MasterDashboardProps> = ({
  stats,
  properties,
  users,
  logs,
  onOpenNewPropertyModal,
  onOpenNewUserModal,
  setActiveView,
  onPropertyConfirmed
}) => {
  const { user } = useAuth();
  const isMaster = user?.role === 'MASTER_ADMIN';

  return (
    <div className="space-y-6">

      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Visão Geral Imobiliária - Lopes Captação</h1>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe usuários captadores, métricas de imóveis e gere catálogos digitais
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isMaster && (
            <button
              onClick={() => setActiveView('xml-import')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-[#F10F4D]" />
              <span>Importar Imóveis (XML)</span>
            </button>
          )}
          <button
            onClick={onOpenNewPropertyModal}
            className="px-4 py-2.5 bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
          >
            <span>+ Cadastrar Imóvel</span>
          </button>
        </div>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Total Usuários</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats?.total_users || users.length}</p>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">
              {stats?.active_users || users.filter(u=>u.status==='active').length} Ativos
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Total Imóveis</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats?.total_properties || properties.length}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              {stats?.recent_registrations || 0} cadastrados este mês
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#F10F4D] flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Imóveis Disponíveis</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {stats?.available_properties || properties.filter(p=>p.status==='Disponível').length}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Prontos para catálogo</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Vendidos / Alugados</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {(stats?.sold_properties || 0) + (stats?.rented_properties || 0)}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              {stats?.sold_properties || 0} vendidos • {stats?.rented_properties || 0} alugados
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Two Column Layout: Top Ranking Captadores & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Captadores Ranking */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-slate-900 text-base">Ranking de Captação</h3>
            </div>
            <button
              onClick={() => setActiveView('users')}
              className="text-xs font-bold text-[#F10F4D] hover:underline"
            >
              Gerenciar Usuários
            </button>
          </div>

          <div className="space-y-3">
            {stats?.top_captadores && stats.top_captadores.length > 0 ? (
              stats.top_captadores.map((cap, idx) => (
                <div
                  key={cap.user_id}
                  className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    {cap.photo_url ? (
                      <img
                        src={cap.photo_url}
                        alt={cap.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-300"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-extrabold text-xs text-slate-700">
                        {cap.name ? cap.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-900">{cap.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">/catalogo/{cap.url_slug}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-[#F10F4D] rounded-xl text-xs font-black">
                      {cap.count} imóveis
                    </span>
                    <a
                      href={`/catalogo/${cap.url_slug}`}
                      target="_blank"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                      title="Ver catálogo do captador"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Nenhum captador cadastrado ainda.</p>
            )}
          </div>
        </div>

        {/* Audit Activity Feed */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">Atividades Recentes</h3>
            <button
              onClick={() => setActiveView('logs')}
              className="text-xs font-bold text-[#F10F4D] hover:underline"
            >
              Ver Tudo
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {logs.slice(0, 6).map(log => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-slate-700">{log.user_name}</span>
                  <span>{new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="font-semibold text-rose-600">{log.action}</p>
                <p className="text-slate-600 text-[11px] leading-tight">{log.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
