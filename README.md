# SAMM Maturity Platform Frontend

Frontend React da plataforma de maturidade SAMM.

Este repositório contém a SPA, a camada de consumo HTTP e a configuração de runtime no nginx.

## O que este repositório faz

- entrega a interface do produto
- centraliza chamadas HTTP em `src/api.js`
- mantém o proxy `/api` para integração com o backend
- empacota a aplicação com Vite e Docker

## Repositórios relacionados

- frontend: `samm-maturity-platform-frontend`
- backend: `samm-maturity-platform-backend`

## Requisitos

- Node.js 20+ para desenvolvimento local
- Docker e Docker Compose para o runtime de contêiner

## Rodando localmente

Instale dependências:

```bash
npm install
```

Gere o build:

```bash
npm run build
```

Suba o ambiente com Docker:

```bash
docker compose up -d --build
```

Por padrão o frontend expõe:

- `http://localhost:8080`

## Configuração

Variável principal de ambiente:

- `UPSTREAM_API_URL`

Valor padrão:

- `http://host.docker.internal:3000`

Use essa variável para apontar o nginx para o backend correto durante o desenvolvimento.

## Como colaborar

1. Abra uma issue descrevendo a mudança.
2. Crie uma branch curta e objetiva.
3. Faça a alteração com foco único.
4. Rode `npm run build`.
5. Se a mudança afetar runtime, rode `docker compose up -d --build`.
6. Abra um pull request com o impacto e a motivação.

Consulte também:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)

## Segurança

Este repositório não deve conter segredos, tokens, chaves privadas ou arquivos `.env`.
O arquivo `.env.example` documenta apenas variáveis públicas de configuração.

## Licença

Licenciado sob [Apache 2.0](LICENSE).

