import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
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
import { PropertyModal } from './components/PropertyModal';
import { PropertyFormModal } from './components/PropertyFormModal';
import { PDFCatalogModal } from './components/PDFCatalogModal';
import { buildWhatsAppUrl, getEffectiveWhatsApp } from './lib/whatsapp';
import { Property, User, CompanySettings, AuditLog, DashboardStats } from './types';
import {
  getStoredProperties,
  saveStoredProperties,
  getStoredUsers,
  saveStoredUsers,
  getStoredSettings,
  saveStoredSettings,
  getStoredLogs,
  saveStoredLogs,
  saveStoredCurrentUser,
  calculateStats
} from './lib/storage';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getStoredSettings());
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Modals state
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    let currentProps = getStoredProperties();
    let currentUsers = getStoredUsers();
    let currentSettings = getStoredSettings();
    let currentLogs = getStoredLogs();

    try {
      const [propsRes, usersRes, settingsRes, logsRes, statsRes] = await Promise.all([
        fetch('/api/properties').catch(() => null),
        fetch('/api/users').catch(() => null),
        fetch('/api/settings').catch(() => null),
        fetch('/api/logs').catch(() => null),
        fetch('/api/stats').catch(() => null)
      ]);

      if (propsRes && propsRes.ok && (propsRes.headers.get('content-type') || '').includes('json')) {
        const d = await propsRes.json();
        if (d.properties) {
          currentProps = d.properties;
          saveStoredProperties(currentProps);
        }
      }
      if (usersRes && usersRes.ok && (usersRes.headers.get('content-type') || '').includes('json')) {
        const d = await usersRes.json();
        if (d.users) {
          currentUsers = d.users;
          saveStoredUsers(currentUsers);
        }
      }
      if (settingsRes && settingsRes.ok && (settingsRes.headers.get('content-type') || '').includes('json')) {
        const d = await settingsRes.json();
        if (d.settings) {
          currentSettings = d.settings;
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

    setProperties(currentProps);
    setUsers(currentUsers);
    setCompanySettings(currentSettings);
    setLogs(currentLogs);
    if (!stats) {
      setStats(calculateStats(currentProps, currentUsers));
    }
  };

  useEffect(() => {
    if (user) {
      setActiveView('dashboard');
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#F10F4D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carregando Lopes Captação...</p>
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
    try {
      if (editingProperty) {
        await fetch(`/api/properties/${editingProperty.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(propData)
        });
      } else {
        await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...propData, user_id: propData.user_id || user.id })
        });
      }
    } catch (e) {
      console.warn('Backend API unavailable, saving property locally:', e);
    }

    // Local state fallback / synchronization
    const allProps = getStoredProperties();
    let updatedProps: Property[] = [];
    if (editingProperty) {
      updatedProps = allProps.map(p => p.id === editingProperty.id ? { ...p, ...propData } as Property : p);
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
        user_id: propData.user_id || user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      updatedProps = [newProp, ...allProps];
    }
    saveStoredProperties(updatedProps);
    setProperties(updatedProps);
    setStats(calculateStats(updatedProps, users));
  };

  const handleDeleteProperty = async (prop: Property) => {
    if (!confirm(`Deseja realmente excluir o imóvel ${prop.code}?`)) return;
    try {
      await fetch(`/api/properties/${prop.id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend API unavailable, deleting property locally:', e);
    }

    const allProps = getStoredProperties().filter(p => p.id !== prop.id);
    saveStoredProperties(allProps);
    setProperties(allProps);
    setStats(calculateStats(allProps, users));
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
    const link = `${window.location.origin}/imovel/${prop.id}`;
    const text = `Olá ${owner.name}! Gostaria de informações e agendar visita para o imóvel "${prop.title}": ${link}`;
    const waUrl = buildWhatsAppUrl(phone, text);
    window.open(waUrl, '_blank');
  };

  const handleAddUser = async (userData: any) => {
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
    } catch (e) {
      console.warn('Backend API unavailable, adding user locally:', e);
    }

    const allUsers = getStoredUsers();
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: userData.name || 'Novo Usuário',
      email: userData.email || '',
      username: userData.username || `user_${Date.now()}`,
      phone: userData.phone || '',
      whatsapp: userData.whatsapp || userData.phone || '',
      role: userData.role || 'CAPTADOR',
      position: userData.position || 'Corretor',
      url_slug: userData.url_slug || userData.username || `user_${Date.now()}`,
      status: 'active',
      photo_url: userData.photo_url || '',
      creci: userData.creci || '',
      instagram: userData.instagram || '',
      created_at: new Date().toISOString()
    };
    const updatedUsers = [...allUsers, newUser];
    saveStoredUsers(updatedUsers);
    setUsers(updatedUsers);
    setStats(calculateStats(properties, updatedUsers));
  };

  const handleUpdateUser = async (id: string, userData: any) => {
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
    } catch (e) {
      console.warn('Backend API unavailable, updating user locally:', e);
    }

    const allUsers = getStoredUsers().map(u => u.id === id ? { ...u, ...userData } : u);
    saveStoredUsers(allUsers);
    setUsers(allUsers);

    if (user && user.id === id) {
      const updatedSelf = { ...user, ...userData };
      saveStoredCurrentUser(updatedSelf);
    }
  };

  const handleToggleBlockUser = async (id: string) => {
    try {
      await fetch(`/api/users/${id}/block`, { method: 'PATCH' });
    } catch (e) {
      console.warn('Backend API unavailable, toggling user block locally:', e);
    }

    const allUsers = getStoredUsers().map(u => u.id === id ? { ...u, status: u.status === 'blocked' ? 'active' : 'blocked' } as User : u);
    saveStoredUsers(allUsers);
    setUsers(allUsers);
    setStats(calculateStats(properties, allUsers));
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Excluir este usuário permamente?')) return;
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend API unavailable, deleting user locally:', e);
    }

    const allUsers = getStoredUsers().filter(u => u.id !== id);
    saveStoredUsers(allUsers);
    setUsers(allUsers);
    setStats(calculateStats(properties, allUsers));
  };

  const handleSaveSettings = async (newSettings: Partial<CompanySettings>) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (e) {
      console.warn('Backend API unavailable, saving settings locally:', e);
    }

    const updated = { ...companySettings, ...newSettings };
    saveStoredSettings(updated);
    setCompanySettings(updated);
  };

  const isMaster = user.role === 'MASTER_ADMIN';
  const isGestora = user.role === 'GESTORA';
  const isMasterOrGestora = isMaster || isGestora;
  const captadorOwner = viewingProperty ? users.find(u => u.id === viewingProperty.user_id) || user : user;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <div className="flex flex-1">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenNewPropertyModal={handleOpenNewProperty}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          
          {activeView === 'dashboard' && (
            isMasterOrGestora ? (
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

          {activeView === 'properties' && (
            <PropertyManagement
              properties={properties}
              users={users}
              currentUser={user}
              onOpenNewPropertyModal={handleOpenNewProperty}
              onOpenPdfModal={() => setIsPdfModalOpen(true)}
              onViewProperty={handleViewPropertyDetails}
              onEditProperty={handleEditProperty}
              onDeleteProperty={handleDeleteProperty}
              onShareWhatsApp={handleShareWhatsApp}
            />
          )}

          {activeView === 'users' && isMasterOrGestora && (
            <UserManagement
              users={users}
              currentUser={user}
              onRefreshUsers={fetchData}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onToggleBlock={handleToggleBlockUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeView === 'reports' && isMasterOrGestora && (
            <ReportsPage
              properties={properties}
              users={users}
              logs={logs}
              companySettings={companySettings}
              currentUser={user}
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
                onClick={() => setIsPdfModalOpen(true)}
                className="px-6 py-3 bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                Abrir Gerador de Catálogo PDF
              </button>
            </div>
          )}

          {activeView === 'logs' && isMasterOrGestora && (
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
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}

    </div>
  );
}

export default function App() {
  // Check if current URL path is a public catalog route e.g. /catalogo/michelesilva
  const path = window.location.pathname;

  if (path.startsWith('/imovel/')) {
    const code = path.split('/imovel/')[1]?.split('?')[0];
    return (
      <PublicPropertyDetail
        code={code || 'LOP-101'}
        companySettings={{
          company_name: 'Lopes Manaus',
          unit_name: 'Lopes Imobiliária - Shopping Ponta Negra',
          logo_url: '',
          primary_color: '#F10F4D',
          phone: '(92) 3659-1000',
          whatsapp: '5592981234567',
          email: 'contato@lopesmanaus.com.br',
          address: 'Av. Coronel Teixeira, 5705, Loja LUC 15.2 no Shopping Ponta Negra, Bairro Ponta Negra, CEP 69037-000, Manaus - AM',
          city: 'Manaus',
          state: 'AM',
          instagram: '@lopesmanaus',
          creci_j: '540-J/AM'
        }}
      />
    );
  }

  if (path.startsWith('/catalogo/')) {
    const slug = path.split('/catalogo/')[1]?.split('?')[0];
    return (
      <PublicCatalog
        slug={slug || 'michelesilva'}
        companySettings={{
          company_name: 'Lopes Manaus',
          unit_name: 'Lopes Imobiliária - Shopping Ponta Negra',
          logo_url: '',
          primary_color: '#F10F4D',
          phone: '(92) 3659-1000',
          whatsapp: '5592981234567',
          email: 'contato@lopesmanaus.com.br',
          address: 'Av. Coronel Teixeira, 5705, Loja LUC 15.2 no Shopping Ponta Negra, Bairro Ponta Negra, CEP 69037-000, Manaus - AM',
          city: 'Manaus',
          state: 'AM',
          instagram: '@lopesmanaus',
          creci_j: '540-J/AM'
        }}
      />
    );
  }

  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
