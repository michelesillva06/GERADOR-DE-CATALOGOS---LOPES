import React, { useState, useRef } from 'react';
import { User, Property } from '../types';
import {
  parsePropertyXML,
  compareXMLWithExisting,
  ParsedXMLProperty,
  XMLImportComparison,
  SAMPLE_XML_FEED
} from '../lib/xmlPropertyParser';
import { formatCurrencyBRL } from '../lib/priceUtils';
import {
  UploadCloud,
  FileCode,
  Link2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Database,
  Building2,
  UserCheck,
  RefreshCw,
  Eye,
  Check,
  X,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  FileText,
  ShieldAlert
} from 'lucide-react';

interface XMLImportPageProps {
  currentUser: User;
  users: User[];
  properties: Property[];
  onPropertiesImported: (newProperties: Property[], message: string) => void;
  onNavigateToProperties: () => void;
  onNavigateToPDF: () => void;
}

interface ImportBatchHistory {
  id: string;
  date: string;
  source: string;
  totalParsed: number;
  newImported: number;
  ignored: number;
  assignedTo: string;
}

export const XMLImportPage: React.FC<XMLImportPageProps> = ({
  currentUser,
  users,
  properties,
  onPropertiesImported,
  onNavigateToProperties,
  onNavigateToPDF
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'url'>('upload');
  const [xmlContent, setXmlContent] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedCaptadorId, setSelectedCaptadorId] = useState<string>(currentUser.id);
  const [skipExisting, setSkipExisting] = useState<boolean>(true);
  const [updateExisting, setUpdateExisting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [comparison, setComparison] = useState<XMLImportComparison | null>(null);
  
  // Table filters inside preview
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'existing'>('all');
  const [previewSearch, setPreviewSearch] = useState('');
  
  // Success state
  const [successReport, setSuccessReport] = useState<{
    importedCount: number;
    ignoredCount: number;
    totalCount: number;
    assignedUserName: string;
  } | null>(null);

  // Import history (stored in localStorage)
  const [history, setHistory] = useState<ImportBatchHistory[]>(() => {
    try {
      const raw = localStorage.getItem('lopes_xml_import_history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (currentUser && currentUser.role !== 'MASTER_ADMIN') {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 text-center max-w-lg mx-auto space-y-4 shadow-sm my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Acesso Restrito ao Administrador Master</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          A importação de imóveis via arquivos XML/feeds é uma funcionalidade restrita exclusivamente ao Administrador Master.
        </p>
      </div>
    );
  }

  // File Upload Handler
  const handleFileUpload = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xml') && file.type !== 'text/xml' && file.type !== 'application/xml') {
      setParseErrors(['Por favor, selecione um arquivo válido com extensão .xml']);
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setParseErrors([]);
    setSuccessReport(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setXmlContent(content);
      processXML(content, file.name);
    };
    reader.onerror = () => {
      setParseErrors(['Erro ao ler o arquivo selecionado.']);
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  // Process XML String
  const processXML = (rawXml: string, sourceLabel: string) => {
    setIsProcessing(true);
    setParseErrors([]);

    try {
      const { properties: parsed, errors } = parsePropertyXML(rawXml);

      if (errors.length > 0 && parsed.length === 0) {
        setParseErrors(errors);
        setComparison(null);
        setIsProcessing(false);
        return;
      }

      if (parsed.length === 0) {
        setParseErrors(['Nenhum imóvel foi detectado no arquivo XML. Verifique se as tags seguem os padrões de portais como VivaReal, ZAP, Imovelweb ou XML padrão de imóveis.']);
        setComparison(null);
        setIsProcessing(false);
        return;
      }

      // Compare with existing properties in the database
      const comp = compareXMLWithExisting(parsed, properties);
      setComparison(comp);
      setParseErrors(errors);
    } catch (err: any) {
      setParseErrors([`Falha no processamento do XML: ${err.message || err}`]);
      setComparison(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load URL Feed
  const handleFetchUrl = async () => {
    if (!feedUrl.trim()) {
      setParseErrors(['Informe a URL do feed XML.']);
      return;
    }

    setIsProcessing(true);
    setParseErrors([]);
    setSuccessReport(null);

    try {
      const res = await fetch('/api/properties/fetch-feed-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: feedUrl.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.xml) {
        throw new Error(data.error || 'Não foi possível baixar o feed da URL informada.');
      }

      setFileName(`Feed URL: ${new URL(feedUrl).hostname}`);
      setXmlContent(data.xml);
      processXML(data.xml, feedUrl);
    } catch (err: any) {
      setParseErrors([`Erro ao carregar URL do feed: ${err.message || err}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load Sample XML for Testing
  const handleLoadSample = () => {
    setXmlContent(SAMPLE_XML_FEED);
    setFileName('exemplo_feed_imoveis.xml');
    setActiveTab('paste');
    processXML(SAMPLE_XML_FEED, 'exemplo_feed_imoveis.xml');
  };

  // Submit and Import Properties
  const handleConfirmImport = async () => {
    if (!comparison) return;

    // Filter properties to send based on user configuration
    let toImport = comparison.all;
    if (skipExisting && !updateExisting) {
      toImport = comparison.newProperties;
    }

    if (toImport.length === 0) {
      alert('Nenhum imóvel novo para importar! Todos os imóveis do arquivo já constam cadastrados no sistema.');
      return;
    }

    setIsSubmitting(true);
    setParseErrors([]);

    const assignedUser = users.find(u => u.id === selectedCaptadorId) || currentUser;

    try {
      const token = localStorage.getItem('lopes_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/properties/import-xml', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          properties: comparison.all,
          user_id: selectedCaptadorId,
          skip_existing: skipExisting,
          update_existing: updateExisting,
          source_filename: fileName || 'Importação XML Manual'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao importar imóveis para o servidor.');
      }

      const importedCount = data.importedCount ?? comparison.newCount;
      const ignoredCount = data.ignoredCount ?? comparison.existingCount;

      // Save to local history
      const newHistoryItem: ImportBatchHistory = {
        id: `imp_${Date.now()}`,
        date: new Date().toISOString(),
        source: fileName || 'Importação XML',
        totalParsed: comparison.totalCount,
        newImported: importedCount,
        ignored: ignoredCount,
        assignedTo: assignedUser.name
      };

      const updatedHistory = [newHistoryItem, ...history.slice(0, 19)];
      setHistory(updatedHistory);
      localStorage.setItem('lopes_xml_import_history', JSON.stringify(updatedHistory));

      // Trigger app update callback
      onPropertiesImported(data.properties || [], data.message || 'Importação concluída com sucesso!');

      setSuccessReport({
        importedCount,
        ignoredCount,
        totalCount: comparison.totalCount,
        assignedUserName: assignedUser.name
      });
      setComparison(null);
      setXmlContent('');
      setFileName('');
    } catch (err: any) {
      setParseErrors([`Falha ao salvar no banco de dados: ${err.message || err}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setComparison(null);
    setXmlContent('');
    setFileName('');
    setFeedUrl('');
    setParseErrors([]);
    setSuccessReport(null);
  };

  // Filter preview items
  const filteredPreviewList = comparison ? comparison.all.filter(item => {
    const isNew = comparison.newProperties.some(np => np.code.toLowerCase().trim() === item.code.toLowerCase().trim());
    if (previewFilter === 'new' && !isNew) return false;
    if (previewFilter === 'existing' && isNew) return false;

    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      return (
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.neighborhood.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  }) : [];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F10F4D]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-rose-300 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#F10F4D]" />
              <span>Sincronização & Integração de Portais</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Importador Automático de Imóveis XML
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Importe lotes completos de imóveis de outros sistemas e portais (VivaReal, ZAP, Imovelweb, Kenlo, Winker). 
              Envie todo o arquivo: o sistema <strong className="text-emerald-400 font-bold">cadastra os novos automaticamente</strong> e <strong className="text-amber-300 font-bold">ignora os já cadastrados</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleLoadSample}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 border border-white/15 cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-rose-400" />
              <span>Carregar XML Exemplo</span>
            </button>
            <button
              onClick={onNavigateToProperties}
              className="px-4 py-2 bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-900/40 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Ver Imóveis do Sistema</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Box */}
      {successReport && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 shadow-sm animate-fade-in space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-emerald-950">Importação Concluída com Sucesso!</h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Os dados foram persistidos no Firestore e estão sincronizados com todos os corretores.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessReport(null)}
              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Novos Cadastrados</span>
              <p className="text-2xl font-black text-emerald-700 mt-0.5">+{successReport.importedCount}</p>
              <p className="text-[11px] text-slate-500">Adicionados ao sistema</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Já Existentes (Ignorados)</span>
              <p className="text-2xl font-black text-amber-700 mt-0.5">{successReport.ignoredCount}</p>
              <p className="text-[11px] text-slate-500">Sem duplicações criadas</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atribuídos Para</span>
              <p className="text-base font-extrabold text-slate-900 mt-1 truncate">{successReport.assignedUserName}</p>
              <p className="text-[11px] text-slate-500">Corretor / Captador</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onNavigateToProperties}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center space-x-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Ver Imóveis Cadastrados</span>
            </button>
            <button
              onClick={onNavigateToPDF}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center space-x-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-rose-400" />
              <span>Gerar Catálogo PDF</span>
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer"
            >
              Importar Outro Arquivo XML
            </button>
          </div>
        </div>
      )}

      {/* Errors & Warnings Alert */}
      {parseErrors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-1.5 animate-fade-in">
          <div className="flex items-center space-x-2 font-bold text-rose-700">
            <AlertCircle className="w-4 h-4 text-[#F10F4D]" />
            <span>Atenção durante a leitura do XML:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-rose-800 pl-1">
            {parseErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* STEP 1: Input / File Upload Area (if comparison not yet active) */}
      {!comparison && !successReport && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">1. Selecione a Origem do Arquivo XML</h2>
              <p className="text-xs text-slate-500">Escolha como deseja enviar a carga de imóveis para o sistema</p>
            </div>

            {/* Origin Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#F10F4D]" />
                <span>Upload de Arquivo</span>
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                <span>Colar Texto XML</span>
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'url' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Link2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Link do Feed</span>
              </button>
            </div>
          </div>

          {/* TAB 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#F10F4D] rounded-3xl p-8 sm:p-12 text-center bg-slate-50/60 hover:bg-rose-50/30 transition cursor-pointer group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                  accept=".xml,text/xml,application/xml"
                  className="hidden"
                />
                
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto text-[#F10F4D] group-hover:scale-110 transition">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <h3 className="text-base font-extrabold text-slate-900 mt-4">
                  Clique para selecionar o arquivo XML ou arraste e solte aqui
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Suporta arquivos de feeds imobiliários padrão (.xml) de qualquer tamanho contendo fotos, preços, bairros e características.
                </p>

                <div className="mt-4 inline-flex items-center space-x-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 shadow-2xs">
                  <span>Padrões compatíveis: VivaReal, ZAP, Imovelweb, Kenlo, Winker, Doma e XML Genérico</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Paste XML */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Cole o código XML completo abaixo:
                </label>
                <textarea
                  value={xmlContent}
                  onChange={(e) => setXmlContent(e.target.value)}
                  placeholder="<Listings><Listing><ListingID>LOP-01</ListingID>...</Listing></Listings>"
                  rows={10}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-800 focus:bg-white focus:border-[#F10F4D] focus:ring-2 focus:ring-rose-500/20 transition resize-y"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs font-bold text-[#F10F4D] hover:underline cursor-pointer flex items-center space-x-1"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Preencher com exemplo de demonstração</span>
                </button>

                <button
                  type="button"
                  onClick={() => processXML(xmlContent, 'XML Colado')}
                  disabled={!xmlContent.trim() || isProcessing}
                  className="px-6 py-2.5 bg-[#F10F4D] hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Processar XML</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Feed URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  URL do Feed XML Imobiliário:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    placeholder="https://meusistema.com.br/feed/imoveis.xml"
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#F10F4D] focus:ring-2 focus:ring-rose-500/20 transition"
                  />
                  <button
                    onClick={handleFetchUrl}
                    disabled={!feedUrl.trim() || isProcessing}
                    className="px-6 py-3 bg-[#F10F4D] hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow transition flex items-center space-x-2 cursor-pointer shrink-0"
                  >
                    {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    <span>Carregar Feed</span>
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                O servidor buscará e fará o download do arquivo XML direto da URL para processar as informações com segurança.
              </p>
            </div>
          )}

        </div>
      )}

      {/* STEP 2: Preview & Deduplication Summary (Active when comparison is ready) */}
      {comparison && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Deduplication & Count Summary Header */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-[#F10F4D] font-extrabold text-[10px] uppercase">
                    Etapa 2 de 2 • Análise & Deduplicação
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Arquivo: {fileName || 'XML Processado'}</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Resumo da Leitura e Deduplicação Inteligente
                </h2>
              </div>

              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer self-start md:self-auto"
              >
                Trocar Arquivo XML
              </button>
            </div>

            {/* 3 Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Total Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <p className="text-xs font-bold text-slate-500 uppercase">Total no Arquivo XML</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{comparison.totalCount}</p>
                <p className="text-[11px] text-slate-400 mt-1">Imóveis identificados no feed</p>
              </div>

              {/* New Properties Card (Green Highlight) */}
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase">
                  Serão Cadastrados
                </div>
                <p className="text-xs font-bold text-emerald-800 uppercase flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Novos Imóveis</span>
                </p>
                <p className="text-3xl font-black text-emerald-600 mt-1">
                  +{comparison.newCount}
                </p>
                <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
                  {comparison.newCount > 0 ? 'Não constam no sistema e serão inseridos' : 'Nenhum imóvel novo encontrado'}
                </p>
              </div>

              {/* Existing Properties (Ignored by default) */}
              <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-600 text-white text-[10px] font-black rounded-full uppercase">
                  Ignorados
                </div>
                <p className="text-xs font-bold text-amber-800 uppercase">Já Cadastrados (Ignorados)</p>
                <p className="text-3xl font-black text-amber-700 mt-1">
                  {comparison.existingCount}
                </p>
                <p className="text-[11px] text-amber-800/80 mt-1">
                  Já existem no sistema com o mesmo código
                </p>
              </div>

            </div>

            {/* Import Configuration Controls */}
            <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Captador Assignment Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#F10F4D]" />
                  <span>Atribuir os Novos Imóveis Ao Usuário:</span>
                </label>
                <select
                  value={selectedCaptadorId}
                  onChange={(e) => setSelectedCaptadorId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-rose-500/20"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'MASTER_ADMIN' ? 'Admin Master' : (u.role === 'GESTOR' || u.role === 'GESTORA') ? 'Gestor' : 'Captador'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Os imóveis importados aparecerão no catálogo individual deste captador e no catálogo geral.
                </p>
              </div>

              {/* Deduplication Behavior Checkboxes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Comportamento de Duplicações:
                </label>
                
                <label className="flex items-start space-x-2.5 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipExisting}
                    onChange={(e) => {
                      setSkipExisting(e.target.checked);
                      if (!e.target.checked) setUpdateExisting(false);
                    }}
                    className="mt-0.5 w-4 h-4 text-[#F10F4D] rounded focus:ring-rose-500"
                  />
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">
                      Ignorar imóveis que já existem no sistema (Recomendado)
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Apenas os {comparison.newCount} novos serão cadastrados. Os {comparison.existingCount} já existentes permanecem inalterados.
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-2.5 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => {
                      setUpdateExisting(e.target.checked);
                      if (e.target.checked) setSkipExisting(false);
                    }}
                    className="mt-0.5 w-4 h-4 text-[#F10F4D] rounded focus:ring-rose-500"
                  />
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">
                      Atualizar os dados dos imóveis já cadastrados
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Substitui preços, fotos e descrições dos {comparison.existingCount} imóveis já existentes com os dados deste XML.
                    </p>
                  </div>
                </label>
              </div>

            </div>

            {/* Action Import Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <p className="text-xs text-slate-500">
                {skipExisting && !updateExisting ? (
                  <>Pronto para cadastrar <strong>{comparison.newCount}</strong> novos imóveis e ignorar <strong>{comparison.existingCount}</strong> já existentes.</>
                ) : updateExisting ? (
                  <>Pronto para cadastrar <strong>{comparison.newCount}</strong> novos e atualizar <strong>{comparison.existingCount}</strong> existentes.</>
                ) : (
                  <>Cadastrar todos os <strong>{comparison.totalCount}</strong> imóveis do arquivo.</>
                )}
              </p>

              <button
                onClick={handleConfirmImport}
                disabled={isSubmitting || (comparison.newCount === 0 && !updateExisting)}
                className="px-8 py-3.5 bg-[#F10F4D] hover:bg-rose-600 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-xl shadow-rose-900/30 transition transform active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando no Banco de Dados...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      {updateExisting
                        ? `Importar ${comparison.newCount} Novos & Atualizar ${comparison.existingCount}`
                        : `Importar ${comparison.newCount} Novos Imóveis Agora`}
                    </span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Detailed Preview Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Prévia dos Imóveis no Arquivo</h3>
                <p className="text-xs text-slate-500">
                  Exibindo {filteredPreviewList.length} de {comparison.totalCount} imóveis
                </p>
              </div>

              {/* Filter and Search in preview */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="Buscar código, título..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 w-44 sm:w-56 focus:bg-white focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      previewFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Todos ({comparison.totalCount})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('new')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      previewFilter === 'new' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    ✨ Novos ({comparison.newCount})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('existing')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      previewFilter === 'existing' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-800 hover:bg-amber-50'
                    }`}
                  >
                    ⏭️ Já Existem ({comparison.existingCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Table of items */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Foto</th>
                    <th className="p-3.5">Código</th>
                    <th className="p-3.5">Título & Categoria</th>
                    <th className="p-3.5">Localização</th>
                    <th className="p-3.5">Valor Venda / Aluguel</th>
                    <th className="p-3.5">Especificações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPreviewList.map((item, index) => {
                    const isNew = comparison.newProperties.some(np => np.code.toLowerCase().trim() === item.code.toLowerCase().trim());
                    return (
                      <tr key={index} className={isNew ? 'hover:bg-emerald-50/30' : 'bg-slate-50/40 hover:bg-amber-50/30 opacity-75'}>
                        
                        {/* Status Badge */}
                        <td className="p-3.5 whitespace-nowrap">
                          {isNew ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span>✨ NOVO</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] uppercase">
                              <span>⏭️ JÁ EXISTE (IGNORAR)</span>
                            </span>
                          )}
                        </td>

                        {/* Image Thumbnail */}
                        <td className="p-3.5">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 border border-slate-200 shrink-0 relative">
                            <img
                              src={item.main_image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            {item.images.length > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[9px] font-bold px-1 rounded">
                                {item.images.length}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Code */}
                        <td className="p-3.5 whitespace-nowrap font-mono font-bold text-slate-900">
                          {item.code}
                        </td>

                        {/* Title & Category */}
                        <td className="p-3.5 max-w-xs">
                          <p className="font-bold text-slate-900 truncate" title={item.title}>
                            {item.title}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] font-bold text-[#F10F4D] uppercase">
                              {item.category}
                            </span>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {item.purpose}
                            </span>
                          </div>
                        </td>

                        {/* Neighborhood / City */}
                        <td className="p-3.5 whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{item.neighborhood}</p>
                          <p className="text-[10px] text-slate-400">{item.city}/{item.state}</p>
                        </td>

                        {/* Price */}
                        <td className="p-3.5 whitespace-nowrap">
                          {item.purpose === 'Locação' ? (
                            <p className="font-extrabold text-[#F10F4D]">
                              {formatCurrencyBRL(item.rent_price || item.price)} <span className="text-[10px] text-slate-500 font-normal">/mês</span>
                            </p>
                          ) : item.purpose === 'Venda e Locação' ? (
                            <div>
                              <p className="font-extrabold text-[#F10F4D]">{formatCurrencyBRL(item.price)}</p>
                              <p className="text-[10px] text-slate-600 font-semibold">{formatCurrencyBRL(item.rent_price)} /mês</p>
                            </div>
                          ) : (
                            <p className="font-extrabold text-[#F10F4D]">
                              {formatCurrencyBRL(item.price)}
                            </p>
                          )}
                        </td>

                        {/* Specs */}
                        <td className="p-3.5 whitespace-nowrap text-slate-600 text-[11px]">
                          {item.built_area > 0 && <span>{item.built_area}m² • </span>}
                          {item.bedrooms > 0 && <span>{item.bedrooms} Qts • </span>}
                          {item.parking_spaces > 0 && <span>{item.parking_spaces} Vg</span>}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* STEP 3: Import History Section */}
      {history.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <h3 className="text-base font-black text-slate-900">Histórico de Importações XML Realizadas</h3>
          </div>

          <div className="divide-y divide-slate-100">
            {history.map((h) => (
              <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 flex items-center space-x-2">
                    <FileCode className="w-3.5 h-3.5 text-[#F10F4D]" />
                    <span>{h.source}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • Atribuído a: <strong className="text-slate-700">{h.assignedTo}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-[11px]">
                    +{h.newImported} novos
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-medium rounded-lg text-[11px]">
                    {h.ignored} ignorados
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Total: {h.totalParsed}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
