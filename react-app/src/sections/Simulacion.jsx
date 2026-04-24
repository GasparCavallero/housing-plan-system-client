import { useState } from "react";
import {
  simularServidor,
  reiniciarPlan,
  guardarSimulacionComoCopia,
  cargarConfiguracion,
} from "../services/services.js";

import { useGuardarSimulacionModal } from "../hooks/useGuardarSimulacionModal.jsx";
import GraficosModal from "../components/GraficosModal.jsx";

const formatterArs = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

function toNum(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/\./g, "").replace(",", ".").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeTimeline(payload) {
  const mapRow = (row) => {
    if (!row || typeof row !== "object") return null;
    return {
      mes: toNum(row.mes ?? row.mes_inicio ?? row.periodo ?? row.periodo_mes),
      activos: toNum(row.activos ?? row.adherentes_activos ?? row.cantidad_activos),
      enConstruccion: toNum(row.enConstruccion ?? row.en_construccion ?? row.adherentes_en_construccion),
      adjudicados: toNum(row.adjudicados ?? row.adherentes_adjudicados ?? row.casas_adjudicadas),
      cuotaCompletaMes: toNum(row.cuotaCompletaMes ?? row.cuota_completa_mes ?? row.cuota_completa_mes_ars),
      mediaCuotaMes: toNum(row.mediaCuotaMes ?? row.media_cuota_mes ?? row.media_cuota_mes_ars),
      ingresoLicitacionMes: toNum(row.ingresoLicitacionMes ?? row.ingreso_licitacion_mes_ars ?? row.ingreso_licitacion_mes ?? 0),
      ingresoMes: toNum(row.ingresoMes ?? row.ingreso_mes ?? row.ingreso_mes_ars ?? row.ingreso_mensual_ars),
      fondo: toNum(row.fondo ?? row.fondo_cierre ?? row.fondo_ars ?? row.fondo_final_ars),
      evento: row.evento ?? row.evento_mes ?? row.descripcion ?? row.detalle ?? null,
    };
  };

  const pickArray = (input) => {
    if (!input || typeof input !== "object") return null;
    const keys = ["timeline", "meses", "resultados", "eventos", "simulacion", "simulacion_mensual", "detalle", "data", "items"];
    for (const key of keys) {
      if (Array.isArray(input[key])) return input[key];
    }
    for (const value of Object.values(input)) {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") {
        const nested = pickArray(value);
        if (nested) return nested;
      }
    }
    return null;
  };

  const rows = Array.isArray(payload) ? payload : (pickArray(payload) || []);
  return rows.map(mapRow).filter((r) => r && Object.values(r).some((v) => v !== null && v !== undefined));
}

function hasMetrics(rows) {
  const keys = ["activos", "enConstruccion", "adjudicados", "cuotaCompletaMes", "mediaCuotaMes", "ingresoMes", "fondo"];
  return rows.some((row) => keys.some((k) => row[k] !== null && row[k] !== undefined));
}

