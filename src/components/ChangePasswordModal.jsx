import React, { useMemo, useState } from 'react';
import { apiRequest } from '../api.js';
import { useApp } from '../context/AppContext.jsx';

const ChangePasswordModal = ({ open, force, onClose }) => {
  const { state, dispatch } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const validation = useMemo(() => {
    if (newPassword.length < 12) return 'Mínimo de 12 caracteres.';
    if (!/[A-Za-z]/.test(newPassword)) return 'Inclua letras.';
    if (!/\d/.test(newPassword)) return 'Inclua números.';
    if (!/[^A-Za-z0-9]/.test(newPassword)) return 'Inclua símbolos.';
    if (confirmPassword && newPassword !== confirmPassword) return 'As senhas não conferem.';
    return null;
  }, [newPassword, confirmPassword]);

  if (!open) return null;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        token: state.token,
        body: {
          current_password: currentPassword,
          new_password: newPassword
        }
      });
      dispatch({ type: 'UPDATE_USER', payload: { must_change_password: false } });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onClose) onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal password-modal">
        <div className="modal-header">
          <h2>Trocar senha</h2>
          {!force && (
            <button className="modal-close" type="button" onClick={onClose}>
              Fechar
            </button>
          )}
        </div>
        <form onSubmit={onSubmit} className="question-form password-form">
          <label>
            Senha atual
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label>
            Nova senha
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>
          <label>
            Confirmar nova senha
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
          <div className="span-2 helper-text password-helper-text">
            A senha deve ter pelo menos 12 caracteres, com letras, números e símbolos.
          </div>
          {error && <div className="error span-2 password-form-message">{error}</div>}
          <div className="form-actions span-2 password-form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Atualizar senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
