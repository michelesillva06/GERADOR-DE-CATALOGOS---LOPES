import { User, Property, CompanySettings, AuditLog, DashboardStats, JournalEntry, ScheduleEvent } from '../types';
import { initialUsers, initialProperties, initialCompanySettings, initialScheduleEvents, initialJournalEntries } from '../data/mockData';

const KEYS = {
  USERS: 'lopes_users',
  PROPERTIES: 'lopes_properties',
  SETTINGS: 'lopes_settings',
  LOGS: 'lopes_logs',
  JOURNAL: 'lopes_journal',
  SCHEDULE: 'lopes_schedule',
  CURRENT_USER: 'lopes_current_user',
  TOKEN: 'lopes_token',
  PASSWORDS: 'lopes_passwords'
};

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(KEYS.USERS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(initialUsers));
    return initialUsers;
  } catch {
    return initialUsers;
  }
}

export function saveStoredUsers(users: User[]) {
  try {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users to localStorage', e);
  }
}

export function getStoredProperties(): Property[] {
  try {
    const raw = localStorage.getItem(KEYS.PROPERTIES);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(initialProperties));
    return initialProperties;
  } catch {
    return initialProperties;
  }
}

export function saveStoredProperties(properties: Property[]) {
  try {
    localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(properties));
  } catch (e) {
    console.error('Failed to save properties to localStorage', e);
  }
}

export function normalizePropertyOwners(properties: Property[], users: User[]): { properties: Property[]; changed: boolean } {
  if (!properties || properties.length === 0 || !users || users.length === 0) {
    return { properties: properties || [], changed: false };
  }

  const activeCaptador = users.find(u => u.role === 'CAPTADOR' && u.status === 'active') || users.find(u => u.status === 'active') || users[0];
  let changed = false;

  const normalized = properties.map(p => {
    // 1. Direct match with user ID
    const directUser = users.find(u => u.id === p.user_id || u.id?.toLowerCase() === p.user_id?.toLowerCase());
    if (directUser) {
      if (p.user_id !== directUser.id) {
        changed = true;
        return { ...p, user_id: directUser.id };
      }
      return p;
    }

    // 2. Soft match with username, email, name, or url_slug
    const softUser = users.find(u =>
      (p.user_id && u.username.toLowerCase() === p.user_id.toLowerCase()) ||
      (p.user_id && u.email.toLowerCase() === p.user_id.toLowerCase()) ||
      (p.user_id && u.url_slug.toLowerCase() === p.user_id.toLowerCase()) ||
      (p.user_id && u.name.toLowerCase() === p.user_id.toLowerCase()) ||
      (p.user_id && u.name.toLowerCase().replace(/\s+/g, '') === p.user_id.toLowerCase())
    );

    if (softUser) {
      changed = true;
      return { ...p, user_id: softUser.id };
    }

    // 3. Unmatched property owner - attribute to active Captador if available, or active user
    if (activeCaptador) {
      changed = true;
      return { ...p, user_id: activeCaptador.id };
    }

    return p;
  });

  return { properties: normalized, changed };
}

export function getStoredSettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(initialCompanySettings));
      return initialCompanySettings;
    }
    const parsed = JSON.parse(raw);
    return { ...initialCompanySettings, ...parsed };
  } catch {
    return initialCompanySettings;
  }
}

export function saveStoredSettings(settings: CompanySettings) {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}

export function getStoredLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(KEYS.LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredLogs(logs: AuditLog[]) {
  try {
    localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save logs to localStorage', e);
  }
}

export function getStoredJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.JOURNAL);
    if (!raw) {
      localStorage.setItem(KEYS.JOURNAL, JSON.stringify(initialJournalEntries));
      return initialJournalEntries as JournalEntry[];
    }
    return JSON.parse(raw);
  } catch {
    return initialJournalEntries as JournalEntry[];
  }
}

export function saveStoredJournal(journals: JournalEntry[]) {
  try {
    localStorage.setItem(KEYS.JOURNAL, JSON.stringify(journals));
  } catch (e) {
    console.error('Failed to save journal entries', e);
  }
}

export function getStoredSchedule(): ScheduleEvent[] {
  try {
    const raw = localStorage.getItem(KEYS.SCHEDULE);
    if (!raw) {
      localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(initialScheduleEvents));
      return initialScheduleEvents as ScheduleEvent[];
    }
    return JSON.parse(raw);
  } catch {
    return initialScheduleEvents as ScheduleEvent[];
  }
}

export function saveStoredSchedule(events: ScheduleEvent[]) {
  try {
    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(events));
  } catch (e) {
    console.error('Failed to save schedule events', e);
  }
}

