import React from 'react';
import { Property, User } from '../types';
import { Bed, Bath, Car, Maximize, MapPin, Share2, FileText, ExternalLink, Hash } from 'lucide-react';
import { getPropertyMainImage, handleImageError } from '../lib/imageUtils';
import { getPropertyPriceInfo } from '../lib/priceUtils';
import { PropertyStatusBadge, PropertyPurposeBadge, PropertyCategoryBadge } from './PropertyBadges';

interface PropertyCardProps {
  property: Property;
  captador?: User;
  onView: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onShareWhatsApp?: (property: Property) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  hidePerMonth?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onView,
  onShareWhatsApp,
  hidePerMonth = false
}) => {
  const priceInfo = getPropertyPriceInfo(property);
  const displayPrimaryPrice = hidePerMonth
    ? priceInfo.primaryFormatted.replace(/\s*\/\s*mês/gi, '').replace(/\/mês/gi, '').trim()
    : priceInfo.primaryFormatted;
  const displayRentPrice = hidePerMonth
    ? priceInfo.rentFormatted.replace(/\s*\/\s*mês/gi, '').replace(/\/mês/gi, '').trim()
    : priceInfo.rentFormatted;

  const publicSiteUrl = property.official_site_url || `https://manaus.lopes.com.br/imovel/${property.code}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group">

      {/* Property Image Container */}
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onView(property)}>
        <img
          src={getPropertyMainImage(property)}
          alt={property.title}
          onError={handleImageError}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Overlay Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-80" />

        {/* Top Badges: Status + Code */}
        <div className="absolute top-3 right-3 left-3 flex items-center justify-between pointer-events-none">
          <span className="bg-slate-900/80 text-white text-[10px] font-mono font-bold px-2 py-1 rounded-lg backdrop-blur border border-slate-700 flex items-center gap-1">
            <Hash className="w-3 h-3 text-[#F10F4D]" />
            {property.code}
          </span>
          <PropertyStatusBadge status={property.status} variant="solid" size="sm" />
        </div>

        {/* Purpose & Category Badge */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
          <div className="flex items-center space-x-1.5">
            <PropertyPurposeBadge purpose={property.purpose} variant="solid" size="xs" />
            <PropertyCategoryBadge category={property.category} variant="dark-glass" size="xs" />
          </div>
        </div>
      </div>

      {/* Property Details Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">

        {/* Title & Neighborhood */}
        <div>
          <div className="flex items-center text-slate-500 text-xs font-medium space-x-1 mb-1">
            <MapPin className="w-3.5 h-3.5 text-[#F10F4D] shrink-0" />
            <span className="truncate">{property.neighborhood}, {property.city}</span>
          </div>

          <h3
            onClick={() => onView(property)}
            className="text-slate-900 font-bold text-sm leading-snug line-clamp-2 hover:text-[#F10F4D] cursor-pointer transition"
          >
            {property.title}
          </h3>
        </div>

        {/* Key Specifications Grid */}
        <div className="grid grid-cols-4 gap-1 py-2 px-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 text-xs font-medium text-center">
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-400 font-normal">Área</span>
            <span className="font-bold text-slate-800 text-xs flex items-center space-x-0.5">
              <Maximize className="w-3 h-3 text-[#F10F4D] mr-0.5" />
              {property.total_area || property.built_area}m²
            </span>
          </div>

          <div className="flex flex-col items-center justify-center border-l border-slate-200">
            <span className="text-[10px] text-slate-400 font-normal">Quartos</span>
            <span className="font-bold text-slate-800 text-xs flex items-center space-x-0.5">
              <Bed className="w-3.5 h-3.5 text-[#F10F4D] mr-0.5" />
              {property.bedrooms}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center border-l border-slate-200">
            <span className="text-[10px] text-slate-400 font-normal">Banheiros</span>
            <span className="font-bold text-slate-800 text-xs flex items-center space-x-0.5">
              <Bath className="w-3.5 h-3.5 text-[#F10F4D] mr-0.5" />
              {property.bathrooms}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center border-l border-slate-200">
            <span className="text-[10px] text-slate-400 font-normal">Vagas</span>
            <span className="font-bold text-slate-800 text-xs flex items-center space-x-0.5">
              <Car className="w-3.5 h-3.5 text-[#F10F4D] mr-0.5" />
              {property.parking_spaces}
            </span>
          </div>
        </div>

        {/* Price Row */}
        <div className="pt-2.5 border-t border-slate-100">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 truncate">
            {priceInfo.isBoth ? 'Venda / Aluguel' : (priceInfo.isRent ? 'Aluguel' : 'Valor')}
          </p>
          <p className="text-sm sm:text-base font-extrabold text-[#F10F4D] truncate">
            {displayPrimaryPrice}
          </p>
          {priceInfo.isBoth && priceInfo.rentPrice > 0 && priceInfo.salePrice > 0 && (
            <p className="text-[10px] font-bold text-slate-600 truncate">
              Locação: {displayRentPrice}
            </p>
          )}
        </div>

        {/* Action Buttons Row: Ficha Completa / Site / Compartilhar */}
        <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onView(property)}
            className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-[#F10F4D] hover:bg-[#d40d43] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:shadow transition transform active:scale-95 cursor-pointer"
            title="Ver Ficha Completa do Imóvel"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ficha Completa</span>
          </button>

          <a
            href={publicSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer flex items-center justify-center shrink-0"
            title="Ver no Site Oficial da Lopes"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {onShareWhatsApp && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShareWhatsApp(property);
              }}
              className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition cursor-pointer flex items-center justify-center shrink-0"
              title="Enviar por WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
