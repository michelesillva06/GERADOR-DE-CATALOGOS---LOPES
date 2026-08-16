import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Login } from './pages/Login';
import { MasterDashboard } from './pages/MasterDashboard';
import { CaptadorDashboard } from './pages/CaptadorDashboard';
import { PropertyManagement } from './pages/PropertyManagement';
import { UserManagement } from './pages/UserManagement';
import { PublicCatalog } from './pages/PublicCatalog';
import { PublicPropertyDetail } from './pages/PublicPropertyDetail';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CaptadorJournalPage } from './pages/CaptadorJournalPage';
import { SchedulePage } from './pages/SchedulePage';
import { GeneralCatalogPage } from './pages/GeneralCatalogPage';
import { XMLImportPage } from './pages/XMLImportPage';
import { PropertyModal } from './components/PropertyModal';
import { PropertyFormModal } from './components/PropertyFormModal';
import { PDFCatalogModal } from './components/PDFCatalogModal';
import { buildWhatsAppUrl, getEffectiveWhatsApp } from './lib/whatsapp';
import { Property, User, CompanySettings, AuditLog, DashboardStats, JournalEntry, ScheduleEvent } from './types';
import { initialCompanySettings } from './data/mockData';
import {
  getStoredProperties,
  saveStoredProperties,
  getStoredUsers,
  saveStoredUsers,
  getStoredSettings,
  saveStoredSettings,
  getStoredLogs,
  saveStoredLogs,
  getStoredJournal,
  saveStoredJournal,
  getStoredSchedule,
  saveStoredSchedule,
  saveStoredCurrentUser,
  calculateStats,
  normalizePropertyOwners,
  updateUserPassword
} from './lib/storage';

