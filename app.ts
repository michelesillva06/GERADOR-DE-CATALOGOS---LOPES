import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { initialUsers, initialProperties, initialCompanySettings, initialAuditLogs, initialJournalEntries, initialScheduleEvents } from './src/data/mockData.ts';
import { User, Property, CompanySettings, AuditLog, DashboardStats, JournalEntry, ScheduleEvent } from './src/types.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'lopes_manaus_secret_key_2026';

// In-Memory Database (In production, connects to PostgreSQL database)
let users: User[] = [...initialUsers];
let properties: Property[] = [...initialProperties];
let companySettings: CompanySettings = { ...initialCompanySettings };
let auditLogs: AuditLog[] = [...initialAuditLogs];
let journalEntries: JournalEntry[] = [...initialJournalEntries] as JournalEntry[];
let scheduleEvents: ScheduleEvent[] = [...initialScheduleEvents] as ScheduleEvent[];

// Default password for all pre-seeded users is "mudar123"
const passwordHashes: Record<string, string> = {
  usr_admin: bcrypt.hashSync('mudar123', 10),
  usr_larissa: bcrypt.hashSync('mudar123', 10),
  usr_michele: bcrypt.hashSync('mudar123', 10),
  usr_moacir: bcrypt.hashSync('mudar123', 10),
  usr_karine: bcrypt.hashSync('mudar123', 10)
};

function addAuditLog(userId: string, userName: string, action: string, description: string, req?: express.Request) {
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
}

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// --- REST API ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Gerador de Catálogos Imobiliários - Lopes Manaus', timestamp: new Date().toISOString() });
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Informe usuário/e-mail e senha.' });
  }

  const user = users.find(u => u.username.toLowerCase() === login.toLowerCase() || u.email.toLowerCase() === login.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Usuário ou e-mail não encontrado.' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Acesso bloqueado pelo Administrador Master.' });
  }

  const hash = passwordHashes[user.id];
  let validPassword = false;
  if (hash) {
    validPassword = await bcrypt.compare(password, hash);
  } else {
    // fallback for newly created user without hash
    validPassword = password === 'mudar123';
  }

  if (!validPassword) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = users.find(u => u.id === decoded.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Usuário bloqueado.' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
});

// Public: Get captador profile by url_slug or username
app.get('/api/users/public/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const user = users.find(u => u.url_slug?.toLowerCase() === slug || u.username?.toLowerCase() === slug);
  if (!user) {
    return res.status(404).json({ error: 'Captador não encontrado.' });
  }
  // Return non-sensitive public profile
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

// Users: List all users
app.get('/api/users', (req, res) => {
  res.json({ users });
});

// Users: Create User
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

  const newUser: User = {
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

  passwordHashes[newUser.id] = await bcrypt.hash(password, 10);
  users.push(newUser);

  addAuditLog('usr_admin', 'Administrador Master', 'Criação de Usuário', `Cadastrou o usuário ${newUser.name} (${newUser.username})`, req);

  res.status(201).json({ user: newUser });
});

// Users: Update User
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const existing = users[index];
  const { name, email, phone, whatsapp, role, position, url_slug, status, photo_url, creci, instagram, password } = req.body;

  if (url_slug && url_slug !== existing.url_slug) {
    const slugExists = users.some(u => u.id !== id && u.url_slug?.toLowerCase() === url_slug.toLowerCase());
    if (slugExists) return res.status(400).json({ error: 'URL personalizada já em uso por outro usuário.' });
  }

  const updatedUser: User = {
    ...existing,
    name: name ?? existing.name,
    email: email ?? existing.email,
    phone: phone ?? existing.phone,
    whatsapp: whatsapp ?? existing.whatsapp,
    role: role ?? existing.role,
    position: position ?? existing.position,
    url_slug: url_slug ? url_slug.toLowerCase().replace(/[^a-z0-9]/g, '') : existing.url_slug,
    status: status ?? existing.status,
    photo_url: photo_url ?? existing.photo_url,
    creci: creci ?? existing.creci,
    instagram: instagram ?? existing.instagram
  };

  if (password) {
    passwordHashes[id] = await bcrypt.hash(password, 10);
  }

  users[index] = updatedUser;
  addAuditLog('usr_admin', 'Administrador Master', 'Atualização de Usuário', `Atualizou dados do usuário ${updatedUser.name}`, req);

  res.json({ user: updatedUser });
});

// Users: Toggle Block Status
app.patch('/api/users/:id/block', (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  user.status = user.status === 'active' ? 'blocked' : 'active';
  addAuditLog('usr_admin', 'Administrador Master', 'Alteração de Status', `Alterou o status do usuário ${user.name} para ${user.status}`, req);

  res.json({ user });
});

// Users: Delete User
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  users = users.filter(u => u.id !== id);
  delete passwordHashes[id];

  addAuditLog('usr_admin', 'Administrador Master', 'Exclusão de Usuário', `Excluiu o usuário ${user.name}`, req);

  res.json({ success: true });
});

// Properties: List Properties (with filtering)
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

  const captador = users.find(u => u.url_slug?.toLowerCase() === slug || u.username?.toLowerCase() === slug);
  if (!captador) {
    return res.status(404).json({ error: 'Captador não encontrado.' });
  }

  // Return active/available properties of this captador
  const captadorProps = properties.filter(p => p.user_id === captador.id);
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

// Public Property Detail by Code e.g. /api/properties/public/code/LOP-101
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

