import { Property } from '../types';

/**
 * Safely converts any numerical or string input into a valid integer/float number.
 * Correctly handles Brazilian currency formats (e.g., "3.500", "3.500,00", "3500,00", "R$ 3.500")
 * as well as standard numbers and US formats.
 */
export function parseNumericPrice(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let s = String(val).trim();
  // Remove currency symbols (R$), letters, extra spaces
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return 0;

  // Case 1: contains both '.' and ',' (e.g. 1.250.000,00 or 1,250,000.00)
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // Brazilian format: 1.500,00 -> remove dots, replace comma with dot
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,500.00 -> remove commas
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // Only commas: e.g. "3500,00" or "3,500"
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal comma: 3500,50 -> 3500.50
      s = s.replace(',', '.');
    } else {
      // Thousand separator comma: 3,500 -> 3500
      s = s.replace(/,/g, '');
    }
  } else if (s.includes('.')) {
    // Only dots: e.g. "3.500" (Brazilian thousand separator) or "1.250.000" or "3500.00"
    const parts = s.split('.');
    if (parts.length > 2) {
      // Multiple dots: 1.250.000 -> 1250000
      s = s.replace(/\./g, '');
    } else if (parts.length === 2) {
      // Single dot: e.g. "3.500" (3 digits after dot -> Brazilian thousand separator!)
      if (parts[1].length === 3) {
        s = s.replace('.', '');
      } else {
        // Decimal dot: "3500.50" -> keep as is
      }
    }
  }

  const parsed = parseFloat(s);
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
      salePrice = 0;
    }
  }

  // If purpose is strictly Venda and user placed the sale amount in the rent_price field:
  if (isVendaPurpose && !isBothPurpose) {
    if (salePrice === 0 && rentPrice > 0) {
      salePrice = rentPrice;
      rentPrice = 0;
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
