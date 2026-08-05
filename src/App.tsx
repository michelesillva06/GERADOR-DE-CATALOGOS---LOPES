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
import { PropertyModal } from './components/PropertyModal';
import { PropertyFormModal } from './components/PropertyFormModal';
import { PDFCatalogModal } from './components/PDFCatalogModal';
import { Property, User, CompanySettings, AuditLog, DashboardStats } from './types';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
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
  });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Modals state
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [propsRes, usersRes, settingsRes, logsRes, statsRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/users'),
        fetch('/api/settings'),
        fetch('/api/logs'),
        fetch('/api/stats')
      ]);

      if (propsRes.ok) {
        const d = await propsRes.json();
        setProperties(d.properties || []);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.users || []);
      }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        if (d.settings) setCompanySettings(d.settings);
      }
      if (logsRes.ok) {
        const d = await logsRes.json();
        setLogs(d.logs || []);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats || null);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#F10F4D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carregando Lopes Manaus...</p>
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
    if (editingProperty) {
      const res = await fetch(`/api/properties/${editingProperty.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propData)
      });
      if (!res.ok) throw new Error('Falha ao atualizar imóvel.');
    } else {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...propData, user_id: propData.user_id || user.id })
      });
      if (!res.ok) throw new Error('Falha ao cadastrar imóvel.');
    }
    await fetchData();
  };

  const handleDeleteProperty = async (prop: Property) => {
    if (!confirm(`Deseja realmente excluir o imóvel ${prop.code}?`)) return;
    try {
      const res = await fetch(`/api/properties/${prop.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir imóvel.');
    }
  };

  const handleShareWhatsApp = (prop: Property) => {
    const owner = users.find(u => u.id === prop.user_id) || user;
    const link = `${window.location.origin}/catalogo/${owner.url_slug || owner.username}?code=${prop.code}`;
    const text = encodeURIComponent(`Confira este imóvel na Lopes Manaus: ${prop.title} (${prop.code}) - ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleAddUser = async (userData: any) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Erro ao criar usuário.');
    }
    await fetchData();
  };

  const handleUpdateUser = async (id: string, userData: any) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Erro ao atualizar usuário.');
    }
    await fetchData();
  };

  const handleToggleBlockUser = async (id: string) => {
    const res = await fetch(`/api/users/${id}/block`, { method: 'PATCH' });
    if (res.ok) await fetchData();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Excluir este usuário permamente?')) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchData();
  };

  const handleSaveSettings = async (newSettings: Partial<CompanySettings>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
    if (res.ok) {
      const d = await res.json();
      if (d.settings) setCompanySettings(d.settings);
    }
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
                onViewProperty={(p) => setViewingProperty(p)}
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
              onViewProperty={(p) => setViewingProperty(p)}
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
              onSaveSettings={handleSaveSettings}
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
