import { dom } from "./modules/dom.js";
import { getConfig, setConfigToForm } from "./modules/forms.js";
import {
  logout,
  me,
  crearUsuario,
  refreshToken,
  cargarConfiguracion,
  listarConfiguraciones,
  cargarResumenFinanciero,
  cargarEstadoPlan,
  guardarConfiguracion,
  simularServidor,
  procesarMes,
  reiniciarPlan,
  listarAdherentes,
  crearAdherente,
  actualizarEstadoAdherente,
  eliminarAdherente,
  listarPagos,
  registrarPago,
  eliminarPago
} from "./modules/services.js";
import {
  clearTokens,
  clearBusinessCache,
  getLastUserId,
  hasSession,
  setCurrentUser
} from "./modules/auth.js";
import { setRefreshHandler } from "./modules/http.js";
import { DEBUG_UI } from "./modules/settings.js";
import {
  writeLog,
  setSummary,
  updateKpiFromResumen,
  renderTimeline,
  renderAdherentes,
  renderPagos,
  hasTimelineMetrics,
  normalizeTimeline
} from "./modules/renderers.js";

setRefreshHandler(refreshToken);

let navController = null;
let userSwitchedSession = false;
let configuracionesUsuario = [];

function redirectToLogin() {
  window.location.href = "./login.html";
}

function withUiFeedback(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      const status = Number(error?.status || 0);
      const message = error?.message || "Error inesperado";
      writeLog(dom.systemLog, "Error", { message });
      if (status === 401) {
        setSummary(dom.simSummary, "Sesión expirada o no autenticado. Volvé a iniciar sesión.");
        clearTokens();
        clearBusinessCache();
        clearBusinessUiState();
        redirectToLogin();
        return;
      }

      if (status === 403) {
        setSummary(dom.simSummary, "No tenés permisos para realizar esta operación.");
        return;
      }

      if (status === 404) {
        setSummary(dom.simSummary, "Recurso no encontrado o fuera del alcance de tu usuario.");
        return;
      }

      if (status === 409) {
        setSummary(dom.simSummary, `Conflicto de regla de negocio: ${message}`);
        return;
      }

      setSummary(dom.simSummary, `Error: ${message}`);

      if (/no autenticado|token|401/i.test(message)) {
        clearTokens();
        redirectToLogin();
      }
    }
  };
}

function renderSessionStatus(user) {
  dom.sessionStatus.textContent = `Sesión: ${user.username} (${user.role})`;
}

function initSectionNav() {
  const nav = document.querySelector(".section-nav");
  const layout = document.querySelector(".layout");
  if (!nav || !layout) {
    return null;
  }

  const links = Array.from(nav.querySelectorAll("a[href^='#']"));
  const sections = links
    .map((link) => {
      const targetId = link.getAttribute("href")?.slice(1) || "";
      const section = document.getElementById(targetId);
      return section ? { link, section, id: targetId } : null;
    })
    .filter(Boolean);

  if (sections.length === 0) {
    return null;
  }

  const sectionLoaders = {
    "estado-financiero": cargarResumenServidor,
    configuracion: cargarConfiguracionServidor,
    simulacion: () => ejecutarSimulacionServidor({ skipNavigation: true }),
    adherentes: actualizarAdherentes,
    pagos: actualizarPagos
  };

  const groupedViews = {
    configuracion: ["configuracion", "estado-financiero"],
    "estado-financiero": ["configuracion", "estado-financiero"]
  };

  let currentSectionId = "";

  const setActive = (id) => {
    links.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const showSection = async (id) => {
    const target = sections.find((item) => item.id === id);
    if (!target) {
      return;
    }
    if (target.section.classList.contains("hidden") || target.link.classList.contains("hidden")) {
      return;
    }

    currentSectionId = id;
    layout.classList.add("single-section");

    const visibleIds = new Set(groupedViews[id] || [id]);
    const allPanels = Array.from(layout.querySelectorAll(".panel[id]"));

    allPanels.forEach((section) => {
      const shouldShow = visibleIds.has(section.id) && !section.classList.contains("hidden");
      section.classList.toggle("section-visible", shouldShow);
    });

    setActive(id);

    const loaders = Array.from(visibleIds)
      .map((sectionId) => sectionLoaders[sectionId])
      .filter((loader, index, array) => typeof loader === "function" && array.indexOf(loader) === index);

    await Promise.all(loaders.map((loader) => withUiFeedback(loader)()));
  };

  const ensureVisibleSelection = async () => {
    const selected = sections.find((item) => item.id === currentSectionId);
    if (selected && !selected.section.classList.contains("hidden") && !selected.link.classList.contains("hidden")) {
      return;
    }

    const fallback = sections.find(
      (item) => !item.section.classList.contains("hidden") && !item.link.classList.contains("hidden")
    );
    if (fallback) {
      await showSection(fallback.id);
    }
  };

  links.forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const id = link.getAttribute("href")?.slice(1);
      if (id) {
        await showSection(id);
      }
    });
  });

  return {
    showSection,
    ensureVisibleSelection
  };
}

