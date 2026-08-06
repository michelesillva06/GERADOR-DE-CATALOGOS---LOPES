import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Property, User, AuditLog, CompanySettings } from '../types';

function formatCurrency(val: number | undefined): string {
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

export function exportControlPDF(
  properties: Property[],
  users: User[],
  logs: AuditLog[],
  companySettings: CompanySettings,
  currentUser: User
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Color palette
  const primaryColor = '#F10F4D';
  const darkSlate = '#0F172A';

  // 1. HEADER BANNER
  doc.setFillColor(15, 23, 42); // dark slate
  doc.rect(0, 0, 210, 36, 'F');

  // Red accent top bar
  doc.setFillColor(241, 15, 77); // #F10F4D
  doc.rect(0, 0, 210, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text((companySettings.company_name || 'LOPES MANAUS').toUpperCase(), 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('RELATÓRIO DE CONTROLE DE CAPTAÇÃO E MOVIMENTAÇÃO DOS CAPTADORES', 14, 19);

  doc.setFontSize(8);
  doc.text(`Destino: Diretoria Geral  |  Gerado por: ${currentUser.name} (${currentUser.position || 'Gestora'})  |  Data: ${dateFormatted}`, 14, 25);

  let currentY = 44;

  // 2. RESUMO EXECUTIVO (CARDS)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. RESUMO EXECUTIVO DE INDICADORES', 14, currentY);
  currentY += 5;

  const totalProps = properties.length;
  const availProps = properties.filter(p => p.status === 'Disponível').length;
  const soldProps = properties.filter(p => p.status === 'Vendido').length;
  const rentedProps = properties.filter(p => p.status === 'Alugado').length;

  const totalVgvVenda = properties
    .filter(p => p.purpose.includes('Venda') && p.price)
    .reduce((acc, p) => acc + (p.price || 0), 0);

  const totalVgvLocacao = properties
    .filter(p => p.purpose.includes('Locação') && (p.rent_price || p.price))
    .reduce((acc, p) => acc + (p.rent_price || p.price || 0), 0);

  const activeCaptadores = users.filter(u => u.status === 'active').length;

  // Table summary
  autoTable(doc, {
    startY: currentY,
    head: [['Indicador de Gestão', 'Quantidade / Valor', 'Métrica / Participação']],
    body: [
      ['Total de Imóveis no Cadastrados', `${totalProps} imóveis`, '100% da carteira da imobiliária'],
      ['Imóveis Disponíveis para Venda/Locação', `${availProps} imóveis`, `${((availProps / Math.max(totalProps, 1)) * 100).toFixed(1)}% do catálogo ativo`],
      ['Imóveis Concluídos (Vendidos + Alugados)', `${soldProps + rentedProps} imóveis`, `${soldProps} Vendidos / ${rentedProps} Alugados`],
      ['VGV Acumulado de Venda (R$)', formatCurrency(totalVgvVenda), 'Soma dos valores dos imóveis para venda'],
      ['VGV Acumulado de Locação (R$/mês)', formatCurrency(totalVgvLocacao), 'Soma dos aluguéis mensais da carteira'],
      ['Equipe de Captadores Ativos', `${activeCaptadores} captadores`, `Média de ${(totalProps / Math.max(activeCaptadores, 1)).toFixed(1)} imóveis/captador`],
      ['Registros de Movimentação no Sistema', `${logs.length} logs`, 'Total de ações rastreadas pela auditoria']
    ],
    theme: 'striped',
    headStyles: { fillColor: [241, 15, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 3. DESEMPENHO DOS CAPTADORES
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. PERFORMANCE E DESEMPENHO POR CAPTADOR', 14, currentY);
  currentY += 5;

  const captadoresBody = users.map(u => {
    const userProps = properties.filter(p => p.user_id === u.id);
    const avail = userProps.filter(p => p.status === 'Disponível').length;
    const soldRented = userProps.filter(p => p.status === 'Vendido' || p.status === 'Alugado').length;
    const vgv = userProps.reduce((acc, p) => acc + (p.price || p.rent_price || 0), 0);
    const lastLog = logs.find(l => l.user_id === u.id || l.user_name?.toLowerCase() === u.name.toLowerCase());

    return [
      u.name,
      u.position || 'Captador',
      u.creci || '-',
      `${userProps.length} imóveis`,
      `${avail} disp.`,
      `${soldRented} concl.`,
      formatCurrency(vgv),
      lastLog ? formatDate(lastLog.created_at) : 'Sem registro'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Captador', 'Cargo', 'CRECI', 'Total Captados', 'Disponíveis', 'Concluídos', 'VGV Total', 'Última Atividade']],
    body: captadoresBody,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Check if page end is near
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // 4. CLIENTES E NEGÓCIOS REGISTRADOS (COMPRADORES E INQUILINOS)
  const clientProperties = properties.filter(p => p.client_name || p.status === 'Vendido' || p.status === 'Alugado' || p.status === 'Reservado');

  if (clientProperties.length > 0) {
    // Check page space
    if (currentY > 210) {
      doc.addPage();
      currentY = 20;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. RELATÓRIO DE CLIENTES (COMPRADORES E INQUILINOS CADASTRAIS)', 14, currentY);
    currentY += 5;

    const clientsBody = clientProperties.map(p => {
      const owner = users.find(u => u.id === p.user_id);
      return [
        p.code || '-',
        p.client_name || 'Não Registrado',
        p.client_cpf_cnpj || '-',
        p.client_phone || '-',
        p.client_type || (p.status === 'Alugado' ? 'INQUILINO' : 'COMPRADOR'),
        p.status,
        formatCurrency(p.transaction_value || p.price || p.rent_price),
        owner ? owner.name.split(' ')[0] : '-'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Código', 'Nome do Cliente', 'CPF / CNPJ', 'Telefone', 'Tipo', 'Status', 'Valor Fechado', 'Captador']],
      body: clientsBody,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // 5. ÚLTIMAS MOVIMENTAÇÕES DOS CAPTADORES
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. HISTÓRICO DE RECENTES MOVIMENTAÇÕES DOS CAPTADORES', 14, currentY);
  currentY += 5;

  const logsBody = logs.slice(0, 15).map(l => [
    formatDate(l.created_at),
    l.user_name || 'Sistema',
    l.action || 'Atualização',
    l.description || '-'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Data / Hora', 'Captador', 'Ação', 'Descrição da Movimentação']],
    body: logsBody,
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  // Footer Signature Block at page bottom
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Relatório Oficial de Gestão Lopes Captação — Página ${i} de ${totalPages}`, 14, 287);
    doc.text(`${companySettings.company_name || 'Lopes Manaus'} | CRECI: ${companySettings.creci_j || '540-J/AM'}`, 196, 287, { align: 'right' });
  }

  // Save PDF file
  const fileDate = now.toISOString().split('T')[0];
  doc.save(`Relatorio_Diretoria_Lopes_${fileDate}.pdf`);
}
