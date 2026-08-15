import React, { useState, useMemo } from 'react';
import { Property, User, AuditLog, CompanySettings, JournalEntry } from '../types';
import { exportControlSpreadsheet } from '../lib/excelGenerator';
import { exportControlPDF } from '../lib/reportsPdf';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  LineChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
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
  PieChart as PieIcon,
  Send,
  Copy,
  Check,
  PhoneCall,
  Flame,
  ArrowUpRight,
  Sparkles,
  Activity,
  Layers
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
  const isMasterOrGestora = currentUser.role === 'MASTER_ADMIN' || currentUser.role === 'GESTORA';

  // Navigation tab in Reports: 'weekly-director' | 'portfolio-strategy' | 'audit-logs'
  const [activeReportTab, setActiveReportTab] = useState<'weekly-director' | 'portfolio-strategy' | 'audit-logs'>('weekly-director');

  // Filter and Chart Display States
  const [datePeriodFilter, setDatePeriodFilter] = useState<'7d' | '14d' | '30d' | 'all'>('7d');
  const [chartType, setChartType] = useState<'timeline' | 'comparison' | 'channels'>('timeline');
  const [chartCaptadorFilter, setChartCaptadorFilter] = useState<string>('ALL');

  const [selectedCaptadorFilter, setSelectedCaptadorFilter] = useState<string>('ALL');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [downloadingFormat, setDownloadingFormat] = useState<'xlsx' | 'pdf' | null>(null);

  // WhatsApp share state
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  // Date boundaries for Weekly calculations
  const dateThreshold = useMemo(() => {
    const now = new Date();
    if (datePeriodFilter === '7d') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (datePeriodFilter === '14d') {
      return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    } else if (datePeriodFilter === '30d') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return new Date(0); // all
  }, [datePeriodFilter]);

  // Filtered Journal Entries in the selected period
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter(entry => {
      const entryDate = new Date(entry.date + 'T12:00:00');
      return entryDate >= dateThreshold;
    });
  }, [journalEntries, dateThreshold]);

  // Active Captadores & Team Members
  const activeMembers = useMemo(() => {
    return users.filter(u => u.status === 'active');
  }, [users]);

  // ----------------------------------------------------
  // WEEKLY METRICS PER CAPTADOR & OVERALL TEAM
  // ----------------------------------------------------
  const teamWeeklyPerformance = useMemo(() => {
    const memberStats = activeMembers.map(member => {
      // Find all journal entries for this member in the period
      const memberJournals = filteredJournalEntries.filter(j => j.user_id === member.id);

      // Sum leads, captures, visits from journals
      let leads = 0;
      let capturesFromJournal = 0;
      let visits = 0;
      const channelsMap: Record<string, number> = {
        portal: 0,
        placa_rua: 0,
        indicacao: 0,
        redes_sociais: 0,
        telefone_ativo: 0,
        parceria: 0,
        outros: 0
      };

      memberJournals.forEach(j => {
        leads += (j.leads_prospectados || 0);
        capturesFromJournal += (j.imoveis_captados || 0);
        visits += (j.visitas_realizadas || 0);

        if (j.canais_captacao) {
          Object.keys(j.canais_captacao).forEach(ch => {
            const val = j.canais_captacao![ch as keyof typeof j.canais_captacao] || 0;
            channelsMap[ch] = (channelsMap[ch] || 0) + val;
          });
        }
      });

      // Properties registered in system by this user in the period
      const memberPropsInPeriod = properties.filter(p => {
        if (p.user_id !== member.id) return false;
        const pDate = p.created_at ? new Date(p.created_at) : new Date();
        return pDate >= dateThreshold;
      });

      const actualCaptures = Math.max(capturesFromJournal, memberPropsInPeriod.length);

      // Total VGV captured in this period
      const weeklyVgv = memberPropsInPeriod.reduce((sum, p) => sum + (p.price || p.rent_price || 0), 0);

      // Conversion rate: Captures / Leads
      const conversionRate = leads > 0 ? (actualCaptures / leads) * 100 : (actualCaptures > 0 ? 100 : 0);

      // Top Channel
      let topChannelName = 'Prospecção Geral';
      let topChannelCount = 0;
      const channelLabels: Record<string, string> = {
        portal: 'Portais Imobiliários',
        placa_rua: 'Placa / Rua',
        indicacao: 'Indicação / Parceiros',
        redes_sociais: 'Instagram / Redes',
        telefone_ativo: 'Telefone / WhatsApp',
        parceria: 'Parcerias',
        outros: 'Outros'
      };

      Object.entries(channelsMap).forEach(([k, v]) => {
        if (v > topChannelCount) {
          topChannelCount = v;
          topChannelName = channelLabels[k] || k;
        }
      });

      // Latest journal entry description
      const latestJournal = [...memberJournals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      return {
        user: member,
        leads,
        captures: actualCaptures,
        visits,
        weeklyVgv,
        conversionRate,
        channelsMap,
        topChannelName,
        topChannelCount,
        journalsCount: memberJournals.length,
        latestJournalNotes: latestJournal?.summary_notes || 'Sem descrição recente preenchida no diário.',
        latestGoals: latestJournal?.next_day_goals || 'Em andamento.',
        totalPropertiesAllTime: properties.filter(p => p.user_id === member.id).length
      };
    });

    // Sort by captures descending, then leads descending
    memberStats.sort((a, b) => {
      if (b.captures !== a.captures) return b.captures - a.captures;
      return b.leads - a.leads;
    });

    // Team aggregated totals
    const totalLeads = memberStats.reduce((s, m) => s + m.leads, 0);
    const totalCaptures = memberStats.reduce((s, m) => s + m.captures, 0);
    const totalVisits = memberStats.reduce((s, m) => s + m.visits, 0);
    const totalWeeklyVgv = memberStats.reduce((s, m) => s + m.weeklyVgv, 0);
    const totalJournals = memberStats.reduce((s, m) => s + m.journalsCount, 0);
    const overallConversion = totalLeads > 0 ? (totalCaptures / totalLeads) * 100 : (totalCaptures > 0 ? 100 : 0);

    // Consolidated channels for the entire team
    const teamChannels: Record<string, number> = {
      portal: 0,
      placa_rua: 0,
      indicacao: 0,
      redes_sociais: 0,
      telefone_ativo: 0,
      parceria: 0,
      outros: 0
    };

    memberStats.forEach(m => {
      Object.entries(m.channelsMap).forEach(([k, v]) => {
        teamChannels[k] = (teamChannels[k] || 0) + Number(v || 0);
      });
    });

    return {
      memberStats,
      totalLeads,
      totalCaptures,
      totalVisits,
      totalWeeklyVgv,
      totalJournals,
      overallConversion,
      teamChannels
    };
  }, [activeMembers, filteredJournalEntries, properties, dateThreshold]);

  // ----------------------------------------------------
  // RECHARTS DATA 1: TIMELINE / DAILY EVOLUTION
  // ----------------------------------------------------
  const timelineChartData = useMemo(() => {
    const daysCount = datePeriodFilter === '7d' ? 7 : datePeriodFilter === '14d' ? 14 : datePeriodFilter === '30d' ? 30 : 10;
    const now = new Date();
    const dataPoints: Array<{
      dateKey: string;
      label: string;
      dayOfWeek: string;
      captados: number;
      leads: number;
      visitas: number;
    }> = [];

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const label = `${day}/${month}`;
      const dayOfWeek = weekDays[d.getDay()];

      // Filter journals matching this date
      const matchingJournals = journalEntries.filter(j => {
        if (j.date !== dateKey) return false;
        if (chartCaptadorFilter !== 'ALL' && j.user_id !== chartCaptadorFilter) return false;
        return true;
      });

      // Filter properties created on this date
      const matchingProps = properties.filter(p => {
        const pDate = p.created_at ? p.created_at.split('T')[0].split(' ')[0] : '';
        if (pDate !== dateKey) return false;
        if (chartCaptadorFilter !== 'ALL' && p.user_id !== chartCaptadorFilter) return false;
        return true;
      });

      const journalCaptures = matchingJournals.reduce((acc, j) => acc + (j.imoveis_captados || 0), 0);
      const actualCaptures = Math.max(journalCaptures, matchingProps.length);
      const leads = matchingJournals.reduce((acc, j) => acc + (j.leads_prospectados || 0), 0);
      const visitas = matchingJournals.reduce((acc, j) => acc + (j.visitas_realizadas || 0), 0);

      dataPoints.push({
        dateKey,
        label: `${label} (${dayOfWeek})`,
        dayOfWeek,
        captados: actualCaptures,
        leads,
        visitas
      });
    }

    return dataPoints;
  }, [datePeriodFilter, journalEntries, properties, chartCaptadorFilter]);

  // ----------------------------------------------------
  // RECHARTS DATA 2: COMPARISON BY CAPTADOR
  // ----------------------------------------------------
  const captadorComparisonData = useMemo(() => {
    return teamWeeklyPerformance.memberStats.map(m => {
      const nameParts = m.user.name.trim().split(' ');
      const shortName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[1].charAt(0)}.` : nameParts[0];

      return {
        id: m.user.id,
        name: shortName,
        fullName: m.user.name,
        captados: m.captures,
        leads: m.leads,
        visitas: m.visits,
        conversion: Number(m.conversionRate.toFixed(1)),
        vgv: m.weeklyVgv,
        topChannel: m.topChannelName
      };
    });
  }, [teamWeeklyPerformance]);

  // ----------------------------------------------------
  // RECHARTS DATA 3: CAPTURE CHANNELS PIE CHART
  // ----------------------------------------------------
  const channelsPieData = useMemo(() => {
    const rawChannels = [
      { name: 'Portais Imobiliários', key: 'portal', value: teamWeeklyPerformance.teamChannels.portal, color: '#3B82F6', icon: '🌐' },
      { name: 'Placa / Rua', key: 'placa_rua', value: teamWeeklyPerformance.teamChannels.placa_rua, color: '#F59E0B', icon: '🚩' },
      { name: 'Indicações / Parceiros', key: 'indicacao', value: teamWeeklyPerformance.teamChannels.indicacao, color: '#10B981', icon: '🤝' },
      { name: 'Instagram / Redes', key: 'redes_sociais', value: teamWeeklyPerformance.teamChannels.redes_sociais, color: '#EC4899', icon: '📸' },
      { name: 'Telefone / WhatsApp', key: 'telefone_ativo', value: teamWeeklyPerformance.teamChannels.telefone_ativo, color: '#8B5CF6', icon: '📞' },
      { name: 'Parcerias Corretores', key: 'parceria', value: teamWeeklyPerformance.teamChannels.parceria, color: '#06B6D4', icon: '🏢' },
      { name: 'Outros Canais', key: 'outros', value: teamWeeklyPerformance.teamChannels.outros, color: '#64748B', icon: '📌' },
    ];

    const activeList = rawChannels.filter(c => c.value > 0);
    // If empty, provide a default breakdown item for visualization
    if (activeList.length === 0) {
      return [{ name: 'Prospecção Geral', key: 'geral', value: 1, color: '#F10F4D', icon: '📌' }];
    }
    return activeList;
  }, [teamWeeklyPerformance]);

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

  // Top Neighborhoods with Recharts data
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

  const neighborhoodChartData = useMemo(() => {
    return neighborhoodStats.map(([neigh, data]) => ({
      bairro: neigh,
      imoveis: data.count,
      vgvMilhoes: Number((data.vgv / 1000000).toFixed(2))
    }));
  }, [neighborhoodStats]);

  // Filter logs by period and search
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

  // Generate WhatsApp Message for Director
  const generateDirectorWhatsAppText = () => {
    const periodLabel = datePeriodFilter === '7d' ? 'da Semana (Últimos 7 dias)' : datePeriodFilter === '14d' ? 'dos Últimos 14 dias' : 'do Mês';
    
    let text = `📊 *RELATÓRIO SEMANAL DE CAPTAÇÃO & DESEMPENHO - LOPES MANAUS*\n`;
    text += `🏢 *Time de Imóveis Prontos* | Período: ${periodLabel}\n`;
    text += `📅 Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `👤 Gerente/Emissor: ${currentUser.name} (${currentUser.position || 'Gestão'})\n\n`;

    text += `📌 *1. RESUMO CONSOLIDADO DO TIME:*\n`;
    text += `• 🏡 *Imóveis Captados no Período:* ${teamWeeklyPerformance.totalCaptures} imóveis\n`;
    text += `• 📞 *Leads/Proprietários Prospectados:* ${teamWeeklyPerformance.totalLeads} contatos\n`;
    text += `• 🚶‍♂️ *Visitas/Atendimentos Realizados:* ${teamWeeklyPerformance.totalVisits} visitas\n`;
    text += `• 🎯 *Taxa Média de Conversão:* ${teamWeeklyPerformance.overallConversion.toFixed(1)}%\n`;
    text += `• 💰 *VGV Total Captado:* R$ ${teamWeeklyPerformance.totalWeeklyVgv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    text += `• 📝 *Diários Preenchidos na Equipe:* ${teamWeeklyPerformance.totalJournals} registros\n\n`;

    text += `🏆 *2. DESEMPENHO INDIVIDUAL DOS MEMBROS:*\n`;
    teamWeeklyPerformance.memberStats.forEach((m, idx) => {
      text += `\n*#${idx + 1} - ${m.user.name}* (${m.user.position || 'Captador'})\n`;
      text += `  └ Captados: *${m.captures}* | Leads: *${m.leads}* | Visitas: *${m.visits}*\n`;
      text += `  └ Canal Principal: ${m.topChannelName}\n`;
      text += `  └ Eficiência: ${m.conversionRate.toFixed(1)}% | Carteira Total: ${m.totalPropertiesAllTime} imóveis\n`;
    });

    text += `\n🌐 *3. CANAIS DE CAPTAÇÃO UTILIZADOS:*\n`;
    const chLabels: Record<string, string> = {
      portal: 'Portais Imobiliários',
      placa_rua: 'Placa / Prospecção de Rua',
      indicacao: 'Indicações / Porteiros / Síndicos',
      redes_sociais: 'Instagram / Redes Sociais',
      telefone_ativo: 'Telefone / WhatsApp Ativo',
      parceria: 'Parcerias com Corretores',
      outros: 'Outros Canais'
    };
    Object.entries(teamWeeklyPerformance.teamChannels).forEach(([k, v]) => {
      const num = Number(v || 0);
      if (num > 0) {
        text += `• ${chLabels[k] || k}: *${num} ações/captações*\n`;
      }
    });

    text += `\n✅ *Acesse o Catálogo Digital Geral:* https://lopes-captacao.app/catalogo-geral\n`;
    text += `_Relatório gerado automaticamente pelo Sistema Lopes Captação Manaus._`;

    return text;
  };

  const handleCopyWhatsApp = () => {
    const text = generateDirectorWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 3000);
  };

  const handleSendDirectorWhatsApp = () => {
    const text = generateDirectorWhatsAppText();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  if (!isMasterOrGestora) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-xs max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-[#F10F4D] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Acesso Restrito à Gestão e Diretoria</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          O relatório executivo para a diretoria e levantamento semanal de captação é exclusivo para a <strong>Gerente</strong> e <strong>Administrador Master</strong>.
        </p>
      </div>
    );
  }

  // Custom Tooltip for Timeline
  const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1.5 min-w-[170px]">
          <p className="font-extrabold text-slate-200 pb-1 border-b border-slate-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between space-x-3 text-[11px]">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-slate-300 font-semibold">{entry.name}:</span>
              </span>
              <span className="font-black text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Captadores Comparison
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-2 min-w-[200px]">
          <div>
            <p className="font-black text-sm text-white">{data.fullName}</p>
            <p className="text-[10px] text-slate-400">Canal: {data.topChannel}</p>
          </div>
          <div className="space-y-1 pt-1.5 border-t border-slate-800 text-[11px]">
            <div className="flex justify-between items-center text-rose-300 font-bold">
              <span>🏡 Imóveis Captados:</span>
              <span className="font-black text-white">{data.captados}</span>
            </div>
            <div className="flex justify-between items-center text-indigo-300 font-bold">
              <span>📞 Leads Prospectados:</span>
              <span className="font-black text-white">{data.leads}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-300 font-bold">
              <span>🚶 Visitas Realizadas:</span>
              <span className="font-black text-white">{data.visitas}</span>
            </div>
            <div className="flex justify-between items-center text-amber-300 font-bold pt-1 border-t border-slate-800/80">
              <span>🎯 Taxa de Conversão:</span>
              <span className="font-black text-white">{data.conversion}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = Object.values(teamWeeklyPerformance.teamChannels).reduce<number>((a, b) => a + Number(b || 0), 0) || 1;
      const pct = ((data.value / total) * 100).toFixed(1);

      return (
        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1">
          <p className="font-black flex items-center space-x-1.5">
            <span>{data.payload.icon}</span>
            <span>{data.name}</span>
          </p>
          <p className="text-[11px] text-slate-300">
            <strong>{data.value}</strong> captações ({pct}% do time)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. HEADER BANNER & EXPORT BUTTONS */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 text-white border border-slate-700 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-[#F10F4D]/20 text-rose-300 border border-[#F10F4D]/40 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Target className="w-3.5 h-3.5 text-[#F10F4D]" />
            <span>Relatório Semanal Executivo para o Diretor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Desempenho Semanal do Time de Imóveis Prontos
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Gráficos e consolidação dos diários de atividades: visualização da <strong>evolução semanal de captações e leads por captador</strong>, <strong>canais de captação</strong> e taxa de desempenho individual e geral da equipe.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
          <button
            onClick={handleSendDirectorWhatsApp}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center space-x-2 cursor-pointer transform active:scale-95"
            title="Enviar resumo formatado pelo WhatsApp"
          >
            <Send className="w-4 h-4" />
            <span>Enviar ao Diretor (WhatsApp)</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloadingFormat !== null}
            className="px-4 py-3 bg-[#F10F4D] hover:bg-rose-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-950/40 transition flex items-center justify-center space-x-2 transform active:scale-95 cursor-pointer"
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
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-extrabold text-xs rounded-2xl transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. REPORT NAVIGATION TABS & PERIOD SELECTOR */}
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
            <span>1. Relatório Semanal & Gráficos</span>
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
      {/* TAB 1: WEEKLY PERFORMANCE, CHARTS & DIRECTOR REPORT              */}
      {/* ---------------------------------------------------------------- */}
      {activeReportTab === 'weekly-director' && (
        <div className="space-y-6">
          
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Total Captados na Semana */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Imóveis Captados</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-[#F10F4D]">{teamWeeklyPerformance.totalCaptures}</span>
                <span className="text-xs font-bold text-slate-500">imóveis</span>
              </div>
              <p className="text-[11px] text-emerald-600 font-bold flex items-center space-x-1">
                <Flame className="w-3 h-3 text-amber-500" />
                <span>Novos no Catálogo</span>
              </p>
            </div>

            {/* Total Leads Prospectados */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Leads Prospectados</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-indigo-600">{teamWeeklyPerformance.totalLeads}</span>
                <span className="text-xs font-bold text-slate-500">contatos</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Proprietários abordados</p>
            </div>

            {/* Total Visitas Realizadas */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Visitas Realizadas</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-emerald-600">{teamWeeklyPerformance.totalVisits}</span>
                <span className="text-xs font-bold text-slate-500">visitas</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Atendimentos presenciais</p>
            </div>

            {/* Taxa de Desempenho / Conversão */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxa de Conversão</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-900">{teamWeeklyPerformance.overallConversion.toFixed(1)}%</span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold">Captações / Leads</p>
            </div>

            {/* VGV Captado na Semana */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1 col-span-2 lg:col-span-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">VGV Captado</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xs font-black text-slate-400">R$</span>
                <span className="text-2xl font-black text-slate-900">
                  {teamWeeklyPerformance.totalWeeklyVgv > 1000000 
                    ? `${(teamWeeklyPerformance.totalWeeklyVgv / 1000000).toFixed(2)}M` 
                    : teamWeeklyPerformance.totalWeeklyVgv.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Patrimônio no período</p>
            </div>

          </div>

          {/* -------------------------------------------------------- */}
          {/* RECHARTS SECTION: EVOLUTION, COMPARISON & CHANNELS      */}
          {/* -------------------------------------------------------- */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            
            {/* Chart Header with Mode Toggle & Captador Filter */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-[#F10F4D]" />
                  <h3 className="text-base font-black text-slate-900">
                    Análise Visual de Desempenho (Recharts)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Acompanhe a curva diária de captação, compare o volume entre os corretores e avalie os canais de origem.
                </p>
              </div>

              {/* Chart Controls */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setChartType('timeline')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 cursor-pointer ${
                      chartType === 'timeline'
                        ? 'bg-white text-[#F10F4D] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Evolução Diária</span>
                  </button>

                  <button
                    onClick={() => setChartType('comparison')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 cursor-pointer ${
                      chartType === 'comparison'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Por Captador</span>
                  </button>

                  <button
                    onClick={() => setChartType('channels')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 cursor-pointer ${
                      chartType === 'channels'
                        ? 'bg-white text-emerald-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <PieIcon className="w-3.5 h-3.5" />
                    <span>Canais</span>
                  </button>
                </div>

                {/* Filter specific captador (especially useful for timeline) */}
                {chartType === 'timeline' && (
                  <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-2xl">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={chartCaptadorFilter}
                      onChange={(e) => setChartCaptadorFilter(e.target.value)}
                      className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Time Todo (Consolidado)</option>
                      {activeMembers.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              </div>
            </div>

            {/* CHART 1: TIMELINE / DAILY EVOLUTION */}
            {chartType === 'timeline' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2">
                  <span>
                    {chartCaptadorFilter === 'ALL'
                      ? 'Evolução agregada de captações, leads e visitas do time de Imóveis Prontos'
                      : `Visualizando evolução individual de ${activeMembers.find(m => m.id === chartCaptadorFilter)?.name || 'Corretor'}`}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#F10F4D]"></span>
                      <strong className="text-slate-900">Imóveis Captados</strong>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#6366F1]"></span>
                      <strong className="text-slate-900">Leads Prospectados</strong>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#10B981]"></span>
                      <strong className="text-slate-900">Visitas</strong>
                    </span>
                  </div>
                </div>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="captadosGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F10F4D" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#F10F4D" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip content={<CustomTimelineTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="captados"
                        name="Imóveis Captados"
                        fill="url(#captadosGradient)"
                        stroke="#F10F4D"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#F10F4D', strokeWidth: 2, stroke: '#FFFFFF' }}
                        activeDot={{ r: 6, fill: '#F10F4D' }}
                      />
                      <Bar
                        dataKey="leads"
                        name="Leads Prospectados"
                        fill="#6366F1"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={32}
                        opacity={0.85}
                      />
                      <Line
                        type="monotone"
                        dataKey="visitas"
                        name="Visitas Realizadas"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        strokeDasharray="4 4"
                        dot={{ r: 4, fill: '#10B981', strokeWidth: 1, stroke: '#FFFFFF' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* CHART 2: COMPARISON BY CAPTADOR */}
            {chartType === 'comparison' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2">
                  <span>Comparativo direto de Imóveis Captados vs Leads Prospectados vs Visitas por Captador</span>
                  <span className="text-[#F10F4D] font-extrabold">Ordenado pelo volume de captações</span>
                </div>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={captadorComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 700 }}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip content={<CustomBarTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }}
                      />
                      <Bar
                        dataKey="captados"
                        name="Imóveis Captados"
                        fill="#F10F4D"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="leads"
                        name="Leads Prospectados"
                        fill="#6366F1"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="visitas"
                        name="Visitas Realizadas"
                        fill="#10B981"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* CHART 3: CHANNELS DISTRIBUTION (PIE & BARS) */}
            {chartType === 'channels' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                {/* Donut Pie Chart */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={channelsPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {channelsPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomPieTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend and Channels Breakdown */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Participação dos Canais de Prospecção
                  </h4>
                  <div className="space-y-2">
                    {channelsPieData.map((ch) => {
                      const total = Object.values(teamWeeklyPerformance.teamChannels).reduce<number>((a, b) => a + Number(b || 0), 0) || 1;
                      const pct = ((ch.value / total) * 100).toFixed(0);
                      return (
                        <div key={ch.name} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ch.color }}></span>
                            <span className="text-xs font-black text-slate-800">{ch.name}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-xs font-black text-slate-900">{ch.value} captações</span>
                            <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-black text-slate-700">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* TWO COLUMNS: CANAIS DE CAPTAÇÃO + WHATSAPP EXECUTIVO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CANAIS DE CAPTAÇÃO UTILIZADOS NA SEMANA */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Compass className="w-5 h-5 text-[#F10F4D]" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Origem das Captações & Prospecções do Time
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400">Total no período</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'portal', label: 'Portais Imobiliários', icon: '🌐', desc: 'VivaReal, ZAP, OLX' },
                  { id: 'placa_rua', label: 'Placa / Prospecção de Rua', icon: '🚩', desc: 'Captação de Campo' },
                  { id: 'indicacao', label: 'Indicações', icon: '🤝', desc: 'Porteiros & Síndicos' },
                  { id: 'redes_sociais', label: 'Instagram / Redes', icon: '📸', desc: 'Redes Sociais & Anúncios' },
                  { id: 'telefone_ativo', label: 'Telefone / WhatsApp', icon: '📞', desc: 'Prospecção Ativa' },
                  { id: 'parceria', label: 'Parcerias', icon: '🏢', desc: 'Outros Corretores' },
                ].map(ch => {
                  const count = Number(teamWeeklyPerformance.teamChannels[ch.id] || 0);
                  const total = Object.values(teamWeeklyPerformance.teamChannels).reduce<number>((a, b) => a + Number(b || 0), 0) || 1;
                  const pct = ((count / total) * 100).toFixed(0);

                  return (
                    <div key={ch.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{ch.icon}</span>
                        <span className="text-base font-black text-slate-900">{count}</span>
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">{ch.label}</p>
                        <p className="text-[10px] text-slate-400">{ch.desc}</p>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#F10F4D] h-full rounded-full" style={{ width: `${Math.max(5, Number(pct))}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CARD DE ENVIO DIRETO AO DIRETOR VIA WHATSAPP */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <Send className="w-3 h-3" />
                  <span>Despacho com a Diretoria</span>
                </div>
                <h3 className="text-base font-black">Enviar Relatório ao Diretor</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Gera uma mensagem executiva pré-formatada com o levantamento de imóveis captados, leads prospectados, ranking individual e canais de prospecção do time de Imóveis Prontos.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleSendDirectorWhatsApp}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Abrir no WhatsApp do Diretor</span>
                </button>

                <button
                  onClick={handleCopyWhatsApp}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {copiedWhatsapp ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWhatsapp ? 'Texto Copiado!' : 'Copiar Texto da Mensagem'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* MATRIZ DE DESEMPENHO INDIVIDUAL DE CADA MEMBRO */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Desempenho Individual dos Captadores & Gestores
                </h3>
                <p className="text-xs text-slate-500">
                  Métricas calculadas a partir dos diários diários e cadastros no período selecionado
                </p>
              </div>
              <span className="text-xs font-black text-[#F10F4D] bg-rose-50 px-3 py-1 rounded-xl">
                {teamWeeklyPerformance.memberStats.length} membros monitorados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamWeeklyPerformance.memberStats.map((member, idx) => (
                <div
                  key={member.user.id}
                  className="p-5 bg-slate-50 hover:bg-slate-50/80 rounded-3xl border border-slate-200/80 space-y-4 transition"
                >
                  {/* Member Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {member.user.photo_url ? (
                          <img
                            src={member.user.photo_url}
                            alt={member.user.name}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                            {member.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F10F4D] text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                          #{idx + 1}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{member.user.name}</h4>
                        <p className="text-[10px] text-slate-500 font-semibold">{member.user.position || 'Captador(a)'}</p>
                        {member.user.creci && (
                          <p className="text-[9px] text-slate-400 font-mono">CRECI {member.user.creci}</p>
                        )}
                      </div>
                    </div>

                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-800">
                      {member.conversionRate.toFixed(0)}% Efic.
                    </span>
                  </div>

                  {/* Quantitative numbers */}
                  <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-slate-200/70 text-center">
                    <div>
                      <span className="text-base font-black text-[#F10F4D]">{member.captures}</span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Captados</p>
                    </div>
                    <div>
                      <span className="text-base font-black text-indigo-600">{member.leads}</span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Leads</p>
                    </div>
                    <div>
                      <span className="text-base font-black text-emerald-600">{member.visits}</span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Visitas</p>
                    </div>
                  </div>

                  {/* Highlights from Daily Journal */}
                  <div className="space-y-1 text-xs">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Atividades no Diário:</span>
                    </p>
                    <p className="text-[11px] text-slate-700 leading-tight line-clamp-3 bg-white/70 p-2.5 rounded-xl border border-slate-200/50">
                      {member.latestJournalNotes}
                    </p>
                  </div>

                  {/* Footer canal & link */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                    <span className="text-slate-500 font-medium">
                      Canal: <strong className="text-slate-800">{member.topChannelName}</strong>
                    </span>
                    <a
                      href={`/catalogo/${member.user.url_slug}`}
                      target="_blank"
                      className="text-[#F10F4D] hover:underline font-extrabold flex items-center space-x-1"
                    >
                      <span>Ver Catálogo</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 2: PORTFOLIO STRATEGY & NEIGHBORHOOD BREAKDOWN              */}
      {/* ---------------------------------------------------------------- */}
      {activeReportTab === 'portfolio-strategy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-bold text-slate-400 uppercase">Total Carteira</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalPropertiesCount}</p>
              <p className="text-[10px] text-slate-500 mt-1">Imóveis cadastrados</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-bold text-slate-400 uppercase">Disponíveis</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{availableCount}</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">Prontos para oferta</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-bold text-slate-400 uppercase">Vendidos / Alugados</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{soldCount + rentedCount}</p>
              <p className="text-[10px] text-slate-400 mt-1">{soldCount} vendas • {rentedCount} locações</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-bold text-slate-400 uppercase">VGV Venda Total</p>
              <p className="text-xl font-black text-slate-900 mt-1">
                R$ {(totalVgvVenda / 1000000).toFixed(2)}M
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Locação: R$ {(totalVgvLocacao / 1000).toFixed(0)}k/mês</p>
            </div>
          </div>

          {/* Neighborhood Visual Chart & Breakdown */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[#F10F4D]" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Concentração por Bairro Estratégico (Manaus)
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">Distribuição da Carteira</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={neighborhoodChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="bairro"
                    tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 700 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1">
                            <p className="font-black text-white">{label}</p>
                            <p className="text-rose-300 font-bold">Imóveis: {payload[0]?.value}</p>
                            <p className="text-emerald-300 font-bold">VGV: R$ {payload[1]?.value}M</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="imoveis" name="Quantidade de Imóveis" fill="#F10F4D" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="vgvMilhoes" name="VGV Estimado (R$ Milhões)" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              {neighborhoodStats.map(([neigh, data]) => {
                const pct = ((data.count / Math.max(totalPropertiesCount, 1)) * 100).toFixed(1);
                return (
                  <div key={neigh} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{neigh}</p>
                      <p className="text-[10px] text-slate-400">{data.count} imóveis • {pct}% da carteira</p>
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      R$ {data.vgv.toLocaleString('pt-BR')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 3: AUDIT LOGS & ACTIONS HISTORY                             */}
      {/* ---------------------------------------------------------------- */}
      {activeReportTab === 'audit-logs' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Histórico de Modificações & Auditoria ({filteredLogs.length})
            </h3>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredLogs.map(log => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{log.user_name}</span>
                    <span className="text-[10px] bg-rose-50 text-[#F10F4D] px-2 py-0.5 rounded-full font-bold">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{log.description}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 ml-4 font-mono">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
