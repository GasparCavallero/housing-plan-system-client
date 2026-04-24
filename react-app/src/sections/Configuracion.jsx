import { useState, useEffect, useCallback } from "react";
import {
  cargarConfiguracion,
  listarConfiguraciones,
  guardarConfiguracion,
  cargarResumenFinanciero,
  cargarEstadoPlan,
} from "../services/services.js";

const DEFAULTS = {
  cantidadCuotas: 180,
  cantidadAdherentes: 120,
  metrosCuadrados: 60,
  valorPorM2: 950000,
  porcentajeCuotaCompleta: 0.833333,
  porcentajeMediaCuota: 0.416667,
  mesesMediaCuotaInicial: 7,
  periodicidadLicitacionMeses: 3,
  porcentajeLicitacionExtraordinaria: 0,
  cronogramaAdjudicacionesAnual: "",
  duracionConstruccionMeses: 6,
  tipoCambio: 1200,
};

function formatArs(value) {
  return Number(value).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  });
}

function normalizeConfig(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    cantidadCuotas: Number(raw.cantidad_cuotas ?? raw.cantidadCuotas ?? DEFAULTS.cantidadCuotas),
    cantidadAdherentes: Number(raw.cantidad_de_adherentes ?? raw.cantidadAdherentes ?? DEFAULTS.cantidadAdherentes),
    metrosCuadrados: Number(raw.metros_cuadrados_vivienda ?? raw.metrosCuadrados ?? DEFAULTS.metrosCuadrados),
    valorPorM2: Number(raw.valor_por_m2 ?? raw.valorPorM2 ?? DEFAULTS.valorPorM2),
    porcentajeCuotaCompleta: Number(raw.porcentaje_cuota_completa ?? raw.porcentajeCuotaCompleta ?? DEFAULTS.porcentajeCuotaCompleta),
    porcentajeMediaCuota: Number(raw.porcentaje_media_cuota ?? raw.porcentajeMediaCuota ?? DEFAULTS.porcentajeMediaCuota),
    mesesMediaCuotaInicial: Number(raw.meses_media_cuota_inicial ?? raw.mesesMediaCuotaInicial ?? DEFAULTS.mesesMediaCuotaInicial),
    periodicidadLicitacionMeses: Number(raw.periodicidad_licitacion_meses ?? raw.periodicidadLicitacionMeses ?? DEFAULTS.periodicidadLicitacionMeses),
    porcentajeLicitacionExtraordinaria: Number(raw.porcentaje_licitacion_extraordinaria ?? raw.porcentajeLicitacionExtraordinaria ?? DEFAULTS.porcentajeLicitacionExtraordinaria),
    cronogramaAdjudicacionesAnual: String(raw.cronograma_adjudicaciones_anual ?? raw.cronogramaAdjudicacionesAnual ?? ""),
    duracionConstruccionMeses: Number(raw.duracion_construccion_meses ?? raw.duracionConstruccionMeses ?? DEFAULTS.duracionConstruccionMeses),
    tipoCambio: Number(raw.tipo_cambio ?? raw.tipoCambio ?? DEFAULTS.tipoCambio),
  };
}

function configToPayload(form) {
  return {
    metodologia_plan: "legacy",
    cantidad_cuotas: Number(form.cantidadCuotas),
    cantidad_de_adherentes: Number(form.cantidadAdherentes),
    metros_cuadrados_vivienda: Number(form.metrosCuadrados),
    valor_por_m2: Number(form.valorPorM2),
    porcentaje_cuota_completa: Number(form.porcentajeCuotaCompleta),
    porcentaje_media_cuota: Number(form.porcentajeMediaCuota),
    meses_media_cuota_inicial: Number(form.mesesMediaCuotaInicial),
    periodicidad_licitacion_meses: Number(form.periodicidadLicitacionMeses),
    porcentaje_licitacion_extraordinaria: Number(form.porcentajeLicitacionExtraordinaria),
    cronograma_adjudicaciones_anual: String(form.cronogramaAdjudicacionesAnual).trim() || null,
    duracion_construccion_meses: Number(form.duracionConstruccionMeses),
    tipo_cambio: Number(form.tipoCambio),
  };
}

function validateConfig(payload) {
  if (!payload.porcentaje_cuota_completa || payload.porcentaje_cuota_completa <= 0)
    throw new Error("El porcentaje de cuota completa debe ser mayor a 0.");
  if (!payload.porcentaje_media_cuota || payload.porcentaje_media_cuota <= 0)
    throw new Error("El porcentaje de media cuota debe ser mayor a 0.");
  if (payload.meses_media_cuota_inicial < 0)
    throw new Error("Los meses de media cuota inicial deben ser mayor o igual a 0.");
  if (!payload.periodicidad_licitacion_meses || payload.periodicidad_licitacion_meses < 1)
    throw new Error("La periodicidad de licitación debe ser mayor o igual a 1.");
  if (payload.porcentaje_licitacion_extraordinaria < 0)
    throw new Error("El porcentaje de licitación extraordinaria debe ser mayor o igual a 0.");
  const cron = String(payload.cronograma_adjudicaciones_anual || "").trim();
  if (!cron || !cron.split(",").every((p) => /^\d+$/.test(p.trim())))
    throw new Error("El cronograma anual debe tener enteros no negativos separados por coma. Ejemplo: 5,5,5,6,6,7.");
}

