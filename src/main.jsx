import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminQuestions from './pages/AdminQuestions.jsx';
import Questionnaire from './pages/Questionnaire.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminDomains from './pages/AdminDomains.jsx';
import Campaigns from './pages/Campaigns.jsx';
import CampaignDetail from './pages/CampaignDetail.jsx';
import AdminAssignments from './pages/AdminAssignments.jsx';
import AdminTeams from './pages/AdminTeams.jsx';
import Reports from './pages/Reports.jsx';
import ExecutiveDashboard from './pages/ExecutiveDashboard.jsx';
import SettingsLogin from './pages/SettingsLogin.jsx';
import SettingsAuditUsers from './pages/SettingsAuditUsers.jsx';
import SettingsLoginBlocked from './pages/SettingsLoginBlocked.jsx';
import SettingsAuditAccessLogs from './pages/SettingsAuditAccessLogs.jsx';
import SettingsAuditSystem from './pages/SettingsAuditSystem.jsx';
import SettingsSessions from './pages/SettingsSessions.jsx';
import SettingsOperations from './pages/SettingsOperations.jsx';
import './styles.css';

const RequireAuth = ({ children }) => {
  const { state } = useApp();
  if (state.auth_loading) return <div className="panel">Carregando sessão...</div>;
  if (!state.token) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginRedirect />} />
    <Route
      path="/"
      element={
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/questions"
      element={
        <RequireAuth>
          <AdminQuestions />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/users"
      element={
        <RequireAuth>
          <AdminUsers />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/domains"
      element={
        <RequireAuth>
          <AdminDomains />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/assignments"
      element={
        <RequireAuth>
          <AdminAssignments />
        </RequireAuth>
      }
    />
    <Route
      path="/admin/teams"
      element={
        <RequireAuth>
          <AdminTeams />
        </RequireAuth>
      }
    />
    <Route
      path="/questionnaire"
      element={
        <RequireAuth>
          <Questionnaire />
        </RequireAuth>
      }
    />
    <Route
      path="/campaigns"
      element={
        <RequireAuth>
          <Campaigns />
        </RequireAuth>
      }
    />
    <Route
      path="/campaigns/:id"
      element={
        <RequireAuth>
          <CampaignDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/reports"
      element={
        <RequireAuth>
          <Reports />
        </RequireAuth>
      }
    />
    <Route
      path="/executive-dashboard"
      element={
        <RequireAuth>
          <ExecutiveDashboard />
        </RequireAuth>
      }
    />
    <Route
      path="/settings/login/sessoes/configuracoes"
      element={
        <RequireAuth>
          <SettingsLogin />
        </RequireAuth>
      }
    />
    <Route
      path="/settings/login/sessoes/bloqueados"
      element={
        <RequireAuth>
          <SettingsLoginBlocked />
        </RequireAuth>
      }
    />
    <Route
      path="/settings/logs/auditoria/usuarios"
      element={
        <RequireAuth>
          <SettingsAuditUsers />
        </RequireAuth>
      }
    />
    <Route
      path="/settings/logs/auditoria/acessos"
      element={
        <RequireAuth>
          <SettingsAuditAccessLogs />
        </RequireAuth>
      }
    />
    <Route
      path="/settings/logs/auditoria/sistema"
      element={
        <RequireAuth>
          <SettingsAuditSystem />
        </RequireAuth>
      }
    />
    <Route
      path="/settings/logs/sistema"
      element={
        <RequireAuth>
          <SettingsAuditSystem />
        </RequireAuth>
      }
    />
    <Route
      path="/settings/sessoes/ativas"
      element={
        <RequireAuth>
          <SettingsSessions />
        </RequireAuth>
      }
    />
    <Route
      path="/settings/operacao/runtime"
      element={
        <RequireAuth>
          <SettingsOperations />
        </RequireAuth>
      }
    />
    <Route path="/settings/login" element={<Navigate to="/settings/login/sessoes/configuracoes" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const LoginRedirect = () => {
  const { state } = useApp();
  if (state.auth_loading) return <div className="panel">Carregando sessão...</div>;
  if (state.token) return <Navigate to="/" replace />;
  return <Login />;
};

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>
);
