import React, { useMemo, useState } from 'react';
import { Property, User, ContractType, ContractFormData, ContractParty, ContractClauseToggle } from '../types';
import { CLAUSE_DEFINITIONS, getApplicableClauses } from '../lib/contractTemplates';
import { prefillFromProperty, generateContractPDF, generateContractDocx, assembleContractText } from '../lib/contractGenerator';
import { FileText, FileDown, Search, AlertTriangle, Home } from 'lucide-react';

interface ContractGeneratorPageProps {
  currentUser: User;
  properties: Property[];
}

const emptyParty: ContractParty = { name: '', cpf_cnpj: '', address: '', phone: '', email: '' };

const emptyForm: ContractFormData = {
  contract_type: 'VENDA',
  property_description: '',
  property_value: '',
  owner: { ...emptyParty },
  counterparty: { ...emptyParty },
  clauses: [],
  extra_notes: ''
};

export const ContractGeneratorPage: React.FC<ContractGeneratorPageProps> = ({ currentUser, properties }) => {
  const [form, setForm] = useState<ContractFormData>(emptyForm);
  const [propertySearch, setPropertySearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const applicableClauses = useMemo(() => getApplicableClauses(form.contract_type), [form.contract_type]);

  const filteredProperties = useMemo(() => {
    if (!propertySearch.trim()) return [];
    const q = propertySearch.toLowerCase();
    return properties
      .filter(p => p.code?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [properties, propertySearch]);

  const handlePickProperty = (property: Property) => {
    const prefilled = prefillFromProperty(property);
    setForm(prev => ({
      ...prev,
      ...prefilled,
      owner: { ...prev.owner, ...prefilled.owner },
      counterparty: { ...prev.counterparty, ...prefilled.counterparty },
      clauses: [] // reset clause toggles when switching contract type/property
    }));
    setPropertySearch('');
  };

  const handleClauseToggle = (key: string, enabled: boolean) => {
    setForm(prev => {
      const existing = prev.clauses.find(c => c.key === key);
      if (existing) {
        return { ...prev, clauses: prev.clauses.map(c => (c.key === key ? { ...c, enabled } : c)) };
      }
      return { ...prev, clauses: [...prev.clauses, { key, enabled, values: {} }] };
    });
  };

  const handleClauseFieldChange = (clauseKey: string, fieldKey: string, value: string) => {
    setForm(prev => ({
      ...prev,
      clauses: prev.clauses.map(c =>
        c.key === clauseKey ? { ...c, values: { ...c.values, [fieldKey]: value } } : c
      )
    }));
  };

  const isClauseEnabled = (key: string) => form.clauses.find(c => c.key === key)?.enabled || false;
  const clauseFieldValue = (key: string, field: string) => form.clauses.find(c => c.key === key)?.values?.[field] || '';

  const finalData: ContractFormData = {
    ...form,
    generated_at: new Date().toISOString(),
    generated_by_user_id: currentUser.id,
    generated_by_user_name: currentUser.name
  };

  const handleGeneratePDF = () => {
    setIsGenerating(true);
    try {
      const doc = generateContractPDF(finalData);
      doc.save(`contrato_${form.contract_type.toLowerCase()}_${(form.property_code || 'imovel').toLowerCase()}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDocx = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateContractDocx(finalData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato_${form.contract_type.toLowerCase()}_${(form.property_code || 'imovel').toLowerCase()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  };

  const preview = useMemo(() => assembleContractText(finalData), [finalData]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#F10F4D] text-white flex items-center justify-center">
          <FileText size={22} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">Gerador de Contratos</h1>
          <p className="text-sm text-slate-500">Preencha os dados e gere o contrato em PDF ou Word.</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-amber-800">
          O texto das cláusulas ainda é um <strong>modelo provisório</strong>, marcado com [colchetes], enquanto a gestora
          não envia o texto jurídico definitivo. Não envie o contrato gerado agora para um cliente — use-o só para testar
          o preenchimento e o layout.
        </p>
      </div>

      {/* Tipo de contrato */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <label className="text-sm font-bold text-slate-700">Tipo de contrato</label>
        <div className="flex gap-2">
          {(['VENDA', 'LOCACAO'] as ContractType[]).map(type => (
            <button
              key={type}
              onClick={() => setForm(prev => ({ ...prev, contract_type: type, clauses: [] }))}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm border transition ${
                form.contract_type === type
                  ? 'bg-[#F10F4D] text-white border-[#F10F4D]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {type === 'VENDA' ? 'Venda' : 'Locação'}
            </button>
          ))}
        </div>
      </div>

      {/* Buscar imóvel pra pré-preencher */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Home size={16} /> Puxar dados de um imóvel já cadastrado (opcional)
        </label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={propertySearch}
            onChange={e => setPropertySearch(e.target.value)}
            placeholder="Buscar por código, título ou endereço..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F10F4D]/30"
          />
        </div>
        {filteredProperties.length > 0 && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {filteredProperties.map(p => (
              <button
                key={p.id}
                onClick={() => handlePickProperty(p)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
              >
                <span className="font-bold text-slate-700">{p.code}</span>{' '}
                <span className="text-slate-500">— {p.title}</span>
              </button>
            ))}
          </div>
        )}
        {form.property_code && (
          <p className="text-xs text-emerald-600 font-semibold">Dados pré-preenchidos a partir do imóvel {form.property_code}.</p>
        )}
      </div>

      {/* Descrição e valor */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <label className="text-sm font-bold text-slate-700">Descrição legal do imóvel</label>
        <textarea
          value={form.property_description}
          onChange={e => setForm(prev => ({ ...prev, property_description: e.target.value }))}
          rows={3}
          placeholder="Endereço completo, matrícula, características..."
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F10F4D]/30"
        />
        <label className="text-sm font-bold text-slate-700">
          {form.contract_type === 'VENDA' ? 'Valor da venda' : 'Valor do aluguel mensal'}
        </label>
        <input
          type="text"
          value={form.property_value}
          onChange={e => setForm(prev => ({ ...prev, property_value: e.target.value }))}
          placeholder="Ex: R$ 350.000,00"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F10F4D]/30"
        />
      </div>

      {/* Proprietário e contraparte */}
      <div className="grid md:grid-cols-2 gap-4">
        <PartyForm
          title={form.contract_type === 'VENDA' ? 'Vendedor(a) / Proprietário(a)' : 'Locador(a) / Proprietário(a)'}
          party={form.owner}
          onChange={p => setForm(prev => ({ ...prev, owner: p }))}
        />
        <PartyForm
          title={form.contract_type === 'VENDA' ? 'Comprador(a)' : 'Locatário(a)'}
          party={form.counterparty}
          onChange={p => setForm(prev => ({ ...prev, counterparty: p }))}
        />
      </div>

      {/* Cláusulas condicionais */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <label className="text-sm font-bold text-slate-700">Cláusulas adicionais</label>
        {applicableClauses.map(clause => (
          <div key={clause.key} className="border border-slate-100 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isClauseEnabled(clause.key)}
                onChange={e => handleClauseToggle(clause.key, e.target.checked)}
                className="w-4 h-4 accent-[#F10F4D]"
              />
              <span className="text-sm font-semibold text-slate-700">{clause.label}</span>
            </label>
            {isClauseEnabled(clause.key) && clause.fields.length > 0 && (
              <div className="mt-3 grid sm:grid-cols-2 gap-2">
                {clause.fields.map(field => (
                  <div key={field.key}>
                    <label className="text-xs text-slate-500">{field.label}</label>
                    <input
                      type="text"
                      value={clauseFieldValue(clause.key, field.key)}
                      onChange={e => handleClauseFieldChange(clause.key, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F10F4D]/30"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Observações */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <label className="text-sm font-bold text-slate-700">Observações adicionais (opcional)</label>
        <textarea
          value={form.extra_notes}
          onChange={e => setForm(prev => ({ ...prev, extra_notes: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F10F4D]/30"
        />
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowPreview(v => !v)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          {showPreview ? 'Ocultar prévia' : 'Ver prévia do texto'}
        </button>
        <button
          onClick={handleGeneratePDF}
          disabled={isGenerating}
          className="px-4 py-2.5 rounded-lg bg-[#F10F4D] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <FileText size={16} /> Gerar PDF
        </button>
        <button
          onClick={handleGenerateDocx}
          disabled={isGenerating}
          className="px-4 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <FileDown size={16} /> Gerar Word (.docx)
        </button>
      </div>

      {showPreview && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 max-h-[500px] overflow-y-auto">
          <h3 className="font-black text-slate-800">{preview.title}</h3>
          {preview.paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-slate-600 whitespace-pre-line">{p}</p>
          ))}
        </div>
      )}
    </div>
  );
};

const PartyForm: React.FC<{ title: string; party: ContractParty; onChange: (p: ContractParty) => void }> = ({
  title,
  party,
  onChange
}) => {
  const set = (field: keyof ContractParty, value: string) => onChange({ ...party, [field]: value });
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
      <label className="text-sm font-bold text-slate-700">{title}</label>
      <input
        type="text"
        value={party.name}
        onChange={e => set('name', e.target.value)}
        placeholder="Nome completo"
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F10F4D]/30"
      />
      <input
        type="text"
        value={party.cpf_cnpj}
        onChange={e => set('cpf_cnpj', e.target.value)}
        placeholder="CPF/CNPJ"
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F10F4D]/30"
      />
      <input
        type="text"
        value={party.address}
        onChange={e => set('address', e.target.value)}
        placeholder="Endereço completo"
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F10F4D]/30"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={party.phone || ''}
          onChange={e => set('phone', e.target.value)}
          placeholder="Telefone"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F10F4D]/30"
        />
        <input
          type="text"
          value={party.email || ''}
          onChange={e => set('email', e.target.value)}
          placeholder="E-mail"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F10F4D]/30"
        />
      </div>
    </div>
  );
};
