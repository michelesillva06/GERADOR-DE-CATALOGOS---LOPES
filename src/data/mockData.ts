import { User, Property, CompanySettings, AuditLog } from '../types.js';

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
  cover_horizontal_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=85',
  cover_geral_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=85',
  cover_venda_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=85',
  cover_locacao_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1920&q=85'
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
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const initialDemoProperties: Property[] = [];

// Data calculada para simular cadastro e checagem de status atrasados (para teste imediato das notificações)
const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

export const initialProperties: Property[] = [
  {
    id: 'prop_reserva_praias',
    code: 'LOP-PN01',
    user_id: 'usr_admin',
    user_name: 'Administrador Master',
    title: 'Apartamento Reserva das Praias com Vista Rio Negro',
    description: 'Excelente apartamento de alto padrão no Condomínio Reserva das Praias, Ponta Negra. Com 87m² de área privativa, oferece 3 dormitórios sendo 1 suíte espaçosa, sala em 2 ambientes integrada à varanda gourmet com churrasqueira e vista panorâmica para o Rio Negro. Cozinha com armários planejados, área de serviço independente e 2 vagas de garagem cobertas. Condomínio clube completo com piscinas adulto e infantil com deck molhado, academia climatizada, salões de festas, quadra poliesportiva, playground, gerador 100% e portaria 24 horas.',
    purpose: 'Venda',
    category: 'Apartamento',
    status: 'Disponível',
    price: 850000,
    condo_fee: 780,
    iptu: 1200,
    neighborhood: 'Ponta Negra',
    city: 'Manaus',
    state: 'AM',
    address: 'Av. Coronel Teixeira, 5803 - Ponta Negra',
    official_site_url: 'https://manaus.lopes.com.br/',
    bedrooms: 3,
    suites: 1,
    bathrooms: 2,
    parking_spaces: 2,
    total_area: 87,
    built_area: 87,
    features: [
      'Piscina',
      'Piscina com Borda Infinita',
      'Varanda Gourmet',
      'Churrasqueira',
      'Gerador 100%',
      'Academia',
      'Portaria 24h',
      'Salão de Festas',
      'Playground'
    ],
    main_image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'
    ],
    views: 84,
    last_status_check: new Date(now - 22 * dayMs).toISOString(),
    created_at: new Date(now - 22 * dayMs).toISOString(),
    updated_at: new Date(now - 22 * dayMs).toISOString()
  },
  {
    id: 'prop_renaissance_adrianopolis',
    code: 'LOP-AD02',
    user_id: 'usr_admin',
    user_name: 'Administrador Master',
    title: 'Mansão Contemporânea no Condomínio Renaissance',
    description: 'Exuberante mansão em estilo contemporâneo no prestigiado Condomínio Renaissance, no coração do Adrianópolis. Projeto arquitetônico moderno com 380m² de área construída em lote de 450m². Pavimento superior composto por 4 amplas suítes com varanda, sendo a suíte master contemplada com closet duplo e sala de banho com hidromassagem. Pavimento térreo com pé-direito duplo de 6 metros, lavabo imponente, escritório planejado, adega climatizada, cozinha gourmet integrada e espetacular área de lazer privativa com piscina com prainha, cascata e deck em cumaru. Imóvel dotado de usina solar fotovoltaica e gerador 100%.',
    purpose: 'Venda',
    category: 'Casa em Condomínio',
    status: 'Disponível',
    price: 3200000,
    condo_fee: 1650,
    iptu: 3400,
    neighborhood: 'Adrianópolis',
    city: 'Manaus',
    state: 'AM',
    address: 'Rua Dom Pedro, Condomínio Renaissance - Adrianópolis',
    official_site_url: 'https://manaus.lopes.com.br/',
    bedrooms: 4,
    suites: 4,
    bathrooms: 6,
    parking_spaces: 4,
    total_area: 450,
    built_area: 380,
    features: [
      'Piscina',
      'Varanda Gourmet',
      'Churrasqueira',
      'Closet',
      'Hidromassagem',
      'Energia Solar',
      'Gerador 100%',
      'Portaria 24h',
      'Ar Condicionado',
      'Quadra de Tênis'
    ],
    main_image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80'
    ],
    views: 142,
    last_status_check: new Date(now - 35 * dayMs).toISOString(),
    created_at: new Date(now - 35 * dayMs).toISOString(),
    updated_at: new Date(now - 35 * dayMs).toISOString()
  },
  {
    id: 'prop_singolare_vieiralves',
    code: 'LOP-VA03',
    user_id: 'usr_admin',
    user_name: 'Administrador Master',
    title: 'Apartamento Decorado no Condomínio Singolare Vieiralves',
    description: 'Apartamento de altíssimo padrão finamente decorado e 100% mobiliado no Condomínio Singolare, bairro Vieiralves. Planta inteligente com 132m², composta por 3 suítes com armários planejados de primeira linha, ampla sala living integrada à varanda com cortina de vidro e churrasqueira a gás, lavabo decorado, cozinha com ilha central e eletrodomésticos em inox embutidos. 2 vagas de garagem soltas e cobertas. Condomínio com infraestrutura de resort: spa com sauna, piscina com raia de 25m, academia completa, espaço mulher, salão de festas gourmet e segurança rigorosa 24h.',
    purpose: 'Venda e Locação',
    category: 'Apartamento',
    status: 'Disponível',
    price: 1150000,
    rent_price: 7200,
    condo_fee: 1100,
    iptu: 1650,
    neighborhood: 'Nossa Senhora das Graças',
    city: 'Manaus',
    state: 'AM',
    address: 'Rua Rio Mar, Vieiralves',
    official_site_url: 'https://manaus.lopes.com.br/',
    bedrooms: 3,
    suites: 3,
    bathrooms: 4,
    parking_spaces: 2,
    total_area: 132,
    built_area: 132,
    features: [
      'Mobiliado',
      'Varanda Gourmet',
      'Piscina',
      'Sauna',
      'Academia',
      'Gerador 100%',
      'Elevador Privativo',
      'Ar Condicionado',
      'Portaria 24h'
    ],
    main_image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80'
    ],
    views: 97,
    last_status_check: new Date(now - 18 * dayMs).toISOString(),
    created_at: new Date(now - 18 * dayMs).toISOString(),
    updated_at: new Date(now - 18 * dayMs).toISOString()
  },
  {
    id: 'prop_alphaville_manaus',
    code: 'LOP-AP04',
    user_id: 'usr_admin',
    user_name: 'Administrador Master',
    title: 'Casa Térrea de Luxo no Condomínio Alphaville Manaus',
    description: 'Casa térrea espetacular no Alphaville Manaus, projeto arquitetônico assinado com linhas retas e integração total dos ambientes. São 290m² de área construída em terreno plano de 450m². Conta com 4 dormitórios sendo 3 suítes plenas (suíte master com walk-in closet e vista para o jardim), ampla sala de estar e jantar com pé direito alto, cozinha integrada ao espaço gourmet com churrasqueira a carvão e bancada em granito São Gabriel. Área externa com piscina com cascata, deck molhado, pergolado e paisagismo tropical completo. 4 vagas de garagem.',
    purpose: 'Venda',
    category: 'Casa em Condomínio',
    status: 'Disponível',
    price: 2450000,
    condo_fee: 1200,
    iptu: 2800,
    neighborhood: 'Ponta Negra',
    city: 'Manaus',
    state: 'AM',
    address: 'Av. do Turismo, Condomínio Alphaville Manaus 1',
    official_site_url: 'https://manaus.lopes.com.br/',
    bedrooms: 4,
    suites: 3,
    bathrooms: 5,
    parking_spaces: 4,
    total_area: 450,
    built_area: 290,
    features: [
      'Piscina',
      'Piscina com Borda Infinita',
      'Varanda Gourmet',
      'Churrasqueira',
      'Closet',
      'Gerador 100%',
      'Quadra Poliesportiva',
      'Quadra de Tênis',
      'Portaria 24h'
    ],
    main_image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?auto=format&fit=crop&w=1200&q=80'
    ],
    views: 115,
    last_status_check: new Date(now - 45 * dayMs).toISOString(),
    created_at: new Date(now - 45 * dayMs).toISOString(),
    updated_at: new Date(now - 45 * dayMs).toISOString()
  },
  {
    id: 'prop_cristal_tower_duplex',
    code: 'LOP-CR05',
    user_id: 'usr_admin',
    user_name: 'Administrador Master',
    title: 'Cobertura Duplex com Piscina Privativa no Adrianópolis',
    description: 'Exclusiva cobertura duplex de 410m² privativos no ponto mais nobre do Adrianópolis. O imóvel possui elevador privativo com biometria, 4 suítes master com closets individuais e vista 360 graus da cidade de Manaus e Rio Negro. Pavimento superior com amplo terraço privativo descoberto, piscina aquecida com borda infinita, lounge com lareira ecológica, espaço gourmet com churrasqueira e forno de pizza. Acabamentos em mármore importado, marcenaria planejada de alto padrão e 5 vagas de garagem cobertas com depósito privativo.',
    purpose: 'Venda',
    category: 'Cobertura',
    status: 'Disponível',
    price: 4500000,
    condo_fee: 2400,
    iptu: 4900,
    neighborhood: 'Adrianópolis',
    city: 'Manaus',
    state: 'AM',
    address: 'Av. Jornalista Umberto Calderaro Filho - Adrianópolis',
    official_site_url: 'https://manaus.lopes.com.br/',
    bedrooms: 4,
    suites: 4,
    bathrooms: 6,
    parking_spaces: 5,
    total_area: 410,
    built_area: 410,
    features: [
      'Piscina Privativa',
      'Piscina com Borda Infinita',
      'Elevador Privativo',
      'Varanda Gourmet',
      'Churrasqueira',
      'Closet',
      'Hidromassagem',
      'Gerador 100%',
      'Sauna',
      'Portaria 24h'
    ],
    main_image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
    ],
    views: 198,
    last_status_check: new Date(now - 60 * dayMs).toISOString(),
    created_at: new Date(now - 60 * dayMs).toISOString(),
    updated_at: new Date(now - 60 * dayMs).toISOString()
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log_system_init',
    user_id: 'usr_admin',
    user_name: 'Administrador Master',
    action: 'Inicialização do Sistema',
    description: 'Sistema inicializado com perfis de Gestores e Captadores de Imóveis Prontos.',
    created_at: new Date().toISOString()
  }
];

export const initialScheduleEvents: any[] = [];

export const initialJournalEntries: any[] = [
  {
    id: 'jrn_admin_today',
    user_id: 'usr_admin',
    user_name: 'Administrador Master',
    date: new Date().toISOString().split('T')[0],
    summary_notes: 'Acompanhamento do painel geral de captações, revisão das metas da equipe e verificação do status dos imóveis cadastrados.',
    key_highlights: [
      'Validação dos imóveis de alto padrão cadastrados',
      'Verificação do feed de captação e catálogo digital',
      'Configuração das rotinas diárias de notificação'
    ],
    next_day_goals: 'Revisar relatórios semanais e acompanhar novas captações.',
    rating: 'Excelente',
    leads_prospectados: 10,
    imoveis_captados: 5,
    visitas_realizadas: 4,
    canais_captacao: {
      portal: 2,
      placa_rua: 3,
      indicacao: 3,
      redes_sociais: 2,
      telefone_ativo: 0,
      parceria: 0,
      outros: 0
    },
    canal_principal: 'Indicação / Parceiros',
    auto_metrics: {
      properties_created: 5,
      properties_updated: 0,
      status_changes: 0,
      visits_count: 4
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
