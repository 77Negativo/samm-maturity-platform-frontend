import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { DOMAIN_ORDER, LEVEL_LABELS } from '../utils/samm.js';

const buildGroups = (questions) => {
  const groups = new Map();
  for (const question of questions) {
    if (!groups.has(question.domain)) groups.set(question.domain, new Map());
    const domainGroup = groups.get(question.domain);
    const practiceKey = question.practice_key || `${question.domain}-${question.practice_order || 1}`;
    if (!domainGroup.has(practiceKey)) {
      domainGroup.set(practiceKey, {
        practiceKey,
        practiceName: question.practice_name || `Prática ${question.practice_order || 1}`,
        practiceOrder: question.practice_order || 1,
        roadmapHint: question.roadmap_hint || '',
        evidenceHint: question.evidence_hint || '',
        levels: new Map()
      });
    }
    const practice = domainGroup.get(practiceKey);
    if (!practice.levels.has(question.level)) practice.levels.set(question.level, []);
    practice.levels.get(question.level).push(question);
  }

  return Array.from(groups.entries())
    .map(([domain, practicesMap]) => ({
      domain,
      practices: Array.from(practicesMap.values())
        .sort((a, b) => a.practiceOrder - b.practiceOrder)
        .map((practice) => ({
          ...practice,
          levels: Array.from(practice.levels.entries())
            .map(([level, items]) => ({
              level: Number(level),
              items
            }))
            .sort((a, b) => a.level - b.level)
        }))
    }))
    .sort((a, b) => DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain));
};

const scoreLabels = {
  0: 'Não existe',
  1: 'Inicial',
  2: 'Parcial',
  3: 'Confiável'
};

const sortQuestions = (items) => [...items].sort((a, b) => {
  const domainDiff = DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain);
  if (domainDiff !== 0) return domainDiff;
  if ((a.practice_order || 1) !== (b.practice_order || 1)) {
    return (a.practice_order || 1) - (b.practice_order || 1);
  }
  if (a.level !== b.level) return a.level - b.level;
  return String(a.code || '').localeCompare(String(b.code || ''));
});

const deriveQuestionFlow = (questions, responses, assessmentMode = 'adaptive') => {
  const officialFull = assessmentMode === 'official_full';
  const groups = buildGroups(questions);
  const requiredQuestions = [];
  const practiceStates = [];

  for (const group of groups) {
    for (const practice of group.practices) {
      let state = 'complete';
      let stoppingLevel = null;
      const unlockedLevels = [];

      for (const levelGroup of practice.levels) {
        unlockedLevels.push(levelGroup);
        requiredQuestions.push(...levelGroup.items);
        const scores = levelGroup.items
          .map((question) => responses[question.id])
          .filter((score) => score !== undefined)
          .map((score) => Number(score));

        if (officialFull && scores.length !== levelGroup.items.length) {
          state = 'in_progress';
          stoppingLevel = levelGroup.level;
          continue;
        }

        if (scores.length !== levelGroup.items.length) {
          const average = scores.length
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : 0;
          if (scores.length >= Math.min(3, levelGroup.items.length) && average < 1) {
            state = 'blocked';
            stoppingLevel = levelGroup.level;
            break;
          }
          state = 'in_progress';
          stoppingLevel = levelGroup.level;
          break;
        }

        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        if (!officialFull && average < 2) {
          state = 'blocked';
          stoppingLevel = levelGroup.level;
          break;
        }
        stoppingLevel = levelGroup.level;
      }

      practiceStates.push({
        domain: group.domain,
        practiceKey: practice.practiceKey,
        practiceName: practice.practiceName,
        roadmapHint: practice.roadmapHint,
        evidenceHint: practice.evidenceHint,
        levels: practice.levels,
        unlockedLevels,
        state,
        stoppingLevel
      });
    }
  }

  const requiredQuestionIds = new Set(requiredQuestions.map((question) => question.id));
  const answeredRequiredCount = requiredQuestions.filter((question) => responses[question.id] !== undefined).length;
  const firstPendingIndex = requiredQuestions.findIndex((question) => responses[question.id] === undefined);
  const canFinish = requiredQuestions.length > 0
    && answeredRequiredCount === requiredQuestions.length
    && practiceStates.every((practice) => practice.state !== 'in_progress');

  return {
    groups,
    requiredQuestions,
    requiredQuestionIds,
    practiceStates,
    answeredRequiredCount,
    firstPendingIndex,
    canFinish
  };
};

const getPracticeStatusCopy = (practiceState, targetLevel) => {
  if (!practiceState) {
    return { tone: 'draft', label: 'Aguardando', detail: 'Fluxo ainda não iniciado.' };
  }
  if (practiceState.state === 'blocked') {
    return {
      tone: 'pending',
      label: 'Bloqueado',
      detail: `Progressão interrompida em ${LEVEL_LABELS[practiceState.stoppingLevel]}.`
    };
  }
  if (practiceState.state === 'in_progress') {
    return {
      tone: 'active',
      label: 'Em andamento',
      detail: `Respondendo ${LEVEL_LABELS[practiceState.stoppingLevel]}.`
    };
  }
  return {
    tone: 'ok',
    label: 'Aprovado',
    detail: `Liberado até ${LEVEL_LABELS[practiceState.stoppingLevel || targetLevel]}.`
  };
};

