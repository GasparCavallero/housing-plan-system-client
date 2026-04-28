import { useState, useEffect, useCallback } from "react";
import {
  listarPlanillasCasa,
  listarItemsPlanilla,
  crearMaterialPlanilla,
  actualizarMaterialPlanilla,
  eliminarMaterialPlanilla,
  listarMaterialesItem,
} from "../services/services.js";
import ConfirmModal from "../components/ConfirmModal.jsx";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

const FORM_EMPTY = {
  target: "", // Formato "planillaId::itemId"
  nombre: "",
  unidad: "u",
  proveedor: "",
  descripcion: "",
  cantidad_total: "0",
  cantidad_retirada: "0",
  cantidad_en_construccion: "0",
  precio_unitario_ars: "0",
  nota: "",
};

function MaterialForm({ initial, planillasConItems, onGuardar, onCancelar, saving, error, submitLabel, isEditing }) {
  const [form, setForm] = useState(initial ?? FORM_EMPTY);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="sim-casa-card" style={{ marginBottom: "1rem" }}>
      <div className="form-grid">
        {!isEditing && (
          <label style={{ gridColumn: "1 / -1" }}>
            Planilla e Item destino
            <select name="target" value={form.target} onChange={handleChange} required>
              <option value="">Seleccionar...</option>
              {planillasConItems.flatMap((p) =>
                (p.items ?? []).map((item) => (
                  <option key={`${p.id}::${item.id}`} value={`${p.id}::${item.id}`}>
                    Planilla {p.numero_planilla || p.numero || p.id} — Item {item.nombre}
                  </option>
                ))
              )}
            </select>
          </label>
        )}
        <label>
          Nombre
          <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required />
        </label>
        <label>
          Unidad
          <input type="text" name="unidad" value={form.unidad} onChange={handleChange} />
        </label>
        <label>
          Proveedor
          <input type="text" name="proveedor" value={form.proveedor} onChange={handleChange} />
        </label>
        <label>
          Descripción
          <input type="text" name="descripcion" value={form.descripcion} onChange={handleChange} />
        </label>
        <label>
          Cantidad total
          <input type="number" name="cantidad_total" value={form.cantidad_total} onChange={handleChange} min="0" step="0.01" />
        </label>
        <label>
          Cantidad retirada
          <input type="number" name="cantidad_retirada" value={form.cantidad_retirada} onChange={handleChange} min="0" step="0.01" />
        </label>
        <label>
          Cantidad en construcción
          <input type="number" name="cantidad_en_construccion" value={form.cantidad_en_construccion} onChange={handleChange} min="0" step="0.01" />
        </label>
        <label>
          Precio unitario ARS
          <input type="number" name="precio_unitario_ars" value={form.precio_unitario_ars} onChange={handleChange} min="0" step="0.01" />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Nota
          <textarea name="nota" value={form.nota} onChange={handleChange} rows={2} />
        </label>
      </div>
      {error && <p className="config-help" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.8rem" }}>
        <button className="btn btn-ghost" type="button" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primary" type="button" onClick={() => onGuardar(form)} disabled={saving}>
          {saving ? "Guardando..." : (submitLabel ?? "Guardar material")}
        </button>
      </div>
    </div>
  );
}

