import React from 'react';
import { Property, User } from '../types';
import { Bed, Bath, Car, Maximize, MapPin, Share2, Eye, Edit3, Trash2, Sparkles } from 'lucide-react';
import { getPropertyMainImage, handleImageError } from '../lib/imageUtils';
import { getPropertyPriceInfo } from '../lib/priceUtils';

interface PropertyCardProps {
  property: Property;
  captador?: User;
  onView: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onShareWhatsApp?: (property: Property) => void;
  onGenerateSocialMedia?: (property: Property) => void;
  onGenerateAiPost?: (property: Property) => void;
  canEdit?: boolean;
  hidePerMonth?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  captador,
  onView,
  onEdit,
  onDelete,
  onShareWhatsApp,
  onGenerateSocialMedia,
  onGenerateAiPost,
  canEdit = false,
  hidePerMonth = false
}) => {
  const priceInfo = getPropertyPriceInfo(property);
  const displayPrimaryPrice = hidePerMonth
    ? priceInfo.primaryFormatted.replace(/\s*\/\s*mês/gi, '').replace(/\/mês/gi, '').trim()
    : priceInfo.primaryFormatted;
  const displayRentPrice = hidePerMonth
    ? priceInfo.rentFormatted.replace(/\s*\/\s*mês/gi, '').replace(/\/mês/gi, '').trim()
    : priceInfo.rentFormatted;

  const handleOpenAiPostModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onGenerateAiPost) {
      onGenerateAiPost(property);
    }
  };

  const statusColors: Record<string, string> = {
    'Disponível': 'bg-emerald-600 text-white font-black shadow-md border-emerald-700',
    'Reservado': 'bg-amber-500 text-slate-950 font-black shadow-md border-amber-600',
    'Vendido': 'bg-rose-600 text-white font-black shadow-md border-rose-700',
    'Alugado': 'bg-zinc-800 text-white font-black shadow-md border-zinc-900'
  };

  const defaultImage = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80';

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

        {/* Top Badges */}
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md border shadow-md ${statusColors[property.status] || 'bg-slate-100 text-slate-800'}`}>
            {property.status}
          </span>
        </div>

        {/* Purpose & Category Badge */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
          <div className="flex items-center space-x-1.5">
            <span className="bg-[#F10F4D] text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shadow">
              {property.purpose}
            </span>
            <span className="bg-slate-900/80 text-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded backdrop-blur border border-slate-700">
              {property.category}
            </span>
          </div>

          {property.views !== undefined && property.views > 0 && (
            <span className="bg-slate-900/80 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur border border-slate-700 flex items-center space-x-1">
              <Eye className="w-3 h-3 text-rose-400" />
              <span>{property.views} visualizações</span>
            </span>
          )}
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

        {/* Price & Action Row */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {priceInfo.isBoth ? 'Venda / Aluguel' : (priceInfo.isRent ? 'Aluguel' : 'Valor')}
            </p>
            <p className="text-base font-extrabold text-[#F10F4D]">
              {displayPrimaryPrice}
            </p>
            {priceInfo.isBoth && priceInfo.rentPrice > 0 && priceInfo.salePrice > 0 && (
              <p className="text-[10px] font-bold text-slate-600">
                Locação: {displayRentPrice}
              </p>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
            {(onGenerateAiPost || onGenerateSocialMedia) && (
              <button
                type="button"
                id={`btn-gerar-post-ia-card-${property.id || property.code || 'item'}`}
                onClick={handleOpenAiPostModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#F10F4D] via-[#d40d43] to-[#99002B] hover:brightness-110 text-white text-xs font-bold shadow-sm hover:shadow transition transform active:scale-95 cursor-pointer"
                title="Gerar Post para Redes Sociais"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Gerar Post</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onView(property);
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Ver Detalhes do Imóvel"
            >
              <Eye className="w-4 h-4" />
            </button>

            {onShareWhatsApp && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShareWhatsApp(property);
                }}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition cursor-pointer"
                title="Enviar por WhatsApp"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {canEdit && onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(property);
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
                title="Editar Imóvel"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {canEdit && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(property);
                }}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                title="Excluir Imóvel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

