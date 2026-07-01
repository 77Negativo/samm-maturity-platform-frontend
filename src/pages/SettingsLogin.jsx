import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';

const SettingsLogin = () => {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({
    idle_timeout_minutes: 10,
    refresh_interval_minutes: 5,
    lock_after_three_minutes: 10,
    lock_after_six_minutes: 30,
    deactivate_after_failures: 7,
    absolute_session_minutes: 480,
    max_active_sessions: 5,
    password_expiration_days: 90,
    password_history_count: 5,
    min_password_score_member: 2,
    min_password_score_tech_lead: 3,
    min_password_score_admin: 3,
    ip_whitelist: '',
    ip_blacklist: '',
    detect_geo_anomaly: true,
    alert_suspicious_activity: true,
    log_retention_days: 180,
    anonymize_after_days: 365,
    mask_sensitive_logs: true,
    notify_email: '',
    notify_slack_webhook: '',
    notify_on_lock: true,
    notify_on_unlock: true,
    notify_on_password_change: true,
    notify_on_repeated_failures: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest('/auth/settings', { token: state.token });
        setForm({
          idle_timeout_minutes: Number(data.idle_timeout_minutes || 10),
          refresh_interval_minutes: Number(data.refresh_interval_minutes || 5),
          lock_after_three_minutes: Number(data.lock_after_three_minutes || 10),
          lock_after_six_minutes: Number(data.lock_after_six_minutes || 30),
          deactivate_after_failures: Number(data.deactivate_after_failures || 7),
          absolute_session_minutes: Number(data.absolute_session_minutes || 480),
          max_active_sessions: Number(data.max_active_sessions || 5),
          password_expiration_days: Number(data.password_expiration_days || 90),
          password_history_count: Number(data.password_history_count || 5),
          min_password_score_member: Number(data.min_password_score_member || 2),
          min_password_score_tech_lead: Number(data.min_password_score_tech_lead || 3),
          min_password_score_admin: Number(data.min_password_score_admin || 3),
          ip_whitelist: Array.isArray(data.ip_whitelist) ? data.ip_whitelist.join('\n') : '',
          ip_blacklist: Array.isArray(data.ip_blacklist) ? data.ip_blacklist.join('\n') : '',
          detect_geo_anomaly: Boolean(data.detect_geo_anomaly ?? true),
          alert_suspicious_activity: Boolean(data.alert_suspicious_activity ?? true),
          log_retention_days: Number(data.log_retention_days || 180),
          anonymize_after_days: Number(data.anonymize_after_days || 365),
          mask_sensitive_logs: Boolean(data.mask_sensitive_logs ?? true),
          notify_email: data.notify_email || '',
          notify_slack_webhook: data.notify_slack_webhook || '',
          notify_on_lock: Boolean(data.notify_on_lock ?? true),
          notify_on_unlock: Boolean(data.notify_on_unlock ?? true),
          notify_on_password_change: Boolean(data.notify_on_password_change ?? true),
          notify_on_repeated_failures: Boolean(data.notify_on_repeated_failures ?? true)
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [state.token]);

  if (state.user?.role !== 'admin') return <Navigate to="/" replace />;

  const onChange = (field, parser = Number) => (event) => {
    setForm((prev) => ({ ...prev, [field]: parser(event.target.value) }));
    setMessage(null);
  };

  const onToggle = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: Boolean(event.target.checked) }));
    setMessage(null);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        idle_timeout_minutes: Number(form.idle_timeout_minutes),
        refresh_interval_minutes: Number(form.refresh_interval_minutes),
        lock_after_three_minutes: Number(form.lock_after_three_minutes),
        lock_after_six_minutes: Number(form.lock_after_six_minutes),
        deactivate_after_failures: Number(form.deactivate_after_failures),
        absolute_session_minutes: Number(form.absolute_session_minutes),
        max_active_sessions: Number(form.max_active_sessions),
        password_expiration_days: Number(form.password_expiration_days),
        password_history_count: Number(form.password_history_count),
        min_password_score_member: Number(form.min_password_score_member),
        min_password_score_tech_lead: Number(form.min_password_score_tech_lead),
        min_password_score_admin: Number(form.min_password_score_admin),
        ip_whitelist: form.ip_whitelist.split('\n').map((line) => line.trim()).filter(Boolean),
        ip_blacklist: form.ip_blacklist.split('\n').map((line) => line.trim()).filter(Boolean),
        detect_geo_anomaly: Boolean(form.detect_geo_anomaly),
        alert_suspicious_activity: Boolean(form.alert_suspicious_activity),
        log_retention_days: Number(form.log_retention_days),
        anonymize_after_days: Number(form.anonymize_after_days),
        mask_sensitive_logs: Boolean(form.mask_sensitive_logs),
        notify_email: form.notify_email.trim(),
        notify_slack_webhook: form.notify_slack_webhook.trim(),
        notify_on_lock: Boolean(form.notify_on_lock),
        notify_on_unlock: Boolean(form.notify_on_unlock),
        notify_on_password_change: Boolean(form.notify_on_password_change),
        notify_on_repeated_failures: Boolean(form.notify_on_repeated_failures)
      };
      const data = await apiRequest('/auth/settings', {
        method: 'PUT',
        token: state.token,
        body: payload
      });
      setForm({
        idle_timeout_minutes: Number(data.idle_timeout_minutes),
        refresh_interval_minutes: Number(data.refresh_interval_minutes),
        lock_after_three_minutes: Number(data.lock_after_three_minutes),
        lock_after_six_minutes: Number(data.lock_after_six_minutes),
        deactivate_after_failures: Number(data.deactivate_after_failures),
        absolute_session_minutes: Number(data.absolute_session_minutes || 480),
        max_active_sessions: Number(data.max_active_sessions || 5),
        password_expiration_days: Number(data.password_expiration_days || 90),
        password_history_count: Number(data.password_history_count || 5),
        min_password_score_member: Number(data.min_password_score_member || 2),
        min_password_score_tech_lead: Number(data.min_password_score_tech_lead || 3),
        min_password_score_admin: Number(data.min_password_score_admin || 3),
        ip_whitelist: Array.isArray(data.ip_whitelist) ? data.ip_whitelist.join('\n') : '',
        ip_blacklist: Array.isArray(data.ip_blacklist) ? data.ip_blacklist.join('\n') : '',
        detect_geo_anomaly: Boolean(data.detect_geo_anomaly ?? true),
        alert_suspicious_activity: Boolean(data.alert_suspicious_activity ?? true),
        log_retention_days: Number(data.log_retention_days || 180),
        anonymize_after_days: Number(data.anonymize_after_days || 365),
        mask_sensitive_logs: Boolean(data.mask_sensitive_logs ?? true),
        notify_email: data.notify_email || '',
        notify_slack_webhook: data.notify_slack_webhook || '',
        notify_on_lock: Boolean(data.notify_on_lock ?? true),
        notify_on_unlock: Boolean(data.notify_on_unlock ?? true),
        notify_on_password_change: Boolean(data.notify_on_password_change ?? true),
        notify_on_repeated_failures: Boolean(data.notify_on_repeated_failures ?? true)
      });
      dispatch({
        type: 'SET_LOGIN_POLICY',
        payload: {
          idle_timeout_minutes: Number(data.idle_timeout_minutes),
          refresh_interval_minutes: Number(data.refresh_interval_minutes)
        }
      });
      setMessage('Configurações de login atualizadas com sucesso.');
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
            <span className="eyebrow">Configurações / Login / Sessões</span>
            <h1>Configurações</h1>
            <p>Gerencie timeout de sessão, renovação e política de bloqueio de acesso.</p>
          </div>
        </header>

        {loading && <div className="panel">Carregando configurações...</div>}
        {!loading && (
          <section className="panel">
            <form onSubmit={onSubmit} className="question-form">
              <label>
                Timeout de inatividade (minutos)
                <input type="number" min="5" max="240" value={form.idle_timeout_minutes} onChange={onChange('idle_timeout_minutes')} />
              </label>
              <label>
                Renovar sessão a cada (minutos)
                <input type="number" min="1" max="60" value={form.refresh_interval_minutes} onChange={onChange('refresh_interval_minutes')} />
              </label>
              <label>
                Bloqueio após 3 erros (minutos)
                <input type="number" min="1" max="1440" value={form.lock_after_three_minutes} onChange={onChange('lock_after_three_minutes')} />
              </label>
              <label>
                Bloqueio após 6 erros (minutos)
                <input type="number" min="1" max="1440" value={form.lock_after_six_minutes} onChange={onChange('lock_after_six_minutes')} />
              </label>
              <label>
                Desativar usuário após falhas
                <input type="number" min="7" max="50" value={form.deactivate_after_failures} onChange={onChange('deactivate_after_failures')} />
              </label>
              <label>
                Sessão máxima absoluta (minutos)
                <input type="number" min="30" max="10080" value={form.absolute_session_minutes} onChange={onChange('absolute_session_minutes')} />
              </label>
              <label>
                Máx. sessões ativas por usuário
                <input type="number" min="1" max="50" value={form.max_active_sessions} onChange={onChange('max_active_sessions')} />
              </label>
              <label>
                Expiração de senha (dias, 0 desativa)
                <input type="number" min="0" max="365" value={form.password_expiration_days} onChange={onChange('password_expiration_days')} />
              </label>
              <label>
                Histórico de senhas (qtd)
                <input type="number" min="0" max="24" value={form.password_history_count} onChange={onChange('password_history_count')} />
              </label>
              <label>
                Força mínima senha - membro (0-4)
                <input type="number" min="0" max="4" value={form.min_password_score_member} onChange={onChange('min_password_score_member')} />
              </label>
              <label>
                Força mínima senha - tech lead (0-4)
                <input type="number" min="0" max="4" value={form.min_password_score_tech_lead} onChange={onChange('min_password_score_tech_lead')} />
              </label>
              <label>
                Força mínima senha - admin (0-4)
                <input type="number" min="0" max="4" value={form.min_password_score_admin} onChange={onChange('min_password_score_admin')} />
              </label>
              <label className="span-2">
                IP Whitelist (um por linha, aceita *)
                <textarea rows={4} value={form.ip_whitelist} onChange={onChange('ip_whitelist', (v) => v)} />
              </label>
              <label className="span-2">
                IP Blacklist (um por linha, aceita *)
                <textarea rows={4} value={form.ip_blacklist} onChange={onChange('ip_blacklist', (v) => v)} />
              </label>
              <label>
                Retenção de logs (dias)
                <input type="number" min="7" max="3650" value={form.log_retention_days} onChange={onChange('log_retention_days')} />
              </label>
              <label>
                Anonimizar após (dias)
                <input type="number" min="30" max="3650" value={form.anonymize_after_days} onChange={onChange('anonymize_after_days')} />
              </label>
              <label className="span-2">
                E-mail de notificação
                <input type="email" value={form.notify_email} onChange={onChange('notify_email', (v) => v)} placeholder="soc@empresa.com" />
              </label>
              <label className="span-2">
                Slack webhook
                <input type="text" value={form.notify_slack_webhook} onChange={onChange('notify_slack_webhook', (v) => v)} placeholder="https://hooks.slack.com/services/..." />
              </label>
              <label>
                <input type="checkbox" checked={form.detect_geo_anomaly} onChange={onToggle('detect_geo_anomaly')} />
                Detectar anomalia geográfica
              </label>
              <label>
                <input type="checkbox" checked={form.alert_suspicious_activity} onChange={onToggle('alert_suspicious_activity')} />
                Alertar atividade suspeita
              </label>
              <label>
                <input type="checkbox" checked={form.mask_sensitive_logs} onChange={onToggle('mask_sensitive_logs')} />
                Mascarar dados sensíveis nos logs
              </label>
              <label>
                <input type="checkbox" checked={form.notify_on_lock} onChange={onToggle('notify_on_lock')} />
                Notificar bloqueio
              </label>
              <label>
                <input type="checkbox" checked={form.notify_on_unlock} onChange={onToggle('notify_on_unlock')} />
                Notificar desbloqueio
              </label>
              <label>
                <input type="checkbox" checked={form.notify_on_password_change} onChange={onToggle('notify_on_password_change')} />
                Notificar troca de senha
              </label>
              <label>
                <input type="checkbox" checked={form.notify_on_repeated_failures} onChange={onToggle('notify_on_repeated_failures')} />
                Notificar falhas repetidas
              </label>

              {error && <div className="error span-2">{error}</div>}
              {message && <div className="success span-2">{message}</div>}

              <div className="form-actions span-2">
                <button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar configurações'}</button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
};

export default SettingsLogin;
