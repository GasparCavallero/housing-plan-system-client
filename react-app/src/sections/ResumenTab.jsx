const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

function KpiBox({ label, value }) {
  return (
    <div className="sim-kpi-box">
      <p className="sim-kpi-label">{label}</p>
      <p className="sim-kpi-value">{value}</p>
    </div>
  );
}

function ResumenTab({ detalle }) {
  const { resumen } = detalle ?? {};

  const casasTotal       = resumen?.casas_total ?? 0;
  const planillasTotal   = detalle?.casas?.reduce((acc, c) => acc + (c.items?.length ?? 0), 0) ?? 0;
  const itemsTotal = detalle?.casas?.reduce((acc, c) => acc + (c.items?.length ?? 0), 0) ?? 0;
  const materialesTotal  = resumen?.material_total_cantidad ?? 0;
  const gastosTotal      = detalle?.casas?.reduce((acc, c) => acc + (c.gastos?.length ?? 0), 0) ?? 0;
  const totalMaterialArs = resumen?.materiales_total_ars ?? 0;
  const saldoTotal       = resumen?.saldo_total_ars ?? 0;

  return (
    <div>
      <div className="plan-summary-grid">
        <KpiBox label="Casas"           value={casasTotal} />
        <KpiBox label="Planillas"        value={planillasTotal} />
        <KpiBox label="Items"            value={itemsTotal} />
        <KpiBox label="Materiales"       value={materialesTotal} />
        <KpiBox label="Movimientos"      value={resumen?.material_retirado_cantidad ?? 0} />
        <KpiBox label="Gastos"           value={gastosTotal} />
        <KpiBox label="Total materiales" value={fmt(totalMaterialArs)} />
        <KpiBox label="Saldo total"      value={fmt(saldoTotal)} />
      </div>

      {resumen?.materiales_resumen?.length > 0 && (
        <>
          <h4 style={{ margin: "1.5rem 0 0.8rem", fontSize: "0.95rem" }}>
            Materiales globales agrupados
          </h4>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Unidad</th>
                  <th>Total</th>
                  <th>Retirado</th>
                  <th>En construcción</th>
                  <th>Total ARS</th>
                </tr>
              </thead>
              <tbody>
                {resumen.materiales_resumen.map((mat, i) => (
                  <tr key={i}>
                    <td>{mat.nombre}</td>
                    <td>{mat.unidad}</td>
                    <td>{mat.cantidad_total}</td>
                    <td>{mat.cantidad_retirada}</td>
                    <td>{mat.cantidad_en_construccion}</td>
                    <td>{fmt(mat.total_ars)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ResumenTab;
