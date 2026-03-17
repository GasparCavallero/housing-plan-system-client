import { dom } from "./modules/dom.js";
import { getConfig, getCuotasFromForm, setConfigToForm } from "./modules/forms.js";
import { simularPlanLocal } from "./modules/simulation.js";
import {
  cargarConfiguracion,
  guardarConfiguracion,
  simularServidor,
  procesarMes,
  listarAdherentes,
  crearAdherente,
  listarPagos,
  registrarPago
} from "./modules/services.js";
import {
  writeLog,
  setSummary,
  updateKpi,
  renderTimeline,
  renderAdherentes,
  renderPagos,
  normalizeTimeline
} from "./modules/renderers.js";

function withUiFeedback(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      writeLog(dom.systemLog, "Error", { message: error.message });
    }
  };
}

async function ejecutarSimulacionLocal() {
  const config = getConfig(dom.form);
  const cuotas = getCuotasFromForm(dom.form);
  const result = simularPlanLocal(config, cuotas, 36);

  updateKpi(dom.kpi, config, result);
  renderTimeline(dom.tableBody, result.timeline);

  const primerasCasas = result.timeline
    .filter((m) => String(m.evento).includes("Inicio casa"))
    .slice(0, 3)
    .map((m) => `Casa ${m.evento.split(" ").at(-1)} -> mes ${m.mes}`);

  setSummary(
    dom.simSummary,
    primerasCasas.length > 0
      ? `Proyección local: ${primerasCasas.join(" | ")}`
      : "No se logra iniciar ninguna vivienda con los parámetros actuales."
  );
}

async function ejecutarSimulacionServidor() {
  const payload = await simularServidor(36);
  const rows = normalizeTimeline(payload);

  if (rows.length > 0) {
    renderTimeline(dom.tableBody, rows);
    setSummary(dom.simSummary, "Simulación obtenida desde servidor.");
  } else {
    setSummary(dom.simSummary, "El servidor respondió sin timeline explícito; revisá el panel de respuesta.");
  }

  writeLog(dom.systemLog, "Simulación servidor", payload);
}

async function cargarConfiguracionServidor() {
  const config = await cargarConfiguracion();
  setConfigToForm(dom.form, config);
  writeLog(dom.systemLog, "Configuración cargada", config);
}

async function guardarConfiguracionServidor() {
  const response = await guardarConfiguracion(getConfig(dom.form));
  writeLog(dom.systemLog, "Configuración guardada", response);
}

async function procesarMesServidor() {
  const payload = await procesarMes();
  writeLog(dom.systemLog, "Procesar mes", payload);
}

async function actualizarAdherentes() {
  const items = await listarAdherentes();
  renderAdherentes(dom.adherentesBody, dom.adherentesSummary, items);
  writeLog(dom.systemLog, "Listado de adherentes", items);
}

async function actualizarPagos() {
  const items = await listarPagos();
  renderPagos(dom.pagosBody, dom.pagosSummary, items);
  writeLog(dom.systemLog, "Listado de pagos", items);
}

dom.buttonSimular.addEventListener("click", withUiFeedback(ejecutarSimulacionLocal));
dom.buttonSimularServidor.addEventListener("click", withUiFeedback(ejecutarSimulacionServidor));
dom.buttonCargarConfig.addEventListener("click", withUiFeedback(cargarConfiguracionServidor));
dom.buttonGuardarConfig.addEventListener("click", withUiFeedback(guardarConfiguracionServidor));
dom.buttonProcesarMes.addEventListener("click", withUiFeedback(procesarMesServidor));

dom.buttonListarAdherentes.addEventListener("click", withUiFeedback(actualizarAdherentes));
dom.adherenteForm.addEventListener("submit", withUiFeedback(async (event) => {
  event.preventDefault();
  const data = new FormData(dom.adherenteForm);
  const nombre = String(data.get("nombre") || "").trim();

  if (!nombre) {
    throw new Error("Ingresá un nombre para crear adherente.");
  }

  await crearAdherente(nombre);
  dom.adherenteForm.reset();
  await actualizarAdherentes();
}));

dom.buttonListarPagos.addEventListener("click", withUiFeedback(actualizarPagos));
dom.pagoForm.addEventListener("submit", withUiFeedback(async (event) => {
  event.preventDefault();
  const data = new FormData(dom.pagoForm);

  await registrarPago(
    Number(data.get("adherenteId")),
    Number(data.get("montoArs")),
    Number(data.get("mes"))
  );

  dom.pagoForm.reset();
  await actualizarPagos();
}));

ejecutarSimulacionLocal();
