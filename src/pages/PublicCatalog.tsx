import React, { useState, useEffect } from 'react';
import { Property, User, CompanySettings } from '../types';
import { PropertyCard } from '../components/PropertyCard';
import { PropertyModal } from '../components/PropertyModal';
import {
  Phone,
  MessageCircle,
  Share2,
  FileSpreadsheet,
  Building2,
  MapPin,
  Search,
  ExternalLink,
  Award,
  Instagram,
  CheckCircle2,
  QrCode as QrIcon
} from 'lucide-react';
import { generateCatalogPDF } from '../lib/pdfGenerator';
import { generateQRCodeDataUrl } from '../lib/qrCode';
import { LopesLogo } from '../components/LopesLogo';
import { buildWhatsAppUrl, formatPhoneDisplay, getEffectiveWhatsApp } from '../lib/whatsapp';
import { getStoredUsers, getStoredProperties } from '../lib/storage';
import { PROPERTY_CATEGORIES } from '../lib/constants';

interface PublicCatalogProps {
  slug: string;
  companySettings: CompanySettings;
}

export const PublicCatalog: React.FC<PublicCatalogProps> = ({ slug, companySettings }) => {
  const [captador, setCaptador] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [purposeFilter, setPurposeFilter] = useState('todos');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    async function loadPublicData() {
      setLoading(true);
      let loadedCaptador: User | null = null;
      let loadedProps: Property[] = [];

      try {
        const res = await fetch(`/api/properties/public/user/${slug}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('json')) {
          const data = await res.json();
          loadedCaptador = data.captador;
          loadedProps = data.properties || [];
        }
      } catch (e) {
        console.warn('Backend API unavailable, using local storage for public catalog:', e);
      }

      if (!loadedCaptador) {
        const users = getStoredUsers();
        const foundUser = users.find(
          u =>
            u.url_slug.toLowerCase() === slug.toLowerCase() ||
            u.username.toLowerCase() === slug.toLowerCase() ||
            u.id.toLowerCase() === slug.toLowerCase()
        );

        if (foundUser) {
          loadedCaptador = foundUser;
          const allProps = getStoredProperties();
          loadedProps = allProps.filter(p => p.user_id === foundUser.id || foundUser.role === 'MASTER_ADMIN');
        }
      }

      if (loadedCaptador) {
        setCaptador(loadedCaptador);
        setProperties(loadedProps);
        document.title = `Catálogo Digital - ${loadedCaptador.name || 'Lopes Captação'}`;
        const pageUrl = window.location.href;
        generateQRCodeDataUrl(pageUrl, '#F10F4D').then(setQrDataUrl);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }
    loadPublicData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800 p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#F10F4D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carregando Catálogo Lopes Manaus...</p>
        </div>
      </div>
    );
  }

  if (notFound || !captador) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800 p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
          <div className="w-16 h-16 bg-rose-50 text-[#F10F4D] rounded-2xl flex items-center justify-center text-2xl font-black mx-auto">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-900">Catálogo Não Encontrado</h2>
          <p className="text-xs text-slate-500">
            Não encontramos a página pública para o endereço <strong className="text-slate-800">/catalogo/{slug}</strong>.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Voltar para o Início
          </a>
        </div>
      </div>
    );
  }

  const filteredProperties = properties.filter(p => {
    if (categoryFilter !== 'todos' && p.category !== categoryFilter) return false;
    if (purposeFilter !== 'todos' && !p.purpose.includes(purposeFilter)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.code.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const captadorPhone = getEffectiveWhatsApp(captador, companySettings);
  const generalWhatsappMsg = `Olá ${captador.name}! Vi seu catálogo digital na Lopes Captação e gostaria de saber mais sobre os imóveis disponíveis.`;
  const mainWhatsappUrl = buildWhatsAppUrl(captadorPhone, generalWhatsappMsg);

  const handleDownloadFullCatalogPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = await generateCatalogPDF({
        title: `CATÁLOGO DIGITAL - ${captador.name.toUpperCase()}`,
        properties: filteredProperties.length > 0 ? filteredProperties : properties,
        captador,
        companySettings
      });
      doc.save(`Catalogo_Digital_${captador.url_slug || 'lopes'}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar catálogo PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareCatalog = () => {
    if (navigator.share) {
      navigator.share({
        title: `Catálogo Digital - ${captador.name}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link do catálogo copiado para a área de transferência!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      
      {/* Top Lopes Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center space-x-2">
            <LopesLogo size="sm" variant="color" showBadge badgeText="CAPTAÇÃO" />
          </a>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareCatalog}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 border border-slate-200/80 transition"
            >
              <Share2 className="w-3.5 h-3.5 text-[#F10F4D]" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>

            <button
              onClick={handleDownloadFullCatalogPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-[#F10F4D] hover:bg-rose-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md transition active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Captador Profile Header - Clean Luxury White Design */}
      <div className="bg-white border-b border-slate-200/80 py-10 px-4 relative overflow-hidden shadow-xs">
        
        {/* Subtle accent background tint */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-50/60 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 text-center sm:text-left">
            {captador.photo_url ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-900 text-white flex items-center justify-center shadow-xl border-2 border-slate-100 shrink-0 relative overflow-hidden sm:mr-6 mb-4 sm:mb-0">
                <img src={captador.photo_url} alt={captador.name} className="w-full h-full object-cover" />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center justify-center sm:justify-start space-x-2.5">
                <span>{captador.name}</span>
              </h1>
              <p className="text-xs text-[#F10F4D] font-bold">{captador.position}</p>
              <p className="text-xs text-slate-500 font-medium">CRECI: {captador.creci || '540-J/AM'} • Imóveis de Alto Padrão em Manaus</p>
              
              {captador.instagram && (
                <p className="text-xs text-slate-600 font-semibold flex items-center justify-center sm:justify-start space-x-1 pt-1">
                  <Instagram className="w-3.5 h-3.5 text-[#F10F4D]" />
                  <span>{captador.instagram}</span>
                </p>
              )}
            </div>
          </div>

          {/* Contact Card */}
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center space-x-4 shrink-0 shadow-sm">
            <a
              href={mainWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-md transition transform active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Falar no WhatsApp</span>
            </a>
          </div>

        </div>
      </div>

      {/* Catalog Search & Properties Container */}
      <main className="max-w-7xl mx-auto px-4 pt-8 space-y-6">
        
        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código (ex: LP-1001), título ou bairro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#F10F4D] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#F10F4D]"
            >
              <option value="todos">Todas Finalidades</option>
              <option value="Venda">Venda</option>
              <option value="Locação">Locação</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#F10F4D]"
            >
              <option value="todos">Todas Categorias</option>
              {PROPERTY_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Properties Grid Header */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-lg font-black text-slate-900">
            Imóveis em Destaque <span className="text-xs font-bold text-[#F10F4D] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">({filteredProperties.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Clique no imóvel para ver fotos em HD e agendar visita</span>
        </div>

        {/* Properties Grid */}
        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(prop => (
              <PropertyCard
                key={prop.id}
                property={prop}
                captador={captador}
                onView={() => setSelectedProperty(prop)}
                onShareWhatsApp={() => {
                  const msg = `Olá ${captador.name}! Vi o imóvel "${prop.title}" (Cód: ${prop.code}) no seu catálogo: ${window.location.origin}/imovel/${prop.code}`;
                  const targetWaUrl = buildWhatsAppUrl(captadorPhone, msg);
                  window.open(targetWaUrl, '_blank');
                }}
                canEdit={false}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Nenhum imóvel encontrado</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tente alterar os termos de busca ou selecionar outra categoria.
            </p>
          </div>
        )}

      </main>

      {/* Property Details Modal */}
      {selectedProperty && (
        <PropertyModal
          property={selectedProperty}
          captador={captador}
          companySettings={companySettings}
          onClose={() => setSelectedProperty(null)}
        />
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200/80 pt-8 pb-12 text-center text-xs text-slate-500">
        <p className="font-extrabold text-slate-800">{companySettings.company_name} - Manaus / AM</p>
        <p className="mt-1">{companySettings.address} • {companySettings.phone}</p>
        <p className="text-[10px] text-slate-400 mt-3">Plataforma desenvolvida para geradores de catálogos imobiliários de alto padrão.</p>
      </footer>

    </div>
  );
};
