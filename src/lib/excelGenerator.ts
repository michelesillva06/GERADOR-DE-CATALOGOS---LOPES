import * as XLSX from 'xlsx';
import { Property, User, AuditLog, CompanySettings, JournalEntry } from '../types';

function formatCurrencyNumber(val: number | undefined): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
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

// Helper to auto-calculate column widths and apply them cleanly
function applyColumnWidths(ws: XLSX.WorkSheet, data: any[][], minWidths: Record<number, number> = {}) {
  const colWidths: { wch: number }[] = [];
  if (!data || data.length === 0) return;

  const maxCols = Math.max(...data.map(row => (row ? row.length : 0)));

  for (let c = 0; c < maxCols; c++) {
    let maxLen = minWidths[c] || 14;
    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length <= c) continue;
      const val = row[c];
      if (val !== null && val !== undefined) {
        const strVal = String(val);
        // Skip header banners in early rows if they are super long title strings
        if (r < 6 && strVal.length > 50) continue;
        const calcLen = strVal.length + 4;
        if (calcLen > maxLen) {
          maxLen = Math.min(calcLen, 70); // max column width cap
        }
      }
    }
    colWidths.push({ wch: maxLen });
  }

  ws['!cols'] = colWidths;
}

export function exportControlSpreadsheet(
  properties: Property[],
  users: User[],
  logs: AuditLog[],
  companySettings: CompanySettings,
  currentUser: User,
  journalEntries: JournalEntry[] = [],
  periodFilter: '7d' | '14d' | '30d' | 'all' = '7d'
) {
  const wb = XLSX.utils.book_new();

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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

  // Filtered Journal entries in the period
  const filteredJournals = journalEntries.filter(entry => {
    const entryDate = new Date(entry.date + 'T12:00:00');
    return entryDate >= dateThreshold;
  });

  // Active Captadores only
  const onlyCaptadores = users.filter(u => {
    if (u.is_demo || u.username === 'demo' || u.role === 'DEMO') return false;
    if (u.role === 'MASTER_ADMIN' || (u.role as string) === 'ADMIN' || u.role === 'GESTOR' || u.role === 'GESTORA') return false;
    return true;
  });

  const channelLabels: Record<string, string> = {
    portal: 'Portais Imobiliários',
    placa_rua: 'Placa / Prospecção de Rua',
    indicacao: 'Indicações & Parceiros',
    redes_sociais: 'Instagram / Redes Sociais',
    telefone_ativo: 'Telefone / WhatsApp Ativo',
    parceria: 'Parcerias com Corretores',
    outros: 'Outros Canais'
  };

  // Performance calculation by captador
  const captadorPerformance = onlyCaptadores.map(u => {
    const memberJournals = filteredJournals.filter(j => j.user_id === u.id);
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
        allNotes.push(`[${j.date}] ${j.summary_notes.trim()}`);
      }
      if (Array.isArray(j.key_highlights) && j.key_highlights.length > 0) {
        allHighlights.push(...j.key_highlights.filter(h => h && h.trim()));
      }
      if (j.next_day_goals && j.next_day_goals.trim()) {
        allGoals.push(`[${j.date}] ${j.next_day_goals.trim()}`);
      }
      if (j.canais_captacao) {
        Object.keys(j.canais_captacao).forEach(ch => {
          const val = (j.canais_captacao as any)[ch] || 0;
          channelsMap[ch] = (channelsMap[ch] || 0) + Number(val || 0);
        });
      }
    });

    const memberPropsInPeriod = properties.filter(p => {
      if (p.user_id !== u.id) return false;
      const pDate = p.created_at ? new Date(p.created_at) : new Date();
      return pDate >= dateThreshold;
    });

    const userAllProps = properties.filter(p => p.user_id === u.id);
    const uAvailable = userAllProps.filter(p => p.status === 'Disponível').length;
    const uSold = userAllProps.filter(p => p.status === 'Vendido').length;
    const uRented = userAllProps.filter(p => p.status === 'Alugado').length;
    const uReserved = userAllProps.filter(p => p.status === 'Reservado').length;

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

    // Channels detailed string for Excel
    const channelsSummaryParts: string[] = [];
    if (channelsMap.portal > 0) channelsSummaryParts.push(`Portais: ${channelsMap.portal}`);
    if (channelsMap.placa_rua > 0) channelsSummaryParts.push(`Placas: ${channelsMap.placa_rua}`);
    if (channelsMap.indicacao > 0) channelsSummaryParts.push(`Indicações: ${channelsMap.indicacao}`);
    if (channelsMap.telefone_ativo > 0) channelsSummaryParts.push(`WhatsApp: ${channelsMap.telefone_ativo}`);
    if (channelsMap.redes_sociais > 0) channelsSummaryParts.push(`Redes: ${channelsMap.redes_sociais}`);
    if (channelsMap.parceria > 0) channelsSummaryParts.push(`Parcerias: ${channelsMap.parceria}`);
    if (channelsMap.outros > 0) channelsSummaryParts.push(`Outros: ${channelsMap.outros}`);

    const channelsDetailedStr = channelsSummaryParts.length > 0
      ? channelsSummaryParts.join(' | ')
      : `Canal Principal: ${topChannelName}`;

    const summaryNotesText = allNotes.length > 0
      ? allNotes.join('\n')
      : (latestJournal?.summary_notes || 'Sem anotações no diário.');

    const highlightsText = allHighlights.length > 0
      ? allHighlights.join(' | ')
      : (actualCaptures > 0 ? `${actualCaptures} novo(s) imóvel(is) cadastrado(s) na carteira` : 'Prospecção ativa nos bairros');

    const nextGoalsText = allGoals.length > 0
      ? allGoals.join('\n')
      : (latestJournal?.next_day_goals || 'Manter rotina de prospecção e visitas');

    const lastLog = logs.find(l => l.user_id === u.id || l.user_name?.toLowerCase() === u.name.toLowerCase());
    const lastActivity = lastLog ? formatDate(lastLog.created_at) : 'Sem registros recentes';

    const uVgvVendaTotal = userAllProps
      .filter(p => p.purpose.includes('Venda') && p.price)
      .reduce((acc, p) => acc + (p.price || 0), 0);

    const uVgvLocacaoTotal = userAllProps
      .filter(p => p.purpose.includes('Locação') && (p.rent_price || p.price))
      .reduce((acc, p) => acc + (p.rent_price || p.price || 0), 0);

    return {
      user: u,
      leads,
      captures: actualCaptures,
      visits,
      weeklyVgv,
      conversionRate,
      channelsMap,
      topChannelName,
      channelsDetailedStr,
      journalsCount: memberJournals.length,
      latestRating: primaryRating,
      summaryNotesText,
      highlightsText,
      nextGoalsText,
      totalPropertiesAllTime: userAllProps.length,
      uAvailable,
      uSold,
      uRented,
      uReserved,
      uVgvVendaTotal,
      uVgvLocacaoTotal,
      lastActivity
    };
  }).sort((a, b) => {
    if (b.captures !== a.captures) return b.captures - a.captures;
    return b.leads - a.leads;
  });

  const totalWeeklyLeads = captadorPerformance.reduce((s, m) => s + m.leads, 0);
  const totalWeeklyCaptures = captadorPerformance.reduce((s, m) => s + m.captures, 0);
  const totalWeeklyVisits = captadorPerformance.reduce((s, m) => s + m.visits, 0);
  const totalWeeklyVgv = captadorPerformance.reduce((s, m) => s + m.weeklyVgv, 0);
  const totalWeeklyJournals = captadorPerformance.reduce((s, m) => s + m.journalsCount, 0);
  const overallWeeklyConversion = totalWeeklyLeads > 0 ? (totalWeeklyCaptures / totalWeeklyLeads) * 100 : (totalWeeklyCaptures > 0 ? 100 : 0);

  const teamChannels: Record<string, number> = {
    portal: 0,
    placa_rua: 0,
    indicacao: 0,
    redes_sociais: 0,
    telefone_ativo: 0,
    parceria: 0,
    outros: 0
  };
  captadorPerformance.forEach(m => {
    Object.entries(m.channelsMap).forEach(([k, v]) => {
      teamChannels[k] = (teamChannels[k] || 0) + Number(v || 0);
    });
  });

  // Overall Portfolio Totals
  const totalProperties = properties.length;
  const availableProps = properties.filter(p => p.status === 'Disponível').length;
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

  // -------------------------------------------------------------
  // ABA 1: RESUMO EXECUTIVO & SEMANAL
  // -------------------------------------------------------------
  const resumoData = [
    ["RELATÓRIOS EXECUTIVOS DE GESTÃO, CAPTAÇÃO & CARTEIRA - LOPES MANAUS"],
    [`Unidade / Imobiliária: ${companySettings.company_name || 'Lopes Manaus'} - ${companySettings.unit_name || 'Shopping Ponta Negra'}`],
    [`CRECI Jurídico: ${companySettings.creci_j || '540-J/AM'} | Emissor: ${currentUser.name} (${currentUser.position || 'Gestor'})`],
    [`Período Selecionado: ${periodLabel} | Data de Emissão: ${dateFormatted}`],
    [""],
    ["1. INDICADORES DO RELATÓRIO SEMANAL (PERÍODO SELECIONADO)", "VALOR / QUANTIDADE", "DETALHAMENTO & IMPACTO OPERACIONAL"],
    ["Imóveis Captados no Período", totalWeeklyCaptures, "Novos imóveis adicionados ao catálogo"],
    ["Leads / Proprietários Prospectados", totalWeeklyLeads, "Total de proprietários abordados na prospecção"],
    ["Visitas / Atendimentos Realizados", totalWeeklyVisits, "Visitas presenciais de captação e avaliação"],
    ["Taxa Média de Conversão (%)", `${overallWeeklyConversion.toFixed(1)}%`, "Proporção de captações em relação aos leads"],
    ["VGV Total Captado no Período (R$)", formatCurrencyNumber(totalWeeklyVgv), "Patrimônio adicionado à carteira no período"],
    ["Diários de Captação Preenchidos", totalWeeklyJournals, "Registros de atividades submetidos pela equipe"],
    [""],
    ["2. INDICADORES CONSOLIDADOS DA CARTEIRA GERAL", "VALOR / QUANTIDADE", "ESTOQUE & LIQUIDEZ GERAL"],
    ["Total Geral de Imóveis na Base", totalProperties, "Volume total histórico sob gestão"],
    ["Imóveis Disponíveis (Prontos)", availableProps, `${((availableProps / Math.max(totalProperties, 1)) * 100).toFixed(1)}% da carteira ativa pronta para oferta`],
    ["Imóveis Vendidos (Concluídos)", soldProps, "Transações de venda concluídas"],
    ["Imóveis Alugados (Concluídos)", rentedProps, "Transações de locação concluídas"],
    ["Imóveis Reservados (Em Negociação)", reservedProps, "Propostas em análise e elaboração de contrato"],
    ["VGV Total da Carteira em Venda (R$)", formatCurrencyNumber(totalVgvVenda), `Ticket Médio: ${formatCurrencyNumber(avgPriceVenda)}`],
    ["VGV Total da Carteira em Locação (R$/mês)", formatCurrencyNumber(totalVgvLocacao), `Ticket Médio: ${formatCurrencyNumber(avgPriceLocacao)}/mês`],
    ["Total de Captadores Ativos", captadorPerformance.length, "Corretores monitorados no sistema"],
    ["Média de Imóveis por Captador", (totalProperties / Math.max(captadorPerformance.length, 1)).toFixed(1), "Média de imóveis cadastrados por corretor"],
    ["Logs de Auditoria Registrados", logs.length, "Rastreabilidade completa de ações"]
  ];

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  applyColumnWidths(wsResumo, resumoData, { 0: 45, 1: 30, 2: 60 });
  const addSafeSheet = (name: string, sheet: XLSX.WorkSheet) => {
    // Excel strictly forbids sheet names longer than 31 characters
    const cleanName = name.trim().substring(0, 31);
    XLSX.utils.book_append_sheet(wb, sheet, cleanName);
  };

  addSafeSheet("Resumo Executivo", wsResumo);

  // -------------------------------------------------------------
  // ABA 2: MATRIZ DE DESEMPENHO INDIVIDUAL DOS CAPTADORES & DIÁRIOS
  // -------------------------------------------------------------
  const captadoresBanner = [
    ["MATRIZ DE DESEMPENHO INDIVIDUAL DOS CAPTADORES - LOPES MANAUS"],
    [`Métricas calculadas com base no Diário de Captação e carteira no período selecionado: ${periodLabel}`],
    [`Emissão: ${dateFormatted} | Imobiliária: ${companySettings.company_name || 'Lopes Manaus'}`],
    [""]
  ];

  const captadoresHeader = [
    "Posição",
    "Nome do Captador",
    "Função / Cargo",
    "CRECI",
    "E-mail",
    "Telefone / WhatsApp",
    "Status",
    "Imóveis Captados no Período",
    "Leads Prospectados no Período",
    "Visitas Realizadas no Período",
    "Taxa de Eficiência (%)",
    "VGV Captado no Período (R$)",
    "Canal Principal",
    "Canais Utilizados no Período",
    "Diários Registrados",
    "Avaliação Predominante",
    "Resumo das Atividades no Diário",
    "Destaques & Conquistas",
    "Próximas Metas Registradas",
    "Total Carteira Geral",
    "Disponíveis",
    "Vendidos",
    "Alugados",
    "Reservados",
    "VGV Venda Total (R$)",
    "VGV Locação Total (R$/mês)",
    "Última Atividade no Sistema",
    "Link Catálogo Público"
  ];

  const captadoresRows = captadorPerformance.map((item, idx) => [
    `#${idx + 1}`,
    item.user.name,
    item.user.position || 'Captador',
    item.user.creci || '-',
    item.user.email,
    item.user.phone || item.user.whatsapp || '-',
    item.user.status === 'active' ? 'Ativo' : 'Bloqueado',
    item.captures,
    item.leads,
    item.visits,
    `${item.conversionRate.toFixed(1)}%`,
    formatCurrencyNumber(item.weeklyVgv),
    item.topChannelName,
    item.channelsDetailedStr,
    item.journalsCount,
    item.latestRating,
    item.summaryNotesText,
    item.highlightsText,
    item.nextGoalsText,
    item.totalPropertiesAllTime,
    item.uAvailable,
    item.uSold,
    item.uRented,
    item.uReserved,
    formatCurrencyNumber(item.uVgvVendaTotal),
    formatCurrencyNumber(item.uVgvLocacaoTotal),
    item.lastActivity,
    `https://lopes-captacao.app/catalogo/${item.user.url_slug || item.user.username}`
  ]);

  const captadoresData = [...captadoresBanner, captadoresHeader, ...captadoresRows];
  const wsCaptadores = XLSX.utils.aoa_to_sheet(captadoresData);
  applyColumnWidths(wsCaptadores, captadoresData, {
    0: 10, 1: 28, 2: 20, 3: 16, 4: 30, 5: 22, 6: 14,
    7: 26, 8: 26, 9: 24, 10: 22, 11: 24, 12: 26, 13: 40,
    14: 18, 15: 20, 16: 55, 17: 45, 18: 45,
    19: 20, 20: 16, 21: 14, 22: 14, 23: 16,
    24: 24, 25: 24, 26: 24, 27: 35
  });
  addSafeSheet("Desempenho por Captador", wsCaptadores);

  // -------------------------------------------------------------
  // ABA 3: CARTEIRA GERAL DE IMÓVEIS
  // -------------------------------------------------------------
  const imoveisHeader = [
    "Código Lopes",
    "Título do Imóvel",
    "Captador Responsável",
    "CRECI Captador",
    "Categoria",
    "Finalidade",
    "Status Atual",
    "Preço Venda (R$)",
    "Preço Locação (R$/mês)",
    "Taxa Condomínio (R$)",
    "IPTU (R$)",
    "Bairro",
    "Cidade",
    "UF",
    "Endereço / Referência",
    "Dormitórios",
    "Suítes",
    "Banheiros",
    "Vagas Garagem",
    "Área Total (m²)",
    "Área Útil (m²)",
    "Cliente Comprador/Inquilino",
    "CPF/CNPJ Cliente",
    "Telefone Cliente",
    "E-mail Cliente",
    "Tipo Cliente",
    "Data do Negócio",
    "Valor Fechado (R$)",
    "Obs Negócio",
    "Visualizações Catálogo",
    "Data de Cadastro",
    "Última Atualização"
  ];

  const imoveisRows = properties.map(p => {
    const owner = users.find(u => u.id === p.user_id);
    return [
      p.code || '-',
      p.title || '-',
      owner ? owner.name : 'Desconhecido',
      owner?.creci || '-',
      p.category || 'Apartamento',
      p.purpose || 'Venda',
      p.status || 'Disponível',
      formatCurrencyNumber(p.price),
      formatCurrencyNumber(p.rent_price),
      formatCurrencyNumber(p.condo_fee),
      formatCurrencyNumber(p.iptu),
      p.neighborhood || '-',
      p.city || 'Manaus',
      p.state || 'AM',
      p.address || '-',
      p.bedrooms || 0,
      p.suites || 0,
      p.bathrooms || 0,
      p.parking_spaces || 0,
      p.total_area || 0,
      p.usable_area || p.built_area || 0,
      p.client_name || '-',
      p.client_cpf_cnpj || '-',
      p.client_phone || '-',
      p.client_email || '-',
      p.client_type || '-',
      p.transaction_date ? formatDate(p.transaction_date) : '-',
      p.transaction_value ? formatCurrencyNumber(p.transaction_value) : '-',
      p.transaction_notes || '-',
      p.views || 0,
      formatDate(p.created_at),
      formatDate(p.updated_at)
    ];
  });

  const imoveisData = [imoveisHeader, ...imoveisRows];
  const wsImoveis = XLSX.utils.aoa_to_sheet(imoveisData);
  applyColumnWidths(wsImoveis, imoveisData, {
    0: 16, 1: 45, 2: 26, 3: 16, 4: 20, 5: 18, 6: 16,
    7: 22, 8: 22, 9: 20, 10: 16, 11: 24, 12: 16, 13: 8,
    14: 35, 15: 14, 16: 12, 17: 12, 18: 18, 19: 16, 20: 16,
    21: 28, 22: 20, 23: 18, 24: 28, 25: 16, 26: 20, 27: 22,
    28: 35, 29: 20, 30: 20, 31: 20
  });
  addSafeSheet("Carteira Geral de Imóveis", wsImoveis);

  // -------------------------------------------------------------
  // ABA 4: ANÁLISE POR BAIRRO (MANAUS)
  // -------------------------------------------------------------
  const neighborhoodMap: Record<string, { count: number; vgv: number; vendaCount: number; locacaoCount: number; availCount: number; soldRentedCount: number }> = {};
  properties.forEach(p => {
    const neigh = p.neighborhood?.trim() || 'Outros';
    if (!neighborhoodMap[neigh]) {
      neighborhoodMap[neigh] = { count: 0, vgv: 0, vendaCount: 0, locacaoCount: 0, availCount: 0, soldRentedCount: 0 };
    }
    neighborhoodMap[neigh].count += 1;
    neighborhoodMap[neigh].vgv += (p.price || p.rent_price || 0);
    if (p.purpose.includes('Venda')) neighborhoodMap[neigh].vendaCount += 1;
    if (p.purpose.includes('Locação')) neighborhoodMap[neigh].locacaoCount += 1;
    if (p.status === 'Disponível') neighborhoodMap[neigh].availCount += 1;
    if (p.status === 'Vendido' || p.status === 'Alugado') neighborhoodMap[neigh].soldRentedCount += 1;
  });

  const sortedNeighborhoods = Object.entries(neighborhoodMap).sort((a, b) => b[1].count - a[1].count);

  const bairrosHeader = [
    "Bairro Foco (Manaus)",
    "Quantidade de Imóveis",
    "Participação na Carteira (%)",
    "VGV Total Acumulado (R$)",
    "Ticket Médio Estimado (R$)",
    "Imóveis à Venda",
    "Imóveis para Locação",
    "Estoque Disponível",
    "Imóveis Fechados (Vendidos/Alugados)"
  ];

  const bairrosRows = sortedNeighborhoods.map(([neigh, data]) => [
    neigh,
    data.count,
    `${((data.count / Math.max(totalProperties, 1)) * 100).toFixed(1)}%`,
    formatCurrencyNumber(data.vgv),
    formatCurrencyNumber(data.vgv / Math.max(data.count, 1)),
    data.vendaCount,
    data.locacaoCount,
    data.availCount,
    data.soldRentedCount
  ]);

  const bairrosData = [bairrosHeader, ...bairrosRows];
  const wsBairros = XLSX.utils.aoa_to_sheet(bairrosData);
  applyColumnWidths(wsBairros, bairrosData, {
    0: 32, 1: 22, 2: 26, 3: 28, 4: 26, 5: 18, 6: 20, 7: 20, 8: 26
  });
  addSafeSheet("Análise por Bairro", wsBairros);

  // -------------------------------------------------------------
  // ABA 5: ORIGEM & CANAIS DE PROSPECÇÃO
  // -------------------------------------------------------------
  const totalChannelsSum = Object.values(teamChannels).reduce((a, b) => a + b, 0) || 1;
  const canaisHeader = [
    "Canal de Prospecção",
    "Quantidade de Ações / Captações",
    "Participação na Equipe (%)",
    "Descrição Operacional"
  ];

  const canaisDesc: Record<string, string> = {
    portal: 'VivaReal, ZAP Imóveis, OLX, Imovelweb e portais parceiros',
    placa_rua: 'Captação presencial de campo, placas de vende-se e rondas nos bairros',
    indicacao: 'Rede de contatos, porteiros, síndicos, zeladores e clientes antigos',
    redes_sociais: 'Campanhas no Instagram, Facebook Ads, TikTok e LinkedIn',
    telefone_ativo: 'Prospecção ativa por telefone, cold calls e disparos de WhatsApp',
    parceria: 'Captação em conjunto e parcerias com corretores de outras imobiliárias',
    outros: 'Outros meios de atração e captações diretas'
  };

  const canaisRows = Object.entries(teamChannels).map(([k, count]) => [
    channelLabels[k] || k,
    count,
    `${((count / totalChannelsSum) * 100).toFixed(1)}%`,
    canaisDesc[k] || '-'
  ]);

  const canaisData = [canaisHeader, ...canaisRows];
  const wsCanais = XLSX.utils.aoa_to_sheet(canaisData);
  applyColumnWidths(wsCanais, canaisData, {
    0: 32, 1: 30, 2: 26, 3: 65
  });
  addSafeSheet("Canais de Prospecção", wsCanais);

  // -------------------------------------------------------------
  // ABA 6: HISTÓRICO DO DIÁRIO DE ATIVIDADES
  // -------------------------------------------------------------
  const diarioBanner = [
    ["HISTÓRICO CONSOLIDADO DO DIÁRIO DE CAPTAÇÃO & ATIVIDADES"],
    [`Registros detalhados de atividades diárias, canais de prospecção e metas por corretor: ${periodLabel}`],
    [""]
  ];

  const diarioHeader = [
    "Data da Atividade",
    "Nome do Captador",
    "Leads Prospectados",
    "Imóveis Captados",
    "Visitas Realizadas",
    "Portais",
    "Placas de Rua",
    "Indicações",
    "Redes Sociais",
    "Telefone / WhatsApp",
    "Parcerias",
    "Outros Canais",
    "Avaliação do Dia (Rating)",
    "Resumo das Atividades Executadas",
    "Principais Destaques & Conquistas",
    "Próximas Metas Planejadas"
  ];

  const diarioRows = filteredJournals.map(j => {
    const user = users.find(u => u.id === j.user_id);
    const highlights = Array.isArray(j.key_highlights) ? j.key_highlights.join(' | ') : '-';
    return [
      j.date,
      user ? user.name : j.user_name || 'Desconhecido',
      j.leads_prospectados || 0,
      j.imoveis_captados || 0,
      j.visitas_realizadas || 0,
      j.canais_captacao?.portal || 0,
      j.canais_captacao?.placa_rua || 0,
      j.canais_captacao?.indicacao || 0,
      j.canais_captacao?.redes_sociais || 0,
      j.canais_captacao?.telefone_ativo || 0,
      j.canais_captacao?.parceria || 0,
      j.canais_captacao?.outros || 0,
      j.rating || 'Produtivo',
      j.summary_notes || '-',
      highlights,
      j.next_day_goals || '-'
    ];
  });

  const diarioData = [...diarioBanner, diarioHeader, ...diarioRows];
  const wsDiario = XLSX.utils.aoa_to_sheet(diarioData);
  applyColumnWidths(wsDiario, diarioData, {
    0: 18, 1: 28, 2: 20, 3: 18, 4: 18,
    5: 12, 6: 14, 7: 14, 8: 14, 9: 18, 10: 12, 11: 14,
    12: 22, 13: 55, 14: 45, 15: 45
  });
  addSafeSheet("Diário de Atividades", wsDiario);

  // -------------------------------------------------------------
  // ABA 7: CLIENTES & NEGÓCIOS CONCLUÍDOS
  // -------------------------------------------------------------
  const clientesHeader = [
    "Código Imóvel",
    "Título do Imóvel",
    "Captador Responsável",
    "Status Atual",
    "Nome do Cliente",
    "CPF / CNPJ Cliente",
    "Telefone / WhatsApp",
    "E-mail Cliente",
    "Tipo de Cliente",
    "Data do Negócio / Contrato",
    "Valor Fechado do Negócio (R$)",
    "Observações do Negócio"
  ];

  const clientProperties = properties.filter(p => p.client_name || p.status === 'Vendido' || p.status === 'Alugado' || p.status === 'Reservado');

  const clientesRows = clientProperties.map(p => {
    const owner = users.find(u => u.id === p.user_id);
    return [
      p.code || '-',
      p.title || '-',
      owner ? owner.name : 'Desconhecido',
      p.status,
      p.client_name || 'Cliente Não Informado',
      p.client_cpf_cnpj || '-',
      p.client_phone || '-',
      p.client_email || '-',
      p.client_type || (p.status === 'Alugado' ? 'INQUILINO' : 'COMPRADOR'),
      p.transaction_date ? formatDate(p.transaction_date) : '-',
      formatCurrencyNumber(p.transaction_value || p.price || p.rent_price),
      p.transaction_notes || '-'
    ];
  });

  const clientesData = [clientesHeader, ...clientesRows];
  const wsClientes = XLSX.utils.aoa_to_sheet(clientesData);
  applyColumnWidths(wsClientes, clientesData, {
    0: 16, 1: 42, 2: 26, 3: 16, 4: 30, 5: 20,
    6: 18, 7: 30, 8: 16, 9: 22, 10: 24, 11: 40
  });
  addSafeSheet("Clientes e Negócios", wsClientes);

  // Nome do arquivo para a diretoria
  const fileDate = now.toISOString().split('T')[0];
  const fileName = `Relatorio_Completo_Gestao_Lopes_${fileDate}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
