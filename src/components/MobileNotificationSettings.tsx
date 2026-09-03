import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  isNotificationSupported,
  isPushSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentPushSubscription,
  sendTestNotification,
  triggerBackendOverdueCheck,
  isRunningAsPWA,
  NotificationSupportStatus
} from '../lib/mobileNotifications';
import { Bell, BellRing, BellOff, CheckCircle2, Smartphone, Loader2, Info, RefreshCw, Send } from 'lucide-react';

interface MobileNotificationSettingsProps {
  compact?: boolean;
  className?: string;
  onPermissionChange?: (status: NotificationSupportStatus) => void;
}

export const MobileNotificationSettings: React.FC<MobileNotificationSettingsProps> = ({
  compact = false,
  className = '',
  onPermissionChange
}) => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationSupportStatus>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isCheckingOverdue, setIsCheckingOverdue] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [overdueResult, setOverdueResult] = useState<string | null>(null);

  const supported = isNotificationSupported();
  const pushSupported = isPushSupported();
  const isPWA = isRunningAsPWA();
  const isIOS = typeof window !== 'undefined' && /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

  useEffect(() => {
    const current = getNotificationPermission();
    setPermission(current);

    // Check if push subscription exists
    getCurrentPushSubscription().then((sub) => {
      setIsSubscribed(!!sub);
    });
  }, [user]);

  const handleSubscribe = async () => {
    if (!user) return;
    setIsRegistering(true);
    setTestResult(null);
    try {
      const result = await subscribeToPushNotifications(user);
      const perm = getNotificationPermission();
      setPermission(perm);
      if (onPermissionChange) onPermissionChange(perm);

      if (result.success) {
        setIsSubscribed(true);
        // Dispatch test notification
        const testRes = await sendTestNotification(user);
        setTestResult(testRes.message);
        setTimeout(() => setTestResult(null), 5000);
      } else {
        if (perm === 'denied') {
          alert('As notificações foram bloqueadas no navegador ou sistema. Acesse as configurações de privacidade do site para desbloquear.');
        } else {
          alert(`Não foi possível ativar as notificações push: ${result.error || 'Erro desconhecido'}`);
        }
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!confirm('Deseja desativar as notificações push neste dispositivo?')) return;
    setIsRegistering(true);
    try {
      await unsubscribeFromPushNotifications(user || undefined);
      setIsSubscribed(false);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await sendTestNotification(user || undefined);
      setTestResult(res.message);
      setTimeout(() => setTestResult(null), 5000);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTriggerOverdueCheck = async () => {
    setIsCheckingOverdue(true);
    setOverdueResult(null);
    try {
      const res = await triggerBackendOverdueCheck();
      if (res.success) {
        setOverdueResult(res.message || 'Verificação concluída no servidor Firestore!');
      } else {
        setOverdueResult('Erro: ' + (res.message || 'Falha ao verificar'));
      }
      setTimeout(() => setOverdueResult(null), 6000);
    } finally {
      setIsCheckingOverdue(false);
    }
  };

  if (!supported) {
    if (compact) return null;
    return (
      <div className={`p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center gap-3 ${className}`}>
        <Info size={18} className="text-slate-400 shrink-0" />
        <span>Seu navegador ou dispositivo atual não suporta notificações web nativas.</span>
      </div>
    );
  }

  // Compact variant for Modals or Headers
  if (compact) {
    if (permission === 'granted' && isSubscribed) {
      return (
        <div className={`flex items-center justify-between gap-2 p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs ${className}`}>
          <div className="flex items-center gap-2 text-emerald-800 font-bold min-w-0 truncate">
            <BellRing size={16} className="text-emerald-600 shrink-0" />
            <span className="truncate">Push Notifications no celular ativas</span>
          </div>
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isTesting}
            className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-700 font-extrabold text-[11px] rounded-lg border border-emerald-200 transition shrink-0 cursor-pointer flex items-center gap-1"
          >
            {isTesting ? <Loader2 size={12} className="animate-spin" /> : testResult ? <CheckCircle2 size={12} /> : null}
            <span>{testResult ? 'Enviado!' : 'Testar'}</span>
          </button>
        </div>
      );
    }

    return (
      <div className={`flex items-center justify-between gap-2 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs ${className}`}>
        <div className="flex items-center gap-2 text-amber-900 font-bold min-w-0 truncate">
          <Bell size={16} className="text-amber-600 shrink-0" />
          <span className="truncate">Web Push & Lembretes</span>
        </div>
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={isRegistering}
          className="px-2.5 py-1 bg-[#F10F4D] hover:bg-rose-600 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition shrink-0 cursor-pointer flex items-center gap-1"
        >
          {isRegistering && <Loader2 size={12} className="animate-spin" />}
          <span>Ativar no Celular</span>
        </button>
      </div>
    );
  }

  // Full / Expanded card variant
  return (
    <div className={`bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            permission === 'granted' && isSubscribed
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              : 'bg-rose-50 text-[#F10F4D] border border-rose-100'
          }`}>
            {permission === 'granted' && isSubscribed ? <BellRing className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-extrabold text-slate-900">Web Push Notifications (VAPID)</h3>
              {permission === 'granted' && isSubscribed ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                  CONECTADO AO FIRESTORE ✅
                </span>
              ) : permission === 'denied' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                  BLOQUEADAS
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                  NÃO REGISTRADO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Receba notificações push automáticas no celular ou computador quando houver imóveis há mais de 30 dias sem confirmação com o proprietário.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          {permission === 'granted' && isSubscribed ? (
            <>
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={isTesting}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 flex items-center justify-center space-x-1.5 transition cursor-pointer"
                title="Disparar notificação push de teste no celular"
              >
                {isTesting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                ) : (
                  <Smartphone className="w-3.5 h-3.5 text-[#F10F4D]" />
                )}
                <span>Testar Push</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerOverdueCheck}
                disabled={isCheckingOverdue}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#F10F4D] font-bold text-xs border border-rose-100 flex items-center justify-center space-x-1.5 transition cursor-pointer"
                title="Verificar todos os imóveis vencidos agora no Firestore e enviar push"
              >
                {isCheckingOverdue ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F10F4D]" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-[#F10F4D]" />
                )}
                <span>Disparar Alertas</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isRegistering}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-rose-500/20 transition cursor-pointer"
            >
              {isRegistering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BellRing className="w-4 h-4" />
              )}
              <span>Ativar Web Push no Celular</span>
            </button>
          )}
        </div>
      </div>

      {testResult && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {overdueResult && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-semibold flex items-center gap-2">
          <Send size={16} className="text-blue-600 shrink-0" />
          <span>{overdueResult}</span>
        </div>
      )}

      {isIOS && !isPWA && (
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
          <Info size={16} className="text-[#F10F4D] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800">Dica para iPhone / iPad (iOS 16.4+):</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Para receber Web Push no iOS mesmo com o Safari fechado, adicione o aplicativo à sua <strong>Tela de Início</strong> tocando no botão Compartilhar do Safari e selecionando <em>"Adicionar à Tela de Início"</em>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
