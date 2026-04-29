import { useState, useEffect, useCallback } from "react";
import {
  listarManoObraCasa,
  crearManoObraCasa,
  actualizarManoObraCasa,
  eliminarManoObraCasa,
} from "../services/services.js";
import ConfirmModal from "../components/ConfirmModal.jsx";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

const FORM_EMPTY = {
  rubro: "",
  tipo: "monto_fijo",
  monto_ars: "0",
  fecha: new Date().toISOString().split("T")[0],
  descripcion: "",
};

function ManoDeObraForm({ initial, onGuardar, onCancelar, saving, error, submitLabel }) {
  const [form, setForm] = useState(initial ?? FORM_EMPTY);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="sim-casa-card" style={{ marginBottom: "1rem" }}>
      <div className="form-grid">
        <label>
          Rubro
          <input type="text" name="rubro" value={form.rubro} onChange={handleChange} required placeholder="Ej: Albañilería" />
        </label>
        <label>
          Tipo de mano de obra
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <input type="radio" name="tipo" value="monto_fijo" checked={form.tipo === "monto_fijo"} onChange={handleChange} /> Monto fijo
            </label>
            <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <input type="radio" name="tipo" value="porcentaje" checked={form.tipo === "porcentaje"} onChange={handleChange} /> Porcentaje
            </label>
          </div>
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Monto ARS
          <input type="number" name="monto_ars" value={form.monto_ars} onChange={handleChange} min="0" step="0.01" />
        </label>
        <label>
          Fecha
          <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required />
        </label>
        <label>
          Descripción
          <input type="text" name="descripcion" value={form.descripcion} onChange={handleChange} />
        </label>
      </div>
      {error && <p className="config-help" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.8rem" }}>
        <button className="btn btn-ghost" type="button" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primary" type="button" onClick={() => onGuardar(form)} disabled={saving}>
          {saving ? "Guardando..." : (submitLabel ?? "Guardar")}
        </button>
      </div>
    </div>
  );
}

function ManoDeObraCard({ item, onEdit, onDelete }) {
  return (
    <div className="sim-section-card" style={{ cursor: "default" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="sim-section-label">
            {item.fecha ? new Date(item.fecha).toLocaleDateString() : "Sin fecha"}
            {item.tipo === "porcentaje" ? " · Porcentaje" : " · Monto fijo"}
          </p>
          <p className="sim-section-title">{item.rubro}</p>
          <p className="sim-section-desc">
            Monto: {fmt(item.monto_ars)}
            {item.descripcion ? ` | ${item.descripcion}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <button className="btn btn-ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }} onClick={onEdit}>
            Editar
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem", color: "#c0392b", borderColor: "#c0392b" }}
            onClick={onDelete}
          >
            Borrar
          </button>
        </div>
      </div>
    </div>
  );
}

function ManoDeObraTab({ casa, simulacionId, onVolver }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  const casaNombre = casa.adherente_nombre ?? casa.descripcion ?? `Casa #${casa.id}`;
  const totalManoObra = items.reduce((acc, curr) => acc + (Number(curr.monto_ars) || 0), 0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarManoObraCasa(simulacionId, casa.id);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Error al cargar mano de obra.");
    } finally {
      setLoading(false);
    }
  }, [simulacionId, casa.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const buildPayload = (form) => ({
    rubro: form.rubro?.trim(),
    tipo: form.tipo,
    monto_ars: Number(form.monto_ars) || 0,
    fecha: form.fecha,
    descripcion: form.descripcion?.trim() || null,
  });

  const handleCrear = async (form) => {
    if (!form.rubro?.trim()) { setFormError("El rubro es requerido."); return; }
    setSaving(true);
    setFormError("");
    try {
      await crearManoObraCasa(simulacionId, casa.id, buildPayload(form));
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err?.message || "Error al crear registro.");
    } finally { setSaving(false); }
  };

  const handleEditar = async (form) => {
    if (!form.rubro?.trim()) { setFormError("El rubro es requerido."); return; }
    setSaving(true);
    setFormError("");
    try {
      await actualizarManoObraCasa(simulacionId, casa.id, editingItem.id, buildPayload(form));
      setEditingItem(null);
      await load();
    } catch (err) {
      setFormError(err?.message || "Error al actualizar registro.");
    } finally { setSaving(false); }
  };

  const handleEliminar = async () => {
    try {
      await eliminarManoObraCasa(simulacionId, casa.id, deletingItem.id);
      setDeletingItem(null);
      await load();
    } catch (err) {
      setError(err?.message || "Error al eliminar registro.");
      setDeletingItem(null);
    }
  };

  return (
    <div>
      <ConfirmModal
        isOpen={!!deletingItem}
        title="Eliminar mano de obra"
        message="¿Estás seguro que querés eliminar este registro de mano de obra?"
        onConfirm={handleEliminar}
        onCancel={() => setDeletingItem(null)}
      />

      <div className="sim-breadcrumb" style={{ marginBottom: "1rem" }}>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Plan simulado</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Casas</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>{casaNombre}</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item">Mano de obra</span>
      </div>

      <div className="sim-section-header">
        <h3>Mano de obra de la casa</h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {showForm ? (
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setFormError(""); }}>Cancelar</button>
          ) : (
            <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingItem(null); }}>Agregar mano de obra</button>
          )}
          <button className="btn btn-ghost" onClick={onVolver}>Volver a casa</button>
        </div>
      </div>

      <p className="config-help" style={{ marginBottom: "1rem" }}>
        Total acumulado: <strong>{fmt(totalManoObra)}</strong>
      </p>

      {showForm && !editingItem && (
        <ManoDeObraForm
          onGuardar={handleCrear}
          onCancelar={() => { setShowForm(false); setFormError(""); }}
          saving={saving}
          error={formError}
          submitLabel="Agregar mano de obra"
        />
      )}

      {loading && <p className="config-help">Cargando registros...</p>}
      {error && <p className="config-help" style={{ color: "red" }}>{error}</p>}
      {!loading && items.length === 0 && <p className="config-help">Sin registros de mano de obra.</p>}

      <div className="sim-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {items.map((item) => (
          editingItem?.id === item.id ? (
            <div key={item.id} style={{ gridColumn: "1 / -1" }}>
              <ManoDeObraForm
                initial={{
                  rubro: item.rubro ?? "",
                  tipo: item.tipo ?? "monto_fijo",
                  monto_ars: item.monto_ars ?? "0",
                  fecha: item.fecha ? item.fecha.split("T")[0] : "",
                  descripcion: item.descripcion ?? "",
                }}
                onGuardar={handleEditar}
                onCancelar={() => { setEditingItem(null); setFormError(""); }}
                saving={saving}
                error={formError}
                submitLabel="Guardar cambios"
              />
            </div>
          ) : (
            <ManoDeObraCard
              key={item.id}
              item={item}
              onEdit={() => { setEditingItem(item); setShowForm(false); setFormError(""); }}
              onDelete={() => setDeletingItem(item)}
            />
          )
        ))}
      </div>
    </div>
  );
}

export default ManoDeObraTab;