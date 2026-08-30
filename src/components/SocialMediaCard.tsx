import React from 'react';
import { Property, CompanySettings } from '../types';
import { getPropertyPriceInfo } from '../lib/priceUtils';
import { iconDataUri } from '../lib/icons';

interface SocialMediaCardProps {
  property: Property;
  companySettings: CompanySettings;
  photoUrl: string;
  width: number;
  height: number;
}

const RED = '#F10F4D';
const SLATE_900 = '#0F172A';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_50 = '#F8FAFC';
const SLATE_200 = '#E2E8F0';
const ROSE_50 = '#FFF1F2';

const Icon: React.FC<{ name: Parameters<typeof iconDataUri>[0]; color: string; size: number; className?: string }> = ({ name, color, size, className }) => (
  <img src={iconDataUri(name, color, size * 2)} width={size} height={size} className={className} alt="" />
);

/**
 * The actual visual design of the social media post, built as real HTML/CSS (the same way every
 * page in this app is built) instead of hand-drawn canvas shapes. Real CSS (flexbox, mt-auto,
 * rounded corners, shadows) gets alignment and "footer sticks to the bottom no matter the
 * content height" for free, which is why this reads as dramatically more polished than the
 * canvas version did.
 *
 * All colors here are plain hex/rgba inline styles rather than Tailwind's named color classes
 * (slate-400, rose-50, etc.) — Tailwind v4's default palette compiles those to modern oklab()
 * CSS color functions, which html2canvas's renderer can't parse and fails on.
 *
 * Icons are rendered as real <img> data-URI elements (see lib/icons.ts) rather than inline SVG
 * React components — html2canvas has to internally convert inline <svg> to an image before it
 * can capture it, and that conversion has an unreliable async race that silently dropped icons
 * from the final PNG. A real <img> from the start sidesteps that conversion entirely.
 *
 * This component is mounted off-screen and captured to a PNG with html2canvas — see
 * socialMediaGenerator.ts.
 */
