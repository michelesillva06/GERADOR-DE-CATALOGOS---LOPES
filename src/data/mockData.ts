import { User, Property, CompanySettings, AuditLog } from '../types';

export const initialCompanySettings: CompanySettings = {
  company_name: 'Lopes Captação',
  unit_name: 'Lopes Imobiliária - Shopping Ponta Negra',
  logo_url: '/lopes-logo.svg',
  primary_color: '#F10F4D',
  phone: '(92) 3659-1000',
  whatsapp: '5592981234567',
  email: 'contato@lopesmanaus.com.br',
  address: 'Av. Coronel Teixeira, 5705, Loja LUC 15.2 no Shopping Ponta Negra, Bairro Ponta Negra, CEP 69037-000, Manaus - AM',
  city: 'Manaus',
  state: 'AM',
  instagram: '@lopesmanaus',
  creci_j: '540-J/AM',
  cover_horizontal_url: '',
  cover_geral_url: '',
  cover_venda_url: '',
  cover_locacao_url: ''
};

export const initialUsers: User[] = [
  {
    id: 'usr_admin',
    name: 'Administrador Master',
    email: 'admin@lopesmanaus.com.br',
    username: 'admin',
    phone: '(92) 3659-1000',
    whatsapp: '5592981234567',
    role: 'MASTER_ADMIN',
    position: 'Administrador do Sistema',
    url_slug: 'admin',
    status: 'active',
    photo_url: '',
    creci: '540-J/AM',
    instagram: '@lopesmanaus',
    password: 'Lopes@123',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr_demo',
    name: 'Demonstração & Testes',
    email: 'demo@lopesmanaus.com.br',
    username: 'demo',
    phone: '(92) 99999-0000',
    whatsapp: '5592999990000',
    role: 'DEMO',
    position: 'Corretor de Demonstração',
    url_slug: 'demo',
    status: 'active',
    photo_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    creci: 'TESTE-AM',
    instagram: '@lopesdemo',
    password: '123456',
    is_demo: true,
    created_at: new Date().toISOString()
  }
];

export const initialDemoProperties: Property[] = [
  {
    id: 'prop_demo_1',
    code: 'LOP-DEMO1',
    user_id: 'usr_demo',
    title: 'Mansão Suspensa Reserva Inglesa London',
    description: 'Apartamento de altíssimo padrão mobiliado e climatizado, varanda gourmet integrada, vista espetacular para o Rio Negro e acabamento refinado com automação.',
    purpose: 'Venda',
    category: 'Apartamento',
    status: 'Disponível',
    price: 2850000,
    condo_fee: 1850,
    iptu: 2400,
    neighborhood: 'Ponta Negra',
    city: 'Manaus',
    state: 'AM',
    address: 'Av. Coronel Teixeira, Ponta Negra',
    bedrooms: 4,
    suites: 4,
    bathrooms: 5,
    parking_spaces: 3,
    total_area: 294,
    built_area: 294,
    features: ['Piscina', 'Varanda Gourmet', 'Churrasqueira', 'Vista Rio', 'Mobiliado', 'Ar Condicionado', 'Academia', 'Segurança 24h'],
    main_image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
    ],
    views: 45,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prop_demo_2',
    code: 'LOP-DEMO2',
    user_id: 'usr_demo',
    title: 'Casa Duplex Condomínio Alphaville Ponta Negra',
    description: 'Mansão contemporânea com energia solar, piscina privativa com cascata e iluminação em LED, espaço gourmet climatizado e suíte master com closet.',
    purpose: 'Venda e Locação',
    category: 'Casa em Condomínio',
    status: 'Disponível',
    price: 3400000,
    rent_price: 18000,
    condo_fee: 1200,
    iptu: 3100,
    neighborhood: 'Ponta Negra',
    city: 'Manaus',
    state: 'AM',
    address: 'Condomínio Alphaville 1',
    bedrooms: 4,
    suites: 4,
    bathrooms: 6,
    parking_spaces: 4,
    total_area: 450,
    built_area: 380,
    features: ['Piscina Privativa', 'Energia Solar', 'Espaço Gourmet', 'Closet', 'Banheira Hidro', 'Churrasqueira', 'Portaria Blindada'],
    main_image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'
    ],
    views: 82,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prop_demo_3',
    code: 'LOP-DEMO3',
    user_id: 'usr_demo',
    title: 'Apartamento Luxo Concept Adrianópolis',
    description: 'Andar alto 100% mobiliado e decorado por arquiteto, cortina de vidro na varanda gourmet com churrasqueira ecológica e lazer completo de resort.',
    purpose: 'Locação',
    category: 'Apartamento',
    status: 'Disponível',
    price: 0,
    rent_price: 9500,
    condo_fee: 1400,
    iptu: 1800,
    neighborhood: 'Adrianópolis',
    city: 'Manaus',
    state: 'AM',
    address: 'Rua Salvador, Adrianópolis',
    bedrooms: 3,
    suites: 3,
    bathrooms: 4,
    parking_spaces: 2,
    total_area: 162,
    built_area: 162,
    features: ['100% Mobiliado', 'Varanda Gourmet', 'Churrasqueira', 'Piscina Adulto e Infantil', 'Quadra de Squash', 'Academia'],
    main_image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80'
    ],
    views: 64,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prop_demo_4',
    code: 'LOP-DEMO4',
    user_id: 'usr_demo',
    title: 'Cobertura Duplex Ephigênio Salles',
    description: 'Exclusiva cobertura duplex com piscina privativa, deck de madeira tratada, churrasqueira a carvão, elevador com biometria e vista 360° da cidade.',
    purpose: 'Venda',
    category: 'Cobertura',
    status: 'Disponível',
    price: 4200000,
    condo_fee: 2800,
    iptu: 4500,
    neighborhood: 'Aleixo',
    city: 'Manaus',
    state: 'AM',
    address: 'Av. Ephigênio Salles',
    bedrooms: 4,
    suites: 4,
    bathrooms: 6,
    parking_spaces: 4,
    total_area: 420,
    built_area: 420,
    features: ['Cobertura Duplex', 'Piscina Privativa', 'Deck Molhado', 'Vista Panorâmica', 'Elevador Privativo', 'Adega Climatizada'],
    main_image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'
    ],
    views: 110,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const initialProperties: Property[] = [];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log_system_init',
    user_id: 'usr_admin',
    user_name: 'Administrador Master',
    action: 'Inicialização do Sistema',
    description: 'Sistema inicializado e zerado. Pronto para início de cadastros em produção.',
    created_at: new Date().toISOString()
  }
];

export const initialScheduleEvents: any[] = [];

export const initialJournalEntries: any[] = [];


