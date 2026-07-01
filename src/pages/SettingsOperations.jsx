import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';

const SettingsOperations = () => {
  const { state } = useApp();
  const [ops, setOps] = useState(null);
  const [health, setHealth] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [opsData, healthData, backupData] = await Promise.all([
        apiRequest('/auth/ops/settings', { token: state.token }),
        apiRequest('/auth/ops/health', { token: state.token }),
        apiRequest('/auth/ops/backups', { token: state.token })
      ]);
      setOps({
        maintenance_mode: Boolean(opsData.maintenance_mode),
        maintenance_title: opsData.maintenance_title || '',
        maintenance_message: opsData.maintenance_message || '',
        maintenance_start_at: opsData.maintenance_start_at ? String(opsData.maintenance_start_at).slice(0, 16) : '',
        maintenance_end_at: opsData.maintenance_end_at ? String(opsData.maintenance_end_at).slice(0, 16) : '',
        feature_flags: JSON.stringify(opsData.feature_flags || {}, null, 2),
        backup_retention_days: Number(opsData.backup_retention_days || 30),
        healthcheck_interval_seconds: Number(opsData.healthcheck_interval_seconds || 60)
      });
      setHealth(healthData);
      setBackups(backupData || []);
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

  const save = async () => {
    if (!ops) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const flags = ops.feature_flags.trim() ? JSON.parse(ops.feature_flags) : {};
      await apiRequest('/auth/ops/settings', {
        method: 'PUT',
        token: state.token,
        body: {
          maintenance_mode: Boolean(ops.maintenance_mode),
          maintenance_title: ops.maintenance_title,
          maintenance_message: ops.maintenance_message,
          maintenance_start_at: ops.maintenance_start_at ? new Date(ops.maintenance_start_at).toISOString() : null,
          maintenance_end_at: ops.maintenance_end_at ? new Date(ops.maintenance_end_at).toISOString() : null,
          feature_flags: flags,
          backup_retention_days: Number(ops.backup_retention_days),
          healthcheck_interval_seconds: Number(ops.healthcheck_interval_seconds)
        }
      });
      setMessage('Configurações operacionais atualizadas.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard dashboard-roomy governance-dashboard">
        <header className="dash-header dashboard-hero">
          <div>
            <span className="eyebrow">Configurações / Operação</span>
            <h1>Operação e Runtime</h1>
            <p>Gerencie manutenção, feature flags, health checks, backup/restore e retenção de logs.</p>
          </div>
        </header>

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}
        {loading && <div className="panel">Carregando operação...</div>}

        {!loading && ops && (
          <>
            <section className="panel">
              <h2>Runtime</h2>
              <div className="question-form">
                <label>
                  <input
                    type="checkbox"
                    checked={ops.maintenance_mode}
                    onChange={(event) => setOps((prev) => ({ ...prev, maintenance_mode: event.target.checked }))}
                  />
                  Manutenção ativa
                </label>
                <label>
                  Título de manutenção
                  <input
                    value={ops.maintenance_title}
                    onChange={(event) => setOps((prev) => ({ ...prev, maintenance_title: event.target.value }))}
                  />
                </label>
                <label>
                  Início
                  <input
                    type="datetime-local"
                    value={ops.maintenance_start_at}
                    onChange={(event) => setOps((prev) => ({ ...prev, maintenance_start_at: event.target.value }))}
                  />
                </label>
                <label>
                  Fim
                  <input
                    type="datetime-local"
                    value={ops.maintenance_end_at}
                    onChange={(event) => setOps((prev) => ({ ...prev, maintenance_end_at: event.target.value }))}
                  />
                </label>
                <label className="span-2">
                  Mensagem de manutenção
                  <textarea
                    rows={3}
                    value={ops.maintenance_message}
                    onChange={(event) => setOps((prev) => ({ ...prev, maintenance_message: event.target.value }))}
                  />
                </label>
                <label>
                  Retenção de backups (dias)
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={ops.backup_retention_days}
                    onChange={(event) => setOps((prev) => ({ ...prev, backup_retention_days: Number(event.target.value) }))}
                  />
                </label>
                <label>
                  Intervalo health check (segundos)
                  <input
                    type="number"
                    min="15"
                    max="3600"
                    value={ops.healthcheck_interval_seconds}
                    onChange={(event) => setOps((prev) => ({ ...prev, healthcheck_interval_seconds: Number(event.target.value) }))}
                  />
                </label>
                <label className="span-2">
                  Feature flags (JSON)
                  <textarea
                    rows={6}
                    value={ops.feature_flags}
                    onChange={(event) => setOps((prev) => ({ ...prev, feature_flags: event.target.value }))}
                  />
                </label>
                <div className="form-actions span-2">
                  <button type="button" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar operação'}</button>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Health Check</h2>
                <button type="button" onClick={load}>Atualizar</button>
              </div>
              <p>Status: <strong>{health?.ok ? 'OK' : 'Falha'}</strong></p>
              <p>Banco: {health?.checks?.database?.ok ? 'OK' : 'Falha'} ({health?.checks?.database?.latency_ms ?? '-'} ms)</p>
              <p>Janela de manutenção ativa: {health?.checks?.maintenance_window_active ? 'Sim' : 'Não'}</p>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Backup e Restore</h2>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await apiRequest('/auth/ops/backup', { method: 'POST', token: state.token });
                      await load();
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Gerar backup
                </button>
              </div>
              <div className="table">
                <div className="table-row table-head" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr' }}>
                  <span>ID</span>
                  <span>Tipo</span>
                  <span>Criado em</span>
                  <span>Ação</span>
                </div>
                {backups.map((backup) => (
                  <div key={backup.id} className="table-row" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr' }}>
                    <span className="mono">{backup.id}</span>
                    <span>{backup.kind}</span>
                    <span>{new Date(backup.created_at).toLocaleString()}</span>
                    <span>
                      <button
                        type="button"
                        className="secondary"
                        onClick={async () => {
                          try {
                            await apiRequest(`/auth/ops/restore/${backup.id}`, { method: 'POST', token: state.token });
                            await load();
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        Restaurar
                      </button>
                    </span>
                  </div>
                ))}
                {!backups.length && (
                  <div className="table-row" style={{ gridTemplateColumns: '1fr' }}>
                    <span>Nenhum backup encontrado.</span>
                  </div>
                )}
              </div>
              <div className="form-actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => {
                    try {
                      await apiRequest('/auth/audit/retention/run', { method: 'POST', token: state.token });
                      setMessage('Rotina de retenção/anomização executada.');
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Executar retenção e anonimização
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsOperations;
