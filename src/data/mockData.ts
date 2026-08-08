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
    created_at: new Date().toISOString()
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