// Properties: Create Property
app.post('/api/properties', (req, res) => {
  const propData = req.body;

  if (!propData.title || !propData.user_id) {
    return res.status(400).json({ error: 'Título e Captador são obrigatórios.' });
  }

  // Auto generate code if not provided
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
    rent_price: propData.rent_price ? Number(propData.rent_price) : undefined,
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

  const owner = users.find(u => u.id === newProperty.user_id);
  addAuditLog(newProperty.user_id, owner?.name || 'Captador', 'Cadastro de Imóvel', `Cadastrou o imóvel ${newProperty.code} (${newProperty.title})`, req);

  res.status(201).json({ property: newProperty });
});

// Properties: Update Property
app.put('/api/properties/:id', (req, res) => {
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

  const owner = users.find(u => u.id === updatedProperty.user_id);
  addAuditLog(updatedProperty.user_id, owner?.name || 'Captador', 'Edição de Imóvel', `Atualizou o imóvel ${updatedProperty.code}`, req);

  res.json({ property: updatedProperty });
});

// Properties: Delete Property
app.delete('/api/properties/:id', (req, res) => {
  const { id } = req.params;
  const prop = properties.find(p => p.id === id);
  if (!prop) return res.status(404).json({ error: 'Imóvel não encontrado.' });

  properties = properties.filter(p => p.id !== id);

  addAuditLog('usr_admin', 'Sistema', 'Exclusão de Imóvel', `Excluiu o imóvel ${prop.code}`, req);

  res.json({ success: true });
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

  // Top captadores ranking
  const captadorCounts: Record<string, number> = {};
  properties.forEach(p => {
    captadorCounts[p.user_id] = (captadorCounts[p.user_id] || 0) + 1;
  });

  const topCaptadores = users
    .filter(u => u.role === 'CAPTADOR')
    .map(u => ({
      user_id: u.id,
      name: u.name,
      photo_url: u.photo_url,
      count: captadorCounts[u.id] || 0,
      url_slug: u.url_slug
    }))
    .sort((a, b) => b.count - a.count);

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
      return diff < 30 * 24 * 60 * 60 * 1000; // last 30 days
    }).length,
    top_captadores: topCaptadores
  };

  res.json({ stats });
});

// Audit Logs
app.get('/api/logs', (req, res) => {
  res.json({ logs: auditLogs });
});

// Company Settings
app.get('/api/settings', (req, res) => {
  res.json({ settings: companySettings });
});

app.put('/api/settings', (req, res) => {
  companySettings = { ...companySettings, ...req.body };
  addAuditLog('usr_admin', 'Administrador Master', 'Configurações', 'Atualizou as configurações da imobiliária', req);
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

app.post('/api/journal', (req, res) => {
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

  res.json({ journal: entry });
});

// --- SCHEDULE / AGENDA ENDPOINTS ---
app.get('/api/schedule', (req, res) => {
  res.json({ events: scheduleEvents });
});

app.post('/api/schedule', (req, res) => {
  const eventData = req.body as ScheduleEvent;

  if (!eventData.title || !eventData.date || !eventData.start_time || !eventData.type) {
    return res.status(400).json({ error: 'Preencha título, data, horário e tipo de agendamento.' });
  }

  // HOLIDAY CHECK CONSTRAINT: Feriados não será possível agendar nada!
  const isHoliday = scheduleEvents.some(
    e => e.type === 'FERIADO' && e.date === eventData.date
  );

  if (isHoliday && eventData.type !== 'FERIADO') {
    return res.status(400).json({
      error: 'Data bloqueada! Não é possível agendar compromissos em feriados ou datas de folga oficial.'
    });
  }

  // CONFLICT CHECK FOR VISITS:
  // Cannot schedule visit on same property at same overlapping time if either is exclusive / "Ir Só"
  if (eventData.type === 'VISITA' && eventData.property_id) {
    const conflictingEvent = scheduleEvents.find(e => {
      if (e.type !== 'VISITA' || e.date !== eventData.date || e.property_id !== eventData.property_id) {
        return false;
      }
      // Check time overlap
      const startA = eventData.start_time;
      const endA = eventData.end_time || eventData.start_time;
      const startB = e.start_time;
      const endB = e.end_time || e.start_time;

      const overlap = (startA < endB && endA > startB) || (startA === startB);

      if (!overlap) return false;

      // If either is exclusive (Ir Só), or same captador, it conflicts
      if (e.exclusive_visit || eventData.exclusive_visit || e.user_id === eventData.user_id) {
        return true;
      }

      return false;
    });

    if (conflictingEvent) {
      return res.status(400).json({
        error: `Conflito de Horário! O captador(a) ${conflictingEvent.user_name} já possui uma visita agendada neste imóvel (${conflictingEvent.property_code || ''}) às ${conflictingEvent.start_time}.`
      });
    }
  }

  const newEvent: ScheduleEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: eventData.title,
    type: eventData.type,
    date: eventData.date,
    start_time: eventData.start_time,
    end_time: eventData.end_time || eventData.start_time,
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

  addAuditLog(
    newEvent.user_id,
    newEvent.user_name,
    'Agendamento',
    `Agendou ${newEvent.type}: "${newEvent.title}" para ${newEvent.date} às ${newEvent.start_time}`,
    req
  );

  res.status(201).json({ event: newEvent });
});

app.delete('/api/schedule/:id', (req, res) => {
  const { id } = req.params;
  const existing = scheduleEvents.find(e => e.id === id);
  if (!existing) return res.status(404).json({ error: 'Compromisso não encontrado.' });

  scheduleEvents = scheduleEvents.filter(e => e.id !== id);

  addAuditLog('usr_admin', 'Sistema', 'Cancelamento de Agendamento', `Cancelou ${existing.type}: "${existing.title}"`, req);

  res.json({ success: true });
});

export default app;
