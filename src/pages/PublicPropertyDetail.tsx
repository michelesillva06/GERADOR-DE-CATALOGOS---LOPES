import React, { useState, useEffect } from 'react';
import { Property, User, CompanySettings } from '../types';
import { getStoredProperties, getStoredUsers, getStoredSettings } from '../lib/storage';
import { LopesLogo } from '../components/LopesLogo';
import { buildWhatsAppUrl, formatPhoneDisplay, getEffectiveWhatsApp } from '../lib/whatsapp';
import { getPropertyImages, handleImageError } from '../lib/imageUtils';
import { getPropertyPriceInfo, formatCurrencyBRL } from '../lib/priceUtils';
import { 
  Building2, MapPin, Bed, Bath, Car, Maximize2, Calendar, Phone, 
  MessageCircle, Share2, ArrowLeft, CheckCircle2, Play, Video, 
  ShieldCheck, ExternalLink, Clock, User as UserIcon, Send, X, ChevronLeft, ChevronRight, Image as ImageIcon
} from 'lucide-react';

interface PublicPropertyDetailProps {
  code: string;
  companySettings?: CompanySettings;
}

export const PublicPropertyDetail: React.FC<PublicPropertyDetailProps> = ({ code, companySettings: propSettings }) => {
  const [property, setProperty] = useState<Property | null>(null);
  const [captador, setCaptador] = useState<User | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(propSettings || {
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

  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Form State for Schedule Visit
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('10:00');
  const [visitNotes, setVisitNotes] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  useEffect(() => {
    const loadProperty = async () => {
      setLoading(true);
      const cleanCode = decodeURIComponent(code || '').replace(/\/$/, '').trim();
      let foundProp: Property | null = null;
      let foundCaptador: User | null = null;

      // 1. Try public property detail endpoints
      try {
        const res = await fetch(`/api/properties/public/code/${encodeURIComponent(cleanCode)}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('json')) {
          const data = await res.json();
          if (data.property) {
            foundProp = data.property;
            foundCaptador = data.captador;
            if (data.companySettings) setCompanySettings(data.companySettings);
          }
        }
      } catch (err) {
        console.warn('Backend API code lookup error:', err);
      }

      // 2. Try generic public identifier endpoint if not found
      if (!foundProp) {
        try {
          const res = await fetch(`/api/properties/public/${encodeURIComponent(cleanCode)}`);
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('json')) {
            const data = await res.json();
            if (data.property) {
              foundProp = data.property;
              foundCaptador = data.captador;
              if (data.companySettings) setCompanySettings(data.companySettings);
            }
          }
        } catch (err) {
          console.warn('Backend API generic lookup error:', err);
        }
      }

      // 3. Try fetching from general properties list
      if (!foundProp) {
        try {
          const resAll = await fetch('/api/properties');
          if (resAll.ok && (resAll.headers.get('content-type') || '').includes('json')) {
            const dataAll = await resAll.json();
            const propsList: Property[] = Array.isArray(dataAll.properties) ? dataAll.properties : [];
            const cleanLower = cleanCode.toLowerCase();
            const cleanAlphanumeric = cleanLower.replace(/[^a-z0-9]/g, '');

            const match = propsList.find(p => 
              p.code?.toLowerCase() === cleanLower ||
              p.id?.toLowerCase() === cleanLower ||
              p.id === cleanCode ||
              p.code === cleanCode ||
              p.code?.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlphanumeric ||
              p.id?.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlphanumeric
            );

            if (match) {
              foundProp = match;
              try {
                const [usersRes, settingsRes] = await Promise.all([
                  fetch('/api/users').catch(() => null),
                  fetch('/api/settings').catch(() => null)
                ]);
                if (usersRes && usersRes.ok) {
                  const uData = await usersRes.json();
                  if (Array.isArray(uData.users)) {
                    foundCaptador = uData.users.find((u: User) =>
                      u.id === match.user_id ||
                      u.username?.toLowerCase() === match.user_id?.toLowerCase() ||
                      u.email?.toLowerCase() === match.user_id?.toLowerCase()
                    ) || uData.users[0];
                  }
                }
                if (settingsRes && settingsRes.ok) {
                  const sData = await settingsRes.json();
                  if (sData.settings) setCompanySettings(sData.settings);
                }
              } catch {
                // Ignore secondary fetch errors
              }
            }
          }
        } catch (e) {
          console.warn('Error querying properties list:', e);
        }
      }

      // 4. Fallback to localStorage if still not found
      if (!foundProp) {
        const allProps = getStoredProperties();
        const cleanLower = cleanCode.toLowerCase();
        const cleanAlphanumeric = cleanLower.replace(/[^a-z0-9]/g, '');
        const matched = allProps.find(p => 
          p.code?.toLowerCase() === cleanLower || 
          p.id?.toLowerCase() === cleanLower ||
          p.id === cleanCode ||
          p.code === cleanCode ||
          p.code?.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlphanumeric ||
          p.id?.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlphanumeric
        );
        if (matched) {
          foundProp = matched;
          const allUsers = getStoredUsers();
          foundCaptador = allUsers.find(u => u.id === matched.user_id) || allUsers[0] || null;
          setCompanySettings(getStoredSettings());
        }
      }

      if (foundProp) {
        setProperty(foundProp);
        if (foundCaptador) setCaptador(foundCaptador);
        document.title = `${foundProp.title} (${foundProp.code}) - ${companySettings.company_name}`;
      }
      setLoading(false);
    };

    loadProperty();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#F10F4D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Carregando imóvel {code}...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-[#F10F4D] flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Imóvel Não Encontrado</h2>
          <p className="text-xs text-slate-500">
            O imóvel com código <strong className="text-slate-900">{code}</strong> não está disponível ou o link pode ter mudado.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar à Página Inicial</span>
          </a>
        </div>
      </div>
    );
  }

  const allImages = getPropertyImages(property);

  const priceInfo = getPropertyPriceInfo(property);
  const formattedPrice = priceInfo.primaryFormatted;

  const agentPhone = getEffectiveWhatsApp(captador, companySettings);

  const waInterestUrl = buildWhatsAppUrl(
    agentPhone,
    `Olá ${captador?.name || 'Lopes Captação'}! Tenho interesse no imóvel "${property.title}". Poderia me passar mais informações?`
  );

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !visitorPhone || !visitDate) {
      alert('Por favor, preencha seu nome, telefone e a data desejada.');
      return;
    }

    const msg = `*Agendamento de Visita - Lopes Captação*\n\n` +
      `*Imóvel:* ${property.title}\n` +
      `*Nome:* ${visitorName}\n` +
      `*Telefone:* ${visitorPhone}\n` +
      `*Data da Visita:* ${visitDate}\n` +
      `*Horário Preferido:* ${visitTime}\n` +
      (visitNotes ? `*Observações:* ${visitNotes}\n` : '') +
      `\nSolicitação enviada via Portal Lopes Captação.`;

    const waScheduleUrl = buildWhatsAppUrl(agentPhone, msg);
    
    setScheduleSuccess(true);
    setTimeout(() => {
      window.open(waScheduleUrl, '_blank');
      setIsScheduleModalOpen(false);
      setScheduleSuccess(false);
    }, 1200);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${property.title} - Lopes Captação`,
        text: `Confira este imóvel incrível: ${property.title}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link do imóvel copiado para a área de transferência!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      
      {/* Top Institutional Bar */}
      <header className="bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <a href="/" className="flex items-center space-x-2 group">
              <LopesLogo size="sm" variant="color" showBadge badgeText="CAPTAÇÃO" />
            </a>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {captador && (
              <a
                href={`/catalogo/${captador.url_slug || captador.username}`}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200/80 transition"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#F10F4D]" />
                <span>Ver Catálogo do Captador</span>
              </a>
            )}

            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200/80"
              title="Compartilhar imóvel"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <a
              href={waInterestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-[#F10F4D] hover:bg-rose-600 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Direct</span>
              <span className="sm:hidden">Contato</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Breadcrumb & Code Tag */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-semibold">
          <div className="flex items-center space-x-2">
            {captador && (
              <a href={`/catalogo/${captador.url_slug}`} className="hover:text-[#F10F4D] transition flex items-center space-x-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Catálogo de {captador.name}</span>
              </a>
            )}
            <span>/</span>
            <span className="text-slate-900 font-bold truncate max-w-[200px]">{property.title}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
              {property.status}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-[#F10F4D]">
              {property.category} • {property.purpose}
            </span>
          </div>
        </div>

        {/* Gallery Section */}
        <section className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 shadow-xl group aspect-[16/9] sm:aspect-[21/9] max-h-[520px]">
            <img
              src={allImages[activeImageIdx]}
              alt={property.title}
              onError={handleImageError}
              className="w-full h-full object-cover transition-all duration-300"
            />
            
            {/* Overlay Navigation Buttons */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImageIdx((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md transition shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setActiveImageIdx((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md transition shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Expand / Lightbox Button */}
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-white text-xs font-bold flex items-center space-x-2 backdrop-blur-md border border-white/20 shadow-lg transition"
            >
              <Maximize2 className="w-4 h-4 text-[#F10F4D]" />
              <span>Ver em Tela Cheia ({activeImageIdx + 1}/{allImages.length})</span>
            </button>
          </div>

          {/* Gallery Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden border-2 shrink-0 transition relative ${
                    activeImageIdx === idx ? 'border-[#F10F4D] ring-2 ring-[#F10F4D]/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Foto ${idx + 1}`} onError={handleImageError} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Title, Price & Primary Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Info (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-extrabold text-[#F10F4D] uppercase tracking-wider">
                    {property.neighborhood}, {property.city} - {property.state}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 leading-tight">
                    {property.title}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{property.address || `${property.neighborhood}, Manaus - AM`}</span>
                  </p>
                </div>

                <div className="sm:text-right bg-rose-50/70 p-4 rounded-2xl border border-rose-100/80 shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {priceInfo.isBoth ? 'Valor Venda / Locação' : (priceInfo.isRent ? 'Valor de Locação' : 'Valor de Venda')}
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-[#F10F4D]">{formattedPrice}</p>
                  {priceInfo.isBoth && priceInfo.rentPrice > 0 && priceInfo.salePrice > 0 && (
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      Locação: {priceInfo.rentFormatted}
                    </p>
                  )}
                  {(property.condo_fee > 0 || property.iptu > 0) && (
                    <p className="text-[11px] font-semibold text-slate-600 mt-1">
                      {property.condo_fee > 0 && `Condomínio: ${formatCurrencyBRL(property.condo_fee)}`}
                      {property.condo_fee > 0 && property.iptu > 0 && ' • '}
                      {property.iptu > 0 && `IPTU: ${formatCurrencyBRL(property.iptu)}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Specs Grid Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#F10F4D] flex items-center justify-center border border-slate-200 shadow-sm">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Área Total</p>
                    <p className="text-sm font-black text-slate-900">{property.total_area} m²</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#F10F4D] flex items-center justify-center border border-slate-200 shadow-sm">
                    <Bed className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Dormitórios</p>
                    <p className="text-sm font-black text-slate-900">{property.bedrooms} ({property.suites} suítes)</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#F10F4D] flex items-center justify-center border border-slate-200 shadow-sm">
                    <Bath className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Banheiros</p>
                    <p className="text-sm font-black text-slate-900">{property.bathrooms}</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#F10F4D] flex items-center justify-center border border-slate-200 shadow-sm">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Vagas</p>
                    <p className="text-sm font-black text-slate-900">{property.parking_spaces}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Description Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[#F10F4D]" />
                <span>Descrição Comercial do Imóvel</span>
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line font-normal">
                {property.description || 'Imóvel exclusivo com padrão de acabamento e excelente localização em Manaus.'}
              </p>
            </div>

            {/* Features & Amenities Checklist */}
            {property.features && property.features.length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-[#F10F4D]" />
                  <span>Diferenciais e Infraestrutura</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.features.map((feat, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#F10F4D] shrink-0" />
                      <span className="text-xs font-bold text-slate-800">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Tour Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center space-x-2">
                <Video className="w-5 h-5 text-[#F10F4D]" />
                <span>Vídeo & Tour Virtual da Propriedade</span>
              </h3>
              
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-slate-200 shadow-md">
                <img
                  src={property.main_image}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover opacity-50 blur-xs"
                />
                <div className="absolute inset-0 bg-slate-950/40 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                  <a
                    href={waInterestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-16 h-16 rounded-full bg-[#F10F4D] hover:scale-110 text-white flex items-center justify-center shadow-xl transition transform"
                  >
                    <Play className="w-8 h-8 ml-1 fill-white" />
                  </a>
                  <div>
                    <h4 className="font-extrabold text-base">Solicite o Vídeo Completo e Tour Virtual 3D</h4>
                    <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
                      Fale direto com o captador para receber o vídeo em alta resolução e agendar a visita presencial.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-[#F10F4D]" />
                <span>Localização e Entorno</span>
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Bairro <strong className="text-slate-900">{property.neighborhood}</strong> • {property.city} - {property.state}
              </p>
              
              {/* Interactive Visual Map Card */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 p-6 text-center space-y-3 relative">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-[#F10F4D] flex items-center justify-center mx-auto border border-rose-200 shadow">
                  <MapPin className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{property.neighborhood}, Manaus - AM</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-0.5">
                    Excelente localização próximo a vias de acesso, centros comerciais, escolas e conveniências em Manaus.
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.neighborhood}, Manaus AM`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir no Google Maps</span>
                </a>
              </div>
            </div>

          </div>

          {/* Right Sidebar: Captador Card & Schedule CTAs */}
          <div className="space-y-6 lg:sticky lg:top-20">
            
            {/* Captador Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
                {captador?.photo_url ? (
                  <img
                    src={captador.photo_url}
                    alt={captador.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#F10F4D] shadow shrink-0"
                  />
                ) : null}
                <div>
                  <span className="text-[10px] font-extrabold text-[#F10F4D] uppercase tracking-wider block">
                    Captador Responsável
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">{captador?.name || 'Atendimento Lopes Manaus'}</h3>
                  <p className="text-xs text-slate-500 font-medium">{captador?.position || 'Consultor Imobiliário'}</p>
                  {captador?.creci && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">CRECI: {captador.creci}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <a
                  href={waInterestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-[#F10F4D] hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-900/20 flex items-center justify-center space-x-2 transition transform active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Tenho Interesse no WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition"
                >
                  <Calendar className="w-4 h-4 text-[#F10F4D]" />
                  <span>Agendar uma Visita Presencial</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5 font-semibold">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatPhoneDisplay(agentPhone)}</span>
                </div>
                {captador?.email && (
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-slate-400 font-bold">@</span>
                    <span className="truncate">{captador.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-2 shadow-lg border border-slate-800">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Garantia Lopes Manaus</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Atendimento exclusivo com assessoria jurídica e documental completa em todas as etapas da sua negociação.
              </p>
            </div>

          </div>

        </div>

      </main>

      {/* Floating Bottom Sticky Bar on Mobile */}
      <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 z-40 lg:hidden shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">{property.category}</span>
            <span className="text-sm font-black text-rose-400">{formattedPrice}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              title="Agendar visita"
            >
              <Calendar className="w-4 h-4 text-[#F10F4D]" />
            </button>
            <a
              href={waInterestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-[#F10F4D] text-white font-black text-xs rounded-xl shadow flex items-center space-x-1.5"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Tenho Interesse</span>
            </a>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-50"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveImageIdx((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-50"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <div className="max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl flex items-center justify-center">
            <img
              src={allImages[activeImageIdx]}
              alt={`Foto ${activeImageIdx + 1}`}
              className="max-w-full max-h-[85vh] object-contain shadow-2xl"
            />
          </div>

          <button
            onClick={() => setActiveImageIdx((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-50"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-bold text-xs bg-slate-900/80 px-4 py-2 rounded-full border border-white/20">
            Foto {activeImageIdx + 1} de {allImages.length}
          </div>
        </div>
      )}

      {/* Schedule Visit Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#F10F4D] flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Agendar Visita ao Imóvel</h3>
                <p className="text-xs text-slate-500 font-medium">{property.title}</p>
              </div>
            </div>

            {scheduleSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-slate-900">Solicitação Registrada!</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Redirecionando para o WhatsApp do captador <strong className="text-slate-800">{captador?.name}</strong> com a confirmação...
                </p>
              </div>
            ) : (
              <form onSubmit={handleScheduleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seu Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Roberto Silva"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seu Telefone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="(92) 99999-9999"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data Desejada *</label>
                    <input
                      type="date"
                      required
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Horário Preferido</label>
                    <select
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      <option value="09:00">09:00 (Manhã)</option>
                      <option value="10:30">10:30 (Manhã)</option>
                      <option value="14:00">14:00 (Tarde)</option>
                      <option value="15:30">15:30 (Tarde)</option>
                      <option value="17:00">17:00 (Final da tarde)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mensagem ou Observações</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Tenho interesse em ver o imóvel no final de semana..."
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs shadow-lg flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirmar no WhatsApp</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
