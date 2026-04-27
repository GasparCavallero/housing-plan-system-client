import { useState } from "react";
import GraficosModal from "../components/GraficosModal.jsx";

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
    // campos para la tabla
    mes: row.mes,
    activos: row.adherentes_activos ?? row.activos,
    enConstruccion: row.adherentes_en_construccion ?? row.enConstruccion,
    adjudicados: row.adherentes_adjudicados ?? row.adjudicados,
    cuotaCompletaMes: row.cuota_completa_mes_ars ?? row.cuotaCompletaMes,
    mediaCuotaMes: row.media_cuota_mes_ars ?? row.mediaCuotaMes,
    ingresoLicitacionMes: row.ingreso_licitacion_mes_ars ?? row.ingresoLicitacionMes ?? 0,
    ingresoMes: row.ingreso_mes_ars ?? row.ingresoMes,
    evento: row.evento_mes ?? row.evento ?? null,
    // campos extra para los builders de gráficos
    casas_iniciadas_mes: row.casas_iniciadas_mes ?? 0,
    casas_finalizadas_mes: row.casas_finalizadas_mes ?? 0,
    evento_mes: row.evento_mes ?? row.evento ?? null,
  }));
}

function ProyeccionTab({ detalle }) {
  const [graficosOpen, setGraficosOpen] = useState(false);
  const rows = normalizeTimeline(detalle);

  const valorViviendaArs = (
    detalle?.proyeccion?.resumen?.valor_vivienda_ars
    ?? (
      (detalle?.configuracion?.metros_cuadrados_vivienda ?? 0) *
      (detalle?.configuracion?.valor_por_m2 ?? 0)
    )
  ) || 0;

  if (rows.length === 0) {
    return <p className="config-help">No hay datos de proyección para esta simulación.</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button className="btn btn-ghost" onClick={() => setGraficosOpen(true)}>
          Ver gráficos
        </button>
      </div>

      {graficosOpen && (
        <GraficosModal
          rows={rows}
          valorViviendaArs={valorViviendaArs}
          onClose={() => setGraficosOpen(false)}
        />
      )}

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
    </div>
  );
}

export default ProyeccionTab;