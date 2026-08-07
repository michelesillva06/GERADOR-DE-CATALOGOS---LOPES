import React, { useState, useMemo } from 'react';
import { Property, User, AuditLog, CompanySettings } from '../types';
import { exportControlSpreadsheet } from '../lib/excelGenerator';
import { exportControlPDF } from '../lib/reportsPdf';
import {
  FileSpreadsheet,
  Download,
  TrendingUp,
  Building2,
  Users,
  Award,
  History,
  Filter,
  Search,
  CheckCircle2,
  ShoppingBag,
  DollarSign,
  FileText,
  Calendar,
  Eye,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Target,
  Compass,
  BarChart3,
  PieChart
} from 'lucide-react';

interface ReportsPageProps {
  properties: Property[];
  users: User[];
  logs: AuditLog[];
  companySettings: CompanySettings;
  currentUser: User;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  properties,
  users,
  logs,
  companySettings,
  currentUser
}) => {
  const isMasterOrGestora = currentUser.role === 'MASTER_ADMIN' || currentUser.role === 'GESTORA';

  // State for filters
  const [selectedCaptadorFilter, setSelectedCaptadorFilter] = useState<string>('ALL');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [datePeriodFilter, setDatePeriodFilter] = useState<'7d' | '30d' | 'all'>('30d');
  const [downloadingFormat, setDownloadingFormat] = useState<'xlsx' | 'pdf' | null>(null);

  // Filter logs by period and search
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Filter by captador
    if (selectedCaptadorFilter !== 'ALL') {
      result = result.filter(l => l.user_id === selectedCaptadorFilter || l.user_name === selectedCaptadorFilter);
    }

    // Filter by action
    if (selectedActionFilter !== 'ALL') {
      result = result.filter(l => l.action.toLowerCase().includes(selectedActionFilter.toLowerCase()));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        l =>
          l.description.toLowerCase().includes(term) ||
          l.user_name.toLowerCase().includes(term) ||
          l.action.toLowerCase().includes(term)
      );
    }

    // Filter by date period
    const now = new Date();
    if (datePeriodFilter === '7d') {
      const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(l => new Date(l.created_at) >= past7Days);
    } else if (datePeriodFilter === '30d') {
      const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter(l => new Date(l.created_at) >= past30Days);
    }

    return result;
  }, [logs, selectedCaptadorFilter, selectedActionFilter, searchTerm, datePeriodFilter]);

  // Overall Financial & Metrics calculations
  const totalPropertiesCount = properties.length;
  const availableCount = properties.filter(p => p.status === 'Disponível').length;
  const soldCount = properties.filter(p => p.status === 'Vendido').length;
  const rentedCount = properties.filter(p => p.status === 'Alugado').length;
  const reservedCount = properties.filter(p => p.status === 'Reservado').length;

  const totalVgvVenda = properties
    .filter(p => p.purpose.includes('Venda') && p.price)
    .reduce((acc, p) => acc + (p.price || 0), 0);

  const totalVgvLocacao = properties
    .filter(p => p.purpose.includes('Locação') && (p.rent_price || p.price))
    .reduce((acc, p) => acc + (p.rent_price || p.price || 0), 0);

  const avgTicketVenda = totalVgvVenda / Math.max(properties.filter(p => p.purpose.includes('Venda')).length, 1);

  const activeCaptadores = users.filter(u => u.status === 'active');

  // Breakdown by Neighborhood for Strategy
  const neighborhoodStats = useMemo(() => {
    const map: Record<string, { count: number; vgv: number }> = {};
    properties.forEach(p => {
      const neigh = p.neighborhood?.trim() || 'Outros';
      if (!map[neigh]) map[neigh] = { count: 0, vgv: 0 };
      map[neigh].count += 1;
      map[neigh].vgv += (p.price || p.rent_price || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  }, [properties]);

  // Breakdown per captador
  const captadoresPerformance = useMemo(() => {
    return users.map(u => {
      const uProps = properties.filter(p => p.user_id === u.id);
      const uAvailable = uProps.filter(p => p.status === 'Disponível').length;
      const uSold = uProps.filter(p => p.status === 'Vendido').length;
      const uRented = uProps.filter(p => p.status === 'Alugado').length;
      const uReserved = uProps.filter(p => p.status === 'Reservado').length;

      const uVgvVenda = uProps
        .filter(p => p.purpose.includes('Venda') && p.price)
        .reduce((acc, p) => acc + (p.price || 0), 0);

      const uVgvLocacao = uProps
        .filter(p => p.purpose.includes('Locação') && (p.rent_price || p.price))
        .reduce((acc, p) => acc + (p.rent_price || p.price || 0), 0);

      const uTotalVgv = uVgvVenda + uVgvLocacao;
      const uAvgTicket = uTotalVgv / Math.max(uProps.length, 1);

      // Top Neighborhoods
      const uNeighMap: Record<string, number> = {};
      uProps.forEach(p => {
        const n = p.neighborhood || 'Outro';
        uNeighMap[n] = (uNeighMap[n] || 0) + 1;
      });
      const topNeigh = Object.entries(uNeighMap)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Geral';

      const uLogs = logs.filter(l => l.user_id === u.id || l.user_name?.toLowerCase() === u.name.toLowerCase());
      const lastActivity = uLogs[0]?.created_at;

      return {
        user: u,
        total: uProps.length,
        available: uAvailable,
        sold: uSold,
        rented: uRented,
        reserved: uReserved,
        vgvVenda: uVgvVenda,
        vgvLocacao: uVgvLocacao,
        totalVgv: uTotalVgv,
        avgTicket: uAvgTicket,
        topNeigh,
        lastActivity,
        activityCount: uLogs.length
      };
    }).sort((a, b) => b.total - a.total);
  }, [users, properties, logs]);

  const handleDownloadXLSX = () => {
    setDownloadingFormat('xlsx');
    setTimeout(() => {
      exportControlSpreadsheet(properties, users, logs, companySettings, currentUser);
      setDownloadingFormat(null);
    }, 400);
  };

  const handleDownloadPDF = () => {
    setDownloadingFormat('pdf');
    setTimeout(() => {
      exportControlPDF(properties, users, logs, companySettings, currentUser);
      setDownloadingFormat(null);
    }, 400);
  };

  if (!isMasterOrGestora) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-xs max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-[#F10F4D] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Acesso Restrito à Gestão</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          O relatório executivo para a diretoria e controle de movimentações é exclusivo para a <strong>Gestora</strong> e <strong>Administrador Master</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* 1. HEADER BANNER & EXPORT BUTTONS */}
      <div className="bg-[#333333] rounded-3xl p-6 sm:p-8 text-white border border-[#444444] shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-[#F10F4D]/15 text-[#F10F4D] border border-[#F10F4D]/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Target className="w-3.5 h-3.5" />
            <span>Relatório Executivo para a Diretoria</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Estratégia, Desempenho Geral e Produtividade da Equipe
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Relatório analítico reunindo a <strong>Estratégia de Captação</strong>, métricas de <strong>Desempenho Geral</strong> da carteira e matriz de <strong>Produtividade Individual dos Captadores</strong> para apresentação ao Diretor.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingFormat !== null}
            className="px-5 py-3.5 bg-[#F10F4D] hover:bg-rose-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-950/50 transition flex items-center justify-center space-x-2 transform active:scale-95 cursor-pointer"
          >
            {downloadingFormat === 'pdf' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 text-white" />
            )}
            <span>{downloadingFormat === 'pdf' ? 'Gerando PDF Landscape...' : 'Baixar Relatório PDF (Horizontal/Paisagem)'}</span>
          </button>

          <button
            onClick={handleDownloadXLSX}
            disabled={downloadingFormat !== null}
            className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl border border-slate-700 transition flex items-center justify-center space-x-2 transform active:scale-95 cursor-pointer"
          >
            {downloadingFormat === 'xlsx' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            )}
            <span>{downloadingFormat === 'xlsx' ? 'Gerando Planilha...' : 'Exportar Planilha Excel (.XLSX)'}</span>
          </button>
        </div>
      </div>

      {/* 2. PILARES DA ESTRATÉGIA DE CAPTAÇÃO & COBERTURA */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#F10F4D] flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">1. Estratégia de Captação e Cobertura do Mercado</h2>
            <p className="text-xs text-slate-500">Apresentação dos pilares operacionais, modelo de catálogos e foco geográfico</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex items-center space-x-2 text-[#F10F4D] font-extrabold text-xs uppercase">
              <Target className="w-4 h-4" />
              <span>Foco Geográfico de Alta Liquidez</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Prospecção direcionada aos bairros nobres e de maior apelo comercial em Manaus: <strong>Adrianópolis, Ponta Negra, Vieiralves, Dom Pedro e Tarumã</strong>.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex items-center space-x-2 text-[#F10F4D] font-extrabold text-xs uppercase">
              <Building2 className="w-4 h-4" />
              <span>Catálogos Públicos Individuais</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cada captador possui um link público individual (URL amigável) personalizado com a marca oficial Lopes para envio imediato a clientes e investidores.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex items-center space-x-2 text-[#F10F4D] font-extrabold text-xs uppercase">
              <BarChart3 className="w-4 h-4" />
              <span>Giro de Carteira & Controle de Status</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Monitoramento continuo das etapas: <em>Disponível → Reservado → Vendido/Alugado</em>, assegurando informações confiáveis em tempo real.
            </p>
          </div>
        </div>

        {/* Neighborhood Distribution Cards */}
        {neighborhoodStats.length > 0 && (
          <div className="pt-2">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">
              Top Bairros com Maior Volume de Captações
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {neighborhoodStats.map(([neigh, data]) => (
                <div key={neigh} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{neigh}</p>
                  <p className="text-lg font-black text-[#F10F4D]">{data.count} <span className="text-[10px] font-semibold text-slate-400">imóveis</span></p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(data.vgv)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. DESEMPENHO GERAL DA EQUIPE (STATS OVERVIEW) */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">2. Desempenho Geral da Equipe e Métrica Financeira</h2>
            <p className="text-xs text-slate-500">Indicadores consolidados da carteira de imóveis gerenciada pelos captadores</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Imóveis na Carteira</span>
              <p className="text-2xl font-black text-slate-900">{totalPropertiesCount}</p>
              <div className="flex items-center space-x-2 text-[10px] font-extrabold">
                <span className="text-emerald-600">{availableCount} disponíveis</span>
                <span className="text-slate-300">•</span>
                <span className="text-zinc-700">{soldCount + rentedCount} concluídos</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#F10F4D] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">VGV Acumulado (Venda)</span>
              <p className="text-xl font-black text-emerald-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalVgvVenda)}
              </p>
              <p className="text-[10px] text-slate-400 font-bold">
                Ticket Médio: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(avgTicketVenda)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Captadores Ativos</span>
              <p className="text-2xl font-black text-slate-900">{activeCaptadores.length}</p>
              <p className="text-[10px] text-slate-600 font-bold">
                Média: {(totalPropertiesCount / Math.max(activeCaptadores.length, 1)).toFixed(1)} imóveis / captador
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">VGV Locação Mensal</span>
              <p className="text-xl font-black text-zinc-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalVgvLocacao)}
              </p>
              <p className="text-[10px] text-slate-400 font-bold">Soma de aluguéis mensais</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* 4. MATRIZ DE PRODUTIVIDADE E DESEMPENHO DOS CAPTADORES */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">3. Desempenho e Produtividade Individual dos Captadores</h2>
              <p className="text-xs text-slate-500">Detalhamento individual: volume captado, VGV sob gestão, ticket médio e bairro foco</p>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="text-xs font-bold text-[#F10F4D] hover:underline flex items-center space-x-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Gerar este relatório em PDF Landscape</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5 rounded-l-xl">Captador / Cargo</th>
                <th className="p-3.5">CRECI</th>
                <th className="p-3.5 text-center">Total Captados</th>
                <th className="p-3.5 text-center">Disponíveis</th>
                <th className="p-3.5 text-center">Vendidos</th>
                <th className="p-3.5 text-center">Alugados</th>
                <th className="p-3.5 text-right">VGV Venda (R$)</th>
                <th className="p-3.5 text-right">Ticket Médio (R$)</th>
                <th className="p-3.5">Bairro Foco</th>
                <th className="p-3.5">Última Atividade</th>
                <th className="p-3.5 rounded-r-xl text-center">Catálogo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {captadoresPerformance.map((item, idx) => {
                const u = item.user;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5">
                      <div className="flex items-center space-x-3">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        {u.photo_url ? (
                          <img src={u.photo_url} alt={u.name} className="w-8 h-8 rounded-full object-cover border shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-rose-100 text-[#F10F4D] font-extrabold flex items-center justify-center shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.position || 'Captador'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">{u.creci || '-'}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-900 font-extrabold rounded-lg">
                        {item.total}
                      </span>
                    </td>
                    <td className="p-3.5 text-center text-emerald-600 font-bold">{item.available}</td>
                    <td className="p-3.5 text-center text-rose-600 font-bold">{item.sold}</td>
                    <td className="p-3.5 text-center text-zinc-800 font-bold">{item.rented}</td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(item.vgvVenda)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(item.avgTicket)}
                    </td>
                    <td className="p-3.5 text-slate-700 font-semibold">{item.topNeigh}</td>
                    <td className="p-3.5 text-[11px] text-slate-500">
                      {item.lastActivity ? (
                        new Date(item.lastActivity).toLocaleDateString('pt-BR') + ' ' + new Date(item.lastActivity).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      ) : (
                        <span className="italic text-slate-400">Sem registros</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <a
                        href={`/catalogo/${u.url_slug || u.username}`}
                        target="_blank"
                        className="inline-flex items-center p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        title="Abrir Catálogo Público"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. SEÇÃO: CADASTRO DE CLIENTES (COMPRADORES & INQUILINOS) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">4. Clientes Cadastrados & Negócios Concluídos</h2>
              <p className="text-xs text-slate-500">Registro de compradores e inquilinos associados aos imóveis negociados pela imobiliária</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl">
              {properties.filter(p => p.client_name || p.status === 'Vendido' || p.status === 'Alugado' || p.status === 'Reservado').length} clientes
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5 rounded-l-xl">Código / Imóvel</th>
                <th className="p-3.5">Cliente Cadastrado</th>
                <th className="p-3.5">CPF / CNPJ</th>
                <th className="p-3.5">Telefone / E-mail</th>
                <th className="p-3.5 text-center">Tipo</th>
                <th className="p-3.5 text-center">Status Imóvel</th>
                <th className="p-3.5 text-right">Valor Negócio</th>
                <th className="p-3.5 rounded-r-xl">Captador Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {properties.filter(p => p.client_name || p.status === 'Vendido' || p.status === 'Alugado' || p.status === 'Reservado').length > 0 ? (
                properties.filter(p => p.client_name || p.status === 'Vendido' || p.status === 'Alugado' || p.status === 'Reservado').map(p => {
                  const owner = users.find(u => u.id === p.user_id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-900 block">{p.code}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[180px] block">{p.title}</span>
                      </td>
                      <td className="p-3.5 font-extrabold text-slate-900">
                        {p.client_name || <span className="text-slate-400 font-normal italic">Não informado</span>}
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono text-[11px]">{p.client_cpf_cnpj || '-'}</td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-800">{p.client_phone || '-'}</p>
                        <p className="text-[10px] text-slate-400">{p.client_email || '-'}</p>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          p.client_type === 'INQUILINO' || p.status === 'Alugado' ? 'bg-zinc-200 text-zinc-900' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.client_type || (p.status === 'Alugado' ? 'INQUILINO' : 'COMPRADOR')}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          p.status === 'Vendido' ? 'bg-emerald-600 text-white' :
                          p.status === 'Alugado' ? 'bg-zinc-800 text-white' :
                          p.status === 'Reservado' ? 'bg-amber-500 text-white' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black text-emerald-700">
                        {p.transaction_value || p.price || p.rent_price
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(p.transaction_value || p.price || p.rent_price || 0)
                          : '-'}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {owner ? owner.name : 'Sistema'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 font-bold text-xs">
                    Nenhum cliente cadastrado em imóvel negociado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. SEÇÃO DE LINHA DO TEMPO & MOVIMENTAÇÕES DOS CAPTADORES */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#F10F4D] flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">5. Histórico e Linha do Tempo de Auditagem</h2>
              <p className="text-xs text-slate-500">Registro em tempo real de cadastros de imóveis, mudanças de status, edições e acessos</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-500">Exibindo:</span>
            <span className="px-2.5 py-1 bg-rose-100 text-[#F10F4D] font-extrabold rounded-lg">
              {filteredLogs.length} movimentações
            </span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome, código ou palavra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#F10F4D]"
            />
          </div>

          {/* Filter by Captador */}
          <div className="relative">
            <select
              value={selectedCaptadorFilter}
              onChange={(e) => setSelectedCaptadorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#F10F4D]"
            >
              <option value="ALL">Todos os Captadores</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          {/* Filter by Action */}
          <div className="relative">
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#F10F4D]"
            >
              <option value="ALL">Todas as Ações</option>
              <option value="Cadastrou">Cadastrou Imóvel</option>
              <option value="Status">Alterou Status</option>
              <option value="Editou">Editou Informações</option>
              <option value="Excluiu">Excluiu Imóvel</option>
              <option value="Login">Acesso / Login</option>
            </select>
          </div>

          {/* Filter by Date Period */}
          <div className="flex items-center space-x-1 bg-white p-1 border border-slate-200 rounded-xl">
            <button
              onClick={() => setDatePeriodFilter('7d')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
                datePeriodFilter === '7d' ? 'bg-[#F10F4D] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setDatePeriodFilter('30d')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
                datePeriodFilter === '30d' ? 'bg-[#F10F4D] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setDatePeriodFilter('all')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
                datePeriodFilter === 'all' ? 'bg-[#F10F4D] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
          </div>

        </div>

        {/* Logs Timeline List */}
        <div className="space-y-3">
          {filteredLogs.length > 0 ? (
            filteredLogs.map(log => {
              const captador = users.find(u => u.id === log.user_id || u.name === log.user_name);
              const isStatusChange = log.action.toLowerCase().includes('status');
              const isCreation = log.action.toLowerCase().includes('cadastr') || log.action.toLowerCase().includes('novo');
              const isDeletion = log.action.toLowerCase().includes('exclu');

              return (
                <div
                  key={log.id}
                  className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 transition flex items-start justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5">
                    {captador?.photo_url ? (
                      <img src={captador.photo_url} alt={log.user_name} className="w-9 h-9 rounded-full object-cover border mt-0.5" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'S'}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-xs">{log.user_name}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          isCreation
                            ? 'bg-emerald-100 text-emerald-700'
                            : isStatusChange
                            ? 'bg-zinc-200 text-zinc-900'
                            : isDeletion
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {log.action}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {log.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                      {new Date(log.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <History className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">Nenhuma movimentação encontrada para estes filtros.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
