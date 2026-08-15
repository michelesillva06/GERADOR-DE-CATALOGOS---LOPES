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
  ExternalLink,
  BookOpen,
  Calendar,
  FileCode,
  CalendarCheck,
  BarChart3
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
  const isGestor = user.role === 'GESTOR' || user.role === 'GESTORA';
  const isMasterOrGestor = isMaster || isGestor;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: true
    },
    {
      id: 'properties',
      label: isMasterOrGestor ? 'Todos os Imóveis' : 'Meus Imóveis',
      icon: Building2,
      show: true
    },
    {
      id: 'journal',
      label: 'Diário de Captação',
      icon: CalendarCheck,
      show: true,
      badge: 'Diário'
    },
    {
      id: 'reports',
      label: 'Relatório Semanal & Diretor',
      icon: BarChart3,
      show: isMasterOrGestor,
      badge: 'Semanal'
    },
    {
      id: 'xml-import',
      label: 'Importar XML',
      icon: FileCode,
      show: isMaster,
      badge: 'XML'
    },
    {
      id: 'general-catalog',
      label: 'Catálogo Geral (Vitrine)',
      icon: BookOpen,
      show: true
    },
    {
      id: 'pdf-catalog',
      label: 'Gerar Catálogo PDF',
      icon: FileText,
      show: true
    },
    {
      id: 'schedule',
      label: 'Agenda & Visitas',
      icon: Calendar,
      show: true
    },
    {
      id: 'users',
      label: 'Usuários & Perfis',
      icon: Users,
      show: isMaster // ONLY Master Admin can manage users
    },
    {
      id: 'logs',
      label: 'Histórico & Logs',
      icon: History,
      show: isMaster
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      show: true
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 shrink-0 hidden md:block min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        
        {/* Quick Action Button: New Property */}
        <button
          onClick={onOpenNewPropertyModal}
          className="w-full bg-[#F10F4D] hover:bg-rose-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-rose-500/20 flex items-center justify-center space-x-2 transition transform active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Cadastrar Imóvel</span>
        </button>

        {/* Public Page Share Banner */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700">
          <p className="font-bold text-slate-900 mb-1 flex items-center space-x-1.5">
            <Share2 className="w-3.5 h-3.5 text-[#F10F4D]" />
            <span>Seu Link Público:</span>
          </p>
          <p className="text-[11px] text-slate-600 font-mono truncate bg-white p-1.5 rounded border border-slate-200 select-all">
            /catalogo/{user.url_slug || user.username}
          </p>
          <a
            href={`/catalogo/${user.url_slug || user.username}`}
            target="_blank"
            className="mt-2 inline-flex items-center text-[11px] font-extrabold text-[#F10F4D] hover:underline"
          >
            Visualizar minha página <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>

        {/* Menu Items Navigation */}
        <nav className="space-y-1">
          <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
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
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-[#F10F4D] text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info inside sidebar */}
        <div className="pt-6 border-t border-slate-100 text-[11px] text-slate-400">
          <p className="font-extrabold text-slate-700">Lopes Captação v2.0</p>
          <p className="text-[10px] text-slate-400">Gestão e Captação Imobiliária</p>
        </div>

      </div>
    </aside>
  );
};
