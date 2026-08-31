import React from 'react';
import { CompanySettings } from '../../types';

interface BaseTemplateLayoutProps {
  width: number;
  height: number;
  companySettings: CompanySettings;
  photoUrl: string;
  statusBadge?: string;
  statusBadgeColor?: string;
  children: React.ReactNode;
  className?: string;
  hideFooter?: boolean;
}

export const LopesHeartIcon: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-8 h-8',
  color = '#F10F4D'
}) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Overlapping circle head */}
    <circle cx="75" cy="28" r="18" fill={color} />
    {/* Heart body */}
    <path
      d="M 46 92 C 25 74 2 52 2 30 C 2 12 16 0 34 0 C 44 0 52 5 57 14 C 52 23 50 33 53 43 C 57 55 67 62 76 62 C 68 76 57 86 46 92 Z"
      fill={color}
    />
  </svg>
);

export const LopesBrandLockup: React.FC<{ companySettings: CompanySettings; isDark?: boolean }> = ({
  companySettings,
  isDark = false
}) => {
  const companyName = companySettings.company_name || 'Lopes';
  const unitName = companySettings.unit_name || 'Manaus';
  const customLogo = companySettings.logo_url;

  // If user provided a specific valid custom logo, render image with fallback
  if (customLogo && customLogo.trim() !== '' && !customLogo.includes('default') && !customLogo.includes('placeholder')) {
    return (
      <div className="flex items-center gap-3">
        <img
          src={customLogo}
          alt={companyName}
          crossOrigin="anonymous"
          className="h-10 w-auto max-w-[220px] object-contain"
          onError={(e) => {
            // If image fails, replace with default vector lockup
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Official Lopes Vector Brand Lockup (100% Vector, Zero CORS risk, crisp at any resolution)
  return (
    <div className="flex items-center gap-2.5">
      <LopesHeartIcon className="w-8 h-8 shrink-0" color="#F10F4D" />
      <div className="flex flex-col leading-none">
        <span
          className="text-xl font-black tracking-tight"
          style={{ color: isDark ? '#FFFFFF' : '#0F172A', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        >
          {companyName.toUpperCase().includes('LOPES') ? 'LOPES' : companyName}
        </span>
        <span
          className="text-[10px] font-extrabold tracking-[0.22em] uppercase"
          style={{ color: '#F10F4D', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        >
          {unitName}
        </span>
      </div>
    </div>
  );
};

export const BaseTemplateLayout: React.FC<BaseTemplateLayoutProps> = ({
  width,
  height,
  companySettings,
  photoUrl,
  statusBadge = 'OPORTUNIDADE',
  statusBadgeColor = '#F10F4D',
  children,
  className = '',
  hideFooter = false
}) => {
  const phoneDisplay = companySettings.whatsapp || companySettings.phone || '(92) 98111-0000';
  const instagramDisplay = companySettings.instagram || '@lopesmanaus';

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: '#0F172A',
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
      }}
      className={`relative overflow-hidden flex flex-col justify-between select-none ${className}`}
    >
      {/* 1. Full-Resolution Background Photo with Minimal, Non-Intrusive Gradient */}
      <div className="absolute inset-0 z-0">
        <img
          src={photoUrl}
          alt="Imóvel"
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
        />
        {/* Soft top gradient for header readability + subtle bottom fade */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(15, 23, 42, 0.65) 0%, rgba(15, 23, 42, 0.05) 25%, rgba(15, 23, 42, 0.15) 60%, rgba(15, 23, 42, 0.85) 100%)'
          }}
        />
      </div>

      {/* 2. Top Luxury Brand Header Bar */}
      <div className="relative z-10 p-8 flex items-center justify-between">
        {/* Brand Badge in Clean Frosted Pill */}
        <div
          className="px-5 py-2.5 rounded-2xl flex items-center shadow-lg"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)'
          }}
        >
          <LopesBrandLockup companySettings={companySettings} isDark={false} />
        </div>

        {/* Status Pill */}
        {statusBadge && (
          <div
            className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5"
            style={{
              backgroundColor: statusBadgeColor,
              color: '#FFFFFF',
              boxShadow: '0 8px 20px -4px rgba(241, 15, 77, 0.4)'
            }}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>{statusBadge}</span>
          </div>
        )}
      </div>

      {/* 3. Main Content / Property Info Card Container */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-8 min-h-0">
        {children}
      </div>

      {/* 4. Professional Lopes Agency Footer */}
      {!hideFooter && (
        <div
          className="relative z-10 px-8 py-4 flex items-center justify-between text-xs font-bold"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF'
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[#F10F4D]">WhatsApp:</span>
            <span className="text-white font-semibold">{phoneDisplay}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Instagram:</span>
            <span className="text-[#F10F4D] font-extrabold">{instagramDisplay}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseTemplateLayout;
