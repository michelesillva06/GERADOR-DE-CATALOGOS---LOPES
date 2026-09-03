import React from 'react';
import { Property, User } from '../types';
import { Bed, Bath, Car, Maximize, MapPin, Share2, Eye, Edit3, Trash2, User as UserIcon } from 'lucide-react';
import { getPropertyMainImage, handleImageError } from '../lib/imageUtils';
import { getPropertyPriceInfo } from '../lib/priceUtils';
import { PropertyStatusBadge, PropertyPurposeBadge, PropertyCategoryBadge } from './PropertyBadges';

interface PropertyTableViewProps {
  properties: Property[];
  users: User[];
  currentUser?: User;
  onView: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onShareWhatsApp?: (property: Property) => void;
  onGenerateAiPost?: (property: Property) => void;
  canEditAny?: boolean;
}

export const PropertyTableView: React.FC<PropertyTableViewProps> = ({
  properties,
  users,
  currentUser,
  onView,
  onEdit,
  onDelete,
  onShareWhatsApp,
  onGenerateAiPost,
  canEditAny = false
}) => {
  const isMaster = currentUser?.role === 'MASTER_ADMIN' || currentUser?.role === 'MASTER';
  const isGestor = currentUser?.role === 'GESTOR' || currentUser?.role === 'GESTORA';

  const isOwnedByCurrentUser = (p: Property) =>
    currentUser &&
    (p.user_id === currentUser.id ||
      p.user_id?.toLowerCase() === currentUser.id?.toLowerCase() ||
      p.user_id?.toLowerCase() === currentUser.username?.toLowerCase() ||
      p.user_id?.toLowerCase() === currentUser.email?.toLowerCase());

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4">Imóvel</th>
              <th className="py-3.5 px-4">Localização</th>
              <th className="py-3.5 px-4">Valor</th>
              <th className="py-3.5 px-4">Características</th>
              <th className="py-3.5 px-4">Captador</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {properties.map(property => {
              const mainImage = getPropertyMainImage(property);
              const priceInfo = getPropertyPriceInfo(property);
              const owner = users.find(u => u.id === property.user_id || u.email === property.user_id || u.username === property.user_id);
              const canEdit = canEditAny || isMaster || isGestor || isOwnedByCurrentUser(property);

              return (
                <tr
                  key={property.id}
                  id={`row-property-${property.id}`}
                  onClick={() => onView(property)}
                  className="hover:bg-rose-50/40 transition duration-150 cursor-pointer group"
                >
                  {/* Foto + Código + Título */}
                  <td className="py-3 px-4 min-w-[240px]">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        <img
                          src={mainImage}
                          alt={property.title}
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-slate-950/75 text-white text-[9px] font-black text-center py-0.5">
                          {property.code}
                        </span>
                      </div>
                      <div className="space-y-1 max-w-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <PropertyCategoryBadge category={property.category} variant="soft" size="xs" />
                          <PropertyPurposeBadge purpose={property.purpose} variant="soft" size="xs" />
                        </div>
                        <h4 className="font-extrabold text-slate-900 line-clamp-1 group-hover:text-[#F10F4D] transition">
                          {property.title}
                        </h4>
                      </div>
                    </div>
                  </td>

                  {/* Localização */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-[#F10F4D] shrink-0" />
                      <span>{property.neighborhood || 'Manaus'}</span>
                    </div>
                    {property.address && (
                      <p className="text-[10px] text-slate-400 line-clamp-1 pl-5">
                        {property.address}
                      </p>
                    )}
                  </td>

                  {/* Valor */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <p className="font-black text-slate-900 text-sm">
                      {priceInfo.primaryFormatted.replace(/\s*\/\s*mês/gi, '')}
                    </p>
                    {property.condo_fee && Number(property.condo_fee) > 0 ? (
                      <p className="text-[10px] text-slate-500 font-medium">
                        Cond.: R$ {Number(property.condo_fee).toLocaleString('pt-BR')}
                      </p>
                    ) : null}
                  </td>

                  {/* Características */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3 text-slate-600 text-[11px] font-medium">
                      {Number(property.bedrooms) > 0 && (
                        <span className="flex items-center gap-1" title={`${property.bedrooms} quartos`}>
                          <Bed className="w-3.5 h-3.5 text-slate-400" />
                          <strong className="text-slate-800">{property.bedrooms}</strong>
                        </span>
                      )}
                      {Number(property.bathrooms) > 0 && (
                        <span className="flex items-center gap-1" title={`${property.bathrooms} banheiros`}>
                          <Bath className="w-3.5 h-3.5 text-slate-400" />
                          <strong className="text-slate-800">{property.bathrooms}</strong>
                        </span>
                      )}
                      {Number(property.parking_spaces) > 0 && (
                        <span className="flex items-center gap-1" title={`${property.parking_spaces} vagas`}>
                          <Car className="w-3.5 h-3.5 text-slate-400" />
                          <strong className="text-slate-800">{property.parking_spaces}</strong>
                        </span>
                      )}
                      {Number(property.usable_area || property.total_area) > 0 && (
                        <span className="flex items-center gap-1" title="Área útil">
                          <Maximize className="w-3.5 h-3.5 text-slate-400" />
                          <strong className="text-slate-800">{property.usable_area || property.total_area}m²</strong>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Captador */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px] border border-slate-200 overflow-hidden">
                        {owner?.photo_url ? (
                          <img src={owner.photo_url} alt={owner.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-3 h-3" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                        {owner?.name || 'Lopes Manaus'}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <PropertyStatusBadge status={property.status} variant="soft" size="xs" />
                  </td>

                  {/* Ações Rápidas */}
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-1">
                      {/* Botão Ver */}
                      <button
                        type="button"
                        id={`btn-table-view-${property.id}`}
                        onClick={() => onView(property)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                        title="Ver Detalhes do Imóvel"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Botão Gerar Post */}
                      {onGenerateAiPost && (
                        <button
                          type="button"
                          id={`btn-table-post-${property.id}`}
                          onClick={() => onGenerateAiPost(property)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-[#F10F4D] text-[#F10F4D] hover:text-white font-extrabold text-[11px] whitespace-nowrap transition cursor-pointer"
                          title="Gerar Post para Redes Sociais"
                        >
                          Gerar Post
                        </button>
                      )}

                      {/* Botão WhatsApp */}
                      {onShareWhatsApp && (
                        <button
                          type="button"
                          id={`btn-table-share-${property.id}`}
                          onClick={() => onShareWhatsApp(property)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                          title="Compartilhar no WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Botão Editar */}
                      {canEdit && onEdit && (
                        <button
                          type="button"
                          id={`btn-table-edit-${property.id}`}
                          onClick={() => onEdit(property)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Editar Imóvel"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Botão Excluir */}
                      {canEdit && onDelete && (
                        <button
                          type="button"
                          id={`btn-table-delete-${property.id}`}
                          onClick={() => onDelete(property)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Excluir Imóvel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
