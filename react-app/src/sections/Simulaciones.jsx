import { useState, useEffect } from "react";
import { listarSimulacionesGuardadas, eliminarSimulacionesBatch } from "../services/services.js";
import SimulacionDetalle from "./SimulacionDetalle.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

function SimulacionCard({ sim, selecting, selected, onSelect, onClick }) {
  const fecha = sim.created_at
    ? new Date(sim.created_at).toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    })
    : null;

  const titulo = sim.titulo ?? sim.title ?? sim.nombre ?? `Simulación #${sim.id}`;

  return (
    <button
      className={`sim-card${selected ? " sim-card-selected" : ""}`}
      onClick={selecting ? () => onSelect(sim.id) : onClick}
    >
      {selecting && (
        <input
          type="checkbox"
          className="sim-select-checkbox"
          checked={selected}
          onChange={() => onSelect(sim.id)}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <p className="sim-card-label">SIMULACIÓN #{sim.id}</p>
      <p className="sim-card-title">{titulo}</p>
      <p className="sim-card-desc">{sim.descripcion || "Sin descripción"}</p>
      {fecha && <p className="sim-card-date">{fecha}</p>}
      <span className="sim-card-arrow">›</span>
    </button>
  );
}

function Simulaciones() {
  const [simulaciones, setSimulaciones] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");


  const filtradas = simulaciones.filter((sim) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const titulo = sim.titulo ?? sim.title ?? sim.nombre ?? "";
    return (
      titulo.toLowerCase().includes(q) ||
      String(sim.id).includes(q) ||
      (sim.descripcion ?? "").toLowerCase().includes(q)
    );
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listarSimulacionesGuardadas();
      setSimulaciones(data);
    } catch (err) {
      setError(err?.message || "Error al cargar simulaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleSelect = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const cancelSelecting = () => {
    setSelecting(false);
    setCheckedIds(new Set());
  };

  const handleEliminar = async () => {
    setDeleting(true);
    try {
      await eliminarSimulacionesBatch([...checkedIds]);
      setShowConfirm(false);
      cancelSelecting();
      await load();
    } catch (err) {
      setError(err?.message || "Error al eliminar simulaciones.");
      setShowConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (selected) {
    return (
      <SimulacionDetalle
        simulacion={selected}
        onVolver={() => setSelected(null)}
      />
    );
  }

  return (
    <section id="simulaciones-guardadas" className="panel panel-simulations">
      <ConfirmModal
        isOpen={showConfirm}
        title="Confirmar eliminación"
        message={`¿Estás seguro que querés eliminar ${checkedIds.size} simulación${checkedIds.size !== 1 ? "es" : ""}? Esta acción no se puede deshacer.`}
        onConfirm={handleEliminar}
        onCancel={() => setShowConfirm(false)}
      />

      <div className="panel-head">
        <h2>Simulaciones guardadas</h2>
        {!loading && <p>Total simulaciones: {simulaciones.length}</p>}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.2rem" }}>
        {!selecting ? (
          <button className="btn btn-secondary" onClick={() => setSelecting(true)}>
            Seleccionar simulaciones
          </button>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={cancelSelecting}>
              Cancelar selección
            </button>
            {checkedIds.size > 0 && (
              <button
                className="btn btn-ghost"
                style={{ color: "#c0392b", borderColor: "#c0392b" }}
                onClick={() => setShowConfirm(true)}
                disabled={deleting}
              >
                {checkedIds.size === 1
                  ? "Eliminar selección"
                  : `Eliminar selecciones (${checkedIds.size})`}
              </button>
            )}
          </>
        )}
      </div>

      {loading && <p className="config-help">Cargando simulaciones...</p>}
      {error && <p className="config-help" style={{ color: "red" }}>{error}</p>}
      {!loading && !error && simulaciones.length === 0 && (
        <p className="config-help">No hay simulaciones guardadas todavía.</p>
      )}

      {!selecting && (
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <input
            className="sim-search"
            type="text"
            placeholder="Buscar simulación por nombre o ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingRight: query ? "2.5rem" : undefined }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                right: "0.7rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                fontSize: "1rem",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      )}

      <div className="sim-grid">
        {filtradas.map((sim) => (
          <SimulacionCard
            key={sim.id}
            sim={sim}
            selecting={selecting}
            selected={checkedIds.has(sim.id)}
            onSelect={toggleSelect}
            onClick={() => setSelected(sim)}
          />
        ))}
      </div>
    </section>
  );
}

export default Simulaciones;