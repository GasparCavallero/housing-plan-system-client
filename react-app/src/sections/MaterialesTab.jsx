import { useState, useEffect, useCallback } from "react";
import {
  listarPlanillasCasa,
  listarItemsPlanilla,
  crearMaterialPlanilla,
  listarMaterialesItem,
} from "../services/services.js";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

const FORM_EMPTY = {
  target: "",
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

function MaterialForm({ planillasConItems, onGuardar, onCancelar, saving, error }) {
  const [form, setForm] = useState(FORM_EMPTY);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="sim-casa-card" style={{ marginBottom: "1rem" }}>
      <div className="form-grid">
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
          {saving ? "Guardando..." : "Agregar material"}
        </button>
      </div>
    </div>
  );
}

function MaterialesTab({ casa, simulacionId, onVolver }) {
  const [planillasConItems, setPlanillasConItems] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState("");

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
      // 1. Traemos las planillas
      const planillas = await listarPlanillasCasa(simulacionId, casa.id);
      const planillasRaw = Array.isArray(planillas) ? planillas : [];

      // 2. Traemos los ítems de cada planilla Y los materiales de cada ítem
      const planillasCompletas = await Promise.all(
        planillasRaw.map(async (p) => {
          try {
            const items = await listarItemsPlanilla(simulacionId, casa.id, p.id);
            const itemsArray = Array.isArray(items) ? items : [];

            // AQUÍ ESTÁ EL CAMBIO: Para cada ítem, buscamos sus materiales
            const itemsConMateriales = await Promise.all(
              itemsArray.map(async (item) => {
                try {
                  const materiales = await listarMaterialesItem(simulacionId, casa.id, p.id, item.id);
                  return { ...item, materiales: Array.isArray(materiales) ? materiales : [] };
                } catch (err) {
                  console.error(`Error cargando materiales para ítem ${item.id}:`, err);
                  return { ...item, materiales: [] };
                }
              })
            );

            return { ...p, items: itemsConMateriales };
          } catch (err) {
            console.error(`Error cargando ítems para planilla ${p.id}:`, err);
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

  const handleCrear = async (form) => {
    if (!form.target) { setFormError("Seleccioná una planilla e item destino."); return; }
    if (!form.nombre?.trim()) { setFormError("El nombre es requerido."); return; }

    const [planillaId, itemId] = form.target.split("::");

    setSaving(true);
    setFormError("");
    try {
      await crearMaterialPlanilla(simulacionId, casa.id, planillaId, itemId, {
        nombre:                   form.nombre.trim(),
        unidad:                   form.unidad?.trim() || null,
        proveedor:                form.proveedor?.trim() || null,
        descripcion:              form.descripcion?.trim() || null,
        cantidad_total:           Number(form.cantidad_total) || 0,
        cantidad_retirada:        Number(form.cantidad_retirada) || 0,
        cantidad_en_construccion: Number(form.cantidad_en_construccion) || 0,
        precio_unitario_ars:      Number(form.precio_unitario_ars) || 0,
        nota:                     form.nota?.trim() || null,
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err?.message || "Error al crear material.");
    } finally { setSaving(false); }
  };

  return (
    <div>
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
          {showForm ? (
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setFormError(""); }}>Cancelar</button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>Agregar material</button>
          )}
          <button className="btn btn-ghost" onClick={onVolver}>Volver a casa</button>
        </div>
      </div>

      <p className="config-help" style={{ marginBottom: "1rem" }}>Vista consolidada de todos los materiales</p>

      {showForm && (
        <MaterialForm
          planillasConItems={planillasConItems}
          onGuardar={handleCrear}
          onCancelar={() => { setShowForm(false); setFormError(""); }}
          saving={saving}
          error={formError}
        />
      )}

      {loading && <p className="config-help">Cargando materiales...</p>}
      {error   && <p className="config-help" style={{ color: "red" }}>{error}</p>}
      {!loading && allMateriales.length === 0 && <p className="config-help">Sin materiales cargados.</p>}

      {allMateriales.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Planilla</th>
                <th>Item</th>
                <th>Material</th>
                <th style={{ textAlign: "right" }}>Cantidad</th>
                <th style={{ textAlign: "right" }}>Precio Unit.</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {allMateriales.map(({ planilla, item, material }) => (
                <tr key={material.id}>
                  <td>{planilla.numero_planilla ?? planilla.numero ?? planilla.id}</td>
                  <td>{item.nombre}</td>
                  <td>
                    <strong>{material.nombre}</strong>
                    {material.proveedor ? ` (${material.proveedor})` : ""}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {material.cantidad_total} {material.unidad}
                  </td>
                  <td style={{ textAlign: "right" }}>{fmt(material.precio_unitario_ars)}</td>
                  <td style={{ textAlign: "right" }}><strong>{fmt(material.total_ars)}</strong></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ textAlign: "right", fontWeight: 600, paddingTop: "0.5rem" }}>Total</td>
                <td style={{ textAlign: "right", fontWeight: 600, paddingTop: "0.5rem" }}>{fmt(totalMateriales)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default MaterialesTab;