import { useState, useEffect } from "react";
import { listarAdherentes, crearAdherente } from "../services/services";

function Adherentes() {
  const [nombre, setNombre] = useState("");
  const [adherentes, setAdherentes] = useState([]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarAdherentes();
  }, []);

  return (
    <section id="adherentes" className="panel panel-adherentes">
      <div className="panel-head">
        <h2>Adherentes</h2>
        <p id="adherentes-summary">Sin datos cargados.</p>
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
            {adherentes.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.nombre}</td>
                <td>{a.estado}</td>
                <td>{a.cuotas_pagadas}</td>
                <td>{a.cuotas_bonificadas_por_licitacion}</td>
                <td>acciones...</td>
              </tr>
            ))}
        </tbody>
        </table>
      </div>
    </section>
  );
}

export default Adherentes;