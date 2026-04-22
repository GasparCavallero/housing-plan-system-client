import { useState, useEffect } from "react";

function GuardarSimulacionModal({ open, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // resetear cuando se abre
  useEffect(() => {
    if (open) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle("");
      setDescripcion("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="config-modal" onClick={onClose}>
      <div className="modal-content " onClick={(e) => e.stopPropagation()}>
        <article className="config-item modal-form">

          <h2>Guardar simulación</h2>

          <div>
            <div>
              <strong>Título *</strong>
              <input
                type="text"
                placeholder="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="config-modal-title"
              />
            </div>
          </div>

          <div>
            <div>
              <strong>Descripción</strong>
              <textarea
                placeholder="Descripción (opcional)"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="config-modal-description"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button onClick={onClose} className="btn">
              Cancelar
            </button>
            <button
              onClick={() => onSubmit({ titulo: title, descripcion })}
              disabled={!title.trim()}
              className="btn btn-primary"
            >
              Guardar
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

export default GuardarSimulacionModal;