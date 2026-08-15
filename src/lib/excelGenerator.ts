import * as XLSX from 'xlsx';
import { Property, User, AuditLog, CompanySettings } from '../types';

function formatCurrencyNumber(val: number | undefined): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
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

  const maxCols = Math.max(...data.map(row => row ? row.length : 0));

  for (let c = 0; c < maxCols; c++) {
    let maxLen = minWidths[c] || 12;
    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length <= c) continue;
      const val = row[c];
      if (val !== null && val !== undefined) {
        const strVal = String(val);
        // Skip header banners in early rows if they are super long title strings
        if (r < 5 && strVal.length > 50) continue;
        const calcLen = strVal.length + 4;
        if (calcLen > maxLen) {
          maxLen = Math.min(calcLen, 55); // max column width cap
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
  currentUser: User
) {
  const wb = XLSX.utils.book_new();

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // -------------------------------------------------------------
  // ABA 1: RESUMO EXECUTIVO PARA A DIRETORIA
  // -------------------------------------------------------------
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

  const onlyCaptadores = users.filter(u => {
    if (u.is_demo || u.username === 'demo' || u.role === 'DEMO') return false;
    if (u.role === 'MASTER_ADMIN' || (u.role as string) === 'ADMIN' || u.role === 'GESTOR' || u.role === 'GESTORA') return false;
    return true;
  });
  const totalCaptadores = onlyCaptadores.length;
  const captadoresAtivos = onlyCaptadores.filter(u => u.status === 'active').length;

  const resumoData = [
    ["PLANILHA DE CONTROLE E MOVIMENTAÇÃO DE CAPTAÇÃO - LOPES MANAUS"],
    [`Unidade / Imobiliária: ${companySettings.company_name || 'Lopes Manaus'} - ${companySettings.unit_name || 'Shopping Ponta Negra'}`],
    [`Relatório Gerado por: ${currentUser.name} (${currentUser.position || 'Gestor'})`],
    [`Destinatário: Diretoria Geral da Imobiliária`],
    [`Data e Hora de Emissão: ${dateFormatted}`],
    [""],
    ["INDICADOR CHAVE DE DESEMPENHO", "VALOR / QUANTIDADE", "OBSERVAÇÕES E MÉTRICAS ESTRATÉGICAS"],
    ["Total de Imóveis Cadastrados", totalProperties, "Total acumulado na carteira da imobiliária"],
    ["Imóveis Disponíveis", availableProps, `${((availableProps / Math.max(totalProperties, 1)) * 100).toFixed(1)}% do total da carteira`],
    ["Imóveis Vendidos", soldProps, "Status Vendido concluído com sucesso"],
    ["Imóveis Alugados", rentedProps, "Status Alugado concluído"],
    ["Imóveis Reservados / Em Negociação", reservedProps, "Status Reservado aguardando fechamento"],
    ["VGV Total em Venda (R$)", formatCurrencyNumber(totalVgvVenda), "Valor Geral de Venda acumulado"],
    ["VGV Total em Locação (R$/mês)", formatCurrencyNumber(totalVgvLocacao), "Valor Geral de Locação mensal somado"],
    ["Total de Captadores Ativos", captadoresAtivos, `De um total de ${totalCaptadores} usuários cadastrados`],
    ["Média de Imóveis por Captador", (totalProperties / Math.max(captadoresAtivos, 1)).toFixed(1), "Produtividade média de imóveis por captador ativo"],
    ["Total de Movimentações Registradas", logs.length, "Logs de auditoria e atualizações em tempo real"]
  ];

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  applyColumnWidths(wsResumo, resumoData, { 0: 42, 1: 28, 2: 55 });
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Executivo");

  // -------------------------------------------------------------
  // ABA 2: DESEMPENHO POR CAPTADOR
  // -------------------------------------------------------------
  const captadoresHeader = [
    "Nome do Captador",
    "Função / Cargo",
    "E-mail",
    "Telefone / WhatsApp",
    "CRECI",
    "Status no Sistema",
    "Total Imóveis Captados",
    "Imóveis Disponíveis",
    "Imóveis Vendidos",
    "Imóveis Alugados",
    "Imóveis Reservados",
    "VGV Venda (R$)",
    "VGV Locação (R$/mês)",
    "Última Atividade Registrada",
    "Link Catálogo Público"
  ];

  const captadoresRows = onlyCaptadores.map(u => {
    const userProps = properties.filter(p => p.user_id === u.id);
    const uAvailable = userProps.filter(p => p.status === 'Disponível').length;
    const uSold = userProps.filter(p => p.status === 'Vendido').length;
    const uRented = userProps.filter(p => p.status === 'Alugado').length;
    const uReserved = userProps.filter(p => p.status === 'Reservado').length;

    const uVgvVenda = userProps
      .filter(p => p.purpose.includes('Venda') && p.price)
      .reduce((acc, p) => acc + (p.price || 0), 0);

    const uVgvLocacao = userProps
      .filter(p => p.purpose.includes('Locação') && (p.rent_price || p.price))
      .reduce((acc, p) => acc + (p.rent_price || p.price || 0), 0);

    const lastLog = logs.find(l => l.user_id === u.id || l.user_name?.toLowerCase() === u.name.toLowerCase());
    const lastActivity = lastLog ? formatDate(lastLog.created_at) : 'Sem registros recentes';

    return [
      u.name,
      u.position || 'Captador',
      u.email,
      u.phone || u.whatsapp || '-',
      u.creci || '-',
      u.status === 'active' ? 'Ativo' : 'Bloqueado',
      userProps.length,
      uAvailable,
      uSold,
      uRented,
      uReserved,
      formatCurrencyNumber(uVgvVenda),
      formatCurrencyNumber(uVgvLocacao),
      lastActivity,
      `/catalogo/${u.url_slug || u.username}`
    ];
  });

  const captadoresData = [captadoresHeader, ...captadoresRows];
  const wsCaptadores = XLSX.utils.aoa_to_sheet(captadoresData);
  applyColumnWidths(wsCaptadores, captadoresData, {
    0: 28, 1: 20, 2: 32, 3: 20, 4: 16, 5: 16,
    6: 22, 7: 20, 8: 18, 9: 18, 10: 20, 11: 24, 12: 24, 13: 22, 14: 32
  });
  XLSX.utils.book_append_sheet(wb, wsCaptadores, "Desempenho dos Captadores");

  // -------------------------------------------------------------
  // ABA 3: MOVIMENTAÇÕES E HISTÓRICO DE ATUALIZAÇÕES
  // -------------------------------------------------------------
  const logsHeader = [
    "Data e Hora",
    "Captador / Usuário Responsável",
    "Ação Executada",
    "Descrição Detalhada da Movimentação",
    "Origem do Evento"
  ];

  const logsRows = logs.map(l => [
    formatDate(l.created_at),
    l.user_name || 'Sistema',
    l.action || 'Atualização',
    l.description || '-',
    l.ip_address || 'Sistema'
  ]);

  const logsData = [logsHeader, ...logsRows];
  const wsLogs = XLSX.utils.aoa_to_sheet(logsData);
  applyColumnWidths(wsLogs, logsData, {
    0: 22, 1: 28, 2: 24, 3: 65, 4: 16
  });
  XLSX.utils.book_append_sheet(wb, wsLogs, "Movimentações do Sistema");

  // -------------------------------------------------------------
  // ABA 4: INVENTÁRIO COMPLETO DE IMÓVEIS
  // -------------------------------------------------------------
  const imoveisHeader = [
    "Código Lopes",
    "Título do Imóvel",
    "Captador Responsável",
    "Categoria",
    "Finalidade",
    "Status Atual",
    "Preço Venda (R$)",
    "Preço Locação (R$)",
    "Taxa Condomínio (R$)",
    "IPTU (R$)",
    "Bairro",
    "Cidade/UF",
    "Endereço",
    "Dormitórios",
    "Suítes",
    "Banheiros",
    "Vagas Garagem",
    "Área Total (m²)",
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
      p.category || 'Apartamento',
      p.purpose || 'Venda',
      p.status || 'Disponível',
      formatCurrencyNumber(p.price),
      formatCurrencyNumber(p.rent_price),
      formatCurrencyNumber(p.condo_fee),
      formatCurrencyNumber(p.iptu),
      p.neighborhood || '-',
      `${p.city || 'Manaus'} / ${p.state || 'AM'}`,
      p.address || '-',
      p.bedrooms || 0,
      p.suites || 0,
      p.bathrooms || 0,
      p.parking_spaces || 0,
      p.total_area || 0,
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
    0: 16, 1: 45, 2: 26, 3: 18, 4: 18, 5: 16,
    6: 22, 7: 22, 8: 20, 9: 16, 10: 22, 11: 16, 12: 35,
    13: 14, 14: 12, 15: 12, 16: 18, 17: 16,
    18: 30, 19: 20, 20: 18, 21: 30, 22: 16, 23: 20, 24: 22,
    25: 35, 26: 22, 27: 20, 28: 20
  });
  XLSX.utils.book_append_sheet(wb, wsImoveis, "Inventário de Imóveis");

  // -------------------------------------------------------------
  // ABA 5: CADASTRO DE CLIENTES (COMPRADORES & INQUILINOS)
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
  XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes & Negócios Concluídos");

  // Nome do arquivo para a diretoria
  const fileDate = now.toISOString().split('T')[0];
  const fileName = `Planilha_Controle_Movimentacoes_Lopes_${fileDate}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

