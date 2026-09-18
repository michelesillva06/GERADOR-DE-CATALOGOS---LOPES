import React, { useState, useMemo } from 'react';
import { Property, User, AuditLog, CompanySettings, JournalEntry } from '../types';
import { exportControlSpreadsheet } from '../lib/excelGenerator';
import { exportControlPDF } from '../lib/reportsPdf';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  FileSpreadsheet,
  Building2,
  Users,
  Award,
  History,
  Calendar,
  ShieldCheck,
  RefreshCw,
  Compass,
  FileSignature,
  Share2,
  Check,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  FileText
} from 'lucide-react';

interface ReportsPageProps {
  properties: Property[];
  users: User[];
  logs: AuditLog[];
  companySettings: CompanySettings;
  currentUser: User;
  journalEntries?: JournalEntry[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  properties,
  users,
  logs,
  companySettings,
  currentUser,
  journalEntries = []
}) => {
  const isMasterOrGestor = currentUser.role === 'MASTER_ADMIN' || currentUser.role === 'GESTOR' || currentUser.role === 'GESTORA';

  // Navigation tab: 'weekly-director' | 'portfolio-strategy' | 'audit-logs'
  const [activeReportTab, setActiveReportTab] = useState<'weekly-director' | 'portfolio-strategy' | 'audit-logs'>('weekly-director');

  // Period Filter: 7d, 14d, 30d, all
  const [datePeriodFilter, setDatePeriodFilter] = useState<'7d' | '14d' | '30d' | 'all'>('7d');
  const [chartType, setChartType] = useState<'timeline' | 'comparison' | 'distribution'>('timeline');

  const [selectedCaptadorFilter, setSelectedCaptadorFilter] = useState<string>('ALL');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [downloadingFormat, setDownloadingFormat] = useState<'xlsx' | 'pdf' | null>(null);

  // WhatsApp share state
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  // Date boundary for period filter
  const dateThreshold = useMemo(() => {
    const now = new Date();
    if (datePeriodFilter === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (datePeriodFilter === '14d') return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    if (datePeriodFilter === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return new Date(0);
  }, [datePeriodFilter]);

  // Active broker members
  const activeMembers = useMemo(() => {
    return users.filter(u => {
      if (u.status !== 'active') return false;
      if (u.is_demo || u.username === 'demo' || u.role === 'DEMO') return false;
      if (u.role === 'MASTER_ADMIN' || (u.role as string) === 'ADMIN' || u.role === 'GESTOR' || u.role === 'GESTORA') {
        return false;
      }
      return true;
    });
  }, [users]);

  // Logs in period
  const periodLogs = useMemo(() => {
    return logs.filter(l => new Date(l.created_at) >= dateThreshold);
  }, [logs, dateThreshold]);

  // ----------------------------------------------------
  // 1. REFORMULATED 4 PILLARS OF PERFORMANCE
  // ----------------------------------------------------
  // Pillar 1: Novos imóveis sincronizados automaticamente
  const syncedPropertiesInPeriod = useMemo(() => {
    const matched = properties.filter(p => {
      const syncDate = p.synced_at ? new Date(p.synced_at) : (p.created_at ? new Date(p.created_at) : new Date(0));
      return syncDate >= dateThreshold;
    });
    // If no property falls strictly in recent window (e.g., initial seed), show all properties as synced
    return matched.length > 0 ? matched : properties;
  }, [properties, dateThreshold]);

  const syncedCount = syncedPropertiesInPeriod.length;
  const syncedVgv = useMemo(() => {
    return syncedPropertiesInPeriod.reduce((sum, p) => sum + (p.price || p.rent_price || 0), 0);
  }, [syncedPropertiesInPeriod]);

  // Pillar 2: Agenda de visitas realizadas/agendadas
  const teamVisitsInPeriod = useMemo(() => {
    // Sum from journals in period
    const journalVisits = journalEntries
      .filter(j => new Date(j.date + 'T12:00:00') >= dateThreshold)
      .reduce((sum, j) => sum + (j.visitas_realizadas || 0), 0);

    // Also count visit/schedule audit logs
    const logVisits = periodLogs.filter(l => {
      const a = (l.action || '').toLowerCase();
      const d = (l.description || '').toLowerCase();
      return a.includes('visita') || a.includes('schedule') || d.includes('visita') || d.includes('agenda');
    }).length;

    return Math.max(journalVisits, logVisits, 0);
  }, [journalEntries, periodLogs, dateThreshold]);

  // Pillar 3: Contratos gerados
  const teamContractsInPeriod = useMemo(() => {
    return periodLogs.filter(l => {
      const a = (l.action || '').toLowerCase();
      const d = (l.description || '').toLowerCase();
      return a.includes('contrato') || a.includes('contract') || d.includes('contrato') || d.includes('contract');
    }).length;
  }, [periodLogs]);

  // Pillar 4: Catálogos PDF gerados
  const teamPdfsInPeriod = useMemo(() => {
    return periodLogs.filter(l => {
      const a = (l.action || '').toLowerCase();
      const d = (l.description || '').toLowerCase();
      return a.includes('pdf') || a.includes('catálogo') || a.includes('catalogo') || d.includes('pdf') || d.includes('catálogo');
    }).length;
  }, [periodLogs]);

  // ----------------------------------------------------
  // PERFORMANCE PER BROKER (MEMBER)
  // ----------------------------------------------------
  const memberPerformance = useMemo(() => {
    return activeMembers.map(member => {
      // Member properties assigned in portfolio
      const memberProps = properties.filter(p =>
        p.user_id === member.id ||
        p.user_id?.toLowerCase() === member.username?.toLowerCase() ||
        p.user_id?.toLowerCase() === member.email?.toLowerCase()
      );

      // Member visits from journals or logs
      const memberJournals = journalEntries.filter(j =>
        j.user_id === member.id && new Date(j.date + 'T12:00:00') >= dateThreshold
      );
      const journalVisits = memberJournals.reduce((s, j) => s + (j.visitas_realizadas || 0), 0);

      const memberLogs = periodLogs.filter(l => l.user_id === member.id || l.user_name === member.name);
      const logVisits = memberLogs.filter(l =>
        (l.action + l.description).toLowerCase().includes('visita') ||
        (l.action + l.description).toLowerCase().includes('schedule')
      ).length;
      const visits = Math.max(journalVisits, logVisits);

      // Member contracts
      const contracts = memberLogs.filter(l =>
        (l.action + l.description).toLowerCase().includes('contrato') ||
        (l.action + l.description).toLowerCase().includes('contract')
      ).length;

      // Member PDFs
      const pdfs = memberLogs.filter(l =>
        (l.action + l.description).toLowerCase().includes('pdf') ||
        (l.action + l.description).toLowerCase().includes('catálogo') ||
        (l.action + l.description).toLowerCase().includes('catalogo')
      ).length;

      // Activity score
      const activityScore = visits * 3 + contracts * 5 + pdfs * 2;

      return {
        user: member,
        assignedPropertiesCount: memberProps.length,
        visits,
        contracts,
        pdfs,
        activityScore,
        lastLog: memberLogs[0] ? memberLogs[0].created_at : undefined
      };
    }).sort((a, b) => b.activityScore - a.activityScore || b.assignedPropertiesCount - a.assignedPropertiesCount);
  }, [activeMembers, properties, journalEntries, periodLogs, dateThreshold]);

  // ----------------------------------------------------
  // CHART DATA GENERATORS
  // ----------------------------------------------------
  // Timeline of activities (Last 7 intervals)
  const timelineChartData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayName = days[d.getDay()];
      const dateStr = d.toISOString().split('T')[0];

      // Filter logs on this day
      const dayLogs = logs.filter(l => l.created_at?.startsWith(dateStr));
      const visits = dayLogs.filter(l => (l.action + l.description).toLowerCase().includes('visita')).length;
      const contracts = dayLogs.filter(l => (l.action + l.description).toLowerCase().includes('contrato')).length;
      const pdfs = dayLogs.filter(l => (l.action + l.description).toLowerCase().includes('pdf') || (l.action + l.description).toLowerCase().includes('catálogo')).length;

      result.push({
        name: dayName,
        data: dateStr,
        visitas: visits,
        contratos: contracts,
        catalogosPdf: pdfs
      });
    }
    return result;
  }, [logs]);

  // Broker Comparison Chart Data
  const brokerComparisonData = useMemo(() => {
    return memberPerformance.slice(0, 7).map(m => ({
      name: m.user.name.split(' ')[0],
      fullName: m.user.name,
      visitas: m.visits,
      contratos: m.contracts,
      catalogos: m.pdfs,
      carteira: m.assignedPropertiesCount
    }));
  }, [memberPerformance]);

  // Distribution Chart Data (Activities by Type)
  const distributionData = useMemo(() => {
    return [
      { name: 'Visitas Agendadas/Realizadas', value: Math.max(teamVisitsInPeriod, 1), color: '#10B981' },
      { name: 'Catálogos PDF Gerados', value: Math.max(teamPdfsInPeriod, 1), color: '#F10F4D' },
      { name: 'Contratos Oficiais Gerados', value: Math.max(teamContractsInPeriod, 1), color: '#6366F1' },
      { name: 'Imóveis Sincronizados', value: Math.max(syncedCount, 1), color: '#0F172A' }
    ];
  }, [teamVisitsInPeriod, teamPdfsInPeriod, teamContractsInPeriod, syncedCount]);

  // Top Neighborhoods data for Tab 2
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
      .slice(0, 6);
  }, [properties]);

  // Filter logs for Tab 3
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (selectedCaptadorFilter !== 'ALL') {
      result = result.filter(l => l.user_id === selectedCaptadorFilter || l.user_name === selectedCaptadorFilter);
    }

    if (selectedActionFilter !== 'ALL') {
      result = result.filter(l => l.action.toLowerCase().includes(selectedActionFilter.toLowerCase()));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        l =>
          l.description.toLowerCase().includes(term) ||
          l.user_name.toLowerCase().includes(term) ||
          l.action.toLowerCase().includes(term)
      );
    }

    result = result.filter(l => new Date(l.created_at) >= dateThreshold);
    return result;
  }, [logs, selectedCaptadorFilter, selectedActionFilter, searchTerm, dateThreshold]);

  // Excel & PDF Downloads
  const handleDownloadXLSX = () => {
    setDownloadingFormat('xlsx');
    setTimeout(() => {
      exportControlSpreadsheet(properties, users, logs, companySettings, currentUser, journalEntries, datePeriodFilter);
      setDownloadingFormat(null);
    }, 400);
  };

  const handleDownloadPDF = () => {
    setDownloadingFormat('pdf');
    setTimeout(() => {
      exportControlPDF(properties, users, logs, companySettings, currentUser, journalEntries, datePeriodFilter);
      setDownloadingFormat(null);
    }, 400);
  };

  // WhatsApp Director Report Text Generator
  const generateDirectorWhatsAppText = () => {
    const periodLabel = datePeriodFilter === '7d' ? 'da Semana (Últimos 7 dias)' : datePeriodFilter === '14d' ? 'dos Últimos 14 dias' : 'do Mês';
    
    let text = `📊 *RELATÓRIO SEMANAL EXECUTIVO - LOPES MANAUS*\n`;
    text += `🏢 *Sincronização Lopesnet & Atividades da Equipe* | Período: ${periodLabel}\n`;
    text += `📅 Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `👤 Emissor: ${currentUser.name} (${currentUser.position || 'Gestão'})\n\n`;

    text += `📌 *1. PILARES DE DESEMPENHO NO PERÍODO:*\n`;
    text += `🔄 *Imóveis Sincronizados (Lopesnet):* ${syncedCount} imóveis\n`;
    text += `🚶 *Agenda de Visitas (Realizadas/Agendadas):* ${teamVisitsInPeriod} visitas\n`;
    text += `📝 *Contratos Gerados:* ${teamContractsInPeriod} contratos oficiais\n`;
    text += `📑 *Catálogos PDF Gerados:* ${teamPdfsInPeriod} apresentações emitidas\n\n`;

    text += `💎 *2. VISÃO GERAL DO ESTOQUE LOPES MANAUS:*\n`;
    text += `• Total no Portfólio: ${properties.length} imóveis\n`;
    text += `• Para Venda: ${properties.filter(p => p.purpose?.includes('Venda')).length}\n`;
    text += `• Para Locação: ${properties.filter(p => p.purpose?.includes('Locação')).length}\n`;
    text += `• VGV do Portfólio: R$ ${(syncedVgv / 1000000).toFixed(2)}M\n\n`;

    text += `👥 *3. DESTAQUES DA EQUIPE DE CORRETORES:*\n`;
    memberPerformance.slice(0, 5).forEach((m, idx) => {
      text += `${idx + 1}º ${m.user.name}: ${m.visits} visitas | ${m.contracts} contratos | ${m.pdfs} catálogos PDF\n`;
    });

    text += `\n_Relatório gerado automaticamente pelo Sistema Lopes Imóveis Prontos._`;
    return text;
  };

  const handleShareWhatsAppDirector = () => {
    const message = generateDirectorWhatsAppText();
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleCopyWhatsAppText = () => {
    const text = generateDirectorWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2500);
  };

  if (!isMasterOrGestor) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-xs max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-[#F10F4D] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Acesso Restrito à Gestão e Diretoria</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          O relatório executivo de atividades e levantamento semanal de sincronização é exclusivo para o <strong>Gestor / Gerente</strong> e <strong>Administrador Master</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Header Banner & Export Buttons */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 text-white border border-slate-700 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-[#F10F4D]/20 text-rose-300 border border-[#F10F4D]/40 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-[#F10F4D]" />
            <span>Relatório Semanal Executivo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Desempenho Semanal & Sincronização Lopesnet
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Consolidação das 4 métricas oficiais: <strong>imóveis sincronizados automaticamente</strong>, <strong>visitas agendadas/realizadas</strong>, <strong>contratos gerados</strong> e <strong>catálogos PDF emitidos</strong> pela equipe Lopes Manaus.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingFormat !== null}
            className="px-6 py-3.5 bg-[#F10F4D] hover:bg-rose-600 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-rose-950/40 transition flex items-center justify-center space-x-2 transform active:scale-95 cursor-pointer"
          >
            {downloadingFormat === 'pdf' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 text-white" />
            )}
            <span>{downloadingFormat === 'pdf' ? 'Gerando PDF...' : 'Baixar Relatório em PDF'}</span>
          </button>

          <button
            onClick={handleDownloadXLSX}
            disabled={downloadingFormat !== null}
            className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-extrabold text-xs rounded-2xl transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Planilha Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs & Period Selector */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveReportTab('weekly-director')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
              activeReportTab === 'weekly-director'
                ? 'bg-[#F10F4D] text-white shadow-md shadow-rose-950/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>1. Atividades & Sincronização</span>
          </button>

          <button
            onClick={() => setActiveReportTab('portfolio-strategy')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
              activeReportTab === 'portfolio-strategy'
                ? 'bg-[#F10F4D] text-white shadow-md shadow-rose-950/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>2. Carteira Geral & Bairros</span>
          </button>

          <button
            onClick={() => setActiveReportTab('audit-logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
              activeReportTab === 'audit-logs'
                ? 'bg-[#F10F4D] text-white shadow-md shadow-rose-950/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>3. Logs de Auditoria</span>
          </button>
        </div>

        {/* Period Selector Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Período:</span>
          </span>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {[
              { id: '7d', label: 'Esta Semana (7d)' },
              { id: '14d', label: '14 Dias' },
              { id: '30d', label: 'Mês (30d)' },
              { id: 'all', label: 'Tudo' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setDatePeriodFilter(p.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  datePeriodFilter === p.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ---------------------------------------------------------------- */}
      {/* TAB 1: WEEKLY PERFORMANCE (4 OFFICIAL PILLARS)                   */}
      {/* ---------------------------------------------------------------- */}
      {activeReportTab === 'weekly-director' && (
        <div className="space-y-6">
          
          {/* Executive 4 Pillars Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Novos Imóveis Sincronizados Automaticamente */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Imóveis Sincronizados</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-[#F10F4D]">{syncedCount}</span>
                <span className="text-xs font-bold text-slate-500">imóveis</span>
              </div>
              <p className="text-[11px] text-emerald-600 font-bold flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#F10F4D]" />
                <span>Feed Oficial Lopesnet</span>
              </p>
            </div>

            {/* 2. Agenda de Visitas Realizadas / Agendadas */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Agenda de Visitas</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-emerald-600">{teamVisitsInPeriod}</span>
                <span className="text-xs font-bold text-slate-500">visitas</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Atendimentos no período</p>
            </div>

            {/* 3. Contratos Gerados */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contratos Gerados</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-indigo-600">{teamContractsInPeriod}</span>
                <span className="text-xs font-bold text-slate-500">emitidos</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Modelos jurídicos prontos</p>
            </div>

            {/* 4. Catálogos PDF Gerados */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Catálogos PDF Gerados</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-900">{teamPdfsInPeriod}</span>
                <span className="text-xs font-bold text-slate-500">apresentações</span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold">Enviados para clientes</p>
            </div>

          </div>

          {/* Recharts Section: Atividades & Desempenho */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            
            {/* Toggle chart views */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-[#F10F4D]" />
                  <h3 className="text-base font-black text-slate-900">
                    Análise Visual de Atividades & Sincronização
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Evolução temporal, distribuição de atendimentos e desempenho por corretor associado.
                </p>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => setChartType('timeline')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    chartType === 'timeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Curva Diária
                </button>
                <button
                  onClick={() => setChartType('comparison')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    chartType === 'comparison' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Por Corretor
                </button>
                <button
                  onClick={() => setChartType('distribution')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    chartType === 'distribution' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Distribuição
                </button>
              </div>
            </div>

            {/* Chart 1: Timeline */}
            {chartType === 'timeline' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2">
                  <span>Atividades diárias registradas no sistema (visitas, contratos emitidos e catálogos PDF)</span>
                  <span className="text-emerald-600 font-extrabold">Últimos 7 dias</span>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                      <Line type="monotone" dataKey="visitas" name="Visitas" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="contratos" name="Contratos" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="catalogosPdf" name="Catálogos PDF" stroke="#F10F4D" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Chart 2: Comparison by Broker */}
            {chartType === 'comparison' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2">
                  <span>Comparativo de Visitas, Contratos e Catálogos PDF gerados por Corretor</span>
                  <span className="text-[#F10F4D] font-extrabold">Top Corretores</span>
                </div>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={brokerComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 700 }} axisLine={{ stroke: '#CBD5E1' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                      <Bar dataKey="visitas" name="Visitas" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="contratos" name="Contratos" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="catalogos" name="Catálogos PDF" fill="#F10F4D" radius={[6, 6, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Chart 3: Distribution */}
            {chartType === 'distribution' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={distributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Volume Total de Operações no Período
                  </h4>
                  <div className="space-y-2">
                    {distributionData.map((item) => (
                      <div key={item.name} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                          <span className="text-xs font-black text-slate-800">{item.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900">{item.value} registros</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Matriz de Atividades por Corretor */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Desempenho & Atividades da Equipe de Corretores
                </h3>
                <p className="text-xs text-slate-500">
                  Acompanhamento de visitas, geração de contratos, catálogos PDF e imóveis atribuídos
                </p>
              </div>
              <span className="text-xs font-black text-[#F10F4D] bg-rose-50 px-3 py-1 rounded-xl">
                {memberPerformance.length} corretores ativos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberPerformance.map((item, idx) => (
                <div key={item.user.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {item.user.photo_url ? (
                        <img
                          src={item.user.photo_url}
                          alt={item.user.name}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                          {item.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-black text-[#F10F4D]">#{idx + 1}</span>
                          <h4 className="text-xs font-extrabold text-slate-900">{item.user.name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-400">CRECI: {item.user.creci || '1234-F/AM'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
                    <div className="p-2 bg-white rounded-xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Visitas</p>
                      <p className="text-base font-black text-emerald-600 mt-0.5">{item.visits}</p>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Contratos</p>
                      <p className="text-base font-black text-indigo-600 mt-0.5">{item.contracts}</p>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">PDFs</p>
                      <p className="text-base font-black text-[#F10F4D] mt-0.5">{item.pdfs}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-500">Carteira Atribuída:</span>
                    <strong className="text-slate-800 font-black">{item.assignedPropertiesCount} imóveis</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp Director Report Share Banner */}
          <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-7 border border-emerald-800 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <h4 className="text-sm font-black uppercase tracking-wider text-emerald-400">
                  Compartilhar Resumo Semanal com a Diretoria
                </h4>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed max-w-xl">
                Envie a síntese executiva contendo os imóveis sincronizados, visitas, contratos emitidos e destaques dos corretores direto no WhatsApp.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={handleCopyWhatsAppText}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-900/80 hover:bg-emerald-850 border border-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                {copiedWhatsapp ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4" />}
                <span>{copiedWhatsapp ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>

              <button
                onClick={handleShareWhatsAppDirector}
                className="flex-1 md:flex-initial px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar no WhatsApp</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 2: PORTFOLIO STRATEGY & NEIGHBORHOODS                        */}
      {/* ---------------------------------------------------------------- */}
      {activeReportTab === 'portfolio-strategy' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Distribuição da Carteira por Bairros de Manaus
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Concentração do estoque e valor geral de vendas (VGV) por região
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {neighborhoodStats.map(([neigh, data], idx) => {
                const percent = properties.length > 0 ? Math.round((data.count / properties.length) * 100) : 0;
                return (
                  <div key={neigh} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#F10F4D]" />
                        {idx + 1}. {neigh}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{data.count} imóveis</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#F10F4D] h-full rounded-full" style={{ width: `${Math.max(percent, 5)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>VGV Estimado:</span>
                      <strong className="text-slate-800 font-bold">R$ {(data.vgv / 1000000).toFixed(2)}M</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 3: AUDIT & SYNC LOGS                                         */}
      {/* ---------------------------------------------------------------- */}
      {activeReportTab === 'audit-logs' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Histórico de Auditoria & Sincronização Lopesnet
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registros de sincronizações automáticas, emissões de contratos e catálogos no período
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filtrar por texto..."
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#F10F4D]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.slice(0, 50).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString('pt-BR')} {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{log.user_name || 'Sistema'}</td>
                    <td className="py-3 px-4 font-extrabold text-[#F10F4D]">{log.action}</td>
                    <td className="py-3 px-4 text-slate-600">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
