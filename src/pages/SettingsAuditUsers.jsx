import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiDownload, apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';

const SettingsAuditUsers = () => {
  const { state } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailFilter, setEmailFilter] = useState('');

  const load = async (email = '') => {
    setLoading(true);
    setError(null);
    try {
      const query = email ? `?limit=200&email=${encodeURIComponent(email)}` : '?limit=200';
      const data = await apiRequest(`/auth/audit/users${query}`, { token: state.token });
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
    await load(emailFilter.trim().toLowerCase());
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard dashboard-roomy governance-dashboard">
        <header className="dash-header dashboard-hero">
          <div>
            <span className="eyebrow">Configurações / Logs</span>
            <h1>Auditoria de Usuários</h1>
            <p>Histórico de acessos, falhas, bloqueios, refresh e logout dos usuários.</p>
          </div>
        </header>

        <section className="panel">
          <form className="inline-form" onSubmit={onSearch}>
            <label>
              Filtrar por email
              <input
                type="text"
                placeholder="usuario@empresa.com"
                value={emailFilter}
                onChange={(event) => setEmailFilter(event.target.value)}
              />
            </label>
            <button type="submit">Filtrar</button>
            <button
              type="button"
              className="secondary"
              onClick={() => apiDownload(`/auth/audit/users/export?format=csv${emailFilter.trim() ? `&email=${encodeURIComponent(emailFilter.trim().toLowerCase())}` : ''}`, {
                token: state.token,
                filename: 'auditoria-usuarios.csv'
              })}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => apiDownload(`/auth/audit/users/export?format=pdf${emailFilter.trim() ? `&email=${encodeURIComponent(emailFilter.trim().toLowerCase())}` : ''}`, {
                token: state.token,
                filename: 'auditoria-usuarios.pdf'
              })}
            >
              Exportar PDF
            </button>
          </form>

          {error && <div className="error">{error}</div>}
          {loading && <div>Carregando auditoria...</div>}

          {!loading && (
            <div className="table">
              <div className="table-row table-head" style={{ gridTemplateColumns: '2fr 1.3fr 1.2fr 1fr 2fr 2fr' }}>
                <span>Data/Hora</span>
                <span>Usuário</span>
                <span>Email</span>
                <span>Evento</span>
                <span>Motivo</span>
                <span>IP</span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="table-row" style={{ gridTemplateColumns: '2fr 1.3fr 1.2fr 1fr 2fr 2fr' }}>
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <span>{item.user_name || '-'}</span>
                  <span>{item.email_norm || '-'}</span>
                  <span>{item.outcome}</span>
                  <span>{item.reason || '-'}</span>
                  <span>{item.ip || '-'}</span>
                </div>
              ))}
              {!items.length && (
                <div className="table-row" style={{ gridTemplateColumns: '1fr' }}>
                  <span>Nenhum evento encontrado.</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SettingsAuditUsers;
