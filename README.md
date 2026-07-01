# SAMM Maturity Platform Frontend

Repositório dedicado da SPA React do sistema.

Este repositório é a origem oficial de:

- interface React
- navegação e páginas do sistema
- componentes reutilizáveis
- integração HTTP com o backend
- proxy reverso `/api` via nginx

Arquivos de governança local:

- [AGENTS.md](/home/drolen/GitHub/77Negativo/samm-maturity-platform-frontend/AGENTS.md)
- [POLICY.md](/home/drolen/GitHub/77Negativo/samm-maturity-platform-frontend/POLICY.md)

Documentação detalhada:

- [documentacao/README.md](/home/drolen/GitHub/77Negativo/samm-maturity-platform-frontend/documentacao/README.md)

## Responsabilidades

- build do frontend com Vite
- entrega dos assets estáticos
- proxy reverso de `/api` para o backend

## Relação com o backend

O sistema agora opera em dois repositórios:

- frontend: `samm-maturity-platform-frontend`
- backend: `samm-maturity-platform-backend`

Regras de integração:

- este repositório não é dono da regra de negócio
- dados de domínio e score oficial vêm do backend
- chamadas HTTP devem passar por `src/api.js`
- mudanças de contrato HTTP exigem sincronização com o backend

## Estrutura funcional

- `src/main.jsx`: bootstrap da SPA
- `src/api.js`: cliente HTTP centralizado
- `src/context/`: estado compartilhado da aplicação
- `src/pages/`: páginas de negócio
- `src/components/`: componentes reutilizáveis
- `nginx/default.conf.template`: proxy `/api`
- `nginx/nginx.conf`: runtime do nginx
- `nginx/docker-entrypoint.sh`: geração da configuração final em runtime

## Estrutura

```text
src/
nginx/
Dockerfile
docker-compose.yml
.env.example
AGENTS.md
POLICY.md
```

## Subida local

1. Ajuste `UPSTREAM_API_URL` se o backend não estiver em `http://host.docker.internal:3000`.
2. Suba o container:

```bash
docker compose up -d --build
```

## Endereço padrão

- frontend: `http://localhost:8080`

## Fluxo de desenvolvimento

Fluxo recomendado:

1. subir primeiro o backend no repositório backend
2. editar frontend neste repositório
3. rebuildar quando houver impacto no runtime:

```bash
docker compose up -d --build
```

4. validar o carregamento:

```bash
curl http://localhost:8080/
```

5. validar o proxy:

```bash
curl -X POST http://localhost:8080/api/auth/login -H 'Content-Type: application/json' -d '{}'
```

## Ambiente

Variável principal:

- `UPSTREAM_API_URL`

Valor padrão:

- `http://host.docker.internal:3000`

Esse valor permite que o container do frontend alcance o backend separado em desenvolvimento local.

## Convenções importantes

- não usar `fetch` direto nos componentes
- não calcular score final no frontend
- não tratar `localStorage` como fonte de verdade de dados de negócio
- preservar o fluxo `/api` para manter cookies e CSRF funcionando

## Observações

Este repositório pressupõe que o backend já esteja ativo e acessível pela URL definida em `UPSTREAM_API_URL`.
O runtime do nginx já foi ajustado para funcionar com filesystem `read_only`.
