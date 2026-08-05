import React, { useState } from 'react';
import { CompanySettings, User } from '../types';
import { Settings, Save, Building2, CheckCircle2, User as UserIcon, Camera, Upload, Phone, ExternalLink, ShieldCheck } from 'lucide-react';
import { buildWhatsAppUrl, formatPhoneDisplay } from '../lib/whatsapp';

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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem (PNG, JPG, WEBP).');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);

    try {
      // 1. Save company settings
      await onSaveSettings(companyForm);

      // 2. Save user profile settings
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
        </div>

        {/* SECTION 2: DADOS DA IMOBILIÁRIA (LOPES CAPTAÇÃO) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Configurações Gerais da Imobiliária</h2>
              <p className="text-xs text-slate-500">Dados da empresa, endereço da sede e WhatsApp padrão de transbordo</p>
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
        </div>

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

      </form>
    </div>
  );
};
