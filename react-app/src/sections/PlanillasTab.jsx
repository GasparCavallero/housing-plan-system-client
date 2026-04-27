import { useState, useEffect } from "react";
import {
  listarPlanillasCasa,
  crearPlanillaCasa,
  actualizarPlanillaCasa,
  eliminarPlanillaCasa,
} from "../services/services.js";
import ConfirmModal from "../components/ConfirmModal.jsx";
import PlanillaDetalle from "./PlanillaDetalle.jsx";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

const TODAY = new Date().toISOString().split("T")[0];

const FORM_EMPTY = {
  numero: "",
  fecha: TODAY,
  vencimiento: "",
  proveedor: "",
  contratista: "",
  adherente: "",
  direccion: "",
  observaciones: "",
};

function PlanillaCard({ planilla, casaNombre, onOpen, onEdit, onDelete }) {
  const itemsCount = planilla.items?.length ?? planilla.cantidad_items ?? 0;
  const monto = planilla.total_materiales_ars ?? planilla.monto ?? 0;

  return (
    <div className="sim-section-card" style={{ cursor: "default" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={onOpen}>
          <p className="sim-section-label">PLANILLA #{planilla.id}</p>
          <p className="sim-section-title">{planilla.proveedor ?? planilla.nombre ?? `Planilla #${planilla.id}`}</p>
          <p className="sim-section-desc">Items: {itemsCount} | Monto: {fmt(monto)}</p>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {planilla.fecha && <span className="sim-badge">{new Date(planilla.fecha).toLocaleDateString("es-AR")}</span>}
          {planilla.vencimiento && <span className="sim-badge">Vto {new Date(planilla.vencimiento).toLocaleDateString("es-AR")}</span>}
          <button className="btn btn-ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }} onClick={onEdit}>Editar</button>
          <button className="btn btn-ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem", color: "#c0392b", borderColor: "#c0392b" }} onClick={onDelete}>Borrar</button>
          <span style={{ cursor: "pointer", color: "var(--primary)", fontWeight: 600, padding: "0 0.3rem" }} onClick={onOpen}>–</span>
        </div>
      </div>
    </div>
  );
}

function PlanillaForm({ initial, casaNombre, onGuardar, onCancelar, saving, error }) {
  const [form, setForm] = useState(initial ?? FORM_EMPTY);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="sim-casa-card" style={{ marginBottom: "1rem" }}>
      <div className="form-grid">
        <label>
          Número
          <input type="text" name="numero" value={form.numero} onChange={handleChange} placeholder="Opcional" />
        </label>
        <label>
          Fecha
          <input type="date" name="fecha" value={form.fecha} onChange={handleChange} />
        </label>
        <label>
          Vencimiento
          <input type="date" name="vencimiento" value={form.vencimiento} onChange={handleChange} />
        </label>
        <label>
          Proveedor
          <input type="text" name="proveedor" value={form.proveedor} onChange={handleChange} />
        </label>
        <label>
          Contratista
          <input type="text" name="contratista" value={form.contratista} onChange={handleChange} />
        </label>
        <label>
          Adherente
          <input type="text" name="adherente" value={form.adherente} onChange={handleChange} defaultValue={casaNombre} />
        </label>
        <label>
          Dirección
          <input type="text" name="direccion" value={form.direccion} onChange={handleChange} />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Observaciones
          <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={3} />
        </label>
      </div>
      {error && <p className="config-help" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button className="btn btn-primary" onClick={() => onGuardar(form)} disabled={saving}>
          {saving ? "Guardando..." : "Crear planilla"}
        </button>
      </div>
    </div>
  );
}

