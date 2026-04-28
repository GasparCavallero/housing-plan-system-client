import { useState, useEffect, useCallback } from "react";
import {
  listarPlanillasCasa,
  crearItemPlanilla,
  actualizarItemPlanilla,
  eliminarItemPlanilla,
  listarItemsPlanilla,
} from "../services/services.js";
import ConfirmModal from "../components/ConfirmModal.jsx";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

const FORM_EMPTY = { planilla_id: "", nombre: "", proveedor: "", descripcion: "", orden: "1" };

function ItemForm({ initial, planillas, onGuardar, onCancelar, saving, error, submitLabel, showPlanilla }) {
  const [form, setForm] = useState(initial ?? FORM_EMPTY);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="sim-casa-card" style={{ marginBottom: "1rem" }}>
      <div className="form-grid">
        {showPlanilla && (
          <label style={{ gridColumn: "1 / -1" }}>
            Planilla destino
            <select name="planilla_id" value={form.planilla_id} onChange={handleChange} required>
              <option value="">Seleccionar...</option>
              {planillas.map((p) => (
                <option key={p.id} value={p.id}>
                  Planilla {p.numero || p.id}{p.proveedor ? ` — ${p.proveedor}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Nombre
          <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required />
        </label>
        <label>
          Proveedor
          <input type="text" name="proveedor" value={form.proveedor} onChange={handleChange} />
        </label>
        <label>
          Orden
          <input type="number" name="orden" value={form.orden} onChange={handleChange} step="1" min="1" />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Descripción
          <input type="text" name="descripcion" value={form.descripcion} onChange={handleChange} />
        </label>
      </div>
      {error && <p className="config-help" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.8rem" }}>
        <button className="btn btn-ghost" type="button" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primary" type="button" onClick={() => onGuardar(form)} disabled={saving}>
          {saving ? "Guardando..." : (submitLabel ?? "Guardar item")}
        </button>
      </div>
    </div>
  );
}

function ItemCard({ item, planilla, onEdit, onDelete }) {
  const materialesCount = item.materiales?.length ?? item.cantidad_total ?? 0;
  const monto = item.total_materiales_ars ?? 0;

  return (
    <div className="sim-section-card" style={{ cursor: "default" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="sim-section-label">
            Planilla {planilla?.numero || planilla?.id}
            {item.orden != null ? ` · Orden ${item.orden}` : ""}
          </p>
          <p className="sim-section-title">{item.nombre}</p>
          <p className="sim-section-desc">
            Materiales: {materialesCount} | Monto: {fmt(monto)}
            {item.proveedor ? ` | ${item.proveedor}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <button
            className="btn btn-ghost"
            style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }}
            onClick={onEdit}
          >
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

function ItemsTab({ casa, simulacionId, onVolver }) {
  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null); // { planillaId, itemId }

  const casaNombre = casa.adherente_nombre ?? casa.descripcion ?? `Casa #${casa.id}`;

  // Todos los items aplanados con referencia a su planilla
  const allItems = planillas.flatMap((p) =>
    (p.items ?? []).map((item) => ({ item, planilla: p }))
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarPlanillasCasa(simulacionId, casa.id);
      const planillasRaw = Array.isArray(data) ? data : [];

      // cargar items de cada planilla
      const planillasConItems = await Promise.all(
        planillasRaw.map(async (p) => {
          try {
            const items = await listarItemsPlanilla(simulacionId, casa.id, p.id);
            return { ...p, items: Array.isArray(items) ? items : [] };
          } catch {
            return { ...p, items: [] };
          }
        })
      );

      setPlanillas(planillasConItems);
    } catch (err) {
      setError(err?.message || "Error al cargar items.");
    } finally {
      setLoading(false);
    }
  }, [simulacionId, casa.id]); 

useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  load();
}, [load]);

const buildPayload = (form) => ({
  nombre: form.nombre?.trim(),
  proveedor: form.proveedor?.trim() || null,
  descripcion: form.descripcion?.trim() || null,
  orden: form.orden ? Number(form.orden) : null,
});

const handleCrear = async (form) => {
  if (!form.planilla_id) { setFormError("Seleccioná una planilla destino."); return; }
  if (!form.nombre?.trim()) { setFormError("El nombre es requerido."); return; }
  setSaving(true);
  setFormError("");
  try {
    await crearItemPlanilla(simulacionId, casa.id, form.planilla_id, buildPayload(form));
    setShowForm(false);
    await load();
  } catch (err) {
    setFormError(err?.message || "Error al crear item.");
  } finally { setSaving(false); }
};

const handleEditar = async (form) => {
  if (!form.nombre?.trim()) { setFormError("El nombre es requerido."); return; }
  setSaving(true);
  setFormError("");
  try {
    await actualizarItemPlanilla(
      simulacionId,
      casa.id,
      editingItem.planilla.id,
      editingItem.item.id,
      buildPayload(form)
    );
    setEditingItem(null);
    await load();
  } catch (err) {
    setFormError(err?.message || "Error al actualizar item.");
  } finally { setSaving(false); }
};

const handleEliminar = async () => {
  try {
    await eliminarItemPlanilla(simulacionId, casa.id, deletingItem.planillaId, deletingItem.itemId);
    setDeletingItem(null);
    await load();
  } catch (err) {
    setError(err?.message || "Error al eliminar item.");
    setDeletingItem(null);
  }
};

return (
  <div>
    <ConfirmModal
      isOpen={!!deletingItem}
      title="Eliminar item"
      message="¿Estás seguro que querés eliminar este item y todos sus materiales? Esta acción no se puede deshacer."
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
      <span className="sim-breadcrumb-item">Items</span>
    </div>

    <div className="sim-section-header">
      <h3>Items de la casa</h3>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {showForm ? (
          <button className="btn btn-secondary" onClick={() => { setShowForm(false); setFormError(""); }}>Cancelar</button>
        ) : (
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingItem(null); }}>Agregar item</button>
        )}
        <button className="btn btn-ghost" onClick={onVolver}>Volver a casa</button>
      </div>
    </div>

    <p className="config-help" style={{ marginBottom: "1rem" }}>
      Todos los items de todas las planillas
    </p>

    {showForm && !editingItem && (
      <ItemForm
        planillas={planillas}
        onGuardar={handleCrear}
        onCancelar={() => { setShowForm(false); setFormError(""); }}
        saving={saving}
        error={formError}
        submitLabel="Agregar item"
        showPlanilla
      />
    )}

    {loading && <p className="config-help">Cargando items...</p>}
    {error && <p className="config-help" style={{ color: "red" }}>{error}</p>}
    {!loading && allItems.length === 0 && <p className="config-help">Sin items cargados.</p>}

    <div className="sim-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
      {allItems.map(({ item, planilla }) => (
        editingItem?.item?.id === item.id ? (
          <div key={item.id} style={{ gridColumn: "1 / -1" }}>
            <ItemForm
              initial={{
                planilla_id: planilla.id,
                nombre: item.nombre ?? "",
                proveedor: item.proveedor ?? "",
                descripcion: item.descripcion ?? "",
                orden: item.orden ?? "1",
              }}
              planillas={planillas}
              onGuardar={handleEditar}
              onCancelar={() => { setEditingItem(null); setFormError(""); }}
              saving={saving}
              error={formError}
              submitLabel="Guardar item"
              showPlanilla={false}
            />
          </div>
        ) : (
          <ItemCard
            key={item.id}
            item={item}
            planilla={planilla}
            onEdit={() => { setEditingItem({ item, planilla }); setShowForm(false); setFormError(""); }}
            onDelete={() => setDeletingItem({ planillaId: planilla.id, itemId: item.id })}
          />
        )
      ))}
    </div>
  </div>
);
}

export default ItemsTab;
