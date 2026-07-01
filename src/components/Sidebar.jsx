import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { apiRequest } from '../api.js';
import ChangePasswordModal from './ChangePasswordModal.jsx';

const SIDEBAR_STORAGE_KEY = 'owasp-samm.sidebar-visible';

const Sidebar = () => {
  const { state, dispatch } = useApp();
  const location = useLocation();
  const role = state.user?.role;
  const canViewReports = role && role !== 'member';
  const canAccessCampaigns = Boolean(role);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [isCompact, setIsCompact] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 1100 : false
  ));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [operationOpen, setOperationOpen] = useState(false);

  useEffect(() => {
    if (state.user?.must_change_password) {
      setPasswordOpen(true);
    }
  }, [state.user?.must_change_password]);

  useEffect(() => {
    if (!location.pathname.startsWith('/settings/')) return;
    setSettingsOpen(true);
    if (location.pathname.startsWith('/settings/login/') || location.pathname.startsWith('/settings/sessoes/')) setSecurityOpen(true);
    if (location.pathname.startsWith('/settings/logs/')) setAuditOpen(true);
    if (location.pathname.startsWith('/settings/operacao/')) setOperationOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => setIsCompact(window.innerWidth <= 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarVisible));
    document.body.classList.toggle('sidebar-hidden', !sidebarVisible);
    document.body.classList.toggle('sidebar-visible', sidebarVisible);
    document.body.classList.toggle('sidebar-compact', isCompact);
    return () => {
      document.body.classList.remove('sidebar-hidden', 'sidebar-visible', 'sidebar-compact');
    };
  }, [sidebarVisible, isCompact]);

  const onLogout = async () => {
    try {
      if (state.token) {
        await apiRequest('/auth/logout', { method: 'POST', token: state.token });
      }
    } catch {
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const linkClass = ({ isActive }) => (isActive ? 'active' : undefined);
  const onNavigate = () => {
    if (isCompact) setSidebarVisible(false);
  };

  return (
    <>
      {!sidebarVisible && (
        <button
          type="button"
          className="sidebar-fab"
          onClick={() => setSidebarVisible(true)}
          aria-label="Mostrar menu lateral"
          title="Mostrar menu lateral"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16v2H4V7Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z" />
          </svg>
        </button>
      )}
      {isCompact && sidebarVisible && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setSidebarVisible(false)}
          aria-label="Fechar menu lateral"
        />
      )}
      <aside className={`sidebar ${sidebarVisible ? 'is-visible' : 'is-hidden'} ${isCompact ? 'is-compact' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">SAMM Maturity Platform</div>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={() => setSidebarVisible(false)}
            aria-label="Ocultar menu lateral"
            title="Ocultar menu lateral"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59Z" />
            </svg>
          </button>
        </div>
        <nav className="sidebar-nav">
        <NavLink to="/" className={linkClass} end onClick={onNavigate}>Dashboard</NavLink>
        {role === 'admin' && (
          <NavLink to="/executive-dashboard" className={linkClass} onClick={onNavigate}>Dashboard Executiva</NavLink>
        )}
        {canViewReports && (
          <NavLink to="/reports" className={linkClass} onClick={onNavigate}>Relatórios</NavLink>
        )}
        {canAccessCampaigns && (
          <NavLink to="/campaigns" className={linkClass} onClick={onNavigate}>Campanhas</NavLink>
        )}
        {role === 'admin' && (
          <>
            <NavLink to="/admin/questions" className={linkClass} onClick={onNavigate}>Perguntas</NavLink>
            <NavLink to="/admin/users" className={linkClass} onClick={onNavigate}>Usuários</NavLink>
            <NavLink to="/admin/teams" className={linkClass} onClick={onNavigate}>Times</NavLink>
            <NavLink to="/admin/domains" className={linkClass} onClick={onNavigate}>Domínios</NavLink>
            <button type="button" className={`sidebar-toggle ${settingsOpen ? 'open' : ''}`} onClick={() => setSettingsOpen((value) => !value)}>
              Configurações
            </button>

            {settingsOpen && (
              <div className="sidebar-submenu level-1">
                <button type="button" className={`sidebar-toggle ${securityOpen ? 'open' : ''}`} onClick={() => setSecurityOpen((value) => !value)}>
                  Segurança
                </button>
                {securityOpen && (
                  <div className="sidebar-submenu level-2">
                    <NavLink to="/settings/login/sessoes/configuracoes" className={linkClass} onClick={onNavigate}>Políticas de Login</NavLink>
                    <NavLink to="/settings/sessoes/ativas" className={linkClass} onClick={onNavigate}>Sessões Ativas</NavLink>
                    <NavLink to="/settings/login/sessoes/bloqueados" className={linkClass} onClick={onNavigate}>Usuários Bloqueados</NavLink>
                  </div>
                )}

                <button type="button" className={`sidebar-toggle ${auditOpen ? 'open' : ''}`} onClick={() => setAuditOpen((value) => !value)}>
                  Auditoria
                </button>
                {auditOpen && (
                  <div className="sidebar-submenu level-2">
                    <NavLink to="/settings/logs/auditoria/usuarios" className={linkClass} onClick={onNavigate}>Eventos de Usuários</NavLink>
                    <NavLink to="/settings/logs/auditoria/acessos" className={linkClass} onClick={onNavigate}>Logs de Acesso</NavLink>
                    <NavLink to="/settings/logs/sistema" className={linkClass} onClick={onNavigate}>Sistema</NavLink>
                  </div>
                )}

                <button type="button" className={`sidebar-toggle ${operationOpen ? 'open' : ''}`} onClick={() => setOperationOpen((value) => !value)}>
                  Operação
                </button>
                {operationOpen && (
                  <div className="sidebar-submenu level-2">
                    <NavLink to="/settings/operacao/runtime" className={linkClass} onClick={onNavigate}>Runtime</NavLink>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        </nav>
        <div className="sidebar-footer">
          <span className="mono">{role}</span>
          <span>{state.user?.email}</span>
          <button className="logout" onClick={onLogout}>Sair</button>
        </div>
        <ChangePasswordModal
          open={passwordOpen}
          force={!!state.user?.must_change_password}
          onClose={() => {
            if (state.user?.must_change_password) return;
            setPasswordOpen(false);
          }}
        />
      </aside>
    </>
  );
};

export default Sidebar;
