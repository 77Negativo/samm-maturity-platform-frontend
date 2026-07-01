# 3. Rotas e Interface

## 3.1 Áreas principais

- login
- dashboard
- campanhas
- questionnaire
- reports
- executive dashboard
- administração
- configurações

Rotas reais do código atual:

- `/login`
- `/`
- `/campaigns`
- `/campaigns/:id`
- `/questionnaire`
- `/reports`
- `/executive-dashboard`
- `/admin/questions`
- `/admin/users`
- `/admin/domains`
- `/admin/assignments`
- `/admin/teams`
- `/settings/login/sessoes/configuracoes`
- `/settings/login/sessoes/bloqueados`
- `/settings/logs/auditoria/usuarios`
- `/settings/logs/auditoria/acessos`
- `/settings/logs/auditoria/sistema`
- `/settings/sessoes/ativas`
- `/settings/operacao/runtime`

## 3.2 Leitura funcional

- `login`: entrada do usuário
- `dashboard`: visão inicial autenticada
- `campaigns`: lista de campanhas
- `questionnaire`: execução do fluxo de assessment
- `reports`: relatórios
- `admin`: cadastros e operação administrativa
- `settings`: segurança, auditoria e operação

## 3.3 Estrutura visual

As páginas ficam em `src/pages/`.

Os componentes reutilizáveis ficam em `src/components/`.

O estado compartilhado fica em `src/context/`.

Arquivos centrais:

- `src/main.jsx`
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
- `src/components/Sidebar.jsx`
- `src/context/AppContext.jsx`

## 3.4 Regras importantes

- não usar `fetch` direto em componentes
- não calcular score oficial no cliente
- a interface deve refletir as restrições reais da API
