import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, User as UserIcon, LogOut, ExternalLink, ShieldAlert, Sparkles, ChevronDown } from 'lucide-react';
import { LopesLogo } from './LopesLogo';
import { getStoredUsers } from '../lib/storage';
import { User } from '../types';

interface HeaderProps {
  onOpenPublicCatalog?: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
  users?: User[];
}

export const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, users = [] }) => {
  const { user, logout, switchUserSimulated } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);

  const publicUrl = user ? `${window.location.origin}/catalogo/${user.url_slug || user.username}` : '#';
  const availableUsers = users && users.length > 0 ? users : getStoredUsers();

  return (
    <header className="bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center cursor-pointer" onClick={() => setActiveView('dashboard')}>
          <LopesLogo size="md" variant="color" showBadge badgeText="CAPTAÇÃO" />
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-3">
          
          {/* Public Catalog Link Button */}
          {user && (
            <a
              href={`/catalogo/${user.url_slug || user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 transition"
              title="Abrir meu catálogo público em nova guia"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#F10F4D]" />
              <span className="hidden md:inline">Meu Catálogo Público</span>
            </a>
          )}

          {/* Quick User Switcher Dropdown - Visible for MASTER_ADMIN if users exist */}
          {user?.role === 'MASTER_ADMIN' && availableUsers.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowUserSwitcher(!showUserSwitcher)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200/80 flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden lg:inline">Alternar Perfil</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showUserSwitcher && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Alternar entre Usuários do Sistema</p>
                  </div>
                  {availableUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUserSimulated(u.id);
                        setShowUserSwitcher(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 font-semibold"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{u.name} ({u.role})</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                      {user?.id === u.id && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User Badge Profile Dropdown */}

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-100 transition"
              >
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-[#F10F4D]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-900 border-2 border-[#F10F4D] flex items-center justify-center text-white font-black text-xs shadow-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4 text-slate-300" />}
                  </div>
                )}
                <div className="text-left hidden sm:block pr-1">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
                  <p className="text-[10px] font-extrabold text-[#F10F4D]">
                    {user.role === 'MASTER_ADMIN' ? 'Master Admin' : (user.role === 'GESTOR' || user.role === 'GESTORA') ? 'Gestor' : 'Captador'}
                  </p>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-extrabold text-slate-900">{user.name}</p>
                    <p className="text-[11px] font-medium text-slate-500 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-50 text-[#F10F4D] border border-rose-100">
                      {user.role === 'MASTER_ADMIN' ? 'Acesso Total Master' : 'Painel de Captador'}
                    </span>
                  </div>

                  <a
                    href={`/catalogo/${user.url_slug || user.username}`}
                    target="_blank"
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4 text-[#F10F4D]" />
                    <span>Ver Minha Página Pública</span>
                  </a>

                  <button
                    onClick={() => {
                      setActiveView('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>Configurações</span>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
