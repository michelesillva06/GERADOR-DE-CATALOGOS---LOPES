import React, { useState } from 'react';
import { Property, ScheduleEvent, User } from '../types';
import { needsStatusCheck } from './PropertyUpdateAlerts';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  Home,
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  MessageCircle,
  Bell,
  Check,
  Users,
  Building
} from 'lucide-react';
import { MobileNotificationSettings } from './MobileNotificationSettings';
import { buildWhatsAppUrl } from '../lib/whatsapp';

interface UnifiedDailyAlertsModalProps {
  user: User;
  properties: Property[];
  scheduleEvents: ScheduleEvent[];
  isOpen?: boolean;
  onClose: () => void;
  onConfirmPropertyStatus: (updatedProperty: Property) => void;
  onConfirmEventPresence: (updatedEvent: ScheduleEvent) => void;
  onNavigateToSchedule?: () => void;
}

export const UnifiedDailyAlertsModal: React.FC<UnifiedDailyAlertsModalProps> = ({
  user,
  properties,
  scheduleEvents,
  isOpen = true,
  onClose,
  onConfirmPropertyStatus,
  onConfirmEventPresence,
  onNavigateToSchedule
}) => {
  const [confirmingPropId, setConfirmingPropId] = useState<string | null>(null);
  const [confirmingEventId, setConfirmingEventId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrow = tomorrowObj.toISOString().slice(0, 10);

  // 1. My Visits (strictly for current user)
  const isMyVisit = (ev: ScheduleEvent) =>
    ev.type === 'VISITA' &&
    (ev.user_id === user.id ||
      ev.user_id?.toLowerCase() === user.id?.toLowerCase() ||
      ev.user_id?.toLowerCase() === user.username?.toLowerCase() ||
      ev.user_id?.toLowerCase() === user.email?.toLowerCase());

  const visitsToday = scheduleEvents.filter(ev => isMyVisit(ev) && ev.date === today);
  const visitsTomorrow = scheduleEvents.filter(ev => isMyVisit(ev) && ev.date === tomorrow);
  const totalVisitsCount = visitsToday.length + visitsTomorrow.length;

  // 2. Gestor Events, Meetings & Trainings
  const gestorTypes = ['EVENTO', 'REUNIAO', 'TREINAMENTO'];
  const upcomingGestorEvents = scheduleEvents.filter(
    ev => gestorTypes.includes(ev.type) && ev.date >= today
  );

  const unconfirmedEvents = upcomingGestorEvents.filter(ev => {
    const confirmed = ev.confirmed_attendees || [];
    return !confirmed.includes(user.id);
  });

  // 3. Overdue Properties (only for captadores)
  const isAdminOrGestor = user.role === 'MASTER_ADMIN' || user.role === 'GESTOR' || user.role === 'GESTORA';
  const isOwnedByCurrentUser = (p: Property) =>
    p.user_id === user.id ||
    p.user_id?.toLowerCase() === user.id?.toLowerCase() ||
    p.user_id?.toLowerCase() === user.username?.toLowerCase() ||
    p.user_id?.toLowerCase() === user.email?.toLowerCase();

  const userProperties = isAdminOrGestor ? [] : properties.filter(isOwnedByCurrentUser);
  const overdueProperties = userProperties.filter(needsStatusCheck);

  // Active tab selection
  const [activeTab, setActiveTab] = useState<'all' | 'visits' | 'events' | 'properties'>('all');

  if (!isOpen) return null;

  const handleConfirmProperty = async (propertyId: string) => {
    setConfirmingPropId(propertyId);
    try {
      const token = localStorage.getItem('lopes_token');
      const res = await fetch(`/api/properties/${propertyId}/confirm-status`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        onConfirmPropertyStatus(data.property);
      }
    } finally {
      setConfirmingPropId(null);
    }
  };

  const handleConfirmPresence = async (eventId: string) => {
    setConfirmingEventId(eventId);
    try {
      const token = localStorage.getItem('lopes_token');
      const res = await fetch(`/api/schedule/${eventId}/confirm-presence`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        onConfirmEventPresence(data.event);
      } else {
        // Fallback local update
        const ev = scheduleEvents.find(e => e.id === eventId);
        if (ev) {
          const updated: ScheduleEvent = {
            ...ev,
            confirmed_attendees: [...(ev.confirmed_attendees || []), user.id],
            confirmed_attendees_details: [
              ...(ev.confirmed_attendees_details || []),
              { user_id: user.id, user_name: user.name, confirmed_at: new Date().toISOString() }
            ]
          };
          onConfirmEventPresence(updated);
        }
      }
    } catch {
      const ev = scheduleEvents.find(e => e.id === eventId);
      if (ev) {
        const updated: ScheduleEvent = {
          ...ev,
          confirmed_attendees: [...(ev.confirmed_attendees || []), user.id],
          confirmed_attendees_details: [
            ...(ev.confirmed_attendees_details || []),
            { user_id: user.id, user_name: user.name, confirmed_at: new Date().toISOString() }
          ]
        };
        onConfirmEventPresence(updated);
      }
    } finally {
      setConfirmingEventId(null);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dateStr;
  };

  const daysSince = (property: Property) => {
    const lastCheck = property.last_status_check || property.created_at;
    return Math.floor((Date.now() - new Date(lastCheck).getTime()) / (1000 * 60 * 60 * 24));
  };

  const totalBadges = totalVisitsCount + unconfirmedEvents.length + overdueProperties.length;

  return (
    <div
      id="unified-daily-alerts-modal-backdrop"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="unified-daily-alerts-modal-container"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F10F4D] flex items-center justify-center shadow-md">
              <Bell className="text-white" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Central de Lembretes e Visitas</h2>
                {totalBadges > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#F10F4D] text-white text-[11px] font-black">
                    {totalBadges} pendência{totalBadges > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Olá, {user.name.split(' ')[0]}! Aqui estão seus compromissos e avisos importantes.
              </p>
            </div>
          </div>
          <button
            id="close-daily-alerts-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 p-3 border-b border-slate-100 bg-slate-50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
            }`}
          >
            <span>Todos os Alertas</span>
            <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px]">
              {totalVisitsCount + upcomingGestorEvents.length + overdueProperties.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('visits')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'visits'
                ? 'bg-[#F10F4D] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
            }`}
          >
            <Calendar size={13} />
            <span>Minhas Visitas</span>
            {totalVisitsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px]">{totalVisitsCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'events'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
            }`}
          >
            <Users size={13} />
            <span>Eventos & Reuniões</span>
            {unconfirmedEvents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-slate-900 text-[10px] font-black">
                {unconfirmedEvents.length}
              </span>
            )}
          </button>

          {overdueProperties.length > 0 && (
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                activeTab === 'properties'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
              }`}
            >
              <AlertTriangle size={13} />
              <span>Imóveis (7 dias)</span>
              <span className="px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900 text-[10px] font-black">
                {overdueProperties.length}
              </span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-6 flex-1 bg-white">
          {/* Web Push Permission Banner */}
          <MobileNotificationSettings compact className="shadow-xs" />

          {/* SECTION 1: VISITAS DO DIA & AMANHÃ (STRICTLY FOR LOGGED IN CAPTADOR) */}
          {(activeTab === 'all' || activeTab === 'visits') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F10F4D]"></span>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Suas Visitas Agendadas ({totalVisitsCount})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Exclusivo para sua agenda</span>
              </div>

              {totalVisitsCount === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                  Nenhuma visita agendada para hoje ou amanhã.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Today's Visits */}
                  {visitsToday.map(visit => {
                    const waLink = visit.client_phone
                      ? buildWhatsAppUrl(
                          visit.client_phone,
                          `Olá ${visit.client_name || ''}, confirmo nossa visita agendada para hoje às ${visit.start_time}!`
                        )
                      : null;

                    return (
                      <div
                        key={visit.id}
                        className="p-3.5 rounded-2xl bg-rose-50/50 border-2 border-rose-200/80 hover:border-rose-300 transition space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-[#F10F4D] text-white text-[10px] font-black uppercase tracking-wide">
                              HOJE
                            </span>
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              <Clock size={12} className="text-[#F10F4D]" />
                              {visit.start_time} - {visit.end_time || visit.start_time}
                            </span>
                          </div>
                          {visit.property_code && (
                            <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 text-[10px] font-bold">
                              Imóvel: {visit.property_code}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{visit.title}</h4>
                          {visit.client_name && (
                            <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                              <UserIcon size={12} className="text-slate-400" />
                              Cliente: <span className="font-semibold text-slate-800">{visit.client_name}</span>
                              {visit.client_phone && (
                                <span className="text-slate-400">({visit.client_phone})</span>
                              )}
                            </p>
                          )}
                          {visit.location && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin size={12} className="text-slate-400" />
                              {visit.location}
                            </p>
                          )}
                        </div>

                        {waLink && (
                          <div className="pt-1 flex justify-end">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition"
                            >
                              <MessageCircle size={12} />
                              Confirmar via WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Tomorrow's Visits */}
                  {visitsTomorrow.map(visit => {
                    const waLink = visit.client_phone
                      ? buildWhatsAppUrl(
                          visit.client_phone,
                          `Olá ${visit.client_name || ''}, confirmo nossa visita agendada para amanhã (${formatDateDisplay(
                            visit.date
                          )}) às ${visit.start_time}!`
                        )
                      : null;

                    return (
                      <div
                        key={visit.id}
                        className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/80 hover:border-amber-300 transition space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase tracking-wide">
                              AMANHÃ ({formatDateDisplay(visit.date)})
                            </span>
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              <Clock size={12} className="text-amber-600" />
                              {visit.start_time} - {visit.end_time || visit.start_time}
                            </span>
                          </div>
                          {visit.property_code && (
                            <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 text-[10px] font-bold">
                              Imóvel: {visit.property_code}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{visit.title}</h4>
                          {visit.client_name && (
                            <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                              <UserIcon size={12} className="text-slate-400" />
                              Cliente: <span className="font-semibold text-slate-800">{visit.client_name}</span>
                              {visit.client_phone && (
                                <span className="text-slate-400">({visit.client_phone})</span>
                              )}
                            </p>
                          )}
                          {visit.location && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin size={12} className="text-slate-400" />
                              {visit.location}
                            </p>
                          )}
                        </div>

                        {waLink && (
                          <div className="pt-1 flex justify-end">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition"
                            >
                              <MessageCircle size={12} />
                              Lembrar Cliente WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: GESTOR EVENTS, MEETINGS & TRAININGS */}
          {(activeTab === 'all' || activeTab === 'events') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Eventos, Reuniões & Treinamentos da Gestão
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Equipe Lopes Manaus</span>
              </div>

              {upcomingGestorEvents.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                  Nenhum evento ou reunião cadastrado pela gestão no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingGestorEvents.map(event => {
                    const isConfirmedByMe = (event.confirmed_attendees || []).includes(user.id);
                    const confirmedCount = (event.confirmed_attendees || []).length;
                    const typeLabel =
                      event.type === 'REUNIAO' ? 'Reunião' : event.type === 'TREINAMENTO' ? 'Treinamento' : 'Evento';
                    const isToday = event.date === today;

                    return (
                      <div
                        key={event.id}
                        className={`p-4 rounded-2xl border transition ${
                          isConfirmedByMe
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-indigo-50/50 border-indigo-200 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                  event.type === 'REUNIAO'
                                    ? 'bg-purple-600 text-white'
                                    : event.type === 'TREINAMENTO'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-indigo-600 text-white'
                                }`}
                              >
                                {typeLabel}
                              </span>
                              {isToday && (
                                <span className="px-2 py-0.5 rounded-md bg-[#F10F4D] text-white text-[10px] font-black animate-pulse">
                                  ACONTECE HOJE
                                </span>
                              )}
                              <span className="text-xs font-bold text-slate-700">
                                {formatDateDisplay(event.date)} às {event.start_time}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>

                            {event.location && (
                              <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                                <MapPin size={12} className="text-slate-400" />
                                Local: {event.location}
                              </p>
                            )}

                            {event.notes && (
                              <p className="text-xs text-slate-500 mt-1 italic line-clamp-2">
                                &ldquo;{event.notes}&rdquo;
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Users size={12} className="text-slate-400" />
                                {confirmedCount} participante{confirmedCount !== 1 ? 's' : ''} confirmado
                                {confirmedCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-2">
                            {isConfirmedByMe ? (
                              <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                Presença Confirmada
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConfirmPresence(event.id)}
                                disabled={confirmingEventId === event.id}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                              >
                                {confirmingEventId === event.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                                Confirmar Presença
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: OVERDUE PROPERTIES (7 DAYS WITHOUT OWNER STATUS CHECK) */}
          {(activeTab === 'all' || activeTab === 'properties') && overdueProperties.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Imóveis sem Atualização há mais de 7 dias ({overdueProperties.length})
                  </h3>
                </div>
                <span className="text-[11px] text-amber-700 font-bold">Confirme com o proprietário</span>
              </div>

              <div className="space-y-2">
                {overdueProperties.map(property => {
                  const thumb = property.main_image || property.images?.[0];
                  return (
                    <div
                      key={property.id}
                      className="flex items-center gap-3 bg-amber-50/40 rounded-2xl border border-amber-200/80 p-3 hover:border-amber-300 transition"
                    >
                      {thumb ? (
                        <img src={thumb} alt={property.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                          <Building size={16} className="text-amber-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {property.code} — {property.title}
                        </p>
                        <p className="text-[11px] text-amber-700 font-semibold">
                          {daysSince(property)} dias sem confirmação de preço/status
                        </p>
                      </div>
                      <button
                        onClick={() => handleConfirmProperty(property.id)}
                        disabled={confirmingPropId === property.id}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                      >
                        {confirmingPropId === property.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        Confirmar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          {onNavigateToSchedule && (
            <button
              onClick={() => {
                onClose();
                onNavigateToSchedule();
              }}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Calendar size={14} className="text-[#F10F4D]" />
              Abrir Agenda Completa
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            Continuar para o Sistema
          </button>
        </div>
      </div>
    </div>
  );
};
