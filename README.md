# GERADOR DE CATÁLOGOS IMOBILIÁRIOS - LOPES MANAUS

Plataforma profissional de gerenciamento imobiliário e geração de catálogos digitais em PDF com páginas públicas individuais para captadores.

---

## 🚀 VISÃO GERAL DO SISTEMA

O **Gerador de Catálogos Imobiliários - Lopes Manaus** foi desenvolvido para permitir que imobiliárias e corretores captadores gerenciem seus imóveis, compartilhem sua vitrine pública com clientes e gerem catálogos em alta definição em PDF de forma rápida, moderna e sem depender de serviços externos pagos.

### 🌟 Principais Recursos:
- **Painel Master Admin**: Estatísticas globais, ranking de captação, controle total de usuários, alteração de permissões, bloqueio e auditoria.
- **Painel do Captador**: Gestão de imóveis próprios, link público individual (`/catalogo/michelesilva`), exportação direta de PDFs.
- **Página Pública do Captador**: Vitrine digital acessível por qualquer cliente com QR Code, galeria de fotos, especificações e botão direto de agendamento no WhatsApp.
- **Gerador de Catálogos PDF**: Criação automática de arquivos PDF profissionais com capa, marca Lopes Manaus, fotos em alta resolução, ficha técnica e QR Code individual.
- **Criptografia e Autenticação**: Sistema JWT com senhas salvas em hash bcryptjs.

---

## 🛠️ ARQUITETURA DO PROJETO

O projeto é estruturado em padrão moderno e escalável, pronto para virar uma plataforma SaaS imobiliária:

```
/
├── server.ts              # Servidor Backend Express com REST API + Servidor Vite
├── src/
│   ├── components/        # Componentes reutilizáveis (Header, Sidebar, PropertyCard, Modals)
│   ├── context/           # Estado de Autenticação JWT
│   ├── data/              # Dados de teste (Mock / Seed Data)
│   ├── lib/               # Gerador de PDF (jsPDF) e Gerador de QR Code
│   ├── pages/             # Telas principais (Dashboards, Usuários, Imóveis, Catálogo Público)
│   └── types.ts           # Interfaces e tipos do TypeScript
├── database/
│   └── schema.sql         # Script DDL completo para PostgreSQL
├── docker-compose.yml     # Orquestração de contêineres Docker
├── README.md              # Documentação completa
└── .env.example           # Variáveis de ambiente
```

---

## 🔑 CREDENCIAIS PADRÃO DE TESTE

Para testar a aplicação imediatamente:

1. **Master Admin**:
   - **Login**: `admin` (ou `admin@lopesmanaus.com.br`)
   - **Senha**: `admin123`

2. **Captadora (Michele Silva)**:
   - **Login**: `michelesilva`
   - **Senha**: `123456`
   - **URL Pública**: `/catalogo/michelesilva`

3. **Captador (Carlos Eduardo)**:
   - **Login**: `carloseduardo`
   - **Senha**: `123456`
   - **URL Pública**: `/catalogo/carloseduardo`

---

## 💻 INSTALAÇÃO E EXECUÇÃO LOCAL

### Pré-requisitos:
- Node.js >= 18.x
- npm >= 9.x

```bash
# 1. Instalar dependências do projeto
npm install

# 2. Copiar arquivo de exemplo de ambiente
cp .env.example .env

# 3. Executar o servidor de desenvolvimento
npm run dev
```

Acesse no navegador: `http://localhost:3000`

---

## 🐳 EXECUÇÃO COM DOCKER

Para subir todo o ecossistema (Aplicação + Banco de Dados PostgreSQL):

```bash
docker-compose up -d --build
```

---

## 📦 GUIA DE DEPLOY EM PRODUÇÃO

### 1. Frontend no Netlify:
1. Conecte o repositório GitHub ao Netlify.
2. Defina os comandos de Build:
   - **Build Command**: `npm run build`
   - **Publish directory**: `dist`
3. Defina as variáveis de ambiente em **Site Settings > Environment variables**:
   - `VITE_API_URL`: URL do seu backend hospedado (ex: `https://api.lopesmanaus.com.br`)

### 2. Backend no Render / Railway / VPS:
1. Crie um serviço Web no Render ou Railway apontando para o seu repositório.
2. Defina as variáveis de ambiente:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `JWT_SECRET`: `sua_chave_secreta_forte`
   - `DATABASE_URL`: `postgres://usuario:senha@host:5432/banco`
3. Comando de início:
   - `npm run build && npm start`

### 3. Banco de Dados PostgreSQL:
1. Crie uma instância PostgreSQL no Render, Supabase (ou banco próprio).
2. Execute o arquivo `/database/schema.sql` para criar todas as tabelas e índices.

---

## 📄 LICENÇA

Este projeto foi desenvolvido exclusivamente para a **Lopes Manaus**.
