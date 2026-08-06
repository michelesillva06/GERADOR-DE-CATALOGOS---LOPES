import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  Users,
  FileText,
  FileSpreadsheet,
  Settings,
  Share2,
  History,
  ExternalLink
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenNewPropertyModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, onOpenNewPropertyModal }) => {
  const { user } = useAuth();

  if (!user) return null;

  const isMaster = user.role === 'MASTER_ADMIN';
  const isGestora = user.role === 'GESTORA';
  const isMasterOrGestora = isMaster || isGestora;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: true
    },
    {
      id: 'properties',
      label: isMasterOrGestora ? 'Todos os Imóveis' : 'Meus Imóveis',
      icon: Building2,
      show: true
    },
    {
      id: 'users',
      label: 'Usuários & Captadores',
      icon: Users,
      show: isMasterOrGestora
    },
    {
      id: 'reports',
      label: 'Planilha & Controle',
      icon: FileSpreadsheet,
      show: isMasterOrGestora
    },
    {
      id: 'pdf-catalog',
      label: 'Gerar Catálogo PDF',
      icon: FileText,
      show: true
    },
    {
      id: 'logs',
      label: 'Histórico & Logs',
      icon: History,
      show: isMasterOrGestora
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      show: true
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 shrink-0 hidden md:block min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        
        {/* Quick Action Button: New Property */}
        <button
          onClick={onOpenNewPropertyModal}
          className="w-full bg-[#F10F4D] hover:bg-rose-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-rose-900/30 flex items-center justify-center space-x-2 transition transform active:scale-95"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Cadastrar Imóvel</span>
        </button>

        {/* Public Page Share Banner */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-300">
          <p className="font-semibold text-white mb-1 flex items-center space-x-1.5">
            <Share2 className="w-3.5 h-3.5 text-[#F10F4D]" />
            <span>Seu Link Público:</span>
          </p>
          <p className="text-[11px] text-slate-400 font-mono truncate bg-slate-950 p-1.5 rounded border border-slate-800 select-all">
            /catalogo/{user.url_slug || user.username}
          </p>
          <a
            href={`/catalogo/${user.url_slug || user.username}`}
            target="_blank"
            className="mt-2 inline-flex items-center text-[11px] font-bold text-[#F10F4D] hover:underline"
          >
            Visualizar minha página <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>

        {/* Menu Items Navigation */}
        <nav className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Navegação Principal
          </p>
          {menuItems.map(item => {
            if (!item.show) return null;
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#F10F4D] text-white shadow-md shadow-rose-900/40'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info inside sidebar */}
        <div className="pt-6 border-t border-slate-800/80 text-[11px] text-slate-500">
          <p className="font-bold text-slate-400">Lopes Captação v2.0</p>
          <p className="text-[10px]">Gestão e Captação Imobiliária</p>
        </div>

      </div>
    </aside>
  );
};