function getAuthHeaders(contentType: boolean = true): Record<string, string> {
  const token = localStorage.getItem('lopes_token');
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function MainApp() {
  const { user, loading, setUser } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getStoredSettings());
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(getStoredJournal());
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(getStoredSchedule());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);

  // Modals state
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfModalScope, setPdfModalScope] = useState<'meus' | 'todos'>('meus');
  const [pdfPrefilteredProps, setPdfPrefilteredProps] = useState<Property[] | undefined>(undefined);

  // Fetch initial data
  const fetchData = async () => {
    let currentProps = getStoredProperties();
    let currentUsers = getStoredUsers();
    let currentSettings = getStoredSettings();
    let currentLogs = getStoredLogs();
    let currentJournals = getStoredJournal();
    let currentSchedule = getStoredSchedule();

    let healthy = false;
    try {
      const healthRes = await fetch('/api/health').catch(() => null);
      if (healthRes && healthRes.ok) {
        healthy = true;
      }
    } catch (e) {
      console.warn('Backend health check failed:', e);
    }

    setIsBackendHealthy(healthy);

    if (healthy) {
      try {
        const authHeaders = getAuthHeaders(false);
        const [propsRes, usersRes, settingsRes, logsRes, statsRes, journalsRes, scheduleRes] = await Promise.all([
          fetch('/api/properties', { headers: authHeaders }).catch(() => null),
          fetch('/api/users', { headers: authHeaders }).catch(() => null),
          fetch('/api/settings', { headers: authHeaders }).catch(() => null),
          fetch('/api/logs', { headers: authHeaders }).catch(() => null),
          fetch('/api/stats', { headers: authHeaders }).catch(() => null),
          fetch('/api/journal', { headers: authHeaders }).catch(() => null),
          fetch('/api/schedule', { headers: authHeaders }).catch(() => null)
        ]);

        if (propsRes && propsRes.ok && (propsRes.headers.get('content-type') || '').includes('json')) {
          const d = await propsRes.json();
          if (Array.isArray(d.properties)) {
            currentProps = d.properties;
            saveStoredProperties(currentProps);
          }
        }
        if (usersRes && usersRes.ok && (usersRes.headers.get('content-type') || '').includes('json')) {
          const d = await usersRes.json();
          if (Array.isArray(d.users)) {
            currentUsers = d.users;
            saveStoredUsers(currentUsers);
          }
        }
        if (settingsRes && settingsRes.ok && (settingsRes.headers.get('content-type') || '').includes('json')) {
          const d = await settingsRes.json();
          if (d.settings) {
            currentSettings = { ...initialCompanySettings, ...d.settings };
            saveStoredSettings(currentSettings);
          }
        }
        if (logsRes && logsRes.ok && (logsRes.headers.get('content-type') || '').includes('json')) {
          const d = await logsRes.json();
          if (d.logs) {
            currentLogs = d.logs;
            saveStoredLogs(currentLogs);
          }
        }
        if (journalsRes && journalsRes.ok && (journalsRes.headers.get('content-type') || '').includes('json')) {
          const d = await journalsRes.json();
          if (d.journals) {
            currentJournals = d.journals;
            saveStoredJournal(currentJournals);
          }
        }
        if (scheduleRes && scheduleRes.ok && (scheduleRes.headers.get('content-type') || '').includes('json')) {
          const d = await scheduleRes.json();
          if (d.events) {
            currentSchedule = d.events;
            saveStoredSchedule(currentSchedule);
          }
        }
        if (statsRes && statsRes.ok && (statsRes.headers.get('content-type') || '').includes('json')) {
          const d = await statsRes.json();
          if (d.stats) setStats(d.stats);
        } else {
          setStats(calculateStats(currentProps, currentUsers));
        }
      } catch (e) {
        console.warn('Failed to load data from backend, using local storage:', e);
        setStats(calculateStats(currentProps, currentUsers));
      }
    } else {
      console.log('[Offline Mode] Relying strictly on LocalStorage.');
      setStats(calculateStats(currentProps, currentUsers));
    }

    // Ensure demo properties are present
    const hasDemo = currentProps.some(p => p.user_id === 'usr_demo' || p.id.startsWith('prop_demo_'));
    if (!hasDemo) {
      const stored = getStoredProperties();
      const demoFromStored = stored.filter(p => p.user_id === 'usr_demo' || p.id.startsWith('prop_demo_'));
      if (demoFromStored.length > 0) {
        currentProps = [...currentProps, ...demoFromStored];
      }
    }

    // Normalize property owners accurately without destroying active captador ownership
    if (currentUsers.length > 0 && currentProps.length > 0) {
      const { properties: normalizedProps, changed } = normalizePropertyOwners(currentProps, currentUsers);
      if (changed) {
        currentProps = normalizedProps;
        saveStoredProperties(currentProps);
      }
    }

    setProperties(currentProps);
    setUsers(currentUsers);
    setCompanySettings(currentSettings);
    setLogs(currentLogs);
    setJournalEntries(currentJournals);
    setScheduleEvents(currentSchedule);
    if (!stats) {
      setStats(calculateStats(currentProps, currentUsers));
    }
  };

  useEffect(() => {
    if (user) {
      setActiveView('dashboard');
      fetchData();

      const handleFocus = () => {
        fetchData();
      };
      const handleCustomUpdate = () => {
        fetchData();
      };

      window.addEventListener('focus', handleFocus);
      window.addEventListener('lopes_properties_updated', handleCustomUpdate);

      // Periodic sync every 15 seconds to detect server changes in background
      const interval = setInterval(() => {
        fetchData();
      }, 15000);

      return () => {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('lopes_properties_updated', handleCustomUpdate);
        clearInterval(interval);
      };
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#F10F4D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Carregando Lopes Captação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Handlers
  const handleOpenNewProperty = () => {
    setEditingProperty(null);
    setIsFormModalOpen(true);
  };

  const handleEditProperty = (prop: Property) => {
    setEditingProperty(prop);
    setIsFormModalOpen(true);
  };

  const handleSaveProperty = async (propData: Partial<Property>) => {
    let savedPropFromBackend: Property | null = null;
    const targetUserId = propData.user_id || user.id;

    if (isBackendHealthy) {
      try {
        if (editingProperty) {
          const res = await fetch(`/api/properties/${editingProperty.id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ ...propData, user_id: targetUserId })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.property) savedPropFromBackend = data.property;
          }
        } else {
          const res = await fetch('/api/properties', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ ...propData, user_id: targetUserId })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.property) savedPropFromBackend = data.property;
          }
        }
      } catch (e) {
        console.warn('Backend API unavailable, saving property locally:', e);
      }
    }

    // Local state fallback / synchronization
    const allProps = getStoredProperties();
    let updatedProps: Property[] = [];
    const captadorUser = users.find(u => u.id === targetUserId) || user;

    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      user_id: targetUserId,
      user_name: captadorUser.name,
      action: editingProperty ? 'Edição de Imóvel' : 'Cadastro de Imóvel',
      description: editingProperty
        ? `Atualizou o imóvel ${editingProperty.code}`
        : `Cadastrou o imóvel ${propData.code || 'novo'} (${propData.title || ''})`,
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString()
    };

    if (savedPropFromBackend) {
      const existingIdx = allProps.findIndex(p => p.id === savedPropFromBackend!.id || p.code === savedPropFromBackend!.code);
      if (existingIdx >= 0) {
        updatedProps = [...allProps];
        updatedProps[existingIdx] = savedPropFromBackend;
      } else {
        updatedProps = [savedPropFromBackend, ...allProps];
      }
    } else if (editingProperty) {
      updatedProps = allProps.map(p => p.id === editingProperty.id ? { ...p, ...propData, user_id: targetUserId, updated_at: new Date().toISOString() } as Property : p);
    } else {
      const newCode = `LOP-${Math.floor(100 + Math.random() * 900)}`;
      const mainImg = propData.images?.[0] || propData.main_image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
      const newProp: Property = {
        id: `prop_${Date.now()}`,
        code: propData.code || newCode,
        title: propData.title || 'Imóvel sem título',
        category: propData.category || 'Apartamento',
        purpose: propData.purpose || 'Venda',
        price: propData.price || 0,
        rent_price: propData.rent_price || 0,
        condo_fee: propData.condo_fee || 0,
        iptu: propData.iptu || 0,
        address: propData.address || '',
        neighborhood: propData.neighborhood || '',
        city: propData.city || 'Manaus',
        state: propData.state || 'AM',
        bedrooms: propData.bedrooms || 0,
        suites: propData.suites || 0,
        bathrooms: propData.bathrooms || 0,
        parking_spaces: propData.parking_spaces || 0,
        total_area: propData.total_area || 0,
        built_area: propData.built_area || 0,
        description: propData.description || '',
        features: propData.features || [],
        images: propData.images || [mainImg],
        main_image: mainImg,
        status: propData.status || 'Disponível',
        user_id: targetUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      updatedProps = [newProp, ...allProps];
    }

    const { properties: normalizedProps } = normalizePropertyOwners(updatedProps, users.length > 0 ? users : [user]);
    saveStoredProperties(normalizedProps);
    setProperties(normalizedProps);
    setStats(calculateStats(normalizedProps, users));

    const updatedLogs = [newLog, ...logs];
    saveStoredLogs(updatedLogs);
    setLogs(updatedLogs);

    window.dispatchEvent(new Event('lopes_properties_updated'));
  };

  const handleDeleteProperty = async (prop: Property) => {
    if (!confirm(`Deseja realmente excluir o imóvel ${prop.code} (${prop.title})? Esta ação não pode ser desfeita.`)) return;

    if (viewingProperty && (viewingProperty.id === prop.id || viewingProperty.code === prop.code)) {
      setViewingProperty(null);
    }

    let backendFailed = false;
    let backendErrorMsg = '';

    if (isBackendHealthy) {
      try {
        const res = await fetch(`/api/properties/${encodeURIComponent(prop.id)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(false)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          backendErrorMsg = errData.error || `Erro ${res.status} ao excluir do servidor.`;
          backendFailed = true;
        }
      } catch (e) {
        console.warn('Backend API error during delete:', e);
      }
    }

    if (backendFailed && backendErrorMsg) {
      alert(`Não foi possível excluir o imóvel: ${backendErrorMsg}`);
      return;
    }

    const allProps = getStoredProperties().filter(p => p.id !== prop.id && p.code !== prop.code);
    saveStoredProperties(allProps);
    setProperties(allProps);
    setStats(calculateStats(allProps, users));

    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      user_id: user?.id || 'unknown',
      user_name: user?.name || 'Usuário',
      action: 'Exclusão de Imóvel',
      description: `Excluiu o imóvel ${prop.code} - ${prop.title}`,
      created_at: new Date().toISOString()
    };
    const updatedLogs = [newLog, ...logs];
    saveStoredLogs(updatedLogs);
    setLogs(updatedLogs);

    window.dispatchEvent(new Event('lopes_properties_updated'));
  };

  const handleViewPropertyDetails = (prop: Property) => {
    const updatedViews = (prop.views || 0) + 1;
    const updatedProp = { ...prop, views: updatedViews };
    setViewingProperty(updatedProp);

    const allProps = getStoredProperties().map(p => p.id === prop.id ? updatedProp : p);
    saveStoredProperties(allProps);
    setProperties(allProps);
  };

  const handleShareWhatsApp = (prop: Property) => {
    const owner = users.find(u => u.id === prop.user_id) || user;
    const phone = getEffectiveWhatsApp(owner, companySettings);
    const link = `${window.location.origin}/imovel/${encodeURIComponent(prop.code || prop.id)}`;
    const text = `Olá ${owner.name}! Gostaria de informações e agendar visita para o imóvel "${prop.title}": ${link}`;
    const waUrl = buildWhatsAppUrl(phone, text);
    window.open(waUrl, '_blank');
  };

  const handleAddUser = async (userData: any) => {
    let createdFromBackend: User | null = null;
    if (isBackendHealthy) {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(userData)
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('json')) {
          const data = await res.json();
          if (data.user) createdFromBackend = data.user;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Erro ao cadastrar usuário');
        }
      } catch (e: any) {
        console.warn('Backend API error or unavailable, adding user locally:', e);
        if (e.message && !e.message.includes('Failed to fetch')) {
          throw e;
        }
      }
    }

    const allUsers = getStoredUsers();
    const newUser: User = createdFromBackend || {
      id: `usr_${Date.now()}`,
      name: userData.name || 'Novo Usuário',
      email: userData.email || '',
      username: (userData.username || `user_${Date.now()}`).toLowerCase().trim(),
      phone: userData.phone || '',
      whatsapp: userData.whatsapp || userData.phone || '',
      role: userData.role || 'CAPTADOR',
      position: userData.position || 'Corretor',
      url_slug: (userData.url_slug || userData.username || `user_${Date.now()}`).toLowerCase().replace(/[^a-z0-9]/g, ''),
      status: 'active',
      photo_url: userData.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      creci: userData.creci || '',
      instagram: userData.instagram || '',
      created_at: new Date().toISOString()
    };

    const existingIdx = allUsers.findIndex(u => u.id === newUser.id || u.username.toLowerCase() === newUser.username.toLowerCase());
    let updatedUsers: User[];
    if (existingIdx >= 0) {
      updatedUsers = [...allUsers];
      updatedUsers[existingIdx] = { ...updatedUsers[existingIdx], ...newUser };
    } else {
      updatedUsers = [...allUsers, newUser];
    }

    if (userData.password) {
      updateUserPassword(newUser.id, userData.password);
    }

    saveStoredUsers(updatedUsers);
    setUsers(updatedUsers);
    setStats(calculateStats(properties, updatedUsers));
  };

  const handleUpdateUser = async (id: string, userData: any) => {
    let updatedFromBackend: User | null = null;
    if (isBackendHealthy) {
      try {
        const res = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(userData)
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('json')) {
          const data = await res.json();
          if (data.user) updatedFromBackend = data.user;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Erro ao atualizar dados do usuário');
        }
      } catch (e: any) {
        console.warn('Backend API error or unavailable, updating user locally:', e);
        if (e.message && !e.message.includes('Failed to fetch')) {
          throw e;
        }
      }
    }

    const currentUsers = getStoredUsers();
    const allUsers = currentUsers.map(u => {
      if (u.id === id) {
        return updatedFromBackend || { ...u, ...userData };
      }
      return u;
    });
    
    if (userData.password) {
      updateUserPassword(id, userData.password);
    }

    saveStoredUsers(allUsers);
    setUsers(allUsers);

    if (user && user.id === id) {
      const updatedSelf = updatedFromBackend || { ...user, ...userData };
      saveStoredCurrentUser(updatedSelf);
      setUser(updatedSelf);
    }
  };

  const handleResetUserPassword = async (id: string, newPass: string) => {
    if (isBackendHealthy) {
      try {
        const res = await fetch(`/api/users/${id}/reset-password`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ newPassword: newPass })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Falha ao redefinir senha.');
        }
      } catch (e: any) {
        console.warn('Backend API reset-password fallback to local:', e);
        if (e.message && !e.message.includes('Failed to fetch')) {
          throw e;
        }
      }
    }

    updateUserPassword(id, newPass);
  };

  const handleToggleBlockUser = async (id: string) => {
    let updatedUserFromBackend: User | null = null;
    if (isBackendHealthy) {
      try {
        const res = await fetch(`/api/users/${id}/block`, {
          method: 'PATCH',
          headers: getAuthHeaders(false)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) updatedUserFromBackend = data.user;
        }
      } catch (e) {
        console.warn('Backend API unavailable, toggling user block locally:', e);
      }
    }

    const currentUsers = getStoredUsers();
    const allUsers = currentUsers.map(u => {
      if (u.id === id) {
        if (updatedUserFromBackend) return updatedUserFromBackend;
        const nextStatus = u.status === 'active' ? 'blocked' : 'active';
        return { ...u, status: nextStatus } as User;
      }
      return u;
    });
    saveStoredUsers(allUsers);
    setUsers(allUsers);
    setStats(calculateStats(properties, allUsers));
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Todos os imóveis captados por ele serão mantidos no sistema e transferidos para a administração master.')) return;
    if (isBackendHealthy) {
      try {
        await fetch(`/api/users/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(false)
        });
      } catch (e) {
        console.warn('Backend API unavailable, deleting user locally:', e);
      }
    }

    const currentUsers = getStoredUsers();
    const masterAdmin = currentUsers.find(u => u.role === 'MASTER_ADMIN') || currentUsers[0];
    const masterId = masterAdmin ? masterAdmin.id : 'usr_admin';

    // Reassign properties owned by deleted user to Master Admin so they are never lost
    const currentProps = getStoredProperties();
    const updatedProps = currentProps.map(p => p.user_id === id ? { ...p, user_id: masterId } : p);
    saveStoredProperties(updatedProps);
    setProperties(updatedProps);

    const allUsers = currentUsers.filter(u => u.id !== id);
    saveStoredUsers(allUsers);
    setUsers(allUsers);
    setStats(calculateStats(updatedProps, allUsers));
  };

  const handleSaveSettings = async (newSettings: Partial<CompanySettings>) => {
    let savedSettingsFromBackend: CompanySettings | null = null;
    if (isBackendHealthy) {
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(newSettings)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) savedSettingsFromBackend = data.settings;
        }
      } catch (e) {
        console.warn('Backend API unavailable, saving settings locally:', e);
      }
    }

    const updated = savedSettingsFromBackend || {
      ...companySettings,
      ...newSettings
    };

    saveStoredSettings(updated);
    setCompanySettings(updated);
  };

  const handleSaveJournal = async (entryData: Partial<JournalEntry>) => {
    if (isBackendHealthy) {
      try {
        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(entryData)
        });
        if (res.ok) {
          const d = await res.json();
          if (d.journal) {
            const currentList = getStoredJournal();
            const idx = currentList.findIndex(j => j.id === d.journal.id || (j.user_id === d.journal.user_id && j.date === d.journal.date));
            let updatedList = [...currentList];
            if (idx !== -1) {
              updatedList[idx] = d.journal;
            } else {
              updatedList.unshift(d.journal);
            }
            saveStoredJournal(updatedList);
            setJournalEntries(updatedList);
            return;
          }
        }
      } catch (e) {
        console.warn('Backend API unavailable, saving journal locally:', e);
      }
    }

    // Local fallback
    const currentList = getStoredJournal();
    const idx = currentList.findIndex(j => j.user_id === entryData.user_id && j.date === entryData.date);
    const newEntry: JournalEntry = {
      id: idx !== -1 ? currentList[idx].id : `jrn_${Date.now()}`,
      user_id: entryData.user_id || user.id,
      user_name: entryData.user_name || user.name,
      date: entryData.date || new Date().toISOString().split('T')[0],
      summary_notes: entryData.summary_notes || '',
      key_highlights: entryData.key_highlights || [],
      next_day_goals: entryData.next_day_goals || '',
      rating: entryData.rating || 'Produtivo',
      leads_prospectados: Number(entryData.leads_prospectados) || 0,
      imoveis_captados: Number(entryData.imoveis_captados) || 0,
      visitas_realizadas: Number(entryData.visitas_realizadas) || 0,
      canais_captacao: entryData.canais_captacao || {
        portal: 0,
        placa_rua: 0,
        indicacao: 0,
        redes_sociais: 0,
        telefone_ativo: 0,
        parceria: 0,
        outros: 0
      },
      canal_principal: entryData.canal_principal || 'Direto / Geral',
      auto_metrics: entryData.auto_metrics || { properties_created: 0, properties_updated: 0, status_changes: 0, visits_count: 0 },
      created_at: idx !== -1 ? currentList[idx].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let updatedList = [...currentList];
    if (idx !== -1) {
      updatedList[idx] = newEntry;
    } else {
      updatedList.unshift(newEntry);
    }
    saveStoredJournal(updatedList);
    setJournalEntries(updatedList);
  };

  const handleAddScheduleEvent = async (eventData: Partial<ScheduleEvent>): Promise<{ success: boolean; error?: string }> => {
    if (isBackendHealthy) {
      try {
        const res = await fetch('/api/schedule', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(eventData)
        });

        const d = await res.json();
        if (!res.ok) {
          return { success: false, error: d.error || 'Erro ao agendar compromisso.' };
        }

        if (d.event) {
          const currentSchedule = getStoredSchedule();
          const updated = [d.event, ...currentSchedule];
          saveStoredSchedule(updated);
          setScheduleEvents(updated);
          return { success: true };
        }
      } catch (e) {
        console.warn('Backend API unavailable, saving schedule locally:', e);
      }
    }

    // Local Fallback validation & saving
    const currentSchedule = getStoredSchedule();

    // Check holiday
    const isHoliday = currentSchedule.some(e => e.type === 'FERIADO' && e.date === eventData.date);
    if (isHoliday && eventData.type !== 'FERIADO') {
      return { success: false, error: 'Data bloqueada por feriado oficial!' };
    }

    // Conflict check for date and time slot across all captadores
    const startA = eventData.start_time || '09:00';
    const endA = eventData.end_time || startA;

    const conflict = currentSchedule.find(e => {
      if (e.type === 'FERIADO' || e.date !== eventData.date) return false;
      const startB = e.start_time || '09:00';
      const endB = e.end_time || startB;
      const overlap = (startA < endB && endA > startB) || (startA === startB && endA === endB);
      return overlap;
    });

    if (conflict) {
      return {
        success: false,
        error: `Horário indisponível! O captador ${conflict.user_name} já possui um agendamento (${conflict.title}) neste dia (${eventData.date}) das ${conflict.start_time} às ${conflict.end_time}.`
      };
    }

    const newEv: ScheduleEvent = {
      id: `event_${Date.now()}`,
      title: eventData.title || 'Visita / Agendamento',
      type: eventData.type || 'VISITA',
      date: eventData.date || new Date().toISOString().split('T')[0],
      start_time: eventData.start_time || '09:00',
      end_time: eventData.end_time || '10:00',
      user_id: eventData.user_id || user.id,
      user_name: eventData.user_name || user.name,
      property_id: eventData.property_id,
      property_code: eventData.property_code,
      client_name: eventData.client_name,
      client_phone: eventData.client_phone,
      location: eventData.location,
      notes: eventData.notes,
      exclusive_visit: eventData.exclusive_visit ?? true,
      created_at: new Date().toISOString()
    };

    const updated = [newEv, ...currentSchedule];
    saveStoredSchedule(updated);
    setScheduleEvents(updated);
    return { success: true };
  };

  const handleDeleteScheduleEvent = async (id: string) => {
    if (isBackendHealthy) {
      try {
        await fetch(`/api/schedule/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(false)
        });
      } catch (e) {
        console.warn('Backend API unavailable, deleting event locally:', e);
      }
    }

    const currentSchedule = getStoredSchedule().filter(e => e.id !== id);
    saveStoredSchedule(currentSchedule);
    setScheduleEvents(currentSchedule);
  };

  const handlePropertiesImported = (newPropsList: Property[], message: string) => {
    if (Array.isArray(newPropsList) && newPropsList.length > 0) {
      setProperties(newPropsList);
      saveStoredProperties(newPropsList);
      const newStats = calculateStats(newPropsList, users);
      setStats(newStats);
    }
    fetchData();
  };

  const isMaster = user.role === 'MASTER_ADMIN';
  const isGestor = user.role === 'GESTOR' || user.role === 'GESTORA';
  const isMasterOrGestor = isMaster || isGestor;
  const captadorOwner = viewingProperty ? users.find(u => u.id === viewingProperty.user_id) || user : user;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        users={users}
      />

      <div className="flex flex-1">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenNewPropertyModal={handleOpenNewProperty}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          
          {activeView === 'dashboard' && (
            isMasterOrGestor ? (
              <MasterDashboard
                stats={stats}
                properties={properties}
                users={users}
                logs={logs}
                onOpenNewPropertyModal={handleOpenNewProperty}
                onOpenNewUserModal={() => setActiveView('users')}
                setActiveView={setActiveView}
              />
            ) : (
              <CaptadorDashboard
                user={user}
                properties={properties}
                companySettings={companySettings}
                onOpenNewPropertyModal={handleOpenNewProperty}
                onOpenPdfModal={() => setIsPdfModalOpen(true)}
                onViewProperty={handleViewPropertyDetails}
                onEditProperty={handleEditProperty}
                onDeleteProperty={handleDeleteProperty}
                onShareWhatsApp={handleShareWhatsApp}
              />
            )
          )}

          {activeView === 'schedule' && (
            <SchedulePage
              currentUser={user}
              users={users}
              properties={properties}
              scheduleEvents={scheduleEvents}
              onAddEvent={handleAddScheduleEvent}
              onDeleteEvent={handleDeleteScheduleEvent}
            />
          )}

          {activeView === 'journal' && (
            <CaptadorJournalPage
              currentUser={user}
              users={users}
              properties={properties}
              logs={logs}
              scheduleEvents={scheduleEvents}
              journalEntries={journalEntries}
              onSaveJournal={handleSaveJournal}
            />
          )}

          {activeView === 'properties' && (
            <PropertyManagement
              properties={properties}
              users={users}
              currentUser={user}
              onOpenNewPropertyModal={handleOpenNewProperty}
              onOpenPdfModal={() => setIsPdfModalOpen(true)}
              onOpenXmlImport={() => setActiveView('xml-import')}
              onViewProperty={handleViewPropertyDetails}
              onEditProperty={handleEditProperty}
              onDeleteProperty={handleDeleteProperty}
              onShareWhatsApp={handleShareWhatsApp}
            />
          )}

          {activeView === 'xml-import' && isMaster && (
            <XMLImportPage
              currentUser={user}
              users={users}
              properties={properties}
              onPropertiesImported={handlePropertiesImported}
              onNavigateToProperties={() => setActiveView('properties')}
              onNavigateToPDF={() => setIsPdfModalOpen(true)}
            />
          )}

          {activeView === 'general-catalog' && (
            <GeneralCatalogPage
              properties={properties}
              users={users}
              companySettings={companySettings}
              onOpenPdfCatalog={(prefiltered) => {
                setPdfModalScope('todos');
                setPdfPrefilteredProps(prefiltered);
                setIsPdfModalOpen(true);
              }}
              onViewProperty={handleViewPropertyDetails}
            />
          )}

          {activeView === 'users' && isMaster && (
            <UserManagement
              users={users}
              currentUser={user}
              onRefreshUsers={fetchData}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onResetPassword={handleResetUserPassword}
              onToggleBlock={handleToggleBlockUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeView === 'reports' && isMasterOrGestor && (
            <ReportsPage
              properties={properties}
              users={users}
              logs={logs}
              companySettings={companySettings}
              currentUser={user}
              journalEntries={journalEntries}
            />
          )}

          {activeView === 'pdf-catalog' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm max-w-2xl mx-auto space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-[#F10F4D] flex items-center justify-center mx-auto">
                <span className="font-extrabold text-2xl">PDF</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">Gerador de Catálogo em PDF</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Gere documentos PDF com capa, QR Code das páginas públicas dos imóveis e dados do captador.
              </p>
              <button
                onClick={() => {
                  setPdfModalScope('todos');
                  setPdfPrefilteredProps(undefined);
                  setIsPdfModalOpen(true);
                }}
                className="px-6 py-3 bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                Abrir Gerador de Catálogo PDF
              </button>
            </div>
          )}

          {activeView === 'logs' && isMaster && (
            <AuditLogsPage logs={logs} />
          )}

          {activeView === 'settings' && (
            <SettingsPage
              settings={companySettings}
              currentUser={user}
              onSaveSettings={handleSaveSettings}
              onUpdateUser={handleUpdateUser}
            />
          )}

        </main>
      </div>

      {/* Global Modals */}
      {viewingProperty && (
        <PropertyModal
          property={viewingProperty}
          captador={captadorOwner}
          companySettings={companySettings}
          canEdit={isMaster || isGestor || viewingProperty.user_id === user.id || viewingProperty.user_id?.toLowerCase() === user.id?.toLowerCase() || viewingProperty.user_id?.toLowerCase() === user.username?.toLowerCase() || viewingProperty.user_id?.toLowerCase() === user.email?.toLowerCase()}
          onEdit={(prop) => {
            setViewingProperty(null);
            handleEditProperty(prop);
          }}
          onDelete={(prop) => {
            handleDeleteProperty(prop);
          }}
          onClose={() => setViewingProperty(null)}
        />
      )}

      {isFormModalOpen && (
        <PropertyFormModal
          isOpen={isFormModalOpen}
          property={editingProperty}
          users={users}
          currentUserId={user.id}
          isMaster={isMaster}
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSaveProperty}
        />
      )}

      {isPdfModalOpen && (
        <PDFCatalogModal
          isOpen={isPdfModalOpen}
          properties={properties}
          captadores={users}
          currentCaptador={user}
          companySettings={companySettings}
          initialScope={pdfModalScope}
          initialSelectedProps={pdfPrefilteredProps}
          onSaveSettings={handleSaveSettings}
          onClose={() => {
            setIsPdfModalOpen(false);
            setPdfPrefilteredProps(undefined);
          }}
        />
      )}

      <MobileBottomNav
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenNewPropertyModal={handleOpenNewProperty}
      />

    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentHash(window.location.hash);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const path = currentPath || '';
  const hash = currentHash || '';

  // Check if current URL is a public property route e.g. /imovel/LOP-101 or #/imovel/LOP-101
  if (path.startsWith('/imovel/') || hash.startsWith('#/imovel/') || hash.startsWith('#imovel/')) {
    const rawParam = path.startsWith('/imovel/')
      ? path.substring('/imovel/'.length)
      : hash.replace(/^#\/?imovel\//, '');
    const cleanCode = decodeURIComponent(rawParam.split('?')[0].replace(/\/$/, '')).trim();

    return (
      <PublicPropertyDetail
        code={cleanCode || 'LOP-DEMO1'}
        companySettings={getStoredSettings()}
      />
    );
  }

  // Check if current URL path is a public catalog route e.g. /catalogo/michelesilva or #/catalogo/michelesilva
  if (path.startsWith('/catalogo/') || hash.startsWith('#/catalogo/') || hash.startsWith('#catalogo/')) {
    const rawSlug = path.startsWith('/catalogo/')
      ? path.substring('/catalogo/'.length)
      : hash.replace(/^#\/?catalogo\//, '');
    const cleanSlug = decodeURIComponent(rawSlug.split('?')[0].replace(/\/$/, '')).trim();

    return (
      <PublicCatalog
        slug={cleanSlug || 'geral'}
        companySettings={getStoredSettings()}
      />
    );
  }

  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
