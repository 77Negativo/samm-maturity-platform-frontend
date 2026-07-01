import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const AdminTeams = () => {
  const { state } = useApp();
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [error, setError] = useState(null);
  const [createMembers, setCreateMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [editTeamMembers, setEditTeamMembers] = useState([]);
  const [deleteTeamTarget, setDeleteTeamTarget] = useState(null);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [deleteTeamError, setDeleteTeamError] = useState(null);
  const [form, setForm] = useState({
    org_id: '',
    domain_id: '',
    lead_user_id: '',
    name: ''
  });

  const load = async () => {
    setError(null);
    try {
      const [teamsData, usersData, orgsData] = await Promise.all([
        apiRequest('/teams', { token: state.token }),
        apiRequest('/users', { token: state.token }),
        apiRequest('/organizations', { token: state.token })
      ]);
      setTeams(teamsData);
      setUsers(usersData);
      setOrgs(orgsData);
      if (!form.org_id && orgsData.length) {
        setForm((prev) => ({ ...prev, org_id: orgsData[0].id }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const members = useMemo(() => users.filter((u) => u.role === 'member'), [users]);
  const techLeads = useMemo(() => users.filter((u) => u.role === 'tech_lead'), [users]);
  const memberInTeam = (member, teamId) => (member.team_ids || []).includes(teamId);
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      `${member.name} ${member.email}`.toLowerCase().includes(query)
    );
  }, [members, memberSearch]);
  const filteredTeamMembers = useMemo(() => {
    if (!editTeam?.id) return [];
    const query = modalSearch.trim();
    if (!query) {
      return members.filter((member) => memberInTeam(member, editTeam.id));
    }
    return members.filter((member) => member.email.includes(query));
  }, [members, modalSearch, editTeam?.id]);
  const searchPool = useMemo(() => {
    if (!editTeam?.id) return [];
    return members;
  }, [members, editTeam?.id]);
  const onSelectModalSearchValue = (value) => {
    if (!value) return;
    const match = searchPool.find((member) => member.email === value);
    if (!match) return;
    onToggleEditTeamMember(match.id);
  };

  useEffect(() => {
    load();
  }, [state.token]);

  useEffect(() => {
    if (!editTeamOpen || !editTeam?.id) return;
    const selected = members.filter((m) => memberInTeam(m, editTeam.id)).map((m) => m.id);
    setEditTeamMembers(selected);
  }, [editTeamOpen, editTeam?.id, members]);

  const onToggleCreateMember = (id) => {
    setCreateMembers((prev) => (
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    ));
  };

  const onToggleEditTeamMember = (id) => {
    setEditTeamMembers((prev) => (
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    ));
  };
  const onRemoveEditTeamMemberAndSave = async (id) => {
    if (!editTeam?.id) return;
    const nextMembers = editTeamMembers.filter((m) => m !== id);
    setEditTeamMembers(nextMembers);
    setError(null);
    try {
      await apiRequest(`/teams/${editTeam.id}/members`, {
        method: 'PUT',
        token: state.token,
        body: { member_ids: nextMembers, lead_user_id: editTeam.lead_user_id || null }
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiRequest('/teams', {
        method: 'POST',
        token: state.token,
        body: {
          org_id: form.org_id,
          domain_id: form.domain_id || null,
          lead_user_id: form.lead_user_id || null,
          name: form.name
        }
      });
      if (createMembers.length) {
        await apiRequest(`/teams/${created.id}/members`, {
          method: 'PUT',
          token: state.token,
          body: { member_ids: createMembers, lead_user_id: form.lead_user_id || null }
        });
      }
      setForm({ org_id: form.org_id, domain_id: '', lead_user_id: '', name: '' });
      setCreateMembers([]);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onOpenEditTeam = (team) => {
    setEditTeam(team);
    const selected = members.filter((m) => memberInTeam(m, team.id)).map((m) => m.id);
    setEditTeamMembers(selected);
    setModalSearch('');
    setEditTeamOpen(true);
  };

  if (state.user?.role !== 'admin') {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="dashboard">
          <h1>Acesso negado</h1>
          <p>Apenas administradores podem gerenciar squads.</p>
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
            <h1>Times</h1>
            <p>Crie squads e selecione quais membros fazem parte de cada time.</p>
          </div>
        </header>

        <section className="panel">
          <div className="panel-header">
            <h2>Novo time</h2>
            <button type="button" onClick={() => setCreateOpen(true)}>Criar time</button>
          </div>
          <p>Cadastre um novo time e selecione os membros iniciais.</p>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Times cadastrados</h2>
          </div>
          <div className="table">
            <div className="table-row table-head">
              <span>Nome</span>
              <span>Tech lead</span>
              <span>Membros</span>
              <span>Id</span>
              <span>Acoes</span>
            </div>
            {[...teams].sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0)).map((t) => (
              <div key={t.id} className="table-row">
                <span>{t.name}</span>
                <span>{t.lead_name || '-'}</span>
                <span>{t.member_count ?? 0}</span>
                <span className="mono">{t.id.slice(0, 8)}</span>
                <span className="actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onOpenEditTeam(t)}
                    aria-label="Editar time"
                    title="Editar time"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08ZM20.71 5.63a1 1 0 0 0 0-1.42l-1.92-1.92a1 1 0 0 0-1.42 0l-1.5 1.5 3.75 3.75 1.09-1.09Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => {
                      setDeleteTeamError(null);
                      setDeleteTeamTarget(t);
                    }}
                    aria-label="Deletar time"
                    title="Deletar time"
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

        {editTeamOpen && editTeam && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Editar time</h2>
                <button className="modal-close" type="button" onClick={() => setEditTeamOpen(false)}>
                  Fechar
                </button>
              </div>
              <div className="question-form">
                <label className="span-2">
                  Time
                  <input value={editTeam.name} disabled />
                </label>
                <label className="span-2">
                  Tech lead
                  <select
                    value={editTeam.lead_user_id || ''}
                    onChange={(e) => setEditTeam((prev) => ({ ...prev, lead_user_id: e.target.value }))}
                  >
                    <option value="">Sem lead</option>
                    {techLeads.map((lead) => (
                      <option key={lead.id} value={lead.id}>{lead.name}</option>
                    ))}
                  </select>
                </label>
                <label className="span-2">
                  Membros
                  <input
                    list="team-member-search"
                    placeholder="Buscar por email"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    onBlur={(e) => onSelectModalSearchValue(e.target.value)}
                  />
                  <datalist id="team-member-search">
                    {searchPool.map((member) => (
                      <option
                        key={member.id}
                        value={member.email}
                      />
                    ))}
                  </datalist>
                  <div className="member-grid">
                    {filteredTeamMembers.map((member) => {
                      const isActive = editTeamMembers.includes(member.id);
                      return (
                        <div
                          key={member.id}
                          role="button"
                          tabIndex={0}
                          className={isActive ? 'member-card active' : 'member-card'}
                          onClick={() => onToggleEditTeamMember(member.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onToggleEditTeamMember(member.id);
                            }
                          }}
                        >
                          <span>{member.name}</span>
                          <span className="muted">{member.email}</span>
                          {isActive && (
                            <button
                              type="button"
                              className="member-remove"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveEditTeamMemberAndSave(member.id);
                              }}
                              aria-label="Remover do time"
                              title="Remover do time"
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 7h12v2H6V7Zm2 3h8l-1 9H9l-1-9Zm3-6h2l1 2H10l1-2Z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </label>
                <div className="form-actions span-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setError(null);
                      try {
                        await apiRequest(`/teams/${editTeam.id}/members`, {
                          method: 'PUT',
                          token: state.token,
                          body: { member_ids: editTeamMembers, lead_user_id: editTeam.lead_user_id || null }
                        });
                        setEditTeamOpen(false);
                        setEditTeam(null);
                        await load();
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                  >
                    Salvar membros
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setEditTeamOpen(false);
                      setEditTeam(null);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
              {error && <div className="error">{error}</div>}
            </div>
          </div>
        )}

        {createOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Novo time</h2>
                <button className="modal-close" type="button" onClick={() => setCreateOpen(false)}>
                  Fechar
                </button>
              </div>
              <form onSubmit={onSubmit} className="question-form">
                <label className="span-2">
                  Nome do time
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </label>
                <label className="span-2">
                  Tech lead
                  <select
                    value={form.lead_user_id}
                    onChange={(e) => setForm({ ...form, lead_user_id: e.target.value })}
                  >
                    <option value="">Selecione um tech lead</option>
                    {techLeads.map((lead) => (
                      <option key={lead.id} value={lead.id}>{lead.name}</option>
                    ))}
                  </select>
                </label>
                <label className="span-2">
                  Membros
                  <input
                    placeholder="Buscar por nome ou email"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                  <div className="member-grid">
                    {filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className={createMembers.includes(member.id) ? 'member-card active' : 'member-card'}
                        onClick={() => onToggleCreateMember(member.id)}
                      >
                        <span>{member.name}</span>
                        <span className="muted">{member.email}</span>
                      </button>
                    ))}
                  </div>
                </label>
                <div className="form-actions span-2">
                  <button type="submit">Criar time</button>
                  <button type="button" className="secondary" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </button>
                </div>
                <div className="span-2 helper-text">
                  Para criar novos membros, salve o time e use a secao abaixo.
                </div>
              </form>
              {error && <div className="error">{error}</div>}
            </div>
          </div>
        )}
        <ConfirmModal
          open={Boolean(deleteTeamTarget)}
          title="Excluir time"
          message={deleteTeamTarget ? `Deseja deletar o time ${deleteTeamTarget.name}?` : ''}
          confirmLabel="Excluir time"
          danger
          busy={deletingTeam}
          error={deleteTeamError}
          onClose={() => {
            if (deletingTeam) return;
            setDeleteTeamTarget(null);
          }}
          onConfirm={async () => {
            if (!deleteTeamTarget) return;
            setDeletingTeam(true);
            setDeleteTeamError(null);
            setError(null);
            try {
              await apiRequest(`/teams/${deleteTeamTarget.id}`, { method: 'DELETE', token: state.token });
              setDeleteTeamTarget(null);
              await load();
            } catch (err) {
              setDeleteTeamError(err.message);
            } finally {
              setDeletingTeam(false);
            }
          }}
        />
      </div>
    </div>
  );
};

export default AdminTeams;
