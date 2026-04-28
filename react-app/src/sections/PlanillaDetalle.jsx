import { useState, useEffect, useCallback } from "react";
import {
  listarItemsPlanilla,
  crearItemPlanilla,
  actualizarItemPlanilla,
  eliminarItemPlanilla,
  // listarMaterialesItem,
  crearMaterialPlanilla,
  actualizarMaterialPlanilla,
  eliminarMaterialPlanilla,
  listarMovimientosMaterial,
  registrarMovimientoEntrega,
} from "../services/services.js";
import ConfirmModal from "../components/ConfirmModal.jsx";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

// ── Formularios inline ────────────────────────────────────────────────────────

function ItemForm({ initial, onGuardar, onCancelar, saving, error }) {
  const [form, setForm] = useState(initial ?? { nombre: "", proveedor: "", descripcion: "" });
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  return (
    <div className="sim-casa-card" style={{ marginBottom: "0.8rem" }}>
      <div className="form-grid">
        <label>Nombre<input type="text" name="nombre" value={form.nombre} onChange={handleChange} /></label>
        <label>Proveedor<input type="text" name="proveedor" value={form.proveedor} onChange={handleChange} /></label>
        <label style={{ gridColumn: "1 / -1" }}>Descripción<input type="text" name="descripcion" value={form.descripcion} onChange={handleChange} /></label>
      </div>
      {error && <p className="config-help" style={{ color: "red" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.8rem" }}>
        <button className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onGuardar(form)} disabled={saving}>{saving ? "Guardando..." : "Guardar item"}</button>
      </div>
    </div>
  );
}

function MaterialForm({ initial, onGuardar, onCancelar, saving, error }) {
  const [form, setForm] = useState(initial ?? { nombre: "", proveedor: "", descripcion: "", unidad: "", cantidad_total: "", precio_unitario_ars: "" });
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  return (
    <div className="sim-casa-card" style={{ margin: "0.5rem 0 0.8rem 1.5rem" }}>
      <div className="form-grid">
        <label>Nombre<input type="text" name="nombre" value={form.nombre} onChange={handleChange} /></label>
        <label>Proveedor<input type="text" name="proveedor" value={form.proveedor} onChange={handleChange} /></label>
        <label>Unidad<input type="text" name="unidad" value={form.unidad} onChange={handleChange} placeholder="Bolsas, Litros..." /></label>
        <label>Cantidad total<input type="number" name="cantidad_total" value={form.cantidad_total} onChange={handleChange} /></label>
        <label>Precio unitario ARS<input type="number" name="precio_unitario_ars" value={form.precio_unitario_ars} onChange={handleChange} /></label>
        <label style={{ gridColumn: "1 / -1" }}>Descripción<input type="text" name="descripcion" value={form.descripcion} onChange={handleChange} /></label>
      </div>
      {error && <p className="config-help" style={{ color: "red" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.8rem" }}>
        <button className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onGuardar(form)} disabled={saving}>{saving ? "Guardando..." : "Guardar material"}</button>
      </div>
    </div>
  );
}

function MovimientoForm({ onGuardar, onCancelar, saving, error }) {
  const [form, setForm] = useState({ cantidad: "", tipo: "retiro", observaciones: "" });
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  return (
    <div className="sim-casa-card" style={{ margin: "0.5rem 0 0.8rem 1.5rem" }}>
      <div className="form-grid">
        <label>
          Tipo
          <select name="tipo" value={form.tipo} onChange={handleChange}>
            <option value="retiro">Retiro</option>
            <option value="entrega">Entrega en obra</option>
          </select>
        </label>
        <label>Cantidad<input type="number" name="cantidad" value={form.cantidad} onChange={handleChange} /></label>
        <label style={{ gridColumn: "1 / -1" }}>Observaciones<input type="text" name="observaciones" value={form.observaciones} onChange={handleChange} /></label>
      </div>
      {error && <p className="config-help" style={{ color: "red" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.8rem" }}>
        <button className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onGuardar(form)} disabled={saving}>{saving ? "Guardando..." : "Agregar movimiento"}</button>
      </div>
    </div>
  );
}

// ── Material con movimientos ──────────────────────────────────────────────────

function MaterialRow({ material, simulacionId, casaId, planillaId, itemId, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMov, setLoadingMov] = useState(false);
  const [showMovForm, setShowMovForm] = useState(false);
  const [savingMov, setSavingMov] = useState(false);
  const [movError, setMovError] = useState("");

  const loadMovimientos = async () => {
    setLoadingMov(true);
    try {
      const data = await listarMovimientosMaterial({
        simulacion_id: simulacionId,
        casa_id: casaId,
        planilla_id: planillaId,
        item_id: itemId,
        material_id: material.id,
      });
      setMovimientos(Array.isArray(data) ? data : []);
    } catch { setMovimientos([]); }
    finally { setLoadingMov(false); }
  };

  const handleToggle = () => {
    if (!expanded) loadMovimientos();
    setExpanded((v) => !v);
  };

  const handleMovimiento = async (form) => {
    setSavingMov(true);
    setMovError("");
    try {
      await registrarMovimientoEntrega({
        simulacion_id: simulacionId,
        casa_id: casaId,
        planilla_id: planillaId,
        item_id: itemId,
        material_id: material.id,
        cantidad: Number(form.cantidad),
        tipo: form.tipo,
        observaciones: form.observaciones?.trim() || null,
      });
      setShowMovForm(false);
      await loadMovimientos();
    } catch (err) {
      setMovError(err?.message || "Error al registrar movimiento.");
    } finally { setSavingMov(false); }
  };

  return (
    <div className="sim-casa-card" style={{ margin: "0.5rem 0 0 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="sim-section-label">MATERIAL #{material.id}</p>
          <p className="sim-section-title">{material.nombre}</p>
          <p className="sim-section-desc">
            Total {fmt(material.total_ars)} | Cantidad {material.cantidad_total} {material.unidad}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <span className="sim-badge">Retirado {material.cantidad_retirada ?? 0}</span>
          <span className="sim-badge">En obra {material.cantidad_en_construccion ?? 0}</span>
          <button className="btn btn-ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }} onClick={onEdit}>Editar material</button>
          <button className="btn btn-primary" style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }} onClick={() => { setShowMovForm(true); setExpanded(true); }}>Agregar movimiento</button>
          <button className="btn btn-ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem", color: "#c0392b", borderColor: "#c0392b" }} onClick={onDelete}>Eliminar</button>
          <span style={{ cursor: "pointer", color: "var(--primary)", fontWeight: 600, padding: "0 0.3rem" }} onClick={handleToggle}>{expanded ? "–" : "+"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: "0.8rem" }}>
          <p style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>Movimientos</p>
          {showMovForm && (
            <MovimientoForm
              onGuardar={handleMovimiento}
              onCancelar={() => { setShowMovForm(false); setMovError(""); }}
              saving={savingMov}
              error={movError}
            />
          )}
          {loadingMov && <p className="config-help">Cargando...</p>}
          {!loadingMov && movimientos.length === 0 && <p className="config-help">Sin movimientos cargados.</p>}
          {movimientos.map((mov, i) => (
            <div key={i} style={{ fontSize: "0.82rem", color: "var(--muted)", borderTop: "1px solid var(--border)", padding: "0.4rem 0" }}>
              {mov.tipo} — {mov.cantidad} {material.unidad} {mov.observaciones ? `| ${mov.observaciones}` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Item con materiales ───────────────────────────────────────────────────────

function ItemRow({ item, simulacionId, casaId, planillaId, onEdit, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(true);
  const [showMatForm, setShowMatForm] = useState(false);
  const [editingMat, setEditingMat] = useState(null);
  const [deletingMatId, setDeletingMatId] = useState(null);
  const [savingMat, setSavingMat] = useState(false);
  const [matError, setMatError] = useState("");

  const materiales = item.materiales ?? [];

  const buildMatPayload = (form) => ({
    nombre: form.nombre?.trim(),
    proveedor: form.proveedor?.trim() || null,
    descripcion: form.descripcion?.trim() || null,
    unidad: form.unidad?.trim() || null,
    cantidad_total: Number(form.cantidad_total) || 0,
    precio_unitario_ars: Number(form.precio_unitario_ars) || 0,
  });

  const handleCrearMat = async (form) => {
    setSavingMat(true);
    setMatError("");
    try {
      await crearMaterialPlanilla(simulacionId, casaId, planillaId, item.id, buildMatPayload(form));
      setShowMatForm(false);
      onRefresh();
    } catch (err) {
      setMatError(err?.message || "Error al crear material.");
    } finally { setSavingMat(false); }
  };

  const handleEditarMat = async (form) => {
    setSavingMat(true);
    setMatError("");
    try {
      await actualizarMaterialPlanilla(simulacionId, casaId, planillaId, item.id, editingMat.id, buildMatPayload(form));
      setEditingMat(null);
      onRefresh();
    } catch (err) {
      setMatError(err?.message || "Error al actualizar material.");
    } finally { setSavingMat(false); }
  };

  const handleEliminarMat = async () => {
    try {
      await eliminarMaterialPlanilla(simulacionId, casaId, planillaId, item.id, deletingMatId);
      setDeletingMatId(null);
      onRefresh();
    } catch (err) {
      setMatError(err?.message || "Error al eliminar material.");
      setDeletingMatId(null);
    }
  };

  return (
    <div className="sim-casa-card" style={{ marginBottom: "0.8rem" }}>
      <ConfirmModal
        isOpen={!!deletingMatId}
        title="Eliminar material"
        message="¿Eliminás este material?"
        onConfirm={handleEliminarMat}
        onCancel={() => setDeletingMatId(null)}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="sim-section-label">ITEM #{item.id}</p>
          <p className="sim-section-title">{item.nombre}</p>
          <p className="sim-section-desc">Total materiales {fmt(item.total_materiales_ars)}</p>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <span className="sim-badge">{materiales.length} materiales</span>
          <button className="btn btn-ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }} onClick={onEdit}>Editar item</button>
          <button className="btn btn-primary" style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }} onClick={() => { setShowMatForm(true); setExpanded(true); }}>Agregar material</button>
          <button className="btn btn-ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem", color: "#c0392b", borderColor: "#c0392b" }} onClick={onDelete}>Eliminar</button>
          <span style={{ cursor: "pointer", color: "var(--primary)", fontWeight: 600, padding: "0 0.3rem" }} onClick={() => setExpanded((v) => !v)}>{expanded ? "–" : "+"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: "0.8rem" }}>
          {showMatForm && (
            <MaterialForm
              onGuardar={handleCrearMat}
              onCancelar={() => { setShowMatForm(false); setMatError(""); }}
              saving={savingMat}
              error={matError}
            />
          )}

          {materiales.map((mat) => (
            editingMat?.id === mat.id ? (
              <MaterialForm
                key={mat.id}
                initial={{
                  nombre: mat.nombre ?? "",
                  proveedor: mat.proveedor ?? "",
                  descripcion: mat.descripcion ?? "",
                  unidad: mat.unidad ?? "",
                  cantidad_total: mat.cantidad_total ?? "",
                  precio_unitario_ars: mat.precio_unitario_ars ?? "",
                }}
                onGuardar={handleEditarMat}
                onCancelar={() => { setEditingMat(null); setMatError(""); }}
                saving={savingMat}
                error={matError}
              />
            ) : (
              <MaterialRow
                key={mat.id}
                material={mat}
                simulacionId={simulacionId}
                casaId={casaId}
                planillaId={planillaId}
                itemId={item.id}
                onEdit={() => setEditingMat(mat)}
                onDelete={() => setDeletingMatId(mat.id)}
              />
            )
          ))}

          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
            <span className="sim-badge">Total item: {fmt(item.total_materiales_ars)}</span>
            <span className="sim-badge">Materiales: {materiales.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Detalle de planilla ───────────────────────────────────────────────────────

function PlanillaDetalle({ planilla, casa, simulacionId, onVolver }) {
  const [items, setItems] = useState(planilla.items ?? []);
  const [loading, setLoading] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState("");

  const casaNombre = casa.adherente_nombre ?? casa.descripcion ?? `Casa #${casa.id}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarItemsPlanilla(simulacionId, casa.id, planilla.id);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading items:", err);
    }
    finally { setLoading(false); }
  }, [simulacionId, casa.id, planilla.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const buildItemPayload = (form) => ({
    nombre: form.nombre?.trim(),
    proveedor: form.proveedor?.trim() || null,
    descripcion: form.descripcion?.trim() || null,
  });

  const handleCrearItem = async (form) => {
    setSavingItem(true);
    setItemError("");
    try {
      await crearItemPlanilla(simulacionId, casa.id, planilla.id, buildItemPayload(form));
      setShowItemForm(false);
      await load();
    } catch (err) {
      setItemError(err?.message || "Error al crear item.");
    } finally { setSavingItem(false); }
  };

  const handleEditarItem = async (form) => {
    setSavingItem(true);
    setItemError("");
    try {
      await actualizarItemPlanilla(simulacionId, casa.id, planilla.id, editingItem.id, buildItemPayload(form));
      setEditingItem(null);
      await load();
    } catch (err) {
      setItemError(err?.message || "Error al actualizar item.");
    } finally { setSavingItem(false); }
  };

  const handleEliminarItem = async () => {
    try {
      await eliminarItemPlanilla(simulacionId, casa.id, planilla.id, deletingItemId);
      setDeletingItemId(null);
      await load();
    } catch (err) {
      setItemError(err?.message || "Error al eliminar item.");
      setDeletingItemId(null);
    }
  };

  const itemsCount = items.length;
  const montoTotal = items.reduce((acc, it) => acc + (it.total_materiales_ars ?? 0), 0);

  return (
    <div>
      <ConfirmModal
        isOpen={!!deletingItemId}
        title="Eliminar item"
        message="¿Eliminás este item y todos sus materiales?"
        onConfirm={handleEliminarItem}
        onCancel={() => setDeletingItemId(null)}
      />

      <div className="sim-breadcrumb" style={{ marginBottom: "1rem" }}>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Plan simulado</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Casas</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>{casaNombre}</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Planillas</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item">Planilla #{planilla.id}</span>
      </div>

      <div className="sim-section-header">
        <h3>Planilla #{planilla.id}</h3>
        <button className="btn btn-ghost" onClick={onVolver}>Volver a planillas</button>
      </div>

      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
        {planilla.proveedor ?? casaNombre}
      </p>

      <div className="sim-casa-card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <p className="sim-section-label">PLANILLA #{planilla.id}</p>
            <p className="sim-section-title">{planilla.proveedor ?? `Planilla #${planilla.id}`}</p>
            <p className="sim-section-desc">Items {itemsCount} | Materiales {fmt(montoTotal)}</p>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {planilla.fecha && <span className="sim-badge">{new Date(planilla.fecha).toLocaleDateString("es-AR")}</span>}
            {planilla.vencimiento && <span className="sim-badge">Vto {new Date(planilla.vencimiento).toLocaleDateString("es-AR")}</span>}
            <button
              className="btn btn-primary"
              style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }}
              onClick={() => { setShowItemForm(true); setEditingItem(null); }}
            >
              Agregar item
            </button>
          </div>
        </div>
      </div>

      {showItemForm && !editingItem && (
        <ItemForm
          onGuardar={handleCrearItem}
          onCancelar={() => { setShowItemForm(false); setItemError(""); }}
          saving={savingItem}
          error={itemError}
        />
      )}

      {loading && <p className="config-help">Cargando items...</p>}
      {!loading && items.length === 0 && <p className="config-help">No hay items registrados.</p>}

      {items.map((item) => (
        editingItem?.id === item.id ? (
          <ItemForm
            key={item.id}
            initial={{ nombre: item.nombre ?? "", proveedor: item.proveedor ?? "", descripcion: item.descripcion ?? "" }}
            onGuardar={handleEditarItem}
            onCancelar={() => { setEditingItem(null); setItemError(""); }}
            saving={savingItem}
            error={itemError}
          />
        ) : (
          <ItemRow
            key={item.id}
            item={item}
            simulacionId={simulacionId}
            casaId={casa.id}
            planillaId={planilla.id}
            onEdit={() => { setEditingItem(item); setShowItemForm(false); }}
            onDelete={() => setDeletingItemId(item.id)}
            onRefresh={load}
          />
        )
      ))}
    </div>
  );
}

export default PlanillaDetalle;