function PlanillasTab({ casa, simulacionId, onVolver }) {
  const [planillas, setPlanillas]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState("");
  const [editingPlanilla, setEditingPlanilla] = useState(null);
  const [deletingId, setDeletingId]     = useState(null);
  const [selectedPlanilla, setSelectedPlanilla] = useState(null);

  const casaNombre = casa.adherente_nombre ?? casa.descripcion ?? `Casa #${casa.id}`;

  const load = async () => {
    setLoading(true);
    try {
      const data = await listarPlanillasCasa(simulacionId, casa.id);
      setPlanillas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Error al cargar planillas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [simulacionId, casa.id]);

  const buildPayload = (form) => ({
    numero:       form.numero?.trim() || null,
    fecha:        form.fecha || null,
    vencimiento:  form.vencimiento || null,
    proveedor:    form.proveedor?.trim() || null,
    contratista:  form.contratista?.trim() || null,
    adherente:    form.adherente?.trim() || null,
    direccion:    form.direccion?.trim() || null,
    observaciones: form.observaciones?.trim() || null,
  });

  const handleCrear = async (form) => {
    setSaving(true);
    setFormError("");
    try {
      await crearPlanillaCasa(simulacionId, casa.id, buildPayload(form));
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err?.message || "Error al crear planilla.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = async (form) => {
    setSaving(true);
    setFormError("");
    try {
      await actualizarPlanillaCasa(simulacionId, casa.id, editingPlanilla.id, buildPayload(form));
      setEditingPlanilla(null);
      await load();
    } catch (err) {
      setFormError(err?.message || "Error al actualizar planilla.");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    try {
      await eliminarPlanillaCasa(simulacionId, casa.id, deletingId);
      setDeletingId(null);
      await load();
    } catch (err) {
      setError(err?.message || "Error al eliminar planilla.");
      setDeletingId(null);
    }
  };

  if (selectedPlanilla) {
    return (
      <PlanillaDetalle
        planilla={selectedPlanilla}
        casa={casa}
        simulacionId={simulacionId}
        onVolver={() => { setSelectedPlanilla(null); load(); }}
      />
    );
  }

  return (
    <div>
      <ConfirmModal
        isOpen={!!deletingId}
        title="Eliminar planilla"
        message="¿Estás seguro que querés eliminar esta planilla? Esta acción no se puede deshacer."
        onConfirm={handleEliminar}
        onCancel={() => setDeletingId(null)}
      />

      <div className="sim-breadcrumb" style={{ marginBottom: "1rem" }}>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Plan simulado</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Casas</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>{casaNombre}</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item">Planillas</span>
      </div>

      <div className="sim-section-header">
        <h3>Planillas de la casa</h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {showForm ? (
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setFormError(""); }}>Cancelar</button>
          ) : (
            <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingPlanilla(null); }}>Agregar planilla</button>
          )}
          <button className="btn btn-ghost" onClick={onVolver}>Volver a casa</button>
        </div>
      </div>

      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>{casaNombre}</p>

      {showForm && !editingPlanilla && (
        <PlanillaForm
          casaNombre={casaNombre}
          onGuardar={handleCrear}
          onCancelar={() => { setShowForm(false); setFormError(""); }}
          saving={saving}
          error={formError}
        />
      )}

      {loading && <p className="config-help">Cargando planillas...</p>}
      {error   && <p className="config-help" style={{ color: "red" }}>{error}</p>}
      {!loading && planillas.length === 0 && <p className="config-help">No hay planillas registradas.</p>}

      <div className="sim-sections-list">
        {planillas.map((p) => (
          <div key={p.id}>
            {editingPlanilla?.id === p.id ? (
              <PlanillaForm
                initial={{
                  numero:       p.numero ?? "",
                  fecha:        p.fecha?.split("T")[0] ?? TODAY,
                  vencimiento:  p.vencimiento?.split("T")[0] ?? "",
                  proveedor:    p.proveedor ?? "",
                  contratista:  p.contratista ?? "",
                  adherente:    p.adherente ?? casaNombre,
                  direccion:    p.direccion ?? "",
                  observaciones: p.observaciones ?? "",
                }}
                casaNombre={casaNombre}
                onGuardar={handleEditar}
                onCancelar={() => { setEditingPlanilla(null); setFormError(""); }}
                saving={saving}
                error={formError}
              />
            ) : (
              <PlanillaCard
                planilla={p}
                casaNombre={casaNombre}
                onOpen={() => setSelectedPlanilla(p)}
                onEdit={() => { setEditingPlanilla(p); setShowForm(false); }}
                onDelete={() => setDeletingId(p.id)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlanillasTab;
