import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { SAMM_MODEL } from '../utils/samm.js';

const emptyForm = {
  id: null,
  domain: 'Governance',
  level: 1,
  code: '',
  text: '',
  guidance: '',
  practice_key: 'gov-strategy-metrics',
  target_level: 3
};

const AdminQuestions = () => {
  const { state } = useApp();
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [listDomainFilter, setListDomainFilter] = useState('all');
  const [listPracticeFilter, setListPracticeFilter] = useState('all');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/questions', { token: state.token });
      setQuestions(data);
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
      await apiRequest('/questions', {
        method: 'POST',
        token: state.token,
        body: form
      });
      setForm(emptyForm);
      setCreateModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onEdit = (q) => {
    setEditForm({
      id: q.id,
      domain: q.domain,
      level: q.level,
      code: q.code || '',
      text: q.text,
      guidance: q.guidance || '',
      practice_key: q.practice_key || 'gov-strategy-metrics',
      target_level: q.target_level || 3
    });
  };

  const buildPracticeOptions = (domain, selectedPracticeKey) => {
    const currentPractices = SAMM_MODEL.find((item) => item.domain === domain)?.practices || [];
    return questions
      .filter((q) => q.domain === domain)
      .reduce((items, q) => {
        if (!q.practice_key || items.some((item) => item.practice_key === q.practice_key)) return items;
        items.push({ practice_key: q.practice_key, practice_name: q.practice_name });
        return items;
      }, [])
      .concat(
        currentPractices
          .filter((practice) => !questions.some((q) => q.domain === domain && q.practice_key === practice.key))
          .map((practice) => ({
            practice_key: practice.key,
            practice_name: practice.name
          }))
      )
      .filter((practice, index, items) => (
        practice.practice_key === selectedPracticeKey
        || items.findIndex((item) => item.practice_key === practice.practice_key) === index
      ));
  };

  const createPracticeOptions = buildPracticeOptions(form.domain, form.practice_key);
  const listPracticeOptions = buildPracticeOptions(
    listDomainFilter === 'all' ? '' : listDomainFilter,
    listPracticeFilter === 'all' ? '' : listPracticeFilter
  );
  const filteredQuestions = questions.filter((question) => {
    if (listDomainFilter !== 'all' && question.domain !== listDomainFilter) return false;
    if (listPracticeFilter !== 'all' && question.practice_key !== listPracticeFilter) return false;
    return true;
  });

  const onDelete = async (id) => {
    setError(null);
    try {
      await apiRequest(`/questions/${id}`, { method: 'DELETE', token: state.token });
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
          <p>Apenas administradores podem gerenciar perguntas.</p>
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
            <h1>Perguntas</h1>
            <p>Crie, edite e mantenha o catálogo de avaliação.</p>
          </div>
          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setForm(emptyForm);
                setCreateModalOpen(true);
              }}
            >
              Nova pergunta
            </button>
          </div>
        </header>
        {error && <div className="error">{error}</div>}

      <section className="panel">
        <div className="panel-header">
          <h2>Todas as perguntas</h2>
          {loading && <span>Carregando...</span>}
        </div>
        <div className="question-form">
          <label>
            Filtrar por domínio
            <select
              value={listDomainFilter}
              onChange={(e) => {
                setListDomainFilter(e.target.value);
                setListPracticeFilter('all');
              }}
            >
              <option value="all">Todos</option>
              {SAMM_MODEL.map((item) => (
                <option key={item.domain} value={item.domain}>{item.domain}</option>
              ))}
            </select>
          </label>
          <label>
            Filtrar por prática
            <select
              value={listPracticeFilter}
              onChange={(e) => setListPracticeFilter(e.target.value)}
            >
              <option value="all">Todas</option>
              {(listDomainFilter === 'all' ? questions : questions.filter((q) => q.domain === listDomainFilter))
                .reduce((items, q) => {
                  if (!q.practice_key || items.some((item) => item.practice_key === q.practice_key)) return items;
                  items.push({ practice_key: q.practice_key, practice_name: q.practice_name });
                  return items;
                }, [])
                .concat(listDomainFilter === 'all' ? [] : listPracticeOptions)
                .filter((practice, index, items) => items.findIndex((item) => item.practice_key === practice.practice_key) === index)
                .map((practice) => (
                  <option key={practice.practice_key} value={practice.practice_key}>
                    {practice.practice_name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="table">
          <div className="table-row table-head">
            <span>Código</span>
            <span>Domínio</span>
            <span>Prática</span>
            <span>Ações</span>
          </div>
          {filteredQuestions.map((q) => (
            <div key={q.id} className="table-row">
              <span className="mono">{q.code || '-'}</span>
              <span>{q.domain}</span>
              <span>{q.practice_name || `Nível ${q.level}`}</span>
              <span className="actions">
                <button onClick={() => onEdit(q)}>Editar</button>
                <button className="secondary" onClick={() => onDelete(q.id)}>Excluir</button>
              </span>
            </div>
          ))}
          {!filteredQuestions.length && (
            <div className="table-row">
              <span>Nenhuma pergunta encontrada para o filtro atual.</span>
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
      </section>

      {editForm && (
        <div className="modal-overlay">
          <div className="modal question-level-modal">
            <div className="modal-header">
              <div>
                <h2>Editar regra</h2>
                <p>Atualize os campos da pergunta selecionada.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setEditForm(null)}>
                Fechar
              </button>
            </div>
            <form
              className="question-form question-modal-body"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                try {
                  await apiRequest(`/questions/${editForm.id}`, {
                    method: 'PUT',
                    token: state.token,
                    body: editForm
                  });
                  setEditForm(null);
                  await load();
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              <label>
                Domínio
                <select
                  value={editForm.domain}
                  onChange={(e) => {
                    const domain = e.target.value;
                    const firstPractice = SAMM_MODEL.find((item) => item.domain === domain)?.practices?.[0];
                    setEditForm({
                      ...editForm,
                      domain,
                      practice_key: firstPractice?.key || editForm.practice_key
                    });
                  }}
                  required
                >
                  {SAMM_MODEL.map((item) => (
                    <option key={item.domain} value={item.domain}>{item.domain}</option>
                  ))}
                </select>
              </label>
              <label>
                Prática
                <select
                  value={editForm.practice_key}
                  onChange={(e) => setEditForm({ ...editForm, practice_key: e.target.value })}
                >
                  {buildPracticeOptions(editForm.domain, editForm.practice_key).map((practice) => (
                    <option key={practice.practice_key} value={practice.practice_key}>
                      {practice.practice_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nível (1-3)
                <input
                  type="number"
                  min="1"
                  max="3"
                  value={editForm.level}
                  onChange={(e) => setEditForm({ ...editForm, level: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                Nível alvo
                <input
                  type="number"
                  min="1"
                  max="3"
                  value={editForm.target_level}
                  onChange={(e) => setEditForm({ ...editForm, target_level: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                Código
                <input
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                />
              </label>
              <label className="span-2">
                Pergunta
                <textarea
                  value={editForm.text}
                  onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                  required
                />
              </label>
              <label className="span-2">
                Orientação
                <textarea
                  value={editForm.guidance}
                  onChange={(e) => setEditForm({ ...editForm, guidance: e.target.value })}
                />
              </label>
              <div className="form-actions span-2">
                <button type="button" className="secondary" onClick={() => setEditForm(null)}>
                  Cancelar
                </button>
                <button type="submit">Salvar regra</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createModalOpen && (
        <div className="modal-overlay">
          <div className="modal question-level-modal">
            <div className="modal-header">
              <div>
                <h2>Nova pergunta</h2>
                <p>Cadastre uma nova regra de avaliação.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setCreateModalOpen(false)}>
                Fechar
              </button>
            </div>
            <form className="question-form question-modal-body" onSubmit={onSubmit}>
              <label>
                Domínio
                <select
                  value={form.domain}
                  onChange={(e) => {
                    const domain = e.target.value;
                    const firstPractice = SAMM_MODEL.find((item) => item.domain === domain)?.practices?.[0];
                    const practiceKey = firstPractice?.key;
                    setForm({
                      ...form,
                      domain,
                      practice_key: practiceKey || form.practice_key
                    });
                  }}
                  required
                >
                  {SAMM_MODEL.map((item) => (
                    <option key={item.domain} value={item.domain}>{item.domain}</option>
                  ))}
                </select>
              </label>
              <label>
                Prática
                <select
                  value={form.practice_key}
                  onChange={(e) => setForm({ ...form, practice_key: e.target.value })}
                >
                  {createPracticeOptions.map((practice) => (
                    <option key={practice.practice_key} value={practice.practice_key}>
                      {practice.practice_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nível (1-3)
                <input
                  type="number"
                  min="1"
                  max="3"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                Nível alvo
                <input
                  type="number"
                  min="1"
                  max="3"
                  value={form.target_level}
                  onChange={(e) => setForm({ ...form, target_level: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                Código
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </label>
              <label className="span-2">
                Pergunta
                <textarea
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  required
                />
              </label>
              <label className="span-2">
                Orientação
                <textarea
                  value={form.guidance}
                  onChange={(e) => setForm({ ...form, guidance: e.target.value })}
                />
              </label>
              <div className="form-actions span-2">
                <button type="button" className="secondary" onClick={() => setCreateModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit">Criar pergunta</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminQuestions;
