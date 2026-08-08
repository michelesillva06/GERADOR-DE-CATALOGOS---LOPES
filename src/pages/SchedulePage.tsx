import React, { useState, useMemo } from 'react';
import { User, Property, ScheduleEvent, ScheduleEventType } from '../types';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  AlertOctagon,
  MapPin,
  GraduationCap,
  Briefcase,
  Users,
  Building2,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  ShieldAlert,
  UserX,
  Search
} from 'lucide-react';

interface SchedulePageProps {
  currentUser: User;
  users: User[];
  properties: Property[];
  scheduleEvents: ScheduleEvent[];
  onAddEvent: (eventData: Partial<ScheduleEvent>) => Promise<{ success: boolean; error?: string }>;
  onDeleteEvent: (id: string) => Promise<void>;
}

// Helper to add minutes to time
function calcEndTime(startTimeStr: string, durationMins: number = 90): string {
  if (!startTimeStr || !startTimeStr.includes(':')) return '11:30';
  const [hStr, mStr] = startTimeStr.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);
  if (isNaN(h)) h = 9;
  if (isNaN(m)) m = 0;

  const totalMins = h * 60 + m + durationMins;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// Helper to check standard national & Manaus municipal holidays
function getOfficialHolidayName(dateStr: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const monthDay = `${parts[1]}-${parts[2]}`;

  const holidaysMap: Record<string, string> = {
    '01-01': 'Confraternização Universal (Ano Novo)',
    '04-21': 'Tiradentes',
    '05-01': 'Dia Mundial do Trabalho',
    '09-07': 'Independência do Brasil',
    '10-12': 'Nossa Senhora Aparecida (Padroeira do Brasil)',
    '10-24': 'Aniversário de Manaus (Feriado Municipal)',
    '11-02': 'Finados',
    '11-15': 'Proclamação da República',
    '11-20': 'Dia Nacional da Consciência Negra',
    '12-08': 'Nossa Senhora da Conceição (Padroeira de Manaus)',
    '12-25': 'Natal'
  };

  return holidaysMap[monthDay] || null;
}

// Helper to check if weekend (Saturday=6, Sunday=0)
function isWeekendDay(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

export const SchedulePage: React.FC<SchedulePageProps> = ({
  currentUser,
  users,
  properties,
  scheduleEvents,
  onAddEvent,
  onDeleteEvent
}) => {
  const isMasterOrGestora = currentUser.role === 'MASTER_ADMIN' || currentUser.role === 'GESTORA';

  // Filters
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterUserId, setFilterUserId] = useState<string>('todos');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [holidayOverride, setHolidayOverride] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'VISITA' as ScheduleEventType,
    date: new Date().toISOString().split('T')[0],
    start_time: '09:30',
    end_time: '11:00',
    user_id: currentUser.id,
    property_code: '',
    client_name: '',
    client_phone: '',
    location: '',
    notes: '',
    exclusive_visit: true
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-update end_time when start_time changes (1h30 duration)
  const handleStartTimeChange = (newStartTime: string) => {
    const computedEnd = calcEndTime(newStartTime, 90);
    setFormData(prev => ({
      ...prev,
      start_time: newStartTime,
      end_time: computedEnd
    }));
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return scheduleEvents
      .filter(e => {
        if (selectedMonth && !e.date.startsWith(selectedMonth)) return false;
        if (filterType !== 'todos' && e.type !== filterType) return false;
        if (filterUserId !== 'todos' && e.user_id !== filterUserId && e.type !== 'FERIADO') return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = e.title.toLowerCase().includes(q);
          const matchCode = e.property_code?.toLowerCase().includes(q);
          const matchClient = e.client_name?.toLowerCase().includes(q);
          const matchUser = e.user_name?.toLowerCase().includes(q);
          const matchLoc = e.location?.toLowerCase().includes(q);
          if (!matchTitle && !matchCode && !matchClient && !matchUser && !matchLoc) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const dateTimeA = `${a.date}T${a.start_time}`;
        const dateTimeB = `${b.date}T${b.start_time}`;
        return new Date(dateTimeA).getTime() - new Date(dateTimeB).getTime();
      });
  }, [scheduleEvents, selectedMonth, filterType, filterUserId, searchQuery]);

  // Check if date is an official holiday (from scheduleEvents or fixed list)
  const officialHolidayName = useMemo(() => {
    if (!formData.date) return null;
    const fromEvents = scheduleEvents.find(e => e.type === 'FERIADO' && e.date === formData.date);
    if (fromEvents) return fromEvents.title;
    return getOfficialHolidayName(formData.date);
  }, [scheduleEvents, formData.date]);

  const isWeekend = useMemo(() => isWeekendDay(formData.date), [formData.date]);

  // Occupied events on date
  const occupiedEventsOnDate = useMemo(() => {
    if (!formData.date) return [];
    return scheduleEvents.filter(
      e => e.date === formData.date && e.type !== 'FERIADO'
    );
  }, [scheduleEvents, formData.date]);

  // Time slot conflict check
  const timeSlotConflict = useMemo(() => {
    if (!formData.date || !formData.start_time) return null;
    const startA = formData.start_time;
    const endA = formData.end_time || calcEndTime(startA, 90);

    return occupiedEventsOnDate.find(e => {
      const startB = e.start_time;
      const endB = e.end_time || calcEndTime(startB, 90);
      const overlap = startA < endB && endA > startB;
      return overlap;
    }) || null;
  }, [occupiedEventsOnDate, formData.date, formData.start_time, formData.end_time]);

  // Open modal handler
  const handleOpenModal = () => {
    setFormError(null);
    setHolidayOverride(false);
    const today = new Date().toISOString().split('T')[0];
    const initialStart = '09:30';
    setFormData({
      title: '',
      type: 'VISITA',
      date: today,
      start_time: initialStart,
      end_time: calcEndTime(initialStart, 90),
      user_id: currentUser.id,
      property_code: '',
      client_name: '',
      client_phone: '',
      location: '',
      notes: '',
      exclusive_visit: true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (officialHolidayName && !holidayOverride && formData.type !== 'FERIADO') {
      setFormError(`Data Bloqueada! Em feriados oficiais (${officialHolidayName}) não é permitido agendar sem autorização prévia da Gestora Larissa Maia. Confirme a caixa de autorização especial para prosseguir.`);
      return;
    }

    if (timeSlotConflict) {
      const startB = timeSlotConflict.start_time;
      const endB = timeSlotConflict.end_time || calcEndTime(startB, 90);
      setFormError(`Horário indisponível! O captador(a) ${timeSlotConflict.user_name} já possui uma visita/compromisso agendado neste dia (${formData.date}) das ${startB} às ${endB} ("${timeSlotConflict.title}"). O próximo horário livre é a partir de ${endB}.`);
      return;
    }

    if (!formData.title || !formData.date || !formData.start_time) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const selectedCaptador = users.find(u => u.id === formData.user_id) || currentUser;

    setIsSubmitting(true);

    const computedEnd = calcEndTime(formData.start_time, 90);

    const res = await onAddEvent({
      ...formData,
      end_time: computedEnd,
      user_id: selectedCaptador.id,
      user_name: selectedCaptador.name,
      property_code: formData.property_code.trim() || undefined,
      override_holiday: holidayOverride
    } as any);

    setIsSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setFormError(res.error || 'Erro ao agendar compromisso.');
    }
  };

  const getBadgeStyle = (type: ScheduleEventType) => {
    switch (type) {
      case 'VISITA':
        return 'bg-rose-50 text-[#F10F4D] border-rose-200';
      case 'TREINAMENTO':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'EVENTO':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'FERIADO':
        return 'bg-slate-900 text-white border-slate-900';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTypeIcon = (type: ScheduleEventType) => {
    switch (type) {
      case 'VISITA':
        return Building2;
      case 'TREINAMENTO':
        return GraduationCap;
      case 'EVENTO':
        return Briefcase;
      case 'FERIADO':
        return ShieldAlert;
      default:
        return CalendarIcon;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-rose-50 text-[#F10F4D] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Agenda Geral de Visitas & Eventos</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Agenda e Calendário da Imobiliária
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Agendamentos de visitas, treinamentos e datas oficiais do ano. Feriados possuem bloqueio automático de agendamentos.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="bg-[#F10F4D] hover:bg-rose-600 text-white font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-rose-950/30 flex items-center space-x-2 transition transform active:scale-95 text-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Novo Compromisso</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Month Selector */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
              Mês e Ano
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
              Tipo de Evento
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="VISITA">Visita a Imóvel</option>
              <option value="TREINAMENTO">Treinamento / Reunião</option>
              <option value="EVENTO">Datas Úteis / Eventos</option>
              <option value="FERIADO">Feriados e Folgas</option>
            </select>
          </div>

          {/* Captador Filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
              Captador / Responsável
            </label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
            >
              <option value="todos">Todos os Captadores</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Código, cliente, local..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
              />
            </div>
          </div>

        </div>
      </div>

      {/* EVENTS LIST VIEW */}
      <div className="space-y-3">
        {filteredEvents.length > 0 ? (
          filteredEvents.map(event => {
            const Icon = getTypeIcon(event.type);
            const badgeClass = getBadgeStyle(event.type);
            const isHoliday = event.type === 'FERIADO';

            return (
              <div
                key={event.id}
                className={`bg-white p-5 rounded-3xl border transition shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isHoliday ? 'border-slate-900/40 bg-slate-950/5' : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Icon Badge */}
                  <div className={`p-3 rounded-2xl border font-black text-xs shrink-0 mt-0.5 ${badgeClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase ${badgeClass}`}>
                        {event.type}
                      </span>

                      {event.property_code && (
                        <span className="px-2 py-0.5 bg-rose-50 text-[#F10F4D] text-[10px] font-black rounded-md border border-rose-100">
                          {event.property_code}
                        </span>
                      )}

                      {event.exclusive_visit && event.type === 'VISITA' && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-md border border-amber-200 flex items-center space-x-1">
                          <UserX className="w-3 h-3" />
                          <span>Visita Exclusiva (Ir Só)</span>
                        </span>
                      )}

                      {event.exclusive_visit === false && event.type === 'VISITA' && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-md border border-emerald-200">
                          Pode ir Acompanhado
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {event.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
                      <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
                        <Clock className="w-3.5 h-3.5 text-[#F10F4D]" />
                        <span>
                          {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span>•</span>
                        <span>{event.start_time} - {event.end_time}</span>
                      </div>

                      {!isHoliday && (
                        <div className="flex items-center space-x-1 text-slate-600">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>Captador: {event.user_name}</span>
                        </div>
                      )}

                      {event.client_name && (
                        <div className="flex items-center space-x-1 text-slate-600">
                          <span className="font-bold text-slate-800">Cliente:</span> {event.client_name} ({event.client_phone || 'Sem telefone'})
                        </div>
                      )}

                      {event.location && (
                        <div className="flex items-center space-x-1 text-slate-600">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>

                    {event.notes && (
                      <p className="text-[11px] text-slate-500 font-medium italic pt-1">
                        "{event.notes}"
                      </p>
                    )}

                    {!isHoliday && (
                      <div className="pt-1.5 flex items-center space-x-2 text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Acompanhamento: <strong>Gestora Larissa Maia</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isHoliday && (isMasterOrGestora || event.user_id === currentUser.id) && (
                  <button
                    onClick={() => onDeleteEvent(event.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0 self-end md:self-center"
                    title="Cancelar agendamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
            <CalendarIcon className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-bold">Nenhum compromisso encontrado para os filtros selecionados.</p>
            <button
              onClick={handleOpenModal}
              className="mt-2 text-xs font-extrabold text-[#F10F4D] hover:underline cursor-pointer"
            >
              Clique aqui para agendar uma visita ou evento
            </button>
          </div>
        )}
      </div>

      {/* SCHEDULING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 relative my-8">
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 bg-rose-50 text-[#F10F4D] px-3 py-1 rounded-full text-[10px] font-black uppercase">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Novo Agendamento Simplificado</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">Agendar Visita com Proprietário</h2>
              <p className="text-xs text-slate-500">
                Cadastre o horário da visita. Duração padrão de <strong>1 hora e 30 minutos</strong> (deslocamento + atendimento) com acompanhamento da <strong>Gestora Larissa Maia</strong>.
              </p>
            </div>

            {formError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-[#F10F4D] mt-0.5" />
                <div className="space-y-1">
                  <p className="font-black">Atenção!</p>
                  <p className="leading-relaxed">{formError}</p>
                </div>
              </div>
            )}

            {/* HOLIDAY BANNER */}
            {officialHolidayName && (
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-rose-400 font-extrabold text-xs uppercase">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Feriado Oficial: {officialHolidayName}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Dias de feriado são de folga da equipe. Para agendar neste dia, certifique-se da autorização prévia da Gestora Larissa Maia.
                </p>
                <label className="flex items-center space-x-2 pt-1 text-xs font-bold text-rose-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={holidayOverride}
                    onChange={(e) => setHolidayOverride(e.target.checked)}
                    className="w-4 h-4 accent-[#F10F4D] rounded"
                  />
                  <span>Confirmo autorização especial da Gestora Larissa Maia para agendar neste feriado</span>
                </label>
              </div>
            )}

            {/* WEEKEND WARNING */}
            {isWeekend && !officialHolidayName && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl space-y-1">
                <div className="flex items-center space-x-2 font-extrabold text-xs uppercase text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Final de Semana (Sábado / Domingo)</span>
                </div>
                <p className="text-[11px] font-medium leading-relaxed">
                  Agendamento em dia não útil sob consulta de disponibilidade do proprietário e acompanhamento da Gestora Larissa Maia.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Event Type */}
              <div className="space-y-1">
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  Tipo de Agendamento *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'VISITA', label: 'Visita a Imóvel', icon: Building2 },
                    { type: 'TREINAMENTO', label: 'Treinamento', icon: GraduationCap },
                    { type: 'EVENTO', label: 'Evento / Reunião', icon: Briefcase }
                  ].map(item => {
                    const ItemIcon = item.icon;
                    const isSelected = formData.type === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: item.type as ScheduleEventType }))}
                        className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                          isSelected
                            ? 'bg-[#F10F4D] text-white border-[#F10F4D] shadow-md shadow-rose-900/30'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <ItemIcon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  Título do Agendamento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Visita ao Apto Reserva das Águas com Proprietário Carlos"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                />
              </div>

              {/* Novo Imóvel */}
              {formData.type === 'VISITA' && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                    Código / Identificação do Novo Imóvel
                  </label>
                  <input
                    type="text"
                    value={formData.property_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, property_code: e.target.value }))}
                    placeholder="Ex: NOVO-01, Captação Ed. Reserva, etc."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                  />
                </div>
              )}

              {/* Date & Start Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                    Data da Visita *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                    Horário de Início * (Duração 1h30)
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-bold text-slate-900 focus:outline-none ${
                      timeSlotConflict ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20' : 'bg-slate-50 border-slate-200 focus:border-[#F10F4D]'
                    }`}
                  />
                  <p className="text-[10px] text-[#F10F4D] font-extrabold mt-1">
                    ⏱️ Término estimado: {calcEndTime(formData.start_time, 90)} (1h30m)
                  </p>
                </div>
              </div>

              {/* Quick 1h30 Slot Picker */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Horários Padrão Sugeridos (1h30 cada):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    '08:00',
                    '09:30',
                    '11:00',
                    '13:30',
                    '15:00',
                    '16:30'
                  ].map(slotStart => {
                    const slotEnd = calcEndTime(slotStart, 90);
                    const isOccupied = occupiedEventsOnDate.some(ev => {
                      const evEnd = ev.end_time || calcEndTime(ev.start_time, 90);
                      return slotStart < evEnd && slotEnd > ev.start_time;
                    });
                    const isSelected = formData.start_time === slotStart;

                    return (
                      <button
                        key={slotStart}
                        type="button"
                        onClick={() => handleStartTimeChange(slotStart)}
                        disabled={isOccupied}
                        className={`p-2 rounded-xl border text-[10px] font-extrabold transition flex flex-col items-center justify-center cursor-pointer ${
                          isOccupied
                            ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#F10F4D] text-white border-[#F10F4D] shadow-xs'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <span>{slotStart}</span>
                        <span className="text-[9px] opacity-80">{isOccupied ? 'Ocupado' : 'Livre'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Conflict Warning */}
              {timeSlotConflict && (
                <div className="p-3.5 bg-rose-500 text-white rounded-2xl shadow-sm space-y-1">
                  <div className="flex items-center space-x-2 font-black text-xs uppercase">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
                    <span>Horário Indisponível (Já Reservado)</span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed opacity-95">
                    O captador(a) <strong>{timeSlotConflict.user_name}</strong> já possui um agendamento ("{timeSlotConflict.title}") neste dia das <strong>{timeSlotConflict.start_time}</strong> às <strong>{timeSlotConflict.end_time || calcEndTime(timeSlotConflict.start_time, 90)}</strong>. Escolha outro horário para evitar choque.
                  </p>
                </div>
              )}

              {/* Occupied slots panel on selected date */}
              {formData.date && (
                <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <span>Status do Dia ({new Date(formData.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      occupiedEventsOnDate.length >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {occupiedEventsOnDate.length} / 5 visitas agendadas
                    </span>
                  </div>

                  {occupiedEventsOnDate.length > 0 ? (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {occupiedEventsOnDate.map(ev => (
                        <div key={ev.id} className="p-2 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="px-2 py-0.5 bg-rose-100 text-[#F10F4D] text-[10px] font-black rounded-md shrink-0">
                              {ev.start_time} - {ev.end_time || calcEndTime(ev.start_time, 90)}
                            </span>
                            <span className="truncate text-slate-800 font-bold">{ev.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold shrink-0 ml-2">
                            👤 {ev.user_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-600 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Nenhum outro compromisso agendado para esta data. Todos os horários livres!</span>
                    </p>
                  )}
                </div>
              )}

              {/* Exclusive Visit Checkbox / Toggle */}
              {formData.type === 'VISITA' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                    Modalidade de Acompanhamento:
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, exclusive_visit: true }))}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                        formData.exclusive_visit
                          ? 'bg-rose-50 text-[#F10F4D] border-[#F10F4D]'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      <UserX className="w-4 h-4 shrink-0" />
                      <div className="text-left">
                        <p className="font-extrabold">Ir Só (Visita Exclusiva)</p>
                        <p className="text-[10px] text-slate-500 font-normal">Bloqueia o horário no imóvel</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, exclusive_visit: false }))}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                        !formData.exclusive_visit
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-500'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      <div className="text-left">
                        <p className="font-extrabold">Pode ir Acompanhado</p>
                        <p className="text-[10px] text-slate-500 font-normal">Permite outro captador junto</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Captador Responsável */}
              {isMasterOrGestora && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                    Captador Responsável
                  </label>
                  <select
                    value={formData.user_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.position})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Client Info */}
              {formData.type === 'VISITA' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                      Nome do Cliente
                    </label>
                    <input
                      type="text"
                      value={formData.client_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Ex: Carlos Eduardo"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                      Telefone do Cliente
                    </label>
                    <input
                      type="text"
                      value={formData.client_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                      placeholder="(92) 99123-4567"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                    />
                  </div>
                </div>
              )}

              {/* Location & Notes */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                    Localização / Ponto de Encontro
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Ex: Portaria do Condomínio Ponta Negra 1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                    Observações Internas
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Anotações adicionais para a equipe..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || (Boolean(officialHolidayName) && !holidayOverride) || Boolean(timeSlotConflict)}
                  className="px-6 py-2.5 bg-[#F10F4D] hover:bg-rose-600 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-950/30 transition flex items-center space-x-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Agendando...' : 'Confirmar Agendamento (1h30)'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
