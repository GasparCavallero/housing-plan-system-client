import { useState, useEffect } from "react";
import { obtenerDetalleSimulacion } from "../services/services.js";
import ResumenTab from "./ResumenTab.jsx";
import ProyeccionTab from "./ProyeccionTab.jsx";
import CasasTab from "./CasasTab.jsx";

function SectionCard({ title, desc, onClick }) {
  return (
    <button className="sim-section-card" onClick={onClick}>
      <p className="sim-section-label">SECCIÓN</p>
      <p className="sim-section-title">{title}</p>
      <p className="sim-section-desc">{desc}</p>
      <span className="sim-card-arrow">›</span>
    </button>
  );
}

function Breadcrumb({ items }) {
  return (
    <div className="sim-breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="sim-breadcrumb-sep"> / </span>}
          <span
            className={`sim-breadcrumb-item${item.onClick ? " clickable" : ""}`}
            onClick={item.onClick}
          >
            {item.label}
          </span>
        </span>
      ))}
    </div>
  );
}

function SimHeader({ detalle, onVolver }) {
  const titulo = detalle?.titulo ?? detalle?.title ?? detalle?.nombre ?? `Simulación #${detalle?.id}`;
  const fecha = detalle?.updated_at
    ? new Date(detalle.updated_at).toLocaleString("es-AR")
    : null;

  return (
    <div className="sim-detalle-header">
      <div>
        <h2>
          Simulación: {titulo}
          {detalle?.id && (
            <span className="sim-header-meta"> ID {detalle.id}{fecha ? ` | Última actualización: ${fecha}` : ""}</span>
          )}
        </h2>
      </div>
      <button className="btn btn-ghost" onClick={onVolver}>← Volver a simulaciones</button>
    </div>
  );
}

function SimulacionDetalle({ simulacion, onVolver }) {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("menu"); // menu | resumen | proyeccion | casas

  useEffect(() => {
    const load = async () => {
      try {
        const data = await obtenerDetalleSimulacion(simulacion.id);
        setDetalle(data);
      } catch (err) {
        setError(err?.message || "Error al cargar la simulación.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [simulacion.id]);

  const casasCount = detalle?.casas?.length ?? 0;

  // ── Vistas internas ──────────────────────────────────────────────────────

  if (view === "resumen") {
    return (
      <section id="simulaciones-guardadas" className="panel panel-simulations">
        <SimHeader detalle={detalle} onVolver={onVolver} />
        <Breadcrumb items={[
          { label: "Simulación actual", onClick: () => setView("menu") },
          { label: "Resumen" },
        ]} />
        <div className="sim-section-header">
          <h3>Resumen de la simulación</h3>
          <button className="btn btn-ghost" onClick={() => setView("menu")}>Volver</button>
        </div>
        <ResumenTab detalle={detalle} />
      </section>
    );
  }

  if (view === "proyeccion") {
    return (
      <section id="simulaciones-guardadas" className="panel panel-simulations">
        <SimHeader detalle={detalle} onVolver={onVolver} />
        <Breadcrumb items={[
          { label: "Simulación actual", onClick: () => setView("menu") },
          { label: "Proyección" },
        ]} />
        <div className="sim-section-header">
          <h3>Proyección</h3>
          <button className="btn btn-ghost" onClick={() => setView("menu")}>Volver</button>
        </div>
        <ProyeccionTab detalle={detalle} />
      </section>
    );
  }

  if (view === "casas") {
    return (
      <section id="simulaciones-guardadas" className="panel panel-simulations">
        <SimHeader detalle={detalle ?? simulacion} onVolver={onVolver} />
        {!detalle ? (
          <p className="config-help">Cargando...</p>
        ) : (
          <CasasTab
            detalle={detalle}
            simulacionId={simulacion.id}
            onVolver={() => setView("menu")}
            onDetalleRefresh={() => {
              setDetalle(null);
              setLoading(true);
              obtenerDetalleSimulacion(simulacion.id)
                .then(setDetalle)
                .finally(() => setLoading(false));
            }}
          />
        )}
      </section>
    );
  }


  // ── Menú principal ───────────────────────────────────────────────────────
  return (
    <section id="simulaciones-guardadas" className="panel panel-simulations">
      <SimHeader detalle={detalle ?? simulacion} onVolver={onVolver} />

      {loading && <p className="config-help">Cargando detalle...</p>}
      {error && <p className="config-help" style={{ color: "red" }}>{error}</p>}

      {detalle && (
        <>
          <div className="sim-breadcrumb" style={{ marginBottom: "1rem" }}>
            <span className="sim-breadcrumb-item">Simulación actual</span>
          </div>

          <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>Secciones del plan</h3>

          <div className="sim-sections-list">
            <SectionCard
              title="Resumen"
              desc="KPIs y datos generales de la simulación"
              onClick={() => setView("resumen")}
            />
            <SectionCard
              title="Casas"
              desc={`${casasCount} casa${casasCount !== 1 ? "s" : ""} registrada${casasCount !== 1 ? "s" : ""}`}
              onClick={() => setView("casas")}
            />
            <SectionCard
              title="Proyección"
              desc="Proyección financiera y de entregas"
              onClick={() => setView("proyeccion")}
            />
          </div>
        </>
      )}
    </section>
  );
}

export default SimulacionDetalle;