export const SocialMediaCard: React.FC<SocialMediaCardProps> = ({ property, companySettings, photoUrl, width, height }) => {
  const priceInfo = getPropertyPriceInfo(property);
  const purposeText = (property.purpose || 'Venda').toUpperCase();
  const areaValue = property.built_area || property.total_area;
  const photoH = Math.round(height * 0.4);

  const features: { icon: Parameters<typeof iconDataUri>[0]; value: string; label: string }[] = [
    { icon: 'bed', value: String(property.bedrooms || '-'), label: 'QUARTOS' },
    { icon: 'bath', value: String(property.bathrooms || '-'), label: 'BANHEIROS' },
    { icon: 'car', value: String(property.parking_spaces || '-'), label: 'VAGAS' },
    { icon: 'maximize', value: areaValue ? `${areaValue}m²` : '-', label: 'ÁREA' }
  ];

  return (
    <div
      style={{ width, height, fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", backgroundColor: '#FFFFFF', color: SLATE_900 }}
      className="relative flex flex-col overflow-hidden"
    >
      <div className="relative shrink-0" style={{ height: photoH }}>
        <img src={photoUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />

        {/* Header banner */}
        <div
          className="absolute top-0 left-0 flex items-center gap-3 px-7 py-4"
          style={{ backgroundColor: RED, borderBottomRightRadius: 28 }}
        >
          <svg viewBox="0 0 100 100" className="w-9 h-9 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="75" cy="28" r="18" fill="#FFFFFF" />
            <path d="M 46 92 C 25 74 2 52 2 30 C 2 12 16 0 34 0 C 44 0 52 5 57 14 C 52 23 50 33 53 43 C 57 55 67 62 76 62 C 68 76 57 86 46 92 Z" fill="#FFFFFF" />
          </svg>
          <div>
            <div style={{ color: '#FFFFFF' }} className="font-black text-2xl leading-none">Lopes</div>
            <div style={{ color: 'rgba(255,255,255,0.9)' }} className="font-bold text-xs tracking-wide mt-0.5">MANAUS</div>
          </div>
        </div>

        {/* Purpose badge */}
        <div
          className="absolute top-5 right-0 flex items-center gap-2 pl-5 pr-7 py-3"
          style={{ backgroundColor: RED, borderTopLeftRadius: 9999, borderBottomLeftRadius: 9999, boxShadow: '0 10px 20px rgba(0,0,0,0.18)' }}
        >
          <Icon name="house" color="#FFFFFF" size={22} />
          <span style={{ color: '#FFFFFF' }} className="font-black text-lg">{purposeText}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-10 pt-9">
        {/* Category icon + title */}
        <div className="flex items-center gap-4 mb-7">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: RED, boxShadow: '0 10px 20px rgba(136,19,55,0.25)' }}
          >
            <Icon name="house" color="#FFFFFF" size={28} />
          </div>
          <div className="min-w-0">
            <div style={{ color: SLATE_900 }} className="font-black text-3xl leading-tight truncate">{(property.category || 'Imóvel').toUpperCase()}</div>
            <div style={{ color: SLATE_500 }} className="font-semibold text-lg truncate">{property.neighborhood} — {property.city}</div>
          </div>
        </div>

        {/* Info boxes */}
        <div className="flex gap-3 mb-8">
          <div className="flex-1 min-w-0 rounded-2xl p-4" style={{ backgroundColor: SLATE_50, border: `1px solid ${SLATE_200}` }}>
            <Icon name="mapPin" color={RED} size={22} className="mb-2" />
            <div style={{ color: SLATE_400 }} className="text-[11px] font-bold uppercase tracking-wide">Localização</div>
            <div style={{ color: SLATE_900 }} className="font-black text-lg truncate">{property.neighborhood}</div>
          </div>
          {areaValue && (
            <div className="flex-1 min-w-0 rounded-2xl p-4" style={{ backgroundColor: SLATE_50, border: `1px solid ${SLATE_200}` }}>
              <Icon name="maximize" color={RED} size={22} className="mb-2" />
              <div style={{ color: SLATE_400 }} className="text-[11px] font-bold uppercase tracking-wide">Área</div>
              <div style={{ color: SLATE_900 }} className="font-black text-lg">{areaValue}m²</div>
            </div>
          )}
          <div
            className="flex-[1.3] min-w-0 rounded-2xl p-4 flex flex-col justify-between"
            style={{ backgroundColor: RED, boxShadow: '0 10px 20px rgba(136,19,55,0.25)' }}
          >
            <div style={{ color: '#FFFFFF' }} className="font-black text-2xl leading-tight">{priceInfo.primaryFormatted}</div>
            <div style={{ color: 'rgba(255,255,255,0.9)' }} className="font-bold text-xs uppercase tracking-wide">{purposeText}</div>
          </div>
        </div>

        {/* Características label */}
        <div
          className="inline-block self-start font-black text-sm px-5 py-2.5 rounded-lg mb-8 tracking-wide"
          style={{ backgroundColor: RED, color: '#FFFFFF' }}
        >
          CARACTERÍSTICAS
        </div>

        {/* Feature icons row */}
        <div className="flex justify-between text-center">
          {features.map((f, i) => (
            <div key={i} style={{ width: '23%' }}>
              <Icon name={f.icon} color={RED} size={30} className="mx-auto mb-2" />
              <div style={{ color: SLATE_900 }} className="font-black text-xl">{f.value}</div>
              <div style={{ color: SLATE_400 }} className="text-[10px] font-bold uppercase tracking-wide">{f.label}</div>
            </div>
          ))}
        </div>

        {/* Footer band — mt-auto sticks it to the bottom of the flex container no matter how
            tall the content above is, filling any remaining space as a deliberate design
            element instead of leaving dead white space. */}
        <div className="mt-auto -mx-10 px-10 py-10 flex flex-col items-center" style={{ backgroundColor: ROSE_50 }}>
          <svg viewBox="0 0 100 100" className="w-11 h-11 mb-2" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="75" cy="28" r="18" fill={RED} />
            <path d="M 46 92 C 25 74 2 52 2 30 C 2 12 16 0 34 0 C 44 0 52 5 57 14 C 52 23 50 33 53 43 C 57 55 67 62 76 62 C 68 76 57 86 46 92 Z" fill={RED} />
          </svg>
          <div style={{ color: SLATE_900 }} className="font-black text-xl">{companySettings.company_name || 'Lopes Manaus'}</div>
        </div>
      </div>
    </div>
  );
};
