import React from 'react';
import { Property, User } from '../types';
import { Bed, Bath, Car, Maximize, MapPin, Share2, Eye, Edit3, Trash2, MessageCircleCode } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  captador?: User;
  onView: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onShareWhatsApp?: (property: Property) => void;
  canEdit?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  captador,
  onView,
  onEdit,
  onDelete,
  onShareWhatsApp,
  canEdit = false
}) => {
  const formatPrice = (value: number) => {
    if (!value || value === 0) return 'Sob Consulta';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const statusColors: Record<string, string> = {
    'Disponível': 'bg-emerald-600 text-white font-black shadow-md border-emerald-700',
    'Reservado': 'bg-amber-500 text-slate-950 font-black shadow-md border-amber-600',
    'Vendido': 'bg-rose-600 text-white font-black shadow-md border-rose-700',
    'Alugado': 'bg-sky-600 text-white font-black shadow-md border-sky-700'
  };

  const defaultImage = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group">
      
      {/* Property Image Container */}
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onView(property)}>
        <img
          src={property.main_image || property.images[0] || defaultImage}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Overlay Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-80" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="bg-slate-900/90 text-white font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md shadow-md border border-slate-700">
            {property.code}
          </span>
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
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Valor</p>
            <p className="text-base font-extrabold text-[#F10F4D]">
              {property.purpose.includes('Locação') && property.rent_price
                ? `${formatPrice(property.rent_price)} /mês`
                : formatPrice(property.price)}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onView(property)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Ver Detalhes do Imóvel"
            >
              <Eye className="w-4 h-4" />
            </button>

            {onShareWhatsApp && (
              <button
                onClick={() => onShareWhatsApp(property)}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                title="Enviar por WhatsApp"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(property)}
                className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition"
                title="Editar Imóvel"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {canEdit && onDelete && (
              <button
                onClick={() => onDelete(property)}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
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
