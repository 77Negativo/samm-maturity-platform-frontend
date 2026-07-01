import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { DOMAIN_ORDER, LEVEL_LABELS, formatMaturity, levelTone } from '../utils/samm.js';

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const [campaign, setCampaign] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmError, setConfirmError] = useState(null);

  const loadCampaign = async () => {
    const [campaignData, analyticsData] = await Promise.all([
      apiRequest(`/campaigns/${id}`, { token: state.token }),
      apiRequest(`/assessments/analytics?campaign_id=${id}`, { token: state.token })
    ]);
    setCampaign(campaignData);
    setAnalytics(analyticsData);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadCampaign();
      } catch (err) {
        setError(err.message);
      }
    };
    load();
  }, [id, state.token, state.user?.role]);

  const domainMap = useMemo(
    () => new Map((analytics?.domains || []).map((item) => [item.domain, item])),
    [analytics]
  );

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard dashboard-roomy governance-dashboard">
        <header className="dash-header dashboard-hero">
          <div>
            <span className="eyebrow">Governança da campanha</span>
            <h1>{campaign?.name || 'Campanha'}</h1>
            <p>
              A campanha acompanha a evolução de maturidade por squad e por prática, sempre com base
              em evidências, gaps e reavaliações.
            </p>
          </div>
          <div className="hero-note">
            <span>{campaign?.status || 'carregando'}</span>
            <strong>{campaign?.assessment_count || 0} avaliações</strong>
          </div>
        </header>

        {error && <div className="error">{error}</div>}

        <section className="panel">
          <div className="panel-header">
            <h2>Escopo da campanha</h2>
            {(state.user?.role === 'admin' || state.user?.role === 'facilitator' || state.user?.role === 'tech_lead') && campaign?.id && (
              <span className="actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    const isClosed = campaign.status === 'closed';
                    setConfirmError(null);
                    setConfirmAction({
                      title: isClosed ? 'Ativar campanha' : 'Desativar campanha',
                      message: isClosed ? 'Deseja ativar novamente esta campanha?' : 'Deseja desativar esta campanha?',
                      confirmLabel: isClosed ? 'Ativar campanha' : 'Desativar campanha',
                      danger: false,
                      run: async () => {
                        if (isClosed) {
                          await apiRequest(`/campaigns/${campaign.id}/status`, {
                            method: 'PUT',
                            token: state.token,
                            body: { status: 'active' }
                          });
                        } else {
                          await apiRequest(`/campaigns/${campaign.id}/deactivate`, { method: 'PUT', token: state.token });
                        }
                        await loadCampaign();
                      }
                    });
                  }}
                >
                  {campaign.status === 'closed' ? 'Ativar campanha' : 'Desativar campanha'}
                </button>
                {state.user?.role === 'admin' && (
                  <button
                    type="button"
                    className="danger"
                    disabled={busy || campaign.status !== 'closed'}
                    onClick={() => {
                      if (campaign.status !== 'closed') {
                        setError('Desative a campanha antes de excluir.');
                        return;
                      }
                      setConfirmError(null);
                      setConfirmAction({
                        title: 'Excluir campanha',
                        message: `Deseja excluir esta campanha e remover ${campaign.assessment_count || 0} avaliações vinculadas?`,
                        confirmLabel: 'Excluir campanha',
                        danger: true,
                        run: async () => {
                          await apiRequest(`/campaigns/${campaign.id}`, { method: 'DELETE', token: state.token });
                          navigate('/campaigns');
                        }
                      });
                    }}
                  >
                    Excluir campanha
                  </button>
                )}
              </span>
            )}
            {(state.user?.role === 'admin' || state.user?.role === 'facilitator' || state.user?.role === 'tech_lead') && campaign?.id && campaign?.status === 'active' && (
              <button
                className="primary"
                onClick={() => navigate(`/questionnaire?campaign=${campaign.id}`)}
              >
                Conduzir assessment
              </button>
            )}
            {state.user?.role === 'member' && campaign?.id && (
              <span className="helper-text">Participação da squad ocorre em call conduzida por facilitador ou tech lead.</span>
            )}
          </div>
          <div className="helper-text">
            Avaliações vinculadas a esta campanha: <strong>{campaign?.assessment_count || 0}</strong>
          </div>
          <div className="helper-text">
            Nível alvo da campanha: <strong>{LEVEL_LABELS[campaign?.target_level] || '-'}</strong>
          </div>
          <div className="pill-grid">
            {(campaign?.domains || []).map((domain) => (
              <span key={domain} className="pill active">{domain}</span>
            ))}
          </div>
          <div className="pill-grid">
            {(campaign?.practices || []).map((practice) => (
              <span key={practice.practice_key} className="pill">
                {practice.practice_name}
              </span>
            ))}
          </div>
        </section>

        {analytics && (
          <>
            <section className="metrics-grid">
              <article className="metric-card">
                <span>Assessments finalizados</span>
                <strong>{analytics.overview.total_assessments}</strong>
                <small>base da campanha</small>
              </article>
              <article className="metric-card">
                <span>Squads respondentes</span>
                <strong>{analytics.overview.squads_assessed}</strong>
                <small>times com foto atual</small>
              </article>
              <article className="metric-card">
                <span>Maturidade média</span>
                <strong>{formatMaturity(analytics.overview.avg_maturity)}</strong>
                <small>índice consolidado</small>
              </article>
              <article className="metric-card">
                <span>Práticas em risco</span>
                <strong>{analytics.overview.practices_at_risk}</strong>
                <small>prioridade de ação</small>
              </article>
            </section>

            <section className="analytics-grid analytics-grid-bottom">
              <article className="panel">
                <div className="panel-header">
                  <h2>Domínios prioritários</h2>
                  <span>visão rápida por área</span>
                </div>
                <div className="domain-summary-grid">
                  {DOMAIN_ORDER.map((domain) => {
                    const item = domainMap.get(domain);
                    if (!item) return null;
                    return (
                      <div key={domain} className="domain-summary-card">
                        <span>{domain}</span>
                        <strong>{formatMaturity(item.maturity_index)}</strong>
                        <small>Fragilidade: {item.weakest_practice || 'n/a'}</small>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <h2>Roadmap da campanha</h2>
                  <span>próximos incrementos</span>
                </div>
                <div className="roadmap-list">
                  {analytics.roadmap.slice(0, 6).map((item) => (
                    <div key={item.practice_key} className="roadmap-item">
                      <div className="roadmap-meta">
                        <span className={`status-pill ${item.urgency === 'critical' ? 'pending' : 'active'}`}>{item.quarter}</span>
                        <strong>{item.domain}</strong>
                      </div>
                      <h3>{item.practice_name}</h3>
                      <p>{item.focus}</p>
                      <small>
                        Atual {LEVEL_LABELS[item.current_level] || 'L0'} {'->'} Alvo {LEVEL_LABELS[item.target_level]}
                      </small>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Heatmap da campanha</h2>
                <span>nível atual e prontidão por prática</span>
              </div>
              <div className="heatmap campaign-heatmap-matrix">
                {analytics.heatmap
                  .filter((domain) => !campaign?.domains?.length || campaign.domains.includes(domain.domain))
                  .map((domain) => (
                    <div key={domain.domain} className="heatmap-domain">
                      <div className="heatmap-domain-title">{domain.domain}</div>
                      <div className="heatmap-head">
                        <span>Prática</span>
                        <span>L1</span>
                        <span>L2</span>
                        <span>L3</span>
                      </div>
                      {domain.practices.map((practice) => (
                        <div key={practice.practice_key} className="heatmap-row">
                          <div className="heatmap-practice">
                            <strong>{practice.practice_name}</strong>
                            <small>Nível atual {LEVEL_LABELS[practice.current_level] || 'L0'}</small>
                          </div>
                          <div className="heatmap-cells">
                            {practice.cells.map((cell) => (
                              <div
                                key={`${practice.practice_key}-${cell.level}`}
                                className={`heatmap-cell ${levelTone(cell.value)}`}
                              >
                                <span>L{cell.level}</span>
                                <strong>{cell.value}%</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Squads da campanha</h2>
                <span>acompanhamento e reavaliação</span>
              </div>
              <div className="table">
                <div className="table-row table-head">
                  <span>Squad</span>
                  <span>Maturidade</span>
                  <span>Ponto fraco</span>
                  <span>Última resposta</span>
                </div>
                {analytics.teams.map((team) => (
                  <div key={team.team_id} className="table-row">
                    <span>{team.team_name}</span>
                    <span>{formatMaturity(team.maturity_index)}</span>
                    <span>{team.weakest_domain || '-'}</span>
                    <span>{team.finished_at ? new Date(team.finished_at).toLocaleDateString() : '-'}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        <ConfirmModal
          open={Boolean(confirmAction)}
          title={confirmAction?.title || 'Confirmar ação'}
          message={confirmAction?.message || ''}
          confirmLabel={confirmAction?.confirmLabel || 'Confirmar'}
          danger={Boolean(confirmAction?.danger)}
          busy={busy}
          error={confirmError}
          onClose={() => {
            if (busy) return;
            setConfirmAction(null);
          }}
          onConfirm={async () => {
            if (!confirmAction?.run) return;
            setBusy(true);
            setError(null);
            setConfirmError(null);
            try {
              await confirmAction.run();
              setConfirmAction(null);
            } catch (err) {
              setConfirmError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </div>
  );
};

export default CampaignDetail;
