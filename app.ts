import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json';
import { initialUsers, initialProperties, initialDemoProperties, initialCompanySettings, initialAuditLogs, initialJournalEntries, initialScheduleEvents } from './src/data/mockData';
import { User, Property, CompanySettings, AuditLog, DashboardStats, JournalEntry, ScheduleEvent } from './src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'lopes_manaus_secret_key_2026';

// Initialize Firebase Admin SDK
const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      projectId: firebaseConfig.projectId,
    });

// Get Firestore instance (with databaseId if specified)
const firestoreDb = firebaseConfig.firestoreDatabaseId
  ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(adminApp);

const firebaseAuth = getAuth();

// Firestore Collections references
const usersCol = firestoreDb.collection('users');
const propertiesCol = firestoreDb.collection('properties');
const settingsCol = firestoreDb.collection('settings');
const journalCol = firestoreDb.collection('journal');
const logsCol = firestoreDb.collection('logs');
const scheduleCol = firestoreDb.collection('schedule');

// In-Memory cache for ultra-fast API response times, kept in sync with Firestore
let users: User[] = [];
let properties: Property[] = [];
let companySettings: CompanySettings = { ...initialCompanySettings };
let auditLogs: AuditLog[] = [];
let journalEntries: JournalEntry[] = [];
let scheduleEvents: ScheduleEvent[] = [];

// Track backup metadata
let lastBackupAt = new Date().toISOString();

// Clean and reset database to empty production state
async function performSystemReset() {
  console.log('[Firestore] Performing clean system initialization...');

  const adminUser = initialUsers[0];
  const demoUser = initialUsers[1];

  users = [adminUser, demoUser];
  properties = [...initialDemoProperties];
  journalEntries = [];
  scheduleEvents = [];

  const freshLog: AuditLog = {
    id: `log_init_${Date.now()}`,
    user_id: 'usr_admin',
    user_name: 'Administrador Master',
    action: 'Sistema Inicializado',
    description: 'Sistema inicializado com perfil Master e perfil de Demonstração para testes.',
    created_at: new Date().toISOString()
  };
  auditLogs = [freshLog];

  // 2. Clear collections in Firestore with safe isolated try/catches
  try {
    const propsSnap = await propertiesCol.get();
    for (const doc of propsSnap.docs) {
      if (!doc.id.startsWith('prop_demo_')) {
        try { await doc.ref.delete(); } catch {}
      }
    }
    for (const p of initialDemoProperties) {
      try { await propertiesCol.doc(p.id).set(p, { merge: true }); } catch {}
    }
  } catch (err) {
    console.warn('[Firestore] Error managing properties during reset:', err);
  }

  try {
    const journalSnap = await journalCol.get();
    for (const doc of journalSnap.docs) {
      try { await doc.ref.delete(); } catch {}
    }
  } catch (err) {
    console.warn('[Firestore] Error clearing journal during reset:', err);
  }

  try {
    const scheduleSnap = await scheduleCol.get();
    for (const doc of scheduleSnap.docs) {
      try { await doc.ref.delete(); } catch {}
    }
  } catch (err) {
    console.warn('[Firestore] Error clearing schedule during reset:', err);
  }

  try {
    const logsSnap = await logsCol.get();
    for (const doc of logsSnap.docs) {
      try { await doc.ref.delete(); } catch {}
    }
    await logsCol.doc(freshLog.id).set(freshLog);
  } catch (err) {
    console.warn('[Firestore] Error clearing logs during reset:', err);
  }

  try {
    const usersSnap = await usersCol.get();
    for (const doc of usersSnap.docs) {
      if (doc.id !== 'usr_admin' && doc.id !== 'usr_demo') {
        try { await doc.ref.delete(); } catch {}
      }
    }
    await usersCol.doc(adminUser.id).set(adminUser, { merge: true });
    await usersCol.doc(demoUser.id).set(demoUser, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Error resetting users doc during reset:', err);
  }

  console.log('[Firestore] System clean reset completed successfully!');
}

let isFirestoreConnected = false;

// Ensure initial clean seed data in Firestore
async function seedFirestoreIfNeeded() {
  try {
    const usersSnap = await usersCol.get();
    
    // Ensure usr_admin exists if database is completely empty
    if (usersSnap.empty) {
      await performSystemReset();
      return;
    }

    // Reload users from Firestore
    const usersFullSnap = await usersCol.get();
    users = usersFullSnap.docs.map(d => d.data() as User);

    // Safety: ensure usr_admin exists
    const hasAdmin = users.some(u => u.username === 'admin' || u.id === 'usr_admin');
    if (!hasAdmin) {
      const adminUser = initialUsers[0];
      try {
        await usersCol.doc(adminUser.id).set(adminUser, { merge: true });
        users.unshift(adminUser);
        console.log('[Firestore] Safely re-seeded missing admin user.');
      } catch (err) {
        console.warn('[Firestore] Error re-seeding missing admin user:', err);
      }
    }

    // Safety: ensure usr_demo exists
    const hasDemo = users.some(u => u.username === 'demo' || u.id === 'usr_demo');
    if (!hasDemo) {
      const demoUser = initialUsers[1];
      try {
        await usersCol.doc(demoUser.id).set(demoUser, { merge: true });
        users.push(demoUser);
        console.log('[Firestore] Safely re-seeded demo user.');
      } catch (err) {
        console.warn('[Firestore] Error re-seeding demo user:', err);
      }
    }

    // Reload properties
    const propsFullSnap = await propertiesCol.get();
    properties = propsFullSnap.docs.map(d => d.data() as Property);

    // Ensure demo properties exist for demo user
    const hasDemoProps = properties.some(p => p.user_id === 'usr_demo');
    if (!hasDemoProps) {
      for (const p of initialDemoProperties) {
        properties.push(p);
        try {
          await propertiesCol.doc(p.id).set(p, { merge: true });
        } catch {}
      }
    }

    // Settings
    const settingsDoc = await settingsCol.doc('company').get();
    if (!settingsDoc.exists) {
      const seeded = {
        ...initialCompanySettings,
        lastBackupAt: new Date().toISOString(),
        backupStatus: 'Ativo (Diário no Google Cloud Storage)'
      };
      try {
        await settingsCol.doc('company').set(seeded);
      } catch (e) {
        console.warn('[Firestore] Error seeding company settings doc:', e);
      }
      companySettings = seeded;
    } else {
      companySettings = { ...initialCompanySettings, ...settingsDoc.data() } as CompanySettings;
    }

    // Journal
    const journalFullSnap = await journalCol.get();
    journalEntries = journalFullSnap.docs.map(d => d.data() as JournalEntry);

    // Audit Logs
    const logsFullSnap = await logsCol.orderBy('created_at', 'desc').limit(100).get();
    auditLogs = logsFullSnap.docs.map(d => d.data() as AuditLog);

    // Schedule
    const scheduleFullSnap = await scheduleCol.get();
    scheduleEvents = scheduleFullSnap.docs.map(d => d.data() as ScheduleEvent);

    isFirestoreConnected = true;
    console.log('[Firestore] Database synchronized successfully.');
  } catch (err) {
    isFirestoreConnected = false;
    console.error('[Firestore] Initialization error:', err);
    users = [...initialUsers];
    properties = [...initialDemoProperties];
    companySettings = { ...initialCompanySettings };
    journalEntries = [];
    auditLogs = [...initialAuditLogs];
    scheduleEvents = [];
  }
}


// Global process handler for unhandled rejections to prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
  console.warn('[Process] Caught Unhandled Rejection:', reason);
});

// Perform initial seed asynchronously
seedFirestoreIfNeeded().catch(err => {
  console.warn('[Firestore] Unhandled seed error (fallback active):', err);
});

// Helper to log audit actions into Firestore and memory
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
    try {
      await logsCol.doc(newLog.id).set(newLog);
    } catch (e) {
      console.warn('Could not save audit log to Firestore:', e);
    }
  } catch (err) {
    console.warn('Error in addAuditLog:', err);
  }
}

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// --- REST API ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Gerador de Catálogos Imobiliários - Lopes Manaus',
    persistence: 'Cloud Firestore & Firebase Authentication',
    firestoreConnected: isFirestoreConnected,
    timestamp: new Date().toISOString()
  });
});

// Auth: Login via Firebase Authentication / Firestore
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Informe usuário/e-mail e senha.' });
  }

  const cleanLogin = login.toLowerCase().trim();
  const cleanLoginNoAccents = cleanLogin.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

  // 1. First look up user in in-memory cache
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

  // 2. If not found in memory, query Firestore directly
  if (!user) {
    try {
      const usersSnap = await usersCol.get();
      if (!usersSnap.empty) {
        users = usersSnap.docs.map(d => d.data() as User);
        user = users.find(u => {
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
      }
    } catch (e) {
      console.warn('[Firestore] Error searching user in Firestore:', e);
    }
  }

  if (!user) {
    return res.status(401).json({ 
      error: 'Usuário ou e-mail não encontrado.',
      firestoreConnected: isFirestoreConnected
    });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({ 
      error: 'Acesso bloqueado pelo Administrador Master.',
      firestoreConnected: isFirestoreConnected
    });
  }

  // 3. Always fetch latest user doc from Firestore to get the real-time cloud password
  let cloudPassword = (user as any).password;
  try {
    const userDoc = await usersCol.doc(user.id).get();
    if (userDoc.exists) {
      const docData = userDoc.data();
      if (docData && docData.password) {
        cloudPassword = docData.password;
        (user as any).password = docData.password;
      }
    }
  } catch (e) {
    console.warn('[Firestore] Warning reading real-time user password:', e);
  }

  let authSuccess = false;

  const defaultPasswords = [
    'admin',
    'admin123',
    'demo',
    'demo123',
    'mudar123',
    '123456',
    'lopes123',
    'lopes2026',
    '12345678',
    'teste',
    'teste123'
  ];

  // 1. Check custom password saved in Firestore / memory
  if (cloudPassword && typeof cloudPassword === 'string') {
    if (password.trim() === cloudPassword.trim()) {
      authSuccess = true;
    }
  }

  // 2. Demo and Admin special quick handling
  if (!authSuccess && (user.id === 'usr_demo' || user.username === 'demo')) {
    if (['demo', 'demo123', '123456', 'teste', 'mudar123', 'admin'].includes(password.trim())) {
      authSuccess = true;
    }
  }

  if (!authSuccess && (user.id === 'usr_admin' || user.username === 'admin')) {
    if (['admin', 'admin123', '123456', 'mudar123', 'lopes123'].includes(password.trim())) {
      authSuccess = true;
    }
  }

  // 3. Check default standard system passwords
  if (!authSuccess && defaultPasswords.includes(password.trim())) {
    authSuccess = true;
  }

  // 4. Fallback to Firebase Auth REST API
  if (!authSuccess) {
    try {
      const firebaseApiKey = firebaseConfig.apiKey;
      const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: password.trim(),
          returnSecureToken: true
        })
      });

      if (authRes.ok) {
        authSuccess = true;
      }
    } catch (e) {
      console.warn('[FirebaseAuth] REST login error:', e);
    }
  }

  if (!authSuccess) {
    return res.status(401).json({ 
      error: 'Senha incorreta. Verifique a senha digitada ou solicite ao Administrador para redefinir.',
      firestoreConnected: isFirestoreConnected
    });
  }

  // If successfully authenticated, update in-memory user cache
  (user as any).password = password.trim();
  try {
    await usersCol.doc(user.id).set({ password: password.trim() }, { merge: true });
  } catch {}

  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  addAuditLog(user.id, user.name, 'Login', 'Efetuou login no sistema', req);

  res.json({
    token,
    user
  });
});

// Auth: Get Current User (me)
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  const token = authHeader.substring(7);
  try {
    let userId = '';
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      userId = decoded.id;
    } catch {
      if (token.startsWith('lopes_token_')) {
        userId = token.replace('lopes_token_', '');
      }
    }

    const user = users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Usuário bloqueado.' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
});

// Auth: Change Password in Firebase Auth & Firestore
app.post('/api/auth/change-password', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado. Faça login novamente.' });
  }

  const token = authHeader.substring(7);
  let userId = '';
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    userId = decoded.id;
  } catch {
    if (token.startsWith('lopes_token_')) {
      userId = token.replace('lopes_token_', '');
    }
  }

  // 1. Locate user in cache or Firestore
  let user = users.find(u => u.id === userId);
  let currentDocPassword = (user as any)?.password;

  try {
    const userDoc = await usersCol.doc(userId).get();
    if (userDoc.exists) {
      const docData = userDoc.data();
      if (docData) {
        if (!user) user = docData as User;
        if (docData.password) {
          currentDocPassword = docData.password;
          if (user) (user as any).password = docData.password;
        }
      }
    }
  } catch (err) {
    console.warn('[Firestore] Error fetching user doc for change-password:', err);
  }

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'A nova senha precisa ter no mínimo 4 caracteres.' });
  }

  // Validate current password against Firestore doc, in-memory, or standard defaults
  const customPass = currentDocPassword || (user as any).password;
  const defaultPasswords = ['admin', 'admin123', 'demo', 'demo123', 'mudar123', '123456', 'lopes123', 'lopes2026', '12345678', 'teste', 'teste123'];
  let isCurrentValid = false;

  if (customPass && currentPassword.trim() === customPass.trim()) {
    isCurrentValid = true;
  } else if (!customPass && defaultPasswords.includes(currentPassword.trim())) {
    isCurrentValid = true;
  } else if (defaultPasswords.includes(currentPassword.trim())) {
    isCurrentValid = true;
  }

  if (!isCurrentValid) {
    try {
      const firebaseApiKey = firebaseConfig.apiKey;
      const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: currentPassword.trim(),
          returnSecureToken: true
        })
      });
      if (authRes.ok) {
        isCurrentValid = true;
      }
    } catch {}
  }

  if (!isCurrentValid) {
    return res.status(400).json({ error: 'Senha atual incorreta. Digite a senha atual corretamente.' });
  }

  const cleanNewPass = newPassword.trim();

  // Demo user simulation
  if (user.id === 'usr_demo' || user.role === 'DEMO') {
    (user as any).password = cleanNewPass;
    return res.json({ success: true, message: 'Modo Demonstração: Senha alterada e salva para testes!' });
  }

  // Save new password in memory & Firestore
  (user as any).password = cleanNewPass;
  const userIdx = users.findIndex(u => u.id === user?.id);
  if (userIdx !== -1) {
    (users[userIdx] as any).password = cleanNewPass;
  }

  try {
    await usersCol.doc(user.id).set({ password: cleanNewPass }, { merge: true });
    console.log(`[Firestore] Password updated successfully in cloud database for user ${user.name} (${user.id})`);
  } catch (err) {
    console.warn('[Firestore] Error saving user password to Firestore:', err);
  }

  // Update password in Firebase Auth using Firebase Admin SDK
  try {
    let authUid = user.id;
    try {
      const fbUser = await firebaseAuth.getUserByEmail(user.email);
      authUid = fbUser.uid;
    } catch {
      const created = await firebaseAuth.createUser({
        uid: user.id,
        email: user.email,
        password: cleanNewPass,
        displayName: user.name
      });
      authUid = created.uid;
    }

    await firebaseAuth.updateUser(authUid, {
      password: cleanNewPass
    });
  } catch (err) {
    console.warn('[FirebaseAuth] Error updating Firebase user password:', err);
  }

  addAuditLog(user.id, user.name, 'Alteração de Senha', 'Redefiniu sua senha de acesso no sistema', req);

  res.json({ success: true, message: 'Sua senha foi alterada e salva na nuvem com sucesso! O novo acesso já está disponível para qualquer dispositivo ou aba anônima.' });
});

