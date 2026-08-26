import React, { useState } from 'react';
import { Property, User } from '../types';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const DAYS_BEFORE_ALERT = 7;

/** True when a property hasn't had its status confirmed with the owner in the last 7 days. */
export function needsStatusCheck(property: Property): boolean {
  if (property.status !== 'Disponível') return false; // sold/rented properties don't need this nudge
  const lastCheck = property.last_status_check || property.created_at;
  if (!lastCheck) return false;
  const daysSince = (Date.now() - new Date(lastCheck).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= DAYS_BEFORE_ALERT;
}

interface PropertyUpdateAlertsProps {
  properties: Property[]; // pass only the properties this viewer should see reminders for
  currentUser: User;
  onConfirmed: (updatedProperty: Property) => void;
  /** Shown next to each item — e.g. the captador's name, when an admin is viewing everyone's list. */
  showOwnerName?: boolean;
}

export const PropertyUpdateAlerts: React.FC<PropertyUpdateAlertsProps> = ({
  properties,
  onConfirmed,
  showOwnerName
}) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const overdue = properties.filter(needsStatusCheck);

  if (overdue.length === 0) return null;

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

  const daysSince = (property: Property) => {
    const lastCheck = property.last_status_check || property.created_at;
    return Math.floor((Date.now() - new Date(lastCheck).getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-amber-600" size={18} />
        <h3 className="text-sm font-bold text-amber-800">
          {overdue.length} imóvel{overdue.length > 1 ? 'is' : ''} precisa{overdue.length > 1 ? 'm' : ''} de confirmação de status com o proprietário
        </h3>
      </div>
      <div className="space-y-2">
        {overdue.map(property => (
          <div
            key={property.id}
            className="flex items-center justify-between gap-3 bg-white rounded-lg border border-amber-100 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {property.code} — {property.title}
              </p>
              <p className="text-xs text-amber-700">
                {daysSince(property)} dias sem confirmar com o proprietário
                {showOwnerName && property.user_name ? ` • Captador: ${property.user_name}` : ''}
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
        ))}
      </div>
    </div>
  );
};
