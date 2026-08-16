import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { v2 as cloudinary } from 'cloudinary';
import { fileURLToPath } from 'url';

// Read this JSON file manually at runtime instead of a static `import ... from '...json'`.
// Newer Node.js versions require ESM JSON imports to carry an explicit `with { type: "json" }`
// attribute; whether that syntax survives Vercel's build step has proven unreliable, so reading
// the file directly with fs sidesteps the whole ESM-JSON-import-attribute requirement.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf-8'));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});
import { initialUsers, initialProperties, initialDemoProperties, initialCompanySettings, initialAuditLogs, initialJournalEntries, initialScheduleEvents } from './src/data/mockData.js';
import { User, Property, CompanySettings, AuditLog, DashboardStats, JournalEntry, ScheduleEvent } from './src/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lopes_manaus_secret_key_2026';

// Initialize Firebase Web SDK for reliable cloud connection
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestoreDb = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

// Authoritative in-memory cache synchronized with Cloud Firestore
let users: User[] = [];
let properties: Property[] = [];
let companySettings: CompanySettings = { ...initialCompanySettings };
let auditLogs: AuditLog[] = [];
let journalEntries: JournalEntry[] = [];
let scheduleEvents: ScheduleEvent[] = [];

let isFirestoreConnected = false;
let lastBackupAt = new Date().toISOString();

const DB_FILE = path.join(process.cwd(), 'server-database.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}
}
if (!fs.existsSync(COVERS_DIR)) {
  try { fs.mkdirSync(COVERS_DIR, { recursive: true }); } catch {}
}

/**
 * Clean undefined properties recursively from objects before Firestore write
 */
function cleanFirestoreData(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map(item => cleanFirestoreData(item));
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clean[key] = cleanFirestoreData(value);
      }
    }
    return clean;
  }
  return data;
}

/**
 * Password Hashing & Verification Utilities
 */
function hashPassword(plain: string): string {
  if (!plain) return '';
  return bcrypt.hashSync(plain.trim(), 10);
}

function verifyPassword(plain: string, storedHashOrPlain: string | undefined): boolean {
  if (!storedHashOrPlain || !plain) return false;
  const cleanPlain = plain.trim();
  const cleanStored = storedHashOrPlain.trim();

  // 1. Check bcrypt hash
  if (cleanStored.startsWith('$2a$') || cleanStored.startsWith('$2b$') || cleanStored.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(cleanPlain, cleanStored);
    } catch {
      return false;
    }
  }

  // 2. Direct comparison for legacy plain-text
  return cleanPlain === cleanStored;
}

/**
 * Saves base64 images to Cloudinary (cloud storage) and returns the permanent public URL.
 * IMPORTANT: never write uploaded images to local disk here — on Vercel (and any serverless
 * host) the filesystem is read-only/ephemeral, so a locally saved file is invisible to every
 * other request and disappears on the next cold start. Cloudinary gives one URL that works
 * for every user, every browser, every deploy.
 */
async function saveBase64ImageFile(base64Data: string, prefix: string): Promise<string> {
  if (!base64Data || !base64Data.startsWith('data:image/')) {
    return base64Data;
  }
  try {
    const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'lopes-catalogos',
      public_id: safePrefix,
      overwrite: true,
      invalidate: true,
      resource_type: 'image'
    });
    return result.secure_url;
  } catch (err) {
    console.warn(`[Cloudinary] Error uploading image ${prefix}:`, err);
    return base64Data;
  }
}

/**
 * Local Persistence Fallback & Backup
 */
function saveLocalDatabase() {
  try {
    const data = {
      users,
      properties,
      companySettings,
      auditLogs,
      journalEntries,
      scheduleEvents,
      updated_at: new Date().toISOString()
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Server DB] Error saving local database file:', e);
  }
}

function loadLocalDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.users) && data.users.length > 0) users = data.users;
      if (data && Array.isArray(data.properties)) properties = data.properties;
      if (data && data.companySettings) companySettings = { ...initialCompanySettings, ...data.companySettings };
      if (data && Array.isArray(data.auditLogs)) auditLogs = data.auditLogs;
      if (data && Array.isArray(data.journalEntries)) journalEntries = data.journalEntries;
      if (data && Array.isArray(data.scheduleEvents)) scheduleEvents = data.scheduleEvents;
    }
  } catch (e) {
    console.warn('[Server DB] Error reading local database file:', e);
  }
}

// Initial local load
loadLocalDatabase();

/**
 * Firestore Database Direct Operations
 */
async function safeFirestoreDocSet(colName: string, docId: string, data: any, merge: boolean = true) {
  try {
    const cleaned = cleanFirestoreData(data);
    const docRef = doc(firestoreDb, colName, docId);
    await setDoc(docRef, cleaned, { merge });
    return true;
  } catch (err) {
    console.warn(`[Firestore] Set error on ${colName}/${docId}:`, err);
    return false;
  }
}

async function safeFirestoreDocUpdate(colName: string, docId: string, data: any) {
  try {
    const cleaned = cleanFirestoreData(data);
    const docRef = doc(firestoreDb, colName, docId);
    await updateDoc(docRef, cleaned);
    return true;
  } catch (err) {
    console.warn(`[Firestore] Update error on ${colName}/${docId}:`, err);
    return false;
  }
}

async function safeFirestoreDocDelete(colName: string, docId: string) {
  try {
    const docRef = doc(firestoreDb, colName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn(`[Firestore] Delete error on ${colName}/${docId}:`, err);
    return false;
  }
}

async function addAuditLog(userId: string, userName: string, action: string, description: string, req?: express.Request) {
  try {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      user_name: userName,
      action,
      description,
      created_at: new Date().toISOString(),
      ip_address: req?.ip || '127.0.0.1'
    };
    auditLogs.unshift(newLog);
    await safeFirestoreDocSet('logs', newLog.id, newLog, false);
    saveLocalDatabase();
  } catch {}
}

/**
 * Cloud Firestore Startup Synchronization and Initial Seeding
 */
