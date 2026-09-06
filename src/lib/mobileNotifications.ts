import { User, Property, ScheduleEvent } from '../types';
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
  const title = count === 1
    ? `🔔 1 imóvel precisa de atualização (7 dias)`
    : `🔔 ${count} imóveis precisam de atualização (7 dias)`;
  const body =
    count === 1
      ? `O imóvel ${overdueProperties[0].code ? `[${overdueProperties[0].code}] ` : ''}"${overdueProperties[0].title}" completou 7 dias sem confirmação. Atualize o status com o proprietário.`
      : `Você possui ${count} imóveis pendentes de atualização (completaram 7 dias ou mais). Atualize para manter sua carteira ativa.`;

  const sent = await sendMobileNotification({
    title,
    body,
    tag: `lopes-overdue-7days-${new Date().toISOString().slice(0, 10)}`,
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

/**
 * Helper to get user's visits today, visits tomorrow, and unconfirmed gestor events
 */
export function getUserScheduleAlertsData(
  user: User | null,
  events: ScheduleEvent[]
): {
  visitsToday: ScheduleEvent[];
  visitsTomorrow: ScheduleEvent[];
  unconfirmedGestorEvents: ScheduleEvent[];
  totalAlertsCount: number;
} {
  if (!user || !Array.isArray(events)) {
    return {
      visitsToday: [],
      visitsTomorrow: [],
      unconfirmedGestorEvents: [],
      totalAlertsCount: 0
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrow = tomorrowObj.toISOString().slice(0, 10);

  // 1. Visits strictly for the current user (never shows other captador visits)
  const isMyVisit = (ev: ScheduleEvent) =>
    ev.type === 'VISITA' &&
    (ev.user_id === user.id ||
      ev.user_id?.toLowerCase() === user.id?.toLowerCase() ||
      ev.user_id?.toLowerCase() === user.username?.toLowerCase() ||
      ev.user_id?.toLowerCase() === user.email?.toLowerCase());

  const visitsToday = events.filter(ev => isMyVisit(ev) && ev.date === today);
  const visitsTomorrow = events.filter(ev => isMyVisit(ev) && ev.date === tomorrow);

  // 2. Gestor events/meetings/trainings where the current user hasn't confirmed attendance
  const gestorTypes = ['EVENTO', 'REUNIAO', 'TREINAMENTO'];
  const unconfirmedGestorEvents = events.filter(ev => {
    if (!gestorTypes.includes(ev.type)) return false;
    if (ev.date < today) return false; // past events don't need reminder
    const confirmed = ev.confirmed_attendees || [];
    return !confirmed.includes(user.id);
  });

  const totalAlertsCount = visitsToday.length + visitsTomorrow.length + unconfirmedGestorEvents.length;

  return {
    visitsToday,
    visitsTomorrow,
    unconfirmedGestorEvents,
    totalAlertsCount
  };
}

/**
 * Client-side local notification dispatcher for schedule alerts (Visits & Gestor Events)
 */
export async function checkAndNotifyScheduleAlerts(
  user: User | null,
  events: ScheduleEvent[],
  force: boolean = false
): Promise<{ visitsNotified: number; eventsNotified: number }> {
  if (!user || getNotificationPermission() !== 'granted') {
    return { visitsNotified: 0, eventsNotified: 0 };
  }

  const { visitsToday, visitsTomorrow, unconfirmedGestorEvents } = getUserScheduleAlertsData(user, events);
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

  let visitsNotified = 0;
  let eventsNotified = 0;

  // 1. Notify today's visits
  if (visitsToday.length > 0) {
    const keyToday = `lopes_notif_visit_today_${user.id}_${today}`;
    const lastNotified = localStorage.getItem(keyToday);
    if (force || !lastNotified || now - parseInt(lastNotified, 10) > FOUR_HOURS_MS) {
      const v = visitsToday[0];
      const title = visitsToday.length === 1
        ? `🔔 Você tem Visita Hoje às ${v.start_time}!`
        : `🔔 Você tem ${visitsToday.length} Visitas Hoje!`;
      const body = visitsToday.length === 1
        ? `Cliente: ${v.client_name || 'Agendado'}${v.property_code ? ` | Imóvel ${v.property_code}` : ''}${v.location ? ` | Local: ${v.location}` : ''}`
        : `Primeira visita às ${v.start_time} com ${v.client_name || 'Cliente'}. Verifique sua agenda.`;

      const sent = await sendMobileNotification({
        title,
        body,
        tag: `lopes-visit-today-${today}`,
        data: { url: '/?view=schedule', type: 'VISIT_ALERT' }
      });
      if (sent) {
        localStorage.setItem(keyToday, String(now));
        visitsNotified += visitsToday.length;
      }
    }
  }

  // 2. Notify tomorrow's visits (1 day before)
  if (visitsTomorrow.length > 0) {
    const keyTomorrow = `lopes_notif_visit_tomorrow_${user.id}_${today}`;
    const lastNotified = localStorage.getItem(keyTomorrow);
    if (force || !lastNotified || now - parseInt(lastNotified, 10) > FOUR_HOURS_MS) {
      const v = visitsTomorrow[0];
      const title = visitsTomorrow.length === 1
        ? `📅 Visita Amanhã às ${v.start_time}`
        : `📅 Você tem ${visitsTomorrow.length} Visitas Amanhã`;
      const body = `Cliente: ${v.client_name || 'Agendado'}${v.property_code ? ` | Imóvel ${v.property_code}` : ''}. Prepare o atendimento!`;

      const sent = await sendMobileNotification({
        title,
        body,
        tag: `lopes-visit-tomorrow-${today}`,
        data: { url: '/?view=schedule', type: 'VISIT_ALERT' }
      });
      if (sent) {
        localStorage.setItem(keyTomorrow, String(now));
        visitsNotified += visitsTomorrow.length;
      }
    }
  }

  // 3. Notify Gestor Events/Meetings/Trainings without confirmed presence
  if (unconfirmedGestorEvents.length > 0) {
    const keyEvent = `lopes_notif_unconfirmed_event_${user.id}_${today}`;
    const lastNotified = localStorage.getItem(keyEvent);
    if (force || !lastNotified || now - parseInt(lastNotified, 10) > FOUR_HOURS_MS) {
      const ev = unconfirmedGestorEvents[0];
      const typeLabel = ev.type === 'REUNIAO' ? 'Reunião' : ev.type === 'TREINAMENTO' ? 'Treinamento' : 'Evento';
      const isEventToday = ev.date === today;

      const title = isEventToday
        ? `🔔 ${typeLabel} Hoje às ${ev.start_time}: ${ev.title}`
        : `📢 Lembrete de ${typeLabel}: ${ev.title}`;
      const body = `${isEventToday ? 'Hoje' : ev.date} às ${ev.start_time}. Confirme sua presença no app da Lopes!`;

      const sent = await sendMobileNotification({
        title,
        body,
        tag: `lopes-event-reminder-${ev.id}-${today}`,
        data: { url: '/?view=schedule', type: 'EVENT_REMINDER', eventId: ev.id }
      });
      if (sent) {
        localStorage.setItem(keyEvent, String(now));
        eventsNotified++;
      }
    }
  }

  return { visitsNotified, eventsNotified };
}

/**
 * Triggers backend schedule alerts check via API
 */
export async function triggerBackendScheduleCheck(): Promise<{
  success: boolean;
  totalNotificationsDelivered?: number;
  visitsTodayCount?: number;
  visitsTomorrowCount?: number;
  message?: string;
}> {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('lopes_auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/notifications/check-schedule', {
      method: 'POST',
      headers
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Error triggering backend schedule check:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Triggers full backend check for both overdue properties and schedule alerts
 */
export async function triggerBackendCheckAll(): Promise<{
  success: boolean;
  message?: string;
  overdueProperties?: any;
  scheduleAlerts?: any;
}> {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('lopes_auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/notifications/check-all', {
      method: 'POST',
      headers
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Error triggering backend check all:', err);
    return { success: false, message: err.message };
  }
}