const buildReviewEntry = (entry = {}) => ({
  evidence_summary: entry.evidence_summary || '',
  evidence_attachments: entry.evidence_attachments || '',
  facilitator_notes: entry.facilitator_notes || '',
  gap_summary: entry.gap_summary || '',
  recommendation_summary: entry.recommendation_summary || '',
  action_owner: entry.action_owner || '',
  action_due_date: entry.action_due_date || ''
});

const hasPracticeReviewContent = (entry) => (
  !!(entry?.evidence_summary || entry?.evidence_attachments || entry?.facilitator_notes || entry?.gap_summary || entry?.recommendation_summary || entry?.action_owner || entry?.action_due_date)
);

const hasPracticeChecklistReady = (entry) => (
  !!(entry?.evidence_summary?.trim()
    && entry?.gap_summary?.trim()
    && entry?.recommendation_summary?.trim()
    && entry?.action_owner?.trim()
    && entry?.action_due_date?.trim())
);

const loadCampaignContext = async ({ campaignId, token }) => {
  const campaignData = await apiRequest(`/campaigns/${campaignId}`, { token });
  const assessmentData = await apiRequest('/assessments/start', {
    method: 'POST',
    token,
    body: { team_id: campaignData.team_id, campaign_id: campaignData.id }
  });
  const [selectedQuestions, existingResponses, existingPracticeReviews] = await Promise.all([
    apiRequest(`/assessments/${assessmentData.id}/workshop-questions`, { token }),
    apiRequest(`/assessments/${assessmentData.id}/responses`, { token }),
    apiRequest(`/assessments/${assessmentData.id}/practice-reviews`, { token })
  ]);

  return {
    campaignData,
    assessmentData,
    selectedQuestions: sortQuestions(selectedQuestions),
    existingResponses,
    existingPracticeReviews
  };
};