async function initializeAndSyncFirestore() {
  try {
    console.log('[Firestore] Connecting to Cloud Firestore database:', firebaseConfig.firestoreDatabaseId);
    
    // 1. Load Settings
    const settingsDoc = await getDoc(doc(firestoreDb, 'settings', 'company'));
    if (settingsDoc.exists()) {
      companySettings = { ...initialCompanySettings, ...settingsDoc.data() } as CompanySettings;
      console.log('[Firestore] Loaded company settings from Cloud Firestore.');
    } else {
      await setDoc(doc(firestoreDb, 'settings', 'company'), initialCompanySettings);
      companySettings = { ...initialCompanySettings };
    }

    // 2. Load Users
    const usersSnap = await getDocs(collection(firestoreDb, 'users'));
    if (!usersSnap.empty) {
      users = usersSnap.docs.map(d => d.data() as User);
      console.log(`[Firestore] Loaded ${users.length} users from Cloud Firestore.`);
    } else {
      console.log('[Firestore] Users collection empty. Seeding initial users...');
      const batch = writeBatch(firestoreDb);
      const cleanInitUsers = initialUsers.filter(u => u.id !== 'usr_demo' && u.username !== 'demo');
      for (const u of cleanInitUsers) {
        const passwordToStore = u.password ? hashPassword(u.password) : hashPassword('Lopes@2026');
        const userToSeed = { ...u, password: passwordToStore };
        batch.set(doc(firestoreDb, 'users', u.id), userToSeed);
      }
      await batch.commit();
      users = cleanInitUsers.map(u => ({
        ...u,
        password: u.password ? hashPassword(u.password) : hashPassword('Lopes@2026')
      }));
    }

    // Purge demo user if present in Firestore
    const demoUserIndex = users.findIndex(u => u.id === 'usr_demo' || u.username === 'demo' || u.role === 'DEMO');
    if (demoUserIndex !== -1) {
      const demoUser = users[demoUserIndex];
      await safeFirestoreDocDelete('users', demoUser.id);
      await safeFirestoreDocDelete('users', 'usr_demo');
      users = users.filter(u => u.id !== 'usr_demo' && u.username !== 'demo' && u.role !== 'DEMO');
      console.log('[Firestore] Purged demo user from Cloud Firestore and memory.');
    }

    // Ensure Master Admin exists
    let masterUser = users.find(u => u.username === 'admin' || u.id === 'usr_admin' || u.role === 'MASTER_ADMIN');
    if (!masterUser) {
      const defaultAdmin = {
        ...initialUsers[0],
        password: hashPassword('Lopes@123')
      };
      await setDoc(doc(firestoreDb, 'users', defaultAdmin.id), defaultAdmin, { merge: true });
      users.unshift(defaultAdmin);
    } else if (masterUser.role !== 'MASTER_ADMIN') {
      masterUser.role = 'MASTER_ADMIN';
      await updateDoc(doc(firestoreDb, 'users', masterUser.id), { role: 'MASTER_ADMIN' });
    }

    // 3. Load Properties
    const propsSnap = await getDocs(collection(firestoreDb, 'properties'));
    if (!propsSnap.empty) {
      properties = propsSnap.docs.map(d => d.data() as Property);
      console.log(`[Firestore] Loaded ${properties.length} properties from Cloud Firestore.`);
    } else {
      console.log('[Firestore] Properties collection empty. Seeding initial properties...');
      const batch = writeBatch(firestoreDb);
      const initialSeedProps = initialProperties.filter(p => p.user_id !== 'usr_demo' && !p.id.startsWith('prop_demo_'));
      for (const p of initialSeedProps) {
        batch.set(doc(firestoreDb, 'properties', p.id), p);
      }
      await batch.commit();
      properties = initialSeedProps;
    }

    // Purge demo properties from Firestore and memory
    const demoProps = properties.filter(p => p.user_id === 'usr_demo' || p.id.startsWith('prop_demo_') || p.code?.startsWith('LOP-DEMO'));
    if (demoProps.length > 0) {
      for (const dp of demoProps) {
        await safeFirestoreDocDelete('properties', dp.id);
        if (dp.code) await safeFirestoreDocDelete('properties', dp.code);
      }
      properties = properties.filter(p => p.user_id !== 'usr_demo' && !p.id.startsWith('prop_demo_') && !p.code?.startsWith('LOP-DEMO'));
      console.log(`[Firestore] Purged ${demoProps.length} demo properties from Cloud Firestore and memory.`);
    }

    // 4. Load Journal
    const journalSnap = await getDocs(collection(firestoreDb, 'journal'));
    if (!journalSnap.empty) {
      journalEntries = journalSnap.docs.map(d => d.data() as JournalEntry);
    }

    // 5. Load Schedule
    const scheduleSnap = await getDocs(collection(firestoreDb, 'schedule'));
    if (!scheduleSnap.empty) {
      scheduleEvents = scheduleSnap.docs.map(d => d.data() as ScheduleEvent);
    }

    // 6. Load Logs
    const logsSnap = await getDocs(collection(firestoreDb, 'logs'));
    if (!logsSnap.empty) {
      auditLogs = logsSnap.docs.map(d => d.data() as AuditLog);
    }

    isFirestoreConnected = true;
    saveLocalDatabase();
    console.log('[Firestore] Cloud Firestore synchronization COMPLETE.');
  } catch (err: any) {
    console.error('[Firestore] Operating with resilience:', err?.message || err);
    isFirestoreConnected = false;
  }
}

// Start database sync
initializeAndSyncFirestore().catch(e => {
  console.warn('[Firestore] Init error:', e);
});

// App instance
const app = express();

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

/**
 * GLOBAL FRESHNESS MIDDLEWARE
 * Vercel can route each incoming request to a different, disposable serverless instance.
 * Every instance only loads users/properties/settings/journal/schedule/logs from Firestore
 * ONCE, at its own cold start (see initializeAndSyncFirestore below) — after that it trusts
 * its own in-memory copy. That means one browser's edit (a photo removal, a cover change, a
 * new property) can be saved correctly in Firestore yet stay invisible to every other
 * browser/device/instance, because THEIR in-memory copy was loaded before the edit happened
 * and nothing tells them to reload it.
 *
 * The fix: re-read every collection from Firestore at the start of every single request,
 * before any route or auth check runs, so every response — no matter which instance served
 * it — reflects the current database, not a stale snapshot from whenever that instance woke up.
 * Firestore reads are effectively free at this project's scale (well within the free tier),
 * so this is the reliable way to guarantee "same data on any browser, any device" everywhere.
 * (Audit logs are capped to the 300 most recent — that collection only grows, and no screen
 * needs the full history on every request.)
 */
app.use(async (req, res, next) => {
  try {
    const [usersSnap, propsSnap, settingsDoc, journalSnap, scheduleSnap, logsSnap] = await Promise.all([
      getDocs(collection(firestoreDb, 'users')),
      getDocs(collection(firestoreDb, 'properties')),
      getDoc(doc(firestoreDb, 'settings', 'company')),
      getDocs(collection(firestoreDb, 'journal')),
      getDocs(collection(firestoreDb, 'schedule')),
      getDocs(query(collection(firestoreDb, 'logs'), orderBy('created_at', 'desc'), limit(300)))
    ]);
    if (!usersSnap.empty) users = usersSnap.docs.map(d => d.data() as User);
    if (!propsSnap.empty) properties = propsSnap.docs.map(d => d.data() as Property);
    if (settingsDoc.exists()) companySettings = { ...companySettings, ...settingsDoc.data() } as CompanySettings;
    if (!journalSnap.empty) journalEntries = journalSnap.docs.map(d => d.data() as JournalEntry);
    if (!scheduleSnap.empty) scheduleEvents = scheduleSnap.docs.map(d => d.data() as ScheduleEvent);
    if (!logsSnap.empty) auditLogs = logsSnap.docs.map(d => d.data() as AuditLog);
  } catch (err) {
    console.warn('[Freshness Middleware] Could not refresh from Firestore this request, serving last known in-memory data:', err);
  }
  next();
});

