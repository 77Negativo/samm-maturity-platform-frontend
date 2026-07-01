import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';

const defaultLevels = [1, 2, 3];
const emptyForm = { id: null, org_id: '', name: '', levels: defaultLevels };

const AdminDomains = () => {
  const { state } = useApp();
  const [domains, setDomains] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [levelsByDomain, setLevelsByDomain] = useState({});
  const [questionCounts, setQuestionCounts] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const sortedOrgs = useMemo(
    () => [...orgs].sort((a, b) => a.name.localeCompare(b.name)),
    [orgs]
  );
  const orgById = useMemo(
    () => Object.fromEntries(sortedOrgs.map((org) => [org.id, org])),
    [sortedOrgs]
  );
  const sortedDomains = useMemo(() => {
    return [...domains].sort((a, b) => {
      const orgA = orgById[a.org_id]?.name || '';
      const orgB = orgById[b.org_id]?.name || '';
      if (orgA === orgB) return a.name.localeCompare(b.name);
      return orgA.localeCompare(orgB);
    });
  }, [domains, orgById]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [domainsData, orgsData, questionsData] = await Promise.all([
        apiRequest('/domains', { token: state.token }),
        apiRequest('/organizations', { token: state.token }),
        apiRequest('/questions', { token: state.token })
      ]);
      setDomains(domainsData);
      setOrgs(orgsData);
      const levelMap = {};
      const countMap = {};
      for (const q of questionsData) {
        if (!levelMap[q.domain]) levelMap[q.domain] = new Set();
        levelMap[q.domain].add(q.level);
        countMap[q.domain] = (countMap[q.domain] || 0) + 1;
      }
      const normalized = {};
      for (const domain of domainsData) {
        if (Array.isArray(domain.levels) && domain.levels.length) {
          normalized[domain.name] = [...domain.levels].sort((a, b) => a - b);
        } else if (levelMap[domain.name]) {
          normalized[domain.name] = Array.from(levelMap[domain.name]).sort((a, b) => a - b);
        }
      }
      setLevelsByDomain(normalized);
      setQuestionCounts(countMap);
      if (!form.org_id && orgsData.length) {
        setForm((prev) => ({ ...prev, org_id: orgsData[0].id }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [state.token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (!form.levels || !form.levels.length) {
        setError('Selecione ao menos um nível.');
        return;
      }
      await apiRequest('/domains', {
        method: 'POST',
        token: state.token,
        body: { org_id: form.org_id, name: form.name, levels: form.levels }
      });
      setForm({ id: null, org_id: form.org_id, name: '', levels: form.levels });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onEdit = (domain) => {
    const levels = Array.isArray(domain.levels) && domain.levels.length
      ? domain.levels
      : (levelsByDomain[domain.name] || defaultLevels);
    setEditForm({ id: domain.id, org_id: domain.org_id, name: domain.name, levels });
    setEditOpen(true);
  };

  const onDelete = async (id) => {
    setError(null);
    try {
      await apiRequest(`/domains/${id}`, { method: 'DELETE', token: state.token });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (state.user?.role !== 'admin') {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="dashboard">
          <h1>Acesso negado</h1>
          <p>Apenas administradores podem gerenciar domínios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard">
        <header className="dash-header">
          <div>
            <h1>Domínios</h1>
            <p>Crie domínios e organize por níveis.</p>
          </div>
        </header>

        <section className="panel">
          <div className="panel-header">
            <h2>Domínios cadastrados</h2>
            {loading && <span>Carregando...</span>}
            <button type="button" onClick={() => setCreateOpen(true)}>Novo domínio</button>
          </div>
          <div className="table domains-table">
            <div className="table-row table-head domains-row">
              <span>Nome</span>
              <span>Organização</span>
              <span>Níveis</span>
              <span>Perguntas</span>
              <span>Ações</span>
            </div>
            {sortedDomains.map((d) => (
              <div key={d.id} className="table-row domains-row">
                <span>{d.name}</span>
                <span>{orgById[d.org_id]?.name || '-'}</span>
                <span>{levelsByDomain[d.name]?.join(', ') || '-'}</span>
                <span>{questionCounts[d.name] || 0}</span>
                <span className="actions">
                  <button type="button" onClick={() => onEdit(d)}>Editar</button>
                  <button type="button" className="secondary" onClick={() => onDelete(d.id)}>Excluir</button>
                </span>
              </div>
            ))}
          </div>
        </section>

        {editOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Editar domínio</h2>
                <button className="modal-close" type="button" onClick={() => setEditOpen(false)}>
                  Fechar
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  try {
                    if (!editForm.levels || !editForm.levels.length) {
                      setError('Selecione ao menos um nível.');
                      return;
                    }
                    await apiRequest(`/domains/${editForm.id}`, {
                      method: 'PUT',
                      token: state.token,
                      body: { name: editForm.name, levels: editForm.levels }
                    });
                    setEditOpen(false);
                    setEditForm(emptyForm);
                    await load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
                className="question-form"
              >
                <label>
                  Organização
                  <select value={editForm.org_id} disabled>
                    <option value={editForm.org_id}>
                      {orgById[editForm.org_id]?.name || 'Organização'}
                    </option>
                  </select>
                </label>
                <label>
                  Níveis
                  <div className="levels-grid">
                    {[1, 2, 3].map((level) => {
                      const selected = editForm.levels?.includes(level);
                      return (
                        <label key={level} className={`level-chip ${selected ? 'active' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              const current = editForm.levels || [];
                              const next = selected
                                ? current.filter((value) => value !== level)
                                : [...current, level];
                              setEditForm({ ...editForm, levels: next });
                            }}
                          />
                          Nível {level}
                        </label>
                      );
                    })}
                  </div>
                </label>
                <label>
                  Nome
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </label>
                <div className="form-actions span-2">
                  <button type="submit">Salvar</button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setEditOpen(false);
                      setEditForm(emptyForm);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
              {error && <div className="error">{error}</div>}
            </div>
          </div>
        )}

        {createOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Novo domínio</h2>
                <button className="modal-close" type="button" onClick={() => setCreateOpen(false)}>
                  Fechar
                </button>
              </div>
              <form onSubmit={onSubmit} className="question-form">
                <label>
                  Organização
                  <select
                    value={form.org_id}
                    onChange={(e) => setForm({ ...form, org_id: e.target.value })}
                    required
                  >
                    <option value="" disabled>Selecione</option>
                    {sortedOrgs.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Níveis
                  <div className="levels-grid">
                    {[1, 2, 3].map((level) => {
                      const selected = form.levels?.includes(level);
                      return (
                        <label key={level} className={`level-chip ${selected ? 'active' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              const current = form.levels || [];
                              const next = selected
                                ? current.filter((value) => value !== level)
                                : [...current, level];
                              setForm({ ...form, levels: next });
                            }}
                          />
                          Nível {level}
                        </label>
                      );
                    })}
                  </div>
                </label>
                <label>
                  Nome
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </label>
                <div className="form-actions span-2">
                  <button type="submit">Criar domínio</button>
                  <button type="button" className="secondary" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
              {error && <div className="error">{error}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDomains;
