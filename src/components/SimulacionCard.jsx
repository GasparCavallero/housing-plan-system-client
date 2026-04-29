function SimulacionCard({ simulacion }) {
  return (
    <div className="simulacion-card">
      <h3>{simulacion.nombre}</h3>
      <p>Fecha de creación: {new Date(simulacion.fechaCreacion).toLocaleDateString()}</p>
      <p>Inventario: {simulacion.inventario.length} unidades</p>
      <p>Entregas: {simulacion.entregas.length} unidades</p>
    </div>
  );
}

export default SimulacionCard;