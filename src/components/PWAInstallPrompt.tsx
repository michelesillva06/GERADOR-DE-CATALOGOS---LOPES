import React, { useEffect, useState } from 'react';
import { Download, Monitor, Smartphone, X, CheckCircle2, HelpCircle } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructionsModal(true);
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 py-2.5 border-b border-rose-500/30 flex items-center justify-between text-xs shadow-md relative z-40">
        <div className="flex items-center space-x-3 max-w-3xl">
          <div className="w-8 h-8 rounded-xl bg-[#F10F4D] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Monitor className="w-4 h-4 hidden sm:block" />
            <Smartphone className="w-4 h-4 sm:hidden" />
          </div>
          <div>
            <p className="font-extrabold text-white text-xs leading-tight flex items-center space-x-1.5">
              <span>Instale o App Lopes no Computador (Windows) ou Celular</span>
              <span className="bg-rose-500/30 text-rose-300 text-[10px] px-1.5 py-0.2 rounded font-black uppercase">PWA</span>
            </p>
            <p className="text-[11px] text-slate-300 hidden sm:block">
              Abra direto como aplicativo no Windows com atalho na Área de Trabalho e suporte offline.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 bg-[#F10F4D] hover:bg-rose-600 text-white font-extrabold rounded-xl shadow-md text-xs flex items-center space-x-1.5 transition transform active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar App</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Instructions Modal for Windows & Mobile PWA Installation */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl relative text-slate-800">
            
            <button
              onClick={() => setShowInstructionsModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#F10F4D] shrink-0">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Como Instalar o PWA Lopes</h3>
                <p className="text-xs text-slate-500">Siga os passos abaixo para instalar no seu navegador:</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              
              {/* Windows Desktop Instructions */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-xs">
                  <Monitor className="w-4 h-4 text-[#F10F4D]" />
                  <span>Computador / Windows (Chrome, Edge, Brave)</span>
                </div>
                <ol className="text-xs text-slate-600 list-decimal pl-4 space-y-1">
                  <li>Procure o ícone de computador/instalação <strong className="text-slate-800">⤓ (Instalar)</strong> na barra de endereços (no topo direito).</li>
                  <li>Ou clique nos <strong className="text-slate-800">3 pontos (⋮)</strong> do navegador e selecione <strong className="text-[#F10F4D]">"Instalar Lopes Captação..."</strong> ou <strong className="text-[#F10F4D]">"Salvar e Compartilhar" &gt; "Instalar aplicativo"</strong>.</li>
                  <li>Confirme o clique para criar o ícone na sua Área de Trabalho e Menu Iniciar.</li>
                </ol>
              </div>

              {/* Android Instructions */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-xs">
                  <Smartphone className="w-4 h-4 text-[#F10F4D]" />
                  <span>Celular Android (Chrome)</span>
                </div>
                <p className="text-xs text-slate-600 pl-1">
                  Toque nos <strong className="text-slate-800">3 pontos (⋮)</strong> no canto superior direito e escolha <strong className="text-[#F10F4D]">"Instalar aplicativo"</strong> ou <strong className="text-[#F10F4D]">"Adicionar à Tela inicial"</strong>.
                </p>
              </div>

              {/* iPhone iOS Instructions */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-xs">
                  <Smartphone className="w-4 h-4 text-[#F10F4D]" />
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <p className="text-xs text-slate-600 pl-1">
                  Toque no botão <strong className="text-slate-800">Compartilhar (quadrado com seta para cima)</strong> no rodapé e selecione <strong className="text-[#F10F4D]">"Adicionar à Tela de Início"</strong>.
                </p>
              </div>

            </div>

            <button
              onClick={() => setShowInstructionsModal(false)}
              className="w-full py-3 bg-[#F10F4D] hover:bg-rose-600 text-white font-extrabold rounded-2xl text-xs shadow-md transition"
            >
              Entendi, Fechar
            </button>

          </div>
        </div>
      )}
    </>
  );
};
