import webpush from 'web-push';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { User, Property } from '../types';

let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contato@lopesmanaus.com.br';

let isWebPushInitialized = false;

/**
 * Initialize Web Push with persistent VAPID keys stored in Firestore or Env
 */
export async function initializeWebPush(db: Firestore): Promise<{ publicKey: string }> {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      // Check Firestore settings for saved VAPID keys
      const vapidDocRef = doc(db, 'settings', 'vapid');
      const vapidSnap = await getDoc(vapidDocRef);

      if (vapidSnap.exists() && vapidSnap.data()?.publicKey && vapidSnap.data()?.privateKey) {
        vapidPublicKey = vapidSnap.data().publicKey;
        vapidPrivateKey = vapidSnap.data().privateKey;
        console.log('[WebPush] Loaded existing VAPID keys from Cloud Firestore.');
      } else {
        // Generate new key pair and persist in Cloud Firestore
        const keys = webpush.generateVAPIDKeys();
        vapidPublicKey = keys.publicKey;
        vapidPrivateKey = keys.privateKey;
        await setDoc(vapidDocRef, {
          publicKey: vapidPublicKey,
          privateKey: vapidPrivateKey,
          subject: vapidSubject,
          created_at: new Date().toISOString()
        });
        console.log('[WebPush] Generated and saved new persistent VAPID keys in Cloud Firestore.');
      }
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    isWebPushInitialized = true;
    console.log('[WebPush] Web Push service initialized successfully with VAPID.');
    return { publicKey: vapidPublicKey };
  } catch (err) {
    console.error('[WebPush] Error initializing Web Push service:', err);
    // Fallback key generation in memory if Firestore is unavailable
    if (!vapidPublicKey || !vapidPrivateKey) {
      const keys = webpush.generateVAPIDKeys();
      vapidPublicKey = keys.publicKey;
      vapidPrivateKey = keys.privateKey;
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      isWebPushInitialized = true;
    }
    return { publicKey: vapidPublicKey };
  }
}

/**
 * Get current public VAPID key
 */
export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

/**
 * Generate unique document ID for an endpoint
 */
function getEndpointDocId(endpoint: string, userId: string): string {
  const safeEnd = endpoint.replace(/[^a-zA-Z0-9]/g, '').slice(-32);
  const safeUser = (userId || 'anon').replace(/[^a-zA-Z0-9]/g, '');
  return `sub_${safeUser}_${safeEnd}`;
}

/**
 * Save / Update a push subscription in Cloud Firestore
 */
export async function savePushSubscription(
  db: Firestore,
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    expirationTime?: number | null;
  },
  user: { id: string; name: string; email?: string; username?: string },
  userAgent?: string
): Promise<{ success: boolean; id: string }> {
  const docId = getEndpointDocId(subscription.endpoint, user.id);
  const subData = {
    id: docId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    expirationTime: subscription.expirationTime || null,
    user_id: user.id,
    user_name: user.name,
    user_email: user.email || '',
    user_agent: userAgent || '',
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  const docRef = doc(db, 'push_subscriptions', docId);
  await setDoc(docRef, subData, { merge: true });
  console.log(`[WebPush] Subscription saved in Firestore for user ${user.name} (${docId})`);
  return { success: true, id: docId };
}

/**
 * Remove a push subscription from Cloud Firestore
 */
export async function removePushSubscription(
  db: Firestore,
  endpoint: string,
  userId: string
): Promise<{ success: boolean }> {
  const docId = getEndpointDocId(endpoint, userId);
  try {
    const docRef = doc(db, 'push_subscriptions', docId);
    await deleteDoc(docRef);
    console.log(`[WebPush] Subscription deleted from Firestore (${docId})`);
    return { success: true };
  } catch (err) {
    console.warn(`[WebPush] Error deleting subscription (${docId}):`, err);
    return { success: false };
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    propertyId?: string;
    type?: string;
    [key: string]: any;
  };
  actions?: Array<{ action: string; title: string; icon?: string }>;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Send Web Push notification to a specific stored subscription
 */
export async function sendWebPushNotification(
  db: Firestore,
  subDoc: { id: string; endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload
): Promise<boolean> {
  if (!isWebPushInitialized && vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    isWebPushInitialized = true;
  }

  const pushSubscription = {
    endpoint: subDoc.endpoint,
    keys: subDoc.keys
  };

  const stringifiedPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: payload.data || { url: '/?view=reminder' },
    tag: payload.tag || 'lopes-notification',
    requireInteraction: payload.requireInteraction ?? true,
    actions: payload.actions || [{ action: 'open', title: 'Abrir no App' }]
  });

  try {
    await webpush.sendNotification(pushSubscription, stringifiedPayload, {
      TTL: 60 * 60 * 24 // 24 hours
    });
    return true;
  } catch (err: any) {
    console.warn(`[WebPush] Push delivery failed for ${subDoc.id}:`, err?.statusCode || err?.message);
    // If expired or invalid (404 Not Found or 410 Gone), prune from Firestore
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      try {
        await deleteDoc(doc(db, 'push_subscriptions', subDoc.id));
        console.log(`[WebPush] Pruned expired push subscription (${subDoc.id})`);
      } catch {}
    }
    return false;
  }
}

