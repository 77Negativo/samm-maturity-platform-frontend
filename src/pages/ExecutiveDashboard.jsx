import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { DOMAIN_ORDER, formatMaturity } from '../utils/samm.js';

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
    <svg viewBox="0 0 240 240" className="radar-chart" aria-label="Radar SAMM executivo">
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

const valueTone = (value) => {
  if (value < 1) return 'critical';
  if (value < 1.8) return 'attention';
  if (value < 2.4) return 'good';
  return 'excellent';
};

const deltaTone = (value) => {
  if (value === null || value === undefined) return 'neutral';
  if (value < 0) return 'critical';
  if (value < 0.15) return 'attention';
  return 'excellent';
};

const formatDelta = (value) => {
  if (value === null || value === undefined) return 'sem baseline';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatMaturity(value)}`;
};

const scoreWidth = (value, max = 3) => `${Math.max(8, (Number(value || 0) / max) * 100)}%`;

const yearKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return String(date.getUTCFullYear());
};

const investmentLabel = (practiceKey, practiceName) => {
  const mapping = {
    'des-threat-modeling': 'Threat Modeling',
    'ver-security-testing': 'DAST',
    'imp-dependency-build-security': 'Container Security',
    'imp-code-review-gates': 'Secure Pipeline',
    'ops-monitoring-detection': 'Monitoring & Detection'
  };
  return mapping[practiceKey] || practiceName;
};

const priorityReason = (item) => {
  const reasons = [];
  if ((item?.affected_squads || 0) >= 3) reasons.push(`${item.affected_squads} squads afetadas`);
  if ((item?.critical_squads || 0) > 0) reasons.push(`${item.critical_squads} em situação crítica`);
  if ((item?.trend_delta ?? 0) <= 0) reasons.push('sem evolução recente');
  if ((item?.gap || 0) >= 2) reasons.push('gap alto até o alvo');
  return reasons.slice(0, 2).join(' • ') || 'precisa de reforço executivo';
};

const ExecutiveDashboard = () => {
  const { state } = useApp();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const role = state.user?.role;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const analyticsData = await apiRequest('/assessments/analytics', { token: state.token });
        setAnalytics(analyticsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [state.token]);

  const latestTeamDomains = useMemo(() => {
    if (!analytics?.timeline?.length) return [];
    const latestMap = new Map();
    analytics.timeline.forEach((item) => {
      const current = latestMap.get(item.team_name);
      const itemDate = new Date(item.finished_at || 0).getTime();
      const currentDate = new Date(current?.finished_at || 0).getTime();
      if (!current || itemDate >= currentDate) latestMap.set(item.team_name, item);
    });
    return analytics.teams
      .map((team) => {
        const latest = latestMap.get(team.team_name);
        return {
          ...team,
          domains: latest?.domains || []
        };
      });
  }, [analytics]);

  const annualTrend = useMemo(() => {
    if (!analytics?.timeline?.length) return [];
    return Array.from(
      analytics.timeline.reduce((map, item) => {
        const key = yearKey(item.finished_at);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(Number(item.maturity_index || 0));
        return map;
      }, new Map()).entries()
    )
      .map(([year, values]) => ({
        year,
        maturity_index: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
      }))
      .sort((a, b) => Number(a.year) - Number(b.year));
  }, [analytics]);

  const topMature = useMemo(
    () => [...(analytics?.teams || [])].sort((a, b) => b.maturity_index - a.maturity_index).slice(0, 5),
    [analytics]
  );
  const topCritical = useMemo(
    () => [...(analytics?.teams || [])].sort((a, b) => a.maturity_index - b.maturity_index).slice(0, 5),
    [analytics]
  );

  const investmentPriorities = useMemo(() => (
    analytics?.reports?.executive?.priority_practices || []
  ).map((item) => ({
    ...item,
    investment_label: investmentLabel(item.practice_key, item.practice_name)
  })), [analytics]);

  const pipelineCoverage = useMemo(() => {
    const matrix = analytics?.reports?.technical?.team_practice_matrix || [];
    const total = matrix.length || 1;
    const countTeams = (predicate) => matrix.filter(predicate).length;
    const hasLevel = (team, practiceKey, minLevel) =>
      (team.practices.find((item) => item.practice_key === practiceKey)?.current_level || 0) >= minLevel;

    const sast = countTeams((team) => hasLevel(team, 'ver-security-testing', 1));
    const secrets = countTeams((team) => hasLevel(team, 'imp-code-review-gates', 2));
    const dependency = countTeams((team) => hasLevel(team, 'imp-dependency-build-security', 1));

    return [
      { label: 'Repos com SAST', teams: sast, coverage: Number(((sast / total) * 100).toFixed(0)) },
      { label: 'Repos com secrets scan', teams: secrets, coverage: Number(((secrets / total) * 100).toFixed(0)) },
      { label: 'Repos com dependency scan', teams: dependency, coverage: Number(((dependency / total) * 100).toFixed(0)) }
    ];
  }, [analytics]);

  const riskMetrics = useMemo(() => {
    if (!analytics) return null;
    const totalTeams = analytics.overview.squads_assessed || 1;
    const totalPractices = analytics.practices.length || 1;
    const squadsBelow = analytics.reports.executive.squads_below_target.length;
    const practicesAtRisk = analytics.overview.practices_at_risk;
    const lowOpsTeams = latestTeamDomains.filter((team) => {
      const ops = team.domains.find((item) => item.domain === 'Operations');
      return (ops?.maturity_index || 0) < 1.5;
    }).length;
    const lowVerificationTeams = latestTeamDomains.filter((team) => {
      const verification = team.domains.find((item) => item.domain === 'Verification');
      return (verification?.maturity_index || 0) < 1.5;
    }).length;
    const avgPipelineCoverage = pipelineCoverage.reduce((sum, item) => sum + item.coverage, 0) / Math.max(pipelineCoverage.length, 1);
    const avgMaturity = Number(analytics.overview.avg_maturity || 0);

    return {
      riskExposure: Math.min(100, Math.round((((practicesAtRisk / totalPractices) * 0.45) + ((squadsBelow / totalTeams) * 0.35) + ((3 - avgMaturity) / 3) * 0.2) * 100)),
      attackSurface: Math.min(100, Math.round((((lowOpsTeams / totalTeams) * 0.6) + (((3 - avgMaturity) / 3) * 0.4)) * 100)),
      meanTimeToFix: `${Math.max(4, Math.round((lowVerificationTeams / totalTeams) * 18 + (3 - avgMaturity) * 6))} dias`,
      vulnerabilityDensity: Number((((practicesAtRisk / totalPractices) * 4.2) + ((3 - avgMaturity) * 0.8)).toFixed(2)),
      securityFriction: `${Math.min(100, Math.round((100 - avgPipelineCoverage) * 0.45 + ((3 - avgMaturity) / 3) * 55))}%`
    };
  }, [analytics, latestTeamDomains, pipelineCoverage]);

  const executiveSummary = analytics?.reports?.executive || null;
  const quarterlyTrend = analytics?.reports?.analytical?.quarterly_trend || [];

  const hero = {
    admin: {
      eyebrow: 'Dashboard executiva de segurança',
      title: 'Segurança melhora quando você mede maturidade.',
      description: 'Painel dedicado à visão gerencial, comparação entre squads, cobertura de pipeline e exposição a risco.'
    },
    tech_lead: {
      eyebrow: 'Visão executiva',
      title: 'Segurança melhora quando você mede maturidade.',
      description: 'Visão executiva restrita às squads que você lidera, com foco em risco e investimento.'
    },
    facilitator: {
      eyebrow: 'Visão de facilitação',
      title: 'Segurança melhora quando você mede maturidade.',
      description: 'Visão executiva para facilitadores, com foco em priorização, risco recorrente e preparação das próximas rodadas.'
    }
  }[role] || {
    eyebrow: 'Dashboard executiva de segurança',
    title: 'Segurança melhora quando você mede maturidade.',
    description: 'Painel executivo.'
  };

  if (role !== 'admin') {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="dashboard dashboard-roomy">
          <div className="panel">A dashboard executiva é restrita a administradores.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard dashboard-roomy governance-dashboard executive-dashboard">
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
        {loading && <div className="panel">Carregando dashboard executiva...</div>}

        {!loading && analytics && (
          <>
            <section className="metrics-grid executive-metrics">
              <article className="metric-card">
                <span>Score médio da empresa</span>
                <strong>{formatMaturity(executiveSummary?.org_maturity)} / 3</strong>
                <small>
                  {executiveSummary?.latest_quarter
                    ? `${role === 'tech_lead' ? 'squads sob sua liderança' : 'programa'} em ${executiveSummary.latest_quarter}`
                    : role === 'tech_lead' ? 'squads sob sua liderança' : 'programa'}
                </small>
              </article>
              <article className="metric-card">
                <span>Evolução recente</span>
                <strong className={deltaTone(executiveSummary?.org_delta)}>{formatDelta(executiveSummary?.org_delta)}</strong>
                <small>
                  {executiveSummary?.previous_quarter
                    ? `vs. ${executiveSummary.previous_quarter}`
                    : 'sem trimestre anterior comparável'}
                </small>
              </article>
              <article className="metric-card">
                <span>Squads críticas</span>
                <strong>{executiveSummary?.squads_below_target?.length || 0}</strong>
                <small>abaixo de 1.5 de maturidade</small>
              </article>
              <article className="metric-card">
                <span>Práticas prioritárias</span>
                <strong>{investmentPriorities.length}</strong>
                <small>baixo score com alto impacto recorrente</small>
              </article>
            </section>

            <section className="analytics-grid executive-overview-grid">
              <article className="panel executive-panel-large">
                <div className="panel-header">
                  <h2>Radar de maturidade</h2>
                  <span>{analytics.overview.scoped_practices} práticas avaliadas no escopo atual</span>
                </div>
                <div className="chart-panel">
                  <RadarChart items={DOMAIN_ORDER.map((domain) => analytics.domains.find((item) => item.domain === domain)).filter(Boolean)} />
                  <div className="legend-list">
                    {analytics.domains.map((domain) => (
                      <div key={domain.domain} className="legend-item">
                        <strong>{domain.domain}</strong>
                        <span>{formatMaturity(domain.maturity_index)}</span>
                        <small>Mais fraco: {domain.weakest_practice || '-'}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <h2>Prioridades de investimento</h2>
                  <span>baixo score + alto impacto + recorrência</span>
                </div>
                <div className="risk-list">
                  {investmentPriorities.map((item, index) => (
                    <div key={item.practice_key} className="risk-card">
                      <strong>{index + 1}. {item.investment_label}</strong>
                      <span>{item.domain} • score {formatMaturity(item.maturity_index)} / alvo {item.target_level}</span>
                      <small>{priorityReason(item)}</small>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="analytics-grid executive-comparison-grid">
              <article className="panel">
                <div className="panel-header">
                  <h2>Times mais maduros</h2>
                  <span>ranking atual</span>
                </div>
                <div className="ranking-list">
                  {(executiveSummary?.strongest_squads || topMature).map((team, index) => (
                    <div key={`top-${team.team_id}`} className="ranking-row">
                      <div>
                        <strong>{index + 1}. {team.team_name}</strong>
                        <small>{team.weakest_domain || 'Sem ponto fraco dominante'}</small>
                      </div>
                      <div className="ranking-meta">
                        <span>{formatMaturity(team.maturity_index)}</span>
                        <small className={deltaTone(team.delta_maturity)}>{formatDelta(team.delta_maturity)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <h2>Times mais fracos</h2>
                  <span>pedem apoio gerencial</span>
                </div>
                <div className="ranking-list">
                  {(executiveSummary?.weakest_squads || topCritical).map((team, index) => (
                    <div key={`critical-${team.team_id}`} className="ranking-row">
                      <div>
                        <strong>{index + 1}. {team.team_name}</strong>
                        <small>{team.weakest_domain || 'Sem ponto fraco dominante'}</small>
                      </div>
                      <div className="ranking-meta">
                        <span>{formatMaturity(team.maturity_index)}</span>
                        <small className={deltaTone(team.delta_maturity)}>{formatDelta(team.delta_maturity)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Heatmap por squad</h2>
                <span>onde está mais fraco</span>
              </div>
              <div className="executive-heatmap-table">
                <div className="executive-heatmap-row executive-heatmap-head">
                  <span>Squad</span>
                  {DOMAIN_ORDER.map((domain) => <span key={domain}>{domain}</span>)}
                </div>
                {latestTeamDomains.map((team) => (
                  <div key={team.team_id} className="executive-heatmap-row">
                    <span>{team.team_name}</span>
                    {DOMAIN_ORDER.map((domain) => {
                      const item = team.domains.find((entry) => entry.domain === domain);
                      return (
                        <span key={`${team.team_id}-${domain}`} className={`executive-heat-cell ${valueTone(item?.maturity_index || 0)}`}>
                          {formatMaturity(item?.maturity_index || 0)}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            <section className="analytics-grid executive-overview-grid">
              <article className="panel">
                <div className="panel-header">
                  <h2>Evolução</h2>
                  <span>maturidade média por trimestre</span>
                </div>
                <div className="annual-trend-list">
                  {quarterlyTrend.map((item) => (
                    <div key={item.quarter} className="annual-trend-row">
                      <strong>{item.quarter}</strong>
                      <div className="report-bar-track">
                        <div className={`report-bar-fill ${valueTone(item.maturity_index)}`} style={{ width: scoreWidth(item.maturity_index) }} />
                      </div>
                      <span>{formatMaturity(item.maturity_index)} <small>({item.squads} squads)</small></span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <h2>Prioridades acionáveis</h2>
                  <span>práticas mais fracas</span>
                </div>
                <div className="priority-stack">
                  {investmentPriorities.map((item) => (
                    <div key={`priority-${item.practice_key}`} className="priority-row">
                      <div>
                        <strong>{item.investment_label}</strong>
                        <small>{item.domain}</small>
                      </div>
                      <div>
                        <span>Score {formatMaturity(item.maturity_index)}</span>
                        <small>Gap {item.gap}</small>
                      </div>
                      <div>
                        <span>{item.affected_squads} squads</span>
                        <small className={deltaTone(item.trend_delta)}>{formatDelta(item.trend_delta)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="analytics-grid executive-overview-grid">
              <article className="panel">
                <div className="panel-header">
                  <h2>Indicadores executivos</h2>
                  <span>leitura complementar de risco</span>
                </div>
                <div className="risk-metric-grid">
                  <div className="risk-card">
                    <strong>Risk Exposure Score</strong>
                    <span>{riskMetrics?.riskExposure}</span>
                    <small>combina práticas em risco, squads abaixo do alvo e score médio.</small>
                  </div>
                  <div className="risk-card">
                    <strong>Attack Surface Score</strong>
                    <span>{riskMetrics?.attackSurface}</span>
                    <small>derivado da maturidade operacional mais baixa.</small>
                  </div>
                  <div className="risk-card">
                    <strong>Security Friction</strong>
                    <span>{riskMetrics?.securityFriction}</span>
                    <small>quanto a segurança ainda depende de esforço manual.</small>
                  </div>
                  <div className="risk-card">
                    <strong>Mean Time To Fix</strong>
                    <span>{riskMetrics?.meanTimeToFix}</span>
                    <small>proxy de velocidade de reação em verification.</small>
                  </div>
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <h2>Comparativo de squads</h2>
                  <span>score, tendência e ponto fraco</span>
                </div>
                <div className="table">
                  <div className="table-row table-head">
                    <span>Squad</span>
                    <span>Score</span>
                    <span>Tendência</span>
                    <span>Ponto fraco</span>
                    <span>Reavaliado em</span>
                  </div>
                  {analytics.teams.map((team) => (
                    <div key={team.team_id} className="table-row">
                      <span>{team.team_name}</span>
                      <span>{formatMaturity(team.maturity_index)}</span>
                      <span className={deltaTone(team.delta_maturity)}>{formatDelta(team.delta_maturity)}</span>
                      <span>{team.weakest_domain || '-'}</span>
                      <span>{team.finished_at ? new Date(team.finished_at).toLocaleDateString() : '-'}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
