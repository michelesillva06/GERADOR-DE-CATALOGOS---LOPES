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

  return (
    <div className="min-h-screen bg-[#333333] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Ambient Radial Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F10F4D]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-black/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-[#292929] border border-[#444444] rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 backdrop-blur-2xl">
        
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <LopesLogo size="lg" variant="white" showBadge badgeText="CAPTAÇÃO" className="mb-3" />
          <p className="text-xs text-neutral-300 font-medium tracking-wide">
            Sistema de Captação & Gestão Imobiliária
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs font-semibold flex items-center space-x-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#F10F4D]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold text-neutral-300 uppercase tracking-widest mb-1.5">
              Usuário ou E-mail
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Ex: admin ou michelesilva"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1f1f1f] border border-[#444444] rounded-xl text-xs font-medium text-white placeholder-neutral-500 focus:outline-none focus:border-[#F10F4D] focus:ring-1 focus:ring-[#F10F4D] transition"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-extrabold text-neutral-300 uppercase tracking-widest">
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
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1f1f1f] border border-[#444444] rounded-xl text-xs font-medium text-white placeholder-neutral-500 focus:outline-none focus:border-[#F10F4D] focus:ring-1 focus:ring-[#F10F4D] transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-950/40 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Acessando Sistema...' : 'Entrar no Sistema'}
          </button>
        </form>

        {/* Recovery Dialog */}
        {showForgotMsg && (
          <div className="mt-5 p-4 bg-[#1f1f1f] border border-[#444444] rounded-2xl text-xs text-neutral-200 space-y-2">
            <p className="font-bold text-white">Recuperação de Senha:</p>
            <p className="text-neutral-300 leading-relaxed">
              Entre em contato com o <strong>Administrador Master (admin@lopesmanaus.com.br)</strong> para redefinir a sua senha de acesso.
            </p>
            <button
              onClick={() => setShowForgotMsg(false)}
              className="text-[10px] text-[#F10F4D] font-bold uppercase hover:underline pt-1 block"
            >
              Fechar aviso
            </button>
          </div>
        )}

        {/* Brand Footer */}
        <div className="mt-8 pt-5 border-t border-[#444444] text-center text-[11px] text-neutral-400">
          <p>© {new Date().getFullYear()} Lopes Imobiliária - Shopping Ponta Negra</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Todos os direitos reservados</p>
        </div>

      </div>
    </div>
  );
};
