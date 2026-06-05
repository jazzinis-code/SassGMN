# Google Reviews AI - Sistema de Gerenciamento de Avaliacoes

Sistema inteligente para gerenciamento e resposta automatizada de avaliacoes do Google Business Profile, utilizando inteligencia artificial para gerar respostas personalizadas e profissionais.

---

## Sumario

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pre-requisitos](#pre-requisitos)
- [Instalacao e Configuracao](#instalacao-e-configuracao)
- [Variaveis de Ambiente](#variaveis-de-ambiente)
- [Configuracao do Google Cloud Console](#configuracao-do-google-cloud-console)
- [Configuracao da API OpenAI](#configuracao-da-api-openai)
- [Modos de Automacao](#modos-de-automacao)
- [Documentacao da API](#documentacao-da-api)
- [Esquema do Banco de Dados](#esquema-do-banco-de-dados)
- [Deploy em Producao](#deploy-em-producao)
- [Contribuindo](#contribuindo)
- [Licenca](#licenca)

---

## Sobre o Projeto

Empresas que possuem perfis no Google Business Profile recebem avaliacoes diariamente. Responder a cada uma de forma personalizada, profissional e rapida e essencial para manter uma boa reputacao online e fidelizar clientes.

O **Google Reviews AI** resolve esse problema oferecendo:

- Sincronizacao automatica de avaliacoes do Google Business Profile
- Geracao de respostas inteligentes com IA (OpenAI GPT-4)
- Personalizacao por tom de voz, palavras-chave e segmento do negocio
- Modos de automacao configuraveis (manual, semiautomatico e automatico)
- Painel administrativo completo para gerenciamento de multiplas empresas

---

## Funcionalidades

- **Autenticacao Google OAuth 2.0** - Login seguro via conta Google
- **Multi-empresas** - Gerencie multiplos perfis de negocio em uma unica conta
- **Sincronizacao de avaliacoes** - Importacao automatica das avaliacoes do Google
- **Geracao de respostas com IA** - Respostas personalizadas usando GPT-4 ou GPT-3.5
- **Aprovacao manual** - Revise e edite respostas antes da publicacao
- **Modo semiautomatico** - Aprova automaticamente respostas para avaliacoes positivas (4-5 estrelas)
- **Modo automatico** - Responde a todas as avaliacoes conforme regras configuradas
- **Historico de respostas** - Registre todas as respostas geradas e publicadas
- **Publicacao direta** - Publique respostas diretamente no Google Business Profile
- **Painel administrativo** - Dashboard com metricas e visao geral
- **Personalizacao por empresa** - Tom de voz, palavras-chave, termos a evitar
- **Filas de processamento** - Processamento assincronas com Redis/Bull
- **Logs de auditoria** - Registro de todas as acoes dos usuarios

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Backend | [NestJS](https://nestjs.com/) (Node.js) |
| Frontend | [Next.js 14](https://nextjs.org/) (App Router) |
| Banco de Dados | [PostgreSQL 15](https://www.postgresql.org/) |
| ORM | [Prisma](https://www.prisma.io/) |
| Cache/Filas | [Redis 7](https://redis.io/) + Bull |
| Autenticacao | Google OAuth 2.0 + JWT + NextAuth.js |
| IA | [OpenAI API](https://platform.openai.com/) (GPT-4 / GPT-3.5-turbo) |
| API Google | Google Business Profile API |
| Estilizacao | [Tailwind CSS](https://tailwindcss.com/) |
| Containerizacao | Docker + Docker Compose |
| Linguagem | TypeScript |

---

## Arquitetura

```
+-------------------+         +--------------------+         +------------------+
|                   |  HTTP   |                    |         |                  |
|   Frontend        +-------->+   Backend API      +-------->+   PostgreSQL     |
|   (Next.js)       |         |   (NestJS)         |         |   (Banco)        |
|   :3000           |         |   :3001            |         |   :5432          |
|                   |         |                    |         |                  |
+-------------------+         +--------+-----------+         +------------------+
                                       |
                              +--------+-----------+
                              |                    |
                +-------------+----+        +------+------------+
                |                   |        |                   |
                v                   v        v                   |
+---------------+--+   +-----------+--+   +-+------------------+|
|                  |   |              |   |                      |
| Google Business  |   |  OpenAI API  |   |   Redis             |
| Profile API      |   |  (GPT-4)    |   |   (Filas/Cache)     |
|                  |   |              |   |   :6379             |
+------------------+   +--------------+   +---------------------+
```

**Fluxo principal:**

1. O usuario faz login via Google OAuth 2.0
2. O sistema sincroniza avaliacoes do Google Business Profile
3. Para cada avaliacao, a IA gera uma resposta personalizada
4. Conforme o modo de automacao, a resposta e aprovada automaticamente ou aguarda revisao
5. Respostas aprovadas sao publicadas diretamente no perfil do Google

---

## Estrutura do Projeto

```
google-reviews-ai/
├── backend/                    # API Backend (NestJS)
│   ├── prisma/
│   │   ├── migrations/         # Migracoes do banco de dados
│   │   └── schema.prisma       # Schema do Prisma ORM
│   ├── src/
│   │   ├── ai/                 # Modulo de integracao com OpenAI
│   │   ├── auth/               # Autenticacao (Google OAuth, JWT)
│   │   │   └── strategies/     # Estrategias Passport (Google, JWT)
│   │   ├── businesses/         # CRUD de empresas/perfis
│   │   ├── common/             # Utilitarios compartilhados
│   │   │   ├── decorators/     # Decorators customizados
│   │   │   ├── dto/            # DTOs compartilhados
│   │   │   ├── filters/       # Filtros de excecao
│   │   │   ├── guards/         # Guards de autenticacao
│   │   │   ├── interceptors/   # Interceptors de transformacao
│   │   │   └── prisma/         # Modulo/Service do Prisma
│   │   ├── config/             # Configuracao centralizada
│   │   ├── google/             # Integracao Google Business Profile
│   │   ├── responses/          # Gerenciamento de respostas
│   │   ├── reviews/            # Gerenciamento de avaliacoes
│   │   ├── users/              # Gerenciamento de usuarios
│   │   ├── app.module.ts       # Modulo raiz
│   │   └── main.ts            # Ponto de entrada
│   ├── .env.example            # Variaveis de ambiente (exemplo)
│   ├── nest-cli.json           # Configuracao do NestJS CLI
│   ├── package.json            # Dependencias do backend
│   └── tsconfig.json           # Configuracao TypeScript
├── frontend/                   # Aplicacao Frontend (Next.js)
│   ├── src/
│   │   ├── app/                # App Router (paginas e rotas)
│   │   │   ├── api/auth/       # Rotas de autenticacao NextAuth
│   │   │   ├── dashboard/      # Painel administrativo
│   │   │   ├── businesses/     # Paginas de empresas
│   │   │   └── reviews/        # Paginas de avaliacoes
│   │   ├── components/         # Componentes React reutilizaveis
│   │   ├── lib/                # Bibliotecas e utilitarios
│   │   └── types/              # Definicoes de tipos TypeScript
│   ├── .env.example            # Variaveis de ambiente (exemplo)
│   ├── next.config.js          # Configuracao do Next.js
│   ├── package.json            # Dependencias do frontend
│   ├── postcss.config.js       # Configuracao do PostCSS
│   └── tailwind.config.ts      # Configuracao do Tailwind CSS
├── docker-compose.yml          # Servicos Docker (PostgreSQL + Redis)
├── .env.example                # Variaveis globais (exemplo)
├── .gitignore                  # Arquivos ignorados pelo Git
├── LICENSE                     # Licenca MIT
└── README.md                   # Este arquivo
```

---

## Pre-requisitos

Antes de iniciar, certifique-se de ter instalado:

- **Node.js** 18+ (recomendado: 20 LTS)
- **npm** 9+ (incluido com Node.js)
- **Docker** e **Docker Compose** (para PostgreSQL e Redis)
- **Conta Google Cloud** (para OAuth e Business Profile API)
- **Chave da API OpenAI** (para geracao de respostas com IA)

---

## Instalacao e Configuracao

### 1. Clonar o repositorio

```bash
git clone https://github.com/seu-usuario/google-reviews-ai.git
cd google-reviews-ai
```

### 2. Configurar variaveis de ambiente

Copie os arquivos de exemplo e preencha com seus dados:

```bash
# Variaveis globais
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Consulte a secao [Variaveis de Ambiente](#variaveis-de-ambiente) para detalhes de cada variavel.

### 3. Iniciar servicos Docker

Suba o PostgreSQL e Redis com Docker Compose:

```bash
docker-compose up -d
```

Verifique se os servicos estao rodando:

```bash
docker-compose ps
```

### 4. Instalar dependencias

Na raiz do projeto:

```bash
npm install
```

### 5. Executar migracoes do banco de dados

```bash
cd backend
npx prisma migrate dev
```

### 6. Gerar o Prisma Client

```bash
npx prisma generate
```

### 7. Iniciar servidores de desenvolvimento

Em terminais separados:

```bash
# Terminal 1 - Backend (porta 3001)
cd backend
npm run start:dev

# Terminal 2 - Frontend (porta 3000)
cd frontend
npm run dev
```

Acesse a aplicacao em: http://localhost:3000

---

## Variaveis de Ambiente

### Variaveis Globais (`.env`)

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | String de conexao com PostgreSQL | `postgresql://postgres:postgres@localhost:5432/google_reviews` |
| `REDIS_URL` | String de conexao com Redis | `redis://localhost:6379` |
| `GOOGLE_CLIENT_ID` | ID do cliente OAuth Google | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Secret do cliente OAuth Google | `GOCSPX-xxxxxxxxxxxx` |
| `GOOGLE_CALLBACK_URL` | URL de callback do OAuth | `http://localhost:3000/api/auth/google/callback` |
| `JWT_SECRET` | Chave secreta para tokens JWT | `sua-chave-secreta-aqui` |
| `JWT_EXPIRES_IN` | Tempo de expiracao do JWT | `7d` |
| `OPENAI_API_KEY` | Chave da API OpenAI | `sk-xxxxxxxxxxxxxxxx` |
| `OPENAI_MODEL` | Modelo OpenAI a ser utilizado | `gpt-4` |
| `BACKEND_PORT` | Porta do servidor backend | `3001` |
| `FRONTEND_URL` | URL do frontend | `http://localhost:3000` |
| `BACKEND_URL` | URL do backend | `http://localhost:3001` |

### Backend (`backend/.env`)

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | String de conexao com PostgreSQL | `postgresql://postgres:postgres@localhost:5432/google_reviews` |
| `REDIS_HOST` | Host do servidor Redis | `localhost` |
| `REDIS_PORT` | Porta do servidor Redis | `6379` |
| `GOOGLE_CLIENT_ID` | ID do cliente OAuth Google | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Secret do cliente OAuth Google | `GOCSPX-xxxxxxxxxxxx` |
| `GOOGLE_CALLBACK_URL` | URL de callback do OAuth (backend) | `http://localhost:3001/auth/google/callback` |
| `JWT_SECRET` | Chave secreta para tokens JWT | `sua-chave-secreta-aqui` |
| `JWT_EXPIRES_IN` | Tempo de expiracao do JWT | `7d` |
| `OPENAI_API_KEY` | Chave da API OpenAI | `sk-xxxxxxxxxxxxxxxx` |
| `OPENAI_MODEL` | Modelo OpenAI a ser utilizado | `gpt-4` |
| `PORT` | Porta do servidor backend | `3001` |
| `FRONTEND_URL` | URL do frontend (para CORS) | `http://localhost:3000` |

### Frontend (`frontend/.env`)

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | URL da API backend (acessivel pelo browser) | `http://localhost:3001` |
| `NEXTAUTH_URL` | URL base do NextAuth | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Chave secreta para NextAuth | `sua-chave-secreta-nextauth` |
| `GOOGLE_CLIENT_ID` | ID do cliente OAuth Google | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Secret do cliente OAuth Google | `GOCSPX-xxxxxxxxxxxx` |

---

## Configuracao do Google Cloud Console

### 1. Criar um projeto

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Clique em **Selecionar Projeto** > **Novo Projeto**
3. Insira o nome do projeto (ex: `google-reviews-ai`)
4. Clique em **Criar**

### 2. Ativar APIs necessarias

No menu lateral, va em **APIs e Servicos** > **Biblioteca** e ative:

- **Google Business Profile API** (anteriormente Google My Business API)
- **Google My Business API** (v4, para compatibilidade)
- **Google People API** (para dados do perfil do usuario)

### 3. Configurar tela de consentimento OAuth

1. Va em **APIs e Servicos** > **Tela de consentimento OAuth**
2. Selecione **Externo** (ou Interno se for G Suite)
3. Preencha:
   - Nome do aplicativo: `Google Reviews AI`
   - Email de suporte: seu email
   - Dominios autorizados: seu dominio (ou deixe em branco para dev)
4. Na aba **Escopos**, adicione:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/business.manage`
5. Na aba **Usuarios de teste**, adicione seu email (enquanto o app estiver em modo de teste)

### 4. Criar credenciais OAuth 2.0

1. Va em **APIs e Servicos** > **Credenciais**
2. Clique em **Criar Credenciais** > **ID do cliente OAuth**
3. Tipo de aplicativo: **Aplicativo da Web**
4. Nome: `Google Reviews AI - Web`
5. **Origens JavaScript autorizadas:**
   - `http://localhost:3000` (desenvolvimento)
   - `http://localhost:3001` (backend)
   - `https://seu-dominio.com` (producao)
6. **URIs de redirecionamento autorizados:**
   - `http://localhost:3000/api/auth/callback/google` (NextAuth callback)
   - `http://localhost:3001/auth/google/callback` (Backend callback)
   - `https://seu-dominio.com/api/auth/callback/google` (producao)
7. Clique em **Criar**
8. Copie o **ID do cliente** e o **Secret do cliente** para seus arquivos `.env`

### 5. Observacoes importantes

- Em modo de **teste**, apenas usuarios adicionados na lista de teste podem usar o OAuth
- Para publicar o app, sera necessario verificacao pelo Google (pode levar semanas)
- O escopo `business.manage` requer verificacao adicional

---

## Configuracao da API OpenAI

### 1. Criar conta

1. Acesse [platform.openai.com](https://platform.openai.com/)
2. Crie uma conta ou faca login
3. Adicione um metodo de pagamento (a API e paga por uso)

### 2. Gerar chave de API

1. Va em **API Keys** no menu lateral
2. Clique em **Create new secret key**
3. De um nome para a chave (ex: `google-reviews-ai`)
4. Copie a chave gerada (ela nao sera exibida novamente)
5. Cole no arquivo `.env` na variavel `OPENAI_API_KEY`

### 3. Modelo recomendado

| Modelo | Qualidade | Custo | Uso recomendado |
|--------|-----------|-------|-----------------|
| `gpt-4` | Excelente | Alto | Producao com respostas de alta qualidade |
| `gpt-4-turbo` | Excelente | Medio | Melhor custo-beneficio para producao |
| `gpt-3.5-turbo` | Boa | Baixo | Desenvolvimento e testes |

Configure o modelo na variavel `OPENAI_MODEL` no arquivo `.env`.

---

## Modos de Automacao

O sistema oferece tres modos de automacao para responder avaliacoes, configuraveis por empresa:

### Manual

| Caracteristica | Descricao |
|---------------|-----------|
| Comportamento | Gera a resposta com IA, mas **aguarda aprovacao** do usuario |
| Uso ideal | Empresas que querem revisar todas as respostas antes da publicacao |
| Fluxo | Avaliacao recebida > IA gera resposta > Usuario revisa > Aprova ou edita > Publica |

### Semiautomatico

| Caracteristica | Descricao |
|---------------|-----------|
| Comportamento | **Aprova automaticamente** respostas para avaliacoes positivas (4-5 estrelas). Avaliacoes negativas (1-3 estrelas) aguardam revisao manual |
| Uso ideal | Empresas com alto volume que querem agilidade sem perder controle sobre feedbacks negativos |
| Fluxo positivo | Avaliacao 4-5 estrelas > IA gera resposta > Publicacao automatica |
| Fluxo negativo | Avaliacao 1-3 estrelas > IA gera resposta > Usuario revisa > Aprova ou edita > Publica |

### Automatico

| Caracteristica | Descricao |
|---------------|-----------|
| Comportamento | **Responde automaticamente** a todas as avaliacoes conforme regras configuradas |
| Uso ideal | Empresas com altissimo volume que confiam nas configuracoes de tom e personalizacao |
| Fluxo | Avaliacao recebida > IA gera resposta > Publicacao automatica |

> **Importante:** Mesmo no modo automatico, respostas ficam registradas no historico e podem ser editadas/removidas posteriormente.

---

## Documentacao da API

### Autenticacao

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/auth/google` | Inicia fluxo OAuth com Google |
| `GET` | `/auth/google/callback` | Callback do OAuth Google |
| `GET` | `/auth/me` | Retorna dados do usuario autenticado |

### Usuarios

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/users/profile` | Perfil do usuario logado |
| `PATCH` | `/users/profile` | Atualizar perfil |

### Empresas (Businesses)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/businesses` | Listar empresas do usuario |
| `POST` | `/businesses` | Cadastrar nova empresa |
| `GET` | `/businesses/:id` | Detalhes de uma empresa |
| `PATCH` | `/businesses/:id` | Atualizar empresa |
| `DELETE` | `/businesses/:id` | Remover empresa |

### Avaliacoes (Reviews)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/reviews` | Listar avaliacoes (com filtros) |
| `GET` | `/reviews/:id` | Detalhes de uma avaliacao |
| `POST` | `/reviews/sync/:businessId` | Sincronizar avaliacoes do Google |

### Respostas (Responses)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/responses` | Listar respostas geradas |
| `POST` | `/responses/generate/:reviewId` | Gerar resposta com IA |
| `PATCH` | `/responses/:id/approve` | Aprovar resposta |
| `PATCH` | `/responses/:id/reject` | Rejeitar resposta |
| `POST` | `/responses/:id/publish` | Publicar resposta no Google |

### Google Business Profile

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/google/accounts` | Listar contas Google Business |
| `GET` | `/google/locations/:accountId` | Listar locais de uma conta |
| `POST` | `/google/connect/:businessId` | Conectar perfil Google a empresa |

> **Nota:** Todas as rotas (exceto `/auth/google` e `/auth/google/callback`) requerem autenticacao via token JWT no header `Authorization: Bearer <token>`.

---

## Esquema do Banco de Dados

### Modelos principais

```
User (usuarios)
├── id, name, email, plan, googleId
├── businesses[]     -> Business
├── googleTokens[]   -> GoogleToken
└── auditLogs[]      -> AuditLog

Business (empresas)
├── id, name, segment, city, googleProfileId
├── automationMode (MANUAL | SEMI_AUTO | AUTO)
├── toneOfVoice, keywords[], mainServices[]
├── whatsapp, defaultResolutionMessage, avoidTerms[]
└── reviews[]        -> Review

Review (avaliacoes)
├── id, googleReviewId, reviewerName, rating, comment
├── responseStatus (PENDING | GENERATED | APPROVED | PUBLISHED | REJECTED)
└── responses[]      -> Response

Response (respostas)
├── id, generatedText, publishedText
├── status (DRAFT | APPROVED | PUBLISHED | REJECTED)
└── publishedAt

GoogleToken (tokens OAuth)
├── id, accessToken, refreshToken, expiresAt
└── userId           -> User

AuditLog (logs de auditoria)
├── id, action, details, createdAt
└── userId           -> User
```

### Enums

| Enum | Valores |
|------|---------|
| `Plan` | FREE, PRO, ENTERPRISE |
| `AutomationMode` | MANUAL, SEMI_AUTO, AUTO |
| `ReviewResponseStatus` | PENDING, GENERATED, APPROVED, PUBLISHED, REJECTED |
| `ResponseStatus` | DRAFT, APPROVED, PUBLISHED, REJECTED |

---

## Deploy em Producao

### Build com Docker

Para producao, crie Dockerfiles otimizados para cada servico:

```bash
# Build do backend
cd backend
docker build -t google-reviews-backend .

# Build do frontend
cd frontend
docker build -t google-reviews-frontend .
```

### Docker Compose para producao

```yaml
version: '3.8'

services:
  backend:
    image: google-reviews-backend
    ports:
      - '3001:3001'
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/google_reviews
      - REDIS_HOST=redis
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  frontend:
    image: google-reviews-frontend
    ports:
      - '3000:3000'
    environment:
      - NEXT_PUBLIC_API_URL=https://api.seudominio.com
      - NEXTAUTH_URL=https://seudominio.com
      - NODE_ENV=production
    depends_on:
      - backend

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: production_user
      POSTGRES_PASSWORD: senha_segura_aqui
      POSTGRES_DB: google_reviews
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Variaveis de ambiente para producao

Ajustes importantes para ambiente de producao:

| Variavel | Valor de producao |
|----------|-------------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | String de conexao com banco de producao |
| `JWT_SECRET` | Chave segura (32+ caracteres aleatorios) |
| `NEXTAUTH_SECRET` | Chave segura (32+ caracteres aleatorios) |
| `NEXTAUTH_URL` | URL publica do frontend (`https://seudominio.com`) |
| `FRONTEND_URL` | URL publica do frontend |
| `BACKEND_URL` | URL publica do backend |
| `GOOGLE_CALLBACK_URL` | URL de callback com dominio de producao |

### Hosting recomendado

| Opcao | Descricao | Custo |
|-------|-----------|-------|
| **VPS (DigitalOcean, Hetzner)** | Controle total, bom para projetos de medio porte | A partir de $5/mes |
| **Google Cloud Run** | Serverless, escala automatica, paga por uso | Variavel |
| **Railway** | Deploy simplificado, integrado com GitHub | A partir de $5/mes |
| **Render** | Similar ao Railway, com tier gratuito | A partir de $0/mes |
| **AWS ECS/Fargate** | Enterprise, alta disponibilidade | Variavel |

### Checklist de producao

- [ ] Configurar HTTPS (SSL/TLS) em todos os servicos
- [ ] Usar senhas fortes e unicas para banco de dados
- [ ] Configurar backups automaticos do PostgreSQL
- [ ] Habilitar rate limiting na API
- [ ] Configurar monitoramento (ex: Sentry, DataDog)
- [ ] Revisar permissoes do OAuth (publicar app no Google)
- [ ] Configurar dominio customizado
- [ ] Habilitar CORS apenas para dominios autorizados

---

## Contribuindo

Contribuicoes sao bem-vindas! Para contribuir:

1. Faca um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faca commit das alteracoes (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Envie para o repositorio remoto (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padroes de commit

Utilizamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nova funcionalidade
- `fix:` - Correcao de bug
- `docs:` - Alteracao em documentacao
- `refactor:` - Refatoracao de codigo
- `test:` - Adicao ou correcao de testes
- `chore:` - Tarefas de manutencao

### Diretrizes

- Escreva codigo em TypeScript com tipagem forte
- Siga os padroes do NestJS (modules, controllers, services)
- Mantenha testes atualizados
- Documente endpoints novos
- Use nomes de variaveis e funcoes em ingles

---

## Licenca

Este projeto esta licenciado sob a licenca MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Desenvolvido com dedicacao para simplificar o gerenciamento de avaliacoes online.
