import { ContractType } from '../types';

/**
 * CONTRACT TEMPLATES — STRUCTURE ONLY
 * ------------------------------------------------------------------
 * Every piece of text in this file marked with […] is a PLACEHOLDER, not real legal
 * wording. Michele's gestora still needs to provide the reviewed clause text for each
 * item below. Do not send a contract generated from the placeholder text to a client —
 * it exists so the rest of the system (form, PDF, Word export) has real content to
 * assemble and preview while the legal text is pending.
 *
 * HOW TO FINISH THIS FILE ONCE THE GESTORA SENDS THE REAL CLAUSES:
 * 1. Replace the `body` of BASE_CONTRACT_TEXT.VENDA / .LOCACAO with the real contract skeleton.
 * 2. For each conditional clause (caução, multa, etc.), replace the `text` field in
 *    CLAUSE_DEFINITIONS with the real clause wording. Keep the {{placeholders}} — those
 *    get replaced automatically with whatever the user typed in the form for that clause.
 * 3. Add new entries to CLAUSE_DEFINITIONS for any clause not listed here yet — the form
 *    picks them up automatically, no other file needs to change.
 */

export interface ContractClauseField {
  key: string; // used inside {{key}} in the clause text
  label: string; // shown to the user in the form
  placeholder?: string;
  type: 'text' | 'number' | 'date';
}

export interface ContractClauseDefinition {
  key: string;
  label: string; // shown as the checkbox label, e.g. "Imóvel tem caução?"
  appliesTo: ContractType[]; // which contract types this clause can appear in
  fields: ContractClauseField[]; // extra info this clause needs from the user, if any
  text: string; // the clause paragraph itself, with {{field_key}} placeholders
}

export const BASE_CONTRACT_TEXT: Record<ContractType, { title: string; body: string }> = {
  VENDA: {
    title: 'CONTRATO PARTICULAR DE COMPRA E VENDA DE IMÓVEL',
    body:
`[TEXTO BASE DO CONTRATO DE COMPRA E VENDA — aguardando o texto revisado da gestora.]

Pelo presente instrumento particular, de um lado {{owner_name}}, portador(a) do CPF/CNPJ {{owner_cpf_cnpj}}, residente e domiciliado(a) em {{owner_address}}, doravante denominado(a) VENDEDOR(A), e de outro lado {{counterparty_name}}, portador(a) do CPF/CNPJ {{counterparty_cpf_cnpj}}, residente e domiciliado(a) em {{counterparty_address}}, doravante denominado(a) COMPRADOR(A), têm entre si justo e acordado o presente contrato de compra e venda do imóvel abaixo descrito, mediante as cláusulas e condições seguintes:

CLÁUSULA 1ª — DO OBJETO
O presente contrato tem por objeto o imóvel: {{property_description}}.

CLÁUSULA 2ª — DO VALOR E FORMA DE PAGAMENTO
O valor total da venda é de {{property_value}}, a ser pago conforme acordado entre as partes.

[Demais cláusulas padrão do contrato de venda entram aqui, conforme texto da gestora.]`
  },
  LOCACAO: {
    title: 'CONTRATO DE LOCAÇÃO DE IMÓVEL',
    body:
`[TEXTO BASE DO CONTRATO DE LOCAÇÃO — aguardando o texto revisado da gestora.]

Pelo presente instrumento particular, de um lado {{owner_name}}, portador(a) do CPF/CNPJ {{owner_cpf_cnpj}}, residente e domiciliado(a) em {{owner_address}}, doravante denominado(a) LOCADOR(A), e de outro lado {{counterparty_name}}, portador(a) do CPF/CNPJ {{counterparty_cpf_cnpj}}, residente e domiciliado(a) em {{counterparty_address}}, doravante denominado(a) LOCATÁRIO(A), têm entre si justo e acordado o presente contrato de locação do imóvel abaixo descrito, mediante as cláusulas e condições seguintes:

CLÁUSULA 1ª — DO OBJETO
O presente contrato tem por objeto a locação do imóvel: {{property_description}}.

CLÁUSULA 2ª — DO ALUGUEL
O valor mensal do aluguel é de {{property_value}}, com vencimento conforme acordado entre as partes.

[Demais cláusulas padrão do contrato de locação entram aqui, conforme texto da gestora.]`
  }
};

/**
 * Every conditional clause the form can offer as a checkbox. Add new ones here as the
 * gestora defines them — the form and the generator pick up new entries automatically.
 */
export const CLAUSE_DEFINITIONS: ContractClauseDefinition[] = [
  {
    key: 'caucao',
    label: 'Imóvel tem caução?',
    appliesTo: ['LOCACAO'],
    fields: [
      { key: 'caucao_valor', label: 'Valor da caução', placeholder: 'Ex: R$ 3.000,00', type: 'text' },
      { key: 'caucao_forma', label: 'Forma de pagamento da caução', placeholder: 'Ex: depósito, fiador, seguro-fiança', type: 'text' }
    ],
    text:
`CLÁUSULA — DA CAUÇÃO
[Texto da cláusula de caução — aguardando revisão da gestora.] O LOCATÁRIO(A) prestará caução no valor de {{caucao_valor}}, na forma de {{caucao_forma}}, como garantia do cumprimento das obrigações assumidas neste contrato.`
  },
  {
    key: 'multa_rescisoria',
    label: 'Tem multa por rescisão antecipada?',
    appliesTo: ['LOCACAO'],
    fields: [
      { key: 'multa_valor', label: 'Valor ou critério da multa', placeholder: 'Ex: 3 aluguéis proporcionais', type: 'text' }
    ],
    text:
`CLÁUSULA — DA MULTA RESCISÓRIA
[Texto da cláusula de multa por rescisão antecipada — aguardando revisão da gestora.] Em caso de rescisão antecipada por parte do LOCATÁRIO(A), será devida multa equivalente a {{multa_valor}}.`
  },
  {
    key: 'imovel_mobiliado',
    label: 'Imóvel é mobiliado / com itens inclusos?',
    appliesTo: ['LOCACAO', 'VENDA'],
    fields: [
      { key: 'itens_inclusos', label: 'Lista de itens inclusos', placeholder: 'Ex: fogão, geladeira, armários planejados', type: 'text' }
    ],
    text:
`CLÁUSULA — DOS BENS MÓVEIS INCLUSOS
[Texto da cláusula de itens inclusos — aguardando revisão da gestora.] Acompanham o imóvel os seguintes bens: {{itens_inclusos}}.`
  },
  {
    key: 'financiamento',
    label: 'Venda envolve financiamento bancário?',
    appliesTo: ['VENDA'],
    fields: [
      { key: 'banco_financiador', label: 'Banco financiador', placeholder: 'Ex: Caixa Econômica Federal', type: 'text' }
    ],
    text:
`CLÁUSULA — DO FINANCIAMENTO
[Texto da cláusula de financiamento — aguardando revisão da gestora.] Parte do valor da venda será quitado mediante financiamento junto a {{banco_financiador}}, ficando a presente venda condicionada à aprovação do crédito.`
  }
];

export function getApplicableClauses(type: ContractType): ContractClauseDefinition[] {
  return CLAUSE_DEFINITIONS.filter(c => c.appliesTo.includes(type));
}
