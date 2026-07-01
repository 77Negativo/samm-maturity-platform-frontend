import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';

const SettingsSessions = () => {
  const { state } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/auth/sessions?limit=300', { token: state.token });
      setItems(data || []);
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

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard dashboard-roomy governance-dashboard">
        <header className="dash-header dashboard-hero">
          <div>
            <span className="eyebrow">Configurações / Segurança</span>
            <h1>Sessões Ativas</h1>
            <p>Visualize sessões ativas e encerre acessos por usuário quando necessário.</p>
          </div>
        </header>

        <section className="panel">
          <div className="panel-header">
            <h2>Lista de sessões</h2>
            <button type="button" onClick={load}>Atualizar</button>
          </div>
          {error && <div className="error">{error}</div>}
          {loading && <div>Carregando sessões...</div>}
          {!loading && (
            <div className="table">
              <div className="table-row table-head" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr 1fr 0.8fr' }}>
                <span>Usuário</span>
                <span>IP</span>
                <span>Início</span>
                <span>Expira</span>
                <span>Expiração absoluta</span>
                <span>Status</span>
                <span>Ação</span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="table-row" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr 1fr 0.8fr' }}>
                  <span>{item.user_email || item.user_name || '-'}</span>
                  <span>{item.ip || '-'}</span>
                  <span>{item.issued_at ? new Date(item.issued_at).toLocaleString() : '-'}</span>
                  <span>{item.expires_at ? new Date(item.expires_at).toLocaleString() : '-'}</span>
                  <span>{item.absolute_expires_at ? new Date(item.absolute_expires_at).toLocaleString() : '-'}</span>
                  <span>{item.revoked_at ? 'Revogada' : 'Ativa'}</span>
                  <span>
                    <button
                      type="button"
                      className="secondary"
                      disabled={Boolean(item.revoked_at)}
                      onClick={async () => {
                        try {
                          await apiRequest(`/auth/sessions/revoke-user/${item.user_id}`, { method: 'POST', token: state.token });
                          await load();
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      Encerrar usuário
                    </button>
                  </span>
                </div>
              ))}
              {!items.length && (
                <div className="table-row" style={{ gridTemplateColumns: '1fr' }}>
                  <span>Nenhuma sessão encontrada.</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SettingsSessions;
