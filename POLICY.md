## Agente de Desenvolvimento: Owasp SAMM Frontend

Plataforma de acompanhamento de maturidade de seguranca baseada no padrao OWASP SAMM.

Este repositorio e o dono oficial do frontend do sistema.

---

## Leis Fundamentais — Inviolaveis

*Regra obrigatoria:*
- Toda e qualquer informacao relevante do sistema continua pertencendo ao PostgreSQL no backend.
- Nenhum dado de negocio pode ter como fonte de verdade `localStorage`, `sessionStorage` ou arquivos temporarios.
- O frontend apenas consome e apresenta dados do backend.
- Sempre operar integrado ao backend configurado no ambiente.

### 1. PostgreSQL First

Mesmo no frontend, a regra continua valida: todo estado relevante da aplicacao DEVE existir no PostgreSQL por meio do backend.

Inclui obrigatoriamente: scores, historico de mudancas, gaps, planos de acao, alertas, benchmarks, metas, templates, perfis de risco e evidencias.

Proibido:
- `localStorage` / `sessionStorage` / cookies para dados de negocio como fonte de verdade
- hardcode de dados mestres de dominio como solucao definitiva
- calculo final de score no cliente

Pergunta obrigatoria antes de implementar: "Este dado precisa sobreviver a um restart?" Se sim -> backend + PostgreSQL.

### 2. Substituicao Total — Sem Codigo Morto

Ao construir codigo melhor, remova completamente o anterior.

- Nunca manter componente antigo ao lado de componente novo sem necessidade real
- Nunca comentar codigo removido
- Nunca criar aliases ou compatibilidades desnecessarias
- Nunca deixar imports nao utilizados apos refatoracao
- Se um arquivo perde toda sua razao de existir, delete-o

### 3. Higiene de Codigo — Minimo Necessario

- Sem comentarios obvios
- Sem abstracoes prematuras para uso unico
- Sem duplicacao de chamadas HTTP
- Sem estado global fora do fluxo adotado no repositorio

### 4. Ownership do Frontend

Este repositorio e o dono exclusivo de:

- SPA React
- paginas, componentes e estilos
- integracao HTTP via `src/api.js`
- proxy reverso `nginx` para `/api`
- build do frontend e imagem do container

Mudancas de contrato HTTP devem ser refletidas no repositorio:

- `~/GitHub/77Negativo/samm-maturity-platform-backend`

### 5. Documentacao Oficial — Obrigatoria

Toda mudanca relevante de arquitetura, rotas, integracao com API, sessao, runtime, navegacao ou comportamento funcional DEVE manter a documentacao oficial deste repositorio atualizada.

Regras obrigatorias:

- a documentacao deve ser clara, consistente e escrita no formato oficial adotado em `documentacao/`
- a documentacao deve refletir o comportamento real do codigo atual, nao uma intencao antiga
- sempre que possivel, incluir exemplos reais de paginas, rotas, arquivos, chamadas HTTP, comandos e fluxos
- quando uma mudanca afetar frontend e backend, a documentacao dos dois repositórios deve ser revisada

---

## Problemas Conhecidos no Codigo

Todos devem ser corrigidos ao tocar nos arquivos afetados.
Ao modificar qualquer um desses arquivos, o problema deve ser corrigido junto — nao adiado.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite |
| Web Server | nginx |
| Container | Docker + Docker Compose |
| Integracao | HTTP com backend separado |

---

## Estrutura

```text
~/GitHub/77Negativo/samm-maturity-platform-frontend/
├── src/
│   ├── api.js
│   ├── context/
│   ├── pages/
│   ├── components/
│   └── utils/
├── nginx/
├── Dockerfile
├── docker-compose.yml
├── AGENTS.md
└── POLICY.md
```

Regras obrigatorias da nova estrutura:

- este repositorio nao recebe regras de negocio do backend como fonte de verdade
- chamadas HTTP devem passar pela camada central
- a comunicacao com o backend ocorre apenas por HTTP
- nenhuma importacao cruzada de codigo entre repositórios
- o proxy `/api` deve continuar funcional para cookies e CSRF

Repositorio relacionado:

- `~/GitHub/77Negativo/samm-maturity-platform-backend`

---

## Convencoes

### Frontend
- Chamadas HTTP sempre via `src/api.js` — nunca `fetch` direto em componente
- Estado de negocio somente no fluxo central adotado no repositorio
- Dados de dominio sempre do backend via API
- O frontend nao calcula score final oficial

### Runtime
- O `nginx` deste repositorio deve encaminhar `/api` para o backend configurado
- A configuracao deve continuar compativel com container `read_only`
- Mudancas em proxy, cookies ou CSRF exigem validacao integrada com o backend

### Integracao com Backend
- Qualquer mudanca de payload, rota, sessao ou auth deve ser sincronizada com o backend
- O frontend nunca deve contornar o backend para validar permissao

---

## Roles

| Role | Acesso |
|---|---|
| admin | Tudo que a interface permitir para administracao |
| facilitator | Conducao dos fluxos permitidos pela API |
| tech_lead | Operacao restrita ao seu escopo |
| member | Participacao no fluxo do seu time |

A interface deve refletir restricoes reais vindas do backend.

---

## Fluxo de Avaliacao (Correto)

```text
1. Frontend carrega questoes via GET /api/questions
2. Usuario responde no fluxo da interface
3. Frontend envia respostas ao backend
4. Backend persiste e calcula
5. Frontend exibe progresso e resultado
```

Scoring SEMPRE calculado no backend. Frontend so exibe.

---

## Seguranca

- Nao persistir dado de negocio como fonte de verdade no cliente
- Token e artefatos de sessao devem seguir o fluxo existente
- O frontend nao decide permissao final
- O frontend nao expoe segredos do backend
