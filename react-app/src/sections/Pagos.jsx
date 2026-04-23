import { useEffect, useState } from "react";
import { listarPagos, registrarPago, actualizarPago, eliminarPago } from "../services/services";
import ConfirmModal from "../components/ConfirmModal";

function Pagos() {
  const [adherenteId, setAdherenteId] = useState("");
  const [monto, setMonto] = useState("");
  const [mes, setMes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagos, setPagos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, id: null });

  const abrirModalEliminar = (id) => {
      setModalConfig({ isOpen: true, id });
    };
  
    const confirmarEliminacion = async () => {
      try {
        await eliminarPago(modalConfig.id);
        await cargarPagos();
      } catch (err) {
        console.error(err);
      } finally {
        setModalConfig({ isOpen: false, id: null });
      }
    }

  const cargarPagos = async () => {
    try {
      const data = await listarPagos();
      setPagos(data || []);
    } catch (err) {
      console.error("Error al cargar pagos:", err);
    }
  };

  // Lógica de filtrado
  const pagosFiltrados = pagos.filter((p) => {
    const term = searchTerm.toLowerCase();
    const id = p.id?.toString() || "";
    const adhId = p.adherente_id?.toString() || "";
    const montoStr = p.monto_ars?.toString() || "";
    const mesStr = (p.mes_correspondiente || p.mes || "").toString();

    return (
      id.includes(term) ||
      adhId.includes(term) ||
      montoStr.includes(term) ||
      mesStr.toLowerCase().includes(term)
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adherenteId || !monto || !mes) return;
    try {
      await registrarPago(Number(adherenteId), Number(monto), Number(mes));
      setAdherenteId(""); setMonto(""); setMes("");
      await cargarPagos();
    } catch (err) {
      console.error(err);
      alert("Error al registrar el pago.");
    }
  };

  const handleChange = (id, field, value) => {
    setPagos((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleGuardar = async (pago) => {
    try {
      await actualizarPago(
        pago.id,
        Number(pago.adherente_id),
        Number(pago.monto_ars),
        Number(pago.mes_correspondiente || pago.mes)
      );
    } catch (err) {
      console.error(err);
      alert("No se pudo actualizar.");
    } finally {
      setEditandoId(null);
      await cargarPagos();
    }
  };

  useEffect(() => {
    cargarPagos();
  }, []);

  return (
    <section id="pagos" className="panel panel-pagos">
      <div className="panel-head">
        <h2>Pagos</h2>
        <p id="pagos-summary">
          {
            pagos.length === 0 
            ? "Sin datos cargados." : pagos.length === 1 
              ? "1 pago registrado" : `${pagos.length} pagos registrados` 
          }
        </p>
      </div>

      <form className="inline-form pago-form" onSubmit={handleSubmit}>
        <input type="number" placeholder="Adherente ID" value={adherenteId} onChange={(e) => setAdherenteId(e.target.value)} required />
        <input type="number" step="0.01" placeholder="Monto ARS" value={monto} onChange={(e) => setMonto(e.target.value)} required />
        <input type="number" placeholder="Mes" value={mes} onChange={(e) => setMes(e.target.value)} required />
        <button className="btn btn-primary" type="submit">Registrar pago</button>
        <button className="btn btn-ghost" type="button" onClick={cargarPagos}>Actualizar lista</button>
      </form>

      {/* BUSCADOR CORREGIDO */}
      <div className="inline-form" style={{ position: 'relative', marginBottom: '1rem' }}>
        <input
          id="pagos-search"
          type="text"
          placeholder="Buscar pagos por ID, adherente, monto o mes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', paddingRight: '40px' }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#888',
              fontSize: '20px',
              lineHeight: '1'
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
              <th>Adherente ID</th>
              <th>Monto</th>
              <th>Mes</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagosFiltrados.map((p) => {
              const editando = editandoId === p.id;
              return (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>
                    {editando ? (
                      <input type="number" value={p.adherente_id} onChange={(e) => handleChange(p.id, "adherente_id", e.target.value)} className="cell-edit" />
                    ) : p.adherente_id}
                  </td>
                  <td>
                    {editando ? (
                      <input type="number" value={p.monto_ars} onChange={(e) => handleChange(p.id, "monto_ars", e.target.value)} className="cell-edit" />
                    ) : `$${p.monto_ars}`}
                  </td>
                  <td>
                    {editando ? (
                      <input type="number" value={p.mes_correspondiente || p.mes} onChange={(e) => handleChange(p.id, "mes_correspondiente", e.target.value)} className="cell-edit" />
                    ) : (p.mes_correspondiente || p.mes)}
                  </td>
                  <td>{p.fecha ? new Date(p.fecha).toLocaleDateString() : '-'}</td>
                  <td>
                    {editando ? (
                      <>
                        <button type="button" className="btn-table" onClick={() => handleGuardar(p)}>Guardar</button>
                        <button type="button" className="btn-table" onClick={() => setEditandoId(null)}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn-table" onClick={() => setEditandoId(p.id)}>Editar</button>
                        <button type="button" className="btn-table" onClick={() => abrirModalEliminar(p.id)}>Eliminar</button>
                        <ConfirmModal
                          isOpen={modalConfig.isOpen}
                          title="Eliminar pago"
                          message={`Se eliminará el pago ID ${modalConfig.id}. Esta acción puede afectar pagos y estado del plan.`}
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

export default Pagos;