import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';

const SettingsLoginBlocked = () => {
  const { state } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest('/auth/blocked-users', { token: state.token });
        setItems(data);
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
            <span className="eyebrow">Configurações / Login / Sessões</span>
            <h1>Listagem de Bloqueados</h1>
            <p>Usuários bloqueados temporariamente, monitorados ou desativados por excesso de tentativas.</p>
          </div>
        </header>

        <section className="panel">
          {error && <div className="error">{error}</div>}
          {loading && <div>Carregando bloqueios...</div>}

          {!loading && (
            <div className="table">
              <div className="table-row table-head" style={{ gridTemplateColumns: '1.2fr 1.4fr 0.8fr 0.8fr 1fr 1fr 1fr' }}>
                <span>Usuário</span>
                <span>Email</span>
                <span>Estado</span>
                <span>Falhas</span>
                <span>Bloqueado até</span>
                <span>Última falha</span>
                <span>IP</span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="table-row" style={{ gridTemplateColumns: '1.2fr 1.4fr 0.8fr 0.8fr 1fr 1fr 1fr' }}>
                  <span>{item.name || '-'}</span>
                  <span>{item.email || '-'}</span>
                  <span>{item.state}</span>
                  <span>{item.failures}</span>
                  <span>{item.lock_until ? new Date(item.lock_until).toLocaleString() : '-'}</span>
                  <span>{item.last_failure_at ? new Date(item.last_failure_at).toLocaleString() : '-'}</span>
                  <span>{item.last_ip || '-'}</span>
                </div>
              ))}
              {!items.length && (
                <div className="table-row" style={{ gridTemplateColumns: '1fr' }}>
                  <span>Nenhum usuário bloqueado no momento.</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SettingsLoginBlocked;
