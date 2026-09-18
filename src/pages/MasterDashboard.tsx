import React, { useMemo } from 'react';
import { DashboardStats, Property, User, AuditLog } from '../types';
import {
  Building2,
  CheckCircle2,
  TrendingUp,
  FileCode,
  FileSpreadsheet,
  MapPin,
  Tag,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

interface MasterDashboardProps {
  stats: DashboardStats | null;
  properties: Property[];
  users: User[];
  logs: AuditLog[];
  onOpenNewPropertyModal?: () => void;
  onOpenNewUserModal?: () => void;
  setActiveView: (view: string) => void;
  onPropertyConfirmed?: (property: Property) => void;
}

const CATEGORY_COLORS = [
  '#F10F4D', // Rosa Lopes
  '#0F172A', // Slate 900
  '#2563EB', // Blue 600
  '#10B981', // Emerald 500
  '#8B5CF6', // Violet 500
  '#F59E0B'  // Amber 500
];

export const MasterDashboard: React.FC<MasterDashboardProps> = ({
  properties,
  logs,
  setActiveView
}) => {
  const { user } = useAuth();
  const isMaster = user?.role === 'MASTER_ADMIN';

  // Core volume metrics (Total, Venda, Locação, Ativos)
  const totalProperties = properties.length;
  const vendaProperties = properties.filter(p => p.purpose?.includes('Venda')).length;
  const locacaoProperties = properties.filter(p => p.purpose?.includes('Locação')).length;
  const disponiveisProperties = properties.filter(p => p.status === 'Disponível').length;
  const outrosStatusProperties = totalProperties - disponiveisProperties;

  const vendaPercent = totalProperties > 0 ? Math.round((vendaProperties / totalProperties) * 100) : 0;
  const locacaoPercent = totalProperties > 0 ? Math.round((locacaoProperties / totalProperties) * 100) : 0;

  // Breakdown by Category for evolution/composition chart
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach(p => {
      const cat = p.category || 'Outros';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [properties]);

  // Top Neighborhoods distribution
  const topNeighborhoods = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach(p => {
      const neigh = p.neighborhood?.trim();
      if (neigh) {
        counts[neigh] = (counts[neigh] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [properties]);

  // Recent sync and system audit logs
  const recentLogs = useMemo(() => {
    return logs.slice(0, 6);
  }, [logs]);

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F10F4D]"></span>
            <p className="text-[10px] text-[#F10F4D] font-extrabold uppercase tracking-widest">Painel Executivo Lopes Manaus</p>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">Visão Geral da Carteira de Imóveis</h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitoramento de estoque oficial, categorias e volume de oferta sincronizado do feed Lopesnet
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isMaster && (
            <button
              onClick={() => setActiveView('xml-import')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-2 cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-[#F10F4D]" />
              <span>Sincronização / XML</span>
            </button>
          )}

          <button
            onClick={() => setActiveView('properties')}
            className="px-4 py-2.5 bg-[#F10F4D] hover:bg-[#d40d43] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Consultar Imóveis</span>
          </button>
        </div>
      </div>

      {/* Main Volume Metrics Grid (Removed Total de Usuários, Added Total, Venda, Locação, Ativos) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Total de Imóveis no Sistema */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total de Imóveis</p>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#F10F4D] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalProperties}</p>
            <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Estoque oficial Lopesnet</span>
            </p>
          </div>
        </div>

        {/* 2. Total de Imóveis para Venda */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Para Venda</p>
            <div className="w-10 h-10 rounded-xl bg-rose-50/70 text-[#F10F4D] flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{vendaProperties}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              {vendaPercent}% da carteira total
            </p>
          </div>
        </div>

        {/* 3. Total de Imóveis para Locação */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Para Locação</p>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{locacaoProperties}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              {locacaoPercent}% da carteira total
            </p>
          </div>
        </div>

        {/* 4. Imóveis Disponíveis / Ativos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Disponíveis / Ativos</p>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">{disponiveisProperties}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              {outrosStatusProperties > 0 ? `${outrosStatusProperties} reservados/outros` : '100% prontos para oferta'}
            </p>
          </div>
        </div>

      </div>

      {/* Two Column Layout: Evolução & Composição + Distribuição por Bairros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Indicador de Evolução e Composição da Carteira por Categoria */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base">Composição e Distribuição por Tipo de Imóvel</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Volume de imóveis ativos por categoria no estoque Lopes Manaus
              </p>
            </div>
            <button
              onClick={() => setActiveView('properties')}
              className="text-xs font-bold text-[#F10F4D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver carteira</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {categoryData.length > 0 ? (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      padding: '8px 12px'
                    }}
                    cursor={{ fill: 'rgba(241, 15, 77, 0.08)' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Imóveis">
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhum dado disponível para o gráfico.
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            {categoryData.map((item, idx) => (
              <div key={item.name} className="flex items-center space-x-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                />
                <span className="text-slate-600 truncate font-medium">{item.name}:</span>
                <strong className="text-slate-900 font-bold">{item.count}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Concentração por Principais Bairros de Manaus */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#F10F4D]" />
                <h3 className="font-black text-slate-900 text-base">Principais Bairros</h3>
              </div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase">Manaus</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Localizações com maior volume de oferta na carteira
            </p>

            <div className="space-y-3">
              {topNeighborhoods.map((item, idx) => {
                const percent = totalProperties > 0 ? Math.round((item.count / totalProperties) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="font-mono text-slate-600 font-bold text-[11px]">
                        {item.count} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#F10F4D] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percent, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveView('properties')}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[#F10F4D]" />
              <span>Ver Todos os Imóveis por Bairro</span>
            </button>
          </div>
        </div>

      </div>

      {/* Audit Activity & Sincronização Recente */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-black text-slate-900 text-base">Atividades e Sincronizações Recentes</h3>
          </div>
          {isMaster && (
            <button
              onClick={() => setActiveView('logs')}
              className="text-xs font-bold text-[#F10F4D] hover:underline cursor-pointer"
            >
              Ver Registro Completo
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentLogs.length > 0 ? (
            recentLogs.map(log => (
              <div key={log.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-slate-700">{log.user_name || 'Sistema'}</span>
                  <span>{new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="font-extrabold text-[#F10F4D]">{log.action}</p>
                <p className="text-slate-600 text-[11px] leading-tight line-clamp-2">{log.description}</p>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-6 text-xs text-slate-400">
              Nenhuma atividade recente registrada.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
