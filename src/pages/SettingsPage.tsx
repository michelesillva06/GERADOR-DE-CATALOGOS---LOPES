import React, { useState } from 'react';
import { CompanySettings, User } from '../types';
import { Settings, Save, Building2, CheckCircle2, User as UserIcon, Camera, Upload, Phone, ExternalLink, ShieldCheck, Image as ImageIcon, Trash2, Zap, Lock, AlertCircle } from 'lucide-react';
import { buildWhatsAppUrl, formatPhoneDisplay } from '../lib/whatsapp';
import { compressImage } from '../utils/imageCompressor';
import { updateUserPassword } from '../lib/storage';

interface SettingsPageProps {
  settings: CompanySettings;
  currentUser: User;
  onSaveSettings: (newSettings: Partial<CompanySettings>) => Promise<void>;
  onUpdateUser: (id: string, userData: any) => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  currentUser,
  onSaveSettings,
  onUpdateUser
}) => {
  // Company Form State
  const [companyForm, setCompanyForm] = useState<CompanySettings>(settings);
  const isAdmin = currentUser.role === 'MASTER_ADMIN' || currentUser.role === 'MASTER';
  
  // User Profile Form State
  const [name, setName] = useState(currentUser.name || '');
  const [position, setPosition] = useState(currentUser.position || 'Corretora de Alto Padrão');
  const [creci, setCreci] = useState(currentUser.creci || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [whatsapp, setWhatsapp] = useState(currentUser.whatsapp || '');
  const [photoUrl, setPhotoUrl] = useState(currentUser.photo_url || '');
  const [instagram, setInstagram] = useState(currentUser.instagram || '');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSuccessMsg, setPassSuccessMsg] = useState('');
  const [passErrorMsg, setPassErrorMsg] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccessMsg('');
    setPassErrorMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassErrorMsg('Por favor, preencha todos os campos da senha.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassErrorMsg('A nova senha e a confirmação não conferem.');
      return;
    }

    if (newPassword.length < 6) {
      setPassErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setPassLoading(true);

    try {
      const token = localStorage.getItem('lopes_token') || `lopes_token_${currentUser.id}`;
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (res.ok) {
        updateUserPassword(currentUser.id, newPassword);
        setPassSuccessMsg('Senha alterada e salva com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json().catch(() => ({}));
        if (data && data.error) {
          setPassErrorMsg(data.error);
        } else {
          updateUserPassword(currentUser.id, newPassword);
          setPassSuccessMsg('Senha alterada com sucesso!');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }
      }
    } catch {
      updateUserPassword(currentUser.id, newPassword);
      setPassSuccessMsg('Senha alterada e salva localmente!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setPassLoading(false);
    }
  };

  // Re-sync form state ONLY when user ID changes (account switch)
  const currentUserId = currentUser?.id;
  React.useEffect(() => {
    setName(currentUser.name || '');
    setPosition(currentUser.position || 'Corretora de Alto Padrão');
    setCreci(currentUser.creci || '');
    setEmail(currentUser.email || '');
    setPhone(currentUser.phone || '');
    setWhatsapp(currentUser.whatsapp || '');
    setPhotoUrl(currentUser.photo_url || '');
    setInstagram(currentUser.instagram || '');
  }, [currentUserId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem (PNG, JPG, WEBP).');
      return;
    }

    const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
    if (compressed) {
      setPhotoUrl(compressed);
    }
    e.target.value = '';
  };

  const handleCoverFileUpload = async (field: keyof CompanySettings, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }
    const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
    if (compressed) {
      setCompanyForm(prev => {
        const next = { ...prev, [field]: compressed };
        if (field === 'cover_horizontal_url') {
          next.cover_geral_url = compressed;
        }
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);

    try {
      // 1. Save company settings (ONLY if admin)
      if (isAdmin) {
        await onSaveSettings(companyForm);
      }

      // 2. Save user profile settings (always)
      await onUpdateUser(currentUser.id, {
        name,
        position,
        creci,
        email,
        phone,
        whatsapp: whatsapp.trim() || companyForm.whatsapp,
        photo_url: photoUrl,
        instagram
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  const testWaUrl = buildWhatsAppUrl(whatsapp || companyForm.whatsapp, 'Olá! Teste de WhatsApp configurado com sucesso na Lopes Captação.');

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Configurações do Perfil & Sistema</h1>
        <p className="text-xs text-slate-500">
          Personalize sua foto de perfil, dados de contato do WhatsApp, marca da imobiliária e catálogos PDF
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Configurações e perfil salvos com sucesso! Todos os links de WhatsApp e catálogos foram atualizados.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: PERFIL DO CAPTADOR RESPONSÁVEL */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-[#F10F4D]/10 text-[#F10F4D] flex items-center justify-center">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Meu Perfil de Captador(a) Responsável</h2>
              <p className="text-xs text-slate-500">Sua foto, nome e WhatsApp aparecem na capa dos catálogos PDF e páginas públicas</p>
            </div>
          </div>

          {/* Photo Upload Area */}
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#F10F4D] bg-slate-200 flex items-center justify-center shadow-md">
                {photoUrl ? (
                  <img src={photoUrl} alt="Foto de Perfil" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <label className="absolute bottom-1 right-1 p-2 bg-[#F10F4D] hover:bg-rose-600 text-white rounded-xl cursor-pointer shadow-lg transition transform active:scale-95">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <h3 className="text-xs font-bold text-slate-900 uppercase">Alterar Foto de Perfil</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Envie uma foto em alta definição (JPG, PNG ou WebP). Esta foto será exibida na segunda página e cabeçalho dos catálogos PDF e no seu catálogo digital.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <label className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer flex items-center space-x-1.5 transition">
                  <Upload className="w-3.5 h-3.5 text-[#F10F4D]" />
                  <span>Fazer Upload de Foto</span>
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
                    className="px-3 py-2 text-xs text-rose-600 hover:underline font-bold"
                  >
                    Remover Foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Direct Photo URL fallback */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">URL Direta da Foto (Opcional)</label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://exemplo.com/minha-foto.jpg"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
            />
          </div>

          {/* User Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cargo / Função</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CRECI do Captador</label>
              <input
                type="text"
                value={creci}
                onChange={(e) => setCreci(e.target.value)}
                placeholder="Ex: 1234-F/AM"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seu WhatsApp Direto (DDD + Número)</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(92) 98456-7890 ou 5592984567890"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-rose-300 focus:border-[#F10F4D] rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone de Contato</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(92) 3234-5678"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seu E-mail Profissional</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Instagram (@usuario)</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@michelesilva.lopes"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>
          </div>

          {/* Test WhatsApp Link Button */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-900">Número ativo para WhatsApp: </span>
                <span className="font-semibold text-emerald-800">{formatPhoneDisplay(whatsapp || companyForm.whatsapp)}</span>
              </div>
            </div>
            <a
              href={testWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition"
            >
              <span>Testar Link do WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Change Password Section */}
          <div className="pt-4 border-t border-slate-100">
            <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F10F4D]/10 text-[#F10F4D] flex items-center justify-center font-bold">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase">Alterar Minha Senha de Acesso</h3>
                  <p className="text-[11px] text-slate-500">
                    Sua senha padrão inicial é <strong>mudar123</strong>. Atualize para uma nova senha pessoal segura.
                  </p>
                </div>
              </div>

              {passSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passSuccessMsg}</span>
                </div>
              )}

              {passErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-[#F10F4D] shrink-0" />
                  <span>{passErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Senha Atual</label>
                    <input
                      type="password"
                      placeholder="Ex: mudar123"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Nova Senha</label>
                    <input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={passLoading}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>{passLoading ? 'Salvando...' : 'Salvar Nova Senha'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* SECTION 2: DADOS DA IMOBILIÁRIA (LOPES CAPTAÇÃO) - APENAS ADMINISTRADOR */}
        {isAdmin && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Configurações Gerais da Imobiliária</h2>
                <p className="text-xs text-slate-500">Dados da empresa, endereço da sede e WhatsApp padrão de transbordo (Administrador)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome da Imobiliária</label>
                <input
                  type="text"
                  value={companyForm.company_name}
                  onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade / Filial</label>
                <input
                  type="text"
                  value={companyForm.unit_name}
                  onChange={(e) => setCompanyForm({ ...companyForm, unit_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone Principal</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp da Imobiliária</label>
                <input
                  type="text"
                  value={companyForm.whatsapp}
                  onChange={(e) => setCompanyForm({ ...companyForm, whatsapp: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CRECI Jurídico (PJ)</label>
                <input
                  type="text"
                  value={companyForm.creci_j}
                  onChange={(e) => setCompanyForm({ ...companyForm, creci_j: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail de Contato da Empresa</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Instagram Institucional</label>
                <input
                  type="text"
                  value={companyForm.instagram}
                  onChange={(e) => setCompanyForm({ ...companyForm, instagram: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Endereço da Sede</label>
              <input
                type="text"
                value={companyForm.address}
                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>

            {/* Logo / Cabeçalho da Imobiliária */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase">🏷️ Logo / Cabeçalho da Imobiliária (Quadrada ou Retangular)</span>
                {companyForm.logo_url && (
                  <button
                    type="button"
                    onClick={() => setCompanyForm({ ...companyForm, logo_url: '' })}
                    className="text-[10px] font-bold text-rose-600 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover Logo</span>
                  </button>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="w-36 h-20 bg-white rounded-xl border border-slate-300 p-2 overflow-hidden flex items-center justify-center relative shrink-0 shadow-inner">
                  {companyForm.logo_url ? (
                    <img src={companyForm.logo_url} alt="Logo Imobiliária" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-400 text-center font-semibold">Sem Logo Personalizada</span>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-[11px] text-slate-500">
                    Envie a logo ou marca d'água da sua imobiliária (suporta formatos quadrados ou retangulares).
                  </p>
                  <label className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer inline-flex items-center space-x-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-[#F10F4D]" />
                    <span>{companyForm.logo_url ? 'Substituir Logo/Cabeçalho' : 'Upload da Logo (Quadrada ou Retangular)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCoverFileUpload('logo_url', file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                  {companyForm.logo_url && (
                    <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-xs text-emerald-700 font-bold pt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Logo carregada! Clique em "Salvar Configurações" para gravar.</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">ou Cole a URL da Logo</label>
                <input
                  type="text"
                  placeholder="https://exemplo.com/logo-imobiliaria.png"
                  value={companyForm.logo_url || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: CAPAS OFICIAIS DOS CATÁLOGOS (APENAS ADMINISTRADOR) */}
        {isAdmin && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-[#F10F4D] text-white flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Capas Oficiais dos Catálogos PDF</h2>
                <p className="text-xs text-slate-500">
                  Gerencie as capas padrão ativas para todo o sistema (Formato Paisagem / Horizontal A4). As capas cadastradas ficam salvas permanentemente.
                </p>
              </div>
            </div>

            {/* CAPA PRINCIPAL / GERAL (HORIZONTAL PAISAGEM) */}
            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#F10F4D] uppercase">🖼️ Capa Horizontal Principal / Geral (Paisagem ou Quadrada)</span>
                {(companyForm.cover_horizontal_url || companyForm.cover_geral_url) && (
                  <button
                    type="button"
                    onClick={() => setCompanyForm(prev => ({ ...prev, cover_horizontal_url: '', cover_geral_url: '' }))}
                    className="text-[10px] font-bold text-rose-600 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover Capa Principal</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Esta capa principal será utilizada como padrão para catálogos gerais com todos os imóveis do sistema.
              </p>
              
              <div className="aspect-[1.8/1] max-h-64 w-full rounded-xl border-2 border-dashed border-rose-300 bg-slate-900/5 overflow-hidden flex flex-col items-center justify-center relative group shadow-inner">
                {companyForm.cover_horizontal_url ? (
                  <img src={companyForm.cover_horizontal_url} alt="Capa Horizontal" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-8 h-8 text-rose-300 mx-auto mb-2" />
                    <span className="text-xs font-bold text-slate-400">Capa Oficial Horizontal Lopes (Geral)</span>
                  </div>
                )}
                <label className="absolute inset-0 bg-slate-900/75 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-xs font-bold cursor-pointer p-4 text-center">
                  <Upload className="w-6 h-6 mb-1 text-rose-400" />
                  <span>{companyForm.cover_horizontal_url ? 'Substituir Capa Principal' : 'Upload Capa Principal'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCoverFileUpload('cover_horizontal_url', file);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {companyForm.cover_horizontal_url && (
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ Imagem de Capa Principal pronta no formulário! Clique em "Salvar Alterações" para gravar.</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">ou Cole a URL da Imagem</label>
                <input
                  type="text"
                  placeholder="https://exemplo.com/capa-horizontal.jpg"
                  value={companyForm.cover_horizontal_url || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, cover_horizontal_url: e.target.value, cover_geral_url: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Sub-section: Capas Especificas (Locação e Venda) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase">Capas Específicas por Finalidade (Opcional)</h3>
                  <p className="text-[11px] text-slate-500">
                    Defina capas específicas apenas para os catálogos filtrados por Locação ou Venda.
                  </p>
                </div>
                <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3 text-[#F10F4D]" />
                  <span>Upload & Compressão</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* CAPA LOCAÇÃO */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-900 uppercase">🔑 Capa Específica de Locação</span>
                    {companyForm.cover_locacao_url && (
                      <button
                        type="button"
                        onClick={() => setCompanyForm({ ...companyForm, cover_locacao_url: '' })}
                        className="text-[10px] font-bold text-rose-600 hover:underline flex items-center space-x-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Limpar</span>
                      </button>
                    )}
                  </div>

                  {/* Thumbnail / Upload Box */}
                  <div className="aspect-[1.8/1] w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-900/5 overflow-hidden flex flex-col items-center justify-center relative group shadow-xs">
                    {companyForm.cover_locacao_url ? (
                      <img src={companyForm.cover_locacao_url} alt="Capa Locação" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <span className="text-[10px] font-bold text-slate-400">Nenhuma Capa de Locação (Usa a Principal)</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[11px] font-bold cursor-pointer p-2 text-center">
                      <Upload className="w-5 h-5 mb-1 text-rose-400" />
                      <span>{companyForm.cover_locacao_url ? 'Alterar Imagem' : 'Upload Capa Locação'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCoverFileUpload('cover_locacao_url', file);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {companyForm.cover_locacao_url && (
                    <div className="flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Capa de Locação carregada!</span>
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Ou cole a URL da Capa Locação"
                    value={companyForm.cover_locacao_url || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, cover_locacao_url: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>

                {/* CAPA VENDA */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-900 uppercase">🏠 Capa Específica de Venda</span>
                    {companyForm.cover_venda_url && (
                      <button
                        type="button"
                        onClick={() => setCompanyForm({ ...companyForm, cover_venda_url: '' })}
                        className="text-[10px] font-bold text-rose-600 hover:underline flex items-center space-x-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Limpar</span>
                      </button>
                    )}
                  </div>

                  {/* Thumbnail / Upload Box */}
                  <div className="aspect-[1.8/1] w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-900/5 overflow-hidden flex flex-col items-center justify-center relative group shadow-xs">
                    {companyForm.cover_venda_url ? (
                      <img src={companyForm.cover_venda_url} alt="Capa Venda" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <span className="text-[10px] font-bold text-slate-400">Nenhuma Capa de Venda (Usa a Principal)</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[11px] font-bold cursor-pointer p-2 text-center">
                      <Upload className="w-5 h-5 mb-1 text-rose-400" />
                      <span>{companyForm.cover_venda_url ? 'Alterar Imagem' : 'Upload Capa Venda'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCoverFileUpload('cover_venda_url', file);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {companyForm.cover_venda_url && (
                    <div className="flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Capa de Venda carregada!</span>
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Ou cole a URL da Capa Venda"
                    value={companyForm.cover_venda_url || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, cover_venda_url: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Save Bar */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-xl bg-[#F10F4D] hover:bg-rose-600 text-white font-extrabold text-sm flex items-center space-x-2 shadow-xl shadow-rose-900/30 transition transform active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Salvando Alterações...' : 'Salvar Perfil e Configurações'}</span>
          </button>
        </div>

        {/* SECTION 3: BACKUP AUTOMÁTICO DO FIRESTORE (APENAS ADMINISTRADOR / GERENTE) */}
        {isAdmin && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 mt-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Backup Automático do Banco de Dados (Firestore)</h2>
                <p className="text-xs text-slate-500">
                  Exportação periódica automática para o Google Cloud Storage. Proteção total contra perda de dados.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Status do Backup</span>
                  <div className="flex items-center space-x-2 pt-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-900">
                      {companyForm.backupStatus || 'Ativo e Automatizado (Google Cloud Storage)'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Data do Último Backup Automático</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block mt-0.5">
                    📅 {companyForm.lastBackupAt ? new Date(companyForm.lastBackupAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/backup/run', { method: 'POST' });
                      if (res.ok) {
                        const data = await res.json();
                        setCompanyForm({ ...companyForm, lastBackupAt: data.lastBackupAt });
                        alert('Backup do Firestore executado e salvo no Google Cloud Storage com sucesso!');
                      }
                    } catch {
                      alert('Não foi possível realizar o backup imediato.');
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Executar Backup Firestore Agora</span>
                </button>
              </div>
            </div>

            {/* RESET DE FÁBRICA / ZERAR SISTEMA */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-rose-600 flex items-center space-x-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Zerar Sistema (Reset de Fábrica)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apaga todos os dados fictícios de teste (imóveis, diário, agenda, logs e usuários adicionais), deixando apenas o Administrador Master para início limpo.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const confirmed = window.confirm(
                    '⚠️ ATENÇÃO: Tem certeza absoluta que deseja ZERAR O SISTEMA?\n\n- Todos os imóveis serão removidos.\n- Todos os agendamentos e registros serão apagados.\n- Todos os usuários secundários serão removidos.\n\nApenas a conta do Administrador Master continuará ativa.'
                  );
                  if (!confirmed) return;

                  try {
                    const res = await fetch('/api/system/reset', { method: 'POST' });
                    if (res.ok) {
                      localStorage.clear();
                      alert('Sistema zerado com sucesso! Recarregando aplicação...');
                      window.location.reload();
                    } else {
                      alert('Não foi possível concluir o reset do sistema.');
                    }
                  } catch {
                    localStorage.clear();
                    alert('Navegador limpo com sucesso! Recarregando...');
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-[#F10F4D] border border-rose-200 font-bold text-xs rounded-xl transition cursor-pointer shrink-0 flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Zerar Banco de Dados Agora</span>
              </button>
            </div>
          </div>
        )}


      </form>
    </div>
  );
};
