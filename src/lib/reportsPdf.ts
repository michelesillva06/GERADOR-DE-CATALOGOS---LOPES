import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Property, User, AuditLog, CompanySettings } from '../types';

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
  currentUser: User
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
  const lightBg = [248, 250, 252] as [number, number, number];

  // Helper for Header on new pages
  const drawHeader = (isFirstPage: boolean) => {
    doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.rect(0, 0, pageWidth, isFirstPage ? 34 : 20, 'F');

    doc.setFillColor(redLopes[0], redLopes[1], redLopes[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 13 : 10);
    doc.text((companySettings.company_name || 'LOPES MANAUS').toUpperCase(), 14, isFirstPage ? 12 : 11);

    if (isFirstPage) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(241, 15, 77);
      doc.text('RELATÓRIO EXECUTIVO PARA A DIRETORIA — PLANILHA DE GESTÃO E ESTRATÉGIA DE CAPTAÇÃO', 14, 18);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(`Apresentação: Diretoria Geral | Relatório Gerado por: ${currentUser.name} (${currentUser.position || 'Gestora'}) | Data: ${dateFormatted} | Formato: A4 Horizontal`, 14, 25);
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text('Relatório Executivo para a Diretoria — Lopes Imobiliária', 14, 16);
      doc.text(`Data: ${dateFormatted}`, pageWidth - 14, 16, { align: 'right' });
    }
  };

  // Draw initial page header
  drawHeader(true);

  let currentY = 40;

  // -------------------------------------------------------------
  // CALCULATIONS FOR EXECUTIVE SUMMARY & STRATEGY
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

  const activeCaptadores = users.filter(u => u.status === 'active').length;

  // Neighborhood Breakdown for Strategy
  const neighborhoodMap: Record<string, { count: number; vgv: number }> = {};
  properties.forEach(p => {
    const neigh = p.neighborhood?.trim() || 'Outros';
    if (!neighborhoodMap[neigh]) neighborhoodMap[neigh] = { count: 0, vgv: 0 };
    neighborhoodMap[neigh].count += 1;
    neighborhoodMap[neigh].vgv += (p.price || p.rent_price || 0);
  });

  const sortedNeighborhoods = Object.entries(neighborhoodMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6);

  // Category Breakdown
  const categoryMap: Record<string, number> = {};
  properties.forEach(p => {
    const cat = p.category || 'Outros';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  // -------------------------------------------------------------
  // SECTION 1: ESTRATÉGIA DE CAPTAÇÃO DA EQUIPE
  // -------------------------------------------------------------
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. ESTRATÉGIA DE CAPTAÇÃO E COBERTURA DE MERCADO', 14, currentY);
  currentY += 4;

  // Strategy Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(241, 15, 77);
  doc.text('PILARES DA ESTRATÉGIA DE CAPTAÇÃO LOPES:', 18, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('• Cobertura Territorial Focada: Prospecção priorizada nos bairros de alta liquidez e valorização (Ponta Negra, Adrianópolis, Vieiralves, Dom Pedro e Tarumã).', 18, currentY + 9);
  doc.text('• Governança & Padronização: Catálogos digitais com links individuais por captador e capas institucionais padronizadas pela diretoria.', 18, currentY + 13);
  doc.text('• Agilidade e Controle de Giro: Rastreabilidade total de movimentações, reduzindo o tempo de vacância e garantindo precisão nos dados cadastrais.', 18, currentY + 17);

  currentY += 24;

  // -------------------------------------------------------------
  // SECTION 2: DESEMPENHO GERAL E CONSOLIDADOS FINANCEIROS
  // -------------------------------------------------------------
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. DESEMPENHO GERAL DA EQUIPE & METRICAS CONSOLIDADAS', 14, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [['Indicador de Gestão', 'Quantidade / Valor', 'Participação (%) / Detalhamento', 'Impacto Estratégico para a Diretoria']],
    body: [
      ['Total de Imóveis na Carteira', `${totalProps} imóveis`, '100% da base ativa', 'Volume total sob gestão dos captadores'],
      ['Imóveis Disponíveis (Ativos)', `${availProps} imóveis`, `${((availProps / Math.max(totalProps, 1)) * 100).toFixed(1)}% do catálogo`, 'Estoque pronto para comercialização e oferta pública'],
      ['Imóveis Concluídos (Vendidos + Alugados)', `${soldProps + rentedProps} imóveis`, `${soldProps} Vendidos | ${rentedProps} Alugados`, 'Taxa de eficácia da equipe de captação e vendas'],
      ['Imóveis Reservados (Em Negociação)', `${reservedProps} imóveis`, `${((reservedProps / Math.max(totalProps, 1)) * 100).toFixed(1)}% da carteira`, 'Propostas aceitas aguardando fechamento'],
      ['VGV Total Acumulado (Venda)', formatCurrency(totalVgvVenda), `Ticket Médio: ${formatCurrency(avgPriceVenda)}`, 'Patrimônio financeiro ofertado em venda'],
      ['VGV Total Acumulado (Locação/mês)', formatCurrency(totalVgvLocacao), `Ticket Médio: ${formatCurrency(avgPriceLocacao)}/mês`, 'Receita recorrente mensal potencial'],
      ['Produtividade Média por Captador', `${(totalProps / Math.max(activeCaptadores, 1)).toFixed(1)} imóveis/captador`, `${activeCaptadores} captadores ativos`, 'Nível de engajamento individual da equipe'],
      ['Coordenadoria e Auditoria', `${logs.length} ações auditadas`, 'Histórico de atualização em tempo real', 'Segurança da informação e controle de edições']
    ],
    theme: 'grid',
    headStyles: { fillColor: [241, 15, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold' },
      1: { cellWidth: 45, fontStyle: 'bold' },
      2: { cellWidth: 60 },
      3: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Top Neighborhoods & Categories Summary Table
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Distribuição Estratégica por Bairro e Categoria:', 14, currentY);
  currentY += 3;

  const topNeighRows = sortedNeighborhoods.map(([neigh, data]) => [
    neigh,
    `${data.count} imóveis`,
    `${((data.count / Math.max(totalProps, 1)) * 100).toFixed(1)}%`,
    formatCurrency(data.vgv)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Bairro Foco', 'Qtd Imóveis', '% da Carteira', 'VGV Somado (R$)']],
    body: topNeighRows.length > 0 ? topNeighRows : [['Nenhum imóvel cadastrado', '0', '0%', 'R$ 0,00']],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // New Page for Individual Captadores Table
  doc.addPage();
  drawHeader(false);
  currentY = 24;

  // -------------------------------------------------------------
  // SECTION 3: DESEMPENHO INDIVIDUAL DOS CAPTADORES
  // -------------------------------------------------------------
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('3. MATRIZ DE DESEMPENHO INDIVIDUAL DOS CAPTADORES', 14, currentY);
  currentY += 4;

  const captadoresPerformance = users.filter(u => u.status === 'active').map(u => {
    const userProps = properties.filter(p => p.user_id === u.id);
    const avail = userProps.filter(p => p.status === 'Disponível').length;
    const sold = userProps.filter(p => p.status === 'Vendido').length;
    const rented = userProps.filter(p => p.status === 'Alugado').length;
    const reserved = userProps.filter(p => p.status === 'Reservado').length;

    const vgvVenda = userProps
      .filter(p => p.purpose.includes('Venda') && p.price)
      .reduce((acc, p) => acc + (p.price || 0), 0);

    const vgvLocacao = userProps
      .filter(p => p.purpose.includes('Locação') && (p.rent_price || p.price))
      .reduce((acc, p) => acc + (p.rent_price || p.price || 0), 0);

    const totalVgv = vgvVenda + vgvLocacao;
    const avgTicket = totalVgv / Math.max(userProps.length, 1);

    // Get primary neighborhoods for this user
    const userNeighs: Record<string, number> = {};
    userProps.forEach(p => {
      const n = p.neighborhood || 'Outro';
      userNeighs[n] = (userNeighs[n] || 0) + 1;
    });
    const mainNeighs = Object.entries(userNeighs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(entry => entry[0])
      .join(', ') || 'N/A';

    const lastLog = logs.find(l => l.user_id === u.id || l.user_name?.toLowerCase() === u.name.toLowerCase());

    return {
      user: u,
      total: userProps.length,
      avail,
      sold,
      rented,
      reserved,
      vgvVenda,
      vgvLocacao,
      totalVgv,
      avgTicket,
      mainNeighs,
      lastActivity: lastLog ? formatDate(lastLog.created_at) : 'Sem registro'
    };
  }).sort((a, b) => b.total - a.total);

  const captadoresTableBody = captadoresPerformance.map((item, idx) => [
    `#${idx + 1} ${item.user.name}`,
    item.user.position || 'Captador',
    item.user.creci || '-',
    `${item.total} imóveis`,
    `${item.avail}`,
    `${item.sold}`,
    `${item.rented}`,
    `${item.reserved}`,
    formatCurrency(item.vgvVenda),
    formatCurrency(item.vgvLocacao),
    formatCurrency(item.avgTicket),
    item.mainNeighs,
    item.lastActivity
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      'Captador', 'Cargo', 'CRECI', 'Total', 'Disp.', 'Vend.', 'Alug.', 'Resv.',
      'VGV Venda (R$)', 'VGV Locação (R$)', 'Ticket Médio (R$)', 'Bairros Foco', 'Última Atividade'
    ]],
    body: captadoresTableBody.length > 0 ? captadoresTableBody : [['Nenhum captador cadastrado', '-', '-', '0', '0', '0', '0', '0', 'R$ 0', 'R$ 0', 'R$ 0', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 20 },
      2: { cellWidth: 16 },
      3: { fontStyle: 'bold', halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', cellWidth: 12 },
      7: { halign: 'center', cellWidth: 12 },
      8: { fontStyle: 'bold', halign: 'right', cellWidth: 26 },
      9: { halign: 'right', cellWidth: 24 },
      10: { halign: 'right', cellWidth: 26 },
      11: { cellWidth: 32 },
      12: { cellWidth: 24 }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // -------------------------------------------------------------
  // SECTION 4: CLIENTES & NEGÓCIOS FECHADOS (Se houver)
  // -------------------------------------------------------------
  const clientProperties = properties.filter(p => p.client_name || p.status === 'Vendido' || p.status === 'Alugado' || p.status === 'Reservado');

  if (clientProperties.length > 0) {
    if (currentY > 150) {
      doc.addPage();
      drawHeader(false);
      currentY = 24;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('4. RELATÓRIO DE CLIENTES (COMPRADORES & INQUILINOS CADASTRAIS)', 14, currentY);
    currentY += 4;

    const clientsBody = clientProperties.map(p => {
      const owner = users.find(u => u.id === p.user_id);
      return [
        p.code || '-',
        p.title?.substring(0, 30) + '...',
        p.client_name || 'Não Registrado',
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
      head: [['Código', 'Imóvel', 'Cliente Cadastrado', 'CPF / CNPJ', 'Telefone', 'Tipo', 'Status', 'Valor Negócio', 'Captador']],
      body: clientsBody,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Footer Signature & Page Numbering across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);

    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

    doc.text(`Documento Confidencial de Gestão — Lopes Imobiliária (Shopping Ponta Negra)  |  Página ${i} de ${totalPages}`, 14, pageHeight - 5);
    doc.text(`${companySettings.company_name || 'Lopes Manaus'} | CRECI: ${companySettings.creci_j || '540-J/AM'}`, pageWidth - 14, pageHeight - 5, { align: 'right' });
  }

  // Save PDF file with landscape indicator
  const fileDate = now.toISOString().split('T')[0];
  doc.save(`Relatorio_Executivo_Diretoria_Lopes_${fileDate}.pdf`);
}
