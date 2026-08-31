import React from 'react';
import { PostTemplateProps } from './types';
import { BaseTemplateLayout } from './BaseTemplateLayout';
import { formatCurrencyBRL } from '../../lib/priceUtils';

export const FeedVendaTemplate: React.FC<PostTemplateProps> = ({
  property,
  companySettings,
  photoUrl,
  width,
  height
}) => {
  const salePrice = formatCurrencyBRL(property.price || 0);
  const neighborhood = property.neighborhood || 'Manaus';
  const city = property.city || 'Manaus';
  const category = property.category || 'Imóvel';
  const code = property.code || property.id?.slice(0, 6) || 'LOPES';
  const bedrooms = property.bedrooms || 0;
  const suites = property.suites || 0;
  const bathrooms = property.bathrooms || 0;
  const parkingSpaces = property.parking_spaces || 0;
  const area = property.total_area || property.built_area || 0;

  return (
    <BaseTemplateLayout
      width={width}
      height={height}
      companySettings={companySettings}
      photoUrl={photoUrl}
      statusBadge="VENDA EXCLUSIVA"
      statusBadgeColor="#F10F4D"
    >
      <div className="space-y-3">
        {/* Floating Location Badge on bottom of photo area */}
        <div className="flex items-center gap-2">
          <div
            className="px-4 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-black uppercase tracking-wider"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            <span className="text-[#F10F4D]">📍</span>
            <span>{neighborhood}, {city}</span>
          </div>
        </div>

        {/* High-End White Floating Information Card */}
        <div
          className="rounded-3xl p-6 space-y-4"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}
        >
          {/* Card Top Row: Category + Property Code */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                style={{
                  backgroundColor: '#FFF1F4',
                  color: '#F10F4D',
                  border: '1px solid #FFE4E8'
                }}
              >
                {category}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                Cód: <span className="text-slate-700 font-extrabold">{code}</span>
              </span>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Lopes Manaus
            </div>
          </div>

          {/* Property Title */}
          <h1
            className="text-2xl font-black text-slate-900 leading-snug line-clamp-2"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
          >
            {property.title || `${category} em ${neighborhood}`}
          </h1>

          {/* Price Highlight Banner */}
          <div
            className="p-4 rounded-2xl flex items-center justify-between"
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0'
            }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                Valor de Venda
              </span>
              <span
                className="text-3xl font-black tracking-tight"
                style={{ color: '#F10F4D', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
              >
                {salePrice}
              </span>
            </div>

            {property.condo_fee ? (
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Condomínio
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {formatCurrencyBRL(property.condo_fee)}/mês
                </span>
              </div>
            ) : (
              <div className="text-right">
                <span
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: '#F1F5F9', color: '#475569' }}
                >
                  Pronto para Morar
                </span>
              </div>
            )}
          </div>

          {/* 4 Metrics Specification Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {/* Area */}
            <div
              className="p-2.5 rounded-xl flex flex-col justify-center items-center"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Área</span>
              <span className="text-sm font-black text-slate-900 mt-0.5">{area > 0 ? `${area}m²` : '-'}</span>
            </div>

            {/* Bedrooms */}
            <div
              className="p-2.5 rounded-xl flex flex-col justify-center items-center"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Quartos</span>
              <span className="text-sm font-black text-slate-900 mt-0.5">
                {bedrooms > 0 ? (suites > 0 ? `${bedrooms} (${suites}s)` : `${bedrooms}`) : '-'}
              </span>
            </div>

            {/* Bathrooms */}
            <div
              className="p-2.5 rounded-xl flex flex-col justify-center items-center"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Banheiros</span>
              <span className="text-sm font-black text-slate-900 mt-0.5">{bathrooms > 0 ? `${bathrooms}` : '-'}</span>
            </div>

            {/* Parking */}
            <div
              className="p-2.5 rounded-xl flex flex-col justify-center items-center"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Vagas</span>
              <span className="text-sm font-black text-slate-900 mt-0.5">{parkingSpaces > 0 ? `${parkingSpaces}` : '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </BaseTemplateLayout>
  );
};

export default FeedVendaTemplate;