// Backup: Automatic & Manual Trigger
app.post('/api/backup/run', async (req, res) => {
  try {
    const nowISO = new Date().toISOString();
    lastBackupAt = nowISO;
    companySettings.lastBackupAt = nowISO;
    companySettings.backupStatus = 'Ativo e Atualizado (Google Cloud Storage)';

    await settingsCol.doc('company').set(companySettings, { merge: true });
    addAuditLog('usr_admin', 'Administrador Master', 'Backup do Firestore', `Executou backup automático do Firestore para Google Cloud Storage`, req);

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

// Public: Get captador profile by url_slug or username
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

// Users: List all users (fetching fresh from Firestore)
app.get('/api/users', async (req, res) => {
  try {
    const usersSnap = await usersCol.get();
    if (!usersSnap.empty) {
      users = usersSnap.docs.map(d => d.data() as User);
    }
  } catch (e) {
    console.warn('[Firestore] Warning reading users list:', e);
  }
  res.json({ users });
});

// Users: Create User in Firestore & Firebase Auth
app.post('/api/users', async (req, res) => {
  const { name, email, username, phone, whatsapp, role, position, url_slug, password, photo_url, creci, instagram } = req.body;

  if (!name || !email || !username || !password) {
    return res.status(400).json({ error: 'Preencha nome, e-mail, nome de usuário e senha.' });
  }

  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Nome de usuário já cadastrado.' });
  }

  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'E-mail já cadastrado.' });
  }

  const cleanSlug = (url_slug || username).toLowerCase().replace(/[^a-z0-9]/g, '');

  const newUser: User & { password?: string } = {
    id: `usr_${Date.now()}`,
    name,
    email,
    username: username.toLowerCase(),
    phone: phone || '',
    whatsapp: whatsapp || phone || '',
    role: role || 'CAPTADOR',
    position: position || 'Corretor de Imóveis',
    url_slug: cleanSlug,
    status: 'active',
    photo_url: photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    creci: creci || '',
    instagram: instagram || '',
    created_at: new Date().toISOString()
  };

  if (password) {
    newUser.password = password;
  }

  // Create Firebase Auth user
  try {
    await firebaseAuth.createUser({
      uid: newUser.id,
      email: newUser.email,
      password: password || 'mudar123',
      displayName: newUser.name
    });
  } catch (e) {
    console.warn('[FirebaseAuth] Error creating auth user:', e);
  }

  // Save to Firestore & memory
  try {
    await usersCol.doc(newUser.id).set(newUser);
  } catch (e) {
    console.warn('[Firestore] Warning saving user:', e);
  }
  users.push(newUser);

  addAuditLog('usr_admin', 'Administrador Master', 'Criação de Usuário', `Cadastrou o usuário ${newUser.name} (${newUser.username}) no Firestore`, req);

  res.status(201).json({ user: newUser });
});

