import { useState, useEffect, useCallback } from "react";
import {
  listarGastosCasa,
  crearGastoCasa,
  actualizarGastoCasa,
  eliminarGastoCasa,
} from "../services/services.js";
import ConfirmModal from "../components/ConfirmModal.jsx";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

const FORM_EMPTY = { nombre: "", monto_ars: "", descripcion: "" };

function GastoForm({ initial, onGuardar, onCancelar, saving, error, submitLabel }) {
  const [form, setForm] = useState(initial ?? FORM_EMPTY);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  return (
    <div className="sim-casa-card" style={{ marginBottom: "1rem" }}>
      <div className="form-grid">
        <label>
          Nombre
          <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required />
        </label>
        <label>
          Monto ARS
          <input type="number" name="monto_ars" value={form.monto_ars} onChange={handleChange} min="0" step="0.01" required />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Descripción
          <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2} />
        </label>
      </div>
      {error && <p className="config-help" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.8rem" }}>
        <button className="btn btn-ghost" type="button" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primary" type="button" onClick={() => onGuardar(form)} disabled={saving}>
          {saving ? "Guardando..." : (submitLabel ?? "Guardar gasto")}
        </button>
      </div>
    </div>
  );
}

function GastosTab({ casa, simulacionId, onVolver }) {
  const [gastos, setGastos]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState("");
  const [editingGasto, setEditingGasto] = useState(null);
  const [deletingId, setDeletingId]     = useState(null);

  const casaNombre = casa.adherente_nombre ?? casa.descripcion ?? `Casa #${casa.id}`;

  const totalGastos = gastos.reduce((acc, g) => acc + (Number(g.monto_ars) || 0), 0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarGastosCasa(simulacionId, casa.id);
      setGastos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Error al cargar gastos.");
    } finally {
      setLoading(false);
    }
  }, [simulacionId, casa.id]);

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(); 
  }, [load]);

  const buildPayload = (form) => ({
    nombre:      form.nombre?.trim(),
    monto_ars:   Number(form.monto_ars) || 0,
    descripcion: form.descripcion?.trim() || null,
  });

  const handleCrear = async (form) => {
    if (!form.nombre?.trim()) { setFormError("El nombre es requerido."); return; }
    setSaving(true);
    setFormError("");
    try {
      await crearGastoCasa(simulacionId, casa.id, buildPayload(form));
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err?.message || "Error al crear gasto.");
    } finally { setSaving(false); }
  };

  const handleEditar = async (form) => {
    setSaving(true);
    setFormError("");
    try {
      await actualizarGastoCasa(simulacionId, casa.id, editingGasto.id, buildPayload(form));
      setEditingGasto(null);
      await load();
    } catch (err) {
      setFormError(err?.message || "Error al actualizar gasto.");
    } finally { setSaving(false); }
  };

  const handleEliminar = async () => {
    try {
      await eliminarGastoCasa(simulacionId, casa.id, deletingId);
      setDeletingId(null);
      await load();
    } catch (err) {
      setError(err?.message || "Error al eliminar gasto.");
      setDeletingId(null);
    }
  };

  return (
    <div>
      <ConfirmModal
        isOpen={!!deletingId}
        title="Eliminar gasto"
        message="¿Estás seguro que querés eliminar este gasto? Esta acción no se puede deshacer."
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
        <span className="sim-breadcrumb-item">Gastos</span>
      </div>

      <div className="sim-section-header">
        <h3>Gastos de la casa</h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {showForm ? (
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setFormError(""); }}>Cancelar</button>
          ) : (
            <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingGasto(null); }}>Agregar gasto</button>
          )}
          <button className="btn btn-ghost" onClick={onVolver}>Volver a casa</button>
        </div>
      </div>

      {!loading && gastos.length > 0 && (
        <p className="config-help" style={{ marginBottom: "1rem" }}>
          Total de gastos: <strong>{fmt(totalGastos)}</strong>
        </p>
      )}

      {showForm && !editingGasto && (
        <GastoForm
          onGuardar={handleCrear}
          onCancelar={() => { setShowForm(false); setFormError(""); }}
          saving={saving}
          error={formError}
          submitLabel="Agregar gasto"
        />
      )}

      {loading && <p className="config-help">Cargando gastos...</p>}
      {error   && <p className="config-help" style={{ color: "red" }}>{error}</p>}
      {!loading && gastos.length === 0 && <p className="config-help">Sin gastos cargados.</p>}

      {gastos.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: "1rem" }}>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th style={{ textAlign: "right" }}>Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                editingGasto?.id === g.id ? (
                  <tr key={g.id}>
                    <td colSpan={4} style={{ padding: "0.5rem 0" }}>
                      <GastoForm
                        initial={{
                          nombre:      g.nombre ?? "",
                          monto_ars:   g.monto_ars ?? "",
                          descripcion: g.descripcion ?? "",
                        }}
                        onGuardar={handleEditar}
                        onCancelar={() => { setEditingGasto(null); setFormError(""); }}
                        saving={saving}
                        error={formError}
                        submitLabel="Guardar gasto"
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={g.id}>
                    <td><strong>{g.nombre}</strong></td>
                    <td>{g.descripcion || "-"}</td>
                    <td style={{ textAlign: "right" }}>{fmt(g.monto_ars)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem", marginRight: "0.3rem" }}
                        onClick={() => { setEditingGasto(g); setShowForm(false); setFormError(""); }}
                      >
                        Editar gasto
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem", color: "#c0392b", borderColor: "#c0392b" }}
                        onClick={() => setDeletingId(g.id)}
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default GastosTab;
