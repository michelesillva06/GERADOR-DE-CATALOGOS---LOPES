-- ===================================================
-- GERADOR DE CATÁLOGOS IMOBILIÁRIOS - LOPES MANAUS
-- Estrutura de Banco de Dados PostgreSQL
-- ===================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Configurações da Empresa
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'Lopes Manaus',
    unit_name VARCHAR(255) DEFAULT 'Unidade Manaus',
    logo_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#F10F4D',
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100) DEFAULT 'Manaus',
    state VARCHAR(50) DEFAULT 'AM',
    instagram VARCHAR(100),
    creci_j VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuários / Captadores
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'CAPTADOR', -- MASTER_ADMIN ou CAPTADOR
    position VARCHAR(100) DEFAULT 'Corretor de Imóveis',
    url_slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active ou blocked
    photo_url TEXT,
    creci VARCHAR(50),
    instagram VARCHAR(100),
    facebook VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Imóveis
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    purpose VARCHAR(50) NOT NULL DEFAULT 'Venda', -- Venda, Locação, Venda e Locação
    category VARCHAR(50) NOT NULL DEFAULT 'Apartamento', -- Apartamento, Casa, Sala comercial, Terreno, Condomínio, Cobertura
    status VARCHAR(50) NOT NULL DEFAULT 'Disponível', -- Disponível, Reservado, Vendido, Alugado
    price NUMERIC(15, 2) DEFAULT 0,
    rent_price NUMERIC(15, 2) DEFAULT 0,
    condo_fee NUMERIC(15, 2) DEFAULT 0,
    iptu NUMERIC(15, 2) DEFAULT 0,
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Manaus',
    state VARCHAR(10) NOT NULL DEFAULT 'AM',
    address TEXT,
    total_area NUMERIC(10, 2) DEFAULT 0,
    built_area NUMERIC(10, 2) DEFAULT 0,
    bedrooms INT DEFAULT 0,
    suites INT DEFAULT 0,
    bathrooms INT DEFAULT 0,
    parking_spaces INT DEFAULT 0,
    features JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    main_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Logs e Auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para Performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_neighborhood ON properties(neighborhood);
CREATE INDEX IF NOT EXISTS idx_properties_category ON properties(category);
CREATE INDEX IF NOT EXISTS idx_users_url_slug ON users(url_slug);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Dados Iniciais (Seed)
INSERT INTO company_settings (company_name, phone, whatsapp, email, address, creci_j)
VALUES ('Lopes Manaus', '(92) 3659-1000', '5592981234567', 'contato@lopesmanaus.com.br', 'Av. Mario Ypiranga, 1300 - Adrianópolis', '1234-J/AM')
ON CONFLICT DO NOTHING;
