import { User, Property } from '../types';
import { needsStatusCheck } from '../components/PropertyUpdateAlerts';

export type NotificationSupportStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Converts a base64 URL safe string to a Uint8Array for VAPID applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if the Web Notification API is supported by the current browser/device.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Checks if PushManager is supported in the browser.
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Checks if the app is currently running in standalone PWA mode (installed to home screen).
 */
export function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Gets current notification permission status.
 */
export function getNotificationPermission(): NotificationSupportStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationSupportStatus;
}

/**
 * Requests permission from the user for mobile push & local notifications.
 */
export async function requestNotificationPermission(): Promise<NotificationSupportStatus> {
  if (!isNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationSupportStatus;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Gets the active Service Worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch (err) {
    console.warn('Error getting service worker ready:', err);
    return null;
  }
}

/**
 * Gets the current Web Push subscription if already active
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();
  if (!registration || !registration.pushManager) return null;
  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Fetches the VAPID Public Key from backend API
 */
export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/notifications/vapid-public-key');
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey || null;
  } catch (err) {
    console.warn('Error fetching VAPID public key:', err);
    return null;
  }
}

/**
 * Subscribes the current device/browser to Web Push (VAPID) and registers in Cloud Firestore
 */
export async function subscribeToPushNotifications(user: User): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push Notifications não são suportadas neste navegador/dispositivo.' };
  }

  // 1. Request permission
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') {
    return { success: false, error: 'Permissão de notificação negada pelo usuário.' };
  }

  // 2. Get SW Registration
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return { success: false, error: 'Service Worker não está pronto ou ativo.' };
  }

  // 3. Fetch VAPID Public Key from server
  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) {
    return { success: false, error: 'Não foi possível obter a chave pública VAPID do servidor.' };
  }

  try {
    // 4. Check existing subscription or create new
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    // 5. Send subscription payload to backend to persist in Cloud Firestore
    const token = localStorage.getItem('token') || localStorage.getItem('lopes_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const subJson = subscription.toJSON();
    const saveRes = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscription: subJson,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username
        }
      })
    });

    if (!saveRes.ok) {
      const errorData = await saveRes.json().catch(() => ({}));
      return { success: false, error: errorData.error || 'Falha ao registrar assinatura no servidor.' };
    }

    return { success: true, subscription };
  } catch (err: any) {
    console.error('Error subscribing to push notifications:', err);
    return { success: false, error: err.message || 'Erro ao registrar Web Push.' };
  }
}

/**
 * Unsubscribes the current device/browser from Web Push notifications
 */
export async function unsubscribeFromPushNotifications(user?: User): Promise<boolean> {
  try {
    const subscription = await getCurrentPushSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    const token = localStorage.getItem('token') || localStorage.getItem('lopes_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        endpoint,
        userId: user?.id
      })
    });

    return true;
  } catch (err) {
    console.warn('Error unsubscribing from push notifications:', err);
    return false;
  }
}

export interface MobileNotificationOptions {
  title: string;
  body: string;
  data?: Record<string, any>;
  tag?: string;
  silent?: boolean;
}

/**
 * Sends a native system notification through the active Service Worker or Notification API.
 */
export async function sendMobileNotification({
  title,
  body,
  data,
  tag = 'lopes-captacao-notification',
  silent = false
}: MobileNotificationOptions): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const options: NotificationOptions & Record<string, any> = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag,
    renotify: true,
    silent,
    vibrate: [200, 100, 200, 100, 200],
    data: data || { url: '/?view=reminder' }
  };

  try {
    // 1. Try via Service Worker (preferred for mobile PWA notifications)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        return true;
      }
    }

    // 2. Fallback to Window Notification constructor
    new Notification(title, options);
    return true;
  } catch (err) {
    console.warn('Failed to dispatch local notification:', err);
    return false;
  }
}

/**
 * Sends a test notification to verify that push & local notifications are working on the device.
 * First tries backend Web Push if registered, with graceful local fallback.
 */