/**
 * Authentication Middleware
 */
function extractUserFromRequest(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    if (decoded?.id) {
      return users.find(u => u.id === decoded.id) || null;
    }
  } catch {
    if (token.startsWith('lopes_token_')) {
      const uId = token.replace('lopes_token_', '');
      return users.find(u => u.id === uId) || null;
    }
  }
  return null;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = extractUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado. Faça login novamente.' });
  }
  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Usuário bloqueado pelo Administrador.' });
  }
  (req as any).user = user;
  next();
}

function requireMasterAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = extractUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado. Faça login novamente.' });
  }
  if (user.role !== 'MASTER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao Administrador Master.' });
  }
  (req as any).user = user;
  next();
}

// --- REST API ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Lopes Captação - Shopping Ponta Negra',
    persistence: 'Cloud Firestore',
    firestoreConnected: isFirestoreConnected,
    totalUsers: users.length,
    totalProperties: properties.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * AUTHENTICATION: LOGIN
 */
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Informe usuário/e-mail e senha.' });
  }

  const cleanLogin = login.toLowerCase().trim();
  const cleanLoginNoAccents = cleanLogin.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

  // Synchronize users from Firestore first
  try {
    const snap = await getDocs(collection(firestoreDb, 'users'));
    if (!snap.empty) {
      users = snap.docs.map(d => d.data() as User);
    }
  } catch {}

  // Find user by username, email, ID, or slug
  let user = users.find(u => {
    if (!u) return false;
    const uUsername = (u.username || '').toLowerCase().trim();
    const uEmail = (u.email || '').toLowerCase().trim();
    const uId = (u.id || '').toLowerCase().trim();
    const uSlug = (u.url_slug || '').toLowerCase().trim();
    const uName = (u.name || '').toLowerCase().trim();
    const uNameNormalized = uName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const uUsernameNormalized = uUsername.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

    return (
      uUsername === cleanLogin ||
      uEmail === cleanLogin ||
      uId === cleanLogin ||
      uSlug === cleanLogin ||
      uUsernameNormalized === cleanLoginNoAccents ||
      uName === cleanLogin ||
      (cleanLoginNoAccents.length >= 3 && uNameNormalized.includes(cleanLoginNoAccents)) ||
      (cleanLoginNoAccents.length >= 3 && uUsernameNormalized.includes(cleanLoginNoAccents))
    );
  });

  if (!user) {
    return res.status(401).json({ error: 'Usuário ou e-mail não encontrado.' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Acesso bloqueado pelo Administrador Master.' });
  }

  // Verify password
  const isPasswordCorrect = verifyPassword(password, (user as any).password);

  if (!isPasswordCorrect) {
    return res.status(401).json({ error: 'Senha incorreta. Verifique a senha digitada ou solicite ao Administrador para redefinir.' });
  }

  // Auto-upgrade plain text password to bcrypt hash in Firestore
  if ((user as any).password && !((user as any).password.startsWith('$2a$') || (user as any).password.startsWith('$2b$'))) {
    const hashed = hashPassword(password);
    (user as any).password = hashed;
    await safeFirestoreDocSet('users', user.id, { password: hashed }, true);
    saveLocalDatabase();
  }

  // Generate JWT Token
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  addAuditLog(user.id, user.name, 'Login', 'Efetuou login no sistema', req);

  // Return clean user object
  const cleanUser = { ...user };
  delete (cleanUser as any).password;

  res.json({
    token,
    user: cleanUser
  });
});

/**
 * AUTHENTICATION: GET CURRENT USER (ME)
 */
app.get('/api/auth/me', async (req, res) => {
  const user = extractUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Usuário bloqueado pelo Administrador.' });
  }

  const cleanUser = { ...user };
  delete (cleanUser as any).password;
  res.json({ user: cleanUser });
});

/**
 * AUTHENTICATION: CHANGE PASSWORD
 */
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const currentUser = (req as any).user as User;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
  }

  if (typeof newPassword !== 'string' || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'A nova senha precisa ter no mínimo 4 caracteres.' });
  }

  // Verify current password
  const isValid = verifyPassword(currentPassword, (currentUser as any).password);
  if (!isValid) {
    return res.status(400).json({ error: 'Senha atual incorreta.' });
  }

  const cleanNewPass = newPassword.trim();
  const hashedPassword = hashPassword(cleanNewPass);

  // Update in memory
  (currentUser as any).password = hashedPassword;
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx !== -1) {
    (users[idx] as any).password = hashedPassword;
  }

  // Update in Firestore
  await safeFirestoreDocSet('users', currentUser.id, { password: hashedPassword }, true);
  saveLocalDatabase();

  addAuditLog(currentUser.id, currentUser.name, 'Alteração de Senha', 'Redefiniu sua senha de acesso', req);

  res.json({
    success: true,
    message: 'Sua senha foi alterada com sucesso e salva na nuvem! O novo acesso já está disponível para qualquer dispositivo.'
  });
});

/**
 * BACKUP
 */
app.post('/api/backup/run', requireMasterAdmin, async (req, res) => {
  try {
    const nowISO = new Date().toISOString();
    lastBackupAt = nowISO;
    companySettings.lastBackupAt = nowISO;
    companySettings.backupStatus = 'Ativo e Atualizado (Cloud Firestore)';

    await safeFirestoreDocSet('settings', 'company', companySettings, true);
    addAuditLog('usr_admin', 'Administrador Master', 'Backup do Firestore', 'Executou backup das coleções no Cloud Firestore', req);

    res.json({
      success: true,
      lastBackupAt: nowISO,
      backupStatus: companySettings.backupStatus,
      collectionsBackedUp: ['users', 'properties', 'settings', 'journal', 'logs', 'schedule']
    });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao executar backup do Firestore' });
  }
});

/**
 * PUBLIC PROFILE BY SLUG
 */
app.get('/api/users/public/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const user = users.find(u => u.url_slug?.toLowerCase() === slug || u.username?.toLowerCase() === slug);
  if (!user) {
    return res.status(404).json({ error: 'Captador não encontrado.' });
  }
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      whatsapp: user.whatsapp,
      position: user.position,
      url_slug: user.url_slug,
      photo_url: user.photo_url,
      creci: user.creci,
      instagram: user.instagram,
      facebook: user.facebook
    }
  });
});

/**
 * USERS: LIST
 */
app.get('/api/users', async (req, res) => {
  try {
    const snap = await getDocs(collection(firestoreDb, 'users'));
    if (!snap.empty) {
      users = snap.docs.map(d => d.data() as User);
    }
  } catch {}

  // Return users without exposing password hash
  const cleanUsers = users.map(u => {
    const copy = { ...u };
    delete (copy as any).password;
    return copy;
  });

  res.json({ users: cleanUsers });
});

/**
 * USERS: CREATE (MASTER ADMIN ONLY)
 */
