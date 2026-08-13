export type UserRole = 'MASTER_ADMIN' | 'GESTORA' | 'CAPTADOR' | 'DEMO';
export type UserStatus = 'active' | 'blocked';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  whatsapp: string;
  role: UserRole;
  position: string;
  url_slug: string;
  status: UserStatus;
  photo_url: string;
  instagram?: string;
  facebook?: string;
  creci?: string;
  password?: string;
  is_demo?: boolean;
  created_at: string;
}

export type PropertyPurpose = 'Venda' | 'Locação' | 'Venda e Locação';
export type PropertyCategory =
  | 'Apartamento'
  | 'Casa'
  | 'Casa em Condomínio'
  | 'Cobertura'
  | 'Flat / Studio / Kitnet'
  | 'Terreno / Lote'
  | 'Terreno em Condomínio'
  | 'Sala Comercial'
  | 'Prédio Comercial'
  | 'Loja / Ponto Comercial'
  | 'Galpão / Depósito / Armazém'
  | 'Chácara / Sítio / Fazenda'
  | 'Área Industrial'
  | 'Loft'
  | 'Duplex / Triplex'
  | 'Sobrado'
  | 'Hotel / Pousada'
  | 'Outro'
  | string;
export type PropertyStatus = 'Disponível' | 'Reservado' | 'Vendido' | 'Alugado';

export interface Property {
  id: string;
  code: string;
  user_id: string; // Captador ID
  title: string;
  description: string;
  purpose: PropertyPurpose;
  category: PropertyCategory;
  status: PropertyStatus;
  price: number;
  rent_price?: number;
  condo_fee: number;
  iptu: number;
  neighborhood: string;
  city: string;
  state: string;
  address?: string;
  street?: string;
  number?: string;
  zip_code?: string;
  total_area?: number;
  built_area?: number;
  usable_area?: number;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parking_spaces: number;
  features?: string[];
  images?: string[];
  main_image?: string;
  views?: number;
  featured?: boolean;
  photos?: any[];
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  notes?: string;
  user_name?: string;
  // Informações do Cliente Comprador / Inquilino
  client_name?: string;
  client_cpf_cnpj?: string;
  client_phone?: string;
  client_email?: string;
  client_type?: 'COMPRADOR' | 'INQUILINO';
  transaction_date?: string;
  transaction_value?: number;
  transaction_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  description: string;
  created_at: string;
  ip_address?: string;
}

export interface CompanySettings {
  company_name: string;
  unit_name: string;
  logo_url: string;
  primary_color: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  instagram: string;
  creci_j: string;
  cover_locacao_url?: string;
  cover_venda_url?: string;
  cover_geral_url?: string;
  cover_horizontal_url?: string;
  cover_vertical_url?: string;
  lastBackupAt?: string;
  backupStatus?: string;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  total_properties: number;
  available_properties: number;
  sold_properties: number;
  rented_properties: number;
  reserved_properties: number;
  recent_registrations: number;
  top_captadores: {
    user_id: string;
    name: string;
    photo_url: string;
    count: number;
    url_slug: string;
  }[];
}

export interface JournalEntry {
  id: string;
  user_id: string;
  user_name: string;
  date: string; // YYYY-MM-DD
  summary_notes: string;
  key_highlights: string[];
  next_day_goals: string;
  rating?: 'Produtivo' | 'Excelente' | 'Desafiador' | 'Regular';
  auto_metrics?: {
    properties_created: number;
    properties_updated: number;
    status_changes: number;
    visits_count: number;
  };
  created_at: string;
  updated_at: string;
}

export type ScheduleEventType = 'VISITA' | 'TREINAMENTO' | 'EVENTO' | 'FERIADO';

export interface ScheduleEvent {
  id: string;
  title: string;
  type: ScheduleEventType;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM e.g. "09:00"
  end_time: string; // HH:MM e.g. "10:00"
  user_id: string; // Captador ID
  user_name: string;
  property_id?: string;
  property_code?: string;
  client_name?: string;
  client_phone?: string;
  location?: string;
  notes?: string;
  exclusive_visit?: boolean; // true = "Ir Só" (No concurrent visit allowed for this property), false = "Pode Ir Acompanhado"
  created_at: string;
}

export interface PDFExportOptions {
  title?: string;
  includeCover: boolean;
  selectedProperties: Property[];
  captador: User;
  companySettings: CompanySettings;
}
