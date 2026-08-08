import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Lock, AlertCircle } from 'lucide-react';
import { LopesLogo } from '../components/LopesLogo';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-900">
      
      {/* Background Decorative Ambient Radial Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F10F4D]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-200/50 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 relative z-10 backdrop-blur-2xl">
        
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <LopesLogo size="lg" variant="color" showBadge badgeText="CAPTAÇÃO" className="mb-3" />
          <p className="text-xs text-slate-500 font-medium tracking-wide">
            Sistema de Captação & Gestão Imobiliária
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#F10F4D]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">
              Usuário ou E-mail
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ex: admin ou michelesilva"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#F10F4D] focus:ring-2 focus:ring-[#F10F4D]/20 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#F10F4D] focus:ring-2 focus:ring-[#F10F4D]/20 transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-rose-500/20 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Acessando Sistema...' : 'Entrar no Sistema'}
          </button>
        </form>

        {/* Brand Footer */}
        <div className="mt-8 pt-5 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} Lopes Imobiliária - Shopping Ponta Negra</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Todos os direitos reservados</p>
        </div>

      </div>
    </div>
  );
};
