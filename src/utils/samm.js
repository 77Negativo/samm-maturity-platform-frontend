export const DOMAIN_ORDER = ['Governance', 'Design', 'Implementation', 'Verification', 'Operations'];

export const SAMM_MODEL = [
  {
    domain: 'Governance',
    practices: [
      { key: 'gov-strategy-metrics', name: 'Strategy & Metrics' },
      { key: 'gov-policy-compliance', name: 'Policy & Compliance' },
      { key: 'gov-education-guidance', name: 'Education & Guidance' }
    ]
  },
  {
    domain: 'Design',
    practices: [
      { key: 'des-threat-assessment', name: 'Threat Assessment' },
      { key: 'des-security-requirements', name: 'Security Requirements' },
      { key: 'des-secure-architecture', name: 'Secure Architecture' }
    ]
  },
  {
    domain: 'Implementation',
    practices: [
      { key: 'imp-secure-build', name: 'Secure Build' },
      { key: 'imp-secure-deployment', name: 'Secure Deployment' },
      { key: 'imp-defect-management', name: 'Defect Management' }
    ]
  },
  {
    domain: 'Verification',
    practices: [
      { key: 'ver-architecture-assessment', name: 'Architecture Assessment' },
      { key: 'ver-requirements-driven-testing', name: 'Requirements-driven Testing' },
      { key: 'ver-security-testing', name: 'Security Testing' }
    ]
  },
  {
    domain: 'Operations',
    practices: [
      { key: 'ops-incident-management', name: 'Incident Management' },
      { key: 'ops-environment-management', name: 'Environment Management' },
      { key: 'ops-operational-management', name: 'Operational Management' }
    ]
  }
];

export const LEVEL_LABELS = {
  0: 'L0',
  1: 'L1',
  2: 'L2',
  3: 'L3'
};

export const formatMaturity = (value) => Number(value || 0).toFixed(2);

export const getDomainPractices = (domain) => SAMM_MODEL.find((item) => item.domain === domain)?.practices || [];

export const getPracticeByKey = (practiceKey) => (
  SAMM_MODEL.flatMap((item) => item.practices).find((practice) => practice.key === practiceKey) || null
);

export const levelTone = (value) => {
  if (value >= 85) return 'excellent';
  if (value >= 65) return 'good';
  if (value >= 40) return 'attention';
  return 'critical';
};
