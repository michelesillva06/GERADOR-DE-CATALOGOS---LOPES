import React, { useState, useEffect } from 'react';
import { Property, User, PropertyCategory, PropertyPurpose, PropertyStatus } from '../types';
import { X, Plus, Trash2, Image as ImageIcon, Sparkles, Upload } from 'lucide-react';

interface PropertyFormModalProps {
  isOpen: boolean;
  property?: Property | null;
  users: User[];
  currentUserId: string;
  isMaster: boolean;
  onClose: () => void;
  onSave: (propertyData: Partial<Property>) => Promise<void>;
}

const AVAILABLE_FEATURES = [
  'Piscina',
  'Piscina com Borda Infinita',
  'Academia',
  'Portaria 24h',
  'Gerador 100%',
  'Varanda Gourmet',
  'Closet',
  'Ar Condicionado',
  'Churrasqueira',
  'Playground',
  'Quadra Poliesportiva',
  'Quadra de Tênis',
  'Mobiliado',
  'Elevador Privativo',
  'Energia Solar',
  'Sauna',
  'Salão de Festas',
  'Hidromassagem'
];

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
  isOpen,
  property,
  users,
  currentUserId,
  isMaster,
  onClose,
  onSave
}) => {
  const [code, setCode] = useState('');
  const [userId, setUserId] = useState(currentUserId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState<PropertyPurpose>('Venda');
  const [category, setCategory] = useState<PropertyCategory>('Apartamento');
  const [status, setStatus] = useState<PropertyStatus>('Disponível');
  const [price, setPrice] = useState<number | ''>('');
  const [rentPrice, setRentPrice] = useState<number | ''>('');
  const [condoFee, setCondoFee] = useState<number | ''>('');
  const [iptu, setIptu] = useState<number | ''>('');
  const [neighborhood, setNeighborhood] = useState('Adrianópolis');
  const [city, setCity] = useState('Manaus');
  const [state, setState] = useState('AM');
  const [address, setAddress] = useState('');
  const [totalArea, setTotalArea] = useState<number | ''>('');
  const [builtArea, setBuiltArea] = useState<number | ''>('');
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [suites, setSuites] = useState<number>(1);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [parkingSpaces, setParkingSpaces] = useState<number>(2);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (property) {
      setCode(property.code || '');
      setUserId(property.user_id || currentUserId);
      setTitle(property.title || '');
      setDescription(property.description || '');
      setPurpose(property.purpose || 'Venda');
      setCategory(property.category || 'Apartamento');
      setStatus(property.status || 'Disponível');
      setPrice(property.price || '');
      setRentPrice(property.rent_price || '');
      setCondoFee(property.condo_fee || '');
      setIptu(property.iptu || '');
      setNeighborhood(property.neighborhood || 'Adrianópolis');
      setCity(property.city || 'Manaus');
      setState(property.state || 'AM');
      setAddress(property.address || '');
      setTotalArea(property.total_area || '');
      setBuiltArea(property.built_area || '');
      setBedrooms(property.bedrooms || 3);
      setSuites(property.suites || 1);
      setBathrooms(property.bathrooms || 2);
      setParkingSpaces(property.parking_spaces || 2);
      setSelectedFeatures(property.features || []);
      setImages(property.images || []);
      setMainImage(property.main_image || (property.images?.[0] || ''));
    } else {
      setCode(`LOP-${Math.floor(1000 + Math.random() * 9000)}`);
      setUserId(currentUserId);
      setTitle('');
      setDescription('');
      setPurpose('Venda');
      setCategory('Apartamento');
      setStatus('Disponível');
      setPrice('');
      setRentPrice('');
      setCondoFee('');
      setIptu('');
      setNeighborhood('Adrianópolis');
      setCity('Manaus');
      setState('AM');
      setAddress('');
      setTotalArea('');
      setBuiltArea('');
      setBedrooms(3);
      setSuites(1);
      setBathrooms(2);
      setParkingSpaces(2);
      setSelectedFeatures(['Portaria 24h', 'Piscina', 'Gerador 100%']);
      setImages([
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
      ]);
      setMainImage('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80');
    }
  }, [property, currentUserId, isOpen]);

  if (!isOpen) return null;

  const toggleFeature = (feat: string) => {
    if (selectedFeatures.includes(feat)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== feat));
    } else {
      setSelectedFeatures([...selectedFeatures, feat]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setImages((prev) => {
            const next = [...prev, result];
            if (!mainImage) setMainImage(result);
            return next;
          });
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setImages([...images, imageUrlInput.trim()]);
    if (!mainImage) setMainImage(imageUrlInput.trim());
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (mainImage === images[index]) {
      setMainImage(newImages[0] || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor, informe o título comercial do imóvel.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave({
        code,
        user_id: userId,
        title,
        description,
        purpose,
        category,
        status,
        price: Number(price) || 0,
        rent_price: rentPrice ? Number(rentPrice) : undefined,
        condo_fee: Number(condoFee) || 0,
        iptu: Number(iptu) || 0,
        neighborhood,
        city,
        state,
        address,
        total_area: Number(totalArea) || 0,
        built_area: Number(builtArea) || 0,
        bedrooms: Number(bedrooms),
        suites: Number(suites),
        bathrooms: Number(bathrooms),
        parking_spaces: Number(parkingSpaces),
        features: selectedFeatures,
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'],
        main_image: mainImage || images[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar imóvel.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {property ? 'Editar Imóvel Captado' : 'Novo Imóvel Imobiliário'}
            </h2>
            <p className="text-xs text-slate-500">
              Lopes Manaus - Formulário completo de cadastro de captação
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Internal Code & Captador Owner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código Interno</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                required
              />
            </div>

            {isMaster && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Captador Responsável</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'MASTER_ADMIN' ? 'Admin' : 'Captador'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Purpose, Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Finalidade</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as PropertyPurpose)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="Venda">Venda</option>
                <option value="Locação">Locação</option>
                <option value="Venda e Locação">Venda e Locação</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PropertyCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="Apartamento">Apartamento</option>
                <option value="Casa">Casa</option>
                <option value="Sala comercial">Sala comercial</option>
                <option value="Terreno">Terreno</option>
                <option value="Condomínio">Condomínio</option>
                <option value="Cobertura">Cobertura</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status do Imóvel</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="Disponível">Disponível</option>
                <option value="Reservado">Reservado</option>
                <option value="Vendido">Vendido</option>
                <option value="Alugado">Alugado</option>
              </select>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título Comercial</label>
            <input
              type="text"
              placeholder="Ex: Apartamento de Alto Padrão na Ponta Negra com Vista para o Rio"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição Detalhada</label>
            <textarea
              rows={3}
              placeholder="Descreva acabamento, posição solar, iluminação, modulados..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
            />
          </div>

          {/* Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bairro</label>
              <input
                type="text"
                placeholder="Ex: Adrianópolis, Ponta Negra, Vieiralves"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cidade</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Endereço Completo</label>
              <input
                type="text"
                placeholder="Rua, Número, Condomínio"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Pricing Details */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Valor Venda (R$)</label>
              <input
                type="number"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#F10F4D]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Valor Aluguel (R$)</label>
              <input
                type="number"
                placeholder="0"
                value={rentPrice}
                onChange={(e) => setRentPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Condomínio (R$)</label>
              <input
                type="number"
                placeholder="0"
                value={condoFee}
                onChange={(e) => setCondoFee(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">IPTU (R$)</label>
              <input
                type="number"
                placeholder="0"
                value={iptu}
                onChange={(e) => setIptu(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Numerical Specs (Area, Bedrooms, Bathrooms, Parking) */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Área Total m²</label>
              <input
                type="number"
                value={totalArea}
                onChange={(e) => setTotalArea(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Área Útil m²</label>
              <input
                type="number"
                value={builtArea}
                onChange={(e) => setBuiltArea(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Quartos</label>
              <input
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Suítes</label>
              <input
                type="number"
                value={suites}
                onChange={(e) => setSuites(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Banheiros</label>
              <input
                type="number"
                value={bathrooms}
                onChange={(e) => setBathrooms(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Vagas</label>
              <input
                type="number"
                value={parkingSpaces}
                onChange={(e) => setParkingSpaces(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
              />
            </div>
          </div>

          {/* Features Checkboxes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Características & Diferenciais</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200">
              {AVAILABLE_FEATURES.map(feat => (
                <label key={feat} className="flex items-center space-x-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFeatures.includes(feat)}
                    onChange={() => toggleFeature(feat)}
                    className="rounded border-slate-300 text-[#F10F4D] focus:ring-[#F10F4D]"
                  />
                  <span>{feat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Images Upload / URL Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fotos do Imóvel (Galeria e Upload)</label>
            
            {/* File Upload Zone */}
            <div className="mb-3">
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-rose-200 hover:border-[#F10F4D] bg-rose-50/50 hover:bg-rose-50 rounded-2xl cursor-pointer transition text-center group">
                <Upload className="w-6 h-6 text-[#F10F4D] mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800">Clique para enviar fotos do dispositivo</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Formatos suportados: PNG, JPG, WEBP (vários arquivos permitidos)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex space-x-2 mb-3">
              <input
                type="url"
                placeholder="Ou cole a URL da imagem (http://...)"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar URL</span>
              </button>
            </div>

            {/* Gallery Previews */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video border border-slate-200 bg-slate-100">
                  <img src={img} alt="Foto Imóvel" className="w-full h-full object-cover" />
                  
                  {/* Select Main Image Button */}
                  <button
                    type="button"
                    onClick={() => setMainImage(img)}
                    className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      mainImage === img ? 'bg-[#F10F4D] text-white' : 'bg-slate-900/80 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    {mainImage === img ? 'Principal' : 'Tornar Principal'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#F10F4D] hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition transform active:scale-95"
            >
              {saving ? 'Salvando...' : 'Salvar Imóvel'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
