export type UserRole = 'MASTER_ADMIN' | 'GESTORA' | 'CAPTADOR';
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
  created_at: string;
}

export type PropertyPurpose = 'Venda' | 'Locação' | 'Venda e Locação';
export type PropertyCategory = 'Apartamento' | 'Casa' | 'Sala comercial' | 'Terreno' | 'Condomínio' | 'Cobertura';
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
  address: string;
  total_area: number;
  built_area: number;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parking_spaces: number;
  features: string[];
  images: string[];
  main_image: string;
  views?: number;
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

export interface PDFExportOptions {
  title?: string;
  includeCover: boolean;
  selectedProperties: Property[];
  captador: User;
  companySettings: CompanySettings;
}
