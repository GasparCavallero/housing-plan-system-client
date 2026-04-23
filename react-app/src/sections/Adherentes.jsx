import { useState, useEffect } from "react";
import { listarAdherentes, crearAdherente, actualizarAdherente, eliminarAdherente } from "../services/services";
import ConfirmModal from "../components/ConfirmModal";

function Adherentes() {
  const [nombre, setNombre] = useState("");
  const [adherentes, setAdherentes] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, id: null });

  const abrirModalEliminar = (id) => {
    setModalConfig({ isOpen: true, id });
  };

  const confirmarEliminacion = async () => {
    try {
      await eliminarAdherente(modalConfig.id);
      await cargarAdherentes();
    } catch (err) {
      console.error(err);
    } finally {
      setModalConfig({ isOpen: false, id: null });
    }
  }

  // 1. Estado para la búsqueda
  const [searchTerm, setSearchTerm] = useState("");

  const handleChange = (id, field, vlue) => {
    setAdherentes((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: vlue } : a)));
  }

  const handleEditar = (id) => setEditandoId(id);

  const handleCancelar = () => {
    setEditandoId(null);
    cargarAdherentes();
  };

  const handleGuardar = async (adherente) => {
    try {
      await actualizarAdherente(adherente.id, adherente)
    } catch (err) {
      console.error(err);
    } finally {
      setEditandoId(null);
      await cargarAdherentes();
    }
  };

  const cargarAdherentes = async () => {
    try {
      const data = await listarAdherentes();
      setAdherentes(data || []);
    } catch (err) {
      console.error("Error al listar adherentes:", err);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    try {
      await crearAdherente(nombre.trim());
      setNombre("");
      await cargarAdherentes();
    } catch (err) {
      console.error("Error al crear adherente:", err);
    }
  };

  // 2. Lógica de filtrado
  const adherentesFiltrados = adherentes.filter((a) => {
    const term = searchTerm.toLowerCase();
    return (
      a.id?.toString().includes(term) ||
      a.nombre?.toLowerCase().includes(term) ||
      a.estado?.toLowerCase().includes(term) ||
      a.cuotas_pagadas?.toString().includes(term)
    );
  });

  useEffect(() => {
    cargarAdherentes();
  }, []);

  return (
    <section id="adherentes" className="panel panel-adherentes">
      <div className="panel-head">
        <h2>Adherentes</h2>
        <p id="adherentes-summary">
          {
            adherentes.length === 0
              ? "Sin datos cargados." : adherentes.length === 1
                ? "1 adherente cargado." : `${adherentes.length} adherentes cargados.`
          }
        </p>
      </div>

      <form id="adherente-form" className="inline-form" onSubmit={handleSubmit}>
        <input type="text" placeholder="Nombre nuevo adherente" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <button type="submit" className="btn btn-primary">Crear</button>
        <button type="button" className="btn btn-ghost" onClick={cargarAdherentes}>Actualizar lista</button>
      </form>

      {/* 3. Buscador con botón de limpiar */}
      <div className="inline-form" style={{ position: 'relative', marginBottom: '1rem' }}>
        <input
          id="adherentes-search"
          type="text"
          placeholder="Buscar por ID, nombre, estado..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', paddingRight: '40px' }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '20px'
            }}
          >
            &times;
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Cuotas pagadas</th>
              <th>Bonificadas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {/* 4. Usamos la lista filtrada */}
            {adherentesFiltrados.map((a) => {
              const editando = editandoId === a.id;
              return (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>
                    {editando ? (
                      <input value={a.nombre} onChange={(e) => handleChange(a.id, "nombre", e.target.value)} className="inline-cell-input cell-edit" />
                    ) : a.nombre}
                  </td>
                  <td>
                    {editando ? (
                      <select value={a.estado} onChange={(e) => handleChange(a.id, "estado", e.target.value)} className="inline-cell-input cell-edit">
                        <option value="activo">activo</option>
                        <option value="en_construccion">en_construccion</option>
                        <option value="adjudicado">adjudicado</option>
                      </select>
                    ) : a.estado}
                  </td>
                  <td>
                    {editando ? (
                      <input type="number" value={a.cuotas_pagadas} onChange={(e) => handleChange(a.id, "cuotas_pagadas", e.target.value)} className="inline-cell-input cell-edit" />
                    ) : a.cuotas_pagadas}
                  </td>
                  <td>
                    {editando ? (
                      <input type="number" value={a.cuotas_bonificadas_por_licitacion} onChange={(e) => handleChange(a.id, "cuotas_bonificadas_por_licitacion", e.target.value)} className="inline-cell-input cell-edit" />
                    ) : a.cuotas_bonificadas_por_licitacion}
                  </td>
                  <td>
                    {editando ? (
                      <>
                        <button className="btn-table" onClick={() => handleGuardar(a)} type="button">Guardar</button>
                        <button className="btn-table" onClick={handleCancelar} type="button">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button className="btn-table" type="button" onClick={() => handleEditar(a.id)}>Editar</button>
                        <button className="btn-table" type="button" onClick={() => abrirModalEliminar(a.id)}>Eliminar</button>
                        <ConfirmModal
                          isOpen={modalConfig.isOpen}
                          title="Eliminar adherente"
                          message={`Se eliminará el adherente ID ${modalConfig.id}. Esta acción puede afectar pagos y estado del plan.`}
                          onConfirm={confirmarEliminacion}
                          onCancel={() => setModalConfig({ isOpen: false, id: null })}
                        />
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Adherentes;