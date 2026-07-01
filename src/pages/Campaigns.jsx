import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const Campaigns = () => {
  const { state } = useApp();
  const role = state.user?.role;
  const canCreateCampaign = role === 'admin';
  const canToggleCampaign = role === 'admin' || role === 'facilitator' || role === 'tech_lead';
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [toggleError, setToggleError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const campaignsData = await apiRequest('/campaigns', { token: state.token });
      setCampaigns(campaignsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [state.token, state.user?.role]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard">
        <header className="dash-header">
          <div>
            <h1>Campanhas</h1>
            <p>Veja o escopo das campanhas e acompanhe a condução dos assessments por prática.</p>
          </div>
          {canCreateCampaign && (
            <button onClick={() => navigate('/admin/assignments')} className="primary">
              Nova campanha
            </button>
          )}
        </header>

        <section className="panel">
          <div className="panel-header">
            <h2>Campanhas</h2>
            {loading && <span>Carregando...</span>}
          </div>
          <div className="table">
            <div className="table-row table-head">
              <span>Nome</span>
              <span>Status</span>
              <span>Avaliações</span>
              <span>Início</span>
              <span>Ações</span>
            </div>
            {campaigns.map((c) => (
              <div key={c.id} className="table-row campaigns-row">
                <span>{c.name}</span>
                <span>
                  <span className={`status-pill ${c.status}`}>
                    {c.status}
                  </span>
                </span>
                <span>{c.assessment_count || 0}</span>
                <span>{c.starts_at ? new Date(c.starts_at).toLocaleDateString() : '-'}</span>
                <span className="actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      if (c.status === 'closed') {
                        setAlertOpen(true);
                        return;
                      }
                      navigate(`/campaigns/${c.id}`);
                    }}
                    aria-label="Acompanhar campanha"
                    title="Acompanhar campanha"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    </svg>
                  </button>
                  {canToggleCampaign && (
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        setToggleError(null);
                        setToggleTarget(c);
                      }}
                      aria-label={c.status === 'closed' ? 'Ativar campanha' : 'Desativar campanha'}
                      title={c.status === 'closed' ? 'Ativar campanha' : 'Desativar campanha'}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        {c.status === 'closed'
                          ? <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 5v4h4v2h-4v4h-2v-4H7v-2h4V7Z" />
                          : <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm5 11H7v-2h10Z" />}
                      </svg>
                    </button>
                  )}
                  {canCreateCampaign && (
                    <button
                      type="button"
                      className="icon-button danger"
                      disabled={c.status !== 'closed'}
                      onClick={async () => {
                        if (c.status !== 'closed') {
                          setError('Desative a campanha antes de excluir.');
                          return;
                        }
                        setDeleteTarget(c);
                      }}
                      aria-label="Excluir campanha"
                      title={c.status === 'closed' ? 'Excluir campanha e avaliações vinculadas' : 'Desative antes de excluir'}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 3h6l1 2h5v2H3V5h5l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Z" />
                      </svg>
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
        {error && <div className="error">{error}</div>}
        {alertOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
            <h2>Campanha desativada</h2>
                <button className="modal-close" type="button" onClick={() => setAlertOpen(false)}>
                  Fechar
                </button>
              </div>
              <div className="helper-text">
                Esta campanha está desativada. Ative ou crie uma nova rodada para continuar o acompanhamento.
              </div>
            </div>
          </div>
        )}
        {deleteTarget && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Confirmar exclusão</h2>
                <button className="modal-close" type="button" onClick={() => setDeleteTarget(null)}>
                  Fechar
                </button>
              </div>
              <div className="helper-text">
                Deseja excluir esta campanha e remover {deleteTarget.assessment_count || 0} avaliações vinculadas?
              </div>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setDeleteTarget(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={async () => {
                    setError(null);
                    try {
                      await apiRequest(`/campaigns/${deleteTarget.id}`, { method: 'DELETE', token: state.token });
                      setDeleteTarget(null);
                      await load();
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Excluir campanha
                </button>
              </div>
            </div>
          </div>
        )}
        <ConfirmModal
          open={Boolean(toggleTarget)}
          title={toggleTarget?.status === 'closed' ? 'Ativar campanha' : 'Desativar campanha'}
          message={toggleTarget
            ? (toggleTarget.status === 'closed'
              ? 'Deseja ativar novamente esta campanha?'
              : 'Deseja desativar esta campanha?')
            : ''}
          confirmLabel={toggleTarget?.status === 'closed' ? 'Ativar campanha' : 'Desativar campanha'}
          busy={toggleBusy}
          error={toggleError}
          onClose={() => {
            if (toggleBusy) return;
            setToggleTarget(null);
          }}
          onConfirm={async () => {
            if (!toggleTarget) return;
            const isClosed = toggleTarget.status === 'closed';
            setToggleBusy(true);
            setToggleError(null);
            setError(null);
            try {
              if (isClosed) {
                await apiRequest(`/campaigns/${toggleTarget.id}/status`, {
                  method: 'PUT',
                  token: state.token,
                  body: { status: 'active' }
                });
              } else {
                await apiRequest(`/campaigns/${toggleTarget.id}/deactivate`, { method: 'PUT', token: state.token });
              }
              setToggleTarget(null);
              await load();
            } catch (err) {
              setToggleError(err.message);
            } finally {
              setToggleBusy(false);
            }
          }}
        />
      </div>
    </div>
  );
};

export default Campaigns;
