import React, { useState, useMemo, useEffect } from 'react';
import { User, Property, AuditLog, JournalEntry, ScheduleEvent } from '../types';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Plus,
  Save,
  Sparkles,
  TrendingUp,
  Clock,
  Trash2,
  Edit3,
  Award,
  Target,
  FileText,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Smile,
  Zap,
  Check
} from 'lucide-react';

interface CaptadorJournalPageProps {
  currentUser: User;
  users: User[];
  properties: Property[];
  logs: AuditLog[];
  scheduleEvents: ScheduleEvent[];
  journalEntries: JournalEntry[];
  onSaveJournal: (entry: Partial<JournalEntry>) => Promise<void>;
}

export const CaptadorJournalPage: React.FC<CaptadorJournalPageProps> = ({
  currentUser,
  users,
  properties,
  logs,
  scheduleEvents,
  journalEntries,
  onSaveJournal
}) => {
  const isMasterOrGestora = currentUser.role === 'MASTER_ADMIN' || currentUser.role === 'GESTORA';

  // Selected Captador (Gestora can switch to view any captador, captadores view their own)
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);

  // Selected Date for Journal Entry (Defaults to today YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Active view tab: 'edit' or 'history'
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');

  // Selected User Object
  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || currentUser;
  }, [users, selectedUserId, currentUser]);

  // Find existing journal entry for this user + date
  const existingEntry = useMemo(() => {
    return journalEntries.find(j => j.user_id === selectedUserId && j.date === selectedDate);
  }, [journalEntries, selectedUserId, selectedDate]);

  // Form states
  const [summaryNotes, setSummaryNotes] = useState<string>('');
  const [keyHighlights, setKeyHighlights] = useState<string[]>(['']);
  const [nextDayGoals, setNextDayGoals] = useState<string>('');
  const [rating, setRating] = useState<'Produtivo' | 'Excelente' | 'Desafiador' | 'Regular'>('Produtivo');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Compute Auto Metrics for selected user & selected date
  const autoMetrics = useMemo(() => {
    const userLogs = logs.filter(l => {
      if (!l) return false;
      const isUser = l.user_id === selectedUserId || (l.user_name && l.user_name.toLowerCase() === selectedUser.name.toLowerCase());
      if (!isUser) return false;

      const logDate = l.created_at ? l.created_at.split('T')[0].split(' ')[0] : '';
      return logDate === selectedDate;
    });

    const createdLogsCount = userLogs.filter(l =>
      l.action?.toLowerCase().includes('cadastr') || l.description?.toLowerCase().includes('cadastrou') || l.action?.toLowerCase().includes('criação')
    ).length;

    const updatedLogsCount = userLogs.filter(l =>
      l.action?.toLowerCase().includes('edição') || l.description?.toLowerCase().includes('editou') || l.action?.toLowerCase().includes('atualização')
    ).length;

    const statusChanges = userLogs.filter(l =>
      l.action?.toLowerCase().includes('status') || l.description?.toLowerCase().includes('status')
    ).length;

    // Direct property counting from properties array (combines with logs for 100% accuracy)
    const createdPropsCount = properties.filter(p => {
      if (!p) return false;
      const isOwner = p.user_id === selectedUserId;
      if (!isOwner) return false;
      const createdDate = p.created_at ? p.created_at.split('T')[0].split(' ')[0] : '';
      return createdDate === selectedDate;
    }).length;

    const updatedPropsCount = properties.filter(p => {
      if (!p) return false;
      const isOwner = p.user_id === selectedUserId;
      if (!isOwner) return false;
      const updatedDate = p.updated_at ? p.updated_at.split('T')[0].split(' ')[0] : '';
      const createdDate = p.created_at ? p.created_at.split('T')[0].split(' ')[0] : '';
      return updatedDate === selectedDate && updatedDate !== createdDate;
    }).length;

    const visitsCount = scheduleEvents.filter(e => {
      if (!e) return false;
      const isUser = e.user_id === selectedUserId || (e.user_name && e.user_name.toLowerCase() === selectedUser.name.toLowerCase());
      return (
        isUser &&
        e.date === selectedDate &&
        (e.type === 'VISITA' || !e.type)
      );
    }).length;

    return {
      properties_created: Math.max(createdLogsCount, createdPropsCount),
      properties_updated: Math.max(updatedLogsCount, updatedPropsCount),
      status_changes: statusChanges,
      visits_count: visitsCount
    };
  }, [logs, properties, scheduleEvents, selectedUserId, selectedUser, selectedDate]);

  // Populate form when selected Date / User / Entry changes
  useEffect(() => {
    if (existingEntry) {
      setSummaryNotes(existingEntry.summary_notes || '');
      setKeyHighlights(existingEntry.key_highlights && existingEntry.key_highlights.length > 0 ? existingEntry.key_highlights : ['']);
      setNextDayGoals(existingEntry.next_day_goals || '');
      setRating(existingEntry.rating || 'Produtivo');
    } else {
      // Default blank values for new day
      setSummaryNotes('');
      setKeyHighlights(['']);
      setNextDayGoals('');
      setRating('Produtivo');
    }
  }, [existingEntry, selectedDate, selectedUserId]);

  const handleAddHighlight = () => {
    setKeyHighlights(prev => [...prev, '']);
  };

  const handleRemoveHighlight = (idx: number) => {
    setKeyHighlights(prev => prev.filter((_, i) => i !== idx));
  };

  const handleHighlightChange = (idx: number, val: string) => {
    setKeyHighlights(prev => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  // Pre-fill summary automatically based on activity metrics
  const handleAutoFillSummary = () => {
    const parts: string[] = [];
    if (autoMetrics.properties_created > 0) {
      parts.push(`• Cadastrou ${autoMetrics.properties_created} novo(s) imóvel(is) no catálogo da Lopes.`);
    }
    if (autoMetrics.properties_updated > 0) {
      parts.push(`• Realizou atualização de fotos/dados em ${autoMetrics.properties_updated} imóvel(is).`);
    }
    if (autoMetrics.status_changes > 0) {
      parts.push(`• Atualizou etapas de comercialização (${autoMetrics.status_changes} alterações de status).`);
    }
    if (autoMetrics.visits_count > 0) {
      parts.push(`• Realizou/Agendou ${autoMetrics.visits_count} visita(s) a imóveis com clientes.`);
    }

    if (parts.length === 0) {
      parts.push('• Atendimento a clientes compradores e prospecção ativa de novas captações nos bairros de Manaus.');
    }

    const generatedText = `Resumo do dia (${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}):\n` + parts.join('\n');
    setSummaryNotes(prev => (prev ? prev + '\n\n' + generatedText : generatedText));

    const autoHighlights = parts.map(p => p.replace('• ', ''));
    setKeyHighlights(autoHighlights);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const cleanHighlights = keyHighlights.filter(h => h.trim().length > 0);

    await onSaveJournal({
      user_id: selectedUserId,
      user_name: selectedUser.name,
      date: selectedDate,
      summary_notes: summaryNotes,
      key_highlights: cleanHighlights,
      next_day_goals: nextDayGoals,
      rating,
      auto_metrics: autoMetrics
    });

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // User History Entries
  const userHistory = useMemo(() => {
    return journalEntries
      .filter(j => j.user_id === selectedUserId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [journalEntries, selectedUserId]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-rose-50 text-[#F10F4D] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Diário de Trabalho do Captador</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Diário e Resumo Diário de Atividades
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Registre e personalize seu resumo diário de produtividade, metas para o dia seguinte e destaques de prospecção.
          </p>
        </div>

        {/* Captador Selector (if Gestora/Master) */}
        {isMasterOrGestora && (
          <div className="w-full md:w-auto bg-slate-50 p-3 rounded-2xl border border-slate-200 shrink-0">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
              Visualizar Diário de:
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full md:w-56 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'CAPTADOR' ? 'Captador' : u.position || 'Gestão'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'editor'
              ? 'bg-[#F10F4D] text-white shadow-md shadow-rose-900/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Registrar / Editar Diário</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#F10F4D] text-white shadow-md shadow-rose-900/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Histórico de Diários ({userHistory.length})</span>
        </button>
      </div>

      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Date Picker & Auto Metrics Box */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Date Selection Box */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#F10F4D]" />
                <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Data do Diário</h2>
              </div>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
              />

              <p className="text-[11px] text-slate-400 font-medium">
                {selectedDate === todayStr ? (
                  <span className="text-emerald-600 font-extrabold">● Hoje</span>
                ) : (
                  `Visualizando registro do dia ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
                )}
              </p>
            </div>

            {/* Auto System Metrics for this day */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Atividades Registradas no Sistema</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-xl font-black text-slate-900">{autoMetrics.properties_created}</span>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Imóveis Cadastrados</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-xl font-black text-slate-900">{autoMetrics.properties_updated}</span>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Imóveis Editados</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-xl font-black text-zinc-900">{autoMetrics.status_changes}</span>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Status Alterados</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-xl font-black text-[#F10F4D]">{autoMetrics.visits_count}</span>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Visitas Agendadas</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAutoFillSummary}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-[#F10F4D] font-extrabold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Preencher Resumo Automaticamente</span>
              </button>
            </div>

            {/* Captador Info Box */}
            <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center space-x-3">
                {selectedUser.photo_url ? (
                  <img src={selectedUser.photo_url} alt={selectedUser.name} className="w-10 h-10 rounded-full object-cover border-2 border-[#F10F4D]" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#F10F4D] font-black text-sm flex items-center justify-center">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-xs font-extrabold">{selectedUser.name}</h3>
                  <p className="text-[10px] text-slate-400">{selectedUser.position || 'Captador(a)'}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                O diário é a ferramenta de acompanhamento do trabalho de campo, visitas e prospecções no mercado imobiliário de Manaus.
              </p>
            </div>

          </div>

          {/* RIGHT COLUMN: Journal Editor Form */}
          <div className="space-y-6 lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-[#F10F4D]" />
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Registro Diário ({new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')})
                  </h2>
                </div>

                {/* Rating selection */}
                <div className="flex items-center space-x-1.5">
                  {(['Produtivo', 'Excelente', 'Desafiador', 'Regular'] as const).map(rate => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setRating(rate)}
                      className={`px-3 py-1 rounded-xl text-[10px] font-black transition cursor-pointer ${
                        rating === rate
                          ? 'bg-[#F10F4D] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {rate}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Notes TextArea */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Resumo das Atividades do Dia (Geral & Atendimentos)
                </label>
                <textarea
                  rows={5}
                  value={summaryNotes}
                  onChange={(e) => setSummaryNotes(e.target.value)}
                  placeholder="Descreva o que foi realizado hoje: contatos com proprietários, captações ativas, visitas a clientes, panfletagem ou atendimento no plantão..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#F10F4D] leading-relaxed"
                />
              </div>

              {/* Key Highlights (Dynamic Inputs) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Destaques e Conquistas do Dia (Pontos Fortes)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddHighlight}
                    className="text-[11px] font-extrabold text-[#F10F4D] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Destaque</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {keyHighlights.map((hl, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-rose-50 text-[#F10F4D] font-extrabold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        value={hl}
                        onChange={(e) => handleHighlightChange(idx, e.target.value)}
                        placeholder="Ex: Agendou visita exclusiva para o sábado no Adrianópolis"
                        className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                      />
                      {keyHighlights.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveHighlight(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Day Goals */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>Planejamento e Objetivos para o Próximo Dia</span>
                </label>
                <textarea
                  rows={3}
                  value={nextDayGoals}
                  onChange={(e) => setNextDayGoals(e.target.value)}
                  placeholder="O que precisa ser feito amanhã? Ex: Retornar ligação para o proprietário do imóvel LOP-102, confirmar visita com cliente..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#F10F4D] leading-relaxed"
                />
              </div>

              {/* Submit Button & Notification */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {saveSuccess ? (
                  <div className="flex items-center space-x-2 text-emerald-600 font-extrabold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Diário salvo com sucesso!</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Todas as informações são gravadas com segurança no histórico.
                  </span>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3.5 bg-[#F10F4D] hover:bg-rose-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-950/40 transition flex items-center space-x-2 cursor-pointer transform active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Diário do Dia'}</span>
                </button>
              </div>

            </form>
          </div>

        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {userHistory.length > 0 ? (
            userHistory.map(entry => (
              <div key={entry.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-2xl bg-rose-50 text-[#F10F4D] flex items-center justify-center font-extrabold text-xs">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Diário do Dia {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Registrado por {entry.user_name} em {new Date(entry.updated_at || entry.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-slate-900 text-white font-black text-[10px] rounded-full uppercase">
                      {entry.rating || 'Produtivo'}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedDate(entry.date);
                        setActiveTab('editor');
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition cursor-pointer"
                    >
                      Editar Este Diário
                    </button>
                  </div>
                </div>

                {/* Auto Metrics summary */}
                {entry.auto_metrics && (
                  <div className="flex items-center space-x-4 text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span>🏠 {entry.auto_metrics.properties_created} Imóveis Cadastrados</span>
                    <span>•</span>
                    <span>✏️ {entry.auto_metrics.properties_updated} Imóveis Editados</span>
                    <span>•</span>
                    <span>🔄 {entry.auto_metrics.status_changes} Mudanças de Status</span>
                    <span>•</span>
                    <span>📍 {entry.auto_metrics.visits_count} Visitas</span>
                  </div>
                )}

                {/* Summary Notes */}
                {entry.summary_notes && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Resumo de Atividades</p>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                      {entry.summary_notes}
                    </p>
                  </div>
                )}

                {/* Key Highlights */}
                {entry.key_highlights && entry.key_highlights.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Destaques do Dia</p>
                    <div className="space-y-1">
                      {entry.key_highlights.map((hl, i) => (
                        <div key={i} className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                          <Check className="w-3.5 h-3.5 text-[#F10F4D]" />
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Goals */}
                {entry.next_day_goals && (
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Objetivos e Metas para Amanhã</p>
                    <p className="text-xs text-slate-700 font-medium">
                      {entry.next_day_goals}
                    </p>
                  </div>
                )}

              </div>
            ))
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-bold">Nenhum diário registrado para este captador ainda.</p>
              <button
                onClick={() => setActiveTab('editor')}
                className="mt-2 text-xs font-extrabold text-[#F10F4D] hover:underline cursor-pointer"
              >
                Clique aqui para registrar o primeiro diário do dia
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