function MaterialesTab({ casa, simulacionId, onVolver }) {
  const [planillasConItems, setPlanillasConItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingItem, setEditingItem] = useState(null); // { planilla, item, material }
  const [deletingItem, setDeletingItem] = useState(null); // { planillaId, itemId, materialId }

  const casaNombre = casa.adherente_nombre ?? casa.descripcion ?? `Casa #${casa.id}`;

  const allMateriales = planillasConItems.flatMap((p) =>
    (p.items ?? []).flatMap((item) =>
      (item.materiales ?? []).map((mat) => ({ planilla: p, item, material: mat }))
    )
  );

  const totalMateriales = allMateriales.reduce(
    (acc, { material }) => acc + (Number(material.total_ars) || 0), 0
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const planillas = await listarPlanillasCasa(simulacionId, casa.id);
      const planillasRaw = Array.isArray(planillas) ? planillas : [];

      const planillasCompletas = await Promise.all(
        planillasRaw.map(async (p) => {
          try {
            const items = await listarItemsPlanilla(simulacionId, casa.id, p.id);
            const itemsArray = Array.isArray(items) ? items : [];

            const itemsConMateriales = await Promise.all(
              itemsArray.map(async (item) => {
                try {
                  const materiales = await listarMaterialesItem(simulacionId, casa.id, p.id, item.id);
                  return { ...item, materiales: Array.isArray(materiales) ? materiales : [] };
                } catch {
                  return { ...item, materiales: [] };
                }
              })
            );
            return { ...p, items: itemsConMateriales };
          } catch {
            return { ...p, items: [] };
          }
        })
      );
      setPlanillasConItems(planillasCompletas);
    } catch (err) {
      setError(err?.message || "Error al cargar materiales.");
    } finally {
      setLoading(false);
    }
  }, [simulacionId, casa.id]);

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(); 
  }, [load]);

  const buildPayload = (form) => ({
    nombre: form.nombre.trim(),
    unidad: form.unidad?.trim() || null,
    proveedor: form.proveedor?.trim() || null,
    descripcion: form.descripcion?.trim() || null,
    cantidad_total: Number(form.cantidad_total) || 0,
    cantidad_retirada: Number(form.cantidad_retirada) || 0,
    cantidad_en_construccion: Number(form.cantidad_en_construccion) || 0,
    precio_unitario_ars: Number(form.precio_unitario_ars) || 0,
    nota: form.nota?.trim() || null,
  });

  const handleCrear = async (form) => {
    if (!form.target) { setFormError("Seleccioná una planilla e item destino."); return; }
    if (!form.nombre?.trim()) { setFormError("El nombre es requerido."); return; }

    const [planillaId, itemId] = form.target.split("::");
    setSaving(true);
    try {
      await crearMaterialPlanilla(simulacionId, casa.id, planillaId, itemId, buildPayload(form));
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err?.message || "Error al crear material.");
    } finally { setSaving(false); }
  };

  const handleEditar = async (form) => {
    if (!form.nombre?.trim()) { setFormError("El nombre es requerido."); return; }
    setSaving(true);
    try {
      await actualizarMaterialPlanilla(
        simulacionId,
        casa.id,
        editingItem.planilla.id,
        editingItem.item.id,
        editingItem.material.id,
        buildPayload(form)
      );
      setEditingItem(null);
      await load();
    } catch (err) {
      setFormError(err?.message || "Error al actualizar material.");
    } finally { setSaving(false); }
  };

  const handleEliminar = async () => {
    try {
      await eliminarMaterialPlanilla(simulacionId, casa.id, deletingItem.planillaId, deletingItem.itemId, deletingItem.materialId);
      setDeletingItem(null);
      await load();
    } catch (err) {
      setError(err?.message || "Error al eliminar material.");
      setDeletingItem(null);
    }
  };

  return (
    <div>
      <ConfirmModal
        isOpen={!!deletingItem}
        title="Eliminar material"
        message="¿Estás seguro que querés eliminar este material? Esta acción no se puede deshacer."
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
        <span className="sim-breadcrumb-item">Materiales</span>
      </div>

      <div className="sim-section-header">
        <h3>Materiales de la casa</h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditingItem(null); }}>
            {showForm ? "Cancelar" : "Agregar material"}
          </button>
          <button className="btn btn-ghost" onClick={onVolver}>Volver a casa</button>
        </div>
      </div>

      {showForm && !editingItem && (
        <MaterialForm
          planillasConItems={planillasConItems}
          onGuardar={handleCrear}
          onCancelar={() => setShowForm(false)}
          saving={saving}
          error={formError}
        />
      )}

      {loading && <p className="config-help">Cargando materiales...</p>}
      {error && <p className="config-help" style={{ color: "red" }}>{error}</p>}

      {!loading && allMateriales.length > 0 && (
        <div className="table-wrap">
          <table className="sim-table">
            <thead>
              <tr>
                <th>Planilla/Item</th>
                <th>Material</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "right" }}>Retirado</th>
                <th style={{ textAlign: "right" }}>En Const.</th>
                <th style={{ textAlign: "right" }}>Precio U.</th>
                <th style={{ textAlign: "right" }}>Subtotal</th>
                <th style={{ textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {allMateriales.map(({ planilla, item, material }) => (
                editingItem?.material?.id === material.id ? (
                  <tr key={material.id}>
                    <td colSpan={8}>
                      <MaterialForm
                        isEditing
                        // initial={{
                        //   ...material,
                        //   target: `${planilla.id}::${item.id}`
                        // }}
                        initial={{
                          ...material,
                          cantidad_total: material.cantidad_total?.toString(),
                          cantidad_retirada: material.cantidad_retirada?.toString(),
                          cantidad_en_construccion: material.cantidad_en_construccion?.toString(),
                        }}
                        onGuardar={handleEditar}
                        onCancelar={() => setEditingItem(null)}
                        saving={saving}
                        error={formError}
                        submitLabel="Actualizar"
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={material.id}>
                    <td style={{ fontSize: "0.85rem", color: "#666" }}>
                      P{planilla.numero || planilla.id} / {item.nombre}
                    </td>
                    <td>
                      <strong>{material.nombre}</strong>
                      {material.proveedor && <div style={{ fontSize: "0.75rem", color: "#888" }}>Prov: {material.proveedor}</div>}
                      {material.nota && <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "#555" }}>Nota: {material.nota}</div>}
                    </td>
                    <td style={{ textAlign: "right" }}>{material.cantidad_total} {material.unidad}</td>
                    <td style={{ textAlign: "right" }}>{material.cantidad_retirada}</td>
                    <td style={{ textAlign: "right" }}>{material.cantidad_en_construccion}</td>
                    <td style={{ textAlign: "right" }}>{fmt(material.precio_unitario_ars)}</td>
                    <td style={{ textAlign: "right" }}><strong>{fmt(material.total_ars)}</strong></td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "0.3rem", justifyContent: "center" }}>
                        <button className="btn btn-ghost" style={{ padding: "2px 8px" }} onClick={() => setEditingItem({ planilla, item, material })}>Editar</button>
                        <button className="btn btn-ghost" style={{ padding: "2px 8px", color: "#c0392b" }} onClick={() => setDeletingItem({ planillaId: planilla.id, itemId: item.id, materialId: material.id })}>Borrar</button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: "bold", background: "#f5f5f5" }}>
                <td colSpan={6} style={{ textAlign: "right" }}>Total Consolidado</td>
                <td style={{ textAlign: "right" }}>{fmt(totalMateriales)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default MaterialesTab;