function applyRoleUI(user) {
  const esAdmin = user.role === "admin";

  dom.adminPanel.classList.toggle("hidden", !esAdmin);
  dom.navLinkAdmin.classList.toggle("hidden", !esAdmin);
  dom.adminRoleLabel.textContent = esAdmin ? "Perfil admin" : "-";
  dom.adminUserData.textContent = `ID ${user.id} | ${user.username} | ${user.role} | activo: ${user.is_active ? "sí" : "no"}`;

  const canWrite = user.role === "admin" || user.role === "operador";
  const readOnlyMode = !canWrite;

  if (readOnlyMode) {
    setSummary(dom.simSummary, "Tu rol no está habilitado para operar en este sistema.");
  }

  dom.buttonGuardarConfig.disabled = readOnlyMode;
  dom.buttonProcesarMes.disabled = readOnlyMode;
  dom.buttonReiniciarPlan.disabled = readOnlyMode;
  document.getElementById("btn-crear-adherente").disabled = readOnlyMode;
  dom.buttonCrearAdherentesLote.disabled = readOnlyMode;
  dom.buttonEliminarAdherente.disabled = readOnlyMode;
  document.getElementById("btn-cambiar-estado").disabled = readOnlyMode;
  document.getElementById("btn-registrar-pago").disabled = readOnlyMode;
  dom.buttonRegistrarPagosLote.disabled = readOnlyMode;
  dom.buttonEliminarPago.disabled = readOnlyMode;
}

function clearBusinessUiState() {
  dom.tableBody.innerHTML = "";
  dom.adherentesBody.innerHTML = "";
  dom.pagosBody.innerHTML = "";
  dom.simSummary.textContent = "Ejecutá la simulación para ver proyecciones.";
  dom.adherentesSummary.textContent = "Sin adherentes para este usuario.";
  dom.pagosSummary.textContent = "Sin pagos para este usuario.";
  configuracionesUsuario = [];
  dom.configModalList && (dom.configModalList.innerHTML = "");
  dom.configModal?.classList.add("hidden");
}

function pickConfigPayload(item) {
  if (item && typeof item === "object") {
    if (item.configuracion && typeof item.configuracion === "object") {
      return item.configuracion;
    }
    if (item.payload && typeof item.payload === "object") {
      return item.payload;
    }
    return item;
  }
  return null;
}

function normalizePlanConfig(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const normalized = {
    cantidad_cuotas: Number(raw.cantidad_cuotas ?? raw.cantidadCuotas),
    cantidad_de_adherentes: Number(raw.cantidad_de_adherentes ?? raw.cantidadAdherentes),
    metros_cuadrados_vivienda: Number(raw.metros_cuadrados_vivienda ?? raw.metrosCuadradosVivienda ?? raw.metrosCuadrados),
    valor_por_m2: Number(raw.valor_por_m2 ?? raw.valorPorM2),
    duracion_construccion_meses: Number(raw.duracion_construccion_meses ?? raw.duracionConstruccionMeses),
    tipo_cambio: Number(raw.tipo_cambio ?? raw.tipoCambio)
  };

  return isPlanConfigShape(normalized) ? normalized : null;
}

function isPlanConfigShape(config) {
  if (!config || typeof config !== "object") {
    return false;
  }

  const keys = [
    "cantidad_cuotas",
    "cantidad_de_adherentes",
    "metros_cuadrados_vivienda",
    "valor_por_m2",
    "duracion_construccion_meses",
    "tipo_cambio"
  ];

  return keys.every((key) => config[key] !== undefined && config[key] !== null);
}

function buildConfigLabel(item, index) {
  const name = String(item?.nombre || item?.name || item?.titulo || "").trim();
  const idPart = item?.id != null ? `#${item.id}` : `#${index + 1}`;
  const dateRaw = item?.created_at || item?.fecha_creacion || item?.updated_at || item?.fecha;
  if (name) {
    return `${idPart} - ${name}`;
  }

  if (dateRaw) {
    const dateValue = new Date(dateRaw);
    if (!Number.isNaN(dateValue.getTime())) {
      return `${idPart} - ${dateValue.toLocaleString("es-AR")}`;
    }
  }

  return `Configuración ${idPart}`;
}

function renderConfigListInModal() {
  if (!dom.configModalList) {
    return;
  }

  dom.configModalList.innerHTML = configuracionesUsuario
    .map((item, index) => {
      const config = item.configuracion;
      return `
        <article class="config-item">
          <h3>${buildConfigLabel(item, index)}</h3>
          <div class="config-item-grid">
            <p><strong>Tipo de cambio:</strong> ${Number(config.tipo_cambio).toLocaleString("es-AR")}</p>
            <p><strong>Adherentes:</strong> ${Number(config.cantidad_de_adherentes).toLocaleString("es-AR")}</p>
            <p><strong>m2 vivienda:</strong> ${Number(config.metros_cuadrados_vivienda).toLocaleString("es-AR")}</p>
            <p><strong>Cuotas:</strong> ${Number(config.cantidad_cuotas).toLocaleString("es-AR")}</p>
            <p><strong>Valor por m2:</strong> ${Number(config.valor_por_m2).toLocaleString("es-AR")}</p>
            <p><strong>Duración obra (meses):</strong> ${Number(config.duracion_construccion_meses).toLocaleString("es-AR")}</p>
          </div>
          <button class="btn btn-secondary js-config-apply" type="button" data-config-index="${index}">Usar esta configuración</button>
        </article>
      `;
    })
    .join("");
}

