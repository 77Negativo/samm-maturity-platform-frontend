# 1. Visão Geral e Arquitetura

## 1.1 Objetivo do frontend

O frontend é a camada de interação do sistema.

Ele permite:

- autenticar usuários
- navegar pelas áreas do produto
- conduzir o fluxo de assessment
- exibir dashboards e relatórios
- operar configurações e áreas administrativas

## 1.2 Princípio de desenho

O frontend foi construído para traduzir a API em experiência utilizável.

Isso significa:

- a interface organiza o fluxo
- a API continua sendo a autoridade
- estado visual não substitui persistência oficial
- cookies, refresh e CSRF dependem da integração correta com o backend

## 1.3 Papel na arquitetura geral

Na arquitetura atual, o frontend vive em repositório próprio e acessa o backend por HTTP.

```mermaid
flowchart LR
    U[Usuário] --> F[Frontend React + nginx]
    F -->|/api| B[Backend separado]
```

## 1.4 Macroarquitetura

O frontend combina três elementos:

1. SPA React
2. camada central de integração HTTP
3. nginx para servir assets e fazer proxy de `/api`

### Diagrama de fluxo da arquitetura

```mermaid
flowchart LR
    U[Usuário] --> R[React SPA]
    R --> A[src/api.js]
    A --> N[nginx /api proxy]
    N --> B[Backend]
```

## 1.5 Princípios estruturais

- o frontend não é a fonte de verdade do sistema
- o backend decide score, auth e permissões finais
- a integração com a API é centralizada
- o proxy `/api` deve preservar o fluxo de cookie e CSRF

## 1.6 Estrutura do repositório

```text
src/
nginx/
Dockerfile
docker-compose.yml
AGENTS.md
POLICY.md
```