/**
 * Send Web Push to all devices of a specific user
 */
export async function sendPushToUser(
  db: Firestore,
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; total: number }> {
  try {
    const q = query(collection(db, 'push_subscriptions'), where('user_id', '==', userId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { sent: 0, total: 0 };
    }

    let sent = 0;
    for (const d of snap.docs) {
      const data = d.data() as any;
      if (data.endpoint && data.keys) {
        const success = await sendWebPushNotification(
          db,
          { id: d.id, endpoint: data.endpoint, keys: data.keys },
          payload
        );
        if (success) sent++;
      }
    }

    return { sent, total: snap.size };
  } catch (err) {
    console.error(`[WebPush] Error sending push to user ${userId}:`, err);
    return { sent: 0, total: 0 };
  }
}

/**
 * Automated Checker: Scans all properties in Firestore, identifies overdue listings,
 * and delivers real Web Push notifications to the respective captadores.
 */
export async function checkAndDispatchOverduePropertyAlerts(db: Firestore): Promise<{
  totalPropertiesChecked: number;
  overduePropertiesCount: number;
  usersNotified: number;
  notificationsDelivered: number;
  details: Array<{ user_id: string; user_name: string; overdue_count: number; delivered: boolean }>;
}> {
  try {
    const propsSnap = await getDocs(collection(db, 'properties'));
    const allProperties = propsSnap.docs.map(d => d.data() as Property);

    const usersSnap = await getDocs(collection(db, 'users'));
    const allUsers = usersSnap.docs.map(d => d.data() as User);

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Filter properties older than 7 days without update (or completing 7 days since registration/check)
    const overdueProperties = allProperties.filter(p => {
      // Only check active listings (Disponível / Reservado)
      if (p.status !== 'Disponível' && p.status !== 'Reservado') {
        return false;
      }
      const lastCheckDate = p.last_status_check || p.updated_at || p.created_at;
      const lastCheck = lastCheckDate ? new Date(lastCheckDate).getTime() : 0;
      return (now - lastCheck) >= SEVEN_DAYS_MS;
    });

    // Group overdue properties by captador (user_id)
    const overdueByUser: Record<string, Property[]> = {};
    for (const p of overdueProperties) {
      if (p.user_id) {
        if (!overdueByUser[p.user_id]) {
          overdueByUser[p.user_id] = [];
        }
        overdueByUser[p.user_id].push(p);
      }
    }

    let usersNotified = 0;
    let notificationsDelivered = 0;
    const details: Array<{ user_id: string; user_name: string; overdue_count: number; delivered: boolean }> = [];

    // Dispatch Web Push to each captador with overdue properties (daily alert until all updated)
    for (const [userId, userOverdueProps] of Object.entries(overdueByUser)) {
      const user = allUsers.find(u => u.id === userId || u.username?.toLowerCase() === userId?.toLowerCase());
      const userName = user?.name || 'Captador';
      const count = userOverdueProps.length;

      const title = count === 1
        ? `🔔 1 imóvel precisa de atualização (7 dias)`
        : `🔔 ${count} imóveis precisam de atualização (7 dias)`;

      const firstTitle = userOverdueProps[0]?.title || 'Imóvel em carteira';
      const firstCode = userOverdueProps[0]?.code ? `[${userOverdueProps[0].code}] ` : '';
      const body = count === 1
        ? `O imóvel ${firstCode}"${firstTitle}" completou 7 dias sem atualização. Confirme o status com o proprietário.`
        : `Você possui ${count} imóveis pendentes de atualização (a cada 7 dias). Toque para confirmar e manter tudo em dia.`;

      const pushResult = await sendPushToUser(db, userId, {
        title,
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: {
          url: '/?view=reminder',
          type: 'OVERDUE_PROPERTIES_ALERT',
          overdueCount: count
        },
        actions: [
          { action: 'open_reminder', title: 'Atualizar Imóveis' }
        ],
        tag: `overdue-7days-alert-${userId}-${new Date().toISOString().slice(0, 10)}`
      });

      if (pushResult.sent > 0) {
        usersNotified++;
        notificationsDelivered += pushResult.sent;
      }

      details.push({
        user_id: userId,
        user_name: userName,
        overdue_count: count,
        delivered: pushResult.sent > 0
      });
    }

    return {
      totalPropertiesChecked: allProperties.length,
      overduePropertiesCount: overdueProperties.length,
      usersNotified,
      notificationsDelivered,
      details
    };
  } catch (err) {
    console.error('[WebPush] Error during automated overdue property check:', err);
    throw err;
  }
}