export async function sendTestNotification(user?: User): Promise<{ success: boolean; mode: 'push' | 'local'; message: string }> {
  const perm = getNotificationPermission();
  if (perm !== 'granted') {
    const newPerm = await requestNotificationPermission();
    if (newPerm !== 'granted') {
      return { success: false, mode: 'local', message: 'Permissão de notificação negada.' };
    }
  }

  // 1. Try Web Push via Backend API if user is available
  if (user) {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('lopes_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers,
        body: JSON.stringify({ user })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, mode: 'push', message: data.message || 'Web Push entregue com sucesso!' };
      }
    } catch (err) {
      console.warn('Backend push test failed, falling back to local notification:', err);
    }
  }

  // 2. Fallback to local Service Worker notification
  const sent = await sendMobileNotification({
    title: '🔔 Lopes Captação - Notificação Ativa!',
    body: 'As notificações estão funcionando perfeitamente no seu dispositivo.',
    tag: 'lopes-test-notification',
    data: { url: '/?view=reminder', type: 'TEST' }
  });

  return {
    success: sent,
    mode: 'local',
    message: sent ? 'Notificação de teste exibida com sucesso!' : 'Falha ao exibir notificação.'
  };
}

/**
 * Triggers the backend server to scan all overdue properties in Firestore
 * and dispatch Web Push alerts to all captadores with pending properties.
 */
export async function triggerBackendOverdueCheck(): Promise<{
  success: boolean;
  overduePropertiesCount?: number;
  usersNotified?: number;
  message?: string;
}> {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('lopes_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/notifications/check-overdue', {
      method: 'POST',
      headers
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Error triggering backend overdue check:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Client-side periodic checker for overdue properties of the logged in user
 */
export async function checkAndNotifyOverdueProperties(
  user: User | null,
  properties: Property[],
  force: boolean = false
): Promise<boolean> {
  if (!user) return false;

  // Never notify admins or gestores
  const isAdminOrGestor = user.role === 'MASTER_ADMIN' || user.role === 'GESTOR' || user.role === 'GESTORA';
  if (isAdminOrGestor) return false;

  if (getNotificationPermission() !== 'granted') return false;

  const isOwnedByCurrentUser = (p: Property) =>
    p.user_id === user.id ||
    p.user_id?.toLowerCase() === user.id?.toLowerCase() ||
    p.user_id?.toLowerCase() === user.username?.toLowerCase() ||
    p.user_id?.toLowerCase() === user.email?.toLowerCase();

  const userProperties = properties.filter(isOwnedByCurrentUser);
  const overdueProperties = userProperties.filter(needsStatusCheck);

  if (overdueProperties.length === 0) return false;

  const storageKey = `lopes_pwa_last_overdue_notif_${user.id}`;
  const lastNotifiedStr = localStorage.getItem(storageKey);
  const now = Date.now();

  // Cooldown of 8 hours unless forced
  const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
  if (!force && lastNotifiedStr) {
    const lastNotified = parseInt(lastNotifiedStr, 10);
    if (!isNaN(lastNotified) && now - lastNotified < EIGHT_HOURS_MS) {
      return false; // already notified recently
    }
  }

  const count = overdueProperties.length;
  const title = `🔔 ${count} ${count > 1 ? 'imóveis precisam' : 'imóvel precisa'} de atualização`;
  const body =
    count === 1
      ? `O imóvel ${overdueProperties[0].code} está há mais de 30 dias sem confirmação com o proprietário.`
      : `Você possui ${count} imóveis há mais de 30 dias sem confirmação de status com o proprietário.`;

  const sent = await sendMobileNotification({
    title,
    body,
    tag: 'lopes-overdue-reminder',
    data: {
      url: '/?view=reminder',
      type: 'OVERDUE_ALERT',
      count,
      userId: user.id
    }
  });

  if (sent) {
    localStorage.setItem(storageKey, String(now));
  }

  return sent;
}
