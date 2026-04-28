import { useState } from "react";
import { actualizarCasaSimulacion } from "../services/services.js";
import PlanillasTab from "./PlanillasTab.jsx";
import GastosTab from "./GastosTab.jsx";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

function KpiBox({ label, value }) {
  return (
    <div className="sim-kpi-box">
      <p className="sim-kpi-label">{label}</p>
      <p className="sim-kpi-value">{value}</p>
    </div>
  );
}

function ProgressBar({ pct }) {
  const safe = Math.min(100, Math.max(0, Number(pct ?? 0)));
  return (
    <div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${safe}%` }} />
      </div>
      <p className="sim-progress-label">Uso de fondo: {safe.toFixed(2)}%</p>
    </div>
  );
}

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

function CasaDetalle({ casa, simulacionId, onVolver, onRefresh }) {
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState({
    adherente_id: casa.adherente_id ?? "",
    adherente_nombre: casa.adherente_nombre ?? "",
    precio_ars: casa.precio_ars ?? "",
    descripcion: casa.descripcion ?? "",
    completada: casa.completada ?? false,
  });
  const [view, setView] = useState("detalle");

  if (view === "planillas") {
    return (
      <PlanillasTab
        casa={casa}
        simulacionId={simulacionId}
        onVolver={() => setView("detalle")}
      />
    );
  }

  if (view === "gastos") {
    return (
      <GastosTab
        casa={casa}
        simulacionId={simulacionId}
        onVolver={() => setView("detalle")}
      />
    );
  }

  const nombre = casa.adherente_nombre ?? casa.descripcion ?? `Casa #${casa.id}`;
  const planillas = casa.items?.length ?? 0;
  const items = casa.items?.length ?? 0;
  const gastos = casa.gastos?.length ?? 0;
  const completada = casa.completada ? "Completada" : "En curso";
  const fondoDisponible = casa.precio_ars ?? 0;
  const comprometido = casa.total_casa_ars && casa.total_casa_ars !== 0
    ? casa.total_casa_ars
    : (casa.total_gastos_ars ?? 0) + (casa.total_materiales_ars ?? 0) + (casa.total_mano_obra_ars ?? 0);
  const avance = fondoDisponible > 0
    ? (comprometido / fondoDisponible) * 100
    : 0;
  const totalMaterial = casa.cantidad_material_total ?? 0;
  const totalRetirado = casa.cantidad_material_retirada ?? 0;
  const enConstruccion = casa.cantidad_material_en_construccion ?? 0;
  const saldoDisponible = casa.saldo_ars != null && casa.saldo_ars !== 0
    ? casa.saldo_ars
    : fondoDisponible - (casa.total_gastos_ars ?? 0) - (casa.total_materiales_ars ?? 0) - (casa.total_mano_obra_ars ?? 0);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleGuardar = async () => {
    setSaving(true);
    setEditError("");
    try {
      const payload = {
        adherente_id: form.adherente_id ? Number(form.adherente_id) : null,
        adherente_nombre: form.adherente_nombre.trim(),
        precio_ars: Number(form.precio_ars),
        descripcion: form.descripcion.trim() || null,
        completada: form.completada,
      };
      await actualizarCasaSimulacion(simulacionId, casa.id, payload);
      setEditando(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setEditError(err?.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="sim-breadcrumb" style={{ marginBottom: "1rem" }}>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Plan simulado</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Casas</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item">{nombre}</span>
      </div>

      <div className="sim-section-header">
        <h3>Casa seleccionada</h3>
        <button className="btn btn-ghost" onClick={onVolver}>Volver a casas</button>
      </div>

      <p style={{ marginBottom: "1rem", color: "var(--muted)", fontSize: "0.9rem" }}>{nombre}</p>

      {/* Tarjeta principal */}
      <div className="sim-casa-card">
        <div className="sim-casa-card-header">
          <div>
            <p className="sim-section-label">CASA #{casa.id}</p>
            <p className="sim-section-title">{nombre}</p>
            <p className="sim-section-desc">
              Saldo {fmt(saldoDisponible)} | Materiales {fmt(casa.total_materiales_ars)} | Gastos {fmt(casa.total_gastos_ars)} | Mano de obra {fmt(casa.total_mano_obra_ars ?? 0)}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <span className="sim-badge">{planillas} planillas</span>
            <span className="sim-badge">{completada}</span>
            <span className="sim-badge">{avance.toFixed(2)}%</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setEditando(!editando); setEditError(""); }}
          >
            {editando ? "Cerrar edición" : "Editar casa"}
          </button>
        </div>
        {/* Formulario de edición */}
        {editando && (
          <div className="sim-casa-card" style={{ marginTop: "0.8rem" }}>
            <div className="form-grid">
              <label>
                Adherente ID
                <input
                  type="number"
                  name="adherente_id"
                  value={form.adherente_id}
                  onChange={handleFormChange}
                  placeholder="Opcional"
                />
              </label>
              <label>
                Adherente
                <input
                  type="text"
                  name="adherente_nombre"
                  value={form.adherente_nombre}
                  onChange={handleFormChange}
                />
              </label>
              <label>
                Precio ARS
                <input
                  type="number"
                  name="precio_ars"
                  value={form.precio_ars}
                  onChange={handleFormChange}
                />
              </label>
              <label>
                Fondo disponible ARS
                <input
                  type="number"
                  value={saldoDisponible}
                  disabled
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Descripción
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleFormChange}
                  rows={3}
                />
              </label>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                type="checkbox"
                name="completada"
                checked={form.completada}
                onChange={handleFormChange}
              />
              Casa completada
            </label>
            {editError && <p className="config-help" style={{ color: "red", marginTop: "0.5rem" }}>{editError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving ? "Guardando..." : "Guardar casa"}
              </button>
            </div>
          </div>
        )}

        <div className="house-finance-grid">
          <KpiBox label="Fondo disponible" value={fmt(fondoDisponible)} />
          <KpiBox label="Comprometido" value={fmt(comprometido)} />
          <KpiBox label="Total material" value={totalMaterial} />
          <KpiBox label="Total retirado" value={totalRetirado} />
          <KpiBox label="En construcción" value={enConstruccion} />
          <KpiBox label="Saldo disponible" value={fmt(saldoDisponible)} />
        </div>

        <ProgressBar pct={avance} />
      </div>



      {/* Secciones */}
      <div className="sim-sections-list" style={{ marginTop: "1.5rem" }}>
        <SectionCard title="Planillas" desc={`${planillas} planillas registradas`} onClick={() => {
          setView("planillas");
        }} />
        <SectionCard title="Items" desc={`${items} items registrados`} onClick={() => { }} />
        <SectionCard title="Materiales" desc="Vista consolidada de todos los materiales" onClick={() => { }} />
        <SectionCard
          title="Gastos"
          desc={`${gastos} gastos registrados`}
          onClick={() => setView("gastos")}
        />
        <SectionCard title="Mano de obra" desc="Registros de mano de obra" onClick={() => { }} />
      </div>
    </div>
  );
}

export default CasaDetalle;