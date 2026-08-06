import * as XLSX from 'xlsx';
import { Property, User, AuditLog, CompanySettings } from '../types';

function formatCurrencyNumber(val: number | undefined): string {
  if (!val || isNaN(val)) return 'R$ 0,00';
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

  const totalCaptadores = users.length;
  const captadoresAtivos = users.filter(u => u.status === 'active').length;

  const resumoData = [
    ["PLANILHA DE CONTROLE E MOVIMENTAÇÃO DE CAPTAÇÃO - LOPES MANAUS"],
    [`Unidade / Imobiliária: ${companySettings.company_name || 'Lopes Manaus'} - ${companySettings.unit_name || ''}`],
    [`Relatório Gerado por: ${currentUser.name} (${currentUser.position || 'Gestora'})`],
    [`Destinatário: Diretoria Geral da Imobiliária`],
    [`Data e Hora de Emissão: ${dateFormatted}`],
    [""],
    ["INDICADOR CHAVE DE DESEMPENHO", "VALOR / QUANTIDADE", "OBSERVAÇÕES E MÉTRICAS"],
    ["Total de Imóveis Cadastrados", totalProperties, "Total acumulado na carteira da imobiliária"],
    ["Imóveis Disponíveis", availableProps, `${((availableProps / Math.max(totalProperties, 1)) * 100).toFixed(1)}% do total da carteira`],
    ["Imóveis Vendidos", soldProps, "Status Vendido concluído"],
    ["Imóveis Alugados", rentedProps, "Status Alugado concluído"],
    ["Imóveis Reservados / Em Negociação", reservedProps, "Status Reservado em andamento"],
    ["VGV Total em Venda (R$)", formatCurrencyNumber(totalVgvVenda), "Valor Geral de Venda acumulado"],
    ["VGV Total em Locação (R$/mês)", formatCurrencyNumber(totalVgvLocacao), "Valor Geral de Locação mensal"],
    ["Total de Captadores Ativos", captadoresAtivos, `De um total de ${totalCaptadores} usuários`],
    ["Média de Imóveis por Captador", (totalProperties / Math.max(captadoresAtivos, 1)).toFixed(1), "Imóveis por captador ativo"],
    ["Total de Movimentações Registradas", logs.length, "Logs de auditoria e atualizações"]
  ];

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
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

  const captadoresRows = users.map(u => {
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

  const wsCaptadores = XLSX.utils.aoa_to_sheet([captadoresHeader, ...captadoresRows]);
  XLSX.utils.book_append_sheet(wb, wsCaptadores, "Desempenho dos Captadores");

  // -------------------------------------------------------------
  // ABA 3: MOVIMENTAÇÕES E HISTÓRICO DE ATUALIZAÇÕES
  // -------------------------------------------------------------
  const logsHeader = [
    "Data e Hora",
    "Captador / Usuário Responsável",
    "Ação Executada",
    "Descrição Detalhada da Movimentação",
    "IP / Origem"
  ];

  const logsRows = logs.map(l => [
    formatDate(l.created_at),
    l.user_name || 'Sistema',
    l.action || 'Atualização',
    l.description || '-',
    l.ip_address || 'Servidor'
  ]);

  const wsLogs = XLSX.utils.aoa_to_sheet([logsHeader, ...logsRows]);
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
    "Vagas de Garagem",
    "Área Total (m²)",
    "Cliente Comprador/Inquilino",
    "CPF/CNPJ Cliente",
    "Telefone Cliente",
    "E-mail Cliente",
    "Tipo Cliente",
    "Data do Negócio",
    "Valor Fechado (R$)",
    "Obs Negócio",
    "Visualizações no Catálogo",
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

  const wsImoveis = XLSX.utils.aoa_to_sheet([imoveisHeader, ...imoveisRows]);
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

  const wsClientes = XLSX.utils.aoa_to_sheet([clientesHeader, ...clientesRows]);
  XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes & Negócios Concluídos");

  // Nome do arquivo para a diretoria
  const fileDate = now.toISOString().split('T')[0];
  const fileName = `Planilha_Controle_Movimentacoes_Lopes_${fileDate}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
