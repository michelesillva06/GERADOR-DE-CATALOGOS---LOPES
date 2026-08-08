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
  TOKEN: 'lopes_token'
};

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(KEYS.USERS);
    if (!raw) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return JSON.parse(raw);
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
    if (!raw) {
      localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(initialProperties));
      return initialProperties;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 0) {
      localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(initialProperties));
      return initialProperties;
    }
    return parsed;
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
  
  // Try exact match on username, email, or id
  const found = users.find(u => 
    u.username.toLowerCase() === clean || 
    u.email.toLowerCase() === clean || 
    u.id.toLowerCase() === clean ||
    u.url_slug.toLowerCase() === clean
  );

  if (found) return found;

  // Partial match fallback for convenience
  return users.find(u => u.username.toLowerCase().includes(clean) || u.name.toLowerCase().includes(clean)) || null;
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