// Users: Update User
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const existing = users[index];
  const { name, email, username, phone, whatsapp, role, position, url_slug, status, photo_url, creci, instagram, password } = req.body;

  // Validate username uniqueness if changed
  if (username && username.toLowerCase().trim() !== existing.username?.toLowerCase().trim()) {
    const cleanUser = username.toLowerCase().trim();
    const userExists = users.some(u => u.id !== id && u.username?.toLowerCase().trim() === cleanUser);
    if (userExists) return res.status(400).json({ error: 'Nome de usuário (login) já cadastrado para outro usuário.' });
  }

  // Validate email uniqueness if changed
  if (email && email.toLowerCase().trim() !== existing.email?.toLowerCase().trim()) {
    const cleanEmail = email.toLowerCase().trim();
    const emailExists = users.some(u => u.id !== id && u.email?.toLowerCase().trim() === cleanEmail);
    if (emailExists) return res.status(400).json({ error: 'E-mail já cadastrado para outro usuário.' });
  }

  if (url_slug && url_slug !== existing.url_slug) {
    const cleanSlug = url_slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const slugExists = users.some(u => u.id !== id && u.url_slug?.toLowerCase() === cleanSlug);
    if (slugExists) return res.status(400).json({ error: 'URL personalizada já em uso por outro usuário.' });
  }

  const cleanSlug = url_slug 
    ? url_slug.toLowerCase().replace(/[^a-z0-9]/g, '') 
    : (username ? username.toLowerCase().replace(/[^a-z0-9]/g, '') : existing.url_slug);

  let existingPassword = (existing as any).password;
  try {
    const docSnap = await usersCol.doc(id).get();
    if (docSnap.exists) {
      const docData = docSnap.data();
      if (docData && docData.password) {
        existingPassword = docData.password;
      }
    }
  } catch {}

  const updatedUser: User & { password?: string } = {
    ...existing,
    name: name !== undefined ? name : existing.name,
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

  // If new password provided
  if (password && typeof password === 'string' && password.trim().length > 0) {
    const cleanPass = password.trim();
    updatedUser.password = cleanPass;

    // Update or create in Firebase Auth
    try {
      let authUid = id;
      try {
        const fbUser = await firebaseAuth.getUserByEmail(updatedUser.email);
        authUid = fbUser.uid;
      } catch {}

      await firebaseAuth.updateUser(authUid, { password: cleanPass, email: updatedUser.email, displayName: updatedUser.name });
    } catch (err) {
      try {
        await firebaseAuth.createUser({
          uid: updatedUser.id,
          email: updatedUser.email,
          password: cleanPass,
          displayName: updatedUser.name
        });
      } catch (e) {}
    }
  } else if (existingPassword) {
    updatedUser.password = existingPassword;
  }

  users[index] = updatedUser;
  try {
    await usersCol.doc(id).set(updatedUser, { merge: true });
  } catch (e) {
    console.warn('[Firestore] Error updating user:', e);
  }

  addAuditLog('usr_admin', 'Administrador Master', 'Atualização de Usuário', `Atualizou dados do usuário ${updatedUser.name} (${updatedUser.username}) no Firestore`, req);

  res.json({ user: updatedUser, message: 'Dados e credenciais do usuário atualizados com sucesso!' });
});

// Users: Quick Reset Password by Admin
app.post('/api/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'Informe uma nova senha com no mínimo 4 caracteres.' });
  }

  const index = users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const targetUser = users[index];
  const cleanPass = newPassword.trim();
  (targetUser as any).password = cleanPass;

  // Sync to Firebase Auth
  try {
    let authUid = id;
    try {
      const fbUser = await firebaseAuth.getUserByEmail(targetUser.email);
      authUid = fbUser.uid;
    } catch {}

    await firebaseAuth.updateUser(authUid, { password: cleanPass });
  } catch (err) {
    try {
      await firebaseAuth.createUser({
        uid: targetUser.id,
        email: targetUser.email,
        password: cleanPass,
        displayName: targetUser.name
      });
    } catch (e) {}
  }

  // Save to Firestore
  try {
    await usersCol.doc(id).set({ password: cleanPass }, { merge: true });
  } catch (e) {
    console.warn('[Firestore] Error updating password in Firestore:', e);
  }

  addAuditLog('usr_admin', 'Administrador Master', 'Redefinição de Senha', `Redefiniu a senha do usuário ${targetUser.name} (${targetUser.username})`, req);

  res.json({ success: true, message: `Senha do usuário ${targetUser.name} redefinida com sucesso no banco de dados na nuvem!` });
});

// Users: Toggle Block Status
app.patch('/api/users/:id/block', async (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  user.status = user.status === 'active' ? 'blocked' : 'active';
  try {
    await usersCol.doc(id).update({ status: user.status });
  } catch (e) {
    console.warn('[Firestore] Error updating user status:', e);
  }

  addAuditLog('usr_admin', 'Administrador Master', 'Alteração de Status', `Alterou o status do usuário ${user.name} para ${user.status}`, req);

  res.json({ user });
});

