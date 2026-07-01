# 9. Guia Oficial de Instalação do Sistema

Este guia oficial descreve a instalação completa do sistema na arquitetura atual em dois repositórios:

- `samm-maturity-platform-backend`
- `samm-maturity-platform-frontend`

O objetivo é sair de um ambiente vazio para um sistema funcional com:

- PostgreSQL configurado
- backend ativo em `http://localhost:3000`
- frontend ativo em `http://localhost:8080`

## 9.1 Pré-requisitos

Você precisa ter:

- Docker e Docker Compose
- acesso administrativo ao PostgreSQL
- `psql` instalado
- os dois repositórios presentes em `~/GitHub/77Negativo`

## 9.2 Preparar o PostgreSQL

Exemplo de variáveis:

```bash
export DB_HOST=192.168.8.88
export DB_PORT=5432
export DB_NAME=owasp_samm
export DB_USER=owaspsamm
export DB_PASSWORD='SENHA_FORTE_AQUI'
```

Conectar como administrador:

```bash
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d postgres
```

Criar usuário:

```sql
CREATE ROLE owaspsamm WITH
  LOGIN
  PASSWORD 'SENHA_FORTE_AQUI'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE;
```

Criar banco:

```sql
CREATE DATABASE owasp_samm
  WITH OWNER = owaspsamm
       ENCODING = 'UTF8'
       TEMPLATE = template0;
```

Conceder permissões:

```sql
GRANT ALL PRIVILEGES ON DATABASE owasp_samm TO owaspsamm;
\c owasp_samm
GRANT USAGE, CREATE ON SCHEMA public TO owaspsamm;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO owaspsamm;
```

## 9.3 Configurar e subir o backend

```bash
cd samm-maturity-platform-backend
cp .env.example .env
```

Edite `.env`:

```env
PORT=3000
DB_HOST=192.168.8.88
DB_PORT=5432
DB_NAME=owasp_samm
DB_USER=owaspsamm
DB_PASSWORD=SENHA_FORTE_AQUI
DB_SSL=false
JWT_SECRET=UM_SEGREDO_FORTE_AQUI
JWT_ISSUER=owasp-samm-platform
JWT_AUDIENCE=owasp-samm-app
SEED_ORG_NAME=OWASP SAMM
SEED_TEAM_NAME=Default Team
SEED_ADMIN_EMAIL=admin@owasp-samm.local
SEED_ADMIN_PASSWORD=UmaSenhaAdminForte
```

Subir:

```bash
docker compose up -d --build
```

Validar:

```bash
curl http://localhost:3000/health
```

## 9.4 Configurar e subir o frontend

```bash
cd samm-maturity-platform-frontend
cp .env.example .env
```

Conteúdo padrão:

```env
UPSTREAM_API_URL=http://host.docker.internal:3000
```

Subir:

```bash
docker compose up -d --build
```

## 9.5 Validar o ambiente completo

Validar frontend:

```bash
curl http://localhost:8080/
```

Validar integração frontend -> backend:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Uma resposta `400 {"error":"Invalid credentials"}` já prova que o proxy `/api` está funcional.

## 9.6 Sequência correta de subida

1. preparar PostgreSQL
2. configurar backend
3. subir backend
4. validar backend
5. configurar frontend
6. subir frontend
7. validar frontend e proxy

## 9.7 Acesso inicial

Use:

- email: `SEED_ADMIN_EMAIL`
- senha: `SEED_ADMIN_PASSWORD`

## 9.8 Observações

- o frontend depende do backend ativo
- o backend deve subir antes
- mudanças de runtime exigem rebuild
- o frontend usa `UPSTREAM_API_URL` para chegar no backend
- o backend aplica migrations automaticamente no bootstrap