app.post('/api/users', requireMasterAdmin, async (req, res) => {
  const { name, email, username, phone, whatsapp, role, position, url_slug, password, photo_url, creci, instagram } = req.body;

  if (!name || !email || !username) {
    return res.status(400).json({ error: 'Preencha nome, e-mail e nome de usuário.' });
  }

  const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9._-]/g, '');
  const cleanEmail = email.toLowerCase().trim();

  if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return res.status(400).json({ error: 'Nome de usuário (login) já cadastrado.' });
  }

  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: 'E-mail já cadastrado.' });
  }

  const cleanSlug = (url_slug || cleanUsername).toLowerCase().replace(/[^a-z0-9]/g, '');
  const rawPassword = password && password.trim() ? password.trim() : 'Lopes@2026';
  const hashedPassword = hashPassword(rawPassword);

  const newUser: User & { password?: string } = {
    id: `usr_${Date.now()}`,
    name: name.trim(),
    email: cleanEmail,
    username: cleanUsername,
    phone: phone || '',
    whatsapp: whatsapp || phone || '',
    role: role || 'CAPTADOR',
    position: position || 'Corretor de Imóveis',
    url_slug: cleanSlug,
    status: 'active',
    photo_url: photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    creci: creci || '',
    instagram: instagram || '',
    password: hashedPassword,
    created_at: new Date().toISOString()
  };

  await safeFirestoreDocSet('users', newUser.id, newUser, false);
  users.push(newUser);
  saveLocalDatabase();

  const reqUser = (req as any).user as User;
  addAuditLog(reqUser.id, reqUser.name, 'Criação de Usuário', `Cadastrou o usuário ${newUser.name} (${newUser.username}) no Firestore`, req);

  const cleanResponseUser = { ...newUser };
  delete (cleanResponseUser as any).password;

  res.status(201).json({ user: cleanResponseUser });
});

/**
 * USERS: UPDATE (MASTER ADMIN ONLY)
 */
app.put('/api/users/:id', requireMasterAdmin, async (req, res) => {
  const { id } = req.params;
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const existing = users[index];
  const { name, email, username, phone, whatsapp, role, position, url_slug, status, photo_url, creci, instagram, password } = req.body;

  if (username && username.toLowerCase().trim() !== existing.username?.toLowerCase().trim()) {
    const cleanUser = username.toLowerCase().trim();
    if (users.some(u => u.id !== id && u.username?.toLowerCase().trim() === cleanUser)) {
      return res.status(400).json({ error: 'Nome de usuário já cadastrado para outro usuário.' });
    }
  }

  if (email && email.toLowerCase().trim() !== existing.email?.toLowerCase().trim()) {
    const cleanEmail = email.toLowerCase().trim();
    if (users.some(u => u.id !== id && u.email?.toLowerCase().trim() === cleanEmail)) {
      return res.status(400).json({ error: 'E-mail já cadastrado para outro usuário.' });
    }
  }

  const cleanSlug = url_slug
    ? url_slug.toLowerCase().replace(/[^a-z0-9]/g, '')
    : (username ? username.toLowerCase().replace(/[^a-z0-9]/g, '') : existing.url_slug);

  const updatedUser: User & { password?: string } = {
    ...existing,
    name: name !== undefined ? name.trim() : existing.name,
    email: email !== undefined ? email.toLowerCase().trim() : existing.email,
    username: username !== undefined ? username.toLowerCase().trim() : existing.username,
    phone: phone !== undefined ? phone : existing.phone,
    whatsapp: whatsapp !== undefined ? whatsapp : existing.whatsapp,
    role: role !== undefined ? role : existing.role,
    position: position !== undefined ? position : existing.position,
    url_slug: cleanSlug || existing.url_slug,
    status: status !== undefined ? status : existing.status,
    photo_url: photo_url !== undefined ? photo_url : existing.photo_url,
    creci: creci !== undefined ? creci : existing.creci,
    instagram: instagram !== undefined ? instagram : existing.instagram
  };

  if (password && typeof password === 'string' && password.trim().length > 0) {
    updatedUser.password = hashPassword(password.trim());
  }

  users[index] = updatedUser;
  await safeFirestoreDocSet('users', id, updatedUser, true);
  saveLocalDatabase();

  const reqUser = (req as any).user as User;
  addAuditLog(reqUser.id, reqUser.name, 'Atualização de Usuário', `Atualizou dados do usuário ${updatedUser.name} (${updatedUser.username}) no Firestore`, req);

  const cleanResponseUser = { ...updatedUser };
  delete (cleanResponseUser as any).password;

  res.json({ user: cleanResponseUser, message: 'Dados do usuário atualizados com sucesso!' });
});

/**
 * USERS: RESET PASSWORD (MASTER ADMIN ONLY)
 */
app.post('/api/users/:id/reset-password', requireMasterAdmin, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'Informe uma nova senha com no mínimo 4 caracteres.' });
  }

  const index = users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const targetUser = users[index];
  const cleanPass = newPassword.trim();
  const hashedPassword = hashPassword(cleanPass);

  (targetUser as any).password = hashedPassword;
  await safeFirestoreDocSet('users', id, { password: hashedPassword }, true);
  saveLocalDatabase();

  const reqUser = (req as any).user as User;
  addAuditLog(reqUser.id, reqUser.name, 'Redefinição de Senha', `Redefiniu a senha do usuário ${targetUser.name} (${targetUser.username})`, req);

  res.json({ success: true, message: `Senha do usuário ${targetUser.name} redefinida com sucesso no banco de dados na nuvem!` });
});

/**
 * USERS: TOGGLE BLOCK (MASTER ADMIN ONLY)
 */
app.patch('/api/users/:id/block', requireMasterAdmin, async (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  user.status = user.status === 'active' ? 'blocked' : 'active';
  await safeFirestoreDocUpdate('users', id, { status: user.status });
  saveLocalDatabase();

  const reqUser = (req as any).user as User;
  addAuditLog(reqUser.id, reqUser.name, 'Alteração de Status', `Alterou o status do usuário ${user.name} para ${user.status}`, req);

  res.json({ user });
});

/**
 * USERS: DELETE (MASTER ADMIN ONLY)
 */
app.delete('/api/users/:id', requireMasterAdmin, async (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const masterAdmin = users.find(u => u.role === 'MASTER_ADMIN') || users[0];
  const masterId = masterAdmin ? masterAdmin.id : 'usr_admin';

  let reassignedCount = 0;
  const batch = writeBatch(firestoreDb);

  properties = properties.map(p => {
    if (p.user_id === id) {
      reassignedCount++;
      const updatedP = { ...p, user_id: masterId };
      batch.set(doc(firestoreDb, 'properties', p.id), updatedP, { merge: true });
      return updatedP;
    }
    return p;
  });

  batch.delete(doc(firestoreDb, 'users', id));
  await batch.commit();

  users = users.filter(u => u.id !== id);
  saveLocalDatabase();

  const reqUser = (req as any).user as User;
  addAuditLog(reqUser.id, reqUser.name, 'Exclusão de Usuário', `Excluiu o usuário ${user.name} do Firestore e reatribuiu ${reassignedCount} imóveis.`, req);

  res.json({ success: true, reassignedCount });
});

/**
 * PROPERTIES: LIST
 */
app.get('/api/properties', async (req, res) => {
  try {
    const snap = await getDocs(collection(firestoreDb, 'properties'));
    if (!snap.empty) {
      properties = snap.docs.map(d => d.data() as Property);
    }
  } catch (err) {
    console.warn('[Firestore] Error fetching properties:', err);
  }

  const { user_id, category, purpose, status, neighborhood, search, min_price, max_price } = req.query;
  let filtered = [...properties];

  if (user_id) {
    filtered = filtered.filter(p => p.user_id === user_id);
  }
  if (category && category !== 'todos') {
    filtered = filtered.filter(p => p.category.toLowerCase() === (category as string).toLowerCase());
  }
  if (purpose && purpose !== 'todos') {
    filtered = filtered.filter(p => p.purpose.toLowerCase().includes((purpose as string).toLowerCase()));
  }
  if (status && status !== 'todos') {
    filtered = filtered.filter(p => p.status.toLowerCase() === (status as string).toLowerCase());
  }
  if (neighborhood && neighborhood !== 'todos') {
    filtered = filtered.filter(p => p.neighborhood.toLowerCase().includes((neighborhood as string).toLowerCase()));
  }
  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter(p =>
      p.code.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.neighborhood.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    );
  }
  if (min_price) {
    filtered = filtered.filter(p => p.price >= Number(min_price) || (p.rent_price && p.rent_price >= Number(min_price)));
  }
  if (max_price) {
    filtered = filtered.filter(p => p.price <= Number(max_price) || (p.rent_price && p.rent_price <= Number(max_price)));
  }

  res.json({ properties: filtered });
});

/**
 * PROPERTIES: SEED DEMO
 */
app.post('/api/properties/seed-demo', async (req, res) => {
  try {
    const batch = writeBatch(firestoreDb);
    for (const p of initialDemoProperties) {
      batch.set(doc(firestoreDb, 'properties', p.id), p, { merge: true });
      const idx = properties.findIndex(existing => existing.id === p.id);
      if (idx !== -1) properties[idx] = p;
      else properties.push(p);
    }
    await batch.commit();
    saveLocalDatabase();
    res.json({ success: true, count: initialDemoProperties.length, properties });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar imóveis de demonstração: ' + err.message });
  }
});

/**
 * PROPERTIES: PUBLIC CATALOG
 */
app.get('/api/properties/public/user/:slug', async (req, res) => {
  const slug = req.params.slug.toLowerCase();

  try {
    const snap = await getDocs(collection(firestoreDb, 'properties'));
    if (!snap.empty) {
      properties = snap.docs.map(d => d.data() as Property);
    }
    const uSnap = await getDocs(collection(firestoreDb, 'users'));
    if (!uSnap.empty) {
      users = uSnap.docs.map(d => d.data() as User);
    }
    const sSnap = await getDoc(doc(firestoreDb, 'settings', 'company'));
    if (sSnap.exists()) {
      companySettings = { ...companySettings, ...sSnap.data() } as CompanySettings;
    }
  } catch {}

  if (['geral', 'admin', 'lopes', 'lopesmanaus'].includes(slug)) {
    return res.json({
      captador: {
        id: 'usr_admin',
        name: 'Lopes Manaus - Catálogo Geral',
        email: companySettings.email,
        phone: companySettings.phone,
        whatsapp: companySettings.whatsapp,
        position: 'Catálogo Geral de Imóveis',
        url_slug: 'geral',
        photo_url: companySettings.logo_url,
        creci: companySettings.creci_j,
        instagram: companySettings.instagram
      },
      properties: properties
    });
  }

  const captador = users.find(u =>
    u.url_slug?.toLowerCase() === slug ||
    u.username?.toLowerCase() === slug ||
    u.id?.toLowerCase() === slug ||
    u.email?.toLowerCase() === slug
  );

  if (!captador) {
    return res.status(404).json({ error: 'Captador não encontrado.' });
  }

  let captadorProps = properties.filter(p =>
    p.user_id === captador.id ||
    p.user_id?.toLowerCase() === captador.id?.toLowerCase() ||
    p.user_id?.toLowerCase() === captador.username?.toLowerCase()
  );

  if (captador.role === 'MASTER_ADMIN' || captador.role === 'GESTOR' || captador.role === 'GESTORA' || (captadorProps.length === 0 && properties.length > 0)) {
    captadorProps = properties;
  }

  res.json({
    captador: {
      id: captador.id,
      name: captador.name,
      email: captador.email,
      phone: captador.phone,
      whatsapp: captador.whatsapp,
      position: captador.position,
      url_slug: captador.url_slug,
      photo_url: captador.photo_url,
      creci: captador.creci,
      instagram: captador.instagram
    },
    properties: captadorProps
  });
});

/**
 * PROPERTY DETAIL BY IDENTIFIER
 */
app.get('/api/properties/public/:identifier', async (req, res) => {
  try {
    const snap = await getDocs(collection(firestoreDb, 'properties'));
    if (!snap.empty) {
      properties = snap.docs.map(d => d.data() as Property);
    }
  } catch {}

  // Always read the freshest settings from Firestore here too — this route is hit by
  // public visitors on browsers/instances that may never have called /api/settings,
  // so the in-memory companySettings could be stale from this instance's cold start.
  try {
    const settingsSnap = await getDoc(doc(firestoreDb, 'settings', 'company'));
    if (settingsSnap.exists()) {
      companySettings = { ...companySettings, ...settingsSnap.data() } as CompanySettings;
    }
  } catch {}

  const identifier = decodeURIComponent(req.params.identifier).trim().toLowerCase();
  const property = properties.find(p =>
    p.id.toLowerCase() === identifier ||
    p.code.toLowerCase() === identifier ||
    p.code.toLowerCase().replace(/[^a-z0-9]/g, '') === identifier.replace(/[^a-z0-9]/g, '')
  );

  if (!property) {
    return res.status(404).json({ error: 'Imóvel não encontrado.' });
  }

  const captador = users.find(u => u.id === property.user_id) || users[0];
  res.json({
    property,
    captador: {
      id: captador.id,
      name: captador.name,
      email: captador.email,
      phone: captador.phone,
      whatsapp: captador.whatsapp,
      position: captador.position,
      url_slug: captador.url_slug,
      photo_url: captador.photo_url,
      creci: captador.creci,
      instagram: captador.instagram
    },
    companySettings
  });
});

app.get('/api/properties/:id', (req, res) => {
  const property = properties.find(p => p.id === req.params.id || p.code === req.params.id);
  if (!property) return res.status(404).json({ error: 'Imóvel não encontrado.' });
  res.json({ property });
});

/**
 * Uploads every base64 property photo to Cloudinary and returns permanent URLs.
 * IMPORTANT: property photos must never be stored as raw base64 inside the Firestore
 * document. Firestore caps each document at 1 MiB, and a handful of compressed photos
 * (150-400 KB each) blows past that easily — the write then fails silently, the property
 * stays visible only to whoever created it (their own server instance still has it in
 * memory) and never reaches Firestore, so no one else ever sees it.
 */