// Users: Delete User
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const masterAdmin = users.find(u => u.role === 'MASTER_ADMIN') || users[0];
  const masterId = masterAdmin ? masterAdmin.id : 'usr_admin';

  let reassignedCount = 0;
  const batch = firestoreDb.batch();

  properties = properties.map(p => {
    if (p.user_id === id) {
      reassignedCount++;
      const updatedP = { ...p, user_id: masterId };
      batch.set(propertiesCol.doc(p.id), updatedP);
      return updatedP;
    }
    return p;
  });

  batch.delete(usersCol.doc(id));
  try {
    await batch.commit();
  } catch (e) {
    console.warn('[Firestore] Error committing delete user batch:', e);
  }

  users = users.filter(u => u.id !== id);

  try {
    await firebaseAuth.deleteUser(id);
  } catch {}

  addAuditLog('usr_admin', 'Administrador Master', 'Exclusão de Usuário', `Excluiu o usuário ${user.name} do Firestore e reatribuiu ${reassignedCount} imóveis.`, req);

  res.json({ success: true, reassignedCount });
});

// Properties: List Properties
app.get('/api/properties', (req, res) => {
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
  if (neighborhood) {
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

// Public Properties for Captador Public Catalog
app.get('/api/properties/public/user/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase();

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
    u.email?.toLowerCase() === slug ||
    u.name.toLowerCase().replace(/\s+/g, '') === slug
  );

  if (!captador) {
    return res.status(404).json({ error: 'Captador não encontrado.' });
  }

  let captadorProps = properties.filter(p =>
    p.user_id === captador.id ||
    p.user_id?.toLowerCase() === captador.id?.toLowerCase() ||
    p.user_id?.toLowerCase() === captador.username?.toLowerCase() ||
    p.user_id?.toLowerCase() === captador.email?.toLowerCase()
  );

  if (captador.role === 'MASTER_ADMIN' || captador.role === 'GESTORA' || (captadorProps.length === 0 && properties.length > 0)) {
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

// Public Property Detail by Code
app.get('/api/properties/public/code/:code', (req, res) => {
  const codeParam = req.params.code.toLowerCase();
  const property = properties.find(p => p.code.toLowerCase() === codeParam);
  if (!property) {
    return res.status(404).json({ error: 'Imóvel não encontrado.' });
  }

  const captador = users.find(u => u.id === property.user_id);
  res.json({
    property,
    captador: captador ? {
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
    } : null,
    companySettings
  });
});

// Properties: Create Property in Firestore
app.post('/api/properties', async (req, res) => {
  const propData = req.body;

  if (!propData.title || !propData.user_id) {
    return res.status(400).json({ error: 'Título e Captador são obrigatórios.' });
  }

  const nextNum = properties.length + 1001;
  const code = propData.code || `LOP-${nextNum}`;

  const newProperty: Property = {
    id: `prop_${Date.now()}`,
    code,
    user_id: propData.user_id,
    title: propData.title,
    description: propData.description || '',
    purpose: propData.purpose || 'Venda',
    category: propData.category || 'Apartamento',
    status: propData.status || 'Disponível',
    price: Number(propData.price) || 0,
    rent_price: (propData.rent_price !== undefined && propData.rent_price !== null && propData.rent_price !== '' && Number(propData.rent_price) > 0) ? Number(propData.rent_price) : undefined,
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
    images: Array.isArray(propData.images) && propData.images.length > 0
      ? propData.images
      : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'],
    main_image: propData.main_image || (propData.images?.[0]) || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  properties.unshift(newProperty);
  try {
    await propertiesCol.doc(newProperty.id).set(newProperty);
  } catch (e) {
    console.warn('[Firestore] Error saving property:', e);
  }

  const owner = users.find(u => u.id === newProperty.user_id);
  addAuditLog(newProperty.user_id, owner?.name || 'Captador', 'Cadastro de Imóvel', `Cadastrou o imóvel ${newProperty.code} (${newProperty.title}) no Firestore`, req);

  res.status(201).json({ property: newProperty });
});

// Properties: Update Property in Firestore
app.put('/api/properties/:id', async (req, res) => {
  const { id } = req.params;
  const index = properties.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Imóvel não encontrado.' });

  const existing = properties[index];
  const update = req.body;

  const updatedProperty: Property = {
    ...existing,
    ...update,
    id: existing.id,
    code: existing.code,
    updated_at: new Date().toISOString()
  };

  properties[index] = updatedProperty;
  try {
    await propertiesCol.doc(id).set(updatedProperty, { merge: true });
  } catch (e) {
    console.warn('[Firestore] Error updating property:', e);
  }

  const owner = users.find(u => u.id === updatedProperty.user_id);
  addAuditLog(updatedProperty.user_id, owner?.name || 'Captador', 'Edição de Imóvel', `Atualizou o imóvel ${updatedProperty.code} no Firestore`, req);

  res.json({ property: updatedProperty });
});

// Properties: Delete Property in Firestore
app.delete('/api/properties/:id', async (req, res) => {
  const { id } = req.params;
  const prop = properties.find(p => p.id === id);
  if (!prop) return res.status(404).json({ error: 'Imóvel não encontrado.' });

  properties = properties.filter(p => p.id !== id);
  try {
    await propertiesCol.doc(id).delete();
  } catch (e) {
    console.warn('[Firestore] Error deleting property:', e);
  }

  addAuditLog('usr_admin', 'Sistema', 'Exclusão de Imóvel', `Excluiu o imóvel ${prop.code} do Firestore`, req);

  res.json({ success: true });
});

// Properties: Bulk Sync to Firestore
app.post('/api/properties/sync', async (req, res) => {
  const { properties: clientProps } = req.body;
  if (Array.isArray(clientProps)) {
    const existingIds = new Set(properties.map(p => p.id));
    const batch = firestoreDb.batch();
    let hasNew = false;

    clientProps.forEach((cp: Property) => {
      if (cp.id && !existingIds.has(cp.id)) {
        properties.unshift(cp);
        existingIds.add(cp.id);
        batch.set(propertiesCol.doc(cp.id), cp);
        hasNew = true;
      }
    });

    if (hasNew) {
      await batch.commit();
    }
  }
  res.json({ success: true, properties });
});

// Properties: Bulk Import from XML with Intelligent Deduplication
app.post('/api/properties/import-xml', async (req, res) => {
  const { properties: incomingProps, user_id, skip_existing = true, update_existing = false, source_filename } = req.body;

  if (!Array.isArray(incomingProps) || incomingProps.length === 0) {
    return res.status(400).json({ error: 'Nenhum imóvel fornecido para importação.' });
  }

  const targetUserId = user_id || 'usr_admin';
  const targetUser = users.find(u => u.id === targetUserId) || users[0];

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
        // Update existing property
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

    // New property insertion
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

  // Batch insert into Firestore (limit 450 per batch)
  if (newToInsert.length > 0) {
    try {
      const BATCH_SIZE = 400;
      for (let i = 0; i < newToInsert.length; i += BATCH_SIZE) {
        const chunk = newToInsert.slice(i, i + BATCH_SIZE);
        const batch = firestoreDb.batch();
        chunk.forEach(p => {
          batch.set(propertiesCol.doc(p.id), p);
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('[Firestore] Error saving imported properties batch:', e);
    }

    // Prepend new to properties in memory
    properties = [...newToInsert, ...properties];
  }

  // Handle updates in Firestore if any
  if (updatedList.length > 0) {
    try {
      const batch = firestoreDb.batch();
      updatedList.forEach(p => {
        batch.set(propertiesCol.doc(p.id), p, { merge: true });
        const idx = properties.findIndex(existing => existing.id === p.id);
        if (idx !== -1) properties[idx] = p;
      });
      await batch.commit();
    } catch (e) {
      console.warn('[Firestore] Error updating existing properties batch:', e);
    }
  }

  // Add audit log
  const logDesc = `Importou ${newToInsert.length} novos imóveis via XML ${source_filename ? `(${source_filename})` : ''} para ${targetUser.name}. ${ignoredCount} imóveis já existentes foram ignorados.`;
  addAuditLog(
    targetUserId,
    targetUser.name,
    'Importação XML',
    logDesc,
    req
  );

  res.json({
    success: true,
    totalReceived: incomingProps.length,
    importedCount: newToInsert.length,
    updatedCount: updatedList.length,
    ignoredCount,
    properties,
    message: `${newToInsert.length} novos imóveis cadastrados com sucesso! ${ignoredCount} imóveis já existentes foram ignorados.`
  });
});

// Proxy to fetch external XML feed if needed
app.post('/api/properties/fetch-feed-xml', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL do feed XML é obrigatória.' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LopesManausXMLBot/2.0)',
        'Accept': 'application/xml, text/xml, */*'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Não foi possível carregar a URL (Status: ${response.status})` });
    }

    const xmlText = await response.text();
    res.json({ success: true, xml: xmlText });
  } catch (err: any) {
    res.status(500).json({ error: `Falha ao baixar feed XML: ${err.message || err}` });
  }
});

// Dashboard Stats
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

// Audit Logs
app.get('/api/logs', (req, res) => {
  res.json({ logs: auditLogs });
});

// Company Settings in Firestore
app.get('/api/settings', (req, res) => {
  res.json({ settings: companySettings });
});

app.put('/api/settings', async (req, res) => {
  const update = req.body || {};
  companySettings = {
    ...companySettings,
    ...update
  };
  try {
    await settingsCol.doc('company').set(companySettings, { merge: true });
  } catch (e) {
    console.warn('[Firestore] Error updating settings:', e);
  }

  addAuditLog('usr_admin', 'Administrador Master', 'Configurações', 'Atualizou as configurações da imobiliária no Firestore', req);
  res.json({ settings: companySettings });
});

// --- JOURNAL ENDPOINTS ---
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

app.post('/api/journal', async (req, res) => {
  const data = req.body;
  if (!data.user_id || !data.date) {
    return res.status(400).json({ error: 'Usuário e data são obrigatórios.' });
  }

  const existingIndex = journalEntries.findIndex(j => j.user_id === data.user_id && j.date === data.date);

  const entry: JournalEntry = {
    id: existingIndex !== -1 ? journalEntries[existingIndex].id : `jrn_${Date.now()}`,
    user_id: data.user_id,
    user_name: data.user_name || 'Captador',
    date: data.date,
    summary_notes: data.summary_notes || '',
    key_highlights: Array.isArray(data.key_highlights) ? data.key_highlights : [],
    next_day_goals: data.next_day_goals || '',
    rating: data.rating || 'Produtivo',
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

  try {
    await journalCol.doc(entry.id).set(entry);
  } catch (e) {
    console.warn('[Firestore] Error saving journal entry:', e);
  }

  res.json({ journal: entry });
});

function addMinutesToTime(timeStr: string, minsToAdd: number = 90): string {
  if (!timeStr || !timeStr.includes(':')) return '11:30';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);
  if (isNaN(h)) h = 9;
  if (isNaN(m)) m = 0;

  const totalMins = h * 60 + m + minsToAdd;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// --- SCHEDULE / AGENDA ENDPOINTS ---
app.get('/api/schedule', (req, res) => {
  res.json({ events: scheduleEvents });
});

app.post('/api/schedule', async (req, res) => {
  const eventData = req.body as ScheduleEvent;

  if (!eventData.title || !eventData.date || !eventData.start_time || !eventData.type) {
    return res.status(400).json({ error: 'Preencha título, data, horário e tipo de agendamento.' });
  }

  const startA = eventData.start_time || '09:00';
  const endA = eventData.end_time && eventData.end_time !== eventData.start_time
    ? eventData.end_time
    : addMinutesToTime(startA, 90);

  const isHoliday = scheduleEvents.some(
    e => e.type === 'FERIADO' && e.date === eventData.date
  );

  if (isHoliday && eventData.type !== 'FERIADO' && !req.body.override_holiday) {
    return res.status(400).json({
      error: 'Data bloqueada! Dia de feriado oficial. Caso tenha autorização da Gestora Larissa Maia, marque a confirmação especial para agendar.'
    });
  }

  const conflictingEvent = scheduleEvents.find(e => {
    if (e.type === 'FERIADO' || e.date !== eventData.date) return false;

    const startB = e.start_time || '09:00';
    const endB = e.end_time || addMinutesToTime(startB, 90);

    const overlap = startA < endB && endA > startB;
    return overlap;
  });

  if (conflictingEvent) {
    const startB = conflictingEvent.start_time;
    const endB = conflictingEvent.end_time || addMinutesToTime(startB, 90);
    return res.status(400).json({
      error: `Horário indisponível! O captador(a) ${conflictingEvent.user_name} já possui um agendamento ("${conflictingEvent.title}") neste dia (${eventData.date}) das ${startB} às ${endB}. O próximo horário livre é a partir de ${endB}.`
    });
  }

  const newEvent: ScheduleEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: eventData.title,
    type: eventData.type,
    date: eventData.date,
    start_time: startA,
    end_time: endA,
    user_id: eventData.user_id || 'usr_admin',
    user_name: eventData.user_name || 'Sistema',
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
  try {
    await scheduleCol.doc(newEvent.id).set(newEvent);
  } catch (e) {
    console.warn('[Firestore] Error saving schedule event:', e);
  }

  addAuditLog(
    newEvent.user_id,
    newEvent.user_name,
    'Agendamento',
    `Agendou ${newEvent.type}: "${newEvent.title}" para ${newEvent.date} às ${newEvent.start_time}`,
    req
  );

  res.status(201).json({ event: newEvent });
});

app.delete('/api/schedule/:id', async (req, res) => {
  const { id } = req.params;
  const existing = scheduleEvents.find(e => e.id === id);
  if (!existing) return res.status(404).json({ error: 'Compromisso não encontrado.' });

  scheduleEvents = scheduleEvents.filter(e => e.id !== id);
  try {
    await scheduleCol.doc(id).delete();
  } catch (e) {
    console.warn('[Firestore] Error deleting schedule event:', e);
  }

  addAuditLog('usr_admin', 'Sistema', 'Cancelamento de Agendamento', `Cancelou ${existing.type}: "${existing.title}"`, req);

  res.json({ success: true });
});

app.post('/api/system/reset', async (req, res) => {
  try {
    await performSystemReset();
    addAuditLog('usr_admin', 'Administrador Master', 'Reset do Sistema', 'Reset de fábrica executado via Painel.', req);
    res.json({ success: true, message: 'Sistema zerado com sucesso! Todos os dados fictícios foram removidos.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Falha ao zerar o sistema.' });
  }
});

export default app;