function Configuracion({ onValorViviendaChange }) {
  const [form, setForm] = useState(DEFAULTS);
  const [kpi, setKpi] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Estado: cambios sin guardar.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const preview = (() => {
    const v = Number(form.valorPorM2);
    const c = Number(form.porcentajeCuotaCompleta);
    const m = Number(form.porcentajeMediaCuota);
    if (v > 0 && c > 0 && m > 0) {
      return `Preview: cuota_completa = ${formatArs(v * (c / 100))} | media_cuota = ${formatArs(v * (m / 100))}`;
    }
    return "Preview: cuota_completa = - | media_cuota = -";
  })();

  const STORAGE_KEY = "hps_sim_config";

  const cargarDesdeServidor = useCallback(async () => {
    try {
      // 1. Intento cargar desde localStorage
      const guardado = localStorage.getItem(STORAGE_KEY);

      if (guardado) {
        const parsed = JSON.parse(guardado);
        setForm(normalizeConfig(parsed));
        return; // Si cargó desde localStorage, no intento cargar desde servidor
      }

      // 2. Si no hay en localStorage, intento cargar desde el servidor
      const items = await listarConfiguraciones();

      const config = items?.[0]
        ? normalizeConfig(items[0].configuracion ?? items[0].payload ?? items[0])
        : normalizeConfig(await cargarConfiguracion());

      if (config) {
        setForm(config);
        const valor = Number(config.metrosCuadrados) * Number(config.valorPorM2);
        if (onValorViviendaChange && valor > 0) onValorViviendaChange(valor);

        // 3. Guardo en localStorage para futuras cargas rápidas
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      };

    } catch {
      // si falla silencioso, queda con defaults
    }
  }, [onValorViviendaChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDesdeServidor();
  }, [cargarDesdeServidor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      const valor = Number(next.metrosCuadrados) * Number(next.valorPorM2);
      if (onValorViviendaChange && valor > 0) onValorViviendaChange(valor);
      return next;
    });
  };

  const handleGuardar = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = configToPayload(form);
      validateConfig(payload);

      await guardarConfiguracion(payload);

      // guarda también en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      const ahora = new Date().toLocaleTimeString("es-AR");
      setSaveStatus(`Estado: guardado correctamente (${ahora}).`);

      const warn = payload.porcentaje_media_cuota > payload.porcentaje_cuota_completa;
      if (warn) setSaveStatus((s) => s + " Advertencia: % media cuota mayor que % cuota completa.");
      
    } catch (err) {
      setError(err?.message || "Error al guardar.");
    } finally {
      setLoading(false);
    }
  };

  const handleActualizarResumen = async () => {
    setError("");
    setLoading(true);
    try {
      const [resumen, estadoPlan] = await Promise.all([
        cargarResumenFinanciero(),
        cargarEstadoPlan(),
      ]);
      setKpi({ resumen, estadoPlan });
    } catch (err) {
      setError(err?.message || "Error al cargar resumen.");
    } finally {
      setLoading(false);
    }
  };

  const estado = kpi?.estadoPlan?.estado ?? kpi?.estadoPlan ?? null;
  const cuotasActuales = kpi?.estadoPlan?.cuotas_actuales ?? null;
  const resumen = kpi?.resumen;

  return (
    <>
      <section id="configuracion" className="panel panel-config">
        <h2>Configuración del plan</h2>
        <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
          <label>
            Cantidad de cuotas
            <input type="number" name="cantidadCuotas" min="1" value={form.cantidadCuotas} onChange={handleChange} required />
          </label>
          <label>
            Cantidad de adherentes
            <input type="number" name="cantidadAdherentes" min="1" value={form.cantidadAdherentes} onChange={handleChange} required />
          </label>
          <label>
            Metros cuadrados vivienda
            <input type="number" name="metrosCuadrados" min="1" value={form.metrosCuadrados} onChange={handleChange} required />
          </label>
          <label>
            Valor por m² (ARS)
            <input type="number" name="valorPorM2" min="1" value={form.valorPorM2} onChange={handleChange} required />
          </label>
          <label>
            Porcentaje cuota completa (% del valor total)
            <input type="number" name="porcentajeCuotaCompleta" min="0.000001" step="0.000001" value={form.porcentajeCuotaCompleta} onChange={handleChange} required />
          </label>
          <label>
            Porcentaje media cuota (% del valor total)
            <input type="number" name="porcentajeMediaCuota" min="0.000001" step="0.000001" value={form.porcentajeMediaCuota} onChange={handleChange} required />
          </label>
          <label>
            Meses de media cuota inicial
            <input type="number" name="mesesMediaCuotaInicial" min="0" step="1" value={form.mesesMediaCuotaInicial} onChange={handleChange} required />
          </label>
          <label>
            Periodicidad licitación (meses)
            <input type="number" name="periodicidadLicitacionMeses" min="1" step="1" value={form.periodicidadLicitacionMeses} onChange={handleChange} required />
          </label>
          <label>
            % licitación extraordinaria
            <input type="number" name="porcentajeLicitacionExtraordinaria" min="0" step="0.0001" value={form.porcentajeLicitacionExtraordinaria} onChange={handleChange} required />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Cronograma adjudicaciones anual (CSV)
            <input type="text" name="cronogramaAdjudicacionesAnual" placeholder="5,5,5,6,6,7" value={form.cronogramaAdjudicacionesAnual} onChange={handleChange} />
            <small>Formato legacy: enteros no negativos separados por coma. Ejemplo: 5,5,5,6,6,7.</small>
          </label>
          <label>
            Duración construcción (meses)
            <input type="number" name="duracionConstruccionMeses" min="1" value={form.duracionConstruccionMeses} onChange={handleChange} required />
          </label>
          <label>
            Tipo de cambio ARS/USD
            <input type="number" name="tipoCambio" min="1" value={form.tipoCambio} onChange={handleChange} required />
          </label>
        </form>

        <p className="config-help">{preview}</p>
        <p className="config-help" id="small">
          <strong>Fórmula de cuota:</strong><br />
          <span className="formula-mono">cuota_completa = valor_por_m2 × (porcentaje_cuota_completa / 100)</span><br />
          <span className="formula-mono">media_cuota = valor_por_m2 × (porcentaje_media_cuota / 100)</span><br />
          {/* <br />
          Hasta adjudicación paga media cuota según porcentaje configurado.<br />
          Luego paga cuota completa según porcentaje configurado.<br />
          No quedan casas para iniciar: se continúa cobrando cuotas pendientes mientras haya aportes vigentes.<br />
          El sistema recalcula la cuota para cumplir el objetivo de casas en el plazo de cuotas usando los porcentajes.<br />
          El cupo anual de inicios se controla por cronograma.<br />
          Tope de pago por adherente: 180 cuotas.<br /> */}
        </p>

        <div className="actions multi-actions">
          <button className="btn btn-secondary" onClick={handleGuardar} disabled={loading}>
            Guardar configuración
          </button>
          <button className="btn btn-ghost" onClick={handleActualizarResumen} disabled={loading}>
            Actualizar estado financiero
          </button>
        </div>

        {error && <p className="config-help" style={{ color: "red" }}>{error}</p>}
        <p className="config-help">{saveStatus}</p>
      </section>

      <section id="estado-financiero" className="panel panel-kpi">
        <h2>Estado financiero</h2>
        <div className="kpi-grid">
          <article className="kpi-card">
            <p>Valor vivienda</p>
            <h3>{resumen ? formatArs(resumen.valor_vivienda_ars) : "-"}</h3>
            <small>{resumen ? `USD ${Number(resumen.valor_vivienda_usd).toLocaleString("es-AR", { maximumFractionDigits: 2 })}` : "-"}</small>
          </article>
          <article className="kpi-card">
            <p>Fondo actual</p>
            <h3>{resumen ? formatArs(resumen.fondo_ars) : "-"}</h3>
            <small>{resumen ? `USD ${Number(resumen.fondo_usd).toLocaleString("es-AR", { maximumFractionDigits: 2 })}` : "-"}</small>
          </article>
          <article className="kpi-card">
            <p>Viviendas iniciadas</p>
            <h3>{estado ? (estado.casas_iniciadas ?? 0) : "0"}</h3>
            <small>Finalizadas: {estado ? (estado.casas_entregadas ?? 0) : "0"}</small>
          </article>
          <article className="kpi-card">
            <p>Ingreso estimado mensual</p>
            <h3>{resumen ? formatArs(resumen.ingreso_mensual_ars) : "-"}</h3>
            <small>Con variaciones por adjudicaciones y cuota dinámica mensual</small>
          </article>
          <article className="kpi-card">
            <p>Cuota completa del mes</p>
            <h3>{cuotasActuales ? formatArs(cuotasActuales.cuota_completa_mes_ars) : "-"}</h3>
            <small>Según porcentajes configurados</small>
          </article>
          <article className="kpi-card">
            <p>Media cuota del mes</p>
            <h3>{cuotasActuales ? formatArs(cuotasActuales.media_cuota_mes_ars) : "-"}</h3>
            <small>Según porcentajes configurados</small>
          </article>
        </div>
      </section>
    </>
  );
}

export default Configuracion;