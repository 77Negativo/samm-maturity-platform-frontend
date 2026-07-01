import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';

const Login = () => {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      dispatch({ type: 'LOGIN', payload: data });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark">SAMM</span>
          <div>
            <h1>SAMM Maturity Platform</h1>
            <p>Plataforma de maturidade em segurança</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="login-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@owasp-samm.local"
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
      <div className="login-panel">
        <h2>Medir. Evoluir. Repetir.</h2>
        <p>
          Acompanhe domínios, níveis e evidências enquanto constrói uma cultura de segurança.
          A SAMM Maturity Platform ajuda os times a evoluírem de forma consistente.
        </p>
        <div className="login-grid">
          <div>
            <span>Domínios: Governance, Design, Implementation, Verification, Operations</span>
          </div>
          <div>
            <span>Níveis de Maturidade de 1 a 3 por prática</span>
          </div>
          <div>
            <span>Insights Gaps, tendências e ações priorizadas</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
