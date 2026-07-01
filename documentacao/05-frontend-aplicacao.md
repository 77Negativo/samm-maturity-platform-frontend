# 5. Frontend da Aplicação

## 5.1 Propósito

O frontend é a camada de interação do sistema `SAMM Maturity Platform`.

Ele existe para:

- autenticar usuários
- apresentar campanhas, dashboards e relatórios
- conduzir o workshop por prática
- permitir operações administrativas
- traduzir respostas da API em experiência utilizável

## 5.2 Stack e tecnologias

- `React`
- `React Router`
- `Vite`
- `fetch` centralizado via `src/api.js`
- `nginx`

## 5.3 Estrutura universal da aplicação

### 5.3.1 Camada de entrada

Arquivo central:

- `src/main.jsx`

Responsabilidades:

- bootstrap da aplicação React
- criação do roteamento
- proteção de rotas autenticadas

### 5.3.2 Camada de estado global

Arquivo central:

- `src/context/AppContext.jsx`

Essa camada concentra:

- token
- usuário
- política de login
- assessments em memória de trabalho

### 5.3.3 Camada de integração com API

Arquivo central:

- `src/api.js`

### 5.3.4 Camada de páginas

As páginas ficam em `src/pages/`.

Arquivos principais:

- `src/pages/Login.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Campaigns.jsx`
- `src/pages/CampaignDetail.jsx`
- `src/pages/Questionnaire.jsx`
- `src/pages/Reports.jsx`
- `src/pages/ExecutiveDashboard.jsx`
- `src/pages/AdminQuestions.jsx`
- `src/pages/AdminUsers.jsx`
- `src/pages/AdminDomains.jsx`
- `src/pages/AdminAssignments.jsx`
- `src/pages/AdminTeams.jsx`
- `src/pages/SettingsLogin.jsx`
- `src/pages/SettingsSessions.jsx`
- `src/pages/SettingsLoginBlocked.jsx`
- `src/pages/SettingsAuditUsers.jsx`
- `src/pages/SettingsAuditAccessLogs.jsx`
- `src/pages/SettingsAuditSystem.jsx`
- `src/pages/SettingsOperations.jsx`

### 5.3.5 Camada de componentes

Os componentes compartilhados ficam em `src/components/`.

Arquivos principais:

- `src/components/Sidebar.jsx`
- `src/components/ChangePasswordModal.jsx`
- `src/components/ConfirmModal.jsx`

Arquivos principais:

- `src/components/Sidebar.jsx`
- `src/components/ChangePasswordModal.jsx`
- `src/components/ConfirmModal.jsx`

## 5.4 Observações estruturais

- a UI é separada do backend em repositório próprio
- o frontend depende do proxy `/api` para o fluxo completo
- a autoridade final continua no backend

Exemplos concretos do código atual:

- `RequireAuth` em `src/main.jsx` protege as rotas autenticadas
- `LoginRedirect` em `src/main.jsx` evita mostrar `/login` para usuário já autenticado
- `AppProvider` em `src/context/AppContext.jsx` executa bootstrap com `POST /api/auth/refresh`
