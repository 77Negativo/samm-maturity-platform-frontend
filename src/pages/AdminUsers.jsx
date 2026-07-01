import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { generatePassword } from '../utils/passwords.js';

const AdminUsers = () => {
  const { state } = useApp();
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });
  const [blockedByUserId, setBlockedByUserId] = useState({});
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState(null);
  const [unlockError, setUnlockError] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    org_id: '',
    domain_id: '',
    name: '',
    email: '',
    role: 'member',
    password: ''
  });
  const [createdPassword, setCreatedPassword] = useState(null);

  const regeneratePassword = () => {
    setForm((prev) => ({ ...prev, password: generatePassword() }));
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, orgsData] = await Promise.all([
        apiRequest('/users', { token: state.token }),
        apiRequest('/organizations', { token: state.token })
      ]);
      const blockedData = await apiRequest('/auth/blocked-users', { token: state.token });
      const blockedMap = blockedData.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});
      setUsers(usersData);
      setOrgs(orgsData);
      setBlockedByUserId(blockedMap);
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
      await apiRequest('/users', {
        method: 'POST',
        token: state.token,
        body: {
          org_id: form.org_id,
          domain_id: form.domain_id || null,
          name: form.name,
          email: form.email,
          role: form.role,
          password: form.password
        }
      });
      setCreatedPassword(form.password);
      setCreateOpen(false);
      setForm({
        org_id: form.org_id,
        domain_id: '',
        name: '',
        email: '',
        role: 'member',
        password: ''
      });
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
          <p>Apenas administradores podem gerenciar usuários.</p>
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
            <h1>Usuários</h1>
            <p>Crie facilitadores, tech leads, membros e administradores com o acesso correto para cada papel.</p>
          </div>
        </header>

        <section className="panel">
          <div className="panel-header">
            <h2>Novo usuário</h2>
            <button
              type="button"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  name: '',
                  email: '',
                  role: 'member',
                  password: generatePassword()
                }));
                setCreatedPassword(null);
                setCreateOpen(true);
              }}
            >
              Criar usuário
            </button>
          </div>
          <p>Cadastre novos usuários e defina o nível de acesso.</p>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Usuários cadastrados</h2>
            {loading && <span>Carregando...</span>}
          </div>
          <div className="table users-table">
            <div className="table-row table-head users-row">
              <span>Nome</span>
              <span>Email</span>
              <span>Role</span>
              <span>Status</span>
              <span>Times</span>
              <span>Ações</span>
            </div>
            {users.map((u) => (
              <div key={u.id} className="table-row users-row">
                <span>{u.name}</span>
                <span>{u.email}</span>
                <span>{u.role}</span>
                <span>
                  <span className={`status-pill ${u.must_change_password ? 'pending' : 'ok'}`}>
                    {u.must_change_password ? 'Troca pendente' : 'OK'}
                  </span>
                </span>
                <span className="mono">{u.team_ids?.length ? u.team_ids.length : '-'}</span>
                <span className="actions">
                  {['blocked', 'deactivated'].includes(blockedByUserId[u.id]?.state) && (
                    <button
                      type="button"
                      className="icon-button warning"
                      onClick={() => {
                        setUnlockTarget({ ...u, lock: blockedByUserId[u.id] });
                        setUnlockError(null);
                        setUnlockOpen(true);
                      }}
                      aria-label="Usuário bloqueado ou desativado"
                      title="Usuário bloqueado/desativado: desbloquear acesso"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      setEditTarget(u);
                      setEditForm({ name: u.name, email: u.email, role: u.role });
                      setEditOpen(true);
                    }}
                    aria-label="Editar usuário"
                    title="Editar usuário"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08ZM20.71 5.63a1 1 0 0 0 0-1.42l-1.92-1.92a1 1 0 0 0-1.42 0l-1.5 1.5 3.75 3.75 1.09-1.09Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      setPasswordTarget(u);
                      setPasswordValue('');
                      setPasswordConfirm('');
                      setPasswordError(null);
                      setPasswordOpen(true);
                    }}
                    aria-label="Trocar senha"
                    title="Trocar senha"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.5 14a4.5 4.5 0 1 1 3.9-2.25L22 12v4h-2v2h-2v2h-4v-3.1l-3.9-1.9A4.48 4.48 0 0 1 7.5 14Zm0-2a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 7.5 12Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    disabled={u.id === state.user?.id}
                    onClick={() => {
                      setDeleteTarget(u);
                      setDeleteError(null);
                      setDeleteOpen(true);
                    }}
                    aria-label="Deletar usuário"
                    title="Deletar usuário"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 3h6l1 2h5v2H3V5h5l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Z" />
                    </svg>
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>

        {createOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Novo usuário</h2>
                <button className="modal-close" type="button" onClick={() => setCreateOpen(false)}>
                  Fechar
                </button>
              </div>
              <form onSubmit={onSubmit} className="question-form">
                <label>
                  Nome
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Role
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    required
                  >
                    <option value="member">Membro</option>
                    <option value="facilitator">Facilitador</option>
                    <option value="tech_lead">Tech lead</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label>
                  Senha temporária
                  <div className="input-with-action">
                    <input type="text" value={form.password} readOnly />
                    <button type="button" className="icon-button" onClick={regeneratePassword} aria-label="Gerar nova senha">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 4a8 8 0 1 1-7.45 5H2l3-3 3 3H6.04A6 6 0 1 0 12 6c1.66 0 3.17.67 4.24 1.76l1.42-1.42A7.97 7.97 0 0 0 12 4Zm-1 5h2v5h-2V9Zm0 6h2v2h-2v-2Z" />
                      </svg>
                    </button>
                  </div>
                </label>
                {createdPassword && (
                  <div className="span-2 helper-text">
                    Senha gerada: <strong className="mono">{createdPassword}</strong>
                  </div>
                )}
                <div className="form-actions span-2">
                  <button type="submit">Criar usuário</button>
                  <button type="button" className="secondary" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
              {error && <div className="error">{error}</div>}
            </div>
          </div>
        )}

        {passwordOpen && passwordTarget && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Trocar senha</h2>
                <button className="modal-close" type="button" onClick={() => setPasswordOpen(false)}>
                  Fechar
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPasswordError(null);
                  if (passwordValue.length < 12) {
                    setPasswordError('A senha deve ter no mínimo 12 caracteres.');
                    return;
                  }
                  if (!/[A-Za-z]/.test(passwordValue)) {
                    setPasswordError('A senha deve conter letras.');
                    return;
                  }
                  if (!/\d/.test(passwordValue)) {
                    setPasswordError('A senha deve conter números.');
                    return;
                  }
                  if (!/[^A-Za-z0-9]/.test(passwordValue)) {
                    setPasswordError('A senha deve conter símbolos.');
                    return;
                  }
                  if (passwordValue !== passwordConfirm) {
                    setPasswordError('As senhas não conferem.');
                    return;
                  }
                  try {
                    await apiRequest(`/users/${passwordTarget.id}/password`, {
                      method: 'PUT',
                      token: state.token,
                      body: { new_password: passwordValue }
                    });
                    setPasswordOpen(false);
                    setPasswordTarget(null);
                    setPasswordValue('');
                    setPasswordConfirm('');
                  } catch (err) {
                    setPasswordError(err.message);
                  }
                }}
                className="question-form"
              >
                <label className="span-2">
                  Usuário
                  <input value={`${passwordTarget.name} (${passwordTarget.email})`} disabled />
                </label>
                <label>
                  Nova senha
                  <input
                    type="password"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Confirmar senha
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                  />
                </label>
                <div className="span-2 helper-text">
                  A senha deve ter 12+ caracteres com letras, números e símbolos.
                </div>
                {passwordError && <div className="error span-2">{passwordError}</div>}
                <div className="form-actions span-2">
                  <button type="submit">Atualizar senha</button>
                  <button type="button" className="secondary" onClick={() => setPasswordOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editOpen && editTarget && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Editar usuário</h2>
                <button className="modal-close" type="button" onClick={() => setEditOpen(false)}>
                  Fechar
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  try {
                    await apiRequest(`/users/${editTarget.id}`, {
                      method: 'PUT',
                      token: state.token,
                      body: { name: editForm.name, email: editForm.email, role: editForm.role }
                    });
                    setEditOpen(false);
                    setEditTarget(null);
                    await load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
                className="question-form"
              >
                <label>
                  Nome
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Role
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    required
                  >
                    <option value="member">Membro</option>
                    <option value="facilitator">Facilitador</option>
                    <option value="tech_lead">Tech lead</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <div className="form-actions span-2">
                  <button type="submit">Salvar</button>
                  <button type="button" className="secondary" onClick={() => setEditOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
              {error && <div className="error">{error}</div>}
            </div>
          </div>
        )}

        {unlockOpen && unlockTarget && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Desbloquear usuário</h2>
                <button
                  className="modal-close"
                  type="button"
                  onClick={() => {
                    if (unlocking) return;
                    setUnlockOpen(false);
                  }}
                >
                  Fechar
                </button>
              </div>
              <p>
                O usuário <strong>{unlockTarget.name}</strong> ({unlockTarget.email}) está inativo.
                Ao confirmar, ele poderá tentar login novamente.
              </p>
              <div className="form-actions">
                <button
                  type="button"
                  disabled={unlocking}
                  onClick={async () => {
                    setUnlocking(true);
                    setUnlockError(null);
                    try {
                      await apiRequest(`/auth/blocked-users/${unlockTarget.id}/unlock`, {
                        method: 'POST',
                        token: state.token
                      });
                      setUnlockOpen(false);
                      setUnlockTarget(null);
                      await load();
                    } catch (err) {
                      setUnlockError(err.message);
                    } finally {
                      setUnlocking(false);
                    }
                  }}
                >
                  {unlocking ? 'Desbloqueando...' : 'Desbloquear'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={unlocking}
                  onClick={() => setUnlockOpen(false)}
                >
                  Cancelar
                </button>
              </div>
              {unlockError && <div className="error">{unlockError}</div>}
            </div>
          </div>
        )}

        {deleteOpen && deleteTarget && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Excluir usuário</h2>
                <button
                  className="modal-close"
                  type="button"
                  onClick={() => {
                    if (deleting) return;
                    setDeleteOpen(false);
                  }}
                >
                  Fechar
                </button>
              </div>
              <p>
                Deseja excluir o usuário <strong>{deleteTarget.name}</strong> ({deleteTarget.email})?
              </p>
              <p className="helper-text">
                Se este usuário possuir avaliações, respostas, campanhas ou registros de auditoria vinculados,
                a exclusão será bloqueada para preservar o histórico.
              </p>
              {deleteError && <div className="error">{deleteError}</div>}
              <div className="form-actions">
                <button
                  type="button"
                  className="danger"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    setDeleteError(null);
                    setError(null);
                    try {
                      await apiRequest(`/users/${deleteTarget.id}`, { method: 'DELETE', token: state.token });
                      setDeleteOpen(false);
                      setDeleteTarget(null);
                      await load();
                    } catch (err) {
                      setDeleteError(err.message);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                >
                  {deleting ? 'Excluindo...' : 'Excluir usuário'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={deleting}
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
