import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  FileText,
  Menu,
  X,
  Users,
  Settings,
  BookOpen,
  Calendar,
  CalendarCheck,
  History,
  Share2,
  ExternalLink,
  FileCode,
  BarChart3,
  Sparkles
} from 'lucide-react';

interface MobileBottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenNewPropertyModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView,
  onOpenNewPropertyModal
}) => {
  const { user } = useAuth();
  const [showDrawer, setShowDrawer] = useState(false);

  if (!user) return null;

  const isMaster = user.role === 'MASTER_ADMIN';
  const isMasterOrGestor = isMaster || user.role === 'GESTOR' || user.role === 'GESTORA';

  const menuItems = [
    { id: 'journal', label: 'Diário de Captação', icon: CalendarCheck, show: true, highlight: true },
    { id: 'schedule', label: 'Agenda & Visitas', icon: Calendar, show: true, highlight: true },
    { id: 'properties', label: 'Lista de Imóveis', icon: Building2, show: true },
    { id: 'pdf-catalog', label: 'Gerar Catálogo PDF', icon: FileText, show: true },
    { id: 'general-catalog', label: 'Vitrine Geral', icon: BookOpen, show: true },
    { id: 'dashboard', label: 'Dashboard & Métricas', icon: LayoutDashboard, show: true },
    { id: 'reports', label: 'Relatório Semanal', icon: BarChart3, show: isMasterOrGestor },
    { id: 'xml-import', label: 'Importar XML', icon: FileCode, show: isMaster },
    { id: 'users', label: 'Usuários & Perfis', icon: Users, show: isMaster },
    { id: 'logs', label: 'Histórico & Logs', icon: History, show: isMaster },
    { id: 'settings', label: 'Configurações & Perfil', icon: Settings, show: true }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setShowDrawer(false)}
          />
          <div className="relative bg-white rounded-t-3xl p-5 border-t border-slate-200 shadow-2xl max-h-[88vh] overflow-y-auto space-y-4 z-10">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F10F4D]"></span>
                <h3 className="text-sm font-black text-slate-900 uppercase">Menu & Atalhos Prioritários</h3>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRIORITY SHORTCUTS: DIÁRIO DE CAPTAÇÃO & AGENDA */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  setActiveView('journal');
                  setShowDrawer(false);
                }}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between shadow-xs ${
                  activeView === 'journal'
                    ? 'bg-[#F10F4D] text-white border-[#F10F4D] shadow-rose-500/20'
                    : 'bg-rose-50/70 border-rose-200 text-slate-900 hover:bg-rose-100/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeView === 'journal' ? 'bg-white/20 text-white' : 'bg-[#F10F4D] text-white'}`}>
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeView === 'journal' ? 'bg-white/30 text-white' : 'bg-[#F10F4D] text-white'}`}>
                    Prioridade
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black leading-tight">Diário de Captação</h4>
                  <p className={`text-[10px] mt-0.5 ${activeView === 'journal' ? 'text-rose-100' : 'text-slate-500'}`}>
                    Leads, visitas e metas
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveView('schedule');
                  setShowDrawer(false);
                }}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between shadow-xs ${
                  activeView === 'schedule'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-slate-900/20'
                    : 'bg-indigo-50/70 border-indigo-200 text-slate-900 hover:bg-indigo-100/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeView === 'schedule' ? 'bg-white/20 text-white' : 'bg-indigo-600 text-white'}`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeView === 'schedule' ? 'bg-white/30 text-white' : 'bg-indigo-600 text-white'}`}>
                    Agenda
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black leading-tight">Agenda & Visitas</h4>
                  <p className={`text-[10px] mt-0.5 ${activeView === 'schedule' ? 'text-slate-300' : 'text-slate-500'}`}>
                    Compromissos do dia
                  </p>
                </div>
              </button>
            </div>

            {/* Public Link Share Banner in Mobile Drawer */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <p className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Share2 className="w-3.5 h-3.5 text-[#F10F4D]" />
                <span>Seu Catálogo Digital:</span>
              </p>
              <a
                href={`/catalogo/${user.url_slug || user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-xs font-extrabold text-[#F10F4D] hover:underline flex items-center space-x-1"
              >
                <span>/catalogo/{user.url_slug || user.username}</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>

            {/* Menu Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {menuItems.map((item) => {
                if (!item.show) return null;
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setShowDrawer(false);
                    }}
                    className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                      isActive
                        ? 'bg-[#F10F4D] text-white border-[#F10F4D] shadow-md shadow-rose-500/20'
                        : 'bg-slate-50 border-slate-200/80 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isActive ? 'text-white' : 'text-[#F10F4D]'}`} />
                    <span className="text-xs font-bold leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Logout/Config button in drawer */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setActiveView('settings');
                  setShowDrawer(false);
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Configurações & Perfil</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-40 md:hidden px-3 py-2 shadow-lg">
        <div className="flex items-center justify-around max-w-md mx-auto">
          
          {/* Diário de Captação - Prioridade Mobile */}
          <button
            onClick={() => setActiveView('journal')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeView === 'journal' ? 'text-[#F10F4D] font-extrabold' : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <CalendarCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Diário</span>
          </button>

          {/* Agenda & Visitas - Prioridade Mobile */}
          <button
            onClick={() => setActiveView('schedule')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeView === 'schedule' ? 'text-[#F10F4D] font-extrabold' : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Agenda</span>
          </button>

          {/* Plus FAB Button */}
          <button
            onClick={onOpenNewPropertyModal}
            className="flex flex-col items-center justify-center -mt-5 bg-[#F10F4D] text-white p-3 rounded-2xl shadow-lg shadow-rose-500/40 transform active:scale-95 transition cursor-pointer"
            title="Cadastrar Novo Imóvel"
          >
            <PlusCircle className="w-6 h-6" />
          </button>

          {/* Imóveis */}
          <button
            onClick={() => setActiveView('properties')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeView === 'properties' ? 'text-[#F10F4D] font-extrabold' : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Imóveis</span>
          </button>

          {/* Menu Drawer */}
          <button
            onClick={() => setShowDrawer(true)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
              showDrawer ? 'text-[#F10F4D] font-extrabold' : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Menu</span>
          </button>

        </div>
      </div>
    </>
  );
};