function pedirSeleccionConfiguracion() {
  const { configModal, configModalCloseButton, configModalList } = dom;
  if (!configModal || !configModalCloseButton || !configModalList) {
    return Promise.resolve(configuracionesUsuario[0] || null);
  }

  renderConfigListInModal();
  configModal.classList.remove("hidden");
  configModalCloseButton.focus();

  return new Promise((resolve) => {
    const cleanup = () => {
      configModal.classList.add("hidden");
      configModalCloseButton.removeEventListener("click", onClose);
      configModal.removeEventListener("click", onBackdrop);
      configModalList.removeEventListener("click", onListClick);
      document.removeEventListener("keydown", onKeyDown);
      dom.buttonCargarConfig?.focus();
    };

    const onClose = () => {
      cleanup();
      resolve(null);
    };

    const onBackdrop = (event) => {
      if (event.target === configModal) {
        onClose();
      }
    };

    const onListClick = (event) => {
      const button = event.target.closest(".js-config-apply");
      if (!button) {
        return;
      }

      const index = Number(button.getAttribute("data-config-index") || "-1");
      const item = configuracionesUsuario[index] || null;
      cleanup();
      resolve(item);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    configModalCloseButton.addEventListener("click", onClose);
    configModal.addEventListener("click", onBackdrop);
    configModalList.addEventListener("click", onListClick);
    document.addEventListener("keydown", onKeyDown);
  });
}

function pedirConfirmacion({ title, message, acceptLabel = "Confirmar", focusBackElement = dom.buttonReiniciarPlan }) {
  const {
    confirmModal,
    confirmModalTitle,
    confirmModalMessage,
    confirmCancelButton,
    confirmAcceptButton
  } = dom;

  if (!confirmModal || !confirmCancelButton || !confirmAcceptButton) {
    return Promise.resolve(window.confirm(message));
  }

  confirmModalTitle.textContent = title;
  confirmModalMessage.textContent = message;
  confirmAcceptButton.textContent = acceptLabel;
  confirmModal.classList.remove("hidden");
  confirmAcceptButton.focus();

  return new Promise((resolve) => {
    const cleanup = () => {
      confirmModal.classList.add("hidden");
      confirmCancelButton.removeEventListener("click", onCancel);
      confirmAcceptButton.removeEventListener("click", onAccept);
      confirmModal.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onKeyDown);
      confirmAcceptButton.textContent = "Confirmar";
      if (focusBackElement && typeof focusBackElement.focus === "function") {
        focusBackElement.focus();
      }
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onAccept = () => {
      cleanup();
      resolve(true);
    };

    const onBackdropClick = (event) => {
      if (event.target === confirmModal) {
        onCancel();
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    confirmCancelButton.addEventListener("click", onCancel);
    confirmAcceptButton.addEventListener("click", onAccept);
    confirmModal.addEventListener("click", onBackdropClick);
    document.addEventListener("keydown", onKeyDown);
  });
}

async function ejecutarSimulacionServidor(options = {}) {
  if (navController && !options.skipNavigation) {
    await navController.showSection("simulacion");
  }

  const data = new FormData(dom.operacionForm);
  const horizonte = Number(data.get("horizonteMeses") || 36);
  const payload = await simularServidor(horizonte);
  const rows = normalizeTimeline(payload);

  if (rows.length > 0) {
    const hasMetrics = hasTimelineMetrics(rows);

    renderTimeline(dom.tableBody, rows);
    if (hasMetrics) {
      setSummary(dom.simSummary, `Simulación servidor ok: ${rows.length} fila(s) en ${horizonte} meses.`);
    } else {
      setSummary(
        dom.simSummary,
        `Simulación servidor ok: ${rows.length} evento(s) en ${horizonte} meses. La API no devolvió métricas mensuales en esta respuesta.`
      );
    }
  } else {
    const fondoFinal = typeof payload?.fondo_final_ars === "number"
      ? ` Fondo final: ${payload.fondo_final_ars.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ARS.`
      : "";

    let diagnostico = "";
    if (DEBUG_UI) {
      try {
        const estadoPlan = await cargarEstadoPlan();
        const cantidadAdherentes = Array.isArray(estadoPlan?.adherentes)
          ? estadoPlan.adherentes.length
          : null;
        const ingresoMensual = Number(estadoPlan?.resumen?.ingreso_mensual_ars ?? 0);
        const fondoActual = Number(estadoPlan?.estado?.fondo_ars ?? 0);

        if (cantidadAdherentes === 0 || ingresoMensual <= 0) {
          diagnostico = " Diagnóstico: no hay ingreso mensual (posible falta de adherentes cargados o todos en estado sin aporte).";
        } else if (fondoActual <= 0) {
          diagnostico = " Diagnóstico: el fondo actual es 0 y el horizonte puede ser corto para alcanzar una vivienda.";
        }
      } catch {
        diagnostico = "";
      }
    }

    setSummary(
      dom.simSummary,
      `Simulación servidor ejecutada, pero no hubo eventos de casas en ${horizonte} meses.${fondoFinal}${diagnostico}`
    );
  }

  writeLog(dom.systemLog, "Simulación servidor", payload);
}

async function cargarConfiguracionServidor(options = {}) {
  const showPicker = options.showPicker !== false;
  const items = await listarConfiguraciones();

  configuracionesUsuario = items
    .map((item) => ({ raw: item, config: normalizePlanConfig(pickConfigPayload(item)) }))
    .filter((entry) => entry.config)
    .map((entry) => ({ ...entry.raw, configuracion: entry.config }));

  if (configuracionesUsuario.length === 0) {
    // Fallback para backends que exponen una sola configuración en /configuracion.
    const directConfig = normalizePlanConfig(await cargarConfiguracion());
    if (directConfig) {
      configuracionesUsuario = [{ id: "actual", nombre: "Actual", configuracion: directConfig }];
    }
  }

  if (configuracionesUsuario.length === 0) {
    throw new Error("No hay configuraciones guardadas para este usuario.");
  }

  if (configuracionesUsuario.length === 1 || !showPicker) {
    setConfigToForm(dom.form, configuracionesUsuario[0].configuracion);
    writeLog(dom.systemLog, "Configuración cargada", configuracionesUsuario[0]);
    return;
  }

  const selected = await pedirSeleccionConfiguracion();
  if (!selected) {
    setSummary(dom.simSummary, "Selección de configuración cancelada.");
    return;
  }

  setConfigToForm(dom.form, selected.configuracion);
  writeLog(dom.systemLog, "Configuración cargada", selected);
  setSummary(dom.simSummary, `Configuración aplicada (${buildConfigLabel(selected, configuracionesUsuario.indexOf(selected))}).`);
}

async function cargarResumenServidor() {
  const [resumen, estadoPlan] = await Promise.all([
    cargarResumenFinanciero(),
    cargarEstadoPlan()
  ]);

  updateKpiFromResumen(dom.kpi, resumen, estadoPlan?.estado);
  writeLog(dom.systemLog, "Resumen financiero", { resumen, estado: estadoPlan?.estado });
}

async function guardarConfiguracionServidor() {
  const response = await guardarConfiguracion(getConfig(dom.form));
  writeLog(dom.systemLog, "Configuración guardada", response);
}

async function procesarMesServidor() {
  const data = new FormData(dom.operacionForm);
  const metodo = String(data.get("metodoAdjudicacion") || "sorteo");
  const ofertaAdherenteId = Number(data.get("ofertaAdherenteId") || 0);
  const ofertaPorcentaje = Number(data.get("ofertaPorcentaje") || 0);
  const ofertas = [];

  if (metodo === "licitacion" && ofertaAdherenteId > 0 && ofertaPorcentaje > 0) {
    ofertas.push({
      adherente_id: ofertaAdherenteId,
      porcentaje_cuotas_restantes: ofertaPorcentaje
    });
  }

  const payload = await procesarMes(metodo, ofertas);
  writeLog(dom.systemLog, "Procesar mes", payload);
  await cargarResumenServidor();
}

async function reiniciarPlanServidor() {
  const confirmacion = await pedirConfirmacion({
    title: "Reiniciar plan",
    message: "Esta acción restablece el estado del plan y no se puede deshacer desde esta pantalla.",
    acceptLabel: "Reiniciar",
    focusBackElement: dom.buttonReiniciarPlan
  });
  if (!confirmacion) {
    return;
  }

  const payload = await reiniciarPlan();
  dom.tableBody.innerHTML = "";
  setSummary(dom.simSummary, "Plan reiniciado. Ejecutá una simulación para ver una nueva proyección.");
  writeLog(dom.systemLog, "Reiniciar plan", payload);

  await Promise.all([
    cargarResumenServidor(),
    actualizarAdherentes(),
    actualizarPagos()
  ]);
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

async function logoutFlow() {
  try {
    await logout();
  } catch {
    clearTokens();
  }
  clearBusinessCache();
  clearBusinessUiState();
  redirectToLogin();
}

async function bootstrapSession() {
  if (!hasSession()) {
    redirectToLogin();
    return false;
  }

  try {
    const user = await me();
    const previousUserId = getLastUserId();
    const currentUserId = user?.id != null ? String(user.id) : "";
    userSwitchedSession = Boolean(previousUserId && currentUserId && previousUserId !== currentUserId);
    if (userSwitchedSession) {
      clearBusinessCache();
      clearBusinessUiState();
    }

    setCurrentUser(user);
    renderSessionStatus(user);
    applyRoleUI(user);
    if (navController) {
      await navController.ensureVisibleSelection();
    }
    return true;
  } catch {
    clearTokens();
    clearBusinessCache();
    clearBusinessUiState();
    redirectToLogin();
    return false;
  }
}

async function crearUsuarioAdminFlow(event) {
  event.preventDefault();
  const data = new FormData(dom.adminCreateUserForm);
  const username = String(data.get("username") || "").trim();
  const password = String(data.get("password") || "");
  const role = String(data.get("role") || "operador");

  if (!["admin", "operador"].includes(role)) {
    throw new Error("Rol inválido. Solo se permite admin u operador.");
  }

  const user = await crearUsuario(username, password, role);
  dom.adminCreateUserForm.reset();
  writeLog(dom.systemLog, "Usuario creado por admin", user);
}

async function crearAdherentesLoteFlow(event) {
  event.preventDefault();
  const data = new FormData(dom.adherenteLoteForm);
  const cantidad = Number(data.get("cantidad") || 0);
  const prefijo = String(data.get("prefijo") || "Adherente").trim();

  if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 200) {
    throw new Error("La cantidad debe estar entre 1 y 200.");
  }
  if (!prefijo) {
    throw new Error("Ingresá un prefijo para los nombres.");
  }

  const actuales = await listarAdherentes();
  const base = actuales.length;

  for (let i = 1; i <= cantidad; i += 1) {
    const nombre = `${prefijo} ${base + i}`;
    await crearAdherente(nombre);
  }

  await actualizarAdherentes();
  writeLog(dom.systemLog, "Carga rápida temporal", {
    creados: cantidad,
    prefijo
  });
}

async function registrarPagosLoteFlow(event) {
  event.preventDefault();
  const data = new FormData(dom.pagoLoteForm);
  const cantidad = Number(data.get("cantidadPagos") || 0);
  const adherenteInicial = Number(data.get("adherenteInicial") || 0);
  const montoArs = Number(data.get("montoLoteArs") || 0);
  const mes = Number(data.get("mesLote") || 0);

  if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 300) {
    throw new Error("La cantidad de pagos debe estar entre 1 y 300.");
  }
  if (!Number.isFinite(adherenteInicial) || adherenteInicial < 1) {
    throw new Error("El adherente inicial debe ser mayor o igual a 1.");
  }
  if (!Number.isFinite(montoArs) || montoArs <= 0) {
    throw new Error("El monto debe ser mayor a 0.");
  }
  if (!Number.isFinite(mes) || mes < 1) {
    throw new Error("El mes debe ser mayor o igual a 1.");
  }

  let creados = 0;
  let fallidos = 0;

  for (let i = 0; i < cantidad; i += 1) {
    const adherenteId = adherenteInicial + i;
    try {
      await registrarPago(adherenteId, montoArs, mes);
      creados += 1;
    } catch {
      fallidos += 1;
    }
  }

  await actualizarPagos();
  writeLog(dom.systemLog, "Carga rápida temporal de pagos", {
    cantidad,
    adherenteInicial,
    montoArs,
    mes,
    creados,
    fallidos
  });
}

async function eliminarAdherenteFlow(event) {
  event.preventDefault();
  const data = new FormData(dom.adherenteEliminarForm);
  const adherenteId = Number(data.get("adherenteIdEliminar") || 0);

  if (!Number.isFinite(adherenteId) || adherenteId < 1) {
    throw new Error("Ingresá un ID de adherente válido.");
  }

  const confirmacion = await pedirConfirmacion({
    title: "Eliminar adherente",
    message: `Se eliminará el adherente ID ${adherenteId}. Esta acción puede afectar pagos y estado del plan.`,
    acceptLabel: "Eliminar",
    focusBackElement: dom.buttonEliminarAdherente
  });

  if (!confirmacion) {
    return;
  }

  let payload;
  try {
    payload = await eliminarAdherente(adherenteId);
  } catch (error) {
    if (Number(error?.status || 0) === 404) {
      writeLog(dom.systemLog, "Eliminar adherente", {
        adherenteId,
        message: "No encontrado o fuera de tu alcance"
      });
      await actualizarAdherentes();
      return;
    }
    throw error;
  }

  dom.adherenteEliminarForm.reset();
  writeLog(dom.systemLog, "Eliminar adherente", { adherenteId, payload });
  await actualizarAdherentes();
}

async function eliminarPagoFlow(event) {
  event.preventDefault();
  const data = new FormData(dom.pagoEliminarForm);
  const pagoId = Number(data.get("pagoIdEliminar") || 0);

  if (!Number.isFinite(pagoId) || pagoId < 1) {
    throw new Error("Ingresá un ID de pago válido.");
  }

  const confirmacion = await pedirConfirmacion({
    title: "Eliminar pago",
    message: `Se eliminará el pago ID ${pagoId}. Esta acción no se puede deshacer.`,
    acceptLabel: "Eliminar",
    focusBackElement: dom.buttonEliminarPago
  });

  if (!confirmacion) {
    return;
  }

  let payload;
  try {
    payload = await eliminarPago(pagoId);
  } catch (error) {
    if (Number(error?.status || 0) === 404) {
      writeLog(dom.systemLog, "Eliminar pago", {
        pagoId,
        message: "No encontrado o fuera de tu alcance"
      });
      await actualizarPagos();
      return;
    }
    throw error;
  }

  dom.pagoEliminarForm.reset();
  writeLog(dom.systemLog, "Eliminar pago", { pagoId, payload });
  await actualizarPagos();
}

dom.buttonSimularServidor.addEventListener("click", withUiFeedback(ejecutarSimulacionServidor));
dom.buttonCargarConfig.addEventListener("click", withUiFeedback(cargarConfiguracionServidor));
dom.buttonGuardarConfig.addEventListener("click", withUiFeedback(guardarConfiguracionServidor));
dom.buttonCargarResumen.addEventListener("click", withUiFeedback(cargarResumenServidor));
dom.buttonProcesarMes.addEventListener("click", withUiFeedback(procesarMesServidor));
dom.buttonReiniciarPlan.addEventListener("click", withUiFeedback(reiniciarPlanServidor));

dom.buttonLogout.addEventListener("click", withUiFeedback(logoutFlow));

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

dom.adherenteLoteForm.addEventListener("submit", withUiFeedback(crearAdherentesLoteFlow));
dom.adherenteEliminarForm.addEventListener("submit", withUiFeedback(eliminarAdherenteFlow));

dom.adherenteEstadoForm.addEventListener("submit", withUiFeedback(async (event) => {
  event.preventDefault();
  const data = new FormData(dom.adherenteEstadoForm);
  const adherenteId = Number(data.get("adherenteIdEstado"));
  const estado = String(data.get("estadoAdherente"));

  try {
    await actualizarEstadoAdherente(adherenteId, estado);
  } catch (error) {
    if (Number(error?.status || 0) === 404) {
      writeLog(dom.systemLog, "Cambiar estado adherente", {
        adherenteId,
        message: "No encontrado o fuera de tu alcance"
      });
      await actualizarAdherentes();
      return;
    }
    throw error;
  }

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
dom.pagoLoteForm.addEventListener("submit", withUiFeedback(registrarPagosLoteFlow));
dom.pagoEliminarForm.addEventListener("submit", withUiFeedback(eliminarPagoFlow));

dom.adminCreateUserForm.addEventListener("submit", withUiFeedback(crearUsuarioAdminFlow));

navController = initSectionNav();
clearBusinessUiState();
const sessionOk = await bootstrapSession();
if (sessionOk) {
  if (navController) {
    await navController.showSection("estado-financiero");
  }

  if (userSwitchedSession) {
    await withUiFeedback(() => ejecutarSimulacionServidor({ skipNavigation: true }))();
    userSwitchedSession = false;
  }
}
