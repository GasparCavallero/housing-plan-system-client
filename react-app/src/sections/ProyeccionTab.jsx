const fmtArs = (n) =>
  n != null
    ? Number(n).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
      })
    : "-";

function normalizeTimeline(detalle) {
  const rows = detalle?.proyeccion?.timeline ?? detalle?.timeline ?? [];
  return rows.map((row) => ({
    mes:                  row.mes,
    activos:              row.adherentes_activos        ?? row.activos,
    enConstruccion:       row.adherentes_en_construccion ?? row.enConstruccion,
    adjudicados:          row.adherentes_adjudicados    ?? row.adjudicados,
    cuotaCompletaMes:     row.cuota_completa_mes_ars    ?? row.cuotaCompletaMes,
    mediaCuotaMes:        row.media_cuota_mes_ars       ?? row.mediaCuotaMes,
    ingresoLicitacionMes: row.ingreso_licitacion_mes_ars ?? row.ingresoLicitacionMes ?? 0,
    ingresoMes:           row.ingreso_mes_ars           ?? row.ingresoMes,
    evento:               row.evento_mes               ?? row.evento ?? null,
  }));
}

function ProyeccionTab({ detalle }) {
  const rows = normalizeTimeline(detalle);

  if (rows.length === 0) {
    return <p className="config-help">No hay datos de proyección para esta simulación.</p>;
  }

  return (
    <div className="table-wrap sim-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Activos</th>
            <th>En construcción</th>
            <th>Adjudicados</th>
            <th>Cuota completa mes</th>
            <th>Media cuota mes</th>
            <th>Ingreso licitación mes</th>
            <th>Ingreso mes</th>
            <th>Evento</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{row.mes ?? "-"}</td>
              <td>{row.activos ?? "-"}</td>
              <td>{row.enConstruccion ?? "-"}</td>
              <td>{row.adjudicados ?? "-"}</td>
              <td>{fmtArs(row.cuotaCompletaMes)}</td>
              <td>{fmtArs(row.mediaCuotaMes)}</td>
              <td>{fmtArs(row.ingresoLicitacionMes ?? 0)}</td>
              <td>{fmtArs(row.ingresoMes)}</td>
              <td className="evento">{row.evento || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProyeccionTab;
