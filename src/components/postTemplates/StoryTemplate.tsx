import React from 'react';
import { PostTemplateProps } from './types';
import { BaseTemplateLayout } from './BaseTemplateLayout';
import { formatCurrencyBRL } from '../../lib/priceUtils';

export const StoryTemplate: React.FC<PostTemplateProps> = ({
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
      statusBadge={isRent ? 'DISPONÍVEL PARA ALUGUEL' : 'OPORTUNIDADE EXCLUSIVA'}
      statusBadgeColor={isRent ? '#059669' : '#F10F4D'}
      className="pb-16"
    >
      <div className="space-y-4">
        {/* Floating Location Badge */}
        <div className="flex items-center justify-between">
          <div
            className="px-5 py-2 rounded-full flex items-center gap-2 text-sm font-black uppercase tracking-wider"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
            }}
          >
            <span className="text-[#F10F4D]">📍</span>
            <span>{neighborhood}, {city}</span>
          </div>

          <div
            className="px-4 py-2 rounded-full text-xs font-bold text-slate-200"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            Cód: <span className="text-white font-extrabold">{code}</span>
          </div>
        </div>

        {/* High-End White Floating Information Card */}
        <div
          className="rounded-3xl p-8 space-y-6"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(226, 232, 240, 0.9)'
          }}
        >
          {/* Card Category Tag */}
          <div className="flex items-center justify-between">
            <span
              className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest"
              style={{
                backgroundColor: isRent ? '#ECFDF5' : '#FFF1F4',
                color: isRent ? '#059669' : '#F10F4D',
                border: isRent ? '1px solid #A7F3D0' : '1px solid #FFE4E8'
              }}
            >
              {category} • {isRent ? 'Locação' : 'Venda'}
            </span>

            <span className="text-xs font-black tracking-widest text-[#F10F4D] uppercase">
              Lopes Manaus
            </span>
          </div>

          {/* Property Title */}
          <h1
            className="text-3xl font-black text-slate-900 leading-snug line-clamp-2"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
          >
            {property.title || `${category} em ${neighborhood}`}
          </h1>

          {/* Price Highlight Banner */}
          <div
            className="p-5 rounded-2xl flex items-center justify-between"
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0'
            }}
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1">
                {isRent ? 'Valor da Locação Mensal' : 'Valor de Venda'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-4xl font-black tracking-tight"
                  style={{
                    color: isRent ? '#059669' : '#F10F4D',
                    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
                  }}
                >
                  {price}
                </span>
                {isRent && <span className="text-sm font-bold text-slate-500">/mês</span>}
              </div>
            </div>

            {property.condo_fee ? (
              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Condomínio
                </span>
                <span className="text-sm font-black text-slate-700">
                  {formatCurrencyBRL(property.condo_fee)}
                </span>
              </div>
            ) : null}
          </div>

          {/* 4 Metrics Specification Grid */}
          <div className="grid grid-cols-4 gap-3 text-center">
            {/* Area */}
            <div
              className="p-3.5 rounded-2xl flex flex-col justify-center items-center"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Área</span>
              <span className="text-base font-black text-slate-900 mt-1">{area > 0 ? `${area}m²` : '-'}</span>
            </div>

            {/* Bedrooms */}
            <div
              className="p-3.5 rounded-2xl flex flex-col justify-center items-center"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quartos</span>
              <span className="text-base font-black text-slate-900 mt-1">
                {bedrooms > 0 ? (suites > 0 ? `${bedrooms} (${suites}s)` : `${bedrooms}`) : '-'}
              </span>
            </div>

            {/* Bathrooms */}
            <div
              className="p-3.5 rounded-2xl flex flex-col justify-center items-center"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Banheiros</span>
              <span className="text-base font-black text-slate-900 mt-1">{bathrooms > 0 ? `${bathrooms}` : '-'}</span>
            </div>

            {/* Parking */}
            <div
              className="p-3.5 rounded-2xl flex flex-col justify-center items-center"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vagas</span>
              <span className="text-base font-black text-slate-900 mt-1">{parkingSpaces > 0 ? `${parkingSpaces}` : '-'}</span>
            </div>
          </div>

          {/* CTA Banner for Story */}
          <div
            className="py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-white font-extrabold text-xs tracking-wider uppercase shadow-md"
            style={{
              backgroundColor: '#F10F4D'
            }}
          >
            <span>📲</span>
            <span>Responda este Story para agendar visita exclusiva</span>
          </div>
        </div>
      </div>
    </BaseTemplateLayout>
  );
};

export default StoryTemplate;
