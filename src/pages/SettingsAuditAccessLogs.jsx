import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiDownload, apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';

const SettingsAuditAccessLogs = () => {
  const { state } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailFilter, setEmailFilter] = useState('');
  const [pathFilter, setPathFilter] = useState('');

  const load = async ({ email = '', path = '' } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '300' });
      if (email) params.set('email', email);
      if (path) params.set('path', path);
      const data = await apiRequest(`/auth/audit/access-logs?${params.toString()}`, { token: state.token });
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [state.token]);

  if (state.user?.role !== 'admin') return <Navigate to="/" replace />;

  const onSearch = async (event) => {
    event.preventDefault();
    await load({
      email: emailFilter.trim().toLowerCase(),
      path: pathFilter.trim()
    });
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard dashboard-roomy governance-dashboard">
        <header className="dash-header dashboard-hero">
          <div>
            <span className="eyebrow">Configurações / Logs / Auditoria</span>
            <h1>Logs dos Acessos</h1>
            <p>Rastreamento das chamadas da API por usuário, rota, status HTTP e origem.</p>
          </div>
        </header>

        <section className="panel">
          <form className="inline-form" onSubmit={onSearch}>
            <label>
              Email
              <input type="text" value={emailFilter} onChange={(event) => setEmailFilter(event.target.value)} placeholder="usuario@empresa.com" />
            </label>
            <label>
              Rota
              <input type="text" value={pathFilter} onChange={(event) => setPathFilter(event.target.value)} placeholder="/api/..." />
            </label>
            <button type="submit">Filtrar</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                const params = new URLSearchParams({ format: 'csv' });
                if (emailFilter.trim()) params.set('email', emailFilter.trim().toLowerCase());
                if (pathFilter.trim()) params.set('path', pathFilter.trim());
                apiDownload(`/auth/audit/access-logs/export?${params.toString()}`, {
                  token: state.token,
                  filename: 'logs-acesso.csv'
                });
              }}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                const params = new URLSearchParams({ format: 'pdf' });
                if (emailFilter.trim()) params.set('email', emailFilter.trim().toLowerCase());
                if (pathFilter.trim()) params.set('path', pathFilter.trim());
                apiDownload(`/auth/audit/access-logs/export?${params.toString()}`, {
                  token: state.token,
                  filename: 'logs-acesso.pdf'
                });
              }}
            >
              Exportar PDF
            </button>
          </form>

          {error && <div className="error">{error}</div>}
          {loading && <div>Carregando logs...</div>}

          {!loading && (
            <div className="table">
              <div className="table-row table-head" style={{ gridTemplateColumns: '1.4fr 1fr 0.7fr 1.2fr 0.8fr 1fr 1fr' }}>
                <span>Data/Hora</span>
                <span>Usuário</span>
                <span>Método</span>
                <span>Rota</span>
                <span>Status</span>
                <span>IP</span>
                <span>Papel</span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="table-row" style={{ gridTemplateColumns: '1.4fr 1fr 0.7fr 1.2fr 0.8fr 1fr 1fr' }}>
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <span>{item.user_email || '-'}</span>
                  <span>{item.method}</span>
                  <span>{item.path}</span>
                  <span>{item.status}</span>
                  <span>{item.ip || '-'}</span>
                  <span>{item.role || '-'}</span>
                </div>
              ))}
              {!items.length && (
                <div className="table-row" style={{ gridTemplateColumns: '1fr' }}>
                  <span>Nenhum acesso encontrado.</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SettingsAuditAccessLogs;
