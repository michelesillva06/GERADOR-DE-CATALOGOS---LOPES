import React, { useState } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { Users, UserPlus, Edit3, ShieldAlert, KeyRound, Trash2, ExternalLink, Search, CheckCircle, Ban, X, Upload, User as UserIcon, Camera, Eye, EyeOff, Check } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  currentUser?: User | null;
  onRefreshUsers: () => Promise<void>;
  onAddUser: (userData: any) => Promise<void>;
  onUpdateUser: (id: string, userData: any) => Promise<void>;
  onResetPassword?: (id: string, newPassword: string) => Promise<void>;
  onToggleBlock: (id: string) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  currentUser,
  onRefreshUsers,
  onAddUser,
  onUpdateUser,
  onResetPassword,
  onToggleBlock,
  onDeleteUser
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Quick Password Reset Modal
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('123456');
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [role, setRole] = useState<UserRole>('CAPTADOR');
  const [position, setPosition] = useState('Corretor de Imóveis');
  const [urlSlug, setUrlSlug] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [creci, setCreci] = useState('');
  const [instagram, setInstagram] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingUser) {
      const slug = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
      setUsername(slug);
      setUrlSlug(slug);
    }
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (!editingUser || !whatsapp) {
      const digits = val.replace(/\D/g, '');
      if (digits.length > 0) {
        setWhatsapp(digits.startsWith('55') ? digits : `55${digits}`);
      } else {
        setWhatsapp('');
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoUrl(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setUsername('');
    setPhone('(92) 99123-4567');
    setWhatsapp('5592991234567');
    setRole('CAPTADOR');
    setPosition('Corretor de Imóveis');
    setUrlSlug('');
    setPassword('123456');
    setShowPassword(true);
    setPhotoUrl('');
    setCreci('1234-F/AM');
    setInstagram('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    if (!isMasterUser && (u.role === 'MASTER_ADMIN' || u.username === 'admin')) {
      alert('Você não tem permissão para alterar dados do usuário Administrador Master.');
      return;
    }
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setUsername(u.username);
    setPhone(u.phone);
    setWhatsapp(u.whatsapp);
    setRole(u.role);
    setPosition(u.position);
    setUrlSlug(u.url_slug);
    setPassword(''); // leave blank if not changing
    setShowPassword(false);
    setPhotoUrl(u.photo_url);
    setCreci(u.creci || '');
    setInstagram(u.instagram || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openResetPasswordModal = (u: User) => {
    if (!isMasterUser && (u.role === 'MASTER_ADMIN' || u.username === 'admin')) {
      alert('Você não tem permissão para alterar dados do Administrador Master.');
      return;
    }
    setResetModalUser(u);
    setResetNewPassword('123456');
    setShowResetPass(true);
    setResetSuccessMsg('');
    setResetErrorMsg('');
  };

  const handleQuickResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !resetNewPassword || resetNewPassword.trim().length < 4) {
      setResetErrorMsg('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    setResetLoading(true);
    setResetErrorMsg('');
    setResetSuccessMsg('');

    try {
      if (onResetPassword) {
        await onResetPassword(resetModalUser.id, resetNewPassword.trim());
      } else {
        await onUpdateUser(resetModalUser.id, { password: resetNewPassword.trim() });
      }

      setResetSuccessMsg(`Senha de ${resetModalUser.name} alterada para "${resetNewPassword.trim()}" com sucesso!`);
      setSuccessToast(`Senha de ${resetModalUser.name} redefinida com sucesso!`);
      setTimeout(() => {
        setResetModalUser(null);
        setResetSuccessMsg('');
      }, 1800);
      await onRefreshUsers();
    } catch (err: any) {
      setResetErrorMsg(err.message || 'Erro ao redefinir senha.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !username) {
      setErrorMsg('Preencha os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9._-]/g, '');

    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, {
          name,
          email: email.toLowerCase().trim(),
          username: cleanUsername,
          phone,
          whatsapp,
          role,
          position,
          url_slug: urlSlug ? urlSlug.toLowerCase().replace(/[^a-z0-9]/g, '') : cleanUsername,
          photo_url: photoUrl,
          creci,
          instagram,
          ...(password && password.trim() ? { password: password.trim() } : {})
        });
        setSuccessToast(`Dados do usuário ${name} atualizados com sucesso!`);
      } else {
        await onAddUser({
          name,
          email: email.toLowerCase().trim(),
          username: cleanUsername,
          phone,
          whatsapp,
          role,
          position,
          url_slug: urlSlug ? urlSlug.toLowerCase().replace(/[^a-z0-9]/g, '') : cleanUsername,
          password: password ? password.trim() : '123456',
          photo_url: photoUrl,
          creci,
          instagram
        });
        setSuccessToast(`Usuário ${name} cadastrado com sucesso!`);
      }
      setIsModalOpen(false);
      await onRefreshUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar usuário.');
    } finally {
      setLoading(false);
    }
  };

  const isMasterUser = currentUser?.role === 'MASTER_ADMIN';

  const filteredUsers = users.filter(u => {
    if (!isMasterUser && (u.role === 'MASTER_ADMIN' || u.username === 'admin')) {
      return false;
    }
    if (roleFilter !== 'todos' && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.url_slug.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-xs">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast('')} className="p-1 text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Gerenciamento de Usuários e Captadores</h1>
          <p className="text-xs text-slate-500">
            Controle permissões, crie novas contas, altere senhas e gerencie páginas públicas dos captadores
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-rose-900/30 transition transform active:scale-95 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Usuário Captador</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, usuário ou URL personalizada..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#F10F4D]"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800"
        >
          <option value="todos">Todos os Níveis</option>
          {isMasterUser && <option value="MASTER_ADMIN">Master Admin</option>}
          <option value="GESTORA">Gestora</option>
          <option value="CAPTADOR">Captadores</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Usuário / Captador</th>
                <th className="p-4">Login (Usuário)</th>
                <th className="p-4">Cargo / Função</th>
                <th className="p-4">Página Pública (URL)</th>
                <th className="p-4">Contato / WhatsApp</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      {u.photo_url ? (
                        <img
                          src={u.photo_url}
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-extrabold shrink-0">
                          {u.name ? u.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5 text-slate-400" />}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 font-mono font-bold text-rose-600 text-[11px]">
                    @{u.username}
                  </td>

                  <td className="p-4">
                    <span className="font-semibold block">{u.position}</span>
                    <span className={`inline-block mt-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded ${
                      u.role === 'MASTER_ADMIN' ? 'bg-rose-100 text-rose-700' : u.role === 'GESTORA' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {u.role === 'MASTER_ADMIN' ? 'Master Admin' : u.role === 'GESTORA' ? 'Gestora' : 'Captador'}
                    </span>
                  </td>

                  <td className="p-4 font-mono text-[11px]">
                    <a
                      href={`/catalogo/${u.url_slug || u.username}`}
                      target="_blank"
                      className="text-[#F10F4D] hover:underline font-bold flex items-center space-x-1"
                    >
                      <span>/catalogo/{u.url_slug || u.username}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>

                  <td className="p-4 text-slate-600">
                    <p>{u.whatsapp || u.phone}</p>
                    <p className="text-[10px] text-slate-400">CRECI: {u.creci || '1234-F/AM'}</p>
                  </td>

                  <td className="p-4">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      u.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {u.status === 'active' ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Ativo</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3 h-3 text-rose-600" />
                          <span>Inativo</span>
                        </>
                      )}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openResetPasswordModal(u)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
                        title="Redefinir senha do usuário"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Senha</span>
                      </button>

                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="Editar dados do usuário"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={async () => {
                          await onToggleBlock(u.id);
                          if (onRefreshUsers) await onRefreshUsers();
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1 transition cursor-pointer ${
                          u.status === 'active'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                        title={u.status === 'active' ? 'Desativar / Inativar Conta' : 'Ativar Conta'}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{u.status === 'active' ? 'Desativar' : 'Ativar'}</span>
                      </button>

                      {u.role !== 'MASTER_ADMIN' && (
                        <button
                          onClick={async () => {
                            await onDeleteUser(u.id);
                            if (onRefreshUsers) await onRefreshUsers();
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                          title="Excluir usuário (imóveis serão mantidos no sistema)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Redefinir Senha</h2>
                  <p className="text-[11px] text-slate-500 font-medium">Usuário: <strong className="text-slate-800">{resetModalUser.name}</strong> (@{resetModalUser.username})</p>
                </div>
              </div>
              <button onClick={() => setResetModalUser(null)} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            {resetErrorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {resetErrorMsg}
              </div>
            )}

            <form onSubmit={handleQuickResetPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nova Senha para este Usuário
                </label>
                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Digite a nova senha (mínimo 4 caracteres)"
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Sugestão padrão: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 font-bold">123456</code> ou <code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 font-bold">mudar123</code>
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 bg-[#F10F4D] hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  {resetLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative my-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {editingUser ? 'Editar Dados do Usuário' : 'Cadastrar Novo Usuário'}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingUser ? `Atualize as informações, login e senha de ${editingUser.name}` : 'Preencha os dados de acesso e perfil do captador'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={name}
                    placeholder="Ex: Michele Silva"
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">E-mail de Acesso *</label>
                  <input
                    type="email"
                    value={email}
                    placeholder="ex: michele@lopes.com.br"
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome de Usuário (Login) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      placeholder="ex: michelesilva"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-600 focus:outline-none focus:border-[#F10F4D]"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Usado para entrar no sistema.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    {editingUser ? 'Alterar Senha (opcional)' : 'Senha de Acesso *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUser ? 'Deixe em branco para manter a atual' : 'Ex: 123456'}
                      className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#F10F4D]"
                      required={!editingUser}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {editingUser ? 'Preencha apenas se quiser redefinir a senha do usuário.' : 'Senha inicial padrão: 123456'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Telefone / Celular</label>
                  <input
                    type="text"
                    value={phone}
                    placeholder="(92) 99123-4567"
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">WhatsApp <span className="text-[9px] text-[#F10F4D] lowercase font-normal">(com DDI+DDD)</span></label>
                  <input
                    type="text"
                    value={whatsapp}
                    placeholder="5592991234567"
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Função / Nível de Acesso</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('CAPTADOR')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                      role === 'CAPTADOR'
                        ? 'bg-[#F10F4D] text-white border-[#F10F4D] shadow'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Captador
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('GESTORA')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                      role === 'GESTORA'
                        ? 'bg-[#F10F4D] text-white border-[#F10F4D] shadow'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Gestora
                  </button>
                  {isMasterUser && (
                    <button
                      type="button"
                      onClick={() => setRole('MASTER_ADMIN')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                        role === 'MASTER_ADMIN'
                          ? 'bg-slate-900 text-white border-slate-900 shadow'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Master Admin
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  URL Pública do Catálogo (/catalogo/suaurl)
                </label>
                <input
                  type="text"
                  placeholder="Ex: michelesilva"
                  value={urlSlug}
                  onChange={(e) => setUrlSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Foto de Perfil do Usuário
                </label>
                <p className="text-[10px] text-slate-500 mb-2">
                  Envie uma foto de perfil direto do seu dispositivo ou insira a URL da foto (opcional).
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-2">
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-8 h-8 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <label className="flex items-center justify-center space-x-2 px-3 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-[#F10F4D] rounded-xl cursor-pointer text-xs font-bold transition shadow-sm">
                      <Upload className="w-4 h-4 text-[#F10F4D]" />
                      <span>Fazer upload da foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="text-[10px] text-rose-600 font-bold hover:underline block"
                      >
                        Remover foto atual
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="url"
                  placeholder="Ou insira a URL pública da foto (https://...)"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">CRECI</label>
                  <input
                    type="text"
                    value={creci}
                    placeholder="Ex: 1234-F/AM"
                    onChange={(e) => setCreci(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Instagram (@usuario)</label>
                  <input
                    type="text"
                    value={instagram}
                    placeholder="Ex: @michelesilva"
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[#F10F4D] hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow cursor-pointer transition"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