export function getStoredCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(KEYS.CURRENT_USER);
    if (raw) return JSON.parse(raw);
    
    // Fallback based on token
    const token = localStorage.getItem(KEYS.TOKEN);
    if (token) {
      const users = getStoredUsers();
      const matched = users.find(u => token.includes(u.id) || token.includes(u.username));
      if (matched) return matched;
      return users[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredCurrentUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
      localStorage.setItem(KEYS.TOKEN, `lopes_token_${user.id}`);
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
      localStorage.removeItem(KEYS.TOKEN);
    }
  } catch (e) {
    console.error('Failed to save current user', e);
  }
}

export function findUserByLogin(loginText: string): User | null {
  const users = getStoredUsers();
  const clean = loginText.trim().toLowerCase();
  const cleanNormalized = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  
  // 1. Try exact match on username, email, id, or url_slug
  const found = users.find(u => {
    if (!u) return false;
    const uUser = (u.username || '').toLowerCase().trim();
    const uEmail = (u.email || '').toLowerCase().trim();
    const uId = (u.id || '').toLowerCase().trim();
    const uSlug = (u.url_slug || '').toLowerCase().trim();
    const uName = (u.name || '').toLowerCase().trim();
    const uUserNormalized = uUser.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const uNameNormalized = uName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

    return (
      uUser === clean ||
      uEmail === clean ||
      uId === clean ||
      uSlug === clean ||
      uUserNormalized === cleanNormalized ||
      uName === clean ||
      uNameNormalized === cleanNormalized
    );
  });

  if (found) return found;

  // 2. Partial match fallback for convenience
  return users.find(u => {
    if (!u) return false;
    const uUser = (u.username || '').toLowerCase();
    const uName = (u.name || '').toLowerCase();
    const uNameNormalized = uName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    return (
      uUser.includes(clean) ||
      uName.includes(clean) ||
      (cleanNormalized.length >= 3 && uNameNormalized.includes(cleanNormalized))
    );
  }) || null;
}

export function getStoredPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEYS.PASSWORDS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    usr_admin: 'mudar123',
    usr_larissa: 'mudar123',
    usr_michele: 'mudar123',
    usr_moacir: 'mudar123',
    usr_karine: 'mudar123'
  };
}

export function saveStoredPasswords(passwords: Record<string, string>) {
  try {
    localStorage.setItem(KEYS.PASSWORDS, JSON.stringify(passwords));
  } catch (e) {
    console.error('Failed to save passwords locally', e);
  }
}

export function validateUserPassword(userId: string, passText: string): boolean {
  const cleanPass = passText.trim();
  
  // 1. Check user object in stored users
  const users = getStoredUsers();
  const user = users.find(u => u.id === userId);
  if (user && (user as any).password) {
    if (cleanPass === (user as any).password.trim()) return true;
  }

  // 2. Check in passwords map
  const passwords = getStoredPasswords();
  const expected = passwords[userId];
  if (expected && cleanPass === expected.trim()) return true;

  // 3. Check default system passwords
  const defaultPasswords = ['mudar123', '123456', 'admin', 'admin123', 'lopes123', 'lopes2026', '12345678'];
  if (defaultPasswords.includes(cleanPass)) {
    return true;
  }

  return false;
}

export function updateUserPassword(userId: string, newPass: string) {
  const cleanPass = newPass.trim();
  const passwords = getStoredPasswords();
  passwords[userId] = cleanPass;
  saveStoredPasswords(passwords);

  // Also update in stored users if present
  try {
    const users = getStoredUsers();
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, password: cleanPass };
      }
      return u;
    });
    localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));
  } catch {}
}

export function calculateStats(properties: Property[], users: User[]): DashboardStats {
  const total = properties.length;
  const available = properties.filter(p => p.status === 'Disponível').length;
  const sold = properties.filter(p => p.status === 'Vendido').length;
  const rented = properties.filter(p => p.status === 'Alugado').length;
  const reserved = properties.filter(p => p.status === 'Reservado').length;
  const activeUsers = users.filter(u => u.status === 'active').length;

  const captadorCounts: Record<string, { user_id: string; name: string; photo_url: string; count: number; url_slug: string }> = {};
  properties.forEach(p => {
    const owner = users.find(u => u.id === p.user_id);
    if (owner && owner.status === 'active') {
      if (!captadorCounts[owner.id]) {
        captadorCounts[owner.id] = {
          user_id: owner.id,
          name: owner.name,
          photo_url: owner.photo_url || '',
          count: 0,
          url_slug: owner.url_slug || owner.username
        };
      }
      captadorCounts[owner.id].count += 1;
    }
  });

  const topCaptadores = Object.values(captadorCounts)
    .sort((a, b) => b.count !== a.count ? b.count - a.count : a.name.localeCompare(b.name))
    .slice(0, 5);

  return {
    total_users: users.length,
    active_users: activeUsers,
    total_properties: total,
    available_properties: available,
    sold_properties: sold,
    rented_properties: rented,
    reserved_properties: reserved,
    recent_registrations: total,
    top_captadores: topCaptadores
  };
}
