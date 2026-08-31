import React from 'react';
import { PostTemplateProps } from './types';
import { BaseTemplateLayout } from './BaseTemplateLayout';
import { formatCurrencyBRL } from '../../lib/priceUtils';

export const CarrosselCapaTemplate: React.FC<PostTemplateProps> = ({
  property,
  companySettings,
  photoUrl,
  width,
  height
}) => {
  const isRent = property.purpose === 'Locação' || property.purpose === 'Venda e Locação';
  const price = isRent
    ? formatCurrencyBRL(property.rent_price || property.price || 0)
    : formatCurrencyBRL(property.price || 0);
  const neighborhood = property.neighborhood || 'Manaus';
  const city = property.city || 'Manaus';
  const category = property.category || 'Imóvel';
  const code = property.code || property.id?.slice(0, 6) || 'LOPES';
  const bedrooms = property.bedrooms || 0;
  const area = property.total_area || property.built_area || 0;

  return (
    <BaseTemplateLayout
      width={width}
      height={height}
      companySettings={companySettings}
      photoUrl={photoUrl}
      statusBadge="TOUR COMPLETO"
      statusBadgeColor="#F10F4D"
    >
      <div className="space-y-4">
        {/* Floating Neighborhood Badge */}
        <div className="flex items-center justify-between">
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

          <div
            className="px-3 py-1 rounded-full text-[11px] font-bold text-white"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            Cód: {code}
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
          {/* Card Category Tag */}
          <div className="flex items-center justify-between">
            <span
              className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
              style={{
                backgroundColor: '#FFF1F4',
                color: '#F10F4D',
                border: '1px solid #FFE4E8'
              }}
            >
              {category} • {isRent ? 'Locação' : 'Venda'}
            </span>

            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Lopes Manaus
            </span>
          </div>

          {/* Large Editorial Title */}
          <h1
            className="text-3xl font-black text-slate-900 leading-snug line-clamp-2"
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
                {isRent ? 'Locação Mensal' : 'Valor'}
              </span>
              <span
                className="text-2xl font-black tracking-tight"
                style={{ color: '#F10F4D', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
              >
                {price}
                {isRent && <span className="text-xs text-slate-500 font-bold ml-1">/mês</span>}
              </span>
            </div>

            {/* Quick Specs Pills */}
            <div className="flex items-center gap-2">
              {bedrooms > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs">
                  {bedrooms} Qts
                </div>
              )}
              {area > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs">
                  {area}m²
                </div>
              )}
            </div>
          </div>

          {/* Swipe Indicator Call to Action */}
          <div
            className="py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-white font-black text-xs tracking-wider uppercase shadow-md transition"
            style={{
              backgroundColor: '#F10F4D'
            }}
          >
            <span>Deslize para ver todas as fotos</span>
            <span className="text-base leading-none">➡️</span>
          </div>
        </div>
      </div>
    </BaseTemplateLayout>
  );
};

export default CarrosselCapaTemplate;