function Simulacion({ onRowsChange }) {
  console.log("onRowsChange recibido:", typeof onRowsChange);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState("Ejecutá la simulación para ver proyecciones.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [soloEventos, setSoloEventos] = useState(false);
  const [graficosOpen, setGraficosOpen] = useState(false);
  const { pedirDatos, modal } = useGuardarSimulacionModal();

  const handleSimular = async () => {
    setError("");
    setLoading(true);
    try {
      // Intenta leer config del servidor como hace el original
      const config = await cargarConfiguracion().catch(() => null);
      const horizonte = Number(config?.cantidad_cuotas) || 180;

      const payload = await simularServidor({
        horizonteMeses: horizonte,
        ofertas: [],
        configuracion: config,
      });

      const normalized = normalizeTimeline(payload);
      setRows(normalized);
      console.log("llamando onRowsChange con", normalized?.length, "filas");
      if (onRowsChange) onRowsChange(normalized);

      if (normalized.length > 0) {
        setSoloEventos(!hasMetrics(normalized));
        setSummary(`Simulación servidor ok: ${normalized.length} fila(s) en ${horizonte} meses.`);
      } else {
        setSoloEventos(false);
        const fondoFinal = typeof payload?.fondo_final_ars === "number"
          ? ` Fondo final: ${formatterArs.format(payload.fondo_final_ars)}.`
          : "";
        setSummary(`Simulación ejecutada, pero no hubo eventos de casas en ${horizonte} meses.${fondoFinal}`);
      }
    } catch (err) {
      setError(err?.message || "Error al simular.");
    } finally {
      setLoading(false);
    }
  };

  const handleReiniciar = async () => {
    setLoading(true);
    try {
      await reiniciarPlan();
      setRows([]);
      setSummary("Plan reiniciado. Ejecutá una simulación para ver una nueva proyección.");
    } catch (err) {
      setError(err?.message || "Error al reiniciar.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    setError("");

    // abrir modal y esperar datos
    const result = await pedirDatos();

    if (!result) return; // canceló

    const { titulo, descripcion } = result;

    setLoading(true);

    try {
      const config = await cargarConfiguracion().catch(() => null);

      await guardarSimulacionComoCopia({ configuracion: config, titulo, descripcion });

      setSummary("Simulación guardada correctamente.");

    } catch (err) {
      setError(err?.message || "Error al guardar simulación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="simulacion" className="panel panel-timeline">
      <div className="panel-head">
        <h2>Simulación mensual</h2>
        <p id="sim-summary">{summary}</p>
      </div>

      <div className="inline-form">
        <button className="btn btn-primary" type="button" onClick={handleSimular} disabled={loading}>
          {loading ? "Simulando..." : "Simular"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={handleReiniciar} disabled={loading}>
          Reiniciar plan
        </button>
        <button className="btn btn-secondary" type="button" onClick={handleGuardar} disabled={loading}>
          Guardar simulación
        </button>
        {rows.length > 0 && (
          <button className="btn btn-ghost" type="button" onClick={() => setGraficosOpen(true)}>
            Ver gráficos
          </button>
        )}
        {modal}
      </div>

      {graficosOpen && (
        <GraficosModal
          rows={rows}
          valorViviendaArs={0}
          onClose={() => setGraficosOpen(false)}
        />
      )}

      {error && <p className="config-help" style={{ color: "red" }}>{error}</p>}

      {rows.length > 0 && (
        <div className="table-wrap sim-table-wrap">
          <table>
            <thead>
              <tr>
                {soloEventos ? (
                  <>
                    <th>Mes</th>
                    <th>Evento</th>
                  </>
                ) : (
                  <>
                    <th>Mes</th>
                    <th>Activos</th>
                    <th>En construcción</th>
                    <th>Adjudicados</th>
                    <th>Cuota completa mes</th>
                    <th>Media cuota mes</th>
                    <th>Ingreso licitación mes</th>
                    <th>Ingreso mes</th>
                    <th>Fondo cierre</th>
                    <th>Evento</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) =>
                soloEventos ? (
                  <tr key={i}>
                    <td>{row.mes ?? "-"}</td>
                    <td className="evento">{row.evento || "-"}</td>
                  </tr>
                ) : (
                  <tr key={i}>
                    <td>{row.mes ?? "-"}</td>
                    <td>{row.activos ?? "-"}</td>
                    <td>{row.enConstruccion ?? "-"}</td>
                    <td>{row.adjudicados ?? "-"}</td>
                    <td>{row.cuotaCompletaMes !== null ? formatterArs.format(row.cuotaCompletaMes) : "-"}</td>
                    <td>{row.mediaCuotaMes !== null ? formatterArs.format(row.mediaCuotaMes) : "-"}</td>
                    <td>{row.ingresoLicitacionMes !== null ? formatterArs.format(row.ingresoLicitacionMes) : formatterArs.format(0)}</td>
                    <td>{row.ingresoMes !== null ? formatterArs.format(row.ingresoMes) : "-"}</td>
                    <td>{row.fondo !== null ? formatterArs.format(row.fondo) : "-"}</td>
                    <td className="evento">{row.evento || "-"}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Simulacion;