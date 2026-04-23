function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal" role="dialog" aria-modal="true">
      <div className="confirm-modal-card">
        <p className="eyebrow">Confirmación</p>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-modal-actions">
          <button 
            className="btn btn-ghost" 
            type="button" 
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button 
            className="btn btn-secondary" 
            type="button" 
            onClick={onConfirm}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;