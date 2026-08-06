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
  creci_j: '540-J/AM'
};

export const initialUsers: User[] = [
  {
    id: 'usr_admin',
    name: 'Administrador',
    email: 'admin@lopesmanaus.com.br',
    username: 'admin',
    phone: '(92) 3659-1000',
    whatsapp: '5592981234567',
    role: 'MASTER_ADMIN',
    position: 'Perfil Master',
    url_slug: 'geral',
    status: 'active',
    photo_url: '',
    creci: '540-J/AM',
    instagram: '@lopesmanaus',
    created_at: '2026-01-15T10:00:00Z'
  },
  {
    id: 'usr_larissa',
    name: 'Larissa Maia',
    email: 'larissa.maia@lopesmanaus.com.br',
    username: 'larissamaia',
    phone: '(92) 99188-2233',
    whatsapp: '5592991882233',
    role: 'GESTORA',
    position: 'Gestora Imobiliária',
    url_slug: 'larissamaia',
    status: 'active',
    photo_url: '',
    creci: '4920-F/AM',
    instagram: '@larissa.lopesmanaus',
    created_at: '2026-01-20T08:00:00Z'
  },
  {
    id: 'usr_michele',
    name: 'Michele Silva',
    email: 'michelesilva@lopesmanaus.com.br',
    username: 'michelesilva',
    phone: '(92) 98456-7890',
    whatsapp: '5592984567890',
    role: 'CAPTADOR',
    position: 'Corretora de Alto Padrão',
    url_slug: 'michelesilva',
    status: 'active',
    photo_url: '',
    creci: '5821-F/AM',
    instagram: '@michelesilva.imoveis',
    created_at: '2026-02-01T14:30:00Z'
  },
  {
    id: 'usr_moacir',
    name: 'Moacir Martins',
    email: 'moacirmartins@lopesmanaus.com.br',
    username: 'moacirmartins',
    phone: '(92) 98112-2334',
    whatsapp: '5592981122334',
    role: 'CAPTADOR',
    position: 'Consultor Imobiliário',
    url_slug: 'moacirmartins',
    status: 'active',
    photo_url: '',
    creci: '6190-F/AM',
    instagram: '@moacir.lopesmanaus',
    created_at: '2026-02-10T11:20:00Z'
  },
  {
    id: 'usr_karine',
    name: 'Karine Corrêa',
    email: 'karinecorrea@lopesmanaus.com.br',
    username: 'karinecorrea',
    phone: '(92) 99233-4455',
    whatsapp: '5592992334455',
    role: 'CAPTADOR',
    position: 'Captadora Executiva',
    url_slug: 'karinecorrea',
    status: 'active',
    photo_url: '',
    creci: '7412-F/AM',
    instagram: '@karinecorrea.imoveis',
    created_at: '2026-03-05T09:15:00Z'
  }
];

export const initialProperties: Property[] = [];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log_system_init',
    user_id: 'usr_admin',
    user_name: 'Administrador Master',
    action: 'Inicialização do Sistema',
    description: 'Sistema configurado e pronto para produção com base de dados zerada.',
    created_at: new Date().toISOString()
  }
];

export const initialScheduleEvents = [
  // Feriados Oficiais em Manaus / Brasil (Feriados Nacionais, Estaduais e Municipais)
  {
    id: 'hol_0101',
    title: 'Confraternização Universal',
    type: 'FERIADO' as const,
    date: '2026-01-01',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Nacional. Agendamentos suspensos por política da imobiliária.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_1602',
    title: 'Carnaval (Segunda-feira)',
    type: 'FERIADO' as const,
    date: '2026-02-16',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Ponto Facultativo / Feriado.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_1702',
    title: 'Carnaval (Terça-feira)',
    type: 'FERIADO' as const,
    date: '2026-02-17',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado de Carnaval.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_0304',
    title: 'Sexta-feira Santa',
    type: 'FERIADO' as const,
    date: '2026-04-03',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Nacional (Paixão de Cristo).',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_2104',
    title: 'Tiradentes',
    type: 'FERIADO' as const,
    date: '2026-04-21',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Nacional.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_0105',
    title: 'Dia do Trabalhador',
    type: 'FERIADO' as const,
    date: '2026-05-01',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Nacional.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_0406',
    title: 'Corpus Christi',
    type: 'FERIADO' as const,
    date: '2026-06-04',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Religioso.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_0509',
    title: 'Elevação do Amazonas à Província',
    type: 'FERIADO' as const,
    date: '2026-09-05',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Estadual do Amazonas.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_0709',
    title: 'Independência do Brasil',
    type: 'FERIADO' as const,
    date: '2026-09-07',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Nacional.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_1210',
    title: 'Nossa Senhora Aparecida',
    type: 'FERIADO' as const,
    date: '2026-10-12',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Nacional.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_2410',
    title: 'Aniversário de Manaus',
    type: 'FERIADO' as const,
    date: '2026-10-24',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Municipal de Manaus.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_0211',
    title: 'Finados',
    type: 'FERIADO' as const,
    date: '2026-11-02',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Nacional.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_1511',
    title: 'Proclamação da República',
    type: 'FERIADO' as const,
    date: '2026-11-15',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Nacional.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_2011',
    title: 'Dia Nacional da Consciência Negra',
    type: 'FERIADO' as const,
    date: '2026-11-20',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Nacional.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_0812',
    title: 'Nossa Senhora da Conceição (Padroeira de Manaus)',
    type: 'FERIADO' as const,
    date: '2026-12-08',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Municipal em Manaus.',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'hol_2512',
    title: 'Natal',
    type: 'FERIADO' as const,
    date: '2026-12-25',
    start_time: '00:00',
    end_time: '23:59',
    user_id: 'usr_admin',
    user_name: 'Sistema Lopes',
    notes: 'Feriado Nacional de Natal.',
    created_at: '2026-01-01T00:00:00Z'
  },
  // Training & Events
  {
    id: 'event_train_1',
    title: 'Treinamento de Captação de Imóveis de Alto Padrão em Manaus',
    type: 'TREINAMENTO' as const,
    date: new Date().toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '16:00',
    user_id: 'usr_larissa',
    user_name: 'Larissa Maia',
    location: 'Auditório Lopes - Shopping Ponta Negra',
    notes: 'Alinhamento estratégico com os captadores sobre prospecção no Adrianópolis e Ponta Negra.',
    created_at: new Date().toISOString()
  }
];

export const initialJournalEntries = [
  {
    id: 'jrn_demo_1',
    user_id: 'usr_michele',
    user_name: 'Michele Silva',
    date: new Date().toISOString().split('T')[0],
    summary_notes: 'Dia dedicado à prospecção no bairro Adrianópolis e atualização das fotos de cobertura dos imóveis de luxo.',
    key_highlights: [
      'Visita agendada com proprietário do apartamento no Reserva das Águas',
      'Atendimento a 2 clientes compradores interessados na Ponta Negra',
      'Ajuste nos valores de VGV da carteira'
    ],
    next_day_goals: 'Fazer acompanhamento das propostas de locação pendentes e enviar links dos catálogos públicos para investidores.',
    rating: 'Excelente' as const,
    auto_metrics: {
      properties_created: 1,
      properties_updated: 3,
      status_changes: 1,
      visits_count: 2
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

