import { Property } from '../types';

/**
 * Safely converts any numerical or string input into a valid integer/float number.
 */
export function parseNumericPrice(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val)
    .replace(/[^\d.,]/g, '')
    .replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Standard Brazilian currency format: R$ 3.500
 */
export function formatCurrencyBRL(val: number | string | undefined | null, includeCents = false): string {
  const num = parseNumericPrice(val);
  if (num <= 0) return 'Sob Consulta';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0
  }).format(num);
}

export interface PropertyPriceInfo {
  primaryFormatted: string;      // e.g. "R$ 3.500 /mês" or "R$ 650.000" or "Sob Consulta"
  secondaryFormatted?: string;    // e.g. "Aluguel: R$ 3.500 /mês" if both
  isRent: boolean;
  isSale: boolean;
  isBoth: boolean;
  salePrice: number;
  rentPrice: number;
  saleFormatted: string;         // e.g. "R$ 650.000" or "Sob Consulta"
  rentFormatted: string;         // e.g. "R$ 3.500 /mês" or "Sob Consulta"
  fullDisplay: string;           // Formatted summary for cards & modal headers
  pdfDisplay: string;            // Crisp display for PDF property cards
  pdfTagLabel: string;           // "VALOR" or "VALOR ALUGUEL" or "VALOR VENDA"
}

/**
 * Intelligently analyzes property purpose and price fields (price and rent_price)
 * to deliver consistent, guaranteed price representations across the entire system.
 */
export function getPropertyPriceInfo(property: Partial<Property> | null | undefined): PropertyPriceInfo {
  if (!property) {
    return {
      primaryFormatted: 'Sob Consulta',
      isRent: false,
      isSale: false,
      isBoth: false,
      salePrice: 0,
      rentPrice: 0,
      saleFormatted: 'Sob Consulta',
      rentFormatted: 'Sob Consulta',
      fullDisplay: 'Sob Consulta',
      pdfDisplay: 'Sob Consulta',
      pdfTagLabel: 'VALOR'
    };
  }

  const purposeLower = (property.purpose || '').toLowerCase();
  const isLocacaoPurpose = purposeLower.includes('loca') || purposeLower.includes('alugu');
  const isVendaPurpose = purposeLower.includes('venda');
  const isBothPurpose = (isLocacaoPurpose && isVendaPurpose) || purposeLower.includes('ambos');

  const rawSale = parseNumericPrice(property.price);
  const rawRent = parseNumericPrice(property.rent_price);

  let salePrice = rawSale;
  let rentPrice = rawRent;

  // If purpose is strictly Locação and user placed the rent amount in the price field instead of rent_price:
  if (isLocacaoPurpose && !isBothPurpose) {
    if (rentPrice === 0 && salePrice > 0) {
      rentPrice = salePrice;
    }
  }

  // If purpose is strictly Venda and user placed the sale amount in the rent_price field:
  if (isVendaPurpose && !isBothPurpose) {
    if (salePrice === 0 && rentPrice > 0) {
      // If the purpose is Venda and rentPrice was filled, we treat it as rent if purpose is mixed,
      // or if user meant rent, we preserve rentPrice
    }
  }

  const saleFormatted = salePrice > 0 ? formatCurrencyBRL(salePrice) : 'Sob Consulta';
  const rentFormatted = rentPrice > 0 ? `${formatCurrencyBRL(rentPrice)} /mês` : 'Sob Consulta';

  let primaryFormatted = 'Sob Consulta';
  let fullDisplay = 'Sob Consulta';
  let pdfDisplay = 'Sob Consulta';
  let pdfTagLabel = 'VALOR';

  if (isBothPurpose) {
    if (salePrice > 0 && rentPrice > 0) {
      primaryFormatted = `${formatCurrencyBRL(salePrice)}`;
      fullDisplay = `Venda: ${formatCurrencyBRL(salePrice)} • Aluguel: ${formatCurrencyBRL(rentPrice)}/mês`;
      pdfDisplay = `${formatCurrencyBRL(salePrice)} / ${formatCurrencyBRL(rentPrice)}mês`;
      pdfTagLabel = 'VENDA / ALUGUEL';
    } else if (rentPrice > 0) {
      primaryFormatted = `${formatCurrencyBRL(rentPrice)} /mês`;
      fullDisplay = `${formatCurrencyBRL(rentPrice)} /mês`;
      pdfDisplay = `${formatCurrencyBRL(rentPrice)}/mês`;
      pdfTagLabel = 'ALUGUEL';
    } else if (salePrice > 0) {
      primaryFormatted = formatCurrencyBRL(salePrice);
      fullDisplay = formatCurrencyBRL(salePrice);
      pdfDisplay = formatCurrencyBRL(salePrice);
      pdfTagLabel = 'VENDA';
    }
  } else if (isLocacaoPurpose) {
    if (rentPrice > 0) {
      primaryFormatted = `${formatCurrencyBRL(rentPrice)} /mês`;
      fullDisplay = `${formatCurrencyBRL(rentPrice)} /mês`;
      pdfDisplay = `${formatCurrencyBRL(rentPrice)}/mês`;
      pdfTagLabel = 'ALUGUEL / MÊS';
    } else if (salePrice > 0) {
      primaryFormatted = `${formatCurrencyBRL(salePrice)} /mês`;
      fullDisplay = `${formatCurrencyBRL(salePrice)} /mês`;
      pdfDisplay = `${formatCurrencyBRL(salePrice)}/mês`;
      pdfTagLabel = 'ALUGUEL / MÊS';
    }
  } else {
    // Venda or default
    if (salePrice > 0) {
      primaryFormatted = formatCurrencyBRL(salePrice);
      fullDisplay = formatCurrencyBRL(salePrice);
      pdfDisplay = formatCurrencyBRL(salePrice);
      pdfTagLabel = 'VALOR VENDA';
    } else if (rentPrice > 0) {
      // Fallback: if user registered rent price even without setting purpose to Locação
      primaryFormatted = `${formatCurrencyBRL(rentPrice)} /mês`;
      fullDisplay = `${formatCurrencyBRL(rentPrice)} /mês`;
      pdfDisplay = `${formatCurrencyBRL(rentPrice)}/mês`;
      pdfTagLabel = 'ALUGUEL / MÊS';
    }
  }

  return {
    primaryFormatted,
    isRent: isLocacaoPurpose || (rentPrice > 0 && salePrice === 0),
    isSale: isVendaPurpose || salePrice > 0,
    isBoth: isBothPurpose || (salePrice > 0 && rentPrice > 0),
    salePrice,
    rentPrice,
    saleFormatted,
    rentFormatted,
    fullDisplay,
    pdfDisplay,
    pdfTagLabel
  };
}
