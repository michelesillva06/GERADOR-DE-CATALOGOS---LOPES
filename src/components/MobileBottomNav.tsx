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
  FileSpreadsheet,
  Settings,
  BookOpen,
  Calendar,
  History,
  Share2,
  ExternalLink
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

  const isMasterOrGestora = user.role === 'MASTER_ADMIN' || user.role === 'GESTORA';

  const secondaryMenuItems = [
    { id: 'schedule', label: 'Agenda & Visitas', icon: Calendar, show: true },
    { id: 'users', label: 'Usuários & Captadores', icon: Users, show: isMasterOrGestora },
    { id: 'logs', label: 'Histórico & Logs', icon: History, show: isMasterOrGestora },
    { id: 'settings', label: 'Configurações do Perfil', icon: Settings, show: true }
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
          <div className="relative bg-white rounded-t-3xl p-5 border-t border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 z-10">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F10F4D]"></span>
                <h3 className="text-sm font-black text-slate-900 uppercase">Menu de Navegação</h3>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Public Link Share Banner in Mobile Drawer */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
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
              {secondaryMenuItems.map((item) => {
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

            {/* Logout button in drawer */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setActiveView('settings');
                  setShowDrawer(false);
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-2xl text-xs flex items-center justify-center space-x-2"
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
          
          {/* Dashboard */}
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeView === 'dashboard' ? 'text-[#F10F4D] font-extrabold' : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Início</span>
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

          {/* Plus FAB Button */}
          <button
            onClick={onOpenNewPropertyModal}
            className="flex flex-col items-center justify-center -mt-5 bg-[#F10F4D] text-white p-3 rounded-2xl shadow-lg shadow-rose-500/40 transform active:scale-95 transition"
            title="Cadastrar Novo Imóvel"
          >
            <PlusCircle className="w-6 h-6" />
          </button>

          {/* PDF Catalog */}
          <button
            onClick={() => setActiveView('pdf-catalog')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeView === 'pdf-catalog' ? 'text-[#F10F4D] font-extrabold' : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">PDFs</span>
          </button>

          {/* Menu Drawer */}
          <button
            onClick={() => setShowDrawer(true)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
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
