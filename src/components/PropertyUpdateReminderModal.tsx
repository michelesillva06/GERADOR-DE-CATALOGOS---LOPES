import React, { useState } from 'react';
import { Property } from '../types';
import { needsStatusCheck } from './PropertyUpdateAlerts';
import { AlertTriangle, CheckCircle2, Loader2, X, Home } from 'lucide-react';
import { MobileNotificationSettings } from './MobileNotificationSettings';

interface PropertyUpdateReminderModalProps {
  properties: Property[]; // pass only the properties this viewer should see reminders for
  onConfirmed: (updatedProperty: Property) => void;
  onClose: () => void;
  showOwnerName?: boolean;
}

/**
 * A dismissible daily reminder, not an inline banner — closing it never blocks using the rest
 * of the system. App.tsx decides when to open this (once per calendar day on login, or anytime
 * via the bell icon in the header) and re-shows it again the next day if properties are still
 * unconfirmed.
 */
export const PropertyUpdateReminderModal: React.FC<PropertyUpdateReminderModalProps> = ({
  properties,
  onConfirmed,
  onClose,
  showOwnerName
}) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const daysSince = (property: Property) => {
    const lastCheck = property.last_status_check || property.created_at;
    return Math.floor((Date.now() - new Date(lastCheck).getTime()) / (1000 * 60 * 60 * 24));
  };

  const overdue = properties.filter(needsStatusCheck).sort((a, b) => daysSince(b) - daysSince(a));

  if (overdue.length === 0) {
    return null;
  }

  const handleConfirm = async (propertyId: string) => {
    setConfirmingId(propertyId);
    try {
      const token = localStorage.getItem('lopes_token');
      const res = await fetch(`/api/properties/${propertyId}/confirm-status`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        onConfirmed(data.property);
      }
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 bg-amber-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="text-amber-600" size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">
                {overdue.length} {overdue.length > 1 ? 'imóveis' : 'imóvel'} precisa{overdue.length > 1 ? 'm' : ''} de atualização
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Confirme com o proprietário que o preço e a disponibilidade continuam corretos.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 shrink-0" title="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-2 flex-1">
          <MobileNotificationSettings compact className="mb-3" />

          {overdue.map(property => {
            const thumb = property.main_image || property.images?.[0];
            return (
              <div
                key={property.id}
                className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-100 p-2.5"
              >
                {thumb ? (
                  <img src={thumb} alt={property.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                    <Home size={18} className="text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-700 truncate">
                    {property.code} — {property.title}
                  </p>
                  <p className="text-xs text-amber-700 font-semibold">
                    {daysSince(property)} dias sem confirmar
                    {showOwnerName && property.user_name ? ` • ${property.user_name}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleConfirm(property.id)}
                  disabled={confirmingId === property.id}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {confirmingId === property.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Confirmar
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold"
          >
            Continuar depois
          </button>
        </div>
      </div>
    </div>
  );
};