const FacilitatedQuestionnaire = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign');
  const [campaign, setCampaign] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [notes, setNotes] = useState({});
  const [practiceReviews, setPracticeReviews] = useState({});
  const [currentPracticeKey, setCurrentPracticeKey] = useState(null);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [practiceQuestionIndex, setPracticeQuestionIndex] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const autosaveSnapshotRef = useRef(new Map());

  const applyAssessmentDraft = ({ assessmentData, selectedQuestions = [], existingResponses = [], existingPracticeReviews = [] }) => {
    setQuestions(selectedQuestions);

    const mappedScores = {};
    const mappedNotes = {};
    for (const row of existingResponses) {
      mappedScores[row.question_id] = row.score;
      mappedNotes[row.question_id] = row.notes || '';
    }

    const mappedReviews = {};
    for (const row of existingPracticeReviews) {
      mappedReviews[row.practice_key] = buildReviewEntry(row);
    }

    setAssessment(assessmentData);
    setResponses((prev) => ({ ...mappedScores, ...prev }));
    setNotes((prev) => ({ ...mappedNotes, ...prev }));
    setPracticeReviews((prev) => ({ ...mappedReviews, ...prev }));
    return assessmentData;
  };

  useEffect(() => {
    const load = async () => {
      if (!campaignId) return;
      setLoading(true);
      setError(null);
      try {
        const {
          campaignData,
          assessmentData,
          selectedQuestions,
          existingResponses,
          existingPracticeReviews
        } = await loadCampaignContext({ campaignId, token: state.token });
        setCampaign(campaignData);
        setQuestions(selectedQuestions);
        setResponses({});
        setNotes({});
        setPracticeReviews({});
        setAssessment(null);
        applyAssessmentDraft({ assessmentData, selectedQuestions, existingResponses, existingPracticeReviews });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [campaignId, state.token]);

  const flow = useMemo(
    () => deriveQuestionFlow(questions, responses, campaign?.assessment_mode || 'adaptive'),
    [questions, responses, campaign?.assessment_mode]
  );
  const practiceStates = flow.practiceStates;
  const currentPractice = practiceStates.find((item) => item.practiceKey === currentPracticeKey) || practiceStates[0] || null;
  const currentPracticeQuestions = currentPractice
    ? currentPractice.unlockedLevels.flatMap((levelGroup) => levelGroup.items.map((item) => ({ ...item, unlocked_level: levelGroup.level })))
    : [];
  const isPracticeReviewStep = !!currentPractice && practiceQuestionIndex >= currentPracticeQuestions.length;
  const currentPracticeQuestion = isPracticeReviewStep ? null : currentPracticeQuestions[practiceQuestionIndex] || null;
  const questionCounterLabel = currentPracticeQuestions.length
    ? `${Math.min(practiceQuestionIndex + 1, currentPracticeQuestions.length)}/${currentPracticeQuestions.length}`
    : '0/0';
  const completedPractices = practiceStates.filter((item) => hasPracticeChecklistReady(practiceReviews[item.practiceKey])).length;
  const reviewCompletionCount = practiceStates.filter((item) => hasPracticeReviewContent(practiceReviews[item.practiceKey])).length;
  const progressPercent = practiceStates.length ? Math.round((completedPractices / practiceStates.length) * 100) : 0;
  const checklistCompletionCount = practiceStates.filter((item) => hasPracticeChecklistReady(practiceReviews[item.practiceKey])).length;
  const canFinishWorkshop = flow.canFinish && practiceStates.length > 0 && checklistCompletionCount === practiceStates.length;

  useEffect(() => {
    if (!currentPracticeKey && practiceStates[0]?.practiceKey) {
      setCurrentPracticeKey(practiceStates[0].practiceKey);
      return;
    }
    if (currentPracticeKey && !practiceStates.some((item) => item.practiceKey === currentPracticeKey) && practiceStates[0]?.practiceKey) {
      setCurrentPracticeKey(practiceStates[0].practiceKey);
    }
  }, [currentPracticeKey, practiceStates]);

  useEffect(() => {
    if (!practiceStates.length) {
      setPracticeModalOpen(false);
      setEvidenceModalOpen(false);
    }
  }, [practiceStates.length]);

  useEffect(() => {
    if (!currentPracticeQuestions.length) {
      setPracticeQuestionIndex(0);
      return;
    }
    setPracticeQuestionIndex((prev) => Math.max(0, Math.min(prev, currentPracticeQuestions.length)));
  }, [currentPracticeKey, currentPracticeQuestions.length]);

  const ensureAssessment = async () => {
    if (!campaign?.id) return null;
    if (assessment?.id) return assessment;
    const context = await loadCampaignContext({ campaignId: campaign.id, token: state.token });
    return applyAssessmentDraft(context);
  };

  const persistPractice = async (practiceKey = currentPractice?.practiceKey) => {
    const currentAssessment = await ensureAssessment();
    if (!currentAssessment?.id || !practiceKey) return;
    const practice = practiceStates.find((item) => item.practiceKey === practiceKey);
    if (!practice) return;

    const practicePayload = practice.unlockedLevels
      .flatMap((levelGroup) => levelGroup.items)
      .filter((question) => responses[question.id] !== undefined)
      .map((question) => ({
        question_id: question.id,
        score: Number(responses[question.id]),
        notes: notes[question.id] || ''
      }));

    if (practicePayload.length) {
      await apiRequest(`/assessments/${currentAssessment.id}/responses`, {
        method: 'POST',
        token: state.token,
        body: { responses: practicePayload }
      });
    }

    const review = buildReviewEntry(practiceReviews[practiceKey]);
    if (hasPracticeReviewContent(review)) {
      await apiRequest(`/assessments/${currentAssessment.id}/practice-reviews`, {
        method: 'POST',
        token: state.token,
        body: {
          reviews: [{ practice_key: practiceKey, ...review }]
        }
      });
    }
  };

  const getPracticeMissingAnswers = (practice = currentPractice) => {
    if (!practice) return [];
    return practice.unlockedLevels
      .flatMap((levelGroup) => levelGroup.items)
      .filter((question) => responses[question.id] === undefined);
  };

  const persistCurrentPractice = async () => {
    if (!currentPractice?.practiceKey) return;
    await persistPractice(currentPractice.practiceKey);
  };

  useEffect(() => {
    if (!practiceModalOpen || !currentPractice?.practiceKey) return undefined;

    const practiceKey = currentPractice.practiceKey;
    const practice = practiceStates.find((item) => item.practiceKey === practiceKey);
    if (!practice) return undefined;

    const responsePayload = practice.unlockedLevels
      .flatMap((levelGroup) => levelGroup.items)
      .filter((question) => responses[question.id] !== undefined)
      .map((question) => ({
        question_id: question.id,
        score: Number(responses[question.id]),
        notes: notes[question.id] || ''
      }));
    const review = buildReviewEntry(practiceReviews[practiceKey]);
    const reviewPayload = hasPracticeReviewContent(review) ? review : null;
    const snapshot = JSON.stringify({ responsePayload, reviewPayload });
    const previousSnapshot = autosaveSnapshotRef.current.get(practiceKey);
    if (snapshot === previousSnapshot) return undefined;

    const timeoutId = window.setTimeout(async () => {
      try {
        setAutoSaving(true);
        await persistPractice(practiceKey);
        autosaveSnapshotRef.current.set(practiceKey, snapshot);
      } catch (err) {
        setError(err.message);
      } finally {
        setAutoSaving(false);
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [practiceModalOpen, currentPractice?.practiceKey, practiceStates, responses, notes, practiceReviews]);

  if (!campaignId) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="dashboard dashboard-roomy">
          <div className="panel">
            <h1>Workshop por prática</h1>
            <p>Abra uma campanha ativa para conduzir a avaliação prática a prática.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentPracticeReview = buildReviewEntry(practiceReviews[currentPractice?.practiceKey]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard dashboard-roomy governance-dashboard">
        <header className="dash-header dashboard-hero">
          <div>
            <span className="eyebrow">Workshop por prática</span>
            <h1>{campaign?.name || 'Assessment guiado'}</h1>
            <p>Conduza a conversa por prática, valide evidências reais, registre gaps e feche a rodada com recomendações objetivas.</p>
          </div>
          <div className="hero-note">
            <span>{completedPractices} de {practiceStates.length} práticas</span>
            <strong>{campaign?.domains?.join(' · ') || 'Carregando escopo'}</strong>
          </div>
        </header>

        {error && <div className="error">{error}</div>}
        {loading && <div className="panel">Carregando workshop...</div>}

        {!loading && !!questions.length && (
          <>
            <section className="metrics-grid">
              <article className="metric-card">
                <span>Facilitação</span>
                <strong>{state.user?.role === 'tech_lead' ? 'Tech Lead' : state.user?.role === 'facilitator' ? 'Facilitador' : 'Admin'}</strong>
                <small>assessment conduzido em reunião</small>
              </article>
              <article className="metric-card">
                <span>Nível alvo</span>
                <strong>{LEVEL_LABELS[campaign?.target_level] || '-'}</strong>
                <small>progressão por prática e nível</small>
              </article>
              <article className="metric-card">
                <span>Práticas concluídas</span>
                <strong>{completedPractices}/{practiceStates.length}</strong>
                <small>fechamento por prática</small>
              </article>
              <article className="metric-card">
                <span>Fechamentos registrados</span>
                <strong>{reviewCompletionCount}/{practiceStates.length}</strong>
                <small>checklist completo por prática</small>
              </article>
              <article className="metric-card">
                <span>Progresso</span>
                <strong>{progressPercent}%</strong>
                <small>práticas já discutidas</small>
              </article>
            </section>

            <section className="analytics-grid executive-overview-grid">
              <article className="panel">
                <div className="panel-header">
                  <h2>Roteiro da reunião</h2>
                  <span>condução prática a prática</span>
                </div>
                <div className="practice-workshop-list">
                  {practiceStates.map((practice) => {
                    const statusCopy = getPracticeStatusCopy(practice, campaign?.target_level);
                    const hasReview = hasPracticeReviewContent(practiceReviews[practice.practiceKey]);
                    return (
                      <button
                        key={practice.practiceKey}
                        type="button"
                        className={`practice-workshop-card ${currentPractice?.practiceKey === practice.practiceKey ? 'is-active' : ''}`}
                        onClick={async () => {
                          setError(null);
                          try {
                            if (practiceModalOpen && currentPractice?.practiceKey && currentPractice.practiceKey !== practice.practiceKey) {
                              await persistCurrentPractice();
                            }
                            setCurrentPracticeKey(practice.practiceKey);
                            setPracticeQuestionIndex(0);
                            setPracticeModalOpen(true);
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        <div className="practice-workshop-card-head">
                          <strong>{practice.practiceName}</strong>
                          <span className={`status-pill ${statusCopy.tone}`}>{statusCopy.label}</span>
                        </div>
                        <span>{practice.domain}</span>
                        <small>{statusCopy.detail}</small>
                        <small>{hasReview ? 'Fechamento registrado' : 'Fechamento pendente'}</small>
                      </button>
                    );
                  })}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <h2>Como conduzir esta prática</h2>
                  <span>roteiro da conversa</span>
                </div>
                <div className="practice-session-guide">
                  <div className="practice-scope-card">
                    <strong>1. Processo atual</strong>
                    <span>Peça para a squad explicar como esta prática funciona hoje e em quais cenários ela é obrigatória.</span>
                  </div>
                  <div className="practice-scope-card">
                    <strong>2. Evidência</strong>
                    <span>Valide com artefatos reais: pipeline, PR, runbook, ADR, scanner, ticket, dashboard ou checklist.</span>
                  </div>
                  <div className="practice-scope-card">
                    <strong>3. Nível</strong>
                    <span>Responda somente o nível liberado. Se a média ficar abaixo de 2, a prática para ali.</span>
                  </div>
                  <div className="practice-scope-card">
                    <strong>4. Fechamento</strong>
                    <span>Registre evidência resumida, principal gap e recomendação executável para a próxima rodada.</span>
                  </div>
                </div>
              </article>
            </section>

            <section className="panel">
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    setError(null);
                    try {
                      if (currentPractice?.practiceKey) await persistPractice(currentPractice.practiceKey);
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? 'Salvando...' : 'Salvar workshop'}
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={finishing || !canFinishWorkshop}
                  onClick={async () => {
                    setFinishing(true);
                    setError(null);
                    try {
                      for (const practice of practiceStates) {
                        await persistPractice(practice.practiceKey);
                      }
                      const currentAssessment = await ensureAssessment();
                      if (!currentAssessment?.id) return;
                      await apiRequest(`/assessments/${currentAssessment.id}/finish`, {
                        method: 'POST',
                        token: state.token
                      });
                      navigate(`/?assessment=${currentAssessment.id}`, { replace: true });
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setFinishing(false);
                    }
                  }}
                >
                  {finishing ? 'Finalizando...' : 'Finalizar assessment'}
                </button>
              </div>
              {!canFinishWorkshop && (
                <div className="helper-text">
                  Para finalizar, responda todas as perguntas liberadas e complete o checklist obrigatório da prática: evidência, gap, recomendação, owner e prazo. Observações é opcional.
                </div>
              )}
              {autoSaving && (
                <div className="helper-text">Salvando automaticamente...</div>
              )}
            </section>

            {practiceModalOpen && currentPractice && (
              <div className="modal-overlay">
                <div className="modal member-question-modal practice-workshop-modal">
                  <div className="modal-header member-question-modal-header">
                    <div>
                      <span className="eyebrow">Workshop por prática</span>
                      <h2>{currentPractice.practiceName}</h2>
                      <p>
                        {currentPractice.domain} · até {LEVEL_LABELS[campaign?.target_level] || 'L2'} · {isPracticeReviewStep ? 'Fechamento da prática' : `Pergunta ${Math.min(practiceQuestionIndex + 1, Math.max(currentPracticeQuestions.length, 1))} de ${currentPracticeQuestions.length || 1}`}
                      </p>
                    </div>
                    <button
                      className="modal-close"
                      type="button"
                      onClick={async () => {
                        setSaving(true);
                        setError(null);
                        try {
                          await persistCurrentPractice();
                          setPracticeModalOpen(false);
                          setEvidenceModalOpen(false);
                        } catch (err) {
                          setError(err.message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Fechar
                    </button>
                    <div className="member-modal-progress">
                      <strong>{progressPercent}%</strong>
                      <span>{completedPractices} práticas concluídas</span>
                    </div>
                  </div>

                  <div className="practice-session-panel">
                  <div className="practice-session-meta">
                    <div className="practice-scope-card">
                      <strong>Evidência esperada</strong>
                      <span>{currentPractice.evidenceHint || 'Registrar evidência concreta do processo.'}</span>
                    </div>
                  </div>

                    {!isPracticeReviewStep && currentPracticeQuestion && (
                      <div className="practice-level-stack">
                        <div className="practice-level-card">
                          <div className="practice-level-card-head">
                            <h3>{LEVEL_LABELS[currentPracticeQuestion.unlocked_level]} liberado</h3>
                            <span>{questionCounterLabel} perguntas selecionadas</span>
                          </div>
                          <div className="practice-question-stack">
                            <div className="member-question-card">
                              <div className="member-question-context">
                                <span>{currentPracticeQuestion.code || 'Pergunta'}</span>
                                <strong>{currentPracticeQuestion.domain}</strong>
                              </div>
                              <div className="helper-text">
                                {`Prática: ${currentPracticeQuestion.practice_key || currentPractice.practiceKey} · Stream: ${currentPracticeQuestion.stream_key || 'A'} · Nível: ${LEVEL_LABELS[currentPracticeQuestion.level] || `L${currentPracticeQuestion.level}`}${currentPracticeQuestion.activity_key ? ` · Activity: ${currentPracticeQuestion.activity_key}` : ''}`}
                              </div>
                              <p>{currentPracticeQuestion.text}</p>
                              <div className="score-choice-row">
                                {[0, 1, 2, 3].map((score) => (
                                  <button
                                    key={`${currentPracticeQuestion.id}-${score}`}
                                    type="button"
                                    className={`score-choice ${responses[currentPracticeQuestion.id] === score ? 'is-selected' : ''}`}
                                    aria-pressed={responses[currentPracticeQuestion.id] === score}
                                    onClick={() => setResponses((prev) => ({ ...prev, [currentPracticeQuestion.id]: score }))}
                                  >
                                    <strong>{score}</strong>
                                    <span>{scoreLabels[score]}</span>
                                  </button>
                                ))}
                              </div>
                              <textarea
                                placeholder="Observação específica da pergunta ou link para o artefato"
                                value={notes[currentPracticeQuestion.id] || ''}
                                onChange={(e) => setNotes((prev) => ({ ...prev, [currentPracticeQuestion.id]: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {isPracticeReviewStep ? (
                      <>
                        <div className="practice-scope-card">
                          <strong>Fechamento desta prática</strong>
                          <span>Agora registre um resumo único da prática: o que a squad mostrou, o que ainda falta e qual deve ser o próximo passo mais útil.</span>
                        </div>

                        <div className="practice-review-grid">
                          <label className="practice-review-field">
                            Existe evidências do processo?
                            <small>Registre o fato concreto que sustentou a avaliação, como pipeline, PR, checklist, runbook, dashboard ou documento.</small>
                            <textarea
                              value={currentPracticeReview.evidence_summary}
                              onChange={(e) => setPracticeReviews((prev) => ({
                                ...prev,
                                [currentPractice.practiceKey]: { ...buildReviewEntry(prev[currentPractice.practiceKey]), evidence_summary: e.target.value }
                              }))}
                              placeholder="Exemplo: o time mostrou branch protection ativa, template de PR com checklist de segurança e scanner rodando na pipeline."
                            />
                          </label>
                          <label className="practice-review-field">
                            Observações (opcional)
                            <small>Use este campo para registrar contexto importante que ajude a interpretar a prática depois. Não bloqueia finalização.</small>
                            <textarea
                              value={currentPracticeReview.facilitator_notes}
                              onChange={(e) => setPracticeReviews((prev) => ({
                                ...prev,
                                [currentPractice.practiceKey]: { ...buildReviewEntry(prev[currentPractice.practiceKey]), facilitator_notes: e.target.value }
                              }))}
                              placeholder="Exemplo: a prática existe nos serviços mais novos, mas ainda não foi adotada nos sistemas legados da squad."
                            />
                          </label>
                          <label className="practice-review-field">
                            O que mais está faltando nesta prática?
                            <small>Descreva o principal bloqueador para a squad avançar de nível. Foque em um ponto principal.</small>
                            <textarea
                              value={currentPracticeReview.gap_summary}
                              onChange={(e) => setPracticeReviews((prev) => ({
                                ...prev,
                                [currentPractice.practiceKey]: { ...buildReviewEntry(prev[currentPractice.practiceKey]), gap_summary: e.target.value }
                              }))}
                              placeholder="Exemplo: o processo depende do conhecimento de poucas pessoas e ainda não existe padrão adotado por toda a squad."
                            />
                          </label>
                          <label className="practice-review-field">
                            Qual deve ser o próximo passo?
                            <small>Escreva uma ação objetiva, viável e útil para a próxima rodada de melhoria.</small>
                            <textarea
                              value={currentPracticeReview.recommendation_summary}
                              onChange={(e) => setPracticeReviews((prev) => ({
                                ...prev,
                                [currentPractice.practiceKey]: { ...buildReviewEntry(prev[currentPractice.practiceKey]), recommendation_summary: e.target.value }
                              }))}
                              placeholder="Exemplo: padronizar o checklist nos repositórios da squad e revisar a adoção na próxima campanha."
                            />
                          </label>
                          <label className="practice-review-field">
                            Owner da ação
                            <small>Quem será responsável por conduzir o próximo passo desta prática.</small>
                            <input
                              type="text"
                              value={currentPracticeReview.action_owner}
                              onChange={(e) => setPracticeReviews((prev) => ({
                                ...prev,
                                [currentPractice.practiceKey]: { ...buildReviewEntry(prev[currentPractice.practiceKey]), action_owner: e.target.value }
                              }))}
                              placeholder="Exemplo: Tech Lead da Squad Aurora"
                            />
                          </label>
                          <label className="practice-review-field">
                            Prazo da ação
                            <small>Data alvo para concluir a ação recomendada.</small>
                            <input
                              type="date"
                              value={currentPracticeReview.action_due_date}
                              onChange={(e) => setPracticeReviews((prev) => ({
                                ...prev,
                                [currentPractice.practiceKey]: { ...buildReviewEntry(prev[currentPractice.practiceKey]), action_due_date: e.target.value }
                              }))}
                            />
                          </label>
                        </div>
                      </>
                    ) : (
                      <div className="practice-scope-card">
                        <strong>Fechamento desta prática</strong>
                        <span>Depois da última pergunta, o sistema abre uma etapa separada para registrar evidência, observações, gap principal e próximo passo da prática.</span>
                      </div>
                    )}
                  </div>

                  <div className="form-actions member-question-modal-actions">
                    {isPracticeReviewStep && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={saving}
                        onClick={() => setEvidenceModalOpen(true)}
                      >
                        Anexar evidências
                      </button>
                    )}
                    <button
                      type="button"
                      className="secondary"
                      disabled={saving || practiceQuestionIndex === 0}
                      onClick={() => setPracticeQuestionIndex((prev) => Math.max(prev - 1, 0))}
                    >
                      {isPracticeReviewStep ? 'Voltar para perguntas' : 'Pergunta anterior'}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={saving || !practiceStates.length}
                      onClick={async () => {
                        setSaving(true);
                        setError(null);
                        try {
                          await persistCurrentPractice();
                          const index = practiceStates.findIndex((item) => item.practiceKey === currentPractice.practiceKey);
                          const previous = practiceStates[Math.max(index - 1, 0)];
                          if (previous) {
                            setCurrentPracticeKey(previous.practiceKey);
                            setPracticeQuestionIndex(0);
                          }
                        } catch (err) {
                          setError(err.message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Prática anterior
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        setError(null);
                        try {
                          await persistCurrentPractice();
                        } catch (err) {
                          setError(err.message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? 'Salvando...' : 'Salvar prática'}
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={saving || !practiceStates.length || (!isPracticeReviewStep && currentPracticeQuestion && responses[currentPracticeQuestion.id] === undefined)}
                      onClick={async () => {
                        if (!isPracticeReviewStep && practiceQuestionIndex < currentPracticeQuestions.length - 1) {
                          setPracticeQuestionIndex((prev) => Math.min(prev + 1, currentPracticeQuestions.length));
                          return;
                        }

                        if (!isPracticeReviewStep) {
                          // Sempre abre o fechamento quando o usuário clica em "Ir para fechamento".
                          setPracticeQuestionIndex(currentPracticeQuestions.length);
                          return;
                        }

                        const missingAnswers = getPracticeMissingAnswers();
                        if (missingAnswers.length) {
                          setError('Ainda tem perguntas sem resposta nesta prática. Volte e responda antes de avançar.');
                          return;
                        }

                        setSaving(true);
                        setError(null);
                        try {
                          await persistCurrentPractice();
                          const index = practiceStates.findIndex((item) => item.practiceKey === currentPractice.practiceKey);
                          const next = practiceStates[Math.min(index + 1, practiceStates.length - 1)];
                          if (next) {
                            setCurrentPracticeKey(next.practiceKey);
                            setPracticeQuestionIndex(0);
                          }
                        } catch (err) {
                          setError(err.message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {!isPracticeReviewStep
                        ? (practiceQuestionIndex < currentPracticeQuestions.length - 1 ? 'Próximo' : 'Ir para fechamento')
                        : 'Próxima prática'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {practiceModalOpen && currentPractice && isPracticeReviewStep && evidenceModalOpen && (
              <div className="modal-overlay">
                <div className="modal practice-evidence-modal">
                  <div className="modal-header">
                    <div>
                      <span className="eyebrow">Evidências da prática</span>
                      <h2>{currentPractice.practiceName}</h2>
                      <p>Informe links, caminhos de arquivo ou referências dos artefatos apresentados nesta prática.</p>
                    </div>
                    <button className="modal-close" type="button" onClick={() => setEvidenceModalOpen(false)}>
                      Fechar
                    </button>
                  </div>

                  <div className="practice-evidence-modal-body">
                    <label className="practice-review-field">
                      Evidências registradas
                      <small>Use uma linha por evidência. Exemplo: link do dashboard, runbook, pipeline, documento ou diretório compartilhado.</small>
                      <textarea
                        value={currentPracticeReview.evidence_attachments}
                        onChange={(e) => setPracticeReviews((prev) => ({
                          ...prev,
                          [currentPractice.practiceKey]: { ...buildReviewEntry(prev[currentPractice.practiceKey]), evidence_attachments: e.target.value }
                        }))}
                        placeholder={'https://confluence/time/seguranca\n/share/evidencias/pipeline.log\nJira SEC-123'}
                      />
                    </label>
                  </div>

                  <div className="form-actions">
                    <button type="button" className="secondary" onClick={() => setEvidenceModalOpen(false)}>
                      Fechar
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        setError(null);
                        try {
                          await persistCurrentPractice();
                          setEvidenceModalOpen(false);
                        } catch (err) {
                          setError(err.message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? 'Salvando...' : 'Salvar evidências'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const AdminQuestionnaire = () => {
  const { state } = useApp();
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collapsedDomains, setCollapsedDomains] = useState(() => new Set());
  const [editQuestion, setEditQuestion] = useState(null);
  const [editWeight, setEditWeight] = useState('1');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteQuestion, setConfirmDeleteQuestion] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [deleteQuestionError, setDeleteQuestionError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const questionsData = await apiRequest('/questions', { token: state.token });
        setQuestions(questionsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [state.token]);

  const displayQuestions = useMemo(() => sortQuestions(questions), [questions]);
  const groupedQuestions = useMemo(() => buildGroups(displayQuestions), [displayQuestions]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="dashboard dashboard-roomy">
        <header className="dash-header">
          <div>
            <h1>Questionário</h1>
            <p>Veja as questões cadastradas por domínio, prática e nível.</p>
          </div>
        </header>

        {error && <div className="error">{error}</div>}
        {loading && <div className="panel"><span>Carregando...</span></div>}

        {groupedQuestions.length > 0 && (
          <section className="panel">
            <div className="panel-header">
              <h2>Questões cadastradas</h2>
            </div>
            {groupedQuestions.map((group) => (
              <div key={group.domain} className="domain-block">
                <div className="domain-block-header">
                  <h3>{group.domain}</h3>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      setCollapsedDomains((prev) => {
                        const next = new Set(prev);
                        if (next.has(group.domain)) next.delete(group.domain);
                        else next.add(group.domain);
                        return next;
                      });
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className={collapsedDomains.has(group.domain) ? 'is-collapsed' : ''}>
                      <path d="M7 10l5 5 5-5H7Z" />
                    </svg>
                  </button>
                </div>
                {!collapsedDomains.has(group.domain) && (
                  <div className="question-group">
                    {group.practices.map((practice) => (
                      <div key={practice.practiceKey} className="practice-block">
                        <div className="practice-block-header">
                          <div>
                            <h4>{practice.practiceName}</h4>
                            <p>{practice.roadmapHint || 'Prática estruturante do ciclo SAMM.'}</p>
                          </div>
                          <span className="status-pill draft">{practice.levels.length} níveis</span>
                        </div>
                        {practice.levels.map((levelGroup) => (
                          <div key={`${group.domain}-${practice.practiceKey}-${levelGroup.level}`} className="question-level">
                            <h4>Nível {levelGroup.level} ({levelGroup.items.length})</h4>
                            {levelGroup.items.map((question) => (
                              <div key={question.id} className="question-card">
                                <div className="question-card-header">
                                  <p>{question.text}</p>
                                  {state.user?.role === 'admin' && (
                                    <div className="question-card-actions">
                                      <button
                                        type="button"
                                        className="icon-button"
                                        onClick={() => {
                                          setEditQuestion(question);
                                          setEditWeight(String(question.weight ?? 1));
                                        }}
                                      >
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                          <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08ZM20.71 5.63a1 1 0 0 0 0-1.42l-1.92-1.92a1 1 0 0 0-1.42 0l-1.5 1.5 3.75 3.75 1.09-1.09Z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        className="icon-button danger"
                                        onClick={() => {
                                          setDeleteQuestionError(null);
                                          setConfirmDeleteQuestion(question);
                                        }}
                                      >
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                          <path d="M9 3h6l1 2h5v2H3V5h5l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Z" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {editQuestion && (
          <div className="modal-overlay">
            <div className="modal question-level-modal">
              <div className="modal-header">
                <div>
                  <h2>Editar pergunta</h2>
                  <p>Defina o peso para esta pergunta.</p>
                </div>
                <button className="modal-close" type="button" onClick={() => setEditQuestion(null)}>
                  Fechar
                </button>
              </div>
              <div className="question-form question-modal-body">
                <label className="span-2">
                  Pergunta
                  <textarea value={editQuestion.text} disabled />
                </label>
                <label>
                  Peso
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setEditQuestion(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const updated = await apiRequest(`/questions/${editQuestion.id}`, {
                        method: 'PUT',
                        token: state.token,
                        body: {
                          domain: editQuestion.domain,
                          level: editQuestion.level,
                          code: editQuestion.code,
                          text: editQuestion.text,
                          guidance: editQuestion.guidance,
                          weight: editWeight === '' ? null : Number(editWeight)
                        }
                      });
                      setQuestions((prev) => prev.map((question) => (question.id === updated.id ? updated : question)));
                      setEditQuestion(null);
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
        <ConfirmModal
          open={Boolean(confirmDeleteQuestion)}
          title="Excluir pergunta"
          message={confirmDeleteQuestion ? 'Deseja deletar esta pergunta?' : ''}
          confirmLabel="Excluir pergunta"
          danger
          busy={deletingQuestion}
          error={deleteQuestionError}
          onClose={() => {
            if (deletingQuestion) return;
            setConfirmDeleteQuestion(null);
          }}
          onConfirm={async () => {
            if (!confirmDeleteQuestion) return;
            setDeletingQuestion(true);
            setDeleteQuestionError(null);
            try {
              await apiRequest(`/questions/${confirmDeleteQuestion.id}`, { method: 'DELETE', token: state.token });
              setQuestions((prev) => prev.filter((item) => item.id !== confirmDeleteQuestion.id));
              setConfirmDeleteQuestion(null);
            } catch (err) {
              setDeleteQuestionError(err.message);
            } finally {
              setDeletingQuestion(false);
            }
          }}
        />
      </div>
    </div>
  );
};

const Questionnaire = () => {
  const { state } = useApp();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign');

  if (state.user?.role === 'member') {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="dashboard dashboard-roomy">
          <div className="panel">
            <h1>Participação da squad</h1>
            <p>O assessment principal agora é conduzido em workshop por prática. Como membro, você participa da call, ajuda com evidências e acompanha as campanhas da sua squad.</p>
          </div>
        </div>
      </div>
    );
  }

  if ((state.user?.role === 'admin' || state.user?.role === 'facilitator' || state.user?.role === 'tech_lead') && campaignId) {
    return <FacilitatedQuestionnaire />;
  }

  if (state.user?.role === 'tech_lead' || state.user?.role === 'facilitator') {
    return <Navigate to="/campaigns" replace />;
  }

  if (state.user?.role === 'admin' && !campaignId) {
    return <Navigate to="/admin/questions" replace />;
  }

  return <AdminQuestionnaire />;
};

export default Questionnaire;
