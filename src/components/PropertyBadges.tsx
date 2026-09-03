import React from 'react';
import { PropertyStatus, PropertyPurpose, PropertyCategory } from '../types';

export interface PropertyStatusBadgeProps {
  status: PropertyStatus | string;
  variant?: 'solid' | 'soft' | 'pill';
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const PropertyStatusBadge: React.FC<PropertyStatusBadgeProps> = ({
  status,
  variant = 'soft',
  size = 'sm',
  showDot = true,
  className = ''
}) => {
  const normStatus = status || 'Disponível';

  // WCAG AA Calibrated Color Styles
  const solidStyles: Record<string, { bg: string; dot: string }> = {
    'Disponível': { bg: 'bg-emerald-600 text-white border-emerald-700/60 shadow-xs', dot: 'bg-emerald-200' },
    'Reservado': { bg: 'bg-amber-400 text-slate-950 border-amber-500/80 shadow-xs font-black', dot: 'bg-slate-900' },
    'Vendido': { bg: 'bg-rose-600 text-white border-rose-700/60 shadow-xs', dot: 'bg-rose-200' },
    'Alugado': { bg: 'bg-slate-800 text-white border-slate-900 shadow-xs', dot: 'bg-slate-300' },
    'Em Negociação': { bg: 'bg-sky-600 text-white border-sky-700/60 shadow-xs', dot: 'bg-sky-200' },
    'Pendente': { bg: 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs font-black', dot: 'bg-slate-900' }
  };

  const softStyles: Record<string, { bg: string; dot: string }> = {
    'Disponível': { bg: 'bg-emerald-50 text-emerald-900 border-emerald-300/90', dot: 'bg-emerald-600' },
    'Reservado': { bg: 'bg-amber-50 text-amber-950 border-amber-300/90', dot: 'bg-amber-600' },
    'Vendido': { bg: 'bg-rose-50 text-rose-900 border-rose-300/90', dot: 'bg-rose-600' },
    'Alugado': { bg: 'bg-slate-100 text-slate-900 border-slate-300/90', dot: 'bg-slate-600' },
    'Em Negociação': { bg: 'bg-sky-50 text-sky-950 border-sky-300/90', dot: 'bg-sky-600' },
    'Pendente': { bg: 'bg-amber-50 text-amber-950 border-amber-300/90', dot: 'bg-amber-600' }
  };

  const pillStyles: Record<string, { bg: string; dot: string }> = {
    'Disponível': { bg: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30', dot: 'bg-emerald-500' },
    'Reservado': { bg: 'bg-amber-500/10 text-amber-900 border-amber-500/30', dot: 'bg-amber-500' },
    'Vendido': { bg: 'bg-rose-500/10 text-rose-900 border-rose-500/30', dot: 'bg-rose-500' },
    'Alugado': { bg: 'bg-slate-500/10 text-slate-800 border-slate-500/30', dot: 'bg-slate-500' },
    'Em Negociação': { bg: 'bg-sky-500/10 text-sky-900 border-sky-500/30', dot: 'bg-sky-500' },
    'Pendente': { bg: 'bg-amber-500/10 text-amber-900 border-amber-500/30', dot: 'bg-amber-500' }
  };

  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 rounded-md gap-1 tracking-tight',
    sm: 'text-[11px] px-2.5 py-1 rounded-lg gap-1.5 tracking-tight',
    md: 'text-xs px-3 py-1.5 rounded-xl gap-2 tracking-normal'
  };

  const dotSizes = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2'
  };

  const styleConfig =
    variant === 'solid'
      ? solidStyles[normStatus] || solidStyles['Disponível']
      : variant === 'pill'
      ? pillStyles[normStatus] || pillStyles['Disponível']
      : softStyles[normStatus] || softStyles['Disponível'];

  return (
    <span
      className={`inline-flex items-center font-extrabold uppercase border whitespace-nowrap select-none transition-colors ${
        sizeClasses[size]
      } ${styleConfig.bg} ${className}`}
    >
      {showDot && (
        <span
          className={`rounded-full shrink-0 ${dotSizes[size]} ${styleConfig.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{normStatus}</span>
    </span>
  );
};

export interface PropertyPurposeBadgeProps {
  purpose: PropertyPurpose | string;
  variant?: 'solid' | 'soft';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const PropertyPurposeBadge: React.FC<PropertyPurposeBadgeProps> = ({
  purpose,
  variant = 'solid',
  size = 'xs',
  className = ''
}) => {
  const normPurpose = purpose || 'Venda';

  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 rounded-md tracking-wider',
    sm: 'text-[11px] px-2.5 py-1 rounded-lg tracking-wider',
    md: 'text-xs px-3 py-1.5 rounded-xl tracking-wide'
  };

  const isRent = normPurpose === 'Locação' || normPurpose === 'Aluguel';
  const isBoth = normPurpose === 'Venda e Aluguel' || normPurpose === 'Venda e Locação';

  let colorClasses = '';
  if (variant === 'solid') {
    if (isBoth) {
      colorClasses = 'bg-purple-600 text-white shadow-xs';
    } else if (isRent) {
      colorClasses = 'bg-blue-600 text-white shadow-xs';
    } else {
      colorClasses = 'bg-[#F10F4D] text-white shadow-xs';
    }
  } else {
    if (isBoth) {
      colorClasses = 'bg-purple-50 text-purple-900 border border-purple-200/90';
    } else if (isRent) {
      colorClasses = 'bg-blue-50 text-blue-900 border border-blue-200/90';
    } else {
      colorClasses = 'bg-rose-50 text-rose-900 border border-rose-200/90';
    }
  }

  return (
    <span
      className={`inline-flex items-center font-extrabold uppercase whitespace-nowrap select-none ${
        sizeClasses[size]
      } ${colorClasses} ${className}`}
    >
      {normPurpose}
    </span>
  );
};

export interface PropertyCategoryBadgeProps {
  category: PropertyCategory | string;
  variant?: 'dark-glass' | 'soft' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const PropertyCategoryBadge: React.FC<PropertyCategoryBadgeProps> = ({
  category,
  variant = 'soft',
  size = 'xs',
  className = ''
}) => {
  const normCategory = category || 'Residencial';

  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 rounded-md font-bold',
    sm: 'text-[11px] px-2.5 py-1 rounded-lg font-bold',
    md: 'text-xs px-3 py-1.5 rounded-xl font-bold'
  };

  let colorClasses = '';
  if (variant === 'dark-glass') {
    colorClasses = 'bg-slate-900/80 text-slate-100 backdrop-blur-xs border border-white/20 shadow-xs';
  } else if (variant === 'outline') {
    colorClasses = 'bg-white text-slate-700 border border-slate-300';
  } else {
    colorClasses = 'bg-slate-100 text-slate-800 border border-slate-200/90';
  }

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap select-none ${
        sizeClasses[size]
      } ${colorClasses} ${className}`}
    >
      {normCategory}
    </span>
  );
};
