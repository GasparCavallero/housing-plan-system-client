import { useState } from "react";
import CasaDetalle from "./CasaDetalle.jsx";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

function CasaCard({ casa, onClick }) {
  const nombre = casa.adherente_nombre ?? casa.descripcion ?? `Casa #${casa.id}`;

  return (
    <button className="sim-section-card" onClick={onClick}>
      <p className="sim-section-label">CASA #{casa.id}</p>
      <p className="sim-section-title">{nombre}</p>
      <p className="sim-section-desc">
        Saldo {fmt(casa.saldo_ars)} | Materiales {fmt(casa.total_materiales_ars)} | Gastos {fmt(casa.total_gastos_ars)}
      </p>
      <span className="sim-card-arrow">›</span>
    </button>
  );
}

function CasasTab({ detalle, simulacionId, onVolver }) {
  const [query, setQuery]         = useState("");
  const [selectedCasa, setSelectedCasa] = useState(null);

  const casas = detalle?.casas ?? [];

  const filtered = casas.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      String(c.id).includes(q) ||
      (c.adherente_nombre ?? "").toLowerCase().includes(q) ||
      (c.descripcion ?? "").toLowerCase().includes(q)
    );
  });

  if (selectedCasa) {
    return (
      <CasaDetalle
        casa={selectedCasa}
        simulacionId={simulacionId}
        onVolver={() => setSelectedCasa(null)}
      />
    );
  }

  return (
    <div>
      <div className="sim-breadcrumb" style={{ marginBottom: "1rem" }}>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Plan simulado</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item">Casas</span>
      </div>

      <div className="sim-section-header">
        <h3>Casas de la simulación</h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-primary" disabled>Agregar casa</button>
          <button className="btn btn-ghost" onClick={onVolver}>Volver</button>
        </div>
      </div>

      <p className="config-help" style={{ marginBottom: "1rem" }}>
        Elegí una casa para abrir su detalle completo.
      </p>

      <input
        className="sim-search"
        type="text"
        placeholder="Buscar por número de casa o adherente..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filtered.length === 0 && (
        <p className="config-help">No se encontraron casas.</p>
      )}

      <div className="sim-sections-list" style={{ marginTop: "1rem" }}>
        {filtered.map((casa) => (
          <CasaCard key={casa.id} casa={casa} onClick={() => setSelectedCasa(casa)} />
        ))}
      </div>
    </div>
  );
}

export default CasasTab;
