import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed standalone PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F10F4D] hover:bg-rose-600 text-white shadow-xs transition cursor-pointer"
        title="Instalar aplicativo Lopes Captação no celular ou computador"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
          title="Instalar app no iPhone"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#F10F4D]" />
          <span className="hidden sm:inline">Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowIOSGuide(false)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#F10F4D] flex items-center justify-center font-black">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">Instalar no iPhone / iPad</h3>
                </div>
                <button onClick={() => setShowIOSGuide(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="flex items-start space-x-2">
                  <span className="font-black text-[#F10F4D] shrink-0">1.</span>
                  <span>No Safari, toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima na barra inferior).</span>
                </p>
                <p className="flex items-start space-x-2">
                  <span className="font-black text-[#F10F4D] shrink-0">2.</span>
                  <span>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</span>
                </p>
                <p className="flex items-start space-x-2">
                  <span className="font-black text-[#F10F4D] shrink-0">3.</span>
                  <span>Toque em <strong>Adicionar</strong> no canto superior direito.</span>
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
