import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import { apiDownload, apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { DOMAIN_ORDER, LEVEL_LABELS, formatMaturity } from '../utils/samm.js';

const toneClass = (value) => {
  if (value < 1) return 'critical';
  if (value < 1.5) return 'attention';
  if (value < 2.3) return 'good';
  return 'excellent';
};

const progressWidth = (value) => `${Math.max(6, (Number(value || 0) / 3) * 100)}%`;
const DOMAIN_OPTIONS = ['Governance', 'Design', 'Implementation', 'Verification', 'Operations'];
const REPORT_TAB_LABELS = {
  executive: 'Executivo',
  analytical: 'Analítico',
  technical: 'Técnico'
};

const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))
  ].join('\n');
};

const downloadCsv = (filename, rows) => {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const ReportTabs = ({ value, onChange }) => (
  <div className="report-tabs" role="tablist" aria-label="Tipos de relatório">
    {[
      { id: 'executive', label: 'Executivo' },
      { id: 'analytical', label: 'Analítico' },
      { id: 'technical', label: 'Técnico' }
    ].map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={value === tab.id}
        className={`report-tab ${value === tab.id ? 'active' : ''}`}
        onClick={() => onChange(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

const DomainScoreList = ({ domains }) => (
  <div className="report-domain-list">
    {DOMAIN_ORDER.map((domainName) => domains.find((item) => item.domain === domainName)).filter(Boolean).map((domain) => (
      <div key={domain.domain} className="report-domain-row">
        <div>
          <strong>{domain.domain}</strong>
          <small>Mais fraco: {domain.weakest_practice || '-'}</small>
        </div>
        <div className="report-bar-track">
          <div className={`report-bar-fill ${toneClass(domain.maturity_index)}`} style={{ width: progressWidth(domain.maturity_index) }} />
        </div>
        <span>{formatMaturity(domain.maturity_index)}</span>
      </div>
    ))}
  </div>
);

const formatDelta = (value, asPct = false) => {
  if (!Number.isFinite(value)) return null;
  const signal = value > 0 ? '+' : '';
  return asPct ? `${signal}${value.toFixed(2)} pp` : `${signal}${value.toFixed(2)}`;
};

const IndicatorsGrid = ({ indicators = {}, periodComparison = null }) => {
  const cards = [
    { key: 'scope_coverage_pct', label: 'Cobertura do escopo', value: `${Number(indicators.scope_coverage_pct || 0).toFixed(1)}%`, detail: 'práticas avaliadas na rodada', asPct: true },
    { key: 'dataset_quality_pct', label: 'Qualidade do dataset', value: `${Number(indicators.dataset_quality_pct || 0).toFixed(1)}%`, detail: 'assessments válidos no snapshot', asPct: true },
    { key: 'critical_squads_pct', label: 'Exposição crítica', value: `${Number(indicators.critical_squads_pct || 0).toFixed(1)}%`, detail: 'squads abaixo de 1.5', asPct: true },
    { key: 'residual_risk_index', label: 'Risco residual', value: formatMaturity(indicators.residual_risk_index || 0), detail: 'prioridade média das práticas' },
    { key: 'recurring_gap_pct', label: 'Recorrência de gap', value: `${Number(indicators.recurring_gap_pct || 0).toFixed(1)}%`, detail: 'gaps sem evolução positiva', asPct: true },
    { key: 'stability_score', label: 'Estabilidade', value: formatMaturity(indicators.stability_score || 0), detail: 'consistência entre squads' }
  ];
  return (
    <section className="metrics-grid">
      {cards.map((card) => (
        <article key={card.label} className="metric-card">
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          {periodComparison?.deltas && Number.isFinite(periodComparison.deltas[card.key]) ? (
            <small>{`vs período anterior: ${formatDelta(periodComparison.deltas[card.key], card.asPct)}`}</small>
          ) : (
            <small>{card.detail}</small>
          )}
        </article>
      ))}
    </section>
  );
};

const ExecutiveReport = ({ analytics, role }) => (
  <div className="report-stack">
    <section className="metrics-grid">
      <article className="metric-card">
        <span>Maturidade média</span>
        <strong>{formatMaturity(analytics.reports.executive.org_maturity)}</strong>
        <small>{role === 'tech_lead' ? 'squads sob sua liderança' : 'programa atual'}</small>
      </article>
      <article className="metric-card">
        <span>Squads avaliadas</span>
        <strong>{analytics.overview.squads_assessed}</strong>
        <small>base usada no scorecard executivo</small>
      </article>
      <article className="metric-card">
        <span>Práticas em risco</span>
        <strong>{analytics.overview.practices_at_risk}</strong>
        <small>onde investir primeiro</small>
      </article>
      <article className="metric-card">
        <span>Squads abaixo de 1.5</span>
        <strong>{analytics.reports.executive.squads_below_target.length}</strong>
        <small>prioridade de apoio gerencial</small>
      </article>
    </section>

    <section className="panel">
      <div className="panel-header">
        <h2>Indicadores de gestão</h2>
        <span>saúde do programa e consistência do score</span>
      </div>
      <IndicatorsGrid indicators={analytics.reports.executive.indicators} periodComparison={analytics.period_comparison} />
      <div className="table">
        <div className="table-row table-head">
          <span>Indicador</span>
          <span>Valor</span>
          <span>Meta</span>
          <span>Status</span>
        </div>
        {Object.entries(analytics.reports.executive.indicator_targets || {}).map(([key, cfg]) => (
          <div key={key} className="table-row">
            <span>{key}</span>
            <span>{cfg.value}</span>
            <span>{cfg.target}</span>
            <span>{cfg.status}</span>
          </div>
        ))}
      </div>
    </section>

    <section className="analytics-grid analytics-grid-top">
      <article className="panel">
        <div className="panel-header">
          <h2>Resumo por domínio</h2>
          <span>visão rápida para decisão</span>
        </div>
        <DomainScoreList domains={analytics.domains} />
      </article>

      <article className="panel">
        <div className="panel-header">
          <h2>Top riscos</h2>
          <span>menor maturidade consolidada</span>
        </div>
        <div className="risk-list">
          {analytics.reports.executive.top_risks.map((risk, index) => (
            <div key={risk.practice_key} className="risk-card">
              <strong>{index + 1}. {risk.practice_name}</strong>
              <span>{risk.domain}</span>
              <small>{risk.affected_squads} squads com nível baixo</small>
            </div>
          ))}
        </div>
      </article>
    </section>

    <section className="analytics-grid analytics-grid-top">
      <article className="panel">
        <div className="panel-header">
          <h2>Alertas de anomalia</h2>
          <span>regressão, exposição e estagnação</span>
        </div>
        <div className="risk-list">
          {(analytics.anomaly_alerts || []).map((alert, index) => (
            <div key={`${alert.type}-${index}`} className="risk-card">
              <strong>{alert.title}</strong>
              <span>{alert.severity}</span>
              <small>{alert.detail}</small>
            </div>
          ))}
          {!analytics.anomaly_alerts?.length && (
            <div className="risk-card">
              <strong>Sem alertas críticos no período</strong>
              <small>Não foram detectadas anomalias relevantes.</small>
            </div>
          )}
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <h2>Confiabilidade do dataset</h2>
          <span>completude, validade e amostragem</span>
        </div>
        <div className="metrics-grid">
          <article className="metric-card">
            <span>Score de confiabilidade</span>
            <strong>{Number(analytics.data_reliability?.score || 0).toFixed(1)}%</strong>
            <small>quanto maior, maior confiança no diagnóstico</small>
          </article>
        </div>
        {(analytics.data_reliability?.warnings || []).length > 0 && (
          <div className="risk-list">
            {analytics.data_reliability.warnings.map((warning) => (
              <div key={warning} className="risk-card">
                <strong>Atenção</strong>
                <small>{warning}</small>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>

    <section className="analytics-grid analytics-grid-top">
      <article className="panel">
        <div className="panel-header">
          <h2>Benchmark interno</h2>
          <span>squads comparadas por porte</span>
        </div>
        <div className="table">
          <div className="table-row table-head">
            <span>Squad</span>
            <span>Porte</span>
            <span>Score</span>
            <span>Percentil</span>
          </div>
          {(analytics.benchmark || []).slice(0, 10).map((team) => (
            <div key={team.team_id} className="table-row">
              <span>{team.team_name}</span>
              <span>{team.segment}</span>
              <span>{formatMaturity(team.team_score)}</span>
              <span>{team.percentile}%</span>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <h2>Ações recomendadas</h2>
          <span>priorizadas por risco e gap</span>
        </div>
        <div className="risk-list">
          {(analytics.recommended_actions || []).map((item) => (
            <div key={item.practice_key} className="risk-card">
              <strong>{item.rank}. {item.practice_name}</strong>
              <span>{item.owner_suggested}</span>
              <small>{item.action} ETA: {item.eta_weeks} semanas.</small>
            </div>
          ))}
        </div>
      </article>
    </section>

    <section className="panel">
      <div className="panel-header">
        <h2>Drill-down de indicadores</h2>
        <span>top fatores causadores por métrica</span>
      </div>
      <div className="table">
        <div className="table-row table-head">
          <span>Indicador</span>
          <span>Top drivers</span>
        </div>
        {Object.entries(analytics.indicator_drilldown || {}).map(([key, entries]) => (
          <div key={key} className="table-row">
            <span>{key}</span>
            <span>{(entries || []).slice(0, 3).map((item) => item.practice_name || item.team_name || item.title || item.practice_key || '-').join(', ') || '-'}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const AnalyticalReport = ({ analytics }) => (
  <div className="report-stack">
    <section className="metrics-grid">
      <article className="metric-card">
        <span>Delta médio por quarter</span>
        <strong>{analytics.reports.analytical.indicators.mean_quarter_delta === null ? '-' : formatMaturity(analytics.reports.analytical.indicators.mean_quarter_delta)}</strong>
        <small>evolução média trimestre a trimestre</small>
      </article>
      <article className="metric-card">
        <span>Recorrência de gap</span>
        <strong>{Number(analytics.reports.analytical.indicators.recurring_gap_pct || 0).toFixed(1)}%</strong>
        <small>práticas com gap sem melhora</small>
      </article>
      <article className="metric-card">
        <span>Cobertura de escopo</span>
        <strong>{Number(analytics.reports.analytical.indicators.scope_coverage_pct || 0).toFixed(1)}%</strong>
        <small>proporção de práticas no cálculo</small>
      </article>
      <article className="metric-card">
        <span>Estabilidade entre squads</span>
        <strong>{formatMaturity(analytics.reports.analytical.indicators.stability_score || 0)}</strong>
        <small>desvio consolidado por prática</small>
      </article>
    </section>

    <section className="analytics-grid analytics-grid-top">
      <article className="panel">
        <div className="panel-header">
          <h2>Evolução trimestral</h2>
          <span>tendência de maturidade</span>
        </div>
        <div className="quarter-grid">
          {analytics.reports.analytical.quarterly_trend.map((item) => (
            <div key={item.quarter} className="quarter-card">
              <div className="quarter-card-head">
                <strong>{item.quarter}</strong>
                <span>{formatMaturity(item.maturity_index)}</span>
              </div>
              <div className="report-bar-track tall">
                <div className={`report-bar-fill ${toneClass(item.maturity_index)}`} style={{ width: progressWidth(item.maturity_index) }} />
              </div>
              <small>{item.squads} squads consideradas</small>
            </div>
          ))}
          {!analytics.reports.analytical.quarterly_trend.length && (
            <p>Nenhuma série histórica consolidada ainda.</p>
          )}
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <h2>Distribuição de maturidade</h2>
          <span>squads por faixa L0 a L3</span>
        </div>
        <div className="distribution-stack">
          {analytics.reports.analytical.squad_distribution.map((item) => (
            <div key={item.level} className="distribution-row">
              <strong>{item.label}</strong>
              <div className="report-bar-track">
                <div className={`report-bar-fill ${toneClass(item.level)}`} style={{ width: `${Math.max(8, item.squads * 18)}%` }} />
              </div>
              <span>{item.squads} squads</span>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <h2>Tendência rolling 3 meses</h2>
          <span>suaviza oscilações de período curto</span>
        </div>
        <div className="quarter-grid">
          {(analytics.reports.analytical.rolling_3m_trend || []).map((item) => (
            <div key={item.month} className="quarter-card">
              <div className="quarter-card-head">
                <strong>{item.month}</strong>
                <span>{formatMaturity(item.maturity_index)}</span>
              </div>
              <div className="report-bar-track tall">
                <div className={`report-bar-fill ${toneClass(item.maturity_index)}`} style={{ width: progressWidth(item.maturity_index) }} />
              </div>
              <small>{item.samples} amostras</small>
            </div>
          ))}
          {!analytics.reports.analytical.rolling_3m_trend?.length && (
            <p>Sem dados suficientes para rolling 3 meses.</p>
          )}
        </div>
      </article>
    </section>

    <section className="analytics-grid analytics-grid-top">
      <article className="panel">
        <div className="panel-header">
          <h2>Maturidade por domínio SAMM</h2>
          <span>onde você está mais fraco</span>
        </div>
        <div className="table">
          <div className="table-row table-head">
            <span>Área</span>
            <span>Score</span>
            <span>Mais fraco</span>
            <span>Tendencia</span>
          </div>
          {analytics.domains.map((domain) => (
            <div key={domain.domain} className="table-row">
              <span>{domain.domain}</span>
              <span>{formatMaturity(domain.maturity_index)}</span>
              <span>{domain.weakest_practice || '-'}</span>
              <span>{domain.current_level >= 2 ? 'estável' : 'atenção'}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <h2>Heatmap de squads</h2>
          <span>qual time está mais fraco</span>
        </div>
        <div className="risk-list">
          {analytics.teams.map((team) => (
            <div key={team.team_id} className={`squad-heat-card ${toneClass(team.maturity_index)}`}>
              <div>
                <strong>{team.team_name}</strong>
                <small>{team.weakest_domain || '-'}</small>
              </div>
              <span>{formatMaturity(team.maturity_index)}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  </div>
);

const DomainMatrix = ({ domain, teams }) => {
  const practices = DOMAIN_ORDER.includes(domain)
    ? (teams[0]?.practices || []).filter((practice) => practice.domain === domain)
    : [];

  if (!practices.length) return null;

  return (
    <article className="panel">
      <div className="panel-header">
        <h2>{domain}</h2>
        <span>matriz técnica por prática</span>
      </div>
      <div className="matrix-scroll">
        <div className="matrix-table">
          <div className="matrix-row matrix-head">
            <span>Prática</span>
            {teams.map((team) => (
              <span key={`${domain}-${team.team_id}`}>{team.team_name}</span>
            ))}
          </div>
          {practices.map((practice) => (
            <div key={practice.practice_key} className="matrix-row">
              <span>{practice.practice_name}</span>
              {teams.map((team) => {
                const item = team.practices.find((entry) => entry.practice_key === practice.practice_key);
                return (
                  <span key={`${practice.practice_key}-${team.team_id}`} className={`matrix-score ${toneClass(item?.maturity_index || 0)}`}>
                    {LEVEL_LABELS[item?.current_level] || 'L0'}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
};

const TechnicalReport = ({ analytics }) => {
  const teams = analytics.reports.technical.team_practice_matrix;
  const weakestTeams = [...teams]
    .sort((a, b) => a.maturity_index - b.maturity_index)
    .slice(0, 3);

  return (
    <div className="report-stack">
      <section className="analytics-grid analytics-grid-top">
        <article className="panel">
          <div className="panel-header">
            <h2>Arquitetura do scorecard</h2>
            <span>score final = média das 15 práticas</span>
          </div>
          <div className="scorecard-scale">
            <div className="scorecard-level">
              <strong>L0</strong>
              <small>inexistente</small>
            </div>
            <div className="scorecard-level">
              <strong>L1</strong>
              <small>básico</small>
            </div>
            <div className="scorecard-level">
              <strong>L2</strong>
              <small>padronizado</small>
            </div>
            <div className="scorecard-level">
              <strong>L3</strong>
              <small>avançado</small>
            </div>
          </div>
          <p className="helper-text">
            O score final do squad segue a média das práticas SAMM avaliadas. A meta do sistema continua sendo confiar
            no processo, não em indivíduos.
          </p>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Times que precisam de ataque técnico</h2>
            <span>menor maturidade média</span>
          </div>
          <div className="risk-list">
            {weakestTeams.map((team) => (
              <div key={team.team_id} className="risk-card">
                <strong>{team.team_name}</strong>
                <span>{formatMaturity(team.maturity_index)}</span>
                <small>Atuar primeiro nas práticas L0 e L1 desse time.</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      {DOMAIN_ORDER.map((domain) => (
        <DomainMatrix key={domain} domain={domain} teams={teams} />
      ))}
    </div>
  );
};

const Reports = () => {
  const { state } = useApp();
  const [analytics, setAnalytics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [teams, setTeams] = useState([]);
  const [techLeads, setTechLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('executive');
  const [filters, setFilters] = useState({
    campaign_id: '',
    team_id: '',
    lead_user_id: '',
    domain: '',
    date_from: '',
    date_to: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({
    campaign_id: '',
    team_id: '',
    lead_user_id: '',
    domain: '',
    date_from: '',
    date_to: ''
  });
  const role = state.user?.role;

  const buildFilterSuffix = (sourceFilters) => {
    const params = new URLSearchParams();
    if (sourceFilters.campaign_id) params.set('campaign_id', sourceFilters.campaign_id);
    if (sourceFilters.team_id) params.set('team_id', sourceFilters.team_id);
    if (sourceFilters.lead_user_id) params.set('lead_user_id', sourceFilters.lead_user_id);
    if (sourceFilters.domain) params.set('domain', sourceFilters.domain);
    if (sourceFilters.date_from) params.set('date_from', `${sourceFilters.date_from}T00:00:00.000Z`);
    if (sourceFilters.date_to) params.set('date_to', `${sourceFilters.date_to}T23:59:59.999Z`);
    return params.toString() ? `?${params.toString()}` : '';
  };

  useEffect(() => {
    if (role === 'member') return;
    const loadCampaigns = async () => {
      try {
        const campaignList = await apiRequest('/campaigns', { token: state.token });
        const teamList = await apiRequest('/teams', { token: state.token });
        setCampaigns(campaignList || []);
        setTeams(teamList || []);
        const leadMap = new Map();
        for (const team of teamList || []) {
          if (!team.lead_user_id) continue;
          leadMap.set(team.lead_user_id, { id: team.lead_user_id, name: team.lead_name || 'Tech Lead' });
        }
        setTechLeads(Array.from(leadMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        setCampaigns([]);
        setTeams([]);
        setTechLeads([]);
      }
    };
    loadCampaigns();
  }, [state.token, role]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const suffix = buildFilterSuffix(appliedFilters);
        const analyticsData = await apiRequest(`/assessments/analytics${suffix}`, { token: state.token });
        setAnalytics(analyticsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [state.token, appliedFilters]);

  useEffect(() => {
    document.title = `SAMM Maturity Platform | Relatórios ${REPORT_TAB_LABELS[tab]}`;
  }, [tab]);

  const hero = useMemo(() => {
    if (role === 'admin') {
      return {
        eyebrow: 'SAMM Maturity Platform',
        title: 'Maturidade transformada em decisão.',
        description: 'Visões executiva, analítica e técnica para entender risco, priorizar investimentos e acompanhar squads.'
      };
    }
    if (role === 'facilitator') {
      return {
        eyebrow: 'SAMM Maturity Platform',
        title: 'Leia o programa com foco em condução e prioridade.',
        description: 'O recorte do facilitador destaca tendências, práticas frágeis e squads que precisam de mais preparo nas próximas calls.'
      };
    }
    return {
      eyebrow: 'SAMM Maturity Platform',
      title: 'Veja apenas as squads que você lidera.',
      description: 'O recorte mantém comparações, tendências e práticas mais fracas apenas para os seus times.'
    };
  }, [role]);

  const reportHeaderContext = useMemo(() => {
    const campaign = campaigns.find((item) => String(item.id) === String(appliedFilters.campaign_id));
    const team = teams.find((item) => String(item.id) === String(appliedFilters.team_id));
    const lead = techLeads.find((item) => String(item.id) === String(appliedFilters.lead_user_id));
    return [
      { label: 'Visão', value: REPORT_TAB_LABELS[tab] },
      campaign ? { label: 'Campanha', value: campaign.name } : null,
      team ? { label: 'Squad', value: team.name } : null,
      lead ? { label: 'Tech Lead', value: lead.name } : null,
      appliedFilters.domain ? { label: 'Domínio', value: appliedFilters.domain } : null,
      appliedFilters.date_from ? { label: 'Início', value: new Date(`${appliedFilters.date_from}T00:00:00`).toLocaleDateString('pt-BR') } : null,
      appliedFilters.date_to ? { label: 'Fim', value: new Date(`${appliedFilters.date_to}T00:00:00`).toLocaleDateString('pt-BR') } : null
    ].filter(Boolean);
  }, [appliedFilters, campaigns, teams, techLeads, tab]);

  if (role === 'member') {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="dashboard dashboard-roomy">
          <div className="panel">
            Relatórios executivos e técnicos são restritos a administradores, facilitadores e tech leads.
          </div>
        </div>
      </div>
    );
  }

  const exportCsv = () => {
    if (!analytics) return;
    if (tab === 'executive') {
      downloadCsv('relatorio-executivo.csv', (analytics.teams || []).map((item) => ({
        squad: item.team_name,
        lead: item.lead_name,
        campanha: item.campaign_name,
        maturidade: item.maturity_index,
        delta: item.delta_maturity,
        ponto_fraco: item.weakest_domain
      })));
      return;
    }
    if (tab === 'analytical') {
      downloadCsv('relatorio-analitico.csv', (analytics.reports?.analytical?.quarterly_trend || []).map((item) => ({
        quarter: item.quarter,
        maturidade: item.maturity_index,
        squads: item.squads
      })));
      return;
    }
    downloadCsv('relatorio-tecnico.csv', (analytics.reports?.technical?.team_practice_matrix || []).map((item) => ({
      squad: item.team_name,
      maturidade: item.maturity_index,
      praticas: item.practices.length
    })));
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard dashboard-roomy governance-dashboard reports-page">
        <header className="dash-header dashboard-hero">
          <div className="reports-hero-copy">
            <span className="eyebrow">{hero.eyebrow}</span>
            <h1>{hero.title}</h1>
            <p>{hero.description}</p>
            <div className="report-context-strip">
              {reportHeaderContext.map((item) => (
                <div key={`${item.label}-${item.value}`} className="report-context-chip">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-note reports-hero-note">
            <span>{role}</span>
            <strong>{state.user?.email}</strong>
            <small>Gerado em {new Date().toLocaleString('pt-BR')}</small>
            <button
              type="button"
              className="sidebar-action print-action no-print"
              onClick={() => window.print()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9V3h12v6h2a2 2 0 0 1 2 2v6h-4v4H6v-4H2v-6a2 2 0 0 1 2-2h2Zm2-4v4h8V5H8Zm8 10H8v4h8v-4Zm2 0h2v-4H4v4h2v-2h12v2Z" />
              </svg>
              Imprimir relatório
            </button>
            <button
              type="button"
              className="sidebar-action no-print"
              onClick={exportCsv}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="sidebar-action no-print"
              onClick={() => window.print()}
            >
              Exportar PDF
            </button>
          </div>
        </header>

        <section className="report-print-cover print-only">
          <div className="report-print-cover-top">
            <div>
              <span className="eyebrow">{hero.eyebrow}</span>
              <h1>{hero.title}</h1>
              <p>{hero.description}</p>
            </div>
            <div className="report-print-stamp">
              <span>SAMM Maturity Platform</span>
              <strong>{REPORT_TAB_LABELS[tab]}</strong>
              <small>{state.user?.email}</small>
            </div>
          </div>
          <div className="report-print-meta">
            {reportHeaderContext.map((item) => (
              <div key={`print-${item.label}-${item.value}`} className="report-print-chip">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
            <div className="report-print-chip">
              <span>Gerado em</span>
              <strong>{new Date().toLocaleString('pt-BR')}</strong>
            </div>
          </div>
        </section>

        <div className="no-print">
          <section className="panel">
            <div className="panel-header">
              <h2>Filtros de relatório</h2>
              <span>aplica em dashboard e indicadores</span>
            </div>
            <div className="question-form">
              <label>
                Campanha
                <select
                  value={filters.campaign_id}
                  onChange={(event) => setFilters((prev) => ({ ...prev, campaign_id: event.target.value }))}
                >
                  <option value="">Todas</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Squad
                <select
                  value={filters.team_id}
                  onChange={(event) => setFilters((prev) => ({ ...prev, team_id: event.target.value }))}
                >
                  <option value="">Todas</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Tech Lead
                <select
                  value={filters.lead_user_id}
                  onChange={(event) => setFilters((prev) => ({ ...prev, lead_user_id: event.target.value }))}
                >
                  <option value="">Todos</option>
                  {techLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>{lead.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Domínio
                <select
                  value={filters.domain}
                  onChange={(event) => setFilters((prev) => ({ ...prev, domain: event.target.value }))}
                >
                  <option value="">Todos</option>
                  {DOMAIN_OPTIONS.map((domain) => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </label>
              <label>
                Período inicial
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(event) => setFilters((prev) => ({ ...prev, date_from: event.target.value }))}
                />
              </label>
              <label>
                Período final
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(event) => setFilters((prev) => ({ ...prev, date_to: event.target.value }))}
                />
              </label>
              <div className="form-actions span-2">
                <button
                  type="button"
                  onClick={() => setAppliedFilters(filters)}
                >
                  Aplicar filtro
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    const reset = { campaign_id: '', team_id: '', lead_user_id: '', domain: '', date_from: '', date_to: '' };
                    setFilters(reset);
                    setAppliedFilters(reset);
                  }}
                >
                  Limpar
                </button>
              </div>
            </div>
            {analytics?.period_comparison && (
              <p className="helper-text">
                Comparando{' '}
                {new Date(analytics.period_comparison.current_period.from).toLocaleDateString()} até{' '}
                {new Date(analytics.period_comparison.current_period.to).toLocaleDateString()}
                {' '}com o período anterior de{' '}
                {new Date(analytics.period_comparison.previous_period.from).toLocaleDateString()} até{' '}
                {new Date(analytics.period_comparison.previous_period.to).toLocaleDateString()}.
              </p>
            )}
          </section>
          <ReportTabs value={tab} onChange={setTab} />
        </div>

        {error && <div className="error">{error}</div>}
        {loading && <div className="panel">Carregando relatórios...</div>}

        {!loading && analytics && tab === 'executive' && <ExecutiveReport analytics={analytics} role={role} />}
        {!loading && analytics && tab === 'analytical' && <AnalyticalReport analytics={analytics} />}
        {!loading && analytics && tab === 'technical' && <TechnicalReport analytics={analytics} />}
      </div>
    </div>
  );
};

export default Reports;
