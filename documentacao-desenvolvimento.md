# Desenvolvimento do Frontend

## Escopo

Use este repositório para:

- páginas
- componentes
- navegação
- integração HTTP
- proxy `/api`
- build da SPA

## Fluxo diário

```bash
cd samm-maturity-platform-frontend
docker compose up -d --build
docker compose logs -f
```

## Dependência do backend

O backend deve estar ativo antes do frontend.

Repositório relacionado:

- `samm-maturity-platform-backend`

## Regra principal

O frontend não é a fonte de verdade do sistema. Ele consome e apresenta dados vindos da API.
