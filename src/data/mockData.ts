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
