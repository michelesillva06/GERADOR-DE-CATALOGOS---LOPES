import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Property, User, AuditLog, CompanySettings, JournalEntry } from '../types';

function formatCurrency(val: number | undefined): string {
  if (!val || isNaN(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

function formatDate(isoStr: string | undefined): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoStr;
  }
}

export function exportControlPDF(
  properties: Property[],
  users: User[],
  logs: AuditLog[],
  companySettings: CompanySettings,
  currentUser: User,
  journalEntries: JournalEntry[] = [],
  periodFilter: '7d' | '14d' | '30d' | 'all' = '7d'
) {
  // Configured in LANDSCAPE mode (A4 Horizontal: 297mm x 210mm)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Page dimensions
  const pageWidth = 297;
  const pageHeight = 210;

  // Primary colors (Lopes Brand)
  const redLopes = [241, 15, 77] as [number, number, number]; // #F10F4D
  const darkSlate = [15, 23, 42] as [number, number, number]; // #0F172A
  const lightBg = [248, 250, 252] as [number, number, number]; // #F8FAFC
  const borderSlate = [226, 232, 240] as [number, number, number]; // #E2E8F0

  // Period label & Date Threshold
  const periodLabel = periodFilter === '7d'
    ? 'Esta Semana (Últimos 7 dias)'
    : periodFilter === '14d'
    ? 'Últimos 14 dias'
    : periodFilter === '30d'
    ? 'Mensal (Últimos 30 dias)'
    : 'Todo o Período Histórico';

  const dateThreshold = (() => {
    if (periodFilter === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (periodFilter === '14d') return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    if (periodFilter === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return new Date(0);
  })();

  // Filtered Journal Entries in the period
  const filteredJournals = journalEntries.filter(entry => {
    const entryDate = new Date(entry.date + 'T12:00:00');
    return entryDate >= dateThreshold;
  });

  // Active Captadores only (excluding Admin, Gestores, Demo)
  const activeMembers = users.filter(u => {
    if (u.status !== 'active') return false;
    if (u.is_demo || u.username === 'demo' || u.role === 'DEMO') return false;
    if (u.role === 'MASTER_ADMIN' || (u.role as string) === 'ADMIN' || u.role === 'GESTOR' || u.role === 'GESTORA') return false;
    return true;
  });

  // -------------------------------------------------------------
  // 1. CALCULATE WEEKLY / PERIOD PERFORMANCE
  // -------------------------------------------------------------
  const channelLabels: Record<string, string> = {
    portal: 'Portais Imobiliários',
    placa_rua: 'Placa / Prospecção de Rua',
    indicacao: 'Indicações & Parceiros',
    redes_sociais: 'Instagram / Redes Sociais',
    telefone_ativo: 'Telefone / WhatsApp Ativo',
    parceria: 'Parcerias com Corretores',
    outros: 'Outros Canais'
  };

  const channelColors: Record<string, [number, number, number]> = {
    portal: [59, 130, 246],        // Blue
    placa_rua: [245, 158, 11],      // Amber
    indicacao: [16, 185, 129],      // Emerald
    redes_sociais: [236, 72, 153],  // Pink
    telefone_ativo: [139, 92, 246], // Purple
    parceria: [6, 182, 212],        // Cyan
    outros: [100, 116, 139]         // Slate
  };

  const memberStats = activeMembers.map(member => {
    const memberJournals = filteredJournals.filter(j => j.user_id === member.id);
    const sortedMemberJournals = [...memberJournals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

    const allNotes: string[] = [];
    const allHighlights: string[] = [];
    const allGoals: string[] = [];
    const ratings: string[] = [];

    sortedMemberJournals.forEach(j => {
      leads += (j.leads_prospectados || 0);
      capturesFromJournal += (j.imoveis_captados || 0);
      visits += (j.visitas_realizadas || 0);
      if (j.rating) ratings.push(j.rating);
      if (j.summary_notes && j.summary_notes.trim()) {
        allNotes.push(`• [${j.date}] ${j.summary_notes.trim()}`);
      }
      if (Array.isArray(j.key_highlights) && j.key_highlights.length > 0) {
        allHighlights.push(...j.key_highlights.filter(h => h && h.trim()));
      }
      if (j.next_day_goals && j.next_day_goals.trim()) {
        allGoals.push(`• [${j.date}] ${j.next_day_goals.trim()}`);
      }
      if (j.canais_captacao) {
        Object.keys(j.canais_captacao).forEach(ch => {
          const val = (j.canais_captacao as any)[ch] || 0;
          channelsMap[ch] = (channelsMap[ch] || 0) + Number(val || 0);
        });
      }
    });

    const memberPropsInPeriod = properties.filter(p => {
      if (p.user_id !== member.id) return false;
      const pDate = p.created_at ? new Date(p.created_at) : new Date();
      return pDate >= dateThreshold;
    });

    const userAllProps = properties.filter(p => p.user_id === member.id);
    const actualCaptures = Math.max(capturesFromJournal, memberPropsInPeriod.length);
    const weeklyVgv = memberPropsInPeriod.reduce((sum, p) => sum + (p.price || p.rent_price || 0), 0);
    const conversionRate = leads > 0 ? (actualCaptures / leads) * 100 : (actualCaptures > 0 ? 100 : 0);

    let topChannelName = 'Prospecção Ativa';
    let topChannelCount = 0;
    Object.entries(channelsMap).forEach(([k, v]) => {
      if (v > topChannelCount) {
        topChannelCount = v;
        topChannelName = channelLabels[k] || k;
      }
    });

    const latestJournal = sortedMemberJournals[0];
    const primaryRating = ratings[0] || (memberJournals.length > 0 ? 'Produtivo' : 'Sem diário no período');

    // Channels breakdown summary text
    const channelsSummaryParts: string[] = [];
    if (channelsMap.portal > 0) channelsSummaryParts.push(`Portais: ${channelsMap.portal}`);
    if (channelsMap.placa_rua > 0) channelsSummaryParts.push(`Placas de Rua: ${channelsMap.placa_rua}`);
    if (channelsMap.indicacao > 0) channelsSummaryParts.push(`Indicações: ${channelsMap.indicacao}`);
    if (channelsMap.telefone_ativo > 0) channelsSummaryParts.push(`WhatsApp/Tel: ${channelsMap.telefone_ativo}`);
    if (channelsMap.redes_sociais > 0) channelsSummaryParts.push(`Redes Sociais: ${channelsMap.redes_sociais}`);
    if (channelsMap.parceria > 0) channelsSummaryParts.push(`Parcerias: ${channelsMap.parceria}`);
    if (channelsMap.outros > 0) channelsSummaryParts.push(`Outros: ${channelsMap.outros}`);

    const channelsSummaryText = channelsSummaryParts.length > 0
      ? channelsSummaryParts.join('\n')
      : `Canal Principal: ${topChannelName}`;

    const summaryNotesText = allNotes.length > 0
      ? allNotes.join('\n')
      : (latestJournal?.summary_notes || 'Atividades de captação externa e prospecção de proprietários em andamento.');

    const highlightsText = allHighlights.length > 0
      ? allHighlights.map(h => `• ${h}`).join('\n')
      : (actualCaptures > 0 ? `• ${actualCaptures} imóvel(is) adicionado(s) à carteira no período.` : '• Prospecção e mapeamento de imóveis nos bairros estratégicos.');

    const nextGoalsText = allGoals.length > 0
      ? allGoals.join('\n')
      : (latestJournal?.next_day_goals || 'Manter rotina de prospecção e agendamento de novas visitas e avaliações.');

    return {
      user: member,
      leads,
      captures: actualCaptures,
      visits,
      weeklyVgv,
      conversionRate,
      channelsMap,
      topChannelName,
      channelsSummaryText,
      journalsCount: memberJournals.length,
      latestRating: primaryRating,
      summaryNotesText,
      highlightsText,
      nextGoalsText,
      totalPropertiesAllTime: userAllProps.length,
      availPropsCount: userAllProps.filter(p => p.status === 'Disponível').length,
      soldPropsCount: userAllProps.filter(p => p.status === 'Vendido').length,
      rentedPropsCount: userAllProps.filter(p => p.status === 'Alugado').length
    };
  }).sort((a, b) => {
    if (b.captures !== a.captures) return b.captures - a.captures;
    return b.leads - a.leads;
  });

  const totalLeads = memberStats.reduce((s, m) => s + m.leads, 0);
  const totalCaptures = memberStats.reduce((s, m) => s + m.captures, 0);
  const totalVisits = memberStats.reduce((s, m) => s + m.visits, 0);
  const totalWeeklyVgv = memberStats.reduce((s, m) => s + m.weeklyVgv, 0);
  const totalJournals = memberStats.reduce((s, m) => s + m.journalsCount, 0);
  const overallConversion = totalLeads > 0 ? (totalCaptures / totalLeads) * 100 : (totalCaptures > 0 ? 100 : 0);

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

  // Daily timeline data (last 7 days for visual chart)
  const timelineDays = 7;
  const timelinePoints: { label: string; dayName: string; captados: number; leads: number; visitas: number }[] = [];
  const weekDaysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  for (let i = timelineDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = d.toISOString().split('T')[0];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayName = weekDaysShort[d.getDay()];

    const matchingJournals = journalEntries.filter(j => j.date === dateKey);
    const matchingProps = properties.filter(p => {
      const pDate = p.created_at ? p.created_at.split('T')[0].split(' ')[0] : '';
      return pDate === dateKey;
    });

    const jCaptures = matchingJournals.reduce((acc, j) => acc + (j.imoveis_captados || 0), 0);
    const actCaptures = Math.max(jCaptures, matchingProps.length);
    const leadsCount = matchingJournals.reduce((acc, j) => acc + (j.leads_prospectados || 0), 0);
    const visCount = matchingJournals.reduce((acc, j) => acc + (j.visitas_realizadas || 0), 0);

    timelinePoints.push({
      label: `${day}/${month}`,
      dayName,
      captados: actCaptures,
      leads: leadsCount,
      visitas: visCount
    });
  }

  // -------------------------------------------------------------
  // 2. CALCULATE PORTFOLIO & NEIGHBORHOOD METRICS
  // -------------------------------------------------------------
  const totalProps = properties.length;
  const availProps = properties.filter(p => p.status === 'Disponível').length;
  const soldProps = properties.filter(p => p.status === 'Vendido').length;
  const rentedProps = properties.filter(p => p.status === 'Alugado').length;
  const reservedProps = properties.filter(p => p.status === 'Reservado').length;

  const totalVgvVenda = properties
    .filter(p => p.purpose.includes('Venda') && p.price)
    .reduce((acc, p) => acc + (p.price || 0), 0);

  const totalVgvLocacao = properties
    .filter(p => p.purpose.includes('Locação') && (p.rent_price || p.price))
    .reduce((acc, p) => acc + (p.rent_price || p.price || 0), 0);

  const avgPriceVenda = totalVgvVenda / Math.max(properties.filter(p => p.purpose.includes('Venda')).length, 1);
  const avgPriceLocacao = totalVgvLocacao / Math.max(properties.filter(p => p.purpose.includes('Locação')).length, 1);

  // Neighborhood Breakdown
  const neighborhoodMap: Record<string, { count: number; vgv: number; vendaCount: number; locacaoCount: number; availCount: number }> = {};
  properties.forEach(p => {
    const neigh = p.neighborhood?.trim() || 'Outros';
    if (!neighborhoodMap[neigh]) {
      neighborhoodMap[neigh] = { count: 0, vgv: 0, vendaCount: 0, locacaoCount: 0, availCount: 0 };
    }
    neighborhoodMap[neigh].count += 1;
    neighborhoodMap[neigh].vgv += (p.price || p.rent_price || 0);
    if (p.purpose.includes('Venda')) neighborhoodMap[neigh].vendaCount += 1;
    if (p.purpose.includes('Locação')) neighborhoodMap[neigh].locacaoCount += 1;
    if (p.status === 'Disponível') neighborhoodMap[neigh].availCount += 1;
  });

  const sortedNeighborhoods = Object.entries(neighborhoodMap).sort((a, b) => b[1].count - a[1].count);

  // Category Breakdown
  const categoryMap: Record<string, number> = {};
  properties.forEach(p => {
    const cat = p.category || 'Outros';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

  // -------------------------------------------------------------
  // HELPER: DRAW HEADER ON PAGES
  // -------------------------------------------------------------
  const drawHeader = (title: string, subSection: string, isFirstPage: boolean = false) => {
    doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.rect(0, 0, pageWidth, isFirstPage ? 32 : 20, 'F');

    // Red Accent Line
    doc.setFillColor(redLopes[0], redLopes[1], redLopes[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');

    // Company Brand Name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 13 : 10);
    doc.text((companySettings.company_name || 'LOPES MANAUS').toUpperCase(), 14, isFirstPage ? 11 : 10);

    doc.setTextColor(241, 15, 77);
    doc.setFontSize(isFirstPage ? 9.5 : 8);
    doc.text(title.toUpperCase(), 14, isFirstPage ? 18 : 16);

    if (isFirstPage) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(
        `Período: ${periodLabel}  |  Emissor: ${currentUser.name} (${currentUser.position || 'Gestão'})  |  Data de Emissão: ${dateFormatted}  |  Formato: A4 Horizontal`,
        14,
        25
      );
    } else {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(subSection, pageWidth - 14, 15, { align: 'right' });
    }
  };

  // =============================================================
  // PÁGINA 1: RESUMO EXECUTIVO & RELATÓRIO SEMANAL DO TIME
  // =============================================================
  drawHeader('Relatórios Executivos — Gestão de Captação & Desempenho', '1. Relatório Semanal', true);

  let currentY = 38;

  // Section 1 Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. DESEMPENHO SEMANAL DO TIME DE CAPTAÇÃO & ATIVIDADES', 14, currentY);
  currentY += 5;

  // 6 Metric KPI Cards in Grid
  const cardW = (pageWidth - 28 - (5 * 4)) / 6;
  const cardH = 22;
  const kpis = [
    { label: 'IMÓVEIS CAPTADOS', value: `${totalCaptures}`, sub: 'Novos no Catálogo', color: redLopes },
    { label: 'LEADS PROSPECTADOS', value: `${totalLeads}`, sub: 'Contatos / Abordagens', color: [79, 70, 229] as [number, number, number] },
    { label: 'VISITAS REALIZADAS', value: `${totalVisits}`, sub: 'Atendimentos Presenciais', color: [16, 185, 129] as [number, number, number] },
    { label: 'TAXA DE CONVERSÃO', value: `${overallConversion.toFixed(1)}%`, sub: 'Captações / Leads', color: [217, 119, 6] as [number, number, number] },
    { label: 'VGV NO PERÍODO', value: totalWeeklyVgv > 1000000 ? `R$ ${(totalWeeklyVgv / 1000000).toFixed(2)}M` : formatCurrency(totalWeeklyVgv), sub: 'Patrimônio Captado', color: darkSlate },
    { label: 'DIÁRIOS PREENCHIDOS', value: `${totalJournals}`, sub: 'Registros de Equipe', color: [225, 29, 72] as [number, number, number] }
  ];

  kpis.forEach((kpi, idx) => {
    const cx = 14 + (idx * (cardW + 4));
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
    doc.roundedRect(cx, currentY, cardW, cardH, 2, 2, 'FD');

    // Left color bar indicator
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(cx, currentY, 2.5, cardH, 1, 1, 'F');

    // Label
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(kpi.label, cx + 5, currentY + 5.5);

    // Value
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(kpi.value, cx + 5, currentY + 13);

    // Subtext
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text(kpi.sub, cx + 5, currentY + 18.5);
  });

  currentY += cardH + 7;

  // -------------------------------------------------------------
  // VISUAL CHARTS ROW: GRÁFICO 1 (CANAIS) + GRÁFICO 2 (EVOLUÇÃO DIÁRIA)
  // -------------------------------------------------------------
  const chartBoxW = (pageWidth - 28 - 6) / 2;
  const chartBoxH = 68;

  // --- CHART BOX 1: ORIGEM DOS CANAIS DE CAPTAÇÃO ---
  const b1X = 14;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
  doc.roundedRect(b1X, currentY, chartBoxW, chartBoxH, 2, 2, 'FD');

  // Chart 1 Header
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(b1X, currentY, chartBoxW, 9, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ORIGEM & CANAIS DE PROSPECÇÃO DO TIME (PARTICIPAÇÃO %)', b1X + 4, currentY + 6);

  const totalChannelsCount = Object.values(teamChannels).reduce((a, b) => a + b, 0) || 1;
  const channelEntries = Object.entries(teamChannels)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const displayedChannels = channelEntries.length > 0
    ? channelEntries
    : [['portal', 1], ['indicacao', 1], ['placa_rua', 1], ['telefone_ativo', 1]] as [string, number][];

  let barY = currentY + 14;
  const maxBarWidth = chartBoxW - 48;

  displayedChannels.slice(0, 5).forEach(([chKey, count]) => {
    const label = channelLabels[chKey] || chKey;
    const color = channelColors[chKey] || [100, 116, 139];
    const pct = ((count / totalChannelsCount) * 100);
    const barWidth = Math.max((pct / 100) * maxBarWidth, 4);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(label, b1X + 4, barY + 3.5);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.text(`${count} ações (${pct.toFixed(0)}%)`, b1X + chartBoxW - 4, barY + 3.5, { align: 'right' });

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(b1X + 4, barY + 5, maxBarWidth + 40, 3, 1, 1, 'F');

    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(b1X + 4, barY + 5, barWidth, 3, 1, 1, 'F');

    barY += 10.5;
  });

  // --- CHART BOX 2: EVOLUÇÃO DIÁRIA (TIMELINE) ---
  const b2X = 14 + chartBoxW + 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
  doc.roundedRect(b2X, currentY, chartBoxW, chartBoxH, 2, 2, 'FD');

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(b2X, currentY, chartBoxW, 9, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('EVOLUÇÃO DIÁRIA DE CAPTAÇÕES, LEADS E VISITAS (ÚLTIMOS 7 DIAS)', b2X + 4, currentY + 6);

  const colW = (chartBoxW - 16) / timelinePoints.length;
  const maxDayVal = Math.max(
    ...timelinePoints.map(p => Math.max(p.captados, p.leads, p.visitas)),
    4
  );

  const chartMaxH = 38;
  const chartBaseY = currentY + 54;

  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.line(b2X + 6, chartBaseY, b2X + chartBoxW - 6, chartBaseY);
  doc.line(b2X + 6, chartBaseY - (chartMaxH / 2), b2X + chartBoxW - 6, chartBaseY - (chartMaxH / 2));
  doc.line(b2X + 6, chartBaseY - chartMaxH, b2X + chartBoxW - 6, chartBaseY - chartMaxH);

  timelinePoints.forEach((point, idx) => {
    const colX = b2X + 8 + (idx * colW);

    const hCap = (point.captados / maxDayVal) * chartMaxH;
    const hLead = (point.leads / maxDayVal) * chartMaxH;
    const hVis = (point.visitas / maxDayVal) * chartMaxH;

    const barW = Math.max(colW / 4.2, 2.5);

    if (hCap > 0) {
      doc.setFillColor(redLopes[0], redLopes[1], redLopes[2]);
      doc.roundedRect(colX, chartBaseY - hCap, barW, hCap, 0.8, 0.8, 'F');
    }

    if (hLead > 0) {
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(colX + barW + 1, chartBaseY - hLead, barW, hLead, 0.8, 0.8, 'F');
    }

    if (hVis > 0) {
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(colX + (2 * barW) + 2, chartBaseY - hVis, barW, hVis, 0.8, 0.8, 'F');
    }

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text(`${point.label}`, colX + (barW * 1.5), chartBaseY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.8);
    doc.text(`${point.dayName}`, colX + (barW * 1.5), chartBaseY + 7.5, { align: 'center' });
  });

  // Chart 2 Legend
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(redLopes[0], redLopes[1], redLopes[2]);
  doc.rect(b2X + 8, chartBaseY + 10, 3, 2, 'F');
  doc.setTextColor(51, 65, 85);
  doc.text('Captados', b2X + 13, chartBaseY + 12);

  doc.setFillColor(79, 70, 229);
  doc.rect(b2X + 38, chartBaseY + 10, 3, 2, 'F');
  doc.text('Leads', b2X + 43, chartBaseY + 12);

  doc.setFillColor(16, 185, 129);
  doc.rect(b2X + 64, chartBaseY + 10, 3, 2, 'F');
  doc.text('Visitas', b2X + 69, chartBaseY + 12);

  currentY += chartBoxH + 7;

  // DIRETRIZES & PLANO DE AÇÃO
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
  doc.roundedRect(14, currentY, pageWidth - 28, 26, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(241, 15, 77);
  doc.text('DIRETRIZES & PLANO DE AÇÃO DA GESTÃO LOPES:', 18, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(6.8);
  doc.text('• Foco em Bairros de Alta Liquidez: Intensificar captação em Ponta Negra, Adrianópolis, Vieiralves e Dom Pedro com tickets adequados à demanda.', 18, currentY + 11);
  doc.text('• Padronização Visual & Catálogo em PDF: Cada captador possui link digital individual com ficha técnica atualizada e fotos em alta resolução.', 18, currentY + 16);
  doc.text('• Acompanhamento dos Diários: Registro diário obrigatório de contatos, visitas e metas para garantir acompanhamento contínuo da produtividade.', 18, currentY + 21);

  // =============================================================
  // PÁGINA 2: MATRIZ DE DESEMPENHO INDIVIDUAL DOS CAPTADORES
  // =============================================================
  doc.addPage();
  drawHeader('Matriz de Desempenho Individual dos Captadores', '2. Ranking & Desempenho');

  currentY = 24;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. MATRIZ DE DESEMPENHO INDIVIDUAL DOS CAPTADORES', 14, currentY);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Métricas calculadas com base no Diário de Captação e carteira no período selecionado (${periodLabel})`, 14, currentY + 4);
  currentY += 7;

  // TABELA 1: MATRIZ QUANTITATIVA DE DESEMPENHO
  const captadoresTableBody = memberStats.map((m, idx) => [
    `#${idx + 1}`,
    m.user.name,
    m.user.position || 'Captador',
    m.user.creci || '-',
    `${m.captures}`,
    `${m.leads}`,
    `${m.visits}`,
    `${m.conversionRate.toFixed(0)}%`,
    m.weeklyVgv > 0 ? formatCurrency(m.weeklyVgv) : 'R$ 0',
    m.topChannelName,
    `${m.journalsCount} registro(s)`,
    `${m.totalPropertiesAllTime} imóveis`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      '#', 'Nome do Captador', 'Cargo', 'CRECI', 'Captados', 'Leads', 'Visitas', 'Eficácia %',
      'VGV Período (R$)', 'Canal Principal', 'Diários', 'Carteira Geral'
    ]],
    body: captadoresTableBody.length > 0 ? captadoresTableBody : [['-', 'Nenhum captador ativo', '-', '-', '0', '0', '0', '0%', 'R$ 0', '-', '0', '0']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 9 },
      1: { fontStyle: 'bold', cellWidth: 40 },
      2: { cellWidth: 24 },
      3: { cellWidth: 18 },
      4: { fontStyle: 'bold', halign: 'center', cellWidth: 15 },
      5: { halign: 'center', cellWidth: 15 },
      6: { halign: 'center', cellWidth: 15 },
      7: { fontStyle: 'bold', halign: 'center', cellWidth: 16 },
      8: { fontStyle: 'bold', halign: 'right', cellWidth: 30 },
      9: { cellWidth: 38 },
      10: { halign: 'center', cellWidth: 22 },
      11: { fontStyle: 'bold', halign: 'center', cellWidth: 27 }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 9;

  // TABELA 2: RESUMO DE ATIVIDADES & METAS REGISTRADAS NO DIÁRIO DE CAPTAÇÃO (TODOS OS CAPTADORES)
  if (currentY > 155) {
    doc.addPage();
    drawHeader('Resumo de Atividades & Metas dos Diários', '2. Diário de Captação');
    currentY = 24;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('RESUMO DE ATIVIDADES & METAS REGISTRADAS NO DIÁRIO DE CAPTAÇÃO:', 14, currentY);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Consolidação das anotações operacionais, canais de prospecção, destaques e próximas metas de cada corretor no período', 14, currentY + 4);
  currentY += 6;

  const activitiesTableBody = memberStats.map((m, idx) => [
    `#${idx + 1} ${m.user.name}\nCRECI: ${m.user.creci || '-'}\nDiários: ${m.journalsCount}\nAvaliação: ${m.latestRating}`,
    m.channelsSummaryText,
    m.summaryNotesText,
    m.highlightsText,
    m.nextGoalsText
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      'Captador & Perfil',
      'Canais Utilizados no Período',
      'Resumo das Atividades Executadas (Diário)',
      'Destaques & Conquistas',
      'Próximas Metas Planejadas'
    ]],
    body: activitiesTableBody.length > 0 ? activitiesTableBody : [['Nenhum captador cadastrado', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [241, 15, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.2, textColor: [30, 41, 59], cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 46 },
      2: { cellWidth: 80 },
      3: { cellWidth: 48 },
      4: { cellWidth: 53 }
    },
    margin: { left: 14, right: 14 }
  });

  // =============================================================
  // PÁGINA 3: CARTEIRA GERAL E ANÁLISE POR BAIRROS
  // =============================================================
  doc.addPage();
  drawHeader('Carteira Geral de Imóveis & Análise por Bairro', '3. Carteira & Bairros');

  currentY = 24;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('3. ESTRUTURA DA CARTEIRA GERAL & ANÁLISE TERRITORIAL (MANAUS)', 14, currentY);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Levantamento completo do estoque de imóveis cadastrados, liquidez e concentração geográfica em Manaus', 14, currentY + 4);
  currentY += 7;

  // 4 Cards of General Portfolio
  const pCardW = (pageWidth - 28 - (3 * 4)) / 4;
  const pCardH = 20;
  const portKpis = [
    { label: 'TOTAL DE IMÓVEIS', value: `${totalProps}`, sub: 'Base cadastrada ativa', color: darkSlate },
    { label: 'DISPONÍVEIS (PRONTOS)', value: `${availProps}`, sub: `${((availProps / Math.max(totalProps, 1)) * 100).toFixed(0)}% da carteira`, color: [16, 185, 129] as [number, number, number] },
    { label: 'VGV TOTAL EM VENDA', value: `R$ ${(totalVgvVenda / 1000000).toFixed(2)}M`, sub: `Média: ${formatCurrency(avgPriceVenda)}`, color: redLopes },
    { label: 'VGV TOTAL EM LOCAÇÃO', value: `R$ ${(totalVgvLocacao / 1000).toFixed(0)}k/mês`, sub: `Média: ${formatCurrency(avgPriceLocacao)}/mês`, color: [79, 70, 229] as [number, number, number] }
  ];

  portKpis.forEach((kpi, idx) => {
    const cx = 14 + (idx * (pCardW + 4));
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
    doc.roundedRect(cx, currentY, pCardW, pCardH, 2, 2, 'FD');

    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(cx, currentY, 2.5, pCardH, 1, 1, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(kpi.label, cx + 5, currentY + 5.5);

    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(kpi.value, cx + 5, currentY + 12.5);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text(kpi.sub, cx + 5, currentY + 17);
  });

  currentY += pCardH + 7;

  // Visual Graphic: Top Neighborhoods Bars (Left) + Top Categories (Right)
  const nBoxW = (pageWidth - 28 - 6) / 2;
  const nBoxH = 58;

  // --- BOX 1: TOP BAIRROS VISUAL ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
  doc.roundedRect(14, currentY, nBoxW, nBoxH, 2, 2, 'FD');

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, nBoxW, 9, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CONCENTRAÇÃO POR BAIRROS ESTRATÉGICOS (TOP BAIRROS)', 18, currentY + 6);

  let nBarY = currentY + 13;
  const maxNeighCount = sortedNeighborhoods[0] ? sortedNeighborhoods[0][1].count : 1;
  const maxNBarW = nBoxW - 55;

  sortedNeighborhoods.slice(0, 5).forEach(([neigh, data]) => {
    const barW = Math.max((data.count / maxNeighCount) * maxNBarW, 4);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(neigh, 18, nBarY + 3.5);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.text(`${data.count} imóveis (R$ ${(data.vgv / 1000000).toFixed(1)}M)`, 14 + nBoxW - 4, nBarY + 3.5, { align: 'right' });

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(18, nBarY + 5, maxNBarW + 32, 2.8, 1, 1, 'F');

    doc.setFillColor(redLopes[0], redLopes[1], redLopes[2]);
    doc.roundedRect(18, nBarY + 5, barW, 2.8, 1, 1, 'F');

    nBarY += 9.5;
  });

  // --- BOX 2: CATEGORIAS & TIPOLOGIA VISUAL ---
  const catX = 14 + nBoxW + 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
  doc.roundedRect(catX, currentY, nBoxW, nBoxH, 2, 2, 'FD');

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(catX, currentY, nBoxW, 9, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('DISTRIBUIÇÃO POR CATEGORIA E TIPOLOGIA DE IMÓVEL', catX + 4, currentY + 6);

  let cBarY = currentY + 13;
  const maxCatCount = sortedCategories[0] ? sortedCategories[0][1] : 1;

  sortedCategories.slice(0, 5).forEach(([cat, count]) => {
    const pct = ((count / Math.max(totalProps, 1)) * 100);
    const barW = Math.max((count / maxCatCount) * maxNBarW, 4);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(cat, catX + 4, cBarY + 3.5);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.text(`${count} imóveis (${pct.toFixed(0)}%)`, catX + nBoxW - 4, cBarY + 3.5, { align: 'right' });

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(catX + 4, cBarY + 5, maxNBarW + 32, 2.8, 1, 1, 'F');

    doc.setFillColor(79, 70, 229);
    doc.roundedRect(catX + 4, cBarY + 5, barW, 2.8, 1, 1, 'F');

    cBarY += 9.5;
  });

  currentY += nBoxH + 6;

  // Detailed Neighborhoods Table
  const neighTableBody = sortedNeighborhoods.map(([neigh, data]) => [
    neigh,
    `${data.count} imóveis`,
    `${((data.count / Math.max(totalProps, 1)) * 100).toFixed(1)}%`,
    formatCurrency(data.vgv),
    formatCurrency(data.vgv / Math.max(data.count, 1)),
    `${data.vendaCount}`,
    `${data.locacaoCount}`,
    `${data.availCount}`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      'Bairro Foco (Manaus)', 'Qtd Imóveis', '% Carteira', 'VGV Somado (R$)', 'Ticket Médio (R$)',
      'Venda', 'Locação', 'Disponíveis'
    ]],
    body: neighTableBody.length > 0 ? neighTableBody.slice(0, 10) : [['Nenhum bairro cadastrado', '0', '0%', 'R$ 0', 'R$ 0', '0', '0', '0']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { fontStyle: 'bold', halign: 'center', cellWidth: 26 },
      2: { halign: 'center', cellWidth: 22 },
      3: { fontStyle: 'bold', halign: 'right', cellWidth: 42 },
      4: { halign: 'right', cellWidth: 42 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 22 },
      7: { fontStyle: 'bold', halign: 'center', cellWidth: 24 }
    },
    margin: { left: 14, right: 14 }
  });

  // =============================================================
  // PÁGINA 4: CLIENTES, NEGÓCIOS & IMÓVEIS RECENTES (Se houver)
  // =============================================================
  const clientProperties = properties.filter(p => p.client_name || p.status === 'Vendido' || p.status === 'Alugado' || p.status === 'Reservado');

  if (clientProperties.length > 0) {
    doc.addPage();
    drawHeader('Clientes & Negociações Concluídas', '4. Negócios & Fechamentos');

    currentY = 24;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('4. CONTROLE DE CLIENTES (COMPRADORES & INQUILINOS) E TRANSAÇÕES', 14, currentY);
    currentY += 4;

    const clientsBody = clientProperties.map(p => {
      const owner = users.find(u => u.id === p.user_id);
      return [
        p.code || '-',
        p.title?.substring(0, 32) + '...',
        p.client_name || 'Não Informado',
        p.client_cpf_cnpj || '-',
        p.client_phone || '-',
        p.client_type || (p.status === 'Alugado' ? 'INQUILINO' : 'COMPRADOR'),
        p.status,
        formatCurrency(p.transaction_value || p.price || p.rent_price),
        owner ? owner.name : '-'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Código', 'Imóvel', 'Cliente Cadastrado', 'CPF / CNPJ', 'Telefone', 'Tipo', 'Status', 'Valor do Negócio', 'Captador']],
      body: clientsBody,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 }
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 9, pageWidth - 14, pageHeight - 9);

    doc.text(
      `Documento Confidencial de Gestão — Lopes Imobiliária (Shopping Ponta Negra)  |  Página ${i} de ${totalPages}`,
      14,
      pageHeight - 4.5
    );
    doc.text(
      `${companySettings.company_name || 'Lopes Manaus'} | CRECI: ${companySettings.creci_j || '540-J/AM'}`,
      pageWidth - 14,
      pageHeight - 4.5,
      { align: 'right' }
    );
  }

  // Save PDF file
  const fileDate = now.toISOString().split('T')[0];
  doc.save(`Relatorios_Gestao_Lopes_${fileDate}.pdf`);
}