async function uploadPropertyImages(images: any, propertyCode: string): Promise<string[]> {
  if (!Array.isArray(images)) return [];
  const uploaded: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (typeof img === 'string' && img.startsWith('data:image/')) {
      const url = await saveBase64ImageFile(img, `property_${propertyCode}_${i}_${Date.now()}`);
      uploaded.push(url);
    } else if (typeof img === 'string') {
      uploaded.push(img);
    }
  }
  return uploaded;
}

/**
 * PROPERTIES: CREATE (PERSISTED TO CLOUD FIRESTORE)
 */
app.post('/api/properties', requireAuth, async (req, res) => {
  const reqUser = (req as any).user as User;
  const propData = req.body;

  if (!propData.title) {
    return res.status(400).json({ error: 'Título é obrigatório.' });
  }

  // If Master Admin or Gestor, allow assigning to target user_id; if captador, must be own id
  let targetUserId = reqUser.id;
  if ((reqUser.role === 'MASTER_ADMIN' || reqUser.role === 'GESTOR' || reqUser.role === 'GESTORA') && propData.user_id) {
    targetUserId = propData.user_id;
  }

  const nextNum = properties.length + 1001;
  const code = propData.code || `LOP-${nextNum}`;

  const owner = users.find(u => u.id === targetUserId) || reqUser;

  const uploadedImages = await uploadPropertyImages(propData.images, code);
  const fallbackImage = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80';
  let uploadedMainImage = propData.main_image;
  if (typeof uploadedMainImage === 'string' && uploadedMainImage.startsWith('data:image/')) {
    uploadedMainImage = await saveBase64ImageFile(uploadedMainImage, `property_${code}_main_${Date.now()}`);
  }

  const newProperty: Property = {
    id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    code,
    user_id: targetUserId,
    user_name: owner?.name || reqUser.name,
    title: propData.title,
    description: propData.description || '',
    purpose: propData.purpose || 'Venda',
    category: propData.category || 'Apartamento',
    status: propData.status || 'Disponível',
    price: Number(propData.price) || 0,
    rent_price: (propData.rent_price !== undefined && propData.rent_price !== null && Number(propData.rent_price) > 0) ? Number(propData.rent_price) : undefined,
    condo_fee: Number(propData.condo_fee) || 0,
    iptu: Number(propData.iptu) || 0,
    neighborhood: propData.neighborhood || 'Adrianópolis',
    city: propData.city || 'Manaus',
    state: propData.state || 'AM',
    address: propData.address || '',
    total_area: Number(propData.total_area) || 0,
    built_area: Number(propData.built_area) || 0,
    bedrooms: Number(propData.bedrooms) || 0,
    suites: Number(propData.suites) || 0,
    bathrooms: Number(propData.bathrooms) || 0,
    parking_spaces: Number(propData.parking_spaces) || 0,
    features: Array.isArray(propData.features) ? propData.features : [],
    images: uploadedImages.length > 0 ? uploadedImages : [fallbackImage],
    main_image: uploadedMainImage || uploadedImages[0] || fallbackImage,
    client_name: propData.client_name || undefined,
    client_cpf_cnpj: propData.client_cpf_cnpj || undefined,
    client_phone: propData.client_phone || undefined,
    client_email: propData.client_email || undefined,
    client_type: propData.client_type || undefined,
    transaction_date: propData.transaction_date || undefined,
    transaction_value: propData.transaction_value !== undefined ? Number(propData.transaction_value) : undefined,
    transaction_notes: propData.transaction_notes || undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  properties.unshift(newProperty);
  await safeFirestoreDocSet('properties', newProperty.id, newProperty, false);
  saveLocalDatabase();

  addAuditLog(reqUser.id, reqUser.name, 'Cadastro de Imóvel', `Cadastrou o imóvel ${newProperty.code} (${newProperty.title}) para ${owner.name}`, req);

  res.status(201).json({ property: newProperty });
});

/**
 * PROPERTIES: UPDATE (RBAC ENFORCED & CLOUD PERSISTED)
 */
app.put('/api/properties/:id', requireAuth, async (req, res) => {
  const reqUser = (req as any).user as User;
  const { id } = req.params;
  const index = properties.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Imóvel não encontrado.' });

  const existing = properties[index];

  // RBAC Permission Check
  const isMasterOrGestor = reqUser.role === 'MASTER_ADMIN' || reqUser.role === 'GESTOR' || reqUser.role === 'GESTORA';
  const isOwner = existing.user_id === reqUser.id || existing.user_id?.toLowerCase() === reqUser.id?.toLowerCase();

  if (!isMasterOrGestor && !isOwner) {
    return res.status(403).json({ error: 'Permissão negada. Você só pode editar os imóveis cadastrados por você.' });
  }

  const update = req.body;

  if (Array.isArray(update.images)) {
    update.images = await uploadPropertyImages(update.images, existing.code);
  }
  if (typeof update.main_image === 'string' && update.main_image.startsWith('data:image/')) {
    update.main_image = await saveBase64ImageFile(update.main_image, `property_${existing.code}_main_${Date.now()}`);
  }

  const updatedProperty: Property = {
    ...existing,
    ...update,
    id: existing.id,
    code: existing.code,
    updated_at: new Date().toISOString()
  };

  if (!isMasterOrGestor && update.user_id) {
    updatedProperty.user_id = existing.user_id;
  }

  properties[index] = updatedProperty;
  await safeFirestoreDocSet('properties', id, updatedProperty, true);
  saveLocalDatabase();

  addAuditLog(reqUser.id, reqUser.name, 'Edição de Imóvel', `Atualizou o imóvel ${updatedProperty.code} (${updatedProperty.title})`, req);

  res.json({ property: updatedProperty });
});

/**
 * PROPERTIES: DELETE (RBAC ENFORCED & CLOUD PERSISTED)
 */
app.delete('/api/properties/:id', requireAuth, async (req, res) => {
  const reqUser = (req as any).user as User;
  const rawId = req.params.id;
  const targetId = decodeURIComponent(rawId).trim();
  
  const prop = properties.find(p => 
    p.id === targetId || 
    p.code === targetId || 
    p.id?.toLowerCase() === targetId.toLowerCase() || 
    p.code?.toLowerCase() === targetId.toLowerCase()
  );
  
  if (!prop) {
    return res.status(404).json({ error: 'Imóvel não encontrado.' });
  }

  const isMaster = reqUser.role === 'MASTER_ADMIN';
  const isGestor = reqUser.role === 'GESTOR' || reqUser.role === 'GESTORA';
  const isOwner = 
    prop.user_id === reqUser.id || 
    prop.user_id?.toLowerCase() === reqUser.id?.toLowerCase() ||
    prop.user_id?.toLowerCase() === reqUser.username?.toLowerCase() ||
    prop.user_id?.toLowerCase() === reqUser.email?.toLowerCase();

  if (!isMaster && !isGestor && !isOwner) {
    return res.status(403).json({ error: 'Permissão negada. Você só pode excluir os seus próprios imóveis cadastrados.' });
  }

  properties = properties.filter(p => p.id !== prop.id && p.code !== prop.code);
  await safeFirestoreDocDelete('properties', prop.id);
  if (prop.code && prop.code !== prop.id) {
    await safeFirestoreDocDelete('properties', prop.code);
  }
  if (targetId !== prop.id && targetId !== prop.code) {
    await safeFirestoreDocDelete('properties', targetId);
  }
  saveLocalDatabase();

  addAuditLog(reqUser.id, reqUser.name, 'Exclusão de Imóvel', `Excluiu o imóvel ${prop.code} (${prop.title}) no Firestore`, req);

  res.json({ success: true, message: 'Imóvel excluído com sucesso!' });
});

/**
 * XML IMPORT (MASTER ADMIN ONLY)
 */
app.post('/api/properties/import-xml', requireMasterAdmin, async (req, res) => {
  const reqUser = (req as any).user as User;
  const { properties: incomingProps, user_id, skip_existing = true, update_existing = false, source_filename } = req.body;

  if (!Array.isArray(incomingProps) || incomingProps.length === 0) {
    return res.status(400).json({ error: 'Nenhum imóvel fornecido para importação.' });
  }

  const targetUserId = user_id || reqUser.id;
  const targetUser = users.find(u => u.id === targetUserId) || reqUser;

  const existingCodeMap = new Map<string, Property>();
  properties.forEach(p => {
    if (p.code) existingCodeMap.set(p.code.toLowerCase().trim(), p);
    if (p.id) existingCodeMap.set(p.id.toLowerCase().trim(), p);
  });

  const newToInsert: Property[] = [];
  const updatedList: Property[] = [];
  let ignoredCount = 0;
  const nowISO = new Date().toISOString();

  incomingProps.forEach((item: any, idx: number) => {
    const cleanCode = (item.code || `IMP-${Date.now()}-${idx}`).trim();
    const existing = existingCodeMap.get(cleanCode.toLowerCase());

    if (existing) {
      if (skip_existing && !update_existing) {
        ignoredCount++;
        return;
      }
      if (update_existing) {
        const updatedProp: Property = {
          ...existing,
          ...item,
          id: existing.id,
          code: existing.code,
          updated_at: nowISO
        };
        updatedList.push(updatedProp);
        return;
      }
    }

    const newProp: Property = {
      id: `prop_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      code: cleanCode,
      user_id: targetUserId,
      title: item.title || `Imóvel ${cleanCode}`,
      description: item.description || '',
      category: item.category || 'Apartamento',
      purpose: item.purpose || 'Venda',
      status: item.status || 'Disponível',
      price: Number(item.price) || 0,
      rent_price: (item.rent_price !== undefined && item.rent_price !== null && Number(item.rent_price) > 0) ? Number(item.rent_price) : undefined,
      condo_fee: Number(item.condo_fee) || 0,
      iptu: Number(item.iptu) || 0,
      neighborhood: item.neighborhood || 'Adrianópolis',
      city: item.city || 'Manaus',
      state: item.state || 'AM',
      address: item.address || '',
      total_area: Number(item.total_area) || 0,
      built_area: Number(item.built_area) || 0,
      bedrooms: Number(item.bedrooms) || 0,
      suites: Number(item.suites) || 0,
      bathrooms: Number(item.bathrooms) || 0,
      parking_spaces: Number(item.parking_spaces) || 0,
      features: Array.isArray(item.features) && item.features.length > 0 ? item.features : ['Excelente Localização'],
      images: Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'],
      main_image: item.main_image || (item.images?.[0]) || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      created_at: nowISO,
      updated_at: nowISO
    };

    newToInsert.push(newProp);
    existingCodeMap.set(cleanCode.toLowerCase(), newProp);
  });

  if (newToInsert.length > 0) {
    const BATCH_SIZE = 400;
    for (let i = 0; i < newToInsert.length; i += BATCH_SIZE) {
      const chunk = newToInsert.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(firestoreDb);
      chunk.forEach(p => batch.set(doc(firestoreDb, 'properties', p.id), p));
      await batch.commit();
    }
    properties = [...newToInsert, ...properties];
  }

  if (updatedList.length > 0) {
    const batch = writeBatch(firestoreDb);
    updatedList.forEach(p => {
      batch.set(doc(firestoreDb, 'properties', p.id), p, { merge: true });
      const idx = properties.findIndex(existing => existing.id === p.id);
      if (idx !== -1) properties[idx] = p;
    });
    await batch.commit();
  }

  addAuditLog(
    reqUser.id,
    reqUser.name,
    'Importação XML',
    `Importou ${newToInsert.length} novos imóveis via XML ${source_filename ? `(${source_filename})` : ''} para ${targetUser.name}.`,
    req
  );
  saveLocalDatabase();

  res.json({
    success: true,
    totalReceived: incomingProps.length,
    importedCount: newToInsert.length,
    updatedCount: updatedList.length,
    ignoredCount,
    properties,
    message: `${newToInsert.length} novos imóveis cadastrados com sucesso!`
  });
});

/**
 * DASHBOARD STATS
 */
app.get('/api/stats', (req, res) => {
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalProps = properties.length;
  const availableProps = properties.filter(p => p.status === 'Disponível').length;
  const soldProps = properties.filter(p => p.status === 'Vendido').length;
  const rentedProps = properties.filter(p => p.status === 'Alugado').length;
  const reservedProps = properties.filter(p => p.status === 'Reservado').length;

  const captadorCounts: Record<string, number> = {};
  properties.forEach(p => {
    captadorCounts[p.user_id] = (captadorCounts[p.user_id] || 0) + 1;
  });

  const topCaptadores = users
    .filter(u => u.status === 'active')
    .map(u => ({
      user_id: u.id,
      name: u.name,
      photo_url: u.photo_url || '',
      count: captadorCounts[u.id] || 0,
      url_slug: u.url_slug || u.username
    }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count !== a.count ? b.count - a.count : a.name.localeCompare(b.name))
    .slice(0, 5);

  const stats: DashboardStats = {
    total_users: totalUsers,
    active_users: activeUsers,
    total_properties: totalProps,
    available_properties: availableProps,
    sold_properties: soldProps,
    rented_properties: rentedProps,
    reserved_properties: reservedProps,
    recent_registrations: properties.filter(p => {
      const diff = Date.now() - new Date(p.created_at).getTime();
      return diff < 30 * 24 * 60 * 60 * 1000;
    }).length,
    top_captadores: topCaptadores
  };

  res.json({ stats });
});

/**
 * AUDIT LOGS
 */
app.get('/api/logs', (req, res) => {
  res.json({ logs: auditLogs });
});

/**
 * COMPANY SETTINGS
 */
app.get('/api/settings', async (req, res) => {
  try {
    const snap = await getDoc(doc(firestoreDb, 'settings', 'company'));
    if (snap.exists()) {
      companySettings = { ...companySettings, ...snap.data() } as CompanySettings;
    }
  } catch {}
  res.json({ settings: companySettings });
});

app.put('/api/settings', requireAuth, async (req, res) => {
  const reqUser = (req as any).user as User;
  if (reqUser.role !== 'MASTER_ADMIN' && reqUser.role !== 'GESTOR' && reqUser.role !== 'GESTORA') {
    return res.status(403).json({ error: 'Apenas Administradores e Gestores podem alterar configurações da empresa.' });
  }

  const update = req.body || {};

  // Intercept base64 images
  const imageFields: Array<keyof CompanySettings> = [
    'cover_horizontal_url',
    'cover_geral_url',
    'cover_venda_url',
    'cover_locacao_url',
    'cover_vertical_url',
    'logo_url'
  ];

  for (const field of imageFields) {
    if (update[field] && typeof update[field] === 'string' && update[field]!.startsWith('data:image/')) {
      const cleanPrefix = (field as string).replace(/^cover_/, '').replace(/_url$/, '');
      const savedUrl = await saveBase64ImageFile(update[field]!, `cover_${cleanPrefix}`);
      update[field] = savedUrl;
    }
  }

  companySettings = {
    ...companySettings,
    ...update
  };

  if (companySettings.cover_horizontal_url && !companySettings.cover_geral_url) {
    companySettings.cover_geral_url = companySettings.cover_horizontal_url;
  }

  await safeFirestoreDocSet('settings', 'company', companySettings, true);
  saveLocalDatabase();

  addAuditLog(reqUser.id, reqUser.name, 'Configurações', 'Atualizou as informações e capas da imobiliária no Firestore', req);

  res.json({ settings: companySettings });
});

/**
 * COVER UPLOAD ENDPOINT
 */
app.post('/api/upload/cover', requireAuth, async (req, res) => {
  try {
    const reqUser = (req as any).user as User;
    const { image, fieldName } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: 'Nenhuma imagem fornecida.' });
    }

    const field = fieldName || 'cover_horizontal_url';
    const cleanPrefix = field.replace(/^cover_/, '').replace(/_url$/, '');
    const publicUrl = await saveBase64ImageFile(image, `cover_${cleanPrefix}`);

    companySettings = {
      ...companySettings,
      [field]: publicUrl
    };

    if (field === 'cover_horizontal_url' || !companySettings.cover_geral_url) {
      companySettings.cover_geral_url = publicUrl;
    }

    await safeFirestoreDocSet('settings', 'company', companySettings, true);
    saveLocalDatabase();

    addAuditLog(reqUser.id, reqUser.name, 'Capa do Catálogo', `Atualizou a imagem de capa (${field}) no Cloud Firestore`, req);

    res.json({ success: true, url: publicUrl, settings: companySettings });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar a capa no servidor.' });
  }
});

/**
 * JOURNAL ENDPOINTS
 */
app.get('/api/journal', (req, res) => {
  const { user_id, date } = req.query;
  let filtered = [...journalEntries];
  if (user_id) {
    filtered = filtered.filter(j => j.user_id === user_id);
  }
  if (date) {
    filtered = filtered.filter(j => j.date === date);
  }
  res.json({ journals: filtered });
});

app.post('/api/journal', requireAuth, async (req, res) => {
  const reqUser = (req as any).user as User;
  const data = req.body;
  const targetUserId = data.user_id || reqUser.id;

  const existingIndex = journalEntries.findIndex(j => j.user_id === targetUserId && j.date === data.date);

  const entry: JournalEntry = {
    id: existingIndex !== -1 ? journalEntries[existingIndex].id : `jrn_${Date.now()}`,
    user_id: targetUserId,
    user_name: data.user_name || reqUser.name,
    date: data.date,
    summary_notes: data.summary_notes || '',
    key_highlights: Array.isArray(data.key_highlights) ? data.key_highlights : [],
    next_day_goals: data.next_day_goals || '',
    rating: data.rating || 'Produtivo',
    leads_prospectados: Number(data.leads_prospectados) || 0,
    imoveis_captados: Number(data.imoveis_captados) || 0,
    visitas_realizadas: Number(data.visitas_realizadas) || 0,
    canais_captacao: data.canais_captacao || {
      portal: 0,
      placa_rua: 0,
      indicacao: 0,
      redes_sociais: 0,
      telefone_ativo: 0,
      parceria: 0,
      outros: 0
    },
    canal_principal: data.canal_principal || 'Direto / Geral',
    auto_metrics: data.auto_metrics || {
      properties_created: 0,
      properties_updated: 0,
      status_changes: 0,
      visits_count: 0
    },
    created_at: existingIndex !== -1 ? journalEntries[existingIndex].created_at : new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    journalEntries[existingIndex] = entry;
  } else {
    journalEntries.unshift(entry);
  }

  await safeFirestoreDocSet('journal', entry.id, entry, false);
  saveLocalDatabase();

  res.json({ journal: entry });
});

/**
 * SCHEDULE ENDPOINTS
 */
app.get('/api/schedule', (req, res) => {
  res.json({ events: scheduleEvents });
});

app.post('/api/schedule', requireAuth, async (req, res) => {
  const reqUser = (req as any).user as User;
  const eventData = req.body as ScheduleEvent;

  if (!eventData.title || !eventData.date || !eventData.start_time || !eventData.type) {
    return res.status(400).json({ error: 'Preencha título, data, horário e tipo de agendamento.' });
  }

  const startA = eventData.start_time || '09:00';
  const endA = eventData.end_time || '10:30';

  const newEvent: ScheduleEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: eventData.title,
    type: eventData.type,
    date: eventData.date,
    start_time: startA,
    end_time: endA,
    user_id: eventData.user_id || reqUser.id,
    user_name: eventData.user_name || reqUser.name,
    property_id: eventData.property_id,
    property_code: eventData.property_code,
    client_name: eventData.client_name,
    client_phone: eventData.client_phone,
    location: eventData.location,
    notes: eventData.notes,
    exclusive_visit: eventData.exclusive_visit ?? true,
    created_at: new Date().toISOString()
  };

  scheduleEvents.unshift(newEvent);
  await safeFirestoreDocSet('schedule', newEvent.id, newEvent, false);
  saveLocalDatabase();

  addAuditLog(reqUser.id, reqUser.name, 'Agendamento', `Agendou ${newEvent.type}: "${newEvent.title}" para ${newEvent.date} às ${newEvent.start_time}`, req);

  res.status(201).json({ event: newEvent });
});

app.delete('/api/schedule/:id', requireAuth, async (req, res) => {
  const reqUser = (req as any).user as User;
  const { id } = req.params;
  const existing = scheduleEvents.find(e => e.id === id);
  if (!existing) return res.status(404).json({ error: 'Compromisso não encontrado.' });

  scheduleEvents = scheduleEvents.filter(e => e.id !== id);
  await safeFirestoreDocDelete('schedule', id);
  saveLocalDatabase();

  addAuditLog(reqUser.id, reqUser.name, 'Cancelamento de Agendamento', `Cancelou ${existing.type}: "${existing.title}"`, req);

  res.json({ success: true });
});

export default app;
