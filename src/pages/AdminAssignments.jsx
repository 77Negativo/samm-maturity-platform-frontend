import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { LEVEL_LABELS } from '../utils/samm.js';

const AdminAssignments = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [teams, setTeams] = useState([]);
  const [domains, setDomains] = useState([]);
  const [model, setModel] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    team_id: '',
    starts_at: '',
    ends_at: '',
    domains: [],
    practice_keys: [],
    target_level: 2
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignsData, teamsData, meta] = await Promise.all([
        apiRequest('/campaigns', { token: state.token }),
        apiRequest('/teams', { token: state.token }),
        apiRequest('/questions/meta', { token: state.token })
      ]);
      setCampaigns(campaignsData);
      setTeams(teamsData);
      setDomains(meta.domains || []);
      setModel(meta.model || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openPicker = (ref) => {
    const input = ref?.current;
    if (input?.showPicker) input.showPicker();
    input?.focus();
  };

  useEffect(() => {
    if (state.user?.role === 'member') {
      navigate('/campaigns', { replace: true });
      return;
    }
    load();
  }, [state.token, state.user?.role]);

  const toggleDomain = (domain) => {
    setForm((prev) => {
      const exists = prev.domains.includes(domain);
      const domainPracticeKeys = (model.find((item) => item.domain === domain)?.practices || []).map((practice) => practice.practice_key || practice.key);
      return {
        ...prev,
        domains: exists ? prev.domains.filter((d) => d !== domain) : [...prev.domains, domain],
        practice_keys: exists
          ? prev.practice_keys.filter((key) => !domainPracticeKeys.includes(key))
          : [...new Set([...prev.practice_keys, ...domainPracticeKeys])]
      };
    });
  };

  const togglePractice = (practiceKey) => {
    setForm((prev) => {
      const exists = prev.practice_keys.includes(practiceKey);
      return {
        ...prev,
        practice_keys: exists
          ? prev.practice_keys.filter((key) => key !== practiceKey)
          : [...prev.practice_keys, practiceKey]
      };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/campaigns', {
        method: 'POST',
        token: state.token,
        body: {
          name: form.name,
          team_id: form.team_id,
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
          domains: form.domains,
          practice_keys: form.practice_keys,
          target_level: form.target_level,
          status: 'active'
        }
      });
      setForm({ name: '', team_id: '', starts_at: '', ends_at: '', domains: [], practice_keys: [], target_level: 2 });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard">
        <header className="dash-header">
          <div>
            <h1>Novas campanhas</h1>
            <p>O tech lead escolhe domínio e time para responder o questionário.</p>
          </div>
        </header>

        <section className="panel">
          <div className="panel-header">
            <h2>Nova campanha</h2>
          </div>
          <form onSubmit={onSubmit} className="question-form">
            <label className="span-2">
              Nome
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Time
              <select
                value={form.team_id}
                onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                required
              >
                <option value="" disabled>Selecione</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>
            <label>
              Início
              <div className="date-field">
                <input
                  ref={startDateRef}
                  type="date"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
                <button type="button" className="date-button" onClick={() => openPicker(startDateRef)} aria-label="Abrir calendário">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 6.5v13A2.5 2.5 0 0 1 19.5 22h-15A2.5 2.5 0 0 1 2 19.5v-13A2.5 2.5 0 0 1 4.5 4H6V3a1 1 0 0 1 1-1Zm12.5 8H4.5v9.5c0 .276.224.5.5.5h14.5a.5.5 0 0 0 .5-.5V10ZM19.5 8V6.5a.5.5 0 0 0-.5-.5H4.5a.5.5 0 0 0-.5.5V8h15.5Z" />
                  </svg>
                  Calendário
                </button>
              </div>
            </label>
            <label>
              Fim
              <div className="date-field">
                <input
                  ref={endDateRef}
                  type="date"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
                <button type="button" className="date-button" onClick={() => openPicker(endDateRef)} aria-label="Abrir calendário">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 6.5v13A2.5 2.5 0 0 1 19.5 22h-15A2.5 2.5 0 0 1 2 19.5v-13A2.5 2.5 0 0 1 4.5 4H6V3a1 1 0 0 1 1-1Zm12.5 8H4.5v9.5c0 .276.224.5.5.5h14.5a.5.5 0 0 0 .5-.5V10ZM19.5 8V6.5a.5.5 0 0 0-.5-.5H4.5a.5.5 0 0 0-.5.5V8h15.5Z" />
                  </svg>
                  Calendário
                </button>
              </div>
            </label>
            <label className="span-2">
              Domínios
              <div className="pill-grid">
                {domains.map((domain) => (
                  <button
                    type="button"
                    key={domain}
                    className={form.domains.includes(domain) ? 'pill active' : 'pill'}
                    onClick={() => toggleDomain(domain)}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Nível alvo
              <select
                value={form.target_level}
                onChange={(e) => setForm({ ...form, target_level: Number(e.target.value) })}
              >
                <option value={1}>{LEVEL_LABELS[1]}</option>
                <option value={2}>{LEVEL_LABELS[2]}</option>
                <option value={3}>{LEVEL_LABELS[3]}</option>
              </select>
            </label>
            <label className="span-2">
              Práticas avaliadas
              <div className="practice-scope-grid">
                {form.domains.map((domain) => {
                  const practices = model.find((item) => item.domain === domain)?.practices || [];
                  return (
                    <div key={domain} className="practice-scope-card">
                      <strong>{domain}</strong>
                      <div className="pill-grid">
                        {practices.map((practice) => {
                          const practiceKey = practice.practice_key || practice.key;
                          return (
                            <button
                              type="button"
                              key={practiceKey}
                              className={form.practice_keys.includes(practiceKey) ? 'pill active' : 'pill'}
                              onClick={() => togglePractice(practiceKey)}
                            >
                              {practice.practice_name || practice.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {!form.domains.length && <div className="helper-text">Selecione um ou mais domínios para liberar as práticas.</div>}
              </div>
            </label>
            <div className="form-actions span-2">
              <button type="submit">Criar campanha</button>
            </div>
          </form>
          {error && <div className="error">{error}</div>}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Campanhas recentes</h2>
            {loading && <span>Carregando...</span>}
          </div>
          <div className="table">
            <div className="table-row table-head">
              <span>Nome</span>
              <span>Status</span>
              <span>Nível alvo</span>
              <span>Início</span>
              <span>Ações</span>
            </div>
            {campaigns.map((c) => (
              <div key={c.id} className="table-row">
                <span>{c.name}</span>
                <span>
                  <span className={`status-pill ${c.status}`}>
                    {c.status}
                  </span>
                </span>
                <span>{LEVEL_LABELS[c.target_level] || '-'}</span>
                <span>{c.starts_at ? new Date(c.starts_at).toLocaleDateString() : '-'}</span>
                <span className="actions">
                  <button onClick={() => navigate(`/campaigns/${c.id}`)}>Acompanhar</button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={async () => {
                      const nextStatus = c.status === 'closed' ? 'active' : 'closed';
                      setError(null);
                      try {
                        await apiRequest(`/campaigns/${c.id}/status`, {
                          method: 'PUT',
                          token: state.token,
                          body: { status: nextStatus }
                        });
                        await load();
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                  >
                    {c.status === 'closed' ? 'Ativar' : 'Desativar'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminAssignments;
