import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { DOMAIN_ORDER, LEVEL_LABELS, formatMaturity, levelTone } from '../utils/samm.js';

const polarPoint = (index, total, radius, center = 120) => {
  const angle = (-Math.PI / 2) + ((Math.PI * 2) / total) * index;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius
  };
};

const RadarChart = ({ items }) => {
  const points = items.map((item, index) => {
    const point = polarPoint(index, items.length, (Number(item.maturity_index || 0) / 3) * 82);
    return `${point.x},${point.y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 240 240" className="radar-chart" aria-label="Radar de maturidade">
      {[30, 55, 82].map((radius) => (
        <polygon
          key={radius}
          points={items.map((_, index) => {
            const point = polarPoint(index, items.length, radius);
            return `${point.x},${point.y}`;
          }).join(' ')}
          className="radar-grid"
        />
      ))}
      {items.map((item, index) => {
        const point = polarPoint(index, items.length, 98);
        return (
          <g key={item.domain}>
            <line x1="120" y1="120" x2={point.x} y2={point.y} className="radar-axis" />
            <text x={point.x} y={point.y} className="radar-label">{item.domain}</text>
          </g>
        );
      })}
      <polygon points={points} className="radar-shape" />
      {items.map((item, index) => {
        const point = polarPoint(index, items.length, (Number(item.maturity_index || 0) / 3) * 82);
        return <circle key={item.domain} cx={point.x} cy={point.y} r="4" className="radar-dot" />;
      })}
    </svg>
  );
};

const DonutChart = ({ items }) => {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  const colors = ['#6b7280', '#f07a8c', '#f7b34c', '#54d7c7'];
  let current = 0;

  return (
    <svg viewBox="0 0 180 180" className="donut-chart" aria-label="Distribuição de maturidade">
      {items.map((item, index) => {
        const ratio = Number(item.value || 0) / total;
        const start = current;
        current += ratio;
        const end = current;
        const largeArc = end - start > 0.5 ? 1 : 0;
        const startAngle = (start * Math.PI * 2) - Math.PI / 2;
        const endAngle = (end * Math.PI * 2) - Math.PI / 2;
        const x1 = 90 + Math.cos(startAngle) * 62;
        const y1 = 90 + Math.sin(startAngle) * 62;
        const x2 = 90 + Math.cos(endAngle) * 62;
        const y2 = 90 + Math.sin(endAngle) * 62;
        const d = `M ${x1} ${y1} A 62 62 0 ${largeArc} 1 ${x2} ${y2}`;
        return <path key={item.level} d={d} stroke={colors[index]} strokeWidth="24" fill="none" className="donut-arc" />;
      })}
      <circle cx="90" cy="90" r="42" className="donut-core" />
      <text x="90" y="84" className="donut-value">{total}</text>
      <text x="90" y="103" className="donut-caption">práticas</text>
    </svg>
  );
};

const TrendChart = ({ items }) => {
  if (!items.length) return null;
  const values = items.map((item) => Number(item.maturity_index || 0));
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 24 : 24 + (index * 252) / (values.length - 1);
    const y = 120 - (value / 3) * 96;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 300 140" className="trend-chart" aria-label="Evolução temporal">
      <path d="M24 24 V120 H276" className="trend-axis" />
      {[1, 2, 3].map((tick) => (
        <g key={tick}>
          <line x1="24" y1={120 - (tick / 3) * 96} x2="276" y2={120 - (tick / 3) * 96} className="trend-grid" />
          <text x="8" y={124 - (tick / 3) * 96} className="trend-tick">L{tick}</text>
        </g>
      ))}
      <polyline points={points} className="trend-line" />
      {values.map((value, index) => {
        const x = values.length === 1 ? 24 : 24 + (index * 252) / (values.length - 1);
        const y = 120 - (value / 3) * 96;
        return <circle key={`${items[index].assessment_id}-${x}`} cx={x} cy={y} r="4" className="trend-dot" />;
      })}
    </svg>
  );
};

const FunnelChart = ({ items }) => {
  const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);
  return (
    <div className="funnel">
      {items.map((item, index) => (
        <div
          key={item.label}
          className="funnel-step"
          style={{ width: `${52 + (Number(item.value || 0) / max) * 48}%`, animationDelay: `${index * 80}ms` }}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
};

const HeatmapPanel = ({ analytics }) => (
  <article className="panel">
    <div className="panel-header">
      <h2>Heatmap de práticas</h2>
      <span>{analytics.overview.scoped_practices || analytics.practices.length} práticas no escopo</span>
    </div>
    <div className="heatmap heatmap-matrix">
      {analytics.heatmap.map((domain) => {
        const weakestPractice = [...domain.practices].sort((a, b) => {
          if (a.current_level !== b.current_level) return a.current_level - b.current_level;
          const aAverage = a.cells.reduce((sum, cell) => sum + cell.value, 0) / Math.max(a.cells.length, 1);
          const bAverage = b.cells.reduce((sum, cell) => sum + cell.value, 0) / Math.max(b.cells.length, 1);
          return aAverage - bAverage;
        })[0];

        return (
          <div key={domain.domain} className="heatmap-domain">
            <div className="heatmap-domain-header">
              <div className="heatmap-domain-title">{domain.domain}</div>
            </div>
            <div className="heatmap-practice-grid">
              {domain.practices.map((practice) => (
                <div
                  key={practice.practice_key}
                  className={`heatmap-practice-card ${weakestPractice?.practice_key === practice.practice_key ? 'is-critical' : ''}`}
                >
                  <div className="heatmap-practice-card-head">
                    <div className="heatmap-practice-card-title">
                      <strong>{practice.practice_name}</strong>
                      {weakestPractice?.practice_key === practice.practice_key && (
                        <span className="heatmap-priority-badge">Prioridade</span>
                      )}
                    </div>
                    <small>Nível atual {LEVEL_LABELS[practice.current_level] || 'L0'}</small>
                  </div>
                  <div className="heatmap-cells">
                    {practice.cells.map((cell) => (
                      <div
                        key={`${practice.practice_key}-${cell.level}`}
                        className={`heatmap-cell ${cell.available ? levelTone(cell.value) : 'muted'}`}
                      >
                        <span>L{cell.level}</span>
                        <strong>{cell.available ? `${cell.value}%` : 'N/A'}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </article>
);

const TeamAssessmentsModal = ({ teamName, assessments, statusFilter, onStatusFilterChange, onSelectAssessment, onClose }) => (
  <div className="modal-overlay">
    <div className="modal">
      <div className="modal-header">
        <div>
          <h2>{teamName}</h2>
          <div className="helper-text">Histórico de avaliações da squad selecionada.</div>
        </div>
        <button className="modal-close" type="button" onClick={onClose}>
          Fechar
        </button>
      </div>
      <div className="modal-toolbar">
        <div className="helper-text">Filtrar por status</div>
        <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} className="select-compact">
          <option value="all">Todos</option>
          <option value="finished">Finalizado</option>
          <option value="draft">Rascunho</option>
        </select>
      </div>
      <div className="table">
        <div className="table-row table-head assessments-modal-row">
          <span>Assessment</span>
          <span>Status</span>
          <span>Início</span>
          <span>Fim</span>
          <span>Ações</span>
        </div>
        {assessments.map((assessment) => (
          <div key={assessment.id} className="table-row assessments-modal-row">
            <span>{assessment.id.slice(0, 8)}</span>
            <span>{assessment.status}</span>
            <span>{assessment.started_at ? new Date(assessment.started_at).toLocaleDateString() : '-'}</span>
            <span>{assessment.finished_at ? new Date(assessment.finished_at).toLocaleDateString() : '-'}</span>
            <span className="actions">
              <button
                type="button"
                className="secondary"
                disabled={assessment.status !== 'finished'}
                onClick={() => onSelectAssessment(assessment.id)}
              >
                Ver resultado
              </button>
            </span>
          </div>
        ))}
        {!assessments.length && (
          <div className="table-row assessments-modal-row">
            <span>Nenhuma avaliação registrada.</span>
            <span>-</span>
            <span>-</span>
            <span>-</span>
            <span>-</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const MemberDashboard = ({ analytics, assessments, campaigns, selectedAssessmentId }) => {
  const navigate = useNavigate();
  const domainMap = useMemo(
    () => new Map((analytics?.domains || []).map((item) => [item.domain, item])),
    [analytics]
  );

  return (
    <>
      <section className="metrics-grid">
        <article className="metric-card">
          <span>Resultado da squad</span>
          <strong>{selectedAssessmentId ? selectedAssessmentId.slice(0, 8) : 'Mais recente'}</strong>
          <small>assessment da sua squad</small>
        </article>
        <article className="metric-card">
          <span>Maturidade média</span>
          <strong>{formatMaturity(analytics?.overview?.avg_maturity)}</strong>
          <small>recorte das squads em que você participa</small>
        </article>
        <article className="metric-card">
          <span>Práticas em risco</span>
          <strong>{analytics?.overview?.practices_at_risk || 0}</strong>
          <small>dentro do escopo realmente avaliado</small>
        </article>
        <article className="metric-card">
          <span>Assessments finalizados</span>
          <strong>{assessments.filter((item) => item.status === 'finished').length}</strong>
          <small>histórico visível da sua squad</small>
        </article>
      </section>

      {analytics && analytics.domains?.length > 0 && (
        <>
          <section className="analytics-grid analytics-grid-top">
            <article className="panel">
              <div className="panel-header">
                <h2>Resultado por domínio</h2>
                <span>o que a sua squad já avaliou</span>
              </div>
              <div className="chart-panel">
                <RadarChart items={DOMAIN_ORDER.map((domain) => domainMap.get(domain)).filter(Boolean)} />
                <div className="legend-list">
                  {DOMAIN_ORDER.map((domain) => {
                    const item = domainMap.get(domain);
                    if (!item) return null;
                    return (
                      <div key={domain} className="legend-item">
                        <strong>{domain}</strong>
                        <span>{formatMaturity(item.maturity_index)}</span>
                        <small>Mais fraco: {item.weakest_practice || '-'}</small>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <h2>Onde atacar primeiro</h2>
                <span>roadmap sugerido</span>
              </div>
              <div className="roadmap-list">
                {analytics.roadmap.slice(0, 4).map((item) => (
                  <div key={item.practice_key} className="roadmap-item">
                    <div className="roadmap-meta">
                      <span className={`status-pill ${item.urgency === 'critical' ? 'pending' : 'active'}`}>{item.quarter}</span>
                      <strong>{item.domain}</strong>
                    </div>
                    <h3>{item.practice_name}</h3>
                    <p>{item.focus}</p>
                    <small>Atual {LEVEL_LABELS[item.current_level] || 'L0'} {'->'} Alvo {LEVEL_LABELS[item.target_level]}</small>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="analytics-grid analytics-grid-bottom">
            <HeatmapPanel analytics={analytics} />
          </section>
        </>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2>Minhas campanhas</h2>
          <span>acompanhe a campanha e entre na call com contexto</span>
        </div>
        <div className="table">
          <div className="table-row table-head">
            <span>Campanha</span>
            <span>Status</span>
            <span>Início</span>
            <span>Ações</span>
          </div>
          {campaigns.map((campaign) => {
            const latestAssessment = assessments.find((item) => item.campaign_id === campaign.id && item.status === 'finished');
            return (
              <div key={campaign.id} className="table-row">
                <span>{campaign.name}</span>
                <span>{campaign.status}</span>
                <span>{campaign.starts_at ? new Date(campaign.starts_at).toLocaleDateString() : '-'}</span>
                <span className="actions">
                  {latestAssessment ? (
                    <button type="button" className="primary" onClick={() => navigate(`/?assessment=${latestAssessment.id}`)}>
                      Ver resultado
                    </button>
                  ) : (
                    <button type="button" className="primary" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                      Ver campanha
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
};

const LeadershipDashboard = ({ analytics, assessments, role }) => {
  const navigate = useNavigate();
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const domainMap = useMemo(
    () => new Map((analytics?.domains || []).map((item) => [item.domain, item])),
    [analytics]
  );
  const latestAssessments = assessments.slice(0, 6);
  const selectedTeamAssessments = useMemo(
    () => assessments
      .filter((item) => item.team_id === selectedTeamId)
      .filter((item) => (statusFilter === 'all' ? true : item.status === statusFilter))
      .sort((a, b) => new Date(b.finished_at || b.created_at) - new Date(a.finished_at || a.created_at)),
    [assessments, selectedTeamId, statusFilter]
  );
  const selectedTeamName =
    selectedTeamAssessments[0]?.team_name ||
    analytics.teams.find((team) => team.team_id === selectedTeamId)?.team_name ||
    'Squad';

  return (
    <>
      <section className="metrics-grid">
        <article className="metric-card">
          <span>Maturidade média</span>
          <strong>{formatMaturity(analytics.overview.avg_maturity)}</strong>
          <small>índice consolidado de 0 a 3</small>
        </article>
        <article className="metric-card">
          <span>Nível médio</span>
          <strong>{formatMaturity(analytics.overview.avg_level)}</strong>
          <small>maturidade efetiva das práticas avaliadas</small>
        </article>
        <article className="metric-card">
          <span>{role === 'tech_lead' ? 'Squads lideradas' : 'Squads avaliados'}</span>
          <strong>{analytics.overview.squads_assessed}</strong>
          <small>{role === 'tech_lead' ? 'somente times sob sua liderança' : 'últimas avaliações válidas por time'}</small>
        </article>
        <article className="metric-card">
          <span>Práticas em risco</span>
          <strong>{analytics.overview.practices_at_risk}</strong>
          <small>nível atual L0 ou L1</small>
        </article>
        <article className="metric-card">
          <span>Roadmap ativo</span>
          <strong>{analytics.overview.roadmap_items}</strong>
          <small>itens priorizados para execução</small>
        </article>
        <article className="metric-card">
          <span>Avaliações concluídas</span>
          <strong>{analytics.overview.total_assessments}</strong>
          <small>base histórica usada nos gráficos</small>
        </article>
      </section>

      <section className="analytics-grid analytics-grid-top">
        <article className="panel">
          <div className="panel-header">
            <h2>Radar das 5 áreas</h2>
            <span>{role === 'tech_lead' ? 'resultado das squads lideradas' : 'visão executiva'}</span>
          </div>
          <div className="chart-panel">
            <RadarChart items={DOMAIN_ORDER.map((domain) => domainMap.get(domain)).filter(Boolean)} />
            <div className="legend-list">
              {DOMAIN_ORDER.map((domain) => {
                const item = domainMap.get(domain);
                if (!item) return null;
                return (
                  <div key={domain} className="legend-item">
                    <strong>{domain}</strong>
                    <span>{formatMaturity(item.maturity_index)}</span>
                    <small>Fragilidade: {item.weakest_practice || 'n/a'}</small>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Distribuição por nível</h2>
            <span>gráfico de pizza</span>
          </div>
          <div className="chart-panel chart-panel-split">
            <DonutChart items={analytics.distribution} />
            <div className="legend-list">
              {analytics.distribution.map((item) => (
                <div key={item.level} className="legend-item">
                  <strong>{item.label}</strong>
                  <span>{item.value} práticas</span>
                  <small>{item.level === 0 ? 'sem processo confiável' : `maturidade ${LEVEL_LABELS[item.level]}`}</small>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="analytics-grid analytics-grid-middle">
        <HeatmapPanel analytics={analytics} />
      </section>

      <section className="analytics-grid analytics-grid-bottom">
        <article className="panel">
          <div className="panel-header">
            <h2>Fluxo contínuo SAMM</h2>
            <span>assessment até reassessment</span>
          </div>
          <FunnelChart items={analytics.funnel} />
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Evolução histórica</h2>
            <span>maturidade consolidada</span>
          </div>
          {!analytics.timeline.length && <p>Nenhuma avaliação finalizada ainda.</p>}
          {!!analytics.timeline.length && (
            <>
              <TrendChart items={analytics.timeline} />
              <div className="timeline-strip">
                {analytics.timeline.slice(-5).map((item) => (
                  <div key={item.assessment_id} className="timeline-chip">
                    <strong>{item.team_name}</strong>
                    <span>{new Date(item.finished_at).toLocaleDateString()}</span>
                    <small>{formatMaturity(item.maturity_index)}</small>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </section>

      <section className="analytics-grid analytics-grid-middle">
        <article className="panel roadmap-panel">
          <div className="panel-header">
            <h2>{role === 'tech_lead' ? 'Onde atacar primeiro' : 'Roadmap priorizado'}</h2>
            <span>{role === 'tech_lead' ? 'fraquezas das squads lideradas' : 'gap analysis em execução'}</span>
          </div>
          <div className="roadmap-list">
            {analytics.roadmap.map((item) => (
              <div key={item.practice_key} className="roadmap-item">
                <div className="roadmap-meta">
                  <span className={`status-pill ${item.urgency === 'critical' ? 'pending' : 'active'}`}>{item.quarter}</span>
                  <strong>{item.domain}</strong>
                </div>
                <h3>{item.practice_name}</h3>
                <p>{item.focus}</p>
                <small>Atual {LEVEL_LABELS[item.current_level] || 'L0'} {'->'} Alvo {LEVEL_LABELS[item.target_level]}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>{role === 'tech_lead' ? 'Squads sob sua liderança' : 'Comparativo entre squads'}</h2>
          <span>{role === 'tech_lead' ? 'somente times e membros que você lidera' : 'última fotografia por time'}</span>
        </div>
        <div className="table">
          <div className="table-row table-head">
            <span>Squad</span>
            <span>Maturidade</span>
            <span>Ponto fraco</span>
            <span>Reavaliado em</span>
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

      <section className="panel">
        <div className="panel-header">
          <h2>Avaliações recentes</h2>
          <span>operação em andamento</span>
        </div>
        <div className="table">
          <div className="table-row table-head">
            <span>Squad</span>
            <span>Status</span>
            <span>Início</span>
            <span>Fim</span>
          </div>
          {latestAssessments.map((assessment) => (
              <button
                key={assessment.id}
                type="button"
                className="table-row table-row-button"
                onClick={() => {
                  setSelectedTeamId(assessment.team_id);
                  setStatusFilter('all');
                }}
              >
                <span>{assessment.team_name || '-'}</span>
                <span>{assessment.status}</span>
                <span>{assessment.started_at ? new Date(assessment.started_at).toLocaleDateString() : '-'}</span>
                <span>{assessment.finished_at ? new Date(assessment.finished_at).toLocaleDateString() : '-'}</span>
              </button>
          ))}
          {!latestAssessments.length && (
            <div className="table-row">
              <span>Nenhuma avaliação registrada.</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          )}
        </div>
      </section>

      {selectedTeamId && (
        <TeamAssessmentsModal
          teamName={selectedTeamName}
          assessments={selectedTeamAssessments}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onSelectAssessment={(assessmentId) => navigate(`/?assessment=${assessmentId}`)}
          onClose={() => setSelectedTeamId(null)}
        />
      )}
    </>
  );
};

const Dashboard = () => {
  const { state, dispatch } = useApp();
  const [searchParams] = useSearchParams();
  const [analytics, setAnalytics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const selectedAssessmentId = searchParams.get('assessment');
  const role = state.user?.role;

  useEffect(() => {
    if (state.user?.must_change_password) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const analyticsPath = selectedAssessmentId
          ? `/assessments/analytics?assessment_id=${selectedAssessmentId}`
          : '/assessments/analytics';

        const requests = [
          apiRequest('/assessments', { token: state.token }),
          apiRequest(analyticsPath, { token: state.token })
        ];

        if (role === 'member') {
          requests.push(apiRequest('/campaigns', { token: state.token }));
        }

        const [assessmentsData, analyticsData, campaignsData = []] = await Promise.all(requests);
        dispatch({ type: 'SET_ASSESSMENTS', payload: assessmentsData });
        setAnalytics(analyticsData);
        setCampaigns(campaignsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dispatch, role, selectedAssessmentId, state.token, state.user?.must_change_password]);

  const heroCopy = {
    admin: {
      eyebrow: 'Painel de governança SAMM',
      title: 'Programa de maturidade de segurança de software.',
      description: 'Visão completa de governança, maturidade, gaps, roadmap e reavaliação de todas as squads.'
    },
    tech_lead: {
      eyebrow: 'Painel de liderança',
      title: 'Acompanhe apenas as squads que você lidera.',
      description: 'Visibilidade restrita aos times sob sua liderança e aos membros dessas squads, com foco em onde atacar primeiro.'
    },
    facilitator: {
      eyebrow: 'Painel de facilitação',
      title: 'Conduza assessments com visão completa do programa.',
      description: 'Acompanhe campanhas, tendências e prioridades para facilitar workshops por prática com contexto consistente.'
    },
    member: {
      eyebrow: 'Painel da squad',
      title: 'Participe do assessment com contexto da sua squad.',
      description: 'Veja as campanhas do seu time, acompanhe resultados já consolidados e entre na call com contexto.'
    }
  };

  const hero = heroCopy[role] || heroCopy.member;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard dashboard-roomy governance-dashboard">
        <header className="dash-header dashboard-hero">
          <div>
            <span className="eyebrow">{hero.eyebrow}</span>
            <h1>{hero.title}</h1>
            <p>{hero.description}</p>
          </div>
          <div className="hero-note">
            <span>{role}</span>
            <strong>{state.user?.email}</strong>
          </div>
        </header>

        {error && <div className="error">{error}</div>}
        {loading && <div className="panel">Carregando análises...</div>}

        {!loading && analytics && role === 'member' && (
          <MemberDashboard
            analytics={analytics}
            assessments={state.assessments}
            campaigns={campaigns}
            selectedAssessmentId={selectedAssessmentId}
          />
        )}

        {!loading && analytics && (role === 'admin' || role === 'facilitator' || role === 'tech_lead') && (
          <LeadershipDashboard analytics={analytics} assessments={state.assessments} role={role} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
