import { useState } from "react";
import CasaDetalle from "./CasaDetalle.jsx";
import { crearCasaSimulacion } from "../services/services.js";

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

const FORM_EMPTY = { adherente_id: "", adherente_nombre: "", precio_ars: "", descripcion: "" };

function CasasTab({ detalle, simulacionId, onVolver, onDetalleRefresh }) {
  const [query, setQuery] = useState("");
  const [selectedCasa, setSelectedCasa] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuardar = async () => {
    if (!form.adherente_nombre.trim()) {
      setFormError("El nombre del adherente es requerido.");
      return;
    }
    if (!form.precio_ars || Number(form.precio_ars) <= 0) {
      setFormError("El precio debe ser mayor a 0.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        adherente_id: form.adherente_id ? Number(form.adherente_id) : null,
        adherente_nombre: form.adherente_nombre.trim(),
        precio_ars: Number(form.precio_ars),
        descripcion: form.descripcion.trim() || null,
      };
      await crearCasaSimulacion(simulacionId, payload);
      setForm(FORM_EMPTY);
      setShowForm(false);
      if (onDetalleRefresh) onDetalleRefresh();
    } catch (err) {
      setFormError(err?.message || "Error al crear la casa.");
    } finally {
      setSaving(false);
    }
  };

  if (selectedCasa) {
    return (
      <CasaDetalle
        casa={selectedCasa}
        simulacionId={simulacionId}
        onVolver={() => setSelectedCasa(null)}
        onRefresh={() => {
          if (onDetalleRefresh) onDetalleRefresh();
          setSelectedCasa(null);
        }}
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
        <h3>Casas{showForm ? "" : " de la simulación"}</h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {showForm ? (
            <button className="btn btn-primary" onClick={() => { setShowForm(false); setForm(FORM_EMPTY); setFormError(""); }}>
              Cancelar
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Agregar casa
            </button>
          )}
          <button className="btn btn-ghost" onClick={onVolver}>Volver</button>
        </div>
      </div>

      {showForm && (
        <div className="sim-casa-form">
          <div className="inline-form">
            <input
              type="number"
              name="adherente_id"
              placeholder="ID del adherente (opcional)"
              value={form.adherente_id}
              onChange={handleFormChange}
            />
            <input
              type="text"
              name="adherente_nombre"
              placeholder="Nombre del adherente"
              value={form.adherente_nombre}
              onChange={handleFormChange}
              required
            />
            <input
              type="number"
              name="precio_ars"
              placeholder="Precio ARS"
              value={form.precio_ars}
              onChange={handleFormChange}
              required
            />
            <input
              type="text"
              name="descripcion"
              placeholder="Descripción de la casa"
              value={form.descripcion}
              onChange={handleFormChange}
            />
          </div>
          <div className="inline-form">
            <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>
              {saving ? "Guardando..." : "Guardar casa"}
            </button>
          </div>
          {formError && <p className="config-help" style={{ color: "red" }}>{formError}</p>}
          {casas.length === 0 && !showForm && (
            <p className="config-help">Esta simulación todavía no tiene casas cargadas.</p>
          )}
        </div>
      )}

      {!showForm && (
        <>
          <p className="config-help" style={{ marginBottom: "1rem" }}>
            Elegí una casa para abrir su detalle completo.
          </p>
          <div style={{ position: "relative", marginBottom: "1rem" }}>
            <input
              className="sim-search"
              type="text"
              placeholder="Buscar por número de casa o adherente..."
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
          {casas.length === 0 && (
            <p className="config-help" style={{ marginTop: "1rem" }}>Esta simulación todavía no tiene casas cargadas.</p>
          )}
          {casas.length > 0 && filtered.length === 0 && (
            <p className="config-help">No se encontraron casas.</p>
          )}
          <div className="sim-sections-list" style={{ marginTop: "1rem" }}>
            {filtered.map((casa) => (
              <CasaCard key={casa.id} casa={casa} onClick={() => setSelectedCasa(casa)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default CasasTab;