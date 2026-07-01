import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';

const SettingsAuditSystem = () => {
  const { state } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiRequest('/auth/audit/system', { token: state.token });
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [state.token]);

  if (state.user?.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard dashboard-roomy governance-dashboard">
        <header className="dash-header dashboard-hero">
          <div>
            <span className="eyebrow">Configurações / Logs / Auditoria</span>
            <h1>Sistema</h1>
            <p>Indicadores operacionais das últimas 24h para auditoria da plataforma.</p>
          </div>
        </header>

        {error && <div className="error">{error}</div>}
        {loading && <div className="panel">Carregando indicadores...</div>}

        {!loading && data && (
          <>
            <section className="metrics-grid">
              <article className="metric-card">
                <span>Requisições (24h)</span>
                <strong>{data.overview?.total_requests ?? 0}</strong>
              </article>
              <article className="metric-card">
                <span>Erros HTTP (24h)</span>
                <strong>{data.overview?.error_requests ?? 0}</strong>
              </article>
              <article className="metric-card">
                <span>Erros 5xx (24h)</span>
                <strong>{data.overview?.server_errors ?? 0}</strong>
              </article>
              <article className="metric-card">
                <span>Usuários distintos (24h)</span>
                <strong>{data.overview?.distinct_users_24h ?? 0}</strong>
              </article>
            </section>

            <section className="panel">
              <h2>Top rotas (24h)</h2>
              <div className="table">
                <div className="table-row table-head" style={{ gridTemplateColumns: '2fr 1fr' }}>
                  <span>Rota</span>
                  <span>Total</span>
                </div>
                {(data.top_paths || []).map((item) => (
                  <div key={`${item.path}-${item.total}`} className="table-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    <span>{item.path}</span>
                    <span>{item.total}</span>
                  </div>
                ))}
                {!(data.top_paths || []).length && (
                  <div className="table-row" style={{ gridTemplateColumns: '1fr' }}>
                    <span>Sem dados de rotas.</span>
                  </div>
                )}
              </div>
            </section>

            <section className="panel">
              <h2>Eventos de autenticação (24h)</h2>
              <div className="table">
                <div className="table-row table-head" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <span>Evento</span>
                  <span>Total</span>
                </div>
                {(data.auth_events || []).map((item) => (
                  <div key={`${item.outcome}-${item.total}`} className="table-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <span>{item.outcome}</span>
                    <span>{item.total}</span>
                  </div>
                ))}
                {!(data.auth_events || []).length && (
                  <div className="table-row" style={{ gridTemplateColumns: '1fr' }}>
                    <span>Sem dados de autenticação.</span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsAuditSystem;
