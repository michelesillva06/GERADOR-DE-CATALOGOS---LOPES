import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { ContractFormData, Property } from '../types';
import { BASE_CONTRACT_TEXT, CLAUSE_DEFINITIONS, getApplicableClauses } from './contractTemplates';

/**
 * Pre-fills a ContractFormData from an existing cadastro — everything the property record
 * already has is reused (owner_name, client_name, price, address...), the rest is left blank
 * for the user to complete. This never overwrites something the user already typed; it's only
 * used to seed the form when a property is first selected.
 */
export function prefillFromProperty(property: Property): Partial<ContractFormData> {
  const isRental = property.purpose === 'Locação';
  const addressParts = [property.street, property.number, property.neighborhood, property.city, property.state]
    .filter(Boolean)
    .join(', ');

  return {
    contract_type: isRental ? 'LOCACAO' : 'VENDA',
    property_id: property.id,
    property_code: property.code,
    property_description: property.address || addressParts || property.title || '',
    property_value: isRental
      ? (property.rent_price ? `R$ ${property.rent_price.toLocaleString('pt-BR')}` : '')
      : (property.price ? `R$ ${property.price.toLocaleString('pt-BR')}` : ''),
    owner: {
      name: property.owner_name || '',
      cpf_cnpj: '',
      address: '',
      phone: property.owner_phone || '',
      email: property.owner_email || ''
    },
    counterparty: {
      name: property.client_name || '',
      cpf_cnpj: property.client_cpf_cnpj || '',
      address: '',
      phone: property.client_phone || '',
      email: property.client_email || ''
    }
  };
}

/** Replaces {{field}} placeholders in a clause/body template with values from the form. */
function fillPlaceholders(template: string, data: ContractFormData): string {
  const flatValues: Record<string, string> = {
    owner_name: data.owner.name,
    owner_cpf_cnpj: data.owner.cpf_cnpj,
    owner_address: data.owner.address,
    counterparty_name: data.counterparty.name,
    counterparty_cpf_cnpj: data.counterparty.cpf_cnpj,
    counterparty_address: data.counterparty.address,
    property_description: data.property_description,
    property_value: data.property_value
  };
  for (const toggle of data.clauses) {
    if (toggle.values) {
      Object.assign(flatValues, toggle.values);
    }
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => flatValues[key] ?? `[${key}]`);
}

/** Assembles the base contract + every enabled clause into the final plain-text contract. */
export function assembleContractText(data: ContractFormData): { title: string; paragraphs: string[] } {
  const base = BASE_CONTRACT_TEXT[data.contract_type];
  const bodyFilled = fillPlaceholders(base.body, data);
  const paragraphs = bodyFilled.split('\n\n').filter(p => p.trim().length > 0);

  for (const toggle of data.clauses) {
    if (!toggle.enabled) continue;
    const def = CLAUSE_DEFINITIONS.find(c => c.key === toggle.key);
    if (!def) continue;
    paragraphs.push(fillPlaceholders(def.text, data));
  }

  if (data.extra_notes && data.extra_notes.trim()) {
    paragraphs.push(`OBSERVAÇÕES ADICIONAIS\n${data.extra_notes.trim()}`);
  }

  paragraphs.push(
    `Manaus, ${new Date().toLocaleDateString('pt-BR')}.`,
    '\n\n_________________________________\n' + (data.contract_type === 'VENDA' ? 'VENDEDOR(A)' : 'LOCADOR(A)'),
    '\n\n_________________________________\n' + (data.contract_type === 'VENDA' ? 'COMPRADOR(A)' : 'LOCATÁRIO(A)')
  );

  return { title: base.title, paragraphs };
}

export function generateContractPDF(data: ContractFormData): jsPDF {
  const { title, paragraphs } = assembleContractText(data);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const marginX = 20;
  const maxWidth = 170;
  let y = 25;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(title, maxWidth);
  doc.text(titleLines, 105, y, { align: 'center' });
  y += titleLines.length * 6 + 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);

  for (const para of paragraphs) {
    const isHeading = /^CLÁUSULA/i.test(para.trim());
    doc.setFont('helvetica', isHeading ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(para, maxWidth);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 5.5;
    }
    y += 3;
  }

  return doc;
}

export async function generateContractDocx(data: ContractFormData): Promise<Blob> {
  const { title, paragraphs } = assembleContractText(data);

  const bodyParagraphs = paragraphs.map(para => {
    const isHeading = /^CLÁUSULA/i.test(para.trim());
    return new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: para,
          bold: isHeading,
          size: 22 // half-points, 22 = 11pt
        })
      ]
    });
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: title, bold: true })]
          }),
          ...bodyParagraphs
        ]
      }
    ]
  });

  return Packer.toBlob(doc);
}
