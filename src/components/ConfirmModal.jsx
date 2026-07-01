import React from 'react';

const ConfirmModal = ({
  open,
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  busy = false,
  error = null,
  onConfirm,
  onClose
}) => {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="modal-close"
            type="button"
            onClick={() => {
              if (busy) return;
              onClose?.();
            }}
          >
            Fechar
          </button>
        </div>

        <p>{message}</p>
        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button
            type="button"
            className={danger ? 'danger' : undefined}
            disabled={busy}
            onClick={() => onConfirm?.()}
          >
            {busy ? 'Processando...' : confirmLabel}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => onClose?.()}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
