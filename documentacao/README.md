# Documentação do Frontend OWASP SAMM

Esta documentação descreve o funcionamento real do frontend com base no código atual deste repositório.

O objetivo é explicar:

- a arquitetura do frontend
- os fluxos de navegação e integração
- as rotas e áreas funcionais
- o runtime e operação local
- a organização da aplicação frontend

## Índice

1. [Visão Geral e Arquitetura](./01-visao-geral-e-arquitetura.md)
2. [Fluxos e Integração com a API](./02-fluxos-e-integracao-com-a-api.md)
3. [Rotas e Interface](./03-rotas-e-interface.md)
4. [Runtime e Operação](./04-runtime-e-operacao.md)
5. [Frontend da Aplicação](./05-frontend-aplicacao.md)
6. [Estado Global, Sessão e Contexto](./06-estado-global-sessao-e-contexto.md)
7. [Dashboards, Relatórios e Visualização](./07-dashboards-relatorios-e-visualizacao.md)
8. [FAQ Operacional](./08-faq-operacional.md)
9. [Guia Oficial de Instalação do Sistema](./09-instalacao-completa-do-sistema.md)

## Resumo executivo

Este repositório é a camada de interface do sistema.

Ele é responsável por:

- autenticação visual e fluxo de sessão no cliente
- navegação entre telas
- dashboards e relatórios
- formulários administrativos
- integração HTTP com o backend
- proxy `/api` via nginx

O princípio central aplicado aqui é:

> O frontend organiza a experiência do usuário, mas a verdade oficial continua no backend.

## Como ler esta documentação

Se você quer entender rapidamente:

- arquitetura geral: comece por [Visão Geral e Arquitetura](./01-visao-geral-e-arquitetura.md)
- consumo da API: leia [Fluxos e Integração com a API](./02-fluxos-e-integracao-com-a-api.md)
- telas e rotas: use [Rotas e Interface](./03-rotas-e-interface.md)
- operação local: veja [Runtime e Operação](./04-runtime-e-operacao.md)
- organização do código: leia [Frontend da Aplicação](./05-frontend-aplicacao.md)
- sessão e contexto: leia [Estado Global, Sessão e Contexto](./06-estado-global-sessao-e-contexto.md)
- dashboards e relatórios: leia [Dashboards, Relatórios e Visualização](./07-dashboards-relatorios-e-visualizacao.md)

## Escopo desta documentação

Esta documentação descreve o comportamento atual do frontend, inclusive decisões importantes:

- este repositório é o dono exclusivo da SPA e do proxy `/api`
- a verdade de negócio continua no backend e no PostgreSQL
- chamadas HTTP devem passar por `src/api.js`
- o frontend não calcula score final oficial
- o runtime nginx foi ajustado para funcionar em container `read_only`
- o frontend depende do backend ativo para autenticação e operação real
- o proxy `/api` é parte do comportamento funcional, não só da infraestrutura

## Diagramas incluídos

Esta documentação inclui diagramas em `Mermaid` para facilitar leitura visual:

- arquitetura geral do frontend
- fluxo de login e integração
- relação entre UI, API e proxy

## Convenções usadas

- `API_BASE`: base usada para chamadas HTTP
- `proxy /api`: ponte entre SPA e backend
- `AppContext`: estado compartilhado da aplicação
- `source of truth`: dado oficial vindo do backend
