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
import { getStoredUsers, getStoredProperties } from '../lib/storage';

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#F10F4D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carregando Catálogo Lopes Manaus...</p>
        </div>
      </div>
    );
  }

  if (notFound || !captador) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-900 p-8 rounded-3xl border border-slate-800">
          <div className="w-16 h-16 bg-rose-950 text-[#F10F4D] rounded-2xl flex items-center justify-center text-2xl font-black mx-auto">
            !
          </div>
          <h2 className="text-xl font-bold">Catálogo Não Encontrado</h2>
          <p className="text-xs text-slate-400">
            Não encontramos a página pública para o endereço <strong>/catalogo/{slug}</strong>.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-[#F10F4D] text-white font-bold text-xs rounded-xl shadow"
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

  const rawWa = (captador.whatsapp || captador.phone || '5592981234567').trim();
  const generalWhatsappMsg = encodeURIComponent(
    `Olá ${captador.name}! Vi seu catálogo digital na Lopes Manaus e gostaria de saber mais sobre os imóveis disponíveis.`
  );
  let mainWhatsappUrl = '';
  if (rawWa.startsWith('http://') || rawWa.startsWith('https://')) {
    mainWhatsappUrl = rawWa;
  } else if (rawWa.startsWith('wa.me/')) {
    mainWhatsappUrl = `https://${rawWa}`;
  } else {
    let cleanWa = rawWa.replace(/\D/g, '');
    if (!cleanWa.startsWith('55') && (cleanWa.length === 10 || cleanWa.length === 11)) {
      cleanWa = `55${cleanWa}`;
    }
    mainWhatsappUrl = `https://wa.me/${cleanWa}?text=${generalWhatsappMsg}`;
  }

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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      
      {/* Top Lopes Manaus Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#F10F4D] flex items-center justify-center font-black text-xl text-white shadow-md">
              L
            </div>
            <div>
              <span className="font-black text-lg text-white tracking-tight">LOPES</span>
              <span className="text-[#F10F4D] font-bold text-xs ml-1.5 uppercase px-1.5 py-0.5 bg-rose-950 rounded border border-rose-800">
                MANAUS
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareCatalog}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700"
            >
              <Share2 className="w-3.5 h-3.5 text-[#F10F4D]" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>

            <button
              onClick={handleDownloadFullCatalogPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-[#F10F4D] hover:bg-rose-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Captador Profile Header */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 py-10 px-4 relative overflow-hidden">
        
        {/* Subtle red ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-[#F10F4D]/10 blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#F10F4D] to-rose-800 flex items-center justify-center text-white shadow-2xl border-2 border-rose-500 shrink-0">
              <Building2 className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/80 text-[11px] font-bold">
                <Award className="w-3.5 h-3.5" />
                <span>Catálogo Digital Lopes Manaus</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Catálogo Digital - {captador.name}</h1>
              <p className="text-xs text-rose-400 font-bold">{captador.position}</p>
              <p className="text-xs text-slate-400">CRECI: {captador.creci || '1234-F/AM'} • Manaus e Região Metropolitana</p>
              
              {captador.instagram && (
                <p className="text-xs text-slate-300 font-medium flex items-center justify-center sm:justify-start space-x-1 pt-1">
                  <Instagram className="w-3.5 h-3.5 text-[#F10F4D]" />
                  <span>{captador.instagram}</span>
                </p>
              )}
            </div>
          </div>

          {/* Contact & QR Card */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4 shrink-0 shadow-xl">
            <a
              href={mainWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-900/40 transition transform active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Falar no WhatsApp</span>
            </a>

            {qrDataUrl && (
              <div className="bg-white p-1.5 rounded-xl shrink-0">
                <img src={qrDataUrl} alt="QR Code" className="w-16 h-16" />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Catalog Search & Properties Container */}
      <main className="max-w-7xl mx-auto px-4 pt-8 space-y-6">
        
        {/* Search & Filter Bar */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por código (ex: LOP-1001), título ou bairro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-[#F10F4D]"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-[#F10F4D]"
            >
              <option value="todos">Todas Finalidades</option>
              <option value="Venda">Venda</option>
              <option value="Locação">Locação</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-[#F10F4D]"
            >
              <option value="todos">Todas Categorias</option>
              <option value="Apartamento">Apartamento</option>
              <option value="Casa">Casa</option>
              <option value="Sala comercial">Sala comercial</option>
              <option value="Terreno">Terreno</option>
              <option value="Condomínio">Condomínio</option>
              <option value="Cobertura">Cobertura</option>
            </select>
          </div>

        </div>

        {/* Properties Grid Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Imóveis em Destaque ({filteredProperties.length})
          </h2>
          <span className="text-xs text-slate-400">Clique no imóvel para ver fotos e agendar visita</span>
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
                  const msg = encodeURIComponent(`Olá ${captador.name}! Vi o imóvel "${prop.title}" no seu catálogo: ${window.location.href}`);
                  let targetWaUrl = mainWhatsappUrl;
                  if (!rawWa.startsWith('http') && !rawWa.startsWith('wa.me')) {
                    let cleanWa = rawWa.replace(/\D/g, '');
                    if (!cleanWa.startsWith('55') && (cleanWa.length === 10 || cleanWa.length === 11)) {
                      cleanWa = `55${cleanWa}`;
                    }
                    targetWaUrl = `https://wa.me/${cleanWa}?text=${msg}`;
                  }
                  window.open(targetWaUrl, '_blank');
                }}
                canEdit={false}
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 rounded-3xl p-12 text-center border border-slate-800 space-y-3">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Nenhum imóvel encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
      <footer className="mt-16 border-t border-slate-800 pt-8 pb-12 text-center text-xs text-slate-500">
        <p className="font-bold text-slate-400">{companySettings.company_name} - Manaus / AM</p>
        <p className="mt-1">{companySettings.address} • {companySettings.phone}</p>
        <p className="text-[10px] text-slate-600 mt-3">Plataforma desenvolvida para geradores de catálogos imobiliários de alto padrão.</p>
      </footer>

    </div>
  );
};
