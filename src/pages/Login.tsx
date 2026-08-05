import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User as UserIcon, Lock, Building2, Sparkles, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotMsg, setShowForgotMsg] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput || !passwordInput) {
      setErrorMsg('Por favor, preencha o usuário e a senha.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const result = await login(loginInput, passwordInput);
    if (!result.success) {
      setErrorMsg(result.error || 'Falha ao autenticar.');
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userType: 'admin' | 'larissa' | 'michele' | 'moacir' | 'karine') => {
    setLoading(true);
    setErrorMsg('');
    let u = 'admin';
    let p = 'admin123';

    if (userType === 'larissa') {
      u = 'larissamaia';
      p = '123456';
    } else if (userType === 'michele') {
      u = 'michelesilva';
      p = '123456';
    } else if (userType === 'moacir') {
      u = 'moacirmartins';
      p = '123456';
    } else if (userType === 'karine') {
      u = 'karinecorrea';
      p = '123456';
    }

    setLoginInput(u);
    setPasswordInput(p);

    const result = await login(u, p);
    if (!result.success) {
      setErrorMsg(result.error || 'Falha na conexão.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Gradient Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F10F4D]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#F10F4D] rounded-2xl flex items-center justify-center font-extrabold text-white text-3xl mx-auto shadow-xl shadow-rose-900/50 mb-3">
            L
          </div>
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-2xl font-black text-white tracking-tight">LOPES</h1>
            <span className="text-[#F10F4D] font-extrabold text-xs uppercase px-2 py-0.5 bg-rose-950 rounded border border-rose-800">
              CAPTAÇÃO
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Sistema de Captação & Gestão Imobiliária
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
              Usuário ou E-mail
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Ex: michelesilva ou admin@lopesmanaus.com.br"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-[#F10F4D]"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase">
                Senha de Acesso
              </label>
              <button
                type="button"
                onClick={() => setShowForgotMsg(true)}
                className="text-[11px] text-[#F10F4D] hover:underline font-semibold"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-[#F10F4D]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-900/40 transition transform active:scale-95"
          >
            {loading ? 'Acessando Sistema...' : 'Entrar no Sistema'}
          </button>
        </form>

        {/* Recovery Dialog */}
        {showForgotMsg && (
          <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
            <p className="font-bold text-white mb-1">Recuperação de Senha:</p>
            <p>Entre em contato com o <strong>Master Admin (master@lopesmanaus.com.br)</strong> para realizar o reset de senha da sua conta.</p>
            <button
              onClick={() => setShowForgotMsg(false)}
              className="mt-2 text-[10px] text-[#F10F4D] font-bold uppercase hover:underline"
            >
              Fechar aviso
            </button>
          </div>
        )}

        {/* Quick Demo Login Preset Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider text-center mb-3">
            Acesso Rápido - Perfis Reais
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('admin')}
              className="px-2 py-2 bg-slate-950 hover:bg-slate-800 text-rose-400 border border-slate-800 rounded-xl text-[10px] font-bold truncate text-center"
            >
              Master Admin
            </button>
            <button
              onClick={() => handleQuickLogin('larissa')}
              className="px-2 py-2 bg-slate-950 hover:bg-slate-800 text-purple-400 border border-slate-800 rounded-xl text-[10px] font-bold truncate text-center"
            >
              Larissa Maia
            </button>
            <button
              onClick={() => handleQuickLogin('michele')}
              className="px-2 py-2 bg-slate-950 hover:bg-slate-800 text-sky-400 border border-slate-800 rounded-xl text-[10px] font-bold truncate text-center"
            >
              Michele Silva
            </button>
            <button
              onClick={() => handleQuickLogin('moacir')}
              className="px-2 py-2 bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-xl text-[10px] font-bold truncate text-center"
            >
              Moacir Martins
            </button>
            <button
              onClick={() => handleQuickLogin('karine')}
              className="px-2 py-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded-xl text-[10px] font-bold truncate text-center"
            >
              Karine Corrêa
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
