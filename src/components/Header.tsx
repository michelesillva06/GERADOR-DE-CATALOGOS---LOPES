import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, User as UserIcon, LogOut, ExternalLink, ShieldAlert, Sparkles, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onOpenPublicCatalog?: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeView, setActiveView }) => {
  const { user, logout, switchUserSimulated } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);

  const publicUrl = user ? `${window.location.origin}/catalogo/${user.url_slug || user.username}` : '#';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView('dashboard')}>
          <div className="w-10 h-10 rounded-lg bg-[#F10F4D] flex items-center justify-center font-bold text-xl shadow-lg shadow-rose-900/40">
            L
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white">LOPES</span>
              <span className="text-[#F10F4D] font-bold text-xs uppercase px-1.5 py-0.5 bg-rose-950/60 rounded border border-rose-800/50">
                CAPTAÇÃO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">Lopes Captação</p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-3">
          
          {/* Public Catalog Link Button */}
          {user && (
            <a
              href={`/catalogo/${user.url_slug || user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Abrir meu catálogo público em nova guia"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#F10F4D]" />
              <span className="hidden md:inline">Meu Catálogo Público</span>
            </a>
          )}

          {/* Quick User Switcher Demo Dropdown - Only visible for MASTER_ADMIN */}
          {user?.role === 'MASTER_ADMIN' && (
            <div className="relative">
              <button
                onClick={() => setShowUserSwitcher(!showUserSwitcher)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline">Alternar Perfil</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showUserSwitcher && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-700">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demonstração de Perfis Reais</p>
                  </div>
                  <button
                    onClick={() => {
                      switchUserSimulated('usr_admin');
                      setShowUserSwitcher(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-200"
                  >
                    <div>
                      <p className="font-semibold text-rose-400">Administrador (Master Admin)</p>
                      <p className="text-[10px] text-slate-400">admin@lopesmanaus.com.br</p>
                    </div>
                    {user?.role === 'MASTER_ADMIN' && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                  </button>
                  <button
                    onClick={() => {
                      switchUserSimulated('usr_larissa');
                      setShowUserSwitcher(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-200"
                  >
                    <div>
                      <p className="font-semibold text-purple-400">Larissa Maia (Gestora)</p>
                      <p className="text-[10px] text-slate-400">larissamaia (Gestão e Catálogos)</p>
                    </div>
                    {user?.username === 'larissamaia' && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                  </button>
                  <button
                    onClick={() => {
                      switchUserSimulated('usr_michele');
                      setShowUserSwitcher(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-200"
                  >
                    <div>
                      <p className="font-semibold text-sky-400">Michele Silva (Corretora / Captadora)</p>
                      <p className="text-[10px] text-slate-400">michelesilva</p>
                    </div>
                    {user?.username === 'michelesilva' && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                  </button>
                  <button
                    onClick={() => {
                      switchUserSimulated('usr_moacir');
                      setShowUserSwitcher(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-200"
                  >
                    <div>
                      <p className="font-semibold text-amber-400">Moacir Martins (Consultor / Captador)</p>
                      <p className="text-[10px] text-slate-400">moacirmartins</p>
                    </div>
                    {user?.username === 'moacirmartins' && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                  </button>
                  <button
                    onClick={() => {
                      switchUserSimulated('usr_karine');
                      setShowUserSwitcher(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-200"
                  >
                    <div>
                      <p className="font-semibold text-emerald-400">Karine Corrêa (Captadora Executiva)</p>
                      <p className="text-[10px] text-slate-400">karinecorrea</p>
                    </div>
                    {user?.username === 'karinecorrea' && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User Badge Profile Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-800 transition"
              >
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-[#F10F4D]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-[#F10F4D] flex items-center justify-center text-white font-extrabold text-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4 text-slate-300" />}
                  </div>
                )}
                <div className="text-left hidden sm:block pr-1">
                  <p className="text-xs font-semibold text-slate-100 leading-tight">{user.name}</p>
                  <p className="text-[10px] font-bold text-[#F10F4D]">
                    {user.role === 'MASTER_ADMIN' ? 'Master Admin' : user.role === 'GESTORA' ? 'Gestora' : 'Captador'}
                  </p>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-700">
                    <p className="text-xs font-bold text-white">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                      {user.role === 'MASTER_ADMIN' ? 'Acesso Total Master' : 'Painel de Captador'}
                    </span>
                  </div>

                  <a
                    href={`/catalogo/${user.url_slug || user.username}`}
                    target="_blank"
                    className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4 text-[#F10F4D]" />
                    <span>Ver Minha Página Pública</span>
                  </a>

                  <button
                    onClick={() => {
                      setActiveView('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 flex items-center space-x-2"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>Configurações</span>
                  </button>

                  <div className="border-t border-slate-700 my-1"></div>

                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-950/40 flex items-center space-x-2 font-medium"
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
