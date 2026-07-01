const API_BASE = import.meta.env.VITE_API_URL || '/api';
const CLIENT_FINGERPRINT_KEY = 'owasp-samm.client-fingerprint';
const CSRF_TOKEN_KEY = 'owasp-samm.csrf-token';

const resolveClientFingerprint = () => {
  if (typeof window === 'undefined') return 'server';
  const existing = window.localStorage.getItem(CLIENT_FINGERPRINT_KEY);
  if (existing) return existing;
  const generated = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  window.localStorage.setItem(CLIENT_FINGERPRINT_KEY, generated);
  return generated;
};

const readCsrfToken = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(CSRF_TOKEN_KEY) || '';
};

export const storeCsrfToken = (token) => {
  if (typeof window === 'undefined') return;
  if (!token) {
    window.localStorage.removeItem(CSRF_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(CSRF_TOKEN_KEY, String(token));
};

const FRIENDLY_MESSAGES = {
  'Request failed': 'Não foi possível concluir a solicitação.',
  'Internal server error': 'Ocorreu um erro interno. Tente novamente.',
  'Invalid payload': 'Preencha os campos obrigatórios corretamente.',
  Unauthorized: 'Sua sessão expirou. Faça login novamente.',
  'User disabled': 'Usuário desativado. Procure um administrador.',
  'Forbidden': 'Você não tem permissão para executar esta ação.',
  'Invalid credentials': 'Email ou senha inválidos.',
  'Too many login attempts. Try again later.': 'Muitas tentativas de login. Tente novamente mais tarde.',
  'Email already exists': 'Este email já está cadastrado.',
  'Squad already exists': 'Já existe uma squad com esse nome.',
  'User not found': 'Usuário não encontrado.',
  'Team not found': 'Squad não encontrada.',
  'User has campaigns': 'Este usuário possui campanhas vinculadas.',
  'User has practice reviews': 'Este usuário possui fechamentos de práticas vinculados.',
  'User has calibrations': 'Este usuário possui calibrações vinculadas.',
  'User has linked records': 'Este usuário possui registros vinculados e não pode ser excluído.'
};

const toFriendlyMessage = (message) => FRIENDLY_MESSAGES[message] || message || 'Não foi possível concluir a solicitação.';

export const apiRequest = async (path, { method = 'GET', token, body } = {}) => {
  const csrfToken = readCsrfToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Fingerprint': resolveClientFingerprint(),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const message = toFriendlyMessage(payload.error || 'Request failed');
    const error = new Error(message);
    error.status = res.status;
    error.data = payload;
    throw error;
  }
  const payload = await res.json();
  if (payload?.csrf_token) storeCsrfToken(payload.csrf_token);
  return payload;
};

export const apiDownload = async (path, { method = 'GET', token, body, filename = 'download.bin' } = {}) => {
  const csrfToken = readCsrfToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Fingerprint': resolveClientFingerprint(),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const message = toFriendlyMessage(payload.error || 'Request failed');
    const error = new Error(message);
    error.status = res.status;
    error.data = payload;
    throw error;
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};
