import { useState, useEffect } from "react";
import { listarSimulacionesGuardadas } from "../services/services.js";
import SimulacionDetalle from "./SimulacionDetalle.jsx";

function SimulacionCard({ sim, onClick }) {
  const fecha = sim.created_at
    ? new Date(sim.created_at).toLocaleDateString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : null;

  const titulo = sim.titulo ?? sim.title ?? sim.nombre ?? `Simulación #${sim.id}`;

  return (
    <button className="sim-card" onClick={onClick}>
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
  const [selected, setSelected]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listarSimulacionesGuardadas();
        setSimulaciones(data);
      } catch (err) {
        setError(err?.message || "Error al cargar simulaciones.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
      <div className="panel-head">
        <h2>Simulaciones guardadas</h2>
        {!loading && (
          <p>Total simulaciones: {simulaciones.length}</p>
        )}
      </div>

      {loading && <p className="config-help">Cargando simulaciones...</p>}
      {error   && <p className="config-help" style={{ color: "red" }}>{error}</p>}
      {!loading && !error && simulaciones.length === 0 && (
        <p className="config-help">No hay simulaciones guardadas todavía.</p>
      )}

      <div className="sim-grid">
        {simulaciones.map((sim) => (
          <SimulacionCard key={sim.id} sim={sim} onClick={() => setSelected(sim)} />
        ))}
      </div>
    </section>
  );
}

export default Simulaciones;
