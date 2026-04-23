import { useState, useEffect } from "react";
import { listarAdherentes, crearAdherente, actualizarAdherente, eliminarAdherente } from "../services/services";

function Adherentes() {
  const [nombre, setNombre] = useState("");
  const [adherentes, setAdherentes] = useState([]);
  const [editandoId, setEditandoId] = useState(null); // id del adherente que se está editando

  const handleChange = (id, field, vlue) => {
    setAdherentes((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: vlue } : a)));
  }

  const handleEditar = (id) => {
    setEditandoId(id);
  };

  const handleCancelar = () => {
    setEditandoId(null);
    cargarAdherentes(); // vuelve a estado original
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

  const handleEliminar = async (id) => {
    try {
      await eliminarAdherente(id);
      await cargarAdherentes();
    } catch (err) {
      console.error(err);
    }
  };

  const cargarAdherentes = async () => {
    try {
      const data = await listarAdherentes();
      setAdherentes(data);
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
      await cargarAdherentes(); // refresca la lista después de crear
    } catch (err) {
      console.error("Error al crear adherente:", err);
    }
  };

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
        <input type="text" name="nombre" placeholder="Nombre nuevo adherente" required="" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <button type="submit" id="btn-crear-adherente" className="btn btn-primary">
          Crear
        </button>
        <button type="button" id="btn-listar-adherentes" className="btn btn-ghost" onClick={cargarAdherentes}>
          Actualizar lista
        </button>
      </form>
      <form className="inline-form" role="search" aria-label="Buscar adherentes">
        <input id="adherentes-search" type="search" placeholder="Buscar adherentes por ID, nombre, estado o cuotas" />
      </form>
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
            {adherentes.map((a) => {
              const editando = editandoId === a.id;

              return (
                <tr key={a.id}>
                  <td>{a.id}</td>

                  <td>
                    {editando ? (
                      <input
                        value={a.nombre}
                        onChange={(e) =>
                          handleChange(a.id, "nombre", e.target.value)
                        }
                        className="inline-cell-input cell-edit"
                      />
                    ) : (
                      a.nombre
                    )}
                  </td>

                  <td>
                    {editando ? (
                      <select
                        value={a.estado}
                        onChange={(e) =>
                          handleChange(a.id, "estado", e.target.value)
                        }
                        className="inline-cell-input cell-edit"
                      >
                        <option value="activo">activo</option>
                        <option value="en_construccion">en_construccion</option>
                        <option value="adjudicado">adjudicado</option>
                      </select>
                    ) : (
                      a.estado
                    )}
                  </td>

                  <td>
                    {editando ? (
                      <input
                        type="number"
                        value={a.cuotas_pagadas}
                        onChange={(e) =>
                          handleChange(a.id, "cuotas_pagadas", e.target.value)
                        }
                        className="inline-cell-input cell-edit"
                      />
                    ) : (
                      a.cuotas_pagadas
                    )}
                  </td>

                  <td>
                    {editando ? (
                      <input
                        type="number"
                        value={a.cuotas_bonificadas_por_licitacion}
                        onChange={(e) =>
                          handleChange(
                            a.id,
                            "cuotas_bonificadas_por_licitacion",
                            e.target.value
                          )
                        }
                        className="inline-cell-input cell-edit"
                      />
                    ) : (
                      a.cuotas_bonificadas_por_licitacion
                    )}
                  </td>

                  <td>
                    {editando ? (
                      <>
                        <button className="btn-table js-save-adherente" onClick={() => handleGuardar(a)} type="button">Guardar</button>
                        <button className="btn-table js-cancel-adherente" onClick={handleCancelar} type="button">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button className="btn-table js-edit-adherente" type="button"  onClick={() => handleEditar(a.id)}>Editar</button>
                        <button className="btn-table js-delete-adherente" type="button" onClick={() => handleEliminar(a.id)}>Eliminar</button>